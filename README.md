# Sub-region set

Sub-region assignment scripts for NetSuite customers. They set `custentity_sub_region` (custom list `customlist702`) on customer records from the postcode prefix.

This README is the project context document. The version is recorded here and in `package.json`. If this document and a file disagree, the file is right.

## Components and versions

Version: **1.1.0** (October 2026 remap, SuiteScript 2.1 rewrite; project engineer from script parameters)

| File | Type | Purpose |
|---|---|---|
| `src/srs_region_map.js` | Custom AMD module (no script record) | Prefix → region map, postcode normalisation, engineer config parsing |
| `src/srs_ue_customer.js` | User Event, Customer / Lead / Prospect, `beforeSubmit` | Sets the sub-region on create/edit |
| `src/srs_mr_update.js` | Map/Reduce | Nightly catch-up and ad-hoc reprocess |
| `data/postcode_prefix_mapping.csv` | Data | Canonical mapping (`Postcode Prefix,Sales Region`) |
| `tests/region_map.test.js` | Node test | Unit tests for the module, including a CSV ↔ module comparison |
| `legacy/sub-region.js` | SuiteScript 1.0 | Legacy script, kept for reference only. Do not modify. |

All three `src/` files go into **one** File Cabinet folder, because the imports are relative (`./srs_region_map`).

## Mapping

Source: the agreed mapping sheet, confirmed by Steve (October 2026). `data/postcode_prefix_mapping.csv` is the canonical copy. `PREFIX_TO_REGION` in `src/srs_region_map.js` must match it, and `npm test` fails if it doesn't.

| Region | `customlist702` ID | Prefixes |
|---|---|---|
| South West | 3 | 19 |
| South East | 5 | 30 |
| Mid & North (list value "Midlands & North") | 17 | 77 |
| Undefined | 12 | fallback for any prefix not in the map |

Legacy values 8 (North West), 9 (North East), 14 (Unsupported 1), 15 (Unsupported 2) and 16 (South Central) are no longer assigned.

The map covers all 124 UK, Channel Islands and Isle of Man postcode areas, plus `D` and `Y`.

Decisions already taken:
- **DE is Mid & North and W is South East.** The source sheet had both as South West, which was a typo.
- **HP and SG are South East.** Deliberate.
- **HS was added** as Mid & North.
- **D and Y stay in the table.** They're not UK areas and are harmless.
- **A leading `Y0` is corrected to `YO`** before lookup (zero typed for the letter O).

How the prefix is derived: trim, uppercase, remove all whitespace, correct a leading `Y0` to `YO`, then take the leading one or two letters. A postcode with no leading letters (empty, `- None -`, digits only) is left alone.

### How to change the map

1. Edit `data/postcode_prefix_mapping.csv` **and** the prefix arrays in `src/srs_region_map.js`.
2. Run `npm test`.
3. Upload `srs_region_map.js` to NetSuite.
4. Run the ad-hoc deployment (`customdeploy_srs_adhoc`) with reprocess-all ticked.

## Prerequisite (before any deployment)

Create the custom entity field `custentity_subregion_postcode`:
- Type: Free-Form Text
- Applies to: Customer
- Display type: Inline Text or Hidden
- Store Value: ticked

It records the postcode that the current region was computed from. The nightly run uses it to find new or changed records.

## Parameters

Project engineer configuration lives in script deployment parameters, never in the code. All four are **Free-Form Text**, no default, Preference *Deployment*. Script parameter IDs are unique across the account, so the UE and MR use different IDs.

| Script | Parameter | Holds |
|---|---|---|
| User Event | `custscript_srs_pe_field` | Customer field ID of the project engineer (lowercase letters, digits, underscores) |
| User Event | `custscript_srs_pe_map` | Region-to-employee pairs: `3:<employee>,5:<employee>,17:<employee>` |
| Map/Reduce | `custscript_srsmr_pe_field` | Same as `custscript_srs_pe_field` |
| Map/Reduce | `custscript_srsmr_pe_map` | Same as `custscript_srs_pe_map` |

Map format: comma-separated `region:employee` pairs of internal IDs (`customlist702` value : employee). Whitespace is tolerated. A region with no pair, Undefined (12) included, gets no engineer; a single pair is valid.

- **Both empty** = engineer off.
- **Half-set** (one empty, the other not) **or malformed** (pair not `region:employee`, non-numeric side, empty pair, repeated region, invalid field ID) = `SRS_CONFIG` error and engineer off.
- **The region write is never blocked** by engineer configuration.

The MR checkbox `custscript_srs_reprocess_all` is unchanged.

## Deployment checklist (Sandbox first)

1. Upload `srs_region_map.js` **first**, then `srs_ue_customer.js` and `srs_mr_update.js`, to the same folder.
2. Create the User Event script record (`srs_ue_customer.js`) and three deployments: **Customer**, **Lead** and **Prospect**. Job is deliberately excluded (see Deliberate decisions).
3. Create the Map/Reduce script record (`srs_mr_update.js`) with checkbox parameter `custscript_srs_reprocess_all`, and two deployments:
   - `customdeploy_srs_nightly`: scheduled daily, reprocess-all **unticked**
   - `customdeploy_srs_adhoc`: not scheduled, reprocess-all **ticked**
4. Set all legacy deployments to Not Deployed:
   - `customdeploy1`, `customdeploy2`, `customdeploy3` (`scheduledSubRegionUpdate`)
   - the legacy on-save deployment (`subRegion`)
