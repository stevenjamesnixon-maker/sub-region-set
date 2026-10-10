/**
 * srs_ue_customer.js
 * Sets the customer sub-region (custentity_sub_region) from the postcode prefix on save.
 *
 * Postcode rule (kept from the legacy script):
 *   - no parent: default billing address
 *   - with a parent (sub-customer): default shipping address
 *
 * Parameters (Free-Form Text, set per deployment; both empty = engineer off):
 *   custscript_srs_pe_field  customer project engineer field ID
 *   custscript_srs_pe_map    region:employee pairs, comma-separated
 *
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/log', 'N/runtime', './srs_region_map'], function (log, runtime, regionMap) {
    'use strict';

    var FIELD = {
        SUB_REGION: 'custentity_sub_region',
        CHECK: 'custentity_subregion_check',
        POSTCODE: 'custentity_subregion_postcode'
    };

    var PARAM = {
        PE_FIELD: 'custscript_srs_pe_field',
        PE_MAP: 'custscript_srs_pe_map'
    };

    /**
     * Reads and parses the engineer parameters. Invalid config is logged and treated as off,
     * so the region write still happens.
     */
    function readEngineerConfig() {
        var script = runtime.getCurrentScript();
        var config = regionMap.parseEngineerConfig(
            script.getParameter({ name: PARAM.PE_FIELD }),
            script.getParameter({ name: PARAM.PE_MAP })
        );
        if (config.status === 'invalid') {
            log.error('SRS_CONFIG', { stage: 'beforeSubmit', reason: config.reason });
        }
        return config;
    }

    /**
     * Top-level customers may report their own ID as parent; treat that as no parent.
     */
    function hasParent(rec) {
        var parent = rec.getValue({ fieldId: 'parent' });
        if (!parent) {
            return false;
        }
        return !(rec.id && String(parent) === String(rec.id));
    }

    /**
     * Reads the zip from the default billing (or shipping) line of the addressbook sublist.
     * @returns {string} the postcode as read, or '' if none
     */
    function readPostcode(rec, useShipping) {
        var defaultField = useShipping ? 'defaultshipping' : 'defaultbilling';
        var lineCount = rec.getLineCount({ sublistId: 'addressbook' });
        for (var i = 0; i < lineCount; i++) {
            var isDefault = rec.getSublistValue({ sublistId: 'addressbook', fieldId: defaultField, line: i });
            if (isDefault === true || isDefault === 'T') {
                var address = rec.getSublistSubrecord({
                    sublistId: 'addressbook',
                    fieldId: 'addressbookaddress',
                    line: i
                });
                return address.getValue({ fieldId: 'zip' }) || '';
            }
        }
        return '';
    }

    function beforeSubmit(context) {
        var type = context.type;
        if (type !== context.UserEventType.CREATE && type !== context.UserEventType.EDIT) {
            return;
        }
        if (runtime.executionContext === runtime.ContextType.MAP_REDUCE) {
            return;
        }

        var rec = context.newRecord;
        try {
            var postcode = readPostcode(rec, hasParent(rec));
            var result = regionMap.getRegion(postcode);
            if (result.regionId === null) {
                return;
            }

            var currentRegion = String(rec.getValue({ fieldId: FIELD.SUB_REGION }) || '');
            var storedPostcode = String(rec.getValue({ fieldId: FIELD.POSTCODE }) || '');
            var config = readEngineerConfig();
            var engineerId = regionMap.getEngineer(result.regionId, config);
            var engineerChanged = false;
            if (engineerId) {
                var currentEngineer = String(rec.getValue({ fieldId: config.fieldId }) || '');
                engineerChanged = currentEngineer !== engineerId;
            }

            if (currentRegion === result.regionId && storedPostcode === postcode && !engineerChanged) {
                return;
            }

            // Logged only when a write is about to happen, so repeat saves don't re-log.
            if (!result.matched) {
                log.audit('SRS_UNMATCHED', {
                    recordId: rec.id,
                    entityId: rec.getValue({ fieldId: 'entityid' }),
                    postcode: postcode,
                    prefix: result.prefix
                });
            }

            rec.setValue({ fieldId: FIELD.SUB_REGION, value: result.regionId });
            rec.setValue({ fieldId: FIELD.CHECK, value: true });
            rec.setValue({ fieldId: FIELD.POSTCODE, value: postcode });
            if (engineerId) {
                rec.setValue({ fieldId: config.fieldId, value: engineerId });
            }
        } catch (e) {
            // Never block the customer save.
            log.error('SRS_ERROR', {
                stage: 'beforeSubmit',
                recordId: rec.id,
                name: e.name,
                message: e.message
            });
        }
    }

    return {
        beforeSubmit: beforeSubmit
    };
});
