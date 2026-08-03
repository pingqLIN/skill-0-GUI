# UI/UX v2 design contract

Traditional Chinese companion: [29-uiux-v2-design-contract-2026-07-31.zh-tw.md](./29-uiux-v2-design-contract-2026-07-31.zh-tw.md)

Status: implemented design contract for the `2026-07-31` UI/UX v2 release.

## Intent

Make the Review Studio read as an editorial workbench: the active review is
central, evidence and blockers stay visible, and sign-off is a deliberate
terminal action rather than a hidden export affordance.

## Reference concepts

The concepts below were generated for this release and are a visual contract,
not runtime screenshots:

- [Desktop intake](assets/uiux-v2/intake-desktop-concept-v2.png)
- [Desktop review](assets/uiux-v2/review-desktop-concept-v2.png)
- [Mobile review](assets/uiux-v2/review-mobile-concept-v2.png)

## Product rules

- Keep parser mode, evidence posture, review status, handoff state, and export
  readiness visible without implying that a per-phase runtime execution
  occurred.
- On desktop, use a durable left view switcher, an unbroken central work area,
  and a persistent reviewer rail. Opening Review, Checks, or Context promotes
  that work to a right-side detail surface.
- On smaller viewports, retain a bottom detail drawer and preserve a usable
  source editor: file selection comes before the text editor instead of being
  squeezed into a narrow column.
- Use paper-toned surfaces, a deep slate navigation rail, compact all-caps
  metadata, square-to-subtle radii, and tonal separation. Do not use glass as
  the primary organizational cue.
- Localize intake navigation. Retain established technical nouns such as JSON,
  parser, and `SkillDocument` where that is more precise.

## Acceptance checks

- No horizontal document overflow at the active desktop or mobile viewport.
- Workspace view selection, source-file selection, detail drawer tabs, and
  drawer dismissal expose their relationships to assistive technology.
- The real app still supports intake, editable bundle sources, checks,
  reviewer sign-off, and export gating.
- Visual verification must compare a real desktop and mobile screenshot with
  the reference concepts; generated concepts alone are not delivery evidence.

## Known intentional differences

The shipped UI preserves the existing dense parser panels and bottom action
strip, because those controls expose real review state and exports. The concept
images show a calmer idealized content density; they do not supersede the
current parser, validation, or provenance boundaries.
