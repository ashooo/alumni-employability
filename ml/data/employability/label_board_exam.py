#!/usr/bin/env python3
"""
Academic-first board exam labeler.

Rule:
- Board Exam = 1 if all of the following are true:
  - CGPA <= 2.30
  - Average Prof Grade <= 2.30
  - Average Elec Grade <= 2.30
  - OJT Grade <= 2.40
- Otherwise Board Exam = 0
"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path
from typing import Iterable


DEFAULT_FILES = [
    "bsa.csv",
    "bsece.csv",
    "bsed-filipino.csv",
    "bsed-english.csv",
    "bsn.csv",
]


def to_float(row: dict[str, str], key: str) -> float | None:
    raw = (row.get(key) or "").strip()
    try:
        return float(raw)
    except ValueError:
        return None


def board_exam_label(row: dict[str, str]) -> str:
    cgpa = to_float(row, "CGPA")
    prof = to_float(row, "Average Prof Grade")
    elec = to_float(row, "Average Elec Grade")
    ojt = to_float(row, "OJT Grade")

    if None in (cgpa, prof, elec, ojt):
        return "0"

    passed = (
        cgpa <= 2.30
        and prof <= 2.30
        and elec <= 2.30
        and ojt <= 2.40
    )
    return "1" if passed else "0"


def ensure_board_exam_column(columns: list[str]) -> list[str]:
    if "Board Exam" in columns:
        return columns
    if "Employability" in columns:
        idx = columns.index("Employability")
        return columns[:idx] + ["Board Exam"] + columns[idx:]
    return columns + ["Board Exam"]


def relabel_file(path: Path) -> tuple[int, int, int]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        fieldnames = list(reader.fieldnames or [])
        out_fields = ensure_board_exam_column(fieldnames)
        rows = list(reader)

    pass_count = 0
    fail_count = 0
    out_rows: list[dict[str, str]] = []
    for row in rows:
        label = board_exam_label(row)
        row["Board Exam"] = label
        if label == "1":
            pass_count += 1
        else:
            fail_count += 1
        out_rows.append(row)

    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=out_fields)
        writer.writeheader()
        writer.writerows(out_rows)

    return pass_count, fail_count, len(out_rows)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Label board exam outcome using academic-first rubric."
    )
    parser.add_argument(
        "--base-dir",
        default="ml/data/employability",
        help="Directory containing employability CSV files.",
    )
    parser.add_argument(
        "--files",
        nargs="*",
        default=DEFAULT_FILES,
        help="Specific CSV filenames to relabel.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    base_dir = Path(args.base_dir)
    files: Iterable[str] = args.files

    for name in files:
        path = base_dir / name
        if not path.exists():
            print(f"[skip] missing: {path}")
            continue

        p, f, t = relabel_file(path)
        print(f"{name}: pass={p} fail={f} total={t}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

