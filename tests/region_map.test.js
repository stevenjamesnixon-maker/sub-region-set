'use strict';

var test = require('node:test');
var assert = require('node:assert');
var fs = require('node:fs');
var path = require('node:path');

// Minimal AMD shim: evaluate the module with a local define() that captures its export.
function loadAmd(file) {
    var exported;
    var define = function (deps, factory) {
        exported = factory();
    };
    var source = fs.readFileSync(file, 'utf8');
    new Function('define', source)(define);
    return exported;
}

var root = path.join(__dirname, '..');
var map = loadAmd(path.join(root, 'src', 'srs_region_map.js'));
var R = map.REGION;

function regionOf(postcode) {
    return map.getRegion(postcode).regionId;
}

test('1. W / WA / WC and SW resolve correctly', function () {
    assert.strictEqual(regionOf('SW1A 1AA'), R.SOUTH_EAST);
    assert.strictEqual(regionOf('W11 4LJ'), R.SOUTH_EAST);
    assert.strictEqual(regionOf('WA4 6HL'), R.MID_NORTH);
    assert.strictEqual(regionOf('WC2H 9JQ'), R.SOUTH_EAST);
});

test('2. confirmed decisions: DE, HP, SG, HS', function () {
    assert.strictEqual(regionOf('DE56 0LS'), R.MID_NORTH);
    assert.strictEqual(regionOf('HP7 0UT'), R.SOUTH_EAST);
    assert.strictEqual(regionOf('SG1 2JE'), R.SOUTH_EAST);
    assert.strictEqual(regionOf('HS1 2AA'), R.MID_NORTH);
});

test('3. lowercase input', function () {
    assert.strictEqual(regionOf('np19 0lw'), R.MID_NORTH);
});

test('4. leading Y0 corrected to YO', function () {
    assert.strictEqual(map.getPrefix('Y07 1PU'), 'YO');
    assert.strictEqual(regionOf('Y07 1PU'), R.MID_NORTH);
    assert.strictEqual(regionOf('Y011 3PY'), R.MID_NORTH);
});

test('5. no space, and padded lowercase', function () {
    assert.strictEqual(regionOf('SG189AB'), R.SOUTH_EAST);
    assert.strictEqual(regionOf('  tr13 0ew '), R.SOUTH_WEST);
});

test('6. no usable postcode returns regionId null', function () {
    ['- None -', '', null].forEach(function (input) {
        var r = map.getRegion(input);
        assert.strictEqual(r.regionId, null, JSON.stringify(input));
        assert.strictEqual(r.matched, false);
    });
});

test('7. unknown prefix goes to Undefined, unmatched', function () {
    var r = map.getRegion('ZZ1 1ZZ');
    assert.strictEqual(r.regionId, R.UNDEFINED);
    assert.strictEqual(r.regionId, '12');
    assert.strictEqual(r.matched, false);
    assert.strictEqual(r.prefix, 'ZZ');
});

test('8. single-letter D prefix', function () {
    assert.strictEqual(regionOf('D12 ER04'), R.MID_NORTH);
});

test('9. JS map matches data/postcode_prefix_mapping.csv exactly', function () {
    var nameToId = {
        'South West': R.SOUTH_WEST,
        'South East': R.SOUTH_EAST,
        'Mid & North': R.MID_NORTH
    };
    var lines = fs.readFileSync(path.join(root, 'data', 'postcode_prefix_mapping.csv'), 'utf8')
        .split(/\r?\n/).filter(function (l) { return l.trim() !== ''; });
    assert.strictEqual(lines[0], 'Postcode Prefix,Sales Region');

    var rows = lines.slice(1).map(function (l) { return l.split(','); });
    var prefixes = rows.map(function (r) { return r[0]; });
    assert.deepStrictEqual(prefixes, prefixes.slice().sort(), 'CSV rows sorted alphabetically');
    assert.strictEqual(new Set(prefixes).size, prefixes.length, 'no duplicate prefixes');

    var fromCsv = {};
    rows.forEach(function (r) {
        assert.strictEqual(r.length, 2, r.join(','));
        assert.strictEqual(r[0], r[0].toUpperCase());
        assert.ok(nameToId[r[1]], 'known region name: ' + r[1]);
        fromCsv[r[0]] = nameToId[r[1]];
    });
    assert.deepStrictEqual(Object.assign({}, map.PREFIX_TO_REGION), fromCsv);
    assert.strictEqual(prefixes.length, 126);
});

test('10. getEngineer returns null while unconfigured', function () {
    assert.strictEqual(map.isEngineerConfigured(), false);
    [R.SOUTH_WEST, R.SOUTH_EAST, R.MID_NORTH, R.UNDEFINED, null, 'x'].forEach(function (id) {
        assert.strictEqual(map.getEngineer(id), null);
    });
});
