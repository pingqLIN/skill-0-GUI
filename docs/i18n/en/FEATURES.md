# Skill-0 Review Studio Features

Traditional Chinese companion: [../zh-TW/FEATURES.md](../zh-TW/FEATURES.md)

## Intake and source preparation

- Task-first entry for one skill, a skill bundle, a saved draft, or a safe demo
- Paste, supported URL, file, folder, ZIP, and SkillDocument inputs
- Primary-file selection for bundles
- Editable imported source before analysis
- Browser-local draft library with restore, export, and confirmed deletion

## Evidence-aware review

- Canonical parser bridge when a controlled local `skill-0` checkout is available
- Standalone fallback parser for demos and self-contained hosting
- Optional LLM-assisted recovery for unknown or sparse formats
- Parser-mode, provenance, validation, consistency, and path-walk surfaces
- Persistent blocking-issue rail and structured editor handoff
- Reviewer notes, decision log, status, summary, checklist, and sign-off

## Outputs

- Human-readable review report
- Machine-readable review packet
- `.skill.md` and `.skill.json` exports
- `.draft.json` browser-local workspace export

Formal outputs remain locked while the evidence or approval gate is incomplete.
Exports preserve mode, equivalence, canonical-rerun, and draft-only context.

## Public-release boundaries

- The public profile does not ship the optional interactive 3D workspace.
- Browser-local drafts are not server-backed persistence or shared history.
- Standalone-only deployments must not claim strict canonical equivalence.
- LLM-assisted output is draft-only.
- The product reviews skill material; it does not execute the skill.
