# Chapter 19. MVP Consistency And Next Execution Brief

Back to index: [README.md](./README.md)

Related chapters:
- [16-development-execution-brief-2026-03-28.md](./16-development-execution-brief-2026-03-28.md)
- [17-late-stage-development-plan-2026-03-28.md](./17-late-stage-development-plan-2026-03-28.md)
- [18-mvp-execution-plan-2026-03-28.md](./18-mvp-execution-plan-2026-03-28.md)

## 19.1 Purpose

This brief records the current MVP implementation boundary after the SkillDocument import/editor work, the first custom consistency-check pass, and the first structured SkillDocument CRUD slice completed on `2026-03-28`.

It is the handoff note for the next execution cycle.

## 19.2 What Is Now Complete

The repository now covers the following MVP items with live code and tests:

- SkillDocument JSON import from pasted JSON and uploaded `.json` files
- SkillDocument JSON export from the review workspace
- raw JSON editor with format, parse validation, and apply-back-to-workspace flow
- structured SkillDocument editor for `meta`, `actions`, `rules`, `directives`, and `execution_paths`
- edited SkillDocument sessions now preserve the last known parser provenance instead of collapsing back to generic JSON-import mode
- validation and consistency panels now offer issue-to-field jump actions back into the structured SkillDocument editor
- schema validation panel in the workspace right rail
- custom consistency checks for:
  - duplicate ids
  - missing execution-path references
  - invalid branch targets
  - multiple implicit root paths
  - empty visible names on decomposition elements
- preservation of malformed execution-path entries during review-data extraction so validation and consistency surfaces can still report problems instead of silently dropping them

## 19.3 What This Cycle Closed

The current cycle resolved four concrete gaps from the MVP draft:

1. SkillDocument imports no longer depend on the parser bridge just to boot the review workspace.
2. Reviewer-visible quality gates now exist in the UI instead of being implicit test-only checks.
3. Custom consistency rules no longer assume that only the first execution path may act as the implicit root.
4. Reviewers no longer need to drop straight to raw JSON for first-pass CRUD on core decomposition structures.
5. Structured and JSON saves now keep the last known parser provenance visible while still downgrading final equivalence to a re-validate-required state.
6. Reviewers can jump from the right-rail validation / consistency issues back into the structured editor instead of manually hunting through the form.

## 19.4 Current Known Gaps

The MVP loop is stronger, but still incomplete in the following areas:

### Structured editing

- the first CRUD surface now exists, but it is still side-panel based and does not yet support deep field-level guidance beyond the current issue-to-field jump links
- no element navigator that selects and focuses specific decomposition nodes
- structured edits still rebuild the workspace from the SkillDocument projection, so parser evidence and review-specific enrichments are preserved only at a summary/provenance level, not as fully editable first-class state

### Testing workflow

- no reviewer-facing test runner panel yet
- no simple path-walk execution surface
- no run history for validation / consistency / path tests

### Review workflow

- no global or element-level reviewer notes workflow
- no first-class JSON diff / review diff sign-off surface
- no dedicated review-report export yet

Completed by 2026-04-03:

- global and element-level reviewer notes workflow
- review diff summary plus sign-off-oriented review status and decision log
- dedicated review report export with reviewer summary, sign-off, and gate checklist

### Persistence

- no local draft persistence or reload recovery

Completed by 2026-04-03:

- workspace-level local draft persistence
- reviewer-state persistence with reload recovery

## 19.5 Recommended Execution Order

Execute the next MVP slices in this order:

1. Structured form CRUD for `actions`, `rules`, `directives`, and `execution_paths`
2. Form/JSON two-way sync refinements so raw JSON edits and structured edits preserve more field-level review context and issue targeting
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
