# PTFI Core Metadata Schema

A FAIR reference / data dictionary for every metadata variable collected for a
food sample in the Periodic Table of Food Initiative (PTFI). The site is the
same reference layout the team reviewed; the schema behind it is now driven by a
single source of truth.

**Live reference:** `index.html` (served via GitHub Pages).

---

## Architecture: edit one place, everything regenerates

```
data/
  schema.csv      ← SOURCE OF TRUTH — the 47 variables (edit here)
  groups.csv      ← SOURCE OF TRUTH — the 4 groups + their colours (edit here)
build/
  build.py        ← compiler: CSV → terms.js + palette.css
terms.js          ← GENERATED at deploy time — not stored in the repo
palette.css       ← GENERATED at deploy time — not stored in the repo
index.html        ← page shell (links palette.css + styles.css + terms.js + app.js)
app.js            ← render engine (reads terms.js) — stable
styles.css        ← layout/design — stable
assets/           ← logo, etc.
.github/workflows/build.yml  ← builds + deploys the site to Pages on every push
```

Only the two files in `data/` are edited. Everything below them is produced by
`build.py`:

- `schema.csv` → `window.PTFI_FACETS` + `window.PTFI_TERMS` in `terms.js`.
- `groups.csv` → the group definitions **and** all the colours: `palette.css`
  emits the per-group CSS variables, the top rainbow bar (`--rainbow`), and the
  number of columns in the schema grid (`--group-count`). Recolour or add a
  group by editing one row — no CSS is touched by hand.

`index.html`, `app.js` and `styles.css` carry the design. Counts and category
labels follow the generated data. Structural changes or new field types may
still require code changes.

## How to update

1. Edit `data/schema.csv` (a variable, definition, mapping…) or
   `data/groups.csv` (a group name, blurb, or colour). You can edit these in
   Excel and "Save As CSV".
2. Regenerate:
   - **Automatic:** push to `main`. The GitHub Action runs `build.py`, regenerates
     `terms.js` + `palette.css`, and deploys the whole site to GitHub Pages.
     Nothing is committed back to the repo — the generated files live only in the
     published site, so the Action needs no write access to the repository.

To preview locally, first generate the two files, then serve over HTTP:

```bash
python build/build.py        # creates terms.js + palette.css locally
python3 -m http.server       # then open http://localhost:8000
```

(`terms.js` and `palette.css` are git-ignored — they're regenerated on every
deploy, so they are never committed.)

## Source columns

`schema.csv`: `element_id, name, group, obligation, datatype, occurrence,
format, value_scheme, allowed_values, examples, maps_to, match_type, definition,
curation_note`.

- `value_scheme` — standard that governs the **value** (ISO 8601, ISO 3166,
  Unit Ontology, FoodOn, NCBITaxon, BCP 47, GeoNames…). `build.py` adds the link.
- `maps_to` + `match_type` — the external **property** this field maps to
  (`dwc:` Darwin Core / `dcterms:` Dublin Core) and whether it is an `exact` or
  `close` match. Blank `maps_to` = original PTFI term (no external equivalent).

`groups.csv`: `id, name, role, blurb, fill, accent, ink, order`.

## Mapping approach

Every variable lives under the PTFI namespace
`https://foodperiodictable.org/ptfi/terms/` and, where one exists, maps to an
established standard (`skos:exactMatch` for identical concepts, `skos:closeMatch`
for near ones). Lab-processing fields with no external equivalent are original
PTFI terms. Borrowed vocabularies are referenced, never re-hosted.


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
