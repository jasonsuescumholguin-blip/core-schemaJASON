# Contributing

The golden rule: **only edit the two CSV files in `data/`.** Everything else
(`terms.js`, `palette.css`) is generated and will be overwritten — never edit
those by hand, and use the CSVs for routine schema and colour edits. Changes to the data
model or page behaviour may also require code changes.

## Edit a variable

Open `data/schema.csv` (Excel → "Save As CSV", or any text editor) and edit the
row. Columns:

| Column | Notes |
|---|---|
| `element_id` | snake_case key, e.g. `collection_country` |
| `name` | human label shown on the card |
| `group` | a lowercase ID from groups.csv: `study`, `specimen`, `sample`, or `aliquot` |
| `obligation` | `Required` / `Conditional` / `Optional` / `Curator-assigned` |
| `datatype`, `occurrence`, `format` | value type, single/multiple, format hint |
| `value_scheme` | standard for the **value** (ISO 8601, Unit Ontology, FoodOn…). The link is added automatically. |
| `allowed_values`, `examples` | use `;` to separate multiple entries |
| `maps_to` | external **property** it equals: `dwc:…` or `dcterms:…`. Leave blank if the term is PTFI-original. |
| `match_type` | `exact` or `close` (only when `maps_to` is filled) |
| `definition`, `curation_note` | documentation |

To **add** a variable, add a new row. To **remove** one, delete its row.

## Add or recolour a group

Edit `data/groups.csv`. Columns: `id, name, role, blurb, fill, accent, ink,
order`. Change `fill` / `accent` / `ink` (hex) to recolour a group; the page
colours, the top bar and the grid all follow automatically. Add a row to add a
group.

## Publish

- **Just push** to `main`. A GitHub Action runs `build/build.py`, regenerates
  `terms.js` + `palette.css`, and deploys the site to GitHub Pages. Nothing is
  committed back — the generated files are not stored in the repo.

## Preview locally

```bash
python build/build.py        # generate terms.js + palette.css locally
python3 -m http.server       # open http://localhost:8000
```

(`terms.js` / `palette.css` are git-ignored and generated on deploy; build them
locally just for preview. Use the HTTP preview above to reproduce the published-site environment.)

## One-time repo settings

- Settings → Pages → Source → **GitHub Actions**.
  (No "read and write" Actions permission is needed — deployment uses the
  least-privilege Pages permission instead.)


## Current schema and review workflow

The schema contains 47 variables: Study (4), Specimen (27), Sample (14), and
Aliquot (2). Use unique element IDs and exact lowercase group IDs. The page
calculates its totals and category sequence from the generated data.

Collection Location Level 0 keeps the ID `collection_country`. Levels 1–5
use `collection_location_level_1` through `collection_location_level_5`.
They replace `collection_admin_area` and `collection_locality`; do not assume
an automatic migration of existing sample records between these fields.

Use only `Required`, `Conditional`, `Optional`, and `Curator-assigned`.
Contributor defaults are documented in `curation_note`, not new obligations:
ABS defaults to 4 and curation status to required unless a curator has already
assigned a value. `specimen_id` remains PTFI-assigned and has no default value.
Save comma-delimited CSV files as UTF-8 without a BOM for the current compiler.

Pull requests run the schema tests and build without deploying. Merging into
`main` runs the tests again and publishes through GitHub Pages. The displayed
Built date is the generation date, not the normative SOP revision date.
Run `python build/test_build.py` before submitting schema changes.
