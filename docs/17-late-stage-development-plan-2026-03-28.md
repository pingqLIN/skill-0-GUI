# Chapter 17. Late-Stage Development Plan

Back to index: [README.md](./README.md)

Related sources:
- [14-ui-and-remaining-development-plan-2026-03-24.md](./14-ui-and-remaining-development-plan-2026-03-24.md)
- [15-milestone-issue-list-2026-03-24.md](./15-milestone-issue-list-2026-03-24.md)
- [16-development-execution-brief-2026-03-28.md](./16-development-execution-brief-2026-03-28.md)
- `../skill-0-review-studio-mvp-plan.md`
- `../skill-0-review-studio-mvp-plan2.md`

## 17.1 Purpose

This document is the late-stage development plan for `skill-0-GUI` after reconciling:

- the original Review Studio MVP proposal
- the second-round architectural review suggestions
- the current execution baseline already recorded in Chapter 16
- the still-open or recently remediated gaps in the main `skill-0` repository

The goal is not to reopen already-finished restoration work.
The goal is to decide what should actually be built next so the GUI becomes a trustworthy reviewer-facing product.

## 17.2 What From The MVP Plans Is Still Valid

The following ideas remain high-value and should still shape the product:

1. `skill-0-GUI` should be a **review/edit/validation workstation**, not another parser.
2. The MVP still needs a reviewer to answer five operational questions:
   - can I open a skill?
   - can I edit it?
   - can I tell whether it broke?
   - can I understand its structure?
   - can I export the result?
3. The best long-term product surface is still a **Review Workspace** with:
   - source/context view
   - structured editor
   - raw JSON editor
   - graph/flow view
   - validation/test panel
   - notes/diff/export surfaces
4. Review intelligence should remain evidence-backed, not cosmetic telemetry.
5. Parser mode clarity remains essential: canonical vs standalone behaviour must stay visible.

## 17.3 What Is Stale Or Already Closed

The older MVP and review documents contain assumptions that are no longer current:

1. Source restoration is no longer the primary blocker.
   - Chapter 16 already records that source-driven React/Vite authoring, Vitest setup, and runtime parity coverage are in place.

2. The schema baseline described in `skill-0-review-studio-mvp-plan2.md` is stale.
   - It still references `schema/skill-decomposition.schema.json (v2.0.0)`.
   - The active `skill-0` contract baseline is already `v2.4.0`.

3. “CI/CD pipeline missing” is no longer a correct top-level diagnosis.
   - `skill-0` mainline already has CI, frontend build checks, Docker builds, rate limiting/auth tests, and parsed corpus validation work in flight or merged.

4. Rebuilding the UI from scratch is no longer the right default framing.
   - The product now has a restored authoring surface.
   - Remaining work is about reviewer trust, mode clarity, export quality, and targeted workflow completion.

## 17.4 External Dependency Reality

`skill-0-GUI` is not fully independent. Its later phases depend on the health of `skill-0`.

Current upstream realities that matter:

1. `skill-0` has just completed a remediation batch for:
   - reviewer attribution integrity
   - scan HTML export correctness
   - production API first-boot DB seeding
   - parsed corpus validation in CI
   - contributor/deployment document repair

2. The highest remaining upstream improvement areas are:
   - dashboard error states that still degrade into empty/zero-value success UI
   - portable docs instead of absolute `/home/...` links
   - cleanup of ambiguous dependency authority (`requirements.lock`)
   - cleanup of tracked runtime artifacts / backup DB residue

3. `skill-0-GUI` should avoid inventing parallel contracts.
   - It should consume the live schema/governance/parser-mode semantics from `skill-0`, not restate or fork them casually.

## 17.5 Product Positioning For The Late Stage

The correct late-stage positioning is:

**Skill-0 Review Studio = a reviewer-facing, evidence-aware workstation for validating, editing, testing, and exporting skill decomposition artifacts produced by the Skill-0 ecosystem.**

This implies:

- not a replacement parser
- not a pure visual demo shell
- not an AI-autofix product in the current phase
- not a full collaboration platform yet

## 17.6 Late-Stage Workstreams

### Workstream A. Trustworthy Review Surfaces

Goal:
- eliminate misleading or placeholder signals
- make every visible conclusion traceable to parser mode and evidence

Scope:
- remove or relabel placeholder telemetry
- expose parser mode, mode source, and fallback status in all review/export surfaces
- require exported artifacts to state whether findings are canonical, standalone, compatible, or degraded
- align warning copy with the evidence-based warning templates already present in the repo

