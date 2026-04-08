# 22. Structural Depth And Toolbar Execution Brief (2026-04-08)

Back to index: [README.md](./README.md)

Related chapters:
- [12-ui-design-review-2026-03-23.md](./12-ui-design-review-2026-03-23.md)
- [21-single-screen-review-workspace-brief-2026-04-08.md](./21-single-screen-review-workspace-brief-2026-04-08.md)

## 22.1 Purpose

This brief defines the current execution direction for the review workspace shell after the top-toolbar merge.

The goal is not decorative glassmorphism.
The goal is:

- increase structural legibility between major workspace zones
- separate fixed tools from context-dependent tools
- reduce flatness caused by low-color, low-depth surfaces
- preserve the reviewer-first, operational character of the product

## 22.2 Current Direction

The workspace should read as three major depth bands:

1. top dock
   - fixed tools remain visible at all times
   - contextual reviewer status can expand or collapse
2. review stage
   - the main evidence and review surface should feel like the primary working plane
3. bottom dock and drawer
   - secondary review zones should feel docked above the bottom edge, not pasted flat onto the page

Within each band, smaller cards may exist, but depth should be communicated primarily by section containers, not by stacking many nested cards.

## 22.3 Visual Rules

Use these rules during follow-up development:

- apply blur, shadow, and highlight at the section level first
- keep the palette restrained; use depth and luminance before adding more color
- do not add more than one new depth language in the same area
- avoid glossy toy-like glass effects, neon glows, or dark-mode cyber styling
- avoid solving structure problems by adding more borders everywhere
- preserve text clarity and focus visibility over atmosphere

## 22.4 Toolbar Structure Contract

The top toolbar is now split into:

- fixed tools
  - GitHub
  - AI settings
  - language toggle
  - toolbar collapse toggle
- context deck
  - current focus
  - parser mode
  - LLM fallback
  - draft status
  - contextual workspace actions

Required interaction behavior:

1. collapsing the toolbar must hide the context deck only
2. fixed tools must remain usable when collapsed
3. the collapse state must not break the single-screen workspace shell

## 22.5 Skill And Tool Decision

Use these skills for continued work:

- `frontend-design`
  - design direction and anti-pattern control
- `arrange`
  - macro layout and fixed-vs-context zone organization
- `polish`
  - final density, spacing, and interaction refinement

Use `adapt` only when doing a dedicated responsive pass.

Current tool decision:

- no additional external tool is required for the structural-depth slice itself
- browser automation is optional for visual verification, not required for implementation

## 22.6 Five-Hour YOLO Continuation Order

If development continues without supervision, use this order:

1. stabilize section-level depth tokens and container classes
2. refine top dock spacing, density, and collapse ergonomics
3. rebalance the main review stage so the primary plane is visually dominant
4. refine bottom drawer depth so it reads as a docked secondary plane
5. perform responsive and accessibility checks
6. run targeted tests, lint, and production build

## 22.7 Acceptance Standard

Do not call this slice complete unless all are true:

1. the top toolbar clearly distinguishes fixed tools from contextual reviewer information
2. collapse and expand states both read as intentional layouts
3. the main review stage feels visually primary over surrounding docks
4. the bottom drawer is distinguishable from both the page background and the main review plane
5. depth cues improve structure without reducing text readability or focus affordance
6. tests, lint, and build remain green

## 22.8 Residual Risk

The main residual risk is over-layering:

- too many shadows
- too many blur values
- too many nested depth surfaces

If that starts happening, reduce local decoration and reinforce only the largest structural containers.
