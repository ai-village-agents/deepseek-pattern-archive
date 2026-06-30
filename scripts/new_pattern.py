#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parent.parent
PATTERNS_DIR = ROOT / "patterns"
README_PATH = PATTERNS_DIR / "README.md"
SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")
SECTION_HEADINGS_RE = re.compile(r"^### \*\*[A-F]\.", re.MULTILINE)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Scaffold a new pattern entry.")
    parser.add_argument("--slug", required=True, help="Stem for the pattern files, e.g. 'automated-nudge-system-2026-06'.")
    parser.add_argument("--title", required=True, help="Pattern title without the 'Pattern' suffix.")
    parser.add_argument("--summary", required=True, help="One-line summary for README and JSON metadata.")
    parser.add_argument("--agent", required=True, help="Agent name responsible for the contribution.")
    parser.add_argument("--type", dest="pattern_type", default="unspecified", help="Pattern type classification.")
    parser.add_argument("--status-tag", action="append", dest="status_tags", help="Status tag; repeat to add multiple.")
    parser.add_argument("--created-at", default=dt.date.today().isoformat(), help="Creation date (YYYY-MM-DD).")
    parser.add_argument("--section", default="F", help="Catalog section letter (A-F).")
    parser.add_argument("--dry-run", action="store_true", help="Show intended changes without writing files.")
    return parser.parse_args()


def ensure_readme_exists() -> None:
    if not README_PATH.is_file():
        sys.exit(f"ERROR: Expected README at {README_PATH}")


def validate_slug(slug: str) -> None:
    if not SLUG_RE.match(slug):
        sys.exit("ERROR: --slug must match ^[a-z0-9][a-z0-9-]*$")


def validate_section(section: str) -> str:
    section_clean = section.upper()
    if section_clean not in {"A", "B", "C", "D", "E", "F"}:
        sys.exit("ERROR: --section must be one of A-F")
    return section_clean


def parse_created_at(date_str: str) -> dt.date:
    try:
        return dt.date.fromisoformat(date_str)
    except ValueError as exc:
        raise SystemExit(f"ERROR: --created-at must be YYYY-MM-DD: {exc}") from exc


def check_idempotency(md_path: Path, json_path: Path) -> None:
    existing = [str(p) for p in (md_path, json_path) if p.exists()]
    if existing:
        sys.exit(f"ERROR: Refusing to overwrite existing files: {', '.join(existing)}")


def compute_next_number(readme_text: str) -> int:
    numbers = [int(m.group(1)) for m in re.finditer(r"^(\d+)\.\s+\*\*\[", readme_text, re.MULTILINE)]
    return max(numbers) + 1 if numbers else 1


def find_section_bounds(readme_text: str, section: str) -> tuple[int, int]:
    section_heading = re.compile(rf"^### \*\*{re.escape(section)}\.", re.MULTILINE)
    start_match = section_heading.search(readme_text)
    if not start_match:
        sys.exit(f"ERROR: Section heading for '{section}' not found in README.")

    after_section = readme_text[start_match.end():]
    next_section = SECTION_HEADINGS_RE.search(after_section)
    status_heading = re.search(r"^## Pattern Status Tags", after_section, re.MULTILINE)

    candidates: list[int] = []
    if next_section:
        candidates.append(start_match.end() + next_section.start())
    if status_heading:
        candidates.append(start_match.end() + status_heading.start())

    end_index = min(candidates) if candidates else len(readme_text)
    return start_match.end(), end_index


def insert_entry(readme_text: str, insertion_index: int, entry: str) -> str:
    before = readme_text[:insertion_index]
    after = readme_text[insertion_index:]

    prefix = "" if before.endswith("\n") else "\n"
    suffix = "" if after.startswith("\n") else "\n"
    return before + prefix + entry + suffix + after


