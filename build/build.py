#!/usr/bin/env python3
"""PTFI metadata build step.

Reads the two human-edited sources of truth in data/ and regenerates the two
machine artifacts the page consumes. Never edit terms.js or palette.css by hand
- edit the CSVs and run this script (or push, and the GitHub Action runs it).

    data/schema.csv   ->  terms.js      (window.PTFI_FACETS + window.PTFI_TERMS)
    data/groups.csv   ->  terms.js facets + palette.css (colours, rainbow, grid)

Standard library only - no pip install needed.
"""

import csv
import json
import os
import re
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCHEMA = os.path.join(ROOT, "data", "schema.csv")
GROUPS = os.path.join(ROOT, "data", "groups.csv")
TERMS_OUT = os.path.join(ROOT, "terms.js")
PALETTE_OUT = os.path.join(ROOT, "palette.css")
SCHEMA_VERSION = "8.0.0"

REQ = {"Required": "required", "Conditional": "conditional",
       "Optional": "optional", "Curator-assigned": "curator"}


def req_of(v):
    v = (v or "").strip()
    return REQ[v]


def value_scheme_href(s):
    s = (s or "").lower()
    table = [
        ("8601", "https://www.iso.org/iso-8601-date-and-time-format.html"),
        ("3166", "https://www.iso.org/iso-3166-country-codes.html"),
        ("bcp", "https://www.rfc-editor.org/info/bcp47"),
        ("unit ontology", "https://www.ebi.ac.uk/ols4/ontologies/uo"),
        ("(uo)", "https://www.ebi.ac.uk/ols4/ontologies/uo"),
        ("foodon", "https://www.ebi.ac.uk/ols4/ontologies/foodon"),
        ("ncbi", "https://www.ebi.ac.uk/ols4/ontologies/ncbitaxon"),
        ("geonames", "https://www.geonames.org/"),
        ("6709", "https://www.iso.org/standard/75147.html"),
        ("9562", "https://www.rfc-editor.org/info/rfc9562"),
        ("uuid", "https://www.rfc-editor.org/info/rfc9562"),
        ("spdx", "https://spdx.org/licenses/"),
    ]
    for key, url in table:
        if key in s:
            return url
    return ""


def standard_href(term):
    if term.startswith("dwc:"):
        return "https://dwc.tdwg.org/list/#dwc_" + term.split(":", 1)[1]
    if term.startswith("dcterms:"):
        return "http://purl.org/dc/terms/" + term.split(":", 1)[1]
    return ""


def split_list(v):
    if v is None:
        return []
    s = str(v).strip()
    if not s:
        return []
    parts = [p.strip() for p in s.split(";") if p.strip()]
    if len(parts) == 1 and ("," in s) and len(s) < 140:
        parts = [p.strip() for p in s.split(",") if p.strip()]
    return parts


