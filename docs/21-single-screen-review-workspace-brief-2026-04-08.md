# 21. Single-Screen Review Workspace Brief (2026-04-08)

Back to index: [README.md](./README.md)

Related chapters:
- [05-frontend-workbench.md](./05-frontend-workbench.md)
- [19-mvp-consistency-and-next-execution-brief-2026-03-28.md](./19-mvp-consistency-and-next-execution-brief-2026-03-28.md)
- [20-online-demo-plan-2026-04-03.md](./20-online-demo-plan-2026-04-03.md)

## 21.1 Purpose

This brief converts the current single-screen review request into repository-local execution and verification criteria.

The target is not "no scrolling anywhere".
The target is:

- keep the review workspace bounded to the viewport
- move dense secondary material into mutually exclusive zones
- prefer panel-level scrolling over full-page runaway growth
- make the interaction model explicit in tests

## 21.2 Current Implementation Boundary

The repository already implements the main structural shift:

- the review workspace is bounded to the viewport-height shell
- the main pipeline canvas uses internal scrolling instead of unconstrained page growth
- the bottom drawer uses mutually exclusive top-level tabs:
  - `review`
  - `checks`
  - `context`
- each drawer section uses mutually exclusive sub-tabs instead of stacked long-form blocks

This means the product direction from the single-screen confirmation note is substantially implemented in code, even though the exact Tailwind values differ from the original sketch.

## 21.3 What Must Be True To Count This Slice As Complete

Do not claim this single-screen slice complete unless all of the following are true:

1. The review workspace remains visually bounded inside the viewport shell.
2. `DecompositionBoard` is height-limited and scrolls internally instead of forcing page growth.
3. The derived workflow area is bounded and keeps `Flowchart` / phase detail content inside local scroll regions.
4. The bottom drawer opens as one bounded surface, not as stacked document-length sections.
5. `review`, `checks`, and `context` each expose mutually exclusive sub-tabs.
6. Reviewer flows that previously assumed always-visible drawer content are covered by tests that explicitly open the relevant tab and sub-tab first.

## 21.4 Remaining Gaps

The slice is not fully closed yet in these areas:

- no dedicated viewport-layout test asserts the exact shell-height contract
- the main workspace body still allows internal vertical scrolling, which is acceptable for now but should remain intentional
- a future responsive pass should verify that the same bounded-zoning behavior still holds on smaller screens

## 21.5 Required Test Adjustments

The old `ReviewWorkspace` tests assumed several drawer panels were always visible once the drawer opened.
That assumption is now wrong.

Tests must instead model the actual reviewer path:

1. open the bottom drawer category
2. select the correct sub-tab
3. interact with the controls inside that active zone
4. assert the visible result

High-signal cases:

- schema validation lives under `checks -> schema`
- consistency issues live under `checks -> consistency`
- reviewer test runs live under `checks -> tests`
- validation evidence lives under `checks -> evidence`
- reviewer notes capture lives under `review -> notes`
- diff summary lives under `review -> diff`
- review status, handoff, sign-off, and export gates live under `review -> decision`

## 21.6 Verification Standard

Use this order for the current slice:

```bash
npm test -- src/test/ReviewWorkspace.test.tsx
npm run lint
```

Expand to the full repo suite only after the interaction-model regression is green:

```bash
npm test
npm run build
npm run docs:check
```
