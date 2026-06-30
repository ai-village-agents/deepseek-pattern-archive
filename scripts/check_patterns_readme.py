#!/usr/bin/env python3
"""
Validate pattern catalog metadata in patterns/README.md.
Checks header count, bottom count, linked files, and actual pattern files.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parent.parent
PATTERNS_DIR = ROOT / "patterns"
README_PATH = PATTERNS_DIR / "README.md"


def read_readme() -> str:
    if not README_PATH.is_file():
        print(f"ERROR: Missing README at {README_PATH}")
        sys.exit(1)
    return README_PATH.read_text(encoding="utf-8")


def extract_header_count(text: str) -> int | None:
    match = re.search(r"^## Complete Pattern Catalog \((\d+) Patterns,", text, re.MULTILINE)
    return int(match.group(1)) if match else None


def extract_bottom_count(text: str) -> int | None:
    match = re.search(r"\*\*Pattern Count:\*\*\s*(\d+)", text)
    return int(match.group(1)) if match else None


def list_pattern_files() -> list[Path]:
    return sorted(
        p for p in PATTERNS_DIR.glob("*.md") if p.name != "README.md"
    )


def list_pattern_json_files() -> list[Path]:
    return sorted(PATTERNS_DIR.glob("*.json"))


def normalize_link_target(target: str) -> str:
    return Path(target.strip()).name


def extract_linked_files(text: str) -> set[str]:
    linked = set()
    for target in re.findall(r"\*\*\[[^\]]+\]\(([^)]+?\.md)\)\*\*", text):
        if target.lower().startswith("http://") or target.lower().startswith("https://"):
            continue
        linked.add(normalize_link_target(target))
    return linked


def format_missing_and_extra(
    missing_in_readme: Iterable[str], missing_on_disk: Iterable[str]
) -> str:
    missing_list = ", ".join(sorted(set(missing_in_readme))) or "none"
    extra_list = ", ".join(sorted(set(missing_on_disk))) or "none"
    return (
        f"Pattern files not linked in README: {missing_list}\n"
        f"README links to missing pattern files: {extra_list}"
    )


def format_json_companion_errors(
    missing_companions: Iterable[str], orphan_json: Iterable[str]
) -> str:
    missing_list = ", ".join(sorted(set(missing_companions))) or "none"
    orphan_list = ", ".join(sorted(set(orphan_json))) or "none"
    return (
        "Companion JSON files mismatch:\n"
        f"  Missing JSON companions: {missing_list}\n"
        f"  Orphan JSON files: {orphan_list}"
    )


def main() -> None:
    errors: list[str] = []
    text = read_readme()

    header_count = extract_header_count(text)
    if header_count is None:
        errors.append("Catalog header count line not found (expected '## Complete Pattern Catalog (X Patterns, ...').")

    bottom_count = extract_bottom_count(text)
    if bottom_count is None:
        errors.append("Bottom pattern count line not found (expected '**Pattern Count:** X').")

    pattern_files = list_pattern_files()
    actual_names = {p.name for p in pattern_files}
    actual_count = len(actual_names)

    json_files = list_pattern_json_files()
    json_basenames = {p.stem for p in json_files}
    missing_companions = {f"{p.stem}.json" for p in pattern_files if p.stem not in json_basenames}
    orphan_json = {f"{p.stem}.json" for p in json_files if not (PATTERNS_DIR / f"{p.stem}.md").is_file()}

    linked_files = extract_linked_files(text)
    linked_count = len(linked_files)

    missing_in_readme = actual_names - linked_files
    missing_on_disk = {name for name in linked_files if not (PATTERNS_DIR / name).is_file()}
    count_mismatch = linked_count != actual_count

    if count_mismatch:
        errors.append(
            f"Linked pattern count ({linked_count}) does not match actual pattern files ({actual_count}).\n"
            + "  "
            + format_missing_and_extra(missing_in_readme, missing_on_disk).replace("\n", "\n  ")
        )
    elif missing_in_readme or missing_on_disk:
        errors.append(format_missing_and_extra(missing_in_readme, missing_on_disk))

    if header_count is not None and header_count != actual_count:
        errors.append(
            f"Header catalog count ({header_count}) does not match actual pattern files ({actual_count})."
        )

    if bottom_count is not None and bottom_count != actual_count:
        errors.append(
            f"Bottom pattern count ({bottom_count}) does not match actual pattern files ({actual_count})."
        )

    if missing_companions or orphan_json:
        errors.append(format_json_companion_errors(missing_companions, orphan_json))

    if errors and not count_mismatch and not (missing_in_readme or missing_on_disk):
        errors.append(format_missing_and_extra(missing_in_readme, missing_on_disk))

    if errors:
        print("Pattern README validation FAILED:")
        for err in errors:
            print(f"- {err}")
        sys.exit(1)

    print(f"OK: pattern counts and links consistent ({actual_count} patterns).")


if __name__ == "__main__":
    main()
