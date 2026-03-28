# Chapter 14. UI And Remaining Development Plan

Back to index: [README.md](./README.md)

Related chapters:
- [08-development-status-risks-and-roadmap.md](./08-development-status-risks-and-roadmap.md)
- [12-ui-design-review-2026-03-23.md](./12-ui-design-review-2026-03-23.md)
- [13-ui-rebuild-backlog.md](./13-ui-rebuild-backlog.md)

## 14.1 Purpose

This chapter defines the execution plan for:

- rebuilding the source-driven UI layer
- closing the highest remaining engineering risks
- turning `skill-0-GUI` from a recovered runtime into a maintainable product surface

This plan is intentionally broader than the UI review alone. It covers both:

- UI recovery and quality work
- remaining platform, bridge, testing, and productization work

## 14.2 Planning Assumptions

This plan assumes:

1. the current `dist + bridge + server` runtime remains the short-term executable baseline
2. the long-term maintainable product requires a restored or reconstructed `src/` authoring layer
3. canonical parser bridge support remains strategically important
4. standalone mode remains necessary for external deployment and demo resilience
5. documentation should continue to be a first-class deliverable
6. this is a single-developer project; every scope decision must respect resource reality
7. automated tests should be introduced as early as Phase 1, not deferred to Phase 3
8. every phase should define a stop-loss point and a degradation path to prevent stalls
9. the canonical parser path should be configuration-driven, not hardcoded
10. rebuild decisions should stay selective by default; full rewrite is a last-resort move, not the planning baseline

## 14.3 Objectives

The plan has five primary objectives:

1. restore a maintainable source-driven UI
2. establish a production-quality accessibility and responsive baseline
3. harden bridge, parser, and mode clarity
4. add enough automated verification to reduce regression risk
5. productize the reviewer workflow for complex multi-skill analysis

## 14.4 Workstreams

### Workstream A: Source Restoration And Build Health

Goal:

- replace `dist`-first authoring with a real source-driven frontend baseline
- establish the test framework so subsequent phases have regression protection

Scope:

- restore or recreate `src/main.tsx`
- restore or recreate `src/App.tsx`
- reconstitute the primary workbench modules
- ensure `build` is source-derived, not artifact-maintained
- set up Vitest and write at least one smoke test per restored module
- rename package from `react-example` to `skill-0-gui` and set version to `0.1.0`
- verify TypeScript compilation passes (not necessarily strict mode yet)

Key dependency:

- none; this is the gating workstream for meaningful UI engineering

### Workstream B: UI Foundation

Goal:

- rebuild the workbench so it is usable, accessible, and systematized

Scope:

- accessibility baseline
- responsive safety
- token normalization
- state and component architecture cleanup
- motion hardening

Key dependency:

- Workstream A

### Workstream C: Bridge And Parser Confidence

Goal:

- make mode behavior trustworthy and understandable

Scope:

- canonical bridge tests
- standalone fallback tests
- fixture-based output comparisons
- visible bridge mode in the UI
- clearer equivalence language in reviewer-facing surfaces
- replace hardcoded canonical parser paths with `SKILL0_PARSER_ROOT` environment variable
- decompose `skill0Bridge.mjs` into focused modules: core, canonical, standalone, metrics

Key dependency:

- partial dependency on Workstream A for UI exposure
- can begin partly in parallel at the test layer

### Workstream D: Review Intelligence

Goal:

- implement the complex-skill analysis model so the product produces high-value findings instead of raw structure only

Scope:

- graph extraction
- risk ranking
- evidence-backed warnings
- main skill / subskill / command-reference handling

Key dependency:

- bridge/parsing baseline must remain stable

Gate requirement:

- before full implementation, a POC spike must validate feasibility using 3 real complex skills and produce a viability report (see Phase 4)

### Workstream E: Delivery And Operations

Goal:

- move from recovered engineering state to reliable delivery state

Scope:

- CI hardening
- runtime test coverage
- deployment documentation
- release packaging
- external review readiness

Key dependency:

- all other workstreams feed this one

