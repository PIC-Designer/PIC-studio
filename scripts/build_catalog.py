#!/usr/bin/env python3
"""Build a static PIC design catalogue without importing or executing the PDK."""

from __future__ import annotations

import argparse
import ast
import json
import re
from datetime import datetime, timezone
from pathlib import Path

from design_uid import decode_uid, empty_codebook, encode_uid, identity_fields, load_codebook, update_codebook

DEVICE_PATTERNS = [
    ("Packaging Template", ("packaging", "template")),
    ("Photodetector", ("pd", "detector")),
    ("Grating Coupler", ("gc", "grating")),
    ("Edge Coupler", ("ec", "edge")),
    ("Polarisation Rotator/Splitter", ("pbrs", "pbs")),
    ("Mode Converter", ("mm2sm", "mode", "converter")),
    ("Y Splitter", ("ysplitter", "ybranch")),
    ("MMI", ("mmi",)),
    ("MZI", ("mzi", "mzm")),
    ("Crossing", ("crossing",)),
    ("Bend", ("bend",)),
    ("Waveguide", ("waveguide",)),
    ("Heater", ("heater",)),
    ("Institution Layout", ("institution",)),
    ("Interlayer Coupler", ("interlayer", "vertical")),
]

BAND_NM = {"cband": 1550, "oband": 1310}
IGNORE_FILES = {"__init__.py", "CORNERSTONE.py", "components_lookup.py", "components_in_platform.py"}
IGNORE_FUNCTIONS = {"export_gds_fils", "mono_layer_designations", "std_component_lookup_dict", "PLATFORM"}


def prefer_first_conflict_side(text: str) -> str:
    """Return parseable text by selecting the first side of Git conflicts."""
    output: list[str] = []
    state = "normal"
    for line in text.splitlines():
        if line.startswith("<<<<<<<"):
            state = "first"
        elif line.startswith("=======") and state == "first":
            state = "second"
        elif line.startswith(">>>>>>>") and state == "second":
            state = "normal"
        elif state != "second":
            output.append(line)
    return "\n".join(output)


def rendered(node: ast.AST | None) -> str | None:
    if node is None:
        return None
    try:
        return ast.unparse(node)
    except Exception:
        return None


def parse_name(name: str, platform_hint: str) -> dict:
    tokens = name.replace("-", "_").split("_")
    lowered = [token.lower() for token in tokens]
    platform = tokens[0] if tokens else platform_hint
    material = "TFLN" if platform.upper().startswith("TFLN") else "SiN" if platform.lower().startswith("sin") else "SOI"

    wavelength_nm = next((int(token[:-2]) for token in lowered if re.fullmatch(r"\d+nm", token)), None)
    band = next((token for token in lowered if token in BAND_NM), "")
    if wavelength_nm is None and band:
        wavelength_nm = BAND_NM[band]
    wavelength = f"{wavelength_nm} nm" if wavelength_nm else band.replace("band", "-band").upper() or "Unspecified"
    mode = next((token.upper() for token in lowered if token in {"te", "tm", "dual"}), "Unspecified")
    cross_section = next((token.title() for token in lowered if token in {"strip", "rib", "dual", "slab"}), "Unspecified")
    device_type = "Other"
    matched = set()
    component_index = -1
    candidates = []
    for priority, (label, patterns) in enumerate(DEVICE_PATTERNS):
        matching_indexes = [lowered.index(pattern) for pattern in patterns if pattern in lowered]
        if matching_indexes:
            candidates.append((min(matching_indexes), priority, label, patterns))
    if candidates:
        component_index, _, device_type, selected_patterns = min(candidates)
        matched.update(selected_patterns)
    version_match = re.search(r"_v(\d+)p([A-Za-z0-9]+)$", name, re.IGNORECASE)
    version = f"{version_match.group(1)}.{version_match.group(2)}" if version_match else "—"
    structural = {platform.lower(), "cband", "oband", "te", "tm", "dual", "strip", "rib", "slab", "and", "or"} | matched
    component_end = component_index
    component_tail = {"coupler", "converter", "splitter", "template", "resonator"}
    if component_index >= 0 and component_index + 1 < len(lowered) and lowered[component_index + 1] in component_tail:
        component_end += 1
        structural.add(lowered[component_end])

    descriptors = [
        (index, token.replace("deg", "°"))
        for index, token in enumerate(tokens[1:], start=1)
        if token.lower() not in structural
        and not re.fullmatch(r"v\d+p\w+", token, re.I)
        and not re.fullmatch(r"\d+nm", token, re.I)
    ]
    prefixes = [token for index, token in descriptors if component_index >= 0 and index < component_index]
    suffixes = [token for index, token in descriptors if component_index < 0 or index > component_end]
    variant = prefixes + suffixes
    return {
        "platform": platform,
        "material": material,
        "wavelength": wavelength,
        "wavelengthNm": wavelength_nm,
        "mode": mode,
        "crossSection": cross_section,
        "deviceType": device_type,
        "prefixes": prefixes,
        "suffixes": suffixes,
        "variant": variant,
        "version": version,
    }


