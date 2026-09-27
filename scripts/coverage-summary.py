#!/usr/bin/env python3
"""Print a Markdown coverage table for the CI job summary.

Reads either a JaCoCo CSV report (backend) or a Vitest/Istanbul coverage-summary.json (frontends)
and prints the totals for lines, branches and methods/functions. CI appends the output to
$GITHUB_STEP_SUMMARY, so every run shows its coverage without downloading the report.

Usage:
  coverage-summary.py <title> jacoco <path/to/jacoco.csv>
  coverage-summary.py <title> vitest <path/to/coverage-summary.json>
"""
import csv
import json
import sys


def pct(covered: int, total: int) -> str:
    return f"{100 * covered / total:.1f}%" if total else "n/a"


def jacoco(path: str) -> list[tuple[str, int, int]]:
    totals = {"LINE": [0, 0], "BRANCH": [0, 0], "METHOD": [0, 0]}
    with open(path, newline="") as f:
        for row in csv.DictReader(f):
            for key in totals:
                totals[key][0] += int(row[f"{key}_COVERED"])
                totals[key][1] += int(row[f"{key}_COVERED"]) + int(row[f"{key}_MISSED"])
    return [("Lines", *totals["LINE"]), ("Branches", *totals["BRANCH"]), ("Methods", *totals["METHOD"])]


def vitest(path: str) -> list[tuple[str, int, int]]:
    with open(path) as f:
        total = json.load(f)["total"]
    return [(label, total[key]["covered"], total[key]["total"])
            for label, key in (("Lines", "lines"), ("Branches", "branches"), ("Functions", "functions"))]


def main() -> None:
    if len(sys.argv) != 4 or sys.argv[2] not in ("jacoco", "vitest"):
        sys.exit(__doc__)
    title, kind, path = sys.argv[1:]
    rows = jacoco(path) if kind == "jacoco" else vitest(path)
    print(f"### Coverage: {title}\n")
    print("| Metric | Covered | Total | % |")
    print("|---|---:|---:|---:|")
    for label, covered, total in rows:
        print(f"| {label} | {covered} | {total} | {pct(covered, total)} |")
    print()


if __name__ == "__main__":
    main()