## 14.5 Phase Plan

### Phase 1: Rebuild The Authoring Baseline

Primary workstreams:

- Workstream A

Tasks:

- reconstruct `src/` entrypoints
- recreate the core workbench shell
- reconnect build output to source
- re-establish a predictable local development loop
- set up Vitest; write one build-smoke and one render-smoke test
- rename package, fix version, clean unused dependencies (`better-sqlite3`, duplicate `motion`/`framer-motion`)
- ensure `npm run build` completes without errors

Exit criteria:

- the UI is once again authored from source files
- `npm run build` produces the active frontend from source
- the project no longer depends on `dist` as the primary editing surface
- at least one smoke test passes (`npm test` exits 0)
- `package.json` reflects correct project identity

Stop-loss:

- if source restoration from git HEAD does not compile within 1 week, generate a minimal `src/` skeleton from the existing `dist/` bundle using reverse scaffolding, then iterate from there

### Phase 1.5: Source Health Verification

This is a lightweight gate between Phase 1 and Phase 2.

Tasks:

- verify TypeScript compilation (`tsc --noEmit`) reports zero errors (not necessarily strict mode)
- verify no critical runtime errors in dev mode (`npm run dev`)
- document any `any`-typed interfaces that will need future attention
- confirm restored UI visually matches the existing `dist/` output

Exit criteria:

- dev server runs without crashes
- build output is functionally equivalent to existing `dist/`

### Phase 2: Establish UI Baseline Quality

Primary workstreams:

- Workstream B

Tasks:

- add semantic landmarks and ARIA where needed
- implement focus management and keyboard navigation
- add reduced-motion support
- fix small-screen overflow behavior
- normalize radius, blur, opacity, and button tokens
- add component-level tests for critical interactions (editor open/close, tab navigation, panel focus)

Exit criteria:

- core flows are keyboard-usable; specifically: skill intake, analysis trigger, result navigation, side editor open/close
- editing surfaces do not break on viewports >= 375px wide
- the visual system is based on a small repeatable token set (max 4 radius values, max 3 blur levels)

Stop-loss:

- if full a11y pass exceeds 2 weeks, complete only focus management and keyboard navigation, defer remaining a11y items to P2 priority

### Phase 3: Harden Bridge And Runtime Confidence

Primary workstreams:

- Workstream C
- Workstream E

Tasks:

- replace hardcoded canonical parser paths with `SKILL0_PARSER_ROOT` environment variable
- decompose `skill0Bridge.mjs` into focused modules (core resolution, canonical adapter, standalone adapter, metric transforms)
- test `GET /api/bridge-status`
- test `GET /api/example-skill`
- test `POST /api/parse-skill`
- compare canonical and standalone fixture outputs for at least 3 reference skills
- expose mode state in the UI with clear visual indicator

Exit criteria:

- mode behavior is test-backed
- reviewers can tell which path produced a result
- fallback output is explicitly described as compatible or degraded when appropriate
- bridge decomposition complete; no single file exceeds 200 lines

Stop-loss:

- if bridge decomposition risks breaking functionality beyond 2 weeks, freeze the decomposition, test the monolith as-is, and defer structural cleanup

### Phase 4: Implement Review Intelligence

Primary workstreams:

- Workstream D

#### Phase 4a: POC Spike (gating)

Tasks:

- select 3 real complex skills of varying complexity
- implement minimal graph extraction (nodes + edges only)
- implement minimal finding ranking (severity x evidence)
- measure: extraction time per skill, memory usage, false-positive rate
- produce a brief viability report

POC gate criteria:

- extraction completes within 5 seconds per skill on target hardware
- at least 2 of 3 test skills produce non-trivial findings
- developer judges the approach worth continuing

If POC fails:

- downgrade to list-based risk display without graph visualization
- use flat finding enumeration instead of ranked graph output
- this is an acceptable v1 outcome

#### Phase 4b: Full Implementation (conditional on POC pass)

Tasks:

- implement graph extraction for main skills, subskills, and command references
- implement finding ranking based on severity, evidence, and path importance
- render evidence-based warnings into the UI and review output
- add mode-aware wording for equivalence and degradation

Exit criteria:

- the system produces actionable findings instead of parser output alone
- complex skill analysis follows the contracts in Chapters 9, 10, and 11

### Phase 5: Productize And Ship

Primary workstreams:

- Workstream E

Tasks:

- tighten CI and regression checks
- finalize deployment guidance
- prepare release-ready external review package
- document operator workflow and public-hosting mode
- verify documentation matches implemented state; update any chapters that have drifted

Exit criteria:

- repository is reviewable, test-backed, and release-documented
- external users can understand deployment mode and parser mode without ambiguity
- all 14 documentation chapters are consistent with shipped code

Stop-loss:

- if CI setup exceeds 3 weeks, ship with manual release process and document the procedure in README

## 14.6 Priority Order

The practical priority order is:

1. source restoration and test framework setup
2. source health verification
3. accessibility and responsive baseline
4. bridge path configuration and decomposition
5. bridge and runtime tests
6. parser-mode clarity in the UI
7. token normalization and shell refactoring
8. review intelligence POC spike
9. review intelligence full implementation (conditional)
10. CI, release, and operations hardening

This order intentionally balances:

- product risk
- engineering leverage
- reviewer value
- deployment readiness
- single-developer sustainability

## 14.7 Deliverables By Area

### UI deliverables

- restored `src/` application tree
- reusable design-token set
- keyboard-usable editing and review surfaces
- motion-safe and mobile-safe workbench

### Parser and bridge deliverables

- stable bridge-mode indicator
- configuration-driven canonical parser resolution (`SKILL0_PARSER_ROOT`)
- canonical vs standalone comparison fixtures
- mode-aware reviewer wording
- decomposed bridge modules (core, canonical, standalone, metrics)

### Analysis deliverables

- graph-based complex-skill analysis (or list-based alternative if POC dictates)
- ranked findings
- evidence-backed warnings

### Delivery deliverables

- automated tests for runtime endpoints and UI smoke paths
- CI validation for source, build, and mirrored documentation
- release-ready deployment and review docs

## 14.8 Risks And Mitigations

### Risk: Source reconstruction takes longer than expected

Mitigation:

- restore the shell and critical modules first
- defer advanced polish until the source baseline is stable
- stop-loss: if git HEAD restoration does not compile within 1 week, reverse-scaffold from `dist/`

### Risk: UI work outruns parser certainty

Mitigation:

- keep mode visibility explicit
- require fixture comparisons before making strong equivalence claims
- block Phase 4 until Phase 3 exit criteria are met

### Risk: Review intelligence adds complexity faster than usability

Mitigation:

- keep the warning model evidence-backed
- rank findings and show only the highest-value output first
- require POC spike with viability gate before committing to full implementation
- define explicit downgrade path: list-based findings without graph visualization

### Risk: Runtime remains artifact-driven for too long

Mitigation:

- treat source restoration as a gating milestone, not a nice-to-have

### Risk: Zero-test regression during early refactoring

Mitigation:

- introduce Vitest in Phase 1 alongside source restoration
- write smoke tests before any structural refactoring in Phase 2
- never refactor without at least one covering test

### Risk: Developer burnout from scope overload

Mitigation:

- weekly iteration checkpoint (see Section 14.13)
- every milestone has a defined stop-loss and degradation path
- accept that Review Intelligence (M4) can be a v2 deliverable without invalidating v1
- aim for the 60% scenario (M1-M3 complete + downgraded M4) rather than requiring the 25% scenario (full M1-M5)

### Risk: Canonical parser path unavailable in deployment

Mitigation:

- replace all hardcoded paths with `SKILL0_PARSER_ROOT` environment variable
- document required environment configuration in deployment chapter
- standalone mode already provides resilient fallback

### Risk: Three.js / react-force-graph-3d performance on large skill graphs

Mitigation:

- during Phase 4 POC, measure vertex count and frame rate for target skill sizes
- define a maximum supported node count (recommended: 500 nodes)
- if exceeded, provide a 2D fallback or paginated view