def parameters(node: ast.FunctionDef) -> list[dict]:
    args = list(node.args.posonlyargs) + list(node.args.args)
    defaults = [None] * (len(args) - len(node.args.defaults)) + list(node.args.defaults)
    result = []
    for arg, default in zip(args, defaults):
        if arg.arg in {"self", "cls"}:
            continue
        result.append({
            "name": arg.arg,
            "annotation": rendered(arg.annotation),
            "default": rendered(default),
            "required": default is None,
        })
    if node.args.vararg:
        result.append({"name": f"*{node.args.vararg.arg}", "annotation": rendered(node.args.vararg.annotation), "default": None, "required": False})
    if node.args.kwarg:
        result.append({"name": f"**{node.args.kwarg.arg}", "annotation": rendered(node.args.kwarg.annotation), "default": None, "required": False})
    return result


def called_function(node: ast.AST) -> str | None:
    """Return the base function called by a registry value such as foo().dup()."""
    while isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute):
        node = node.func.value
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
        return node.func.id
    return None


def registered_cornerstone_functions(root: Path) -> set[str]:
    """Read the public component registries without importing or executing the PDK."""
    registry = root / "cornerstone" / "components_in_platform.py"
    text = prefer_first_conflict_side(registry.read_text(encoding="utf-8"))
    tree = ast.parse(text, filename=str(registry))
    registered: set[str] = set()
    for node in tree.body:
        if not isinstance(node, ast.Assign):
            continue
        registry_name = next(
            (target.id for target in node.targets if isinstance(target, ast.Name)),
            "",
        )
        if not registry_name.endswith("_lib") or not isinstance(node.value, ast.Dict):
            continue
        for value in node.value.values:
            function_name = called_function(value)
            if function_name and function_name not in IGNORE_FUNCTIONS:
                registered.add(function_name)
    return registered


def scan(root: Path) -> list[dict]:
    designs = []
    cornerstone_functions = registered_cornerstone_functions(root)
    for status_dir, status in ((root / "cornerstone", "released"), (root / "developing", "developing")):
        if not status_dir.exists():
            continue
        for source in sorted(status_dir.glob("*.py")):
            if source.name in IGNORE_FILES:
                continue
            text = source.read_text(encoding="utf-8")
            # Indexing must remain useful even when a development branch contains
            # unresolved merge markers. We never execute or rewrite library code.
            text = prefer_first_conflict_side(text)
            try:
                tree = ast.parse(text, filename=str(source))
            except SyntaxError as error:
                print(f"Skipping {source}: {error}")
                continue
            for node in tree.body:
                if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    continue
                if node.name.startswith("_") or node.name in IGNORE_FUNCTIONS:
                    continue
                if status == "released" and node.name not in cornerstone_functions:
                    continue
                metadata = parse_name(node.name, source.stem)
                designs.append({
                    "id": f"{status}.{source.stem}.{node.name}",
                    "name": node.name,
                    **metadata,
                    "status": status,
                    "source": source.relative_to(root.parent).as_posix(),
                    "line": node.lineno,
                    "function": node.name,
                    "parameters": parameters(node),
                })
    return designs


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--uid-codebook", type=Path, required=True)
    parser.add_argument("--update-uid-codebook", action="store_true")
    args = parser.parse_args()
    designs = scan(args.source.resolve())
    if args.uid_codebook.exists():
        codebook = load_codebook(args.uid_codebook)
    elif args.update_uid_codebook:
        codebook = empty_codebook()
    else:
        raise SystemExit(f"Design UID codebook does not exist: {args.uid_codebook}")

    if args.update_uid_codebook:
        update_codebook(codebook, designs)
        args.uid_codebook.parent.mkdir(parents=True, exist_ok=True)
        args.uid_codebook.write_text(json.dumps(codebook, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    identities_by_uid: dict[str, dict] = {}
    for design in designs:
        design["uid"] = encode_uid(codebook, design)
        identity = identity_fields(design)
        decoded = decode_uid(codebook, design["uid"])
        if encode_uid(codebook, decoded) != design["uid"]:
            raise ValueError(f"Design UID round-trip failed for {design['id']}")
        previous = identities_by_uid.get(design["uid"])
        if previous is not None and previous != identity:
            raise ValueError(f"Design UID collision for {design['uid']}: {previous!r} != {identity!r}")
        identities_by_uid[design["uid"]] = identity
    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": "PIC-Designer/PIC_library@main:pdk",
        "count": len(designs),
        "designs": designs,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(designs)} designs to {args.output}")


if __name__ == "__main__":
    main()
