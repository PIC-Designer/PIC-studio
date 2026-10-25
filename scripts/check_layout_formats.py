#!/usr/bin/env python3
"""Reject legacy GDS/GDSII layout artifacts from publishable content."""

from __future__ import annotations

import argparse
from pathlib import Path


FORBIDDEN_SUFFIXES = {".gds", ".gdsii"}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("roots", nargs="*", type=Path, default=[Path("public")])
    args = parser.parse_args()
    forbidden = [
        path
        for root in args.roots
        if root.exists()
        for path in root.rglob("*")
        if path.is_file() and path.suffix.lower() in FORBIDDEN_SUFFIXES
    ]
    if forbidden:
        rendered = "\n".join(f"- {path}" for path in forbidden)
        raise SystemExit(f"PIC Studio accepts OAS/OASIS layouts only:\n{rendered}")
    print("Layout format check passed: no GDS/GDSII artifacts found")


if __name__ == "__main__":
    main()
