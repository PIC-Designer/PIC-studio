#!/usr/bin/env python3
"""Index test-chip designs stored in PIC_library's 0_* directories."""

from __future__ import annotations

import argparse
import ast
import json
import re
import subprocess
from datetime import date
from pathlib import Path

WAVELENGTH_ORDER = ("520", "638", "780", "O", "C")


def source_date(library: Path, source: Path) -> str:
    try:
        result = subprocess.run(
            ["git", "log", "-1", "--format=%cs", "--", source.relative_to(library).as_posix()],
            cwd=library, capture_output=True, check=True, text=True,
        ).stdout.strip()
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", result):
            return result
    except (OSError, subprocess.CalledProcessError):
        pass
    prefix = re.match(r"(20\d{2})(\d{2})", source.name)
    return f"{prefix.group(1)}-{prefix.group(2)}-01" if prefix else date.today().isoformat()


def metadata(source: Path, text: str) -> tuple[str, str, list[str], str]:
    platform = source.parent.name.removeprefix("0_").removesuffix("_dies")
    lowered = text.lower()
    has_gc = bool(re.search(r"(?:grating|(?:^|_)gc(?:_|\b))", lowered))
    has_ec = bool(re.search(r"(?:edge_coupler|(?:^|_)ec(?:_|\b))", lowered))
    io_type = "Both" if has_gc and has_ec else "EC" if has_ec else "GC"
    wavelengths = []
    for value in WAVELENGTH_ORDER:
        pattern = {"C": r"cband|c_band", "O": r"oband|o_band"}.get(value, rf"{value}\s*nm|_{value}_")
        if re.search(pattern, lowered):
            wavelengths.append(value)
    if not wavelengths:
        wavelengths = ["C"]
    filename = source.stem.lower()
    chip_type = "OTS" if "offtheshelf" in filename else "DEMO" if "demo" in filename else "CT"
    return platform, io_type, wavelengths, chip_type


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--registry", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    library = args.source.resolve()
    registry = json.loads(args.registry.read_text(encoding="utf-8"))
    designs = []
    discovered = []
    for directory in sorted(library.glob("0_*")):
        if not directory.is_dir() or directory.name.lower() == "0_dummy_dies":
            continue
        for source in sorted(directory.rglob("*.py")):
            relative = source.relative_to(library).as_posix()
            discovered.append(relative)
            if relative not in registry:
                raise SystemExit(f"Missing permanent UID for {relative}; add it to {args.registry}")
            text = source.read_text(encoding="utf-8")
            try:
                tree = ast.parse(text, filename=str(source))
                entrypoints = [node.name for node in tree.body if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and not node.name.startswith("_")]
            except SyntaxError:
                entrypoints = []
            platform, io_type, wavelengths, chip_type = metadata(source, text)
            updated = source_date(library, source)
            readable_name = f"{platform}_{io_type}_{'+'.join(wavelengths)}_{chip_type}_{updated.replace('-', '')}"
            designs.append({
                "uid": registry[relative], "platform": platform, "ioType": io_type,
                "wavelengths": wavelengths, "chipType": chip_type, "name": readable_name,
                "createdDate": updated, "lastUpdated": updated, "currentRevision": "R00",
                "parentUid": "", "parentRevision": "", "description": source.stem.replace("_", " "),
                "status": "Imported", "source": relative, "entrypoints": entrypoints,
                "revisions": [{"revision": "R00", "date": updated, "change": "Imported from PIC_library"}],
            })
    stale = sorted(set(registry) - set(discovered))
    payload = {"source": "PIC-Designer/PIC_library@main:0_*", "count": len(designs), "excluded": ["0_dummy_dies"], "staleRegistryEntries": stale, "designs": designs}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(designs)} test-chip designs to {args.output}")


if __name__ == "__main__":
    main()
