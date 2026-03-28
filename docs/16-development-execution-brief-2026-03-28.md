# Chapter 16. Development Execution Brief

Back to index: [README.md](./README.md)

Related chapters:
- [08-development-status-risks-and-roadmap.md](./08-development-status-risks-and-roadmap.md)
- [14-ui-and-remaining-development-plan-2026-03-24.md](./14-ui-and-remaining-development-plan-2026-03-24.md)
- [15-milestone-issue-list-2026-03-24.md](./15-milestone-issue-list-2026-03-24.md)

## 16.1 Purpose

This brief is the active execution document for the repository as of `2026-03-28`.

It replaces older planning assumptions that still described source restoration, baseline Vitest setup, and runtime parity coverage as unfinished work.

## 16.2 Current Baseline

The repository is currently in this state:

- source-driven React/Vite authoring is restored and active
- bridge status, example skill loading, and parser execution are test-backed in both Express runtime and Vite dev middleware
- a deployable `server.mjs` runtime exists
- public builds exclude the optional 3D workspace
- the standard build has an explicit entry-size guard
- the review workspace is lazily loaded after analysis instead of shipping inside the intake shell

## 16.3 Audit Findings Closed In This Pass

The following findings were addressed during the current audit/remediation pass:

- workspace-local navigation state no longer resets on every edit or undo-induced data mutation
- the deployable Express runtime no longer uses the old `1mb` JSON body cap; it now defaults to `10mb` and can be overridden with `SKILL0_API_BODY_LIMIT`
- zip-based intake now has explicit regression coverage
- the workspace now exposes a way to return from focus mode back to the overview/dashboard surface
- the top-level docs now distinguish historical plans from the active execution baseline

## 16.4 Remaining High-Value Work

### Priority A: Trustworthy review surfaces

- remove or relabel UI elements that still present placeholder telemetry or generic references as if they were real evidence
- strengthen exported review artifacts so canonical vs standalone mode is explicit outside the live workspace too
- require every exported report or summary to carry parser mode, mode source, equivalence status, and a canonical re-run requirement whenever the result is fallback-derived or unknown

### Priority B: Parser confidence

- add canonical vs standalone fixture-comparison tests for representative skills
- define what level of divergence is acceptable for standalone mode and document it with examples

### Priority C: Intake and edit hardening

- keep bundle-intake flows test-backed as the payload model evolves
- continue tightening edit-state behavior, especially around multi-phase navigation and modal/editor workflows

### Priority D: Performance follow-through

- keep the standard entry chunk under the current guard
- decide whether the large async 3D vendor chunk should be optimized further or accepted as an internal-only tradeoff

## 16.5 Execution Order

Use this order for the next implementation cycle:

1. Remove misleading placeholder telemetry from `PhaseDetails`
2. Add canonical vs standalone fixture-comparison tests
3. Expand exported-report mode annotation and reviewer guidance
4. Reassess the 3D async chunk only after the review-surface correctness work is complete

## 16.6 Verification Standard

Every substantial change should be checked with:

```bash
npm run lint
npm test
npm run build
npm run verify:build-size
npm run verify:public-build
npm run docs:check
```

If the change touches runtime startup or bridge execution, also run:

```bash
node --check server.mjs
node --check bridge/skill0Bridge.mjs
```
