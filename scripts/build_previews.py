#!/usr/bin/env python3
"""Render catalogue components to compact WebP previews using default parameters.

Preview images are raster assets only. This script never exports GDS; any
persisted photonic layout artifact in PIC Studio must use OAS/OASIS.
"""

from __future__ import annotations

import argparse
import importlib
import io
import json
import os
import re
import sys
import types
from pathlib import Path

from PIL import Image

os.environ["MPLBACKEND"] = "Agg"


def preview_name(design_id: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]+", "-", design_id) + ".webp"


def prefer_first_conflict_side(text: str) -> str:
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


def load_module(module_name: str, library: Path):
    try:
        return importlib.import_module(module_name)
    except SyntaxError:
        source = library / Path(*module_name.split(".")).with_suffix(".py")
        module = types.ModuleType(module_name)
        module.__file__ = str(source)
        module.__package__ = module_name.rpartition(".")[0]
        sys.modules[module_name] = module
        code = compile(prefer_first_conflict_side(source.read_text(encoding="utf-8")), str(source), "exec")
        exec(code, module.__dict__)
        return module


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--catalog", type=Path, required=True)
    parser.add_argument("--library", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--quality", type=int, default=70)
    parser.add_argument("--max-width", type=int, default=900)
    parser.add_argument("--max-height", type=int, default=675)
    args = parser.parse_args()

    library = args.library.resolve()
    sys.path.insert(0, str(library))
    payload = json.loads(args.catalog.read_text(encoding="utf-8"))
    designs = payload["designs"][:args.limit] if args.limit else payload["designs"]
    args.output.mkdir(parents=True, exist_ok=True)
    rendered = skipped = failed = 0

    for design in designs:
        output = args.output / preview_name(design["id"])
        if output.exists() and not args.force:
            skipped += 1
            continue
        if any(parameter["required"] for parameter in design["parameters"]):
            print(f"Skipping {design['id']}: requires parameters")
            failed += 1
            continue
        try:
            module_name = design["source"].removesuffix(".py").replace("/", ".")
            module = load_module(module_name, library)
            component = getattr(module, design["function"])()
            figure = component.plot(show_labels=False, show_ruler=False, return_fig=True)
            if figure is None:
                raise RuntimeError("renderer returned no figure")
            buffer = io.BytesIO()
            figure.savefig(buffer, format="png", dpi=130, bbox_inches="tight", pad_inches=0.04, facecolor="#081522")
            figure.clear()
            buffer.seek(0)
            with Image.open(buffer) as image:
                image = image.convert("RGB")
                image.thumbnail((args.max_width, args.max_height), Image.Resampling.LANCZOS)
                image.save(output, format="WEBP", quality=args.quality, method=6)
            rendered += 1
            print(f"Rendered {design['id']}")
        except Exception as error:
            failed += 1
            print(f"Failed {design['id']}: {error}")

    print(f"Previews: {rendered} rendered, {skipped} cached, {failed} unavailable")


if __name__ == "__main__":
    main()
