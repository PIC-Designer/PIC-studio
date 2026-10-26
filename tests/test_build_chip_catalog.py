import importlib.util
import unittest
from pathlib import Path


SCRIPT = Path(__file__).parents[1] / "scripts" / "build_chip_catalog.py"
SPEC = importlib.util.spec_from_file_location("build_chip_catalog", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(MODULE)


class ChipHeaderTests(unittest.TestCase):
    def test_two_main_blocks_and_case_insensitive_fields(self):
        blocks = MODULE.parse_header(
            '''"""
            main: main_TE()
            platform: SiN200
            wavelengths: 520nm, 638nm, 780nm
            ios: Grating Coupler
            type: test chip
            create data: 08/2026

            MAIN: main_TM()
            PLATFORM: SiN200
            WAVELENGTHS: 520nm, 638nm, 780nm
            IOS: Grating Coupler
            TYPE: test chip
            CREATE DATA: 08/2026
            """'''
        )
        self.assertEqual(len(blocks), 2)
        self.assertEqual(blocks[0]["MAIN"], "main_TE()")
        self.assertEqual(blocks[1]["MAIN"], "main_TM()")
        self.assertNotEqual(MODULE.uid_for(blocks[0]), MODULE.uid_for(blocks[1]))
        self.assertEqual(len(MODULE.uid_for(blocks[0])), 13)

    def test_missing_header_is_placeholder(self):
        record = MODULE.record_for(Path("chip.py"), "0_SiN200_dies/chip.py", {}, 1)
        self.assertEqual(record["uid"], "PLACEHOLDER")
        self.assertEqual(record["uidStatus"], "placeholder")
        self.assertEqual(record["missingMetadata"], list(MODULE.FIELD_ORDER))

    def test_uid_is_deterministic_and_main_is_a_factor(self):
        block = {
            "MAIN": "main_TE()",
            "PLATFORM": "SiN200",
            "WAVELENGTHS": "520nm, 638nm, 780nm",
            "IOS": "Grating Coupler",
            "TYPE": "test chip",
            "CREATE DATA": "08/2026",
        }
        self.assertEqual(MODULE.uid_for(block), MODULE.uid_for(dict(block)))
        changed = dict(block, MAIN="main_TM()")
        self.assertNotEqual(MODULE.uid_for(block), MODULE.uid_for(changed))

    def test_uid_values_are_case_insensitive(self):
        block = {
            "MAIN": "main_TE()",
            "PLATFORM": "SiN200",
            "WAVELENGTHS": "520nm, 638nm, 780nm",
            "IOS": "Grating Coupler",
            "TYPE": "test chip",
            "CREATE DATA": "08/2026",
        }
        changed_case = {key.lower(): value.swapcase() for key, value in block.items()}
        parsed = MODULE.parse_header(
            '\"\"\"\n' + '\n'.join(f"{key}: {value}" for key, value in changed_case.items()) + '\n\"\"\"'
        )[0]
        self.assertEqual(MODULE.uid_for(block), MODULE.uid_for(parsed))

    def test_comments_are_displayed_but_do_not_change_uid(self):
        text = '''"""
        mAIn: main_TE()
        plaTForm: SiN200
        waveLENGTHS: 520nm, 638nm, 780nm
        iOs: Grating Coupler
        tYPe: test chip
        CREATE DATA: 08/2026
        coMMents: A short chip introduction.
        """'''
        block = MODULE.parse_header(text)[0]
        uid_with_comment = MODULE.uid_for(block)
        changed_comment = dict(block, COMMENTS="Completely different text and CASE.")
        self.assertEqual(uid_with_comment, MODULE.uid_for(changed_comment))
        record = MODULE.record_for(Path("chip.py"), "0_SiN200_dies/chip.py", block, 1)
        self.assertEqual(record["comments"], "A short chip introduction.")
        self.assertEqual(record["description"], "A short chip introduction.")

    def test_pass_this_die_skips_the_source(self):
        self.assertTrue(MODULE.should_skip('''"""\n  PaSs   ThIs   DiE  \n"""\nprint("ignored")'''))
        self.assertFalse(MODULE.should_skip('''"""\nMAIN: main()\n"""'''))

    def test_comma_separated_element_order_does_not_change_uid(self):
        block = {
            "MAIN": "main()",
            "PLATFORM": "SOI220",
            "WAVELENGTHS": "cband, oband",
            "IOS": "Grating Coupler",
            "TYPE": "test chip",
            "CREATE DATA": "08/2026",
        }
        reordered = dict(block, WAVELENGTHS="OBAND,CBAND")
        self.assertEqual(MODULE.uid_for(block), MODULE.uid_for(reordered))


if __name__ == "__main__":
    unittest.main()