### Risk: Documentation drifts from implementation

Mitigation:

- Phase 5 explicitly includes documentation consistency verification
- keep documentation updates in the same commit as the code they describe

## 14.9 Suggested Milestone Definition

### Milestone M1: Source Recovery

- source-driven UI baseline restored
- build tied back to source
- `npm run build` exits 0
- `npm test` exits 0 with at least one smoke test
- package.json identity corrected

Stop-loss: 1 week; degrade to reverse-scaffold from dist

### Milestone M2: UI Baseline

- a11y baseline in place: focus management, keyboard navigation, semantic landmarks
- mobile-safe editor and review flows (>= 375px)
- token system normalized (max 4 radius, max 3 blur, named surface depths)
- at least 3 component interaction tests passing

Stop-loss: 2 weeks for a11y; degrade to focus-management-only if exceeded

### Milestone M3: Runtime Confidence

- bridge endpoints tested (3 endpoints x 2 modes = 6 test cases minimum)
- fallback comparison fixtures established for >= 3 reference skills
- mode exposed in the UI with clear visual indicator
- bridge decomposed into focused modules

Stop-loss: 2 weeks; degrade to testing monolith as-is without decomposition

### Milestone M4: Reviewer Intelligence

- POC spike completed and documented
- if POC passes: complex-skill findings, ranking, and warnings implemented
- if POC fails: list-based finding display implemented as acceptable v1

Stop-loss: POC limited to 3 days; full implementation limited to 2 weeks

### Milestone M5: Release Readiness

- CI hardened or manual release process documented
- operator and external review docs finalized
- documentation consistency verified against shipped code

Stop-loss: 3 weeks; degrade to manual release with README instructions

## 14.10 Success Criteria

This plan should be considered complete when:

1. the project no longer depends on `dist` as the real authoring layer; `src/` is the sole authoring surface
2. core UI flows (skill intake, analysis trigger, result navigation, editor open/close) are keyboard-accessible and usable on viewports >= 375px
3. canonical and standalone parser modes are explicit, test-backed, and configuration-driven
4. complex skill analysis produces ranked, evidence-based reviewer output (graph-based or list-based per POC outcome)
5. the repository is shippable with clear deployment and review guidance; documentation matches implementation

## 14.11 Execution Note

If staffing or time is limited, the minimum viable path is:

1. restore source (with test framework)
2. fix accessibility and mobile safety
3. test bridge endpoints
4. expose parser mode

That sequence yields the highest immediate return while keeping the project honest about mode semantics and product quality.

Probability assessment for planning purposes:

| Scenario | Estimated likelihood |
|----------|---------------------|
| Full M1-M5 as planned | 25% |
| M1-M3 complete + downgraded M4 | 60% |
| MVP path only (4 steps above) | 85% |

The recommended target is the 60% scenario. Reaching it is a meaningful product milestone. The full M1-M5 plan remains the aspirational goal but should not create pressure that leads to burnout or shortcuts.

## 14.12 Stop-Loss Summary

| Milestone | Time limit | Degradation path |
|-----------|-----------|------------------|
| M1 | 1 week | Reverse-scaffold from `dist/` |
| M2 | 2 weeks | Focus management only; defer remaining a11y |
| M3 | 2 weeks | Freeze bridge structure; test monolith as-is |
| M4 | 3 days POC + 2 weeks impl | List-based findings without graph |
| M5 | 3 weeks | Manual release + README documentation |

Each stop-loss is a decision point, not a failure. Choosing the degradation path means redirecting effort to the next milestone rather than stalling on the current one.

## 14.13 Weekly Iteration Protocol

At the end of each working week, answer three questions:

1. What was completed this week?
2. What is the single most important task for next week?
3. What should be explicitly deferred or dropped?

This keeps scope honest and prevents silent accumulation of unfinished work.

After M3 completion, invite 1-2 external reviewers for early feedback. Real usage signals are more valuable than internal assumptions at that stage.
