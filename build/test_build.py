import copy
import tempfile
import unittest
from pathlib import Path
import build


class BuildTests(unittest.TestCase):
    def setUp(self):
        self.groups = build.read_rows(build.GROUPS)
        self.schema = build.read_rows(build.SCHEMA)

    def test_reviewed_schema(self):
        _, count, facets = build.build_terms(self.groups, self.schema)
        self.assertEqual(count, 47)
        self.assertEqual([f['count'] for f in facets], [12, 14, 10, 6, 5])
        for key in ('specimen_id', 'specimen_abs_status', 'curation_status'):
            self.assertEqual(next(r for r in self.schema if r['element_id'] == key)['obligation'], 'Curator-assigned')

    def test_invalid_data_rejected(self):
        for column, value in [('group', 'missing'), ('obligation', 'Default value'), ('element_id', self.schema[1]['element_id'])]:
            with self.subTest(column=column):
                rows = copy.deepcopy(self.schema)
                rows[0][column] = value
                with self.assertRaises(ValueError):
                    build.build_terms(self.groups, rows)

    def test_excel_bom(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'groups.csv'
            path.write_text(Path(build.GROUPS).read_text(encoding='utf-8'), encoding='utf-8-sig')
            self.assertEqual(build.read_rows(path), self.groups)


if __name__ == '__main__':
    unittest.main()
