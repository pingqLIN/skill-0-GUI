# Chapter 15. Milestone Issue List

Back to index: [README.md](./README.md)

Related chapters:
- [13-ui-rebuild-backlog.md](./13-ui-rebuild-backlog.md)
- [14-ui-and-remaining-development-plan-2026-03-24.md](./14-ui-and-remaining-development-plan-2026-03-24.md)

## 15.1 Purpose

This chapter converts the development plan into issue-ready milestone tickets.

Each issue is written so it can be copied into GitHub Issues, Linear, or a local task tracker with minimal rewriting.

## 15.2 M1: Restore Source-Driven UI Baseline

### Suggested title

`M1: Restore source-driven UI baseline and build health`

### Scope

- restore or recreate `src/main.tsx`
- restore or recreate `src/App.tsx`
- reconnect build output to source
- set up Vitest
- add one build-smoke and one render-smoke test
- correct package identity and version metadata

### Acceptance criteria

- `src/` is once again the real authoring surface
- `npm run build` exits `0`
- `npm test` exits `0` with at least one smoke test
- `package.json` reflects the correct project identity

### Stop-loss

- time limit: `1 week`
- degradation path: reverse-scaffold a minimal `src/` shell from the current `dist/` output and continue from that baseline

## 15.3 M1.5: Verify Restored Source Health

### Suggested title

`M1.5: Verify restored source health and runtime equivalence`

### Scope

- run `tsc --noEmit`
- boot local dev mode successfully
- compare restored UI behavior against the current `dist` runtime
- document unresolved typing debt

### Acceptance criteria

- local dev mode runs without critical runtime errors
- TypeScript compile check passes
- restored UI is functionally equivalent to the current shipped runtime

### Stop-loss

- time limit: `2 days`
- degradation path: record deviations as known gaps and continue only if they do not block Phase 2

## 15.4 M2: Establish UI Baseline

### Suggested title

`M2: Add accessibility, responsive safety, and token baseline`

### Scope

- add semantic landmarks and ARIA
- implement focus management and keyboard navigation
- add reduced-motion support
- fix small-screen overflow behavior
- normalize radius, blur, opacity, and button tokens
- add critical interaction tests

### Acceptance criteria

- core flows are keyboard-usable
- editor and review surfaces work on viewports `>= 375px`
- token system is normalized to a small named scale
- at least `3` interaction tests pass

### Stop-loss

- time limit: `2 weeks`
- degradation path: complete focus management and keyboard navigation first, then defer broader a11y polish

## 15.5 M3: Harden Bridge And Runtime Confidence

### Suggested title

`M3: Harden bridge behavior, parser mode clarity, and runtime tests`

### Scope

- replace hardcoded parser path assumptions with `SKILL0_PARSER_ROOT`
- keep `SKILL0_ROOT` as backward-compatible alias
- decompose `skill0Bridge.mjs` if feasible
- test all three runtime endpoints in bridge and fallback modes
- add canonical vs standalone fixture comparisons
- expose parser mode in the UI

### Acceptance criteria

- `GET /api/bridge-status`, `GET /api/example-skill`, and `POST /api/parse-skill` are test-backed
- parser mode is visible to the user
- canonical vs standalone differences are described precisely
- bridge structure is improved or explicitly frozen with justification

### Stop-loss

- time limit: `2 weeks`
- degradation path: test the existing bridge monolith as-is and defer deeper decomposition

## 15.6 M4: Validate And Implement Review Intelligence

### Suggested title

`M4: Validate review intelligence with POC, then implement viable finding flow`

### Scope

- run a `3-day` POC on `3` real complex skills
- implement minimal graph extraction and ranking
- measure speed, memory, and usefulness
- if viable, implement full finding flow
- if not viable, ship list-based findings as v1

### Acceptance criteria

- POC report exists
- one of two outcomes is complete:
  - graph-based findings implemented
  - list-based findings implemented as approved fallback

### Stop-loss

- time limit: `3 days` for POC, `2 weeks` for full implementation
- degradation path: ship list-based findings without graph visualization

## 15.7 M5: Release Readiness

### Suggested title

`M5: Finalize CI, deployment guidance, and release documentation`

### Scope

- harden CI or define a documented manual release path
- finalize deployment guidance
- verify all docs match implementation
- finalize operator and external-review package

### Acceptance criteria

- release process is explicit
- deployment mode and parser mode are clearly documented
- documentation is internally consistent
- GitHub Actions runs the agreed validation set on push and pull request

### Stop-loss

- time limit: `3 weeks`
- degradation path: ship with documented manual release steps in `README.md`

## 15.8 Current Validation Set

The present release checklist is:

- `node --check server.mjs`
- `node --check bridge/skill0Bridge.mjs`
- `npm run lint`
- `npm run docs:check`
- `npm test`
- `npm run build`
- `npm run build:public` for the public no-3D profile

## 15.9 Recommended Labels

Suggested labels for these issues:

- `milestone`
- `ui`
- `runtime`
- `bridge`
- `docs`
- `a11y`
- `testing`
- `review-intelligence`

## 15.10 Recommended Execution Order

Create and execute issues in this order:

1. `M1`
2. `M1.5`
3. `M2`
4. `M3`
5. `M4`
6. `M5`

If resources tighten, stop after `M3` and treat `M4` as downgraded scope rather than blocked work.