5. Run `customdeploy_srs_adhoc` once. This is the migration.
6. Check the `SRS_SUMMARY` and `SRS_UNMATCHED` logs.
7. Inactivate list values 8, 9, 14, 15 and 16 in `customlist702`.
8. Create the four engineer parameters (see Parameters) and set them on every deployment (three UE, two MR).
9. After setting them, run the ad-hoc deployment (`customdeploy_srs_adhoc`) once to backfill engineers. Check `SRS_SUMMARY` shows `engineer: 'on'`.

> Between steps 2 and 5, both the new UE and the legacy on-save script can run on a save. Do steps 2–5 together in one sitting.

## Behaviour

**User Event (`beforeSubmit`, create and edit only; deployed on Customer, Lead and Prospect).** Skipped for xedit, delete and other types, and when the execution context is Map/Reduce. Reads the postcode from the `addressbook` sublist's default billing line (no parent) or default shipping line (sub-customer), using the `addressbookaddress` subrecord `zip`. Writes when the region, the postcode or (when configured) the engineer differs from what's stored. Any error is logged as `SRS_ERROR` and never blocks the save.

**Map/Reduce.** Searches customers (the Customer search type, which includes leads and prospects), active and inactive, with no saved search.

Input depends on the reprocess-all parameter:
- **Ticked (`inputMode: 'all'`):** no filters. Every customer reaches map.
- **Unticked (`inputMode: 'changed-only'`):** a cheap pre-filter returns only customers that might need work. A customer is included when `custentity_sub_region` is empty (`anyof @NONE@`) **or** this formula equals 1:
  `CASE WHEN {custentity_subregion_postcode} = {billzipcode} AND {custentity_subregion_postcode} = {shipzip} THEN 0 ELSE 1 END`
  A customer is left out only when its stored postcode equals **both** its billing and shipping postcodes, so it can't matter which one the parent rule picks. A null stored postcode compares as not-equal, so it is included. The filter is a superset, and map still applies the exact rule below. The cost: every customer whose billing and shipping postcodes differ is included each night and then skipped in map, and so is every customer with no postcode and no stored postcode (counted as no-postcode).
  *Sandbox check:* confirm that `{billzipcode}` and `{shipzip}` are accepted in the formula on a customer search.

The engineer column is added to the search only when the engineer config is valid. An invalid config is logged as `SRS_CONFIG` once, in `getInputData`, not per record.

For each customer, map:
- skips it when it has no postcode;
- unless reprocess-all is ticked, skips it when the stored postcode equals the current postcode and a region is set;
- otherwise computes the region and engineer and, if anything changes (region, postcode or engineer), calls `record.submitFields` with `ignoreMandatoryFields: true` and `enableSourcing: false`.

**Fields written** (by both scripts):
- `custentity_sub_region`
- `custentity_subregion_check = true`
- `custentity_subregion_postcode`
- the project engineer field named in the parameters, when the engineer config is valid and the region has a pair in the map

## Open items

- None for the engineer. Brief 03 (a redesign of the stored-postcode / nightly pre-filter approach) was withdrawn on 10 Oct 2026 after the v1.0.1 migration completed in Production; the v1.0.1 design stays.

## Audit log keys

| Key | Level | Where | Meaning |
|---|---|---|---|
| `SRS_UNMATCHED` | audit | UE, MR map | Prefix not in the map; region set to Undefined (12). Logs the record ID and raw postcode. |
| `SRS_SUMMARY` | audit | MR summarize | Counts: processed, updated, skipped-unchanged, no-postcode, unmatched, errors; plus `reprocessAll`, `inputMode` (`'changed-only'` or `'all'`) and `engineer` (`'on'`, `'off'` or `'invalid'`) |
| `SRS_CONFIG` | error | UE `beforeSubmit`, MR `getInputData` | A half-set or malformed engineer parameter. Logs the reason; the engineer is off and the region is still written. |
| `SRS_ERROR` | error | UE, MR map and summarize | Any failure. The UE never blocks the save. |

## Deliberate decisions (so they aren't "fixed" later)

- **Unmatched prefixes go to Undefined (12), not blank,** so the nightly run doesn't reprocess them forever.
- **`Y0` → `YO` correction** before lookup.
- **The parent rule is kept from the legacy script:** billing postcode for top-level customers, shipping postcode for sub-customers. A `parent` value equal to the record's own ID is treated as no parent.
- **The field sales rep is deliberately not touched.** The legacy script set `custentity_field_sales_rep`; the new scripts don't read or write it.
- **Job is deliberately excluded.** The legacy on-save script was deployed on Lead, Prospect, Customer and Job. The new UE is deployed on Customer, Lead and Prospect only (confirmed by Steve).
- **The UE enforces the mapped region on every create/edit** where the region or postcode differs. The legacy on-save function only filled a blank region, so manual overrides of the sub-region no longer survive a save.
- **The engineer is enforced on every write**, not filled once. A different engineer alone is enough to trigger a write, so a hand-set engineer on a customer is reverted on the next save or ad-hoc run. Exceptions belong on the opportunity's `custbody_pe`.
- **A customer that moves to Undefined keeps its last engineer.** Undefined has no pair in the map, and nothing clears the field.
- **The nightly run does not backfill engineers** on unchanged customers. The nightly skip rule (stored postcode equals current postcode and a region is set) runs before the engineer check, and the pre-filter leaves those customers out anyway. The ad-hoc reprocess-all run backfills them, and so does the UE on the next save.
- **Opportunities inherit at creation only.** `custbody_pe` defaults from the customer's project engineer field when the opportunity is created; existing opportunities are untouched.

## Tests

```
npm test
```

Requires Node 18 or later. No dependencies.
