/**
 * srs_region_map.js
 * Shared postcode-prefix to sub-region mapping for customer records, and parsing of the
 * project engineer script parameters.
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
     * Parses the project engineer script parameters. The values live in deployment
     * parameters, never in this file.
     *   fieldIdText  customer field ID for the project engineer
     *   mapText      comma-separated region:employee pairs of internal IDs, e.g. '3:11,5:22'
     * Regions with no pair (Undefined 12 included) have no engineer.
     * @param {string} fieldIdText
     * @param {string} mapText
     * @returns {{status: string, fieldId: (string|undefined), byRegion: (Object|undefined), reason: (string|undefined)}}
     *   status 'off' (both empty), 'ok' (valid) or 'invalid' (anything else, with a one-line reason)
     */
    function parseEngineerConfig(fieldIdText, mapText) {
        var fieldId = fieldIdText === null || fieldIdText === undefined ? '' : String(fieldIdText).trim();
        var mapStr = mapText === null || mapText === undefined ? '' : String(mapText).trim();

        if (!fieldId && !mapStr) {
            return { status: 'off' };
        }
        if (!fieldId) {
            return { status: 'invalid', reason: 'engineer map is set but engineer field ID is empty' };
        }
        if (!mapStr) {
            return { status: 'invalid', reason: 'engineer field ID is set but engineer map is empty' };
        }

        fieldId = fieldId.toLowerCase();
        if (!/^[a-z0-9_]+$/.test(fieldId)) {
            return { status: 'invalid', reason: 'engineer field ID "' + fieldId + '" is not a valid field ID' };
        }

        var byRegion = {};
        var pairs = mapStr.split(',');
        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i].trim();
            if (!pair) {
                return { status: 'invalid', reason: 'engineer map has an empty pair at position ' + (i + 1) };
            }
            var sides = pair.split(':');
            if (sides.length !== 2) {
                return { status: 'invalid', reason: 'engineer map pair "' + pair + '" is not region:employee' };
            }
            var regionId = sides[0].trim();
            var employeeId = sides[1].trim();
            if (!/^[0-9]+$/.test(regionId) || !/^[0-9]+$/.test(employeeId)) {
                return { status: 'invalid', reason: 'engineer map pair "' + pair + '" must be numeric on both sides' };
            }
            if (Object.prototype.hasOwnProperty.call(byRegion, regionId)) {
                return { status: 'invalid', reason: 'engineer map pair "' + pair + '" repeats region ' + regionId };
            }
            byRegion[regionId] = employeeId;
        }

        return { status: 'ok', fieldId: fieldId, byRegion: byRegion };
    }

    /**
     * @param {(string|number)} regionId
     * @param {Object} config result of parseEngineerConfig
     * @returns {(string|null)} employee internal ID, or null when config is not 'ok' or the region has no entry
     */
    function getEngineer(regionId, config) {
        if (!config || config.status !== 'ok') {
            return null;
        }
        var key = String(regionId);
        if (!Object.prototype.hasOwnProperty.call(config.byRegion, key)) {
            return null;
        }
        return config.byRegion[key];
    }

    return {
        REGION: REGION,
        PREFIX_TO_REGION: PREFIX_TO_REGION,
        getPrefix: getPrefix,
        getRegion: getRegion,
        parseEngineerConfig: parseEngineerConfig,
        getEngineer: getEngineer
    };
});
