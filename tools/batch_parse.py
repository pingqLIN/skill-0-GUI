#!/usr/bin/env python3
"""
Compatibility wrapper for the primary Skill-0 parser.

The maintained parser implementation lives in scripts/auto_parse.py.
Keep this entrypoint so existing docs and automation do not break immediately.
"""

from __future__ import annotations

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from scripts.auto_parse import main as auto_parse_main


def main(argv: list[str] | None = None) -> int:
    print(
        "[INFO] tools/batch_parse.py is a compatibility wrapper. "
        "Use scripts/auto_parse.py for the primary parser.",
        file=sys.stderr,
    )
    return auto_parse_main(argv)


if __name__ == "__main__":
    raise SystemExit(main())
