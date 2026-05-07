#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
from collections import defaultdict
from pathlib import Path


def split_by_source(input_csv: Path, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    with input_csv.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        fieldnames = list(reader.fieldnames or [])
        if "source_file" not in fieldnames:
            raise ValueError("source_file column is required for --mode source")

        groups: dict[str, list[dict[str, str]]] = defaultdict(list)
        for row in reader:
            groups[(row.get("source_file") or "unknown.csv").strip()].append(row)

    for src_name, rows in groups.items():
        out_path = out_dir / src_name
        with out_path.open("w", encoding="utf-8", newline="") as wf:
            writer = csv.DictWriter(wf, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
        print(f"wrote {out_path} rows={len(rows)}")


def split_by_chunk(input_csv: Path, out_dir: Path, chunk_size: int) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    with input_csv.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        fieldnames = list(reader.fieldnames or [])
        rows = list(reader)

    total = len(rows)
    chunk_idx = 0
    for start in range(0, total, chunk_size):
        chunk_idx += 1
        part = rows[start : start + chunk_size]
        out_path = out_dir / f"combined_part_{chunk_idx:03d}.csv"
        with out_path.open("w", encoding="utf-8", newline="") as wf:
            writer = csv.DictWriter(wf, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(part)
        print(f"wrote {out_path} rows={len(part)}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Split combined employability CSV into smaller files.")
    parser.add_argument(
        "--input",
        default="ml/data/employability/combined_employability.csv",
        help="Input combined CSV path.",
    )
    parser.add_argument(
        "--out-dir",
        default="ml/data/employability/splits",
        help="Output directory for split files.",
    )
    parser.add_argument(
        "--mode",
        choices=["source", "chunk"],
        default="source",
        help="Split by source_file or fixed row chunk size.",
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=2000,
        help="Rows per chunk when --mode chunk.",
    )
    args = parser.parse_args()

    input_csv = Path(args.input)
    out_dir = Path(args.out_dir)

    if args.mode == "source":
        split_by_source(input_csv, out_dir)
    else:
        split_by_chunk(input_csv, out_dir, args.chunk_size)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

