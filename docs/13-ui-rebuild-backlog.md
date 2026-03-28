# Chapter 13. UI Rebuild Backlog

Back to index: [README.md](./README.md)

Related chapters:
- [05-frontend-workbench.md](./05-frontend-workbench.md)
- [08-development-status-risks-and-roadmap.md](./08-development-status-risks-and-roadmap.md)
- [12-ui-design-review-2026-03-23.md](./12-ui-design-review-2026-03-23.md)

## 13.1 Purpose

This chapter converts the design review into an execution-oriented rebuild backlog.

The backlog assumes the project will first restore or recreate a source-driven UI layer rather than continuing to treat `dist/` as the long-term authoring surface.

## 13.2 Priority Model

The backlog uses four levels:

- `P0` foundational blocker
- `P1` production-quality baseline
- `P2` structural quality improvement
- `P3` product polish and differentiation

## 13.3 P0: Restore A Source-Driven UI Baseline

Goal:

- recover or recreate the active `src/` application tree so UI work is maintainable

Tasks:

- re-establish `src/main.tsx` and `src/App.tsx` as real authoring entrypoints
- restore or recreate the major workbench modules:
  - dashboard summary
  - flowchart
  - phase detail inspector
  - decomposition board
  - security matrix
  - side editor
- ensure build output is derived from source, not treated as the primary authoring layer

Definition of done:

- UI can be changed through source files and rebuilt deterministically

## 13.4 P1: Accessibility Baseline

Goal:

- eliminate the current zero-baseline accessibility risk

Tasks:

- add semantic landmarks and heading order
- add ARIA and dialog semantics where appropriate
- implement focus trap for side panels and modal-like editing surfaces
- support keyboard navigation across major interactive regions
- support `Escape` close behavior for transient panels
- add reduced-motion handling for animated views
- raise any sub-usable minimum font sizing

Definition of done:

- major workbench paths are usable without pointer-only interaction

## 13.5 P1: Responsive Safety

Goal:

- make the workbench usable on narrow screens without accidental overflow traps

Tasks:

- remove fixed-width assumptions in editing surfaces
- define narrow-screen behavior for side editor and dense review panels
- ensure charts and graph surfaces degrade or stack cleanly on mobile
- define minimum supported viewport widths

Definition of done:

- editor, summary, and analysis flows remain operable on common mobile and tablet widths

## 13.6 P1: Token Normalization

Goal:

- convert expressive but ad hoc visual styling into a controlled design system

Tasks:

- reduce radius values to a small approved scale
- reduce blur values to a small approved scale
- reduce opacity and surface-depth patterns to named tokens
- collapse button variants into a limited semantic set
- document typography roles, including actual serif usage or removal

Definition of done:

- visual richness remains, but the system is traceable and repeatable

## 13.7 P2: State And Component Architecture

Goal:

- reduce shell complexity and make the workbench testable

Tasks:

- split large app shell state into domain-specific hooks
- separate intake state, analysis state, editor state, and review state
- introduce clearer boundaries between parser results and UI-derived transforms
- isolate reusable panel and surface primitives
- add component-level tests for state transitions and core interactions

Definition of done:

- no single shell component carries most orchestration responsibility

## 13.8 P2: Motion Hardening

Goal:

- preserve motion quality while making it safe and intentional

Tasks:

- preserve flowchart visual character
- add reduced-motion alternatives
- ensure motion reinforces information flow instead of creating decoration-only load
- align animation timing across panels and transitions

Definition of done:

- motion remains distinctive but does not block accessibility or comprehension

## 13.9 P3: Product Polish

Goal:

- turn the restored workbench into a distinctive reviewer-facing product surface

Tasks:

- deepen visual hierarchy without excessive nested glass surfaces
- refine empty, loading, and error states
- clarify review-copy language and operator prompts
- improve narrative transitions between overview, decomposition, and risk views

Definition of done:

- the UI reads as an intentional review studio rather than a promising prototype

## 13.10 Execution Order

Recommended order:

1. `P0` source restoration
2. `P1` accessibility baseline
3. `P1` responsive safety
4. `P1` token normalization
5. `P2` state and component architecture
6. `P2` motion hardening
7. `P3` product polish

## 13.11 Strategic Note

If the repository remains intentionally runtime-first and does not restore a maintainable source layer, most items in this backlog should be treated as deferred rather than partially patched into `dist/`.

That tradeoff should be explicit, not accidental.

## 13.12 Rebuild Recommendation

Do not treat "rebuild" as an all-or-nothing rewrite.

Recommended stance:

- keep the parser bridge contract, runtime shell, and workbench information architecture
- selectively rebuild the highest-friction UI modules
- use measured wins to decide whether broader rebuilding is justified

Current best candidates for selective rebuild:

- `VectorSpace`, because 3D dependencies are expensive and reviewer value is higher in a lightweight map-first surface
- shell state boundaries in `App.tsx`, because orchestration pressure is still concentrated there
- visual token surfaces, because the current expressiveness is useful but not yet normalized

Avoid a full rewrite unless at least one of these becomes true:

- the restored source tree can no longer evolve safely
- M2 and M3 repeatedly stall on structural coupling instead of feature work
- the current interaction model proves incompatible with reviewer workflows in real usage