Why now:
- this is the shortest path from “interesting UI” to “operator-trustworthy tool”

### Workstream B. Review Studio MVP Completion

Goal:
- finish the minimum real reviewer workflow promised by the original MVP

Scope:
- source + parsed pair loading
- structured editor + raw JSON editor coexistence
- reviewer notes
- JSON diff
- validation panel
- test panel
- exportable review summary

Clarification:
- do not attempt PR automation, AI rewriting, or multi-user collaboration in this phase

### Workstream C. Parser Confidence And Contract Sync

Goal:
- make GUI outputs trustworthy across canonical and standalone paths

Scope:
- canonical vs standalone fixture comparison for representative skills
- parser-mode visibility in UI and exports
- documented divergence tolerance for standalone mode
- schema/version sync against `skill-0` `v2.4.x`
- shared type generation only if it reduces drift instead of creating a new maintenance burden

### Workstream D. UI Reliability And Reviewer Ergonomics

Goal:
- complete the unfinished quality work that most directly affects reviewer confidence

Scope:
- explicit loading / empty / error states
- keyboard-safe navigation and focus handling
- responsive safety for dense review surfaces
- controlled visual token cleanup where it improves clarity
- component tests for critical interactions

Note:
- this is not a full design-system rewrite
- it is the minimum product-quality pass needed for daily reviewer use

### Workstream E. Delivery, Docs, And Release Trust

Goal:
- make shipping and handoff predictable

Scope:
- ensure current docs reflect the active execution baseline
- keep verification commands authoritative and minimal
- maintain build-size/public-build guarantees
- document manual release and deployment steps clearly if CI automation is not the whole answer

## 17.7 Recommended Execution Order

Use this order for the next development cycle:

1. **A1. Review-surface truthfulness**
   - remove misleading placeholder telemetry
   - annotate parser mode everywhere it matters

2. **C1. Parser confidence**
   - add canonical vs standalone fixture comparisons
   - define acceptable standalone divergence

3. **B1. MVP completion for reviewer workflow**
   - notes, diff, validation/test surfaces, export summary

4. **D1. UI reliability**
   - error states, keyboard/focus behaviour, responsive safety

5. **E1. Delivery/documentation cleanup**
   - only after the reviewer workflow is stable

## 17.8 Issues That Should Not Be Reopened As Major Phases

These were important earlier, but should no longer dominate planning:

- “restore source-driven UI”
- “introduce Vitest”
- “make build source-derived”
- “prove runtime parity exists at all”

They are now maintenance concerns, not the main roadmap.

## 17.9 Suggested Milestone Reframe

Reframe the next milestones as:

### M6. Review Truthfulness

Deliverables:
- no fake telemetry
- parser-mode labeling in live UI
- parser-mode labeling in exports

### M7. Parser Confidence

Deliverables:
- canonical vs standalone comparison fixtures
- explicit fallback/degradation policy

### M8. Reviewer Workflow Completion

Deliverables:
- notes
- diff
- validation/test summary
- exportable review packet

### M9. Reliability Baseline

Deliverables:
- real error states
- keyboard/focus safety
- responsive protection
- interaction tests

### M10. Release Readiness

Deliverables:
- docs match implementation
- verification checklist is authoritative
- deployment/release path is explicit

## 17.10 Immediate Backlog To Carry Forward

The most actionable near-term backlog is:

1. remove misleading placeholder telemetry from the current review workspace
2. add parser-mode annotations to exports and summaries
3. build canonical vs standalone fixture-comparison tests
4. finish the notes/diff/export review packet flow
5. add explicit query-error states across the review surfaces

## 17.11 Stop-Loss Rules

To prevent another over-broad planning cycle:

1. do not open a “full rewrite” track unless current source architecture demonstrably blocks progress
2. do not add collaboration/AI-autofix/cloud-sync scope before reviewer workflow completion
3. do not fork schema or parser semantics away from `skill-0`
4. if graph-first review intelligence proves too expensive, ship list-based evidence views first

## 17.12 Definition Of Success

This late-stage plan is successful when:

- a reviewer can ingest a skill artifact pair
- inspect it structurally
- see trustworthy validation and parser-mode evidence
- leave notes
- compare changes
- export a review packet
- and do all of that without needing to guess whether the system is showing real or placeholder results
