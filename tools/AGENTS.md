# TOOLS — CLI Utilities

## OVERVIEW

Python CLI scripts for batch parsing, scanning, governance, and database operations.

## WHERE TO LOOK

| Task | File | Notes |
|------|------|-------|
| Parse skills to JSON | `../scripts/auto_parse.py` | Primary parser for `converted-skills/*/SKILL.md` |
| Legacy curated seed output | `seed_skills.py`, `batch_parse.py` | Seed generator plus compatibility wrapper |
| Security scanning | `batch_security_scan.py`, `skill_scanner.py` | Outputs to repo root |
| Governance DB | `governance_db.py` | SQLite schema for reviews/approvals |
| License detection | `license_detector.py` | Scans for license info |
| Schema migration | `migrate_to_schema_2_1.py` | One-time migration script |
| Pattern extraction | `pattern_extractor.py` | Extracts patterns from parsed skills |
| Evaluation | `evaluate.py`, `analyzer.py` | Parser quality metrics |

## KEY FILES

| File | Lines | Purpose |
|------|-------|---------|
| `advanced_skill_analyzer.py` | 39K | Core parsing logic with LLM |
| `skill_governance.py` | 22K | Approval workflow |
| `skill_scanner.py` | 28K | Security vulnerability scanner |
| `skill_tester.py` | 27K | Equivalence testing |
| `../scripts/auto_parse.py` | ~400 | Heuristic parser for converted skills |
| `batch_parse.py` | ~30 | Compatibility wrapper to the primary parser |
| `seed_skills.py` | ~330 | Legacy curated sample generator |

## CONVENTIONS

- All scripts are executable (`chmod +x`)
- Output goes to repo root or `governance/db/`
- Use `argparse` for CLI arguments
- Progress bars via `tqdm` when available

## COMMANDS

```bash
# Common operations
python ../scripts/auto_parse.py          # Parse converted skills
python batch_parse.py                    # Legacy alias for the primary parser
python batch_security_scan.py             # Security scan
python batch_import.py --dir ../source    # Import skills
python migrate_to_schema_2_1.py           # Schema migration
python analyzer.py                        # Coverage report
```
