# Chapter 17. Late-Stage Development Plan

Back to index: [README.md](./README.md)

Related chapters:
- [08-development-status-risks-and-roadmap.md](./08-development-status-risks-and-roadmap.md)
- [14-ui-and-remaining-development-plan-2026-03-24.md](./14-ui-and-remaining-development-plan-2026-03-24.md)
- [15-milestone-issue-list-2026-03-24.md](./15-milestone-issue-list-2026-03-24.md)
- [16-development-execution-brief-2026-03-28.md](./16-development-execution-brief-2026-03-28.md)

Raw planning inputs reviewed for this chapter:

- archived MVP planning note: `docs/archive/local-planning/skill-0-review-studio-mvp-plan.md`
- archived technical review note: `docs/archive/local-planning/skill-0-review-studio-mvp-plan2.md`

## 17.1 Purpose

This chapter replaces ad hoc MVP notes with a realistic late-stage plan grounded in:

1. the current `skill-0-review-studio` implementation
2. the current `skill-0` mainline state and open post-audit fixes
3. the remaining gaps that still block a trustworthy review product

The key correction is strategic:

- `Review Studio` should continue as a **review-first workbench**
- it should **not** expand into a second independent parser product
- late-stage work should prioritize **trust, reviewer workflow completion, and cross-repo contract clarity**

## 17.2 Current Baseline

What is already true in the working tree today:

- source-driven React/Vite authoring is restored
- the parser bridge works in both canonical and standalone modes
- the deployable runtime (`server.mjs`) exists and is test-backed
- the main workspace, derived workflow, vector view, and security/review surfaces render from live parser output
- export of a regenerated `.skill.md` exists
- `npm run lint`, `npm test`, `npm run build`, `npm run docs:check`, `npm run verify:build-size`, and `npm run verify:public-build` are currently green

What is also now true in `skill-0`:

- review attribution can no longer be forged from the dashboard client
- scan HTML export now returns real HTML
- production API bootstrap is being hardened so first-boot indexing is trustworthy
- parsed corpus schema validation is now part of CI

This matters because `Review Studio` should build on the newly hardened `skill-0` baseline, not on older assumptions from March 23-24 planning documents.

## 17.3 What In The Raw MVP Plans Is Still Valid

The strongest ideas from the raw MVP planning documents remain valid:

1. load a skill and its source side-by-side
2. edit both structured fields and raw JSON
3. validate and test changes without leaving the workspace
4. visualize structure and execution paths
5. export reviewer-facing results

The architecture recommendations that still hold:

- keep Python/canonical parser concerns separated from the TypeScript review surface
- use schema/shared contracts as the data boundary
- treat complex-skill review as a staged capability, not a day-one assumption
- keep standalone mode as a deployment and demo resilience layer

## 17.4 What Is Now Stale

The older plans contain assumptions that are no longer the right near-term priorities:

### No longer phase-gating

- source restoration
- initial Vitest setup
- bridge-status basics
- deployable server runtime existence
- public-build profile existence

These are already complete enough to stop treating them as the main roadmap.

### Outdated technical assumptions

- `skill-0-review-studio-mvp-plan2.md` still references schema `v2.0.0`
- CI absence is no longer the primary issue
- the next value is not “add any frontend visualizer”; the project already has a substantial workbench

### Not late-stage priorities

- building a new parser inside this repo
- AI auto-rewrite
- multi-user collaboration
- PR automation
- enterprise permissions
- cloud sync

Those remain deferred unless the product objective changes.

## 17.5 Highest-Signal Remaining Gaps

### A. Trustworthiness Of The Review Surface

The main remaining product risk is not “missing UI”, but UI that can look more authoritative than the underlying evidence.

Concrete signs:

- [../src/components/PhaseDetails.tsx](../src/components/PhaseDetails.tsx) still renders telemetry/reference sections that are explicitly described elsewhere as placeholder or not yet captured
- [16-development-execution-brief-2026-03-28.md](./16-development-execution-brief-2026-03-28.md) already calls this out as the top unfinished priority

Required outcome:

- no panel, metric, or reference block should look like real evidence unless it is actually backed by parser output or runtime data

### B. Reviewer Workflow Completion

The workspace is strong as an analysis shell, but still incomplete as a full reviewer tool.

Current strengths:

- session-local editing exists
- parser-mode/equivalence metadata is included in exported markdown
- context files and bundles can be analyzed

Remaining gaps:

- no durable draft persistence
- no explicit review report export separate from `.skill.md`
- no element-level reviewer notes system
- no robust before/after diff workflow for reviewer sign-off

Primary files:

- [../src/components/ReviewWorkspace.tsx](../src/components/ReviewWorkspace.tsx)
- [../src/components/SideEditor.tsx](../src/components/SideEditor.tsx)
- [../src/App.tsx](../src/App.tsx)

### C. Cross-Repo Contract Clarity

