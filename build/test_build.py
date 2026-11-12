import json
import re
import unittest
from pathlib import Path
import build


class SchemaTests(unittest.TestCase):
    def test_schema_integrity_and_generated_counts(self):
        groups = build.read_rows(build.GROUPS)
        rows = build.read_rows(build.SCHEMA)
        ids = [r['element_id'] for r in rows]
        group_ids = [g['id'] for g in groups]
        self.assertTrue(rows)
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(len(group_ids), len(set(group_ids)))
        self.assertTrue(all(ids))
        self.assertTrue(all(r['group'] in group_ids for r in rows))
        self.assertTrue(all(r['obligation'] in build.REQ for r in rows))
        js, count, facets = build.build_terms(groups, rows)
        self.assertEqual(count, len(rows))
        self.assertEqual(sum(f['count'] for f in facets), len(rows))
        self.assertEqual(len(facets), len(groups))
        for f in facets:
            self.assertEqual(f['count'], sum(r['group'] == f['id'] for r in rows))
        self.assertIn(f'--group-count: {len(groups)};', build.build_palette(groups))
        # Verify that generated payload includes every row and valid references.
        payload = js.split('window.PTFI_TERMS = ', 1)[1].rsplit(';', 1)[0]
        terms = json.loads(re.sub(r',\s*\]', ']', payload))
        self.assertEqual([t['key'] for t in terms], ids)

    def test_page_contract(self):
        root = Path(build.ROOT)
        html = (root / 'index.html').read_text(encoding='utf-8')
        app = (root / 'app.js').read_text(encoding='utf-8')
        for id in ('statTotal', 'statGroups', 'statReq', 'schemaVersion', 'buildDate', 'categorySequence'):
            self.assertIn(f'id="{id}"', html)
        self.assertNotIn('44 elements', app)
        self.assertIn('${TERMS.length} elements', app)
        self.assertIn('${FACETS.length} categories', app)


if __name__ == '__main__':
    unittest.main()
