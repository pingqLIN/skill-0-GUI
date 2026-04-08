# 24. Browser Density Three-Round Report (2026-04-08)

Back to index: [README.md](./README.md)

Related chapters:
- [22-structural-depth-and-toolbar-execution-brief-2026-04-08.md](./22-structural-depth-and-toolbar-execution-brief-2026-04-08.md)
- [23-browser-density-review-loop-2026-04-08.md](./23-browser-density-review-loop-2026-04-08.md)

## 24.1 Scope

This report records the completed three-round browser-first pass for:

- large blank areas above the fold
- single-purpose blocks that monopolize vertical space
- repeated controls or status groups across views
- scroll caused by framing surfaces instead of actual review content

Primary evidence lives in:

- `output/playwright/round-1/`
- `output/playwright/round-2/`
- `output/playwright/round-3/`
- `output/review-notes/round-1.json`
- `output/review-notes/round-2.json`
- `output/review-notes/round-3.json`

## 24.2 Skill And Tool Decision

Used:

- `frontend-design`
- `playwright`
- `critique`
- `audit`
- `arrange`
- `polish`

Decision:

- no new external UI/UX skill install was required
- real browser capture was required
- repeatable screenshot plus DOM review was more reliable than code-only inspection

## 24.3 Round 1

### Findings

- the top context deck was too tall and card-like
- the executive summary plus process hero dominated the first screen
- vector and matrix inherited too much pipeline framing
- bottom drawers repeated status already visible in the shell
- `Return to overview` and workspace-view controls appeared in multiple places

### Development

- defaulted the dashboard and top toolbar to collapsed
- switched vector and matrix into focus mode so pipeline-only hero framing no longer followed them
- auto-collapsed the top deck when bottom drawers opened
- removed stretch behavior from top context cards

### Verification

- browser captures confirmed the top shell was smaller
- vector and matrix no longer inherited the pipeline hero surface

## 24.4 Round 2

### Findings

- process flow still spent too much height on hero framing before the decomposition board
- the lower `Workspace views` section duplicated the top navigation
- the focus-mode expanded deck still used too much height
- review/check/context drawers still consumed extra vertical space in headers

### Development

- removed the secondary workspace-view switcher from the main stage
- compressed the pipeline hero title, spacing, and reviewer decision panel
- increased bottom drawer usable height and reduced drawer chrome padding
- replaced the focus-mode expanded deck with a shorter context ribbon

### Verification

- round-3 metrics reduced the main pipeline hero block from roughly `689px` to `541px`
- duplicate button detection no longer reported repeated `Return to overview`
- the decomposition board moved into the first screen in the process view

## 24.5 Round 3 External Review

External-review stance:

- treat the captures as another team’s work
- reject cosmetic-only churn
- keep only changes that improve structure or scanning speed

### Review Notes

- process flow was materially improved because canonical decomposition now appears above the fold
- vector and matrix were improved, but the expanded context deck was still the dominant non-content block
- the dedicated `Return to overview` button remained redundant because the `Process Flow` tab already provided the same path

### Final Correction

- removed the redundant `Return to overview` button from the focus shell
- kept a single return path through the top workspace tab rail

## 24.6 Outcome

Accepted improvements:

- fixed tools and variable context are now separated more clearly
- pipeline content appears sooner
- duplicate workspace navigation was removed
- duplicated status surfaces were reduced instead of merely restyled
- bottom drawers use more of the viewport and waste less chrome

Residual risk:

- if users manually expand the focus-mode top deck, it still occupies a meaningful amount of height
- this is currently acceptable because it is opt-in and no longer the default state

## 24.7 Next Density Targets

If another pass is opened, prioritize:

1. reducing the expanded focus-mode deck another 10-15%
2. compressing review drawer form rows for wide desktop screens
3. tightening the decomposition board heading area without harming traceability
