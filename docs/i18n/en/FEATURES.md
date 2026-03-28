# Skill-0 Review Studio Features

## Core capabilities

- Intake workspace for a primary skill file plus optional context files
- Canonical parser bridge support when a local `skill-0` repository is available
- Standalone fallback parser for public demos and external review
- Decomposition board driven by parser output
- Dashboard and security matrix for review findings, traceability, and risk framing
- Lightweight semantic review map as the public visualization surface
- In-memory edits plus exported `.skill.md` output

## Public-release boundaries

- The public release does not ship the interactive 3D workspace
- The public release does not provide server-side persistence, shared drafts, or multi-user review history
- Canonical parser equivalence should not be claimed for standalone-only deployments
