import importlib.util
import unittest
from pathlib import Path


SCRIPT = Path(__file__).parents[1] / "scripts" / "design_uid.py"
SPEC = importlib.util.spec_from_file_location("design_uid", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(MODULE)


def sample(**overrides):
    design = {
        "name": "demo",
        "platform": "SiN200",
        "wavelength": "780 nm",
        "mode": "TE",
        "prefixes": ["Fast"],
        "deviceType": "Grating Coupler",
        "suffixes": ["Apodized"],
        "version": "1.0",
    }
    design.update(overrides)
    return design


class DesignUidTests(unittest.TestCase):
    def codebook(self, *designs):
        codebook = MODULE.empty_codebook()
        MODULE.update_codebook(codebook, list(designs))
        return codebook

    def test_v2_golden_value_is_frozen(self):
        design = sample()
        self.assertEqual(MODULE.SCHEME, "DESIGN-UID-v2")
        self.assertEqual(MODULE.encode_uid(self.codebook(design), design), "A66JJ22442246")

    def test_round_trip_supports_three_ordered_prefixes_and_suffixes(self):
        design = sample(prefixes=["A", "B", "C"], suffixes=["X", "Y", "Z"])
        codebook = self.codebook(design)
        decoded = MODULE.decode_uid(codebook, MODULE.encode_uid(codebook, design))
        self.assertEqual(decoded["prefixes"], ["A", "B", "C"])
        self.assertEqual(decoded["suffixes"], ["X", "Y", "Z"])
        self.assertEqual(decoded["deviceType"], design["deviceType"])

    def test_case_is_insensitive(self):
        original = sample()
        changed = sample(
            platform="sin200", wavelength="780 NM", mode="te",
            prefixes=["FAST"], deviceType="grating coupler",
            suffixes=["APODIZED"], version="1.0",
        )
        codebook = self.codebook(original)
        self.assertEqual(MODULE.encode_uid(codebook, original), MODULE.encode_uid(codebook, changed))

    def test_affix_order_is_encoded_without_collision(self):
        first = sample(prefixes=["A", "B"])
        second = sample(prefixes=["B", "A"])
        codebook = self.codebook(first, second)
        self.assertNotEqual(MODULE.encode_uid(codebook, first), MODULE.encode_uid(codebook, second))

    def test_more_than_three_affixes_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "at most 3 prefixes"):
            MODULE.update_codebook(MODULE.empty_codebook(), [sample(prefixes=["A", "B", "C", "D"])])

    def test_checksum_rejects_a_modified_uid(self):
        design = sample()
        codebook = self.codebook(design)
        uid = MODULE.encode_uid(codebook, design)
        replacement = "2" if uid[-1] != "2" else "3"
        with self.assertRaisesRegex(ValueError, "checksum"):
            MODULE.decode_uid(codebook, uid[:-1] + replacement)

    def test_component_alias_slots_decode_but_encoding_uses_first_slot(self):
        design = sample(deviceType="MMI", prefixes=[], suffixes=[])
        codebook = self.codebook(design)
        codebook["fields"]["component"].append("MMI")
        uid = MODULE.encode_uid(codebook, design)
        self.assertEqual(MODULE.decode_uid(codebook, uid)["deviceType"], "MMI")
        self.assertEqual(MODULE._field_codes(codebook, design)[6], 1)


if __name__ == "__main__":
    unittest.main()