def read_rows(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        if not rows or any(None in row or any(v is None for v in row.values()) for row in rows):
            raise ValueError(f"{path}: empty or malformed CSV rows")
        return rows


def validate(groups, schema):
    group_columns = {"id", "name", "role", "blurb", "fill", "accent", "ink", "order"}
    schema_columns = {"element_id", "name", "group", "obligation", "datatype", "occurrence",
                      "format", "value_scheme", "allowed_values", "examples", "maps_to",
                      "match_type", "definition", "curation_note"}
    if not groups or not schema:
        raise ValueError("Groups and schema must contain rows")
    group_ids, term_ids = set(), set()
    for g in groups:
        if not group_columns.issubset(g):
            raise ValueError("groups.csv: missing columns")
        if not re.fullmatch(r"[a-z][a-z0-9_-]*", g["id"]) or g["id"] in group_ids:
            raise ValueError(f"Invalid or duplicate group ID: {g['id']}")
        group_ids.add(g["id"])
        int(g["order"])
        if not g["name"].strip():
            raise ValueError("Group name is required")
        for color in ("fill", "accent", "ink"):
            if not re.fullmatch(r"#[0-9a-fA-F]{6}", g[color]):
                raise ValueError(f"Invalid {color} colour for {g['id']}")
    for r in schema:
        if not schema_columns.issubset(r):
            raise ValueError("schema.csv: missing columns")
        key = r["element_id"]
        if not re.fullmatch(r"[a-z][a-z0-9_]*", key) or key in term_ids:
            raise ValueError(f"Invalid or duplicate element ID: {key}")
        term_ids.add(key)
        if r["group"] not in group_ids:
            raise ValueError(f"{key}: unknown group {r['group']!r}; use a groups.csv ID")
        if r["obligation"] not in REQ:
            raise ValueError(f"{key}: unsupported obligation {r['obligation']!r}")
        if not r["name"].strip() or not r["definition"].strip():
            raise ValueError(f"{key}: name and definition are required")


def build_terms(groups, schema):
    validate(groups, schema)
    facets = []
    for g in sorted(groups, key=lambda x: int(x.get("order") or 0)):
        facets.append({
            "id": g["id"], "name": g["name"], "role": g["role"], "blurb": g["blurb"],
            "count": sum(1 for r in schema if r["group"].strip().lower() == g["id"]),
        })
    group_id = {g["name"].strip().lower(): g["id"] for g in groups}
    group_id.update({g["id"]: g["id"] for g in groups})

    terms = []
    for r in schema:
        gkey = r["group"].strip().lower()
        facet = group_id.get(gkey, gkey)
        vs = (r.get("value_scheme") or "").strip()
        maps_to = []
        if vs and vs.lower() != "ptfi in-house vocabulary":
            maps_to.append({"label": vs, "href": value_scheme_href(vs)})
        std_term = (r.get("maps_to") or "").strip()
        standard = None
        if std_term:
            standard = {"term": std_term,
                        "match": (r.get("match_type") or "").strip() or "close",
                        "href": standard_href(std_term)}
        terms.append({
            "key": (r.get("element_id") or "").strip(),
            "name": r["name"], "facet": facet, "required": req_of(r["obligation"]),
            "occurrence": r.get("occurrence") or "",
            "type": r.get("datatype") or "", "format": (r.get("format") or "").strip(),
            "definition": r.get("definition") or "",
            "values": split_list(r.get("allowed_values")),
            "mapsTo": maps_to, "standard": standard,
            "examples": split_list(r.get("examples")),
            "curation": (r.get("curation_note") or "").strip(),
        })

    head = (
        "/* GENERATED by build/build.py - do not edit by hand.\n"
        "   Sources: data/schema.csv (variables) + data/groups.csv (groups + colours).\n"
        "   Edit those, then run `python build/build.py` (or push - the Action does it). */\n\n"
    )
    out = head
    out += 'window.PTFI_VERSION = { schema: "%s", revised: "%s" };\n\n' % (
        SCHEMA_VERSION, date.today().isoformat())
    out += "window.PTFI_FACETS = " + json.dumps(facets, ensure_ascii=False, indent=2) + ";\n\n"
    out += "window.PTFI_TERMS = [\n"
    for t in terms:
        out += "  " + json.dumps(t, ensure_ascii=False) + ",\n"
    out += "];\n"
    return out, len(terms), facets


def build_palette(groups):
    gs = sorted(groups, key=lambda x: int(x.get("order") or 0))
    lines = ["/* GENERATED by build/build.py - do not edit by hand. Edit data/groups.csv. */", ":root {"]
    for g in gs:
        lines.append("  --%s-fill: %s; --%s-acc: %s; --%s-ink: %s;" % (
            g["id"], g["fill"], g["id"], g["accent"], g["id"], g["ink"]))
    n = len(gs)
    step = round(100 / n, 4)
    stops = []
    for i, g in enumerate(gs):
        a, b = round(i * step, 4), round((i + 1) * step, 4)
        stops.append("var(--%s-acc) %s%% %s%%" % (g["id"], a, b))
    lines.append("  --group-count: %d;" % n)
    lines.append("  --rainbow: linear-gradient(90deg, %s);" % ", ".join(stops))
    lines.append("}")
    return "\n".join(lines) + "\n"


def main():
    groups = read_rows(GROUPS)
    schema = read_rows(SCHEMA)
    terms_js, n_terms, facets = build_terms(groups, schema)
    palette_css = build_palette(groups)
    with open(TERMS_OUT, "w", encoding="utf-8") as f:
        f.write(terms_js)
    with open(PALETTE_OUT, "w", encoding="utf-8") as f:
        f.write(palette_css)
    print("Built terms.js  : %d variables across %d groups (%s)" % (
        n_terms, len(facets), ", ".join("%s=%d" % (f["id"], f["count"]) for f in facets)))
    print("Built palette.css: %d group palettes" % len(groups))


if __name__ == "__main__":
    main()