`Review Studio` is only trustworthy if its user-facing language stays aligned with `skill-0`.

Required alignment areas:

- parser mode
- canonical vs standalone status
- equivalence/fidelity wording
- export/report disclaimers
- schema/shared-doc versioning

Primary files:

- [../src/components/ReviewWorkspace.tsx](../src/components/ReviewWorkspace.tsx)
- [./shared/02-mode-and-equivalence-contract.md](./shared/02-mode-and-equivalence-contract.md)
- [./shared/03-shared-terminology.md](./shared/03-shared-terminology.md)

### D. Performance And Product Profile Discipline

The current build is acceptable, but the product still has an explicit split personality:

- internal/full build with optional 3D workspace
- public build without 3D

This is workable, but it needs a firm product decision instead of drifting indefinitely.

Observed baseline:

- standard build passes, but still emits a very large async 3D vendor chunk
- public build correctly excludes the 3D path

Required decision:

- either accept 3D as internal-only tooling
- or spend a dedicated optimization pass to make it a mainstream product surface

### E. Repo Hygiene And Planning Hygiene

The raw planning notes remain useful reference material, but they should live under a curated archive instead of the repo root:

- `docs/archive/local-planning/skill-0-review-studio-mvp-plan.md`
- `docs/archive/local-planning/skill-0-review-studio-mvp-plan2.md`
- `docs/archive/local-planning/Technical review and improvement suggestions.txt`

Backup-like files and Windows metadata artifacts should stay out of the working tree or be archived outside the repository.

## 17.6 Late-Stage Workstreams

### Workstream 1: Trustworthy Review Surface

Goal:

- remove misleading authority signals from the UI

Scope:

- relabel or remove placeholder telemetry in `PhaseDetails`
- ensure references are evidence-backed or explicitly marked as pending
- tighten “review guidance” language wherever standalone mode is involved

Acceptance:

- no placeholder block remains visually equivalent to a real captured measurement
- reviewer-facing evidence state is explicit everywhere

### Workstream 2: Reviewer Workflow Completion

Goal:

- turn the current analysis shell into a reviewer-complete MVP

Scope:

- export a dedicated review report, not only `.skill.md`
- add reviewer notes model (global + element-level)
- add meaningful diff presentation for sign-off
- choose and implement one persistence mode:
  - local draft persistence
  - export/import draft bundle
  - lightweight server-backed draft state

Acceptance:

- a reviewer can annotate, compare, and export a review package without relying on memory or screenshots

### Workstream 3: Skill-0 Contract Synchronization

Goal:

- keep `Review Studio` semantically aligned with the engine repo

Scope:

- consume the latest shared-doc contract after `skill-0` post-audit changes land
- validate parser-mode and equivalence/fidelity language in exports
- add fixture-based canonical vs standalone regression checks for representative skills

Acceptance:

- UI/export wording matches the shared contract
- parity boundaries are test-backed and user-visible

### Workstream 4: Product Profile Consolidation

Goal:

- formalize internal vs public deployment profiles

Scope:

- keep public build no-3D by default
- decide whether 3D remains internal-only or gets its own optimization budget
- document the intended deployment matrix clearly in README and docs

Acceptance:

- there is no ambiguity about which build is supported for public review use

### Workstream 5: Repo And Documentation Hygiene

Goal:

- reduce planning drift and root-level clutter

Scope:

- move raw MVP notes into an archive or reference folder
- update the docs index to treat this chapter as the strategic plan
- keep Chapter 16 as the shorter active execution brief

Acceptance:

- contributors see one clear strategic plan and one clear execution brief

## 17.7 Execution Order

Use this order for the next cycle:

1. Trustworthy review surface
2. Reviewer workflow completion
3. Skill-0 contract synchronization
4. Product profile consolidation
5. Repo and planning hygiene

## 17.8 Explicit Deferred Scope

Do not expand into these areas during the late-stage cycle unless the product mandate changes:

- new parser implementation in this repo
- multi-user collaboration
- PR automation
- AI auto-editing
- enterprise auth/permissions
- cloud persistence platform work

## 17.9 Verification Standard

Every substantial late-stage change should be checked with:

```bash
npm run lint
npm test
npm run build
npm run verify:build-size
npm run verify:public-build
npm run docs:check
node --check server.mjs
node --check bridge/skill0Bridge.mjs
```

If the change touches cross-repo mode contracts, also validate against the current `skill-0` shared docs and representative canonical fixtures.

## 17.10 Strategic Conclusion

`Review Studio` is no longer in the phase where “restore the app” is the main question.

The late-stage question is now:

> Can this workspace become a trustworthy, reviewer-complete front-end for `skill-0`, without pretending to be a second parser or a prematurely overbuilt collaboration platform?

This chapter sets the answer path: yes, but only if the project now prioritizes trust, workflow completion, and contract clarity over new breadth.
