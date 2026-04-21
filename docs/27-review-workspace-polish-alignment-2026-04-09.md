# 27. Review Workspace Polish Alignment (2026-04-09)

Back to index: [README.md](./README.md)

Related chapters:
- [21-single-screen-review-workspace-brief-2026-04-08.md](./21-single-screen-review-workspace-brief-2026-04-08.md)
- [22-structural-depth-and-toolbar-execution-brief-2026-04-08.md](./22-structural-depth-and-toolbar-execution-brief-2026-04-08.md)
- [24-browser-density-three-round-report-2026-04-08.md](./24-browser-density-three-round-report-2026-04-08.md)

## 27.1 Purpose

This brief rewrites the external resolved workspace plan into repository-valid execution terms.

The external plan is useful as a donor for:

- stronger structural depth
- restrained micro-interaction
- smoother drawer and view transitions

It is not the source of truth for current layout facts.

## 27.2 Current Repo Truth

The following are already true in the tracked source:

- the review workspace is bounded to a viewport-height shell
- the main stage uses internal scrolling instead of page-length growth
- the bottom drawer is a bounded surface with top-level tabs
- the bottom drawer already has a height cap and mutually exclusive sub-tabs

Do not reopen these as if they were missing.

## 27.3 Donor Rules

Keep:

- section-level depth cues on the top dock, main stage, bottom drawer, and bottom toolbar
- small hover and press feedback on controls that benefit scanning and confidence
- cleaner animated state changes between workspace views and drawer zones

Reject or rewrite:

- changing the root shell from `overflow-x-hidden` to `overflow-hidden`
- treating “no page scroll anywhere” as the goal
- reintroducing heavy glassmorphism, glossy glow, or neon-dark styling
- adding decorative-only number popping or other attention-seeking motion

## 27.4 Implementation Direction

For this slice:

- keep the existing layout contract intact
- rebalance depth with luminance, inset highlights, and restrained shadows before adding more color
- keep blur values within the existing small scale
- let the existing primary hue act only as a subtle emphasis layer
- reuse the current Framer Motion and global reduced-motion baseline instead of inventing a second motion system

Expected touchpoints:

- `src/components/ReviewWorkspace.tsx`
- `src/index.css`
- `src/test/ReviewWorkspace.test.tsx`

## 27.5 Verification Standard

Required order:

```bash
npm test -- src/test/ReviewWorkspace.test.tsx
npm run lint
```

Optional expansion after the focused suite is green:

```bash
npm test
npm run build
```

Manual acceptance checks:

1. The shell remains bounded and does not regress into page-level runaway growth.
2. The top toolbar collapse still hides only the context deck.
3. The bottom drawer still reads as a docked secondary plane, not a second page.
4. Hover and transition changes improve legibility without making the UI louder.
5. Reduced-motion behavior still flattens the added transitions.
