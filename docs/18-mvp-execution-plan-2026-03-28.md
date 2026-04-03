# 18. MVP Execution Plan (2026-03-28)

This note converts the archived planning draft `./archive/local-planning/skill-0-review-studio-mvp-plan.md` into a repository-grounded execution order for `skill-0-GUI`.

## 18.1 Positioning

The target remains correct:

- `skill-0-GUI` should become a review-and-edit studio for Skill-0 documents
- it should not become a second canonical parser
- the product loop should be: load -> edit -> validate -> visualize -> test -> export

That loop is only partially complete in the current repository.

## 18.2 Current Coverage Against The MVP Draft

Already present or substantially present:

- parser-backed intake for `SKILL.md` and skill bundles
- review workspace with decomposition, graph-oriented views, findings, and exportable `.skill.md`
- limited structured editing for global metadata, phases, and decision nodes
- bridge/runtime verification, build guards, and parser-mode-aware review guidance

Partial but not yet MVP-complete:

- SkillDocument JSON handling
- structured editing of decomposition elements (`actions`, `rules`, `directives`, `execution_paths`)
- review-output completeness

Still missing as first-class product features:

- raw JSON editor
- schema validation panel
- custom consistency checks
- test runner panel and run history
- reviewer notes and diff workflow
- session persistence

## 18.3 What Started In This Cycle

This cycle begins Milestone 1 from the MVP draft with the lowest-risk foundation work:

1. define shared SkillDocument/editor/review/test domain types under `src/types/`
2. add SkillDocument JSON import support for pasted JSON and single-file `.json` uploads
3. add SkillDocument JSON export from the workspace alongside `.skill.md` export
4. add adapter-level and smoke coverage so imported JSON does not depend on the parser bridge

This does not complete Milestone 1 by itself because the raw JSON editor is still missing.

## 18.4 Recommended Execution Order

### Milestone 1: Bootable Editor

Finish in this order:

1. raw JSON editor surface with format and parse-error visibility
2. shared state layer between imported SkillDocument JSON and the existing review workspace
3. explicit sample JSON fixture for editor/testing flows

### Milestone 2: Editable Studio

Execute next:

1. structured CRUD for `actions`, `rules`, `directives`, and `execution_paths`
2. form/JSON two-way sync
3. change tracking that understands decomposition elements, not only phases/decisions

### Milestone 3: Quality Gate

Execute after the editor loop is stable:

1. schema validation against the published Skill-0 schema
2. custom consistency checks
3. simple path-walk runner
4. test result history

### Milestone 4: Reviewer UX

Layer on after validation is trustworthy:

1. left-rail element navigator
2. execution-path graph tied back to editor selection
3. notes, diff summary, and exportable review report

Implemented by 2026-04-03:

- reviewer notes, diff summary, dedicated review report export
- review status, decision log, reviewer summary, and sign-off gates

### Milestone 5: Persistence

Keep last:

1. local session persistence
2. reload recovery

Implemented by 2026-04-03:

- workspace draft persistence for intake/import state
- reviewer draft persistence for notes, tests, summary, sign-off, and gate progress

## 18.5 Acceptance Bar For The Next Cycle

The next implementation slice should not claim progress unless all of these are true:

- a user can load a SkillDocument JSON without calling the bridge
- a user can export the active SkillDocument JSON from the workspace
- the JSON path is covered by smoke tests
- the parser-backed `SKILL.md` path still works unchanged

## 18.6 Scope Guardrails

Do not expand into these areas before the MVP loop is complete:

- collaborative review workflows
- server-side persistence
- GitHub PR automation
- AI rewrite flows
- advanced provenance overlays

Those remain post-MVP work.
