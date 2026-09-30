# Sub-region set

Sub-region assignment scripts for NetSuite customers. They set `custentity_sub_region` (custom list `customlist702`) on customer records from the postcode prefix.

This README is the project context document. Version numbers are stated in the files themselves. If this table and a file disagree, the file is right.

## Components and versions

Version: **1.0.0** (October 2026 remap, SuiteScript 2.1 rewrite)

| File | Type | Purpose |
|---|---|---|
| `src/srs_region_map.js` | Custom AMD module (no script record) | Prefix → region map, postcode normalisation, engineer config |
| `src/srs_ue_customer.js` | User Event, Customer, `beforeSubmit` | Sets the sub-region on create/edit |
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

## Deployment checklist (Sandbox first)

1. Upload `srs_region_map.js` **first**, then `srs_ue_customer.js` and `srs_mr_update.js`, to the same folder.
2. Create the User Event script record (`srs_ue_customer.js`) and a deployment on **Customer**.
3. Create the Map/Reduce script record (`srs_mr_update.js`) with checkbox parameter `custscript_srs_reprocess_all`, and two deployments:
   - `customdeploy_srs_nightly`: scheduled daily, reprocess-all **unticked**
   - `customdeploy_srs_adhoc`: not scheduled, reprocess-all **ticked**
4. Run the ad-hoc deployment once. This is the migration.
   > ⚠ **Caution:** the legacy scheduled deployments (step 6) still write the old region values and the field sales rep if they run after the migration. Consider setting them to Not Scheduled before this step.
5. Check the `SRS_SUMMARY` and `SRS_UNMATCHED` logs.
6. Set the legacy deployments to Not Deployed:
   - `customdeploy1`, `customdeploy2`, `customdeploy3` (`scheduledSubRegionUpdate`)
   - the legacy on-save deployment (`subRegion`)
7. Inactivate list values 8, 9, 14, 15 and 16 in `customlist702`.

## Behaviour

**User Event (`beforeSubmit`, create and edit only).** Skipped for xedit, delete and other types, and when the execution context is Map/Reduce. Reads the postcode from the `addressbook` sublist's default billing line (no parent) or default shipping line (sub-customer), using the `addressbookaddress` subrecord `zip`. Writes when the region or the postcode differs from what's stored. Any error is logged as `SRS_ERROR` and never blocks the save.

**Map/Reduce.** Searches all customers, active and inactive, with no saved search. For each customer:
- skips it when it has no postcode;
- unless reprocess-all is ticked, skips it when the stored postcode equals the current postcode and a region is set;
- otherwise computes the region and, if anything changes, calls `record.submitFields` with `ignoreMandatoryFields: true` and `enableSourcing: false`.

**Fields written** (by both scripts):
- `custentity_sub_region`
- `custentity_subregion_check = true`
- `custentity_subregion_postcode`
- the project engineer, once configured

## Open items

- The project engineer field ID on customer (`ENGINEER_FIELD_ID`).
- The three employee internal IDs: Tracey Hillier (South West), Tarquin Wagstaffe (South East), Caroline Cornwell (Mid & North).
- Engineer writes stay off until the field ID and all three employee IDs are set. Customers in Undefined (12) have no engineer, so their engineer field is left untouched.
- Whether the engineer should overwrite an existing value. The current code overwrites it whenever the region is written.

## Audit log keys

| Key | Level | Where | Meaning |
|---|---|---|---|
| `SRS_UNMATCHED` | audit | UE, MR map | Prefix not in the map; region set to Undefined (12). Logs the record ID and raw postcode. |
| `SRS_SUMMARY` | audit | MR summarize | Counts: processed, updated, skipped-unchanged, no-postcode, unmatched, errors |
| `SRS_ERROR` | error | UE, MR map and summarize | Any failure. The UE never blocks the save. |

## Deliberate decisions (so they aren't "fixed" later)

- **Unmatched prefixes go to Undefined (12), not blank,** so the nightly run doesn't reprocess them forever.
- **`Y0` → `YO` correction** before lookup.
- **The parent rule is kept from the legacy script:** billing postcode for top-level customers, shipping postcode for sub-customers. A `parent` value equal to the record's own ID is treated as no parent.
- **The field sales rep is deliberately not touched.** The legacy script set `custentity_field_sales_rep`; the new scripts don't read or write it.
- **The UE enforces the mapped region on every create/edit** where the region or postcode differs. The legacy on-save function only filled a blank region, so manual overrides of the sub-region no longer survive a save.

## Tests

```
npm test
```

Requires Node 18 or later. No dependencies.
