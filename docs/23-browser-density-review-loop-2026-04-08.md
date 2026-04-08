# 23. Browser Density Review Loop (2026-04-08)

Back to index: [README.md](./README.md)

Related chapters:
- [21-single-screen-review-workspace-brief-2026-04-08.md](./21-single-screen-review-workspace-brief-2026-04-08.md)
- [22-structural-depth-and-toolbar-execution-brief-2026-04-08.md](./22-structural-depth-and-toolbar-execution-brief-2026-04-08.md)

## 23.1 Purpose

This brief defines the current browser-first review loop for density, duplication, and viewport efficiency.

The target is not maximum compactness.
The target is:

- reduce repeated structural blocks across views
- remove large blank surfaces that contribute little information
- shorten single-function sections that monopolize vertical space
- reduce the need to scroll or open drawers for context that should already be obvious

## 23.2 Required Skills And Tooling

Use this minimal set:

- `frontend-design`
- `critique`
- `audit`
- `playwright`
- `arrange`
- `polish`

Tool decision:

- browser inspection is required for this slice
- use repeatable screenshot and DOM review instead of ad hoc visual guessing
- use local scripts and captured artifacts so each round can be compared

## 23.3 Review Questions

Each browser round must explicitly check:

1. Are there large blank blocks above the fold?
2. Does any one function monopolize vertical space?
3. Are the same status or control groups repeated 2+ times in the same view?
4. When switching between pipeline, vector, matrix, and drawer views, does the page still show pipeline-heavy scaffolding that no longer helps?
5. Does the user need to scroll mainly because of content, or because of repeated framing surfaces?

## 23.4 Three-Round Loop

### Round 1

- capture current shell
- identify blank surfaces and repeated zones
- apply the highest-impact structural reductions only

### Round 2

- re-capture browser evidence
- tune density inside the remaining dominant blocks
- reduce redundant helper copy, chips, or state badges that still compete for space

### Round 3

- run an external-review style pass after the second implementation
- treat the browser captures as if reviewing another team's work
- only apply fixes that improve structure, not cosmetic churn

## 23.5 Current High-Risk Targets

At the start of this loop, these areas are the highest risk:

- top context deck height
- dashboard summary height
- pipeline-only framing appearing in non-pipeline views
- review drawer plus top shell duplication
- long single-purpose sections inside reviewer decision and context drawers

## 23.6 Acceptance Standard

Do not close this slice unless:

1. vector and matrix views no longer inherit unnecessary pipeline-heavy scaffolding
2. the top shell defaults to a compact mode that still preserves fixed tools
3. the dashboard and hero surfaces do not dominate the first screen without clear justification
4. repeated status areas are reduced instead of visually restyled and left duplicated
5. browser screenshots show a measurable improvement in above-the-fold information density
6. tests, lint, and build remain green