def update_counts(readme_text: str, new_count: int) -> str:
    def replace_header(match: re.Match[str]) -> str:
        return f"{match.group(1)}{new_count}{match.group(3)}"

    def replace_bottom(match: re.Match[str]) -> str:
        return f"{match.group(1)}{new_count}{match.group(3)}"

    header_re = re.compile(r"(## Complete Pattern Catalog \()(\d+)( Patterns,)")
    bottom_re = re.compile(r"(\*\*Pattern Count:\*\*\s*)(\d+)(\b)")

    text, header_updates = header_re.subn(replace_header, readme_text, count=1)
    if header_updates == 0:
        sys.exit("ERROR: Could not find catalog header count line in README.")

    text, bottom_updates = bottom_re.subn(replace_bottom, text, count=1)
    if bottom_updates == 0:
        sys.exit("ERROR: Could not find bottom pattern count line in README.")

    return text


def format_entry(number: int, title: str, slug: str, summary: str, status_tags: Iterable[str]) -> str:
    status = " | ".join(status_tags)
    return (
        f"{number}. **[{title}]({slug}.md)** - {summary}\n"
        f"   - **Status:** {status}\n\n"
    )


def build_markdown(pattern_name: str, slug: str, status_line: str, agent: str, created_at: str) -> str:
    return (
        f"# {pattern_name}\n\n"
        f"**Pattern ID:** `{slug}`  \n"
        f"**Status Tags:** {status_line}  \n"
        f"**Research Source:** [link or description TBD]\n\n"
        "## Overview\n\n"
        "_Brief description of the pattern and its significance._\n\n"
        "## Pattern Description\n\n"
        "_Detailed explanation of the observed behavior, conditions, and manifestations._\n\n"
        "## Implications & Mitigations\n\n"
        "_Analysis of implications for operations and recommended mitigations._\n\n"
        "## Related Patterns\n\n"
        "- \n\n"
        "## Contributed by\n\n"
        f"- {agent}\n\n"
        "## Last Updated\n\n"
        f"- {created_at}\n"
    )


def write_json(json_path: Path, payload: dict[str, object]) -> None:
    json_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    args = parse_args()
    ensure_readme_exists()
    validate_slug(args.slug)
    section = validate_section(args.section)
    created_date = parse_created_at(args.created_at)

    status_tags = args.status_tags or ["Observed"]
    status_line = " | ".join(status_tags)

    pattern_month = created_date.strftime("%Y-%m")
    pattern_name = f"{args.title} Pattern ({pattern_month})"

    md_path = PATTERNS_DIR / f"{args.slug}.md"
    json_path = PATTERNS_DIR / f"{args.slug}.json"
    check_idempotency(md_path, json_path)

    current_md_count = len([p for p in PATTERNS_DIR.glob("*.md") if p.name != "README.md"])
    new_count = current_md_count + 1

    readme_text = README_PATH.read_text(encoding="utf-8")
    next_number = compute_next_number(readme_text)
    entry_text = format_entry(next_number, args.title, args.slug, args.summary, status_tags)
    _, section_end = find_section_bounds(readme_text, section)
    updated_readme = insert_entry(readme_text, section_end, entry_text)
    updated_readme = update_counts(updated_readme, new_count)

    md_content = build_markdown(pattern_name, args.slug, status_line, args.agent, created_date.isoformat())
    json_payload = {
        "pattern_id": args.slug,
        "pattern_name": pattern_name,
        "agent": args.agent,
        "type": args.pattern_type,
        "status_tags": status_tags,
        "created_at": created_date.isoformat(),
        "summary": args.summary,
    }

    if args.dry_run:
        print("Dry run: no files written.")
        print(f"- Would create {md_path}")
        print(f"- Would create {json_path}")
        print(f"- Would insert entry number {next_number} under section {section}")
        print(f"- Would set pattern counts to {new_count}")
        sys.exit(0)

    md_path.write_text(md_content, encoding="utf-8")
    write_json(json_path, json_payload)
    README_PATH.write_text(updated_readme, encoding="utf-8")

    print(f"Created {md_path}")
    print(f"Created {json_path}")
    print(f"Updated README with entry {next_number} under section {section} and pattern count {new_count}")


if __name__ == "__main__":
    main()
