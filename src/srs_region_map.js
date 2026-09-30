/**
 * srs_region_map.js
 * Shared postcode-prefix to sub-region mapping for customer records.
 *
 * No N/ module dependencies, so it can be unit-tested in plain Node.
 * Canonical copy of the mapping: data/postcode_prefix_mapping.csv. Keep the two in step;
 * tests/region_map.test.js fails if they differ.
 *
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 */
define([], function () {
    'use strict';

    // Internal IDs of values in custom list customlist702 (Sub-Region), confirmed 30/09/26.
    // Legacy values 8 (North West), 9 (North East), 14 (Unsupported 1), 15 (Unsupported 2)
    // and 16 (South Central) are no longer assigned.
    var REGION = {
        SOUTH_WEST: '3',
        SOUTH_EAST: '5',
        MID_NORTH: '17',
        UNDEFINED: '12'
    };

    var SOUTH_WEST_PREFIXES = [
        'BA', 'BH', 'BN', 'BS', 'DT', 'EX', 'GU', 'GY', 'JE', 'PL', 'PO', 'RG', 'SL', 'SN',
        'SO', 'SP', 'TA', 'TQ', 'TR'
    ];

    // HP and SG are South East deliberately. W is South East (the source sheet's South West was a typo).
    var SOUTH_EAST_PREFIXES = [
        'AL', 'BR', 'CM', 'CO', 'CR', 'CT', 'DA', 'E', 'EC', 'EN', 'HA', 'HP', 'IG', 'KT',
        'ME', 'N', 'NW', 'RH', 'RM', 'SE', 'SG', 'SM', 'SS', 'SW', 'TN', 'TW', 'UB', 'W',
        'WC', 'WD'
    ];

    // DE is Mid & North (the source sheet's South West was a typo). HS added.
    // D and Y are not UK postcode areas; kept deliberately as harmless.
    var MID_NORTH_PREFIXES = [
        'AB', 'B', 'BB', 'BD', 'BL', 'BT', 'CA', 'CB', 'CF', 'CH', 'CV', 'CW', 'D', 'DD',
        'DE', 'DG', 'DH', 'DL', 'DN', 'DY', 'EH', 'FK', 'FY', 'G', 'GL', 'HD', 'HG', 'HR',
        'HS', 'HU', 'HX', 'IM', 'IP', 'IV', 'KA', 'KW', 'KY', 'L', 'LA', 'LD', 'LE', 'LL',
        'LN', 'LS', 'LU', 'M', 'MK', 'ML', 'NE', 'NG', 'NN', 'NP', 'NR', 'OL', 'OX', 'PA',
        'PE', 'PH', 'PR', 'S', 'SA', 'SK', 'SR', 'ST', 'SY', 'TD', 'TF', 'TS', 'WA', 'WF',
        'WN', 'WR', 'WS', 'WV', 'Y', 'YO', 'ZE'
    ];

    var PREFIX_TO_REGION = {};

    function addPrefixes(prefixes, regionId) {
        for (var i = 0; i < prefixes.length; i++) {
            PREFIX_TO_REGION[prefixes[i]] = regionId;
        }
    }

    addPrefixes(SOUTH_WEST_PREFIXES, REGION.SOUTH_WEST);
    addPrefixes(SOUTH_EAST_PREFIXES, REGION.SOUTH_EAST);
    addPrefixes(MID_NORTH_PREFIXES, REGION.MID_NORTH);

    // Project engineer. Engineer writes are skipped until the field ID and all three
    // active-region employee IDs are filled in (see isEngineerConfigured).
    var ENGINEER_FIELD_ID = null; // TODO: confirm project engineer field ID on customer

    var ENGINEER_BY_REGION = {};
    ENGINEER_BY_REGION[REGION.SOUTH_WEST] = null; // Tracey Hillier. TODO: confirm employee internal ID
    ENGINEER_BY_REGION[REGION.SOUTH_EAST] = null; // Tarquin Wagstaffe. TODO: confirm employee internal ID
    ENGINEER_BY_REGION[REGION.MID_NORTH] = null; // Caroline Cornwell. TODO: confirm employee internal ID
    ENGINEER_BY_REGION[REGION.UNDEFINED] = null; // No engineer for Undefined; stays null by design

    /**
     * Postcode area prefix: the leading one or two letters after normalising.
     * A leading Y0 (zero) is corrected to YO (letter O) before matching.
     * @param {string} postcode
     * @returns {string} uppercase prefix, or '' if the postcode has no leading letters
     */
    function getPrefix(postcode) {
        if (postcode === null || postcode === undefined) {
            return '';
        }
        var pc = String(postcode).trim().toUpperCase().replace(/\s+/g, '');
        if (pc.indexOf('Y0') === 0) {
            pc = 'YO' + pc.substring(2);
        }
        var match = pc.match(/^[A-Z]{1,2}/);
        return match ? match[0] : '';
    }

    /**
     * @param {string} postcode
     * @returns {{prefix: string, regionId: (string|null), matched: boolean}}
     *   regionId null means "no usable postcode, do nothing".
     *   An unknown prefix returns REGION.UNDEFINED with matched false.
     */
    function getRegion(postcode) {
        var prefix = getPrefix(postcode);
        if (!prefix) {
            return { prefix: '', regionId: null, matched: false };
        }
        if (Object.prototype.hasOwnProperty.call(PREFIX_TO_REGION, prefix)) {
            return { prefix: prefix, regionId: PREFIX_TO_REGION[prefix], matched: true };
        }
        return { prefix: prefix, regionId: REGION.UNDEFINED, matched: false };
    }

    /**
     * True only when the engineer field and all three active-region employee IDs are set.
     * Undefined (12) has no engineer and is not part of this check.
     * @returns {boolean}
     */
    function isEngineerConfigured() {
        return !!(ENGINEER_FIELD_ID &&
            ENGINEER_BY_REGION[REGION.SOUTH_WEST] &&
            ENGINEER_BY_REGION[REGION.SOUTH_EAST] &&
            ENGINEER_BY_REGION[REGION.MID_NORTH]);
    }

    /**
     * @param {string} regionId
     * @returns {(string|null)} employee internal ID, or null when unconfigured or no engineer for the region
     */
    function getEngineer(regionId) {
        if (!isEngineerConfigured()) {
            return null;
        }
        var id = ENGINEER_BY_REGION[String(regionId)];
        return id ? String(id) : null;
    }

    return {
        REGION: REGION,
        PREFIX_TO_REGION: PREFIX_TO_REGION,
        ENGINEER_FIELD_ID: ENGINEER_FIELD_ID,
        ENGINEER_BY_REGION: ENGINEER_BY_REGION,
        getPrefix: getPrefix,
        getRegion: getRegion,
        getEngineer: getEngineer,
        isEngineerConfigured: isEngineerConfigured
    };
});
