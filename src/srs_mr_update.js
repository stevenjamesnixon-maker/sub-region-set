/**
 * srs_mr_update.js
 * Batch update of customer sub-region (custentity_sub_region) from the postcode prefix.
 *
 * Deployments:
 *   customdeploy_srs_nightly  scheduled daily, reprocess-all unticked (new or changed postcodes only)
 *   customdeploy_srs_adhoc    not scheduled, reprocess-all ticked (migration / after a map change)
 *
 * Parameter: custscript_srs_reprocess_all (checkbox)
 *
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/log', 'N/record', 'N/runtime', 'N/search', './srs_region_map'],
    function (log, record, runtime, search, regionMap) {
        'use strict';

        var FIELD = {
            SUB_REGION: 'custentity_sub_region',
            CHECK: 'custentity_subregion_check',
            POSTCODE: 'custentity_subregion_postcode'
        };

        var PARAM_REPROCESS_ALL = 'custscript_srs_reprocess_all';

        // Keys written from map and counted in summarize.
        var OUTCOME = {
            PROCESSED: 'processed',
            UPDATED: 'updated',
            SKIPPED_UNCHANGED: 'skipped-unchanged',
            NO_POSTCODE: 'no-postcode',
            UNMATCHED: 'unmatched',
            ERROR: 'errors'
        };

        function isReprocessAll() {
            var value = runtime.getCurrentScript().getParameter({ name: PARAM_REPROCESS_ALL });
            return value === true || value === 'T';
        }

        /**
         * Search result values arrive as a string for text columns and as {value, text} for select columns.
         */
        function columnValue(values, name) {
            var v = values[name];
            if (v === null || v === undefined) {
                return '';
            }
            if (Array.isArray(v)) {
                v = v.length ? v[0] : '';
            }
            if (typeof v === 'object') {
                return String(v.value || '');
            }
            return String(v);
        }

        function getInputData() {
            // All customers, active and inactive: no isinactive filter. Legacy saved searches
            // (6594, 10390, 7254) are deliberately not used.
            var columns = [
                'parent',
                'billzipcode',
                'shipzip',
                FIELD.SUB_REGION,
                FIELD.POSTCODE
            ];
            if (regionMap.isEngineerConfigured()) {
                columns.push(regionMap.ENGINEER_FIELD_ID);
            }
            return search.create({
                type: search.Type.CUSTOMER,
                filters: [],
                columns: columns
            });
        }

        function map(context) {
            context.write({ key: OUTCOME.PROCESSED, value: '1' });

            var result = JSON.parse(context.value);
            var id = String(result.id);
            var values = result.values || {};

            // Assumption: for top-level customers the parent column may return the customer's
            // own ID rather than empty. Treat that as no parent.
            var parent = columnValue(values, 'parent');
            var hasParent = !!parent && parent !== id;
            var postcode = hasParent ? columnValue(values, 'shipzip') : columnValue(values, 'billzipcode');

            if (!postcode) {
                context.write({ key: OUTCOME.NO_POSTCODE, value: id });
                return;
            }

            var currentRegion = columnValue(values, FIELD.SUB_REGION);
            var storedPostcode = columnValue(values, FIELD.POSTCODE);

            // Option 1: nightly run only processes new or changed records.
            if (!isReprocessAll() && storedPostcode === postcode && currentRegion) {
                context.write({ key: OUTCOME.SKIPPED_UNCHANGED, value: id });
                return;
            }

            var region = regionMap.getRegion(postcode);
            if (region.regionId === null) {
                // Postcode present but has no leading letters (e.g. '- None -').
                context.write({ key: OUTCOME.NO_POSTCODE, value: id });
                return;
            }

            if (!region.matched) {
                context.write({ key: OUTCOME.UNMATCHED, value: id });
                log.audit('SRS_UNMATCHED', { recordId: id, postcode: postcode, prefix: region.prefix });
            }

            var engineerId = regionMap.getEngineer(region.regionId);
            var engineerChanged = !!engineerId &&
                columnValue(values, regionMap.ENGINEER_FIELD_ID) !== engineerId;

            if (currentRegion === region.regionId && storedPostcode === postcode && !engineerChanged) {
                context.write({ key: OUTCOME.SKIPPED_UNCHANGED, value: id });
                return;
            }

            var fields = {};
            fields[FIELD.SUB_REGION] = region.regionId;
            fields[FIELD.CHECK] = true;
            fields[FIELD.POSTCODE] = postcode;
            if (engineerId) {
                fields[regionMap.ENGINEER_FIELD_ID] = engineerId;
            }

            try {
                record.submitFields({
                    type: result.recordType || record.Type.CUSTOMER,
                    id: id,
                    values: fields,
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                });
            } catch (e) {
                log.error('SRS_ERROR', { stage: 'map', recordId: id, name: e.name, message: e.message });
                context.write({ key: OUTCOME.ERROR, value: id });
                return;
            }
            context.write({ key: OUTCOME.UPDATED, value: id });
        }

        function summarize(summary) {
            var counts = {};
            counts[OUTCOME.PROCESSED] = 0;
            counts[OUTCOME.UPDATED] = 0;
            counts[OUTCOME.SKIPPED_UNCHANGED] = 0;
            counts[OUTCOME.NO_POSTCODE] = 0;
            counts[OUTCOME.UNMATCHED] = 0;
            counts[OUTCOME.ERROR] = 0; // submitFields failures (caught in map) plus uncaught map errors

            try {
                // No reduce stage, so summary.output holds the map output.
                summary.output.iterator().each(function (key) {
                    if (Object.prototype.hasOwnProperty.call(counts, key)) {
                        counts[key]++;
                    }
                    return true;
                });
            } catch (e) {
                log.error('SRS_ERROR', { stage: 'summarize-output', name: e.name, message: e.message });
            }

            try {
                if (summary.inputSummary.error) {
                    counts[OUTCOME.ERROR]++;
                    log.error('SRS_ERROR', { stage: 'getInputData', error: summary.inputSummary.error });
                }
                summary.mapSummary.errors.iterator().each(function (key, error) {
                    counts[OUTCOME.ERROR]++;
                    log.error('SRS_ERROR', { stage: 'map', recordId: key, error: error });
                    return true;
                });
            } catch (e) {
                log.error('SRS_ERROR', { stage: 'summarize-errors', name: e.name, message: e.message });
            }

            counts.reprocessAll = isReprocessAll();
            log.audit('SRS_SUMMARY', counts);
        }

        return {
            getInputData: getInputData,
            map: map,
            summarize: summarize
        };
    });
