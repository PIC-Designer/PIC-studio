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

    def test_codebook_extension_is_append_only(self):
        existing = MODULE.empty_codebook()
        first = MODULE.parse_name("SiN200_780nm_TE_strip_GC", "SiN200")
        first["name"] = "SiN200_780nm_TE_strip_GC"
        MODULE.update_codebook(existing, [first])
        original_platforms = list(existing["fields"]["platform"])

        new_design = MODULE.parse_name("NEW900_980nm_TM_strip_GC_new", "NEW900")
        new_design["name"] = "NEW900_980nm_TM_strip_GC_new"
        MODULE.update_codebook(existing, [new_design])

        self.assertEqual(existing["fields"]["platform"][:len(original_platforms)], original_platforms)
        self.assertEqual(existing["fields"]["platform"][-1], "NEW900")
        self.assertEqual(existing["fields"]["suffix1"][-1], "new")


if __name__ == "__main__":
    unittest.main()
