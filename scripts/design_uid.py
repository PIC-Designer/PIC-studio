#!/usr/bin/env python3
"""Collision-free, reversible 13-character UID encoding for design components."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

SCHEME = "DESIGN-UID-v2"
SCHEME_CODE = 2
ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
UID_LENGTH = 13
MAX_AFFIXES = 3

# 3-bit scheme + 56-bit identity + 6-bit checksum = 65 bits = 13 Base32 chars.
FIELD_LAYOUT = (
    ("platform", 5),
    ("wavelength", 5),
    ("mode", 3),
    ("prefix1", 5),
    ("prefix2", 5),
    ("prefix3", 5),
    ("component", 8),
    ("suffix1", 5),
    ("suffix2", 5),
    ("suffix3", 5),
    ("version", 5),
)


def canonical(value: str | None) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip()).casefold()


def empty_codebook() -> dict:
    return {
        "version": 1,
        "scheme": SCHEME,
        "appendOnly": True,
        "fields": {name: [""] for name, _ in FIELD_LAYOUT},
    }


def load_codebook(path: Path) -> dict:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if payload.get("scheme") != SCHEME or payload.get("appendOnly") is not True:
        raise ValueError(f"{path} is not an append-only {SCHEME} codebook")
    fields = payload.get("fields", {})
    for name, width in FIELD_LAYOUT:
        values = fields.get(name)
        if not isinstance(values, list) or not values or values[0] != "":
            raise ValueError(f"Codebook field {name} must be a list beginning with an empty value")
        if len(values) > (1 << width):
            raise ValueError(f"Codebook field {name} exceeds its {width}-bit capacity")
        keys = [canonical(value) for value in values]
        # Component aliases may intentionally occupy multiple historical code
        # slots after a vocabulary migration. Other fields remain unique.
        if name != "component" and len(keys) != len(set(keys)):
            raise ValueError(f"Codebook field {name} contains duplicate canonical values")
    return payload


def identity_fields(design: dict) -> dict[str, str]:
    prefixes = list(design.get("prefixes", []))
    suffixes = list(design.get("suffixes", []))
    if len(prefixes) > MAX_AFFIXES:
        raise ValueError(f"{design.get('name')}: at most {MAX_AFFIXES} prefixes are supported")
    if len(suffixes) > MAX_AFFIXES:
        raise ValueError(f"{design.get('name')}: at most {MAX_AFFIXES} suffixes are supported")
    prefixes += [""] * (MAX_AFFIXES - len(prefixes))
    suffixes += [""] * (MAX_AFFIXES - len(suffixes))
    return {
        "platform": design.get("platform", ""),
        "wavelength": design.get("wavelength", ""),
        "mode": design.get("mode", ""),
        "prefix1": prefixes[0],
        "prefix2": prefixes[1],
        "prefix3": prefixes[2],
        "component": design.get("deviceType", ""),
        "suffix1": suffixes[0],
        "suffix2": suffixes[1],
        "suffix3": suffixes[2],
        "version": design.get("version", ""),
    }


def update_codebook(codebook: dict, designs: list[dict]) -> None:
    """Append newly approved values without ever renumbering existing values."""
    fields = codebook["fields"]
    for design in sorted(designs, key=lambda item: canonical(item.get("name"))):
        identity = identity_fields(design)
        for name, width in FIELD_LAYOUT:
            value = identity[name]
            key = canonical(value)
            existing = {canonical(item) for item in fields[name]}
            if key in existing:
                continue
            if len(fields[name]) >= (1 << width):
                raise ValueError(f"Codebook field {name} has exhausted its {width}-bit capacity")
            fields[name].append(value)


def _field_codes(codebook: dict, design: dict) -> list[int]:
    identity = identity_fields(design)
    codes = []
    for name, _ in FIELD_LAYOUT:
        reverse = {}
        for index, value in enumerate(codebook["fields"][name]):
            # Prefer the earliest slot so new UIDs use the canonical legacy
            # position while older alias slots remain decodable.
            reverse.setdefault(canonical(value), index)
        key = canonical(identity[name])
        if key not in reverse:
            raise ValueError(f"{design.get('name')}: {name} value {identity[name]!r} is not registered")
        codes.append(reverse[key])
    return codes


def _checksum(payload: int) -> int:
    return hashlib.sha256(payload.to_bytes(8, "big")).digest()[0] & 0x3F


def encode_uid(codebook: dict, design: dict) -> str:
    payload = SCHEME_CODE
    for code, (_, width) in zip(_field_codes(codebook, design), FIELD_LAYOUT):
        payload = (payload << width) | code
    encoded = (payload << 6) | _checksum(payload)
    chars = []
    for _ in range(UID_LENGTH):
        encoded, remainder = divmod(encoded, len(ALPHABET))
        chars.append(ALPHABET[remainder])
    if encoded:
        raise ValueError("Design UID exceeds 65-bit capacity")
    return "".join(reversed(chars))


def decode_uid(codebook: dict, uid: str) -> dict[str, str | list[str]]:
    clean = uid.strip().upper()
    if len(clean) != UID_LENGTH or any(char not in ALPHABET for char in clean):
        raise ValueError(f"UID must contain exactly {UID_LENGTH} valid Base32 characters")
    encoded = 0
    for char in clean:
        encoded = encoded * len(ALPHABET) + ALPHABET.index(char)
    checksum = encoded & 0x3F
    payload = encoded >> 6
    if checksum != _checksum(payload):
        raise ValueError("UID checksum mismatch")

    remaining = payload
    decoded_codes: dict[str, int] = {}
    for name, width in reversed(FIELD_LAYOUT):
        decoded_codes[name] = remaining & ((1 << width) - 1)
        remaining >>= width
    if remaining != SCHEME_CODE:
        raise ValueError(f"Unsupported Design UID scheme code {remaining}")

    decoded: dict[str, str | list[str]] = {}
    for name, _ in FIELD_LAYOUT:
        code = decoded_codes[name]
        values = codebook["fields"][name]
        if code >= len(values):
            raise ValueError(f"UID contains unregistered {name} code {code}")
        decoded[name] = values[code]
    prefixes = [decoded[f"prefix{i}"] for i in range(1, 4) if decoded[f"prefix{i}"]]
    suffixes = [decoded[f"suffix{i}"] for i in range(1, 4) if decoded[f"suffix{i}"]]
    for index in range(1, 4):
        decoded.pop(f"prefix{index}")
        decoded.pop(f"suffix{index}")
    decoded["prefixes"] = prefixes
    decoded["suffixes"] = suffixes
    decoded["deviceType"] = decoded.pop("component")
    return decoded
