# Chapter 19. MVP Consistency And Next Execution Brief

Back to index: [README.md](./README.md)

Related chapters:
- [16-development-execution-brief-2026-03-28.md](./16-development-execution-brief-2026-03-28.md)
- [17-late-stage-development-plan-2026-03-28.md](./17-late-stage-development-plan-2026-03-28.md)
- [18-mvp-execution-plan-2026-03-28.md](./18-mvp-execution-plan-2026-03-28.md)

## 19.1 Purpose

This brief records the current MVP implementation boundary after the SkillDocument import/editor work and the first custom consistency-check pass completed on `2026-03-28`.

It is the handoff note for the next execution cycle.

## 19.2 What Is Now Complete

The repository now covers the following MVP items with live code and tests:

- SkillDocument JSON import from pasted JSON and uploaded `.json` files
- SkillDocument JSON export from the review workspace
- raw JSON editor with format, parse validation, and apply-back-to-workspace flow
- schema validation panel in the workspace right rail
- custom consistency checks for:
  - duplicate ids
  - missing execution-path references
  - invalid branch targets
  - multiple implicit root paths
  - empty visible names on decomposition elements
- preservation of malformed execution-path entries during review-data extraction so validation and consistency surfaces can still report problems instead of silently dropping them

## 19.3 What This Cycle Closed

The current cycle resolved three concrete gaps from the MVP draft:

1. SkillDocument imports no longer depend on the parser bridge just to boot the review workspace.
2. Reviewer-visible quality gates now exist in the UI instead of being implicit test-only checks.
3. Custom consistency rules no longer assume that only the first execution path may act as the implicit root.

## 19.4 Current Known Gaps

The MVP loop is stronger, but still incomplete in the following areas:

### Structured editing

- no real CRUD surface for `actions`, `rules`, `directives`, and `execution_paths`
- no element navigator that selects and focuses specific decomposition nodes
- form editing still centers on the older review-data shape rather than the full SkillDocument structure

### Testing workflow

- no reviewer-facing test runner panel yet
- no simple path-walk execution surface
- no run history for validation / consistency / path tests

### Review workflow

- no global or element-level reviewer notes workflow
- no first-class JSON diff / review diff sign-off surface
- no dedicated review-report export yet

### Persistence

- no local draft persistence or reload recovery

## 19.5 Recommended Execution Order

Execute the next MVP slices in this order:

1. Structured form CRUD for `actions`, `rules`, `directives`, and `execution_paths`
2. Form/JSON two-way sync so raw JSON edits and structured edits stay aligned
3. Reviewer-facing test panel with validation rerun, consistency rerun, and simple path walk
4. Reviewer notes and diff summary
5. Dedicated review report export
6. Local draft persistence

## 19.6 Acceptance Bar For The Next Slice

Do not claim the next slice complete unless all of these are true:

- a reviewer can add, edit, and remove decomposition elements without dropping back to raw JSON only
- a structured edit updates the exported SkillDocument JSON
- a JSON edit updates the structured workspace view after apply
- the workspace exposes at least one reviewer-facing test action instead of only passive status panels
- regression coverage exists for the new edit flow

## 19.7 Verification Standard

Every change that advances this plan should keep the following checks green:

```bash
npm run lint
npm test
npm run build
npm run verify:build-size
npm run verify:public-build
npm run docs:check
```
