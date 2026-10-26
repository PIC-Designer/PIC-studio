import importlib.util
import sys
import unittest
from pathlib import Path


SCRIPTS = Path(__file__).parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS))
SPEC = importlib.util.spec_from_file_location("build_catalog", SCRIPTS / "build_catalog.py")
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(MODULE)


class DesignNameParsingTests(unittest.TestCase):
    def test_institution_is_an_assembly_anchor_not_a_device(self):
        parsed = MODULE.parse_name(
            "SOI220_Full_Institution_Integrated_LD_and_GC",
            "SOI220",
        )
        self.assertEqual(parsed["deviceType"], "Other")
        self.assertEqual(parsed["prefixes"], ["Full"])
        self.assertEqual(parsed["suffixes"], ["Integrated", "LD", "GC"])

    def test_half_institution_without_ld_or_gc_has_no_suffix(self):
        parsed = MODULE.parse_name("SOI340_Half_Institution", "SOI340")
        self.assertEqual(parsed["deviceType"], "Other")
        self.assertEqual(parsed["prefixes"], ["Half"])
        self.assertEqual(parsed["suffixes"], [])


if __name__ == "__main__":
    unittest.main()
