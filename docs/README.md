# Skill-0 Review Studio Documentation

Traditional Chinese companion: [README.zh-tw.md](./README.zh-tw.md)

This hub separates current product guidance from dated planning and review
records. Use the current source, contracts, tests, and latest verified reports
for operational decisions; use older documents for design history.

Last reorganized: `2026-07-31`

## Start by goal

| Goal | Recommended path |
|---|---|
| Understand the product in five minutes | [Root README](../README.md) → [Project overview](01-project-overview.md) |
| Run one complete local review | [Guided local review](getting-started.md) |
| Understand features and reviewer workflows | [Functional modules](03-functional-modules.md) → [Frontend workbench](05-frontend-workbench.md) |
| Integrate the parser or runtime | [Runtime architecture](02-runtime-and-system-architecture.md) → [Bridge parser](04-bridge-parser-and-analysis.md) |
| Configure or deploy the service | [Deployment and configuration](06-deployment-operations-and-configuration.md) |
| Evaluate parser-mode trust | [Mode and equivalence contract](shared/02-mode-and-equivalence-contract.md) |
| Review current delivery evidence | [Task-first hardening integration report](28-task-first-review-hardening-integration-2026-07-29.md) |
| Understand the current UI/UX visual contract | [UI/UX v2 design contract](29-uiux-v2-design-contract-2026-07-31.md) |

## Current product documentation

| Document | Purpose |
|---|---|
| [Guided local review](getting-started.md) | Reproducible, screenshot-backed intake-to-export walkthrough |
| [1. Project overview](01-project-overview.md) | Product purpose, users, and repository boundary |
| [2. Runtime and system architecture](02-runtime-and-system-architecture.md) | Development and production topology |
| [3. Functional modules](03-functional-modules.md) | User-facing capabilities and workflows |
| [4. Bridge parser and analysis](04-bridge-parser-and-analysis.md) | Canonical bridge, standalone parser, and analysis behavior |
| [5. Frontend workbench](05-frontend-workbench.md) | Review UI, editor, visualization, and localization |
| [6. Deployment, operations, and configuration](06-deployment-operations-and-configuration.md) | Scripts, environment variables, endpoints, and hosting |
| [7. Technology stack and implementation](07-technology-stack-and-implementation.md) | Main libraries and implementation choices |
| [8. Development status, risks, and roadmap](08-development-status-risks-and-roadmap.md) | Broader status and risk register; verify dated claims before reuse |
| [9. Complex skill analysis specification](09-complex-skill-analysis-spec.md) | Resource-aware multi-file analysis method |
| [10. Complex skill risk schema](10-complex-skill-risk-schema.md) | Severity, confidence, and prioritization contract |
| [11. Evidence-based warning template](11-evidence-based-warning-template.md) | Review-ready warning language |

The executable authority for current behavior is the repository source and
tests, especially:

- `src/App.tsx`
- `src/components/GuidedIntakeLanding.tsx`
- `src/components/ReviewWorkspace.tsx`
- `bridge/skill0Bridge.mjs`
- `server.mjs`
- `vite.config.ts`
- `e2e/review-studio.spec.ts`
- `.github/workflows/ci.yml`

## Shared trust contracts

The files under `docs/shared/` are managed mirrors from the canonical
`skill-0/docs/shared/` source:

- [Shared contract index](shared/README.md)
- [Parser contract](shared/01-parser-contract.md)
- [Mode and equivalence contract](shared/02-mode-and-equivalence-contract.md)
- [Shared terminology](shared/03-shared-terminology.md)
- [Cross-repository session rules](shared/04-cross-repo-session-rules.md)

Do not edit these mirrors independently. Refresh or verify them with:

```bash
npm run docs:sync
npm run docs:check
```

`docs:check` verifies the shared mirror contract. It does not prove that all
other documentation is current or that translations are semantically equal.

## Current integration evidence

| Report | Evidence boundary |
|---|---|
| [28. Task-first review hardening integration](28-task-first-review-hardening-integration-2026-07-29.md) | Point-in-time integration, CI, browser, and accessibility evidence |
| [28. Traditional Chinese companion](28-task-first-review-hardening-integration-2026-07-29.zh-tw.md) | Human-readable Traditional Chinese companion |
| [29. UI/UX v2 design contract](29-uiux-v2-design-contract-2026-07-31.md) | Implemented workbench shell, responsive behavior, and visual references |
| [27. Review workspace polish alignment](27-review-workspace-polish-alignment-2026-04-09.md) | Bounded visual refinement brief |

Reports record what was verified at their stated date and commit. They are not
automatic proof of the current checkout; rerun the relevant checks.

## Dated design, planning, and review record

These documents preserve product decisions and earlier review loops. Treat
their status, screenshots, commands, and “next step” sections as historical
until current source or execution confirms them.

### UI and delivery planning

- [12. UI design review](12-ui-design-review-2026-03-23.md)
- [13. UI rebuild backlog](13-ui-rebuild-backlog.md)
- [14. UI and remaining development plan](14-ui-and-remaining-development-plan-2026-03-24.md)
- [15. Milestone issue list](15-milestone-issue-list-2026-03-24.md)
- [16. Development execution brief](16-development-execution-brief-2026-03-28.md)
- [17. Late-stage development plan](17-late-stage-development-plan-2026-03-28.md)
- [18. MVP execution plan](18-mvp-execution-plan-2026-03-28.md)
- [19. MVP consistency and next execution brief](19-mvp-consistency-and-next-execution-brief-2026-03-28.md)
- [20. Online demo plan](20-online-demo-plan-2026-04-03.md)

### Browser and editor review loops

- [21. Single-screen review workspace brief](21-single-screen-review-workspace-brief-2026-04-08.md)
- [22. Structural depth and toolbar execution brief](22-structural-depth-and-toolbar-execution-brief-2026-04-08.md)
- [23. Browser density review loop](23-browser-density-review-loop-2026-04-08.md)
- [24. Browser density three-round report](24-browser-density-three-round-report-2026-04-08.md)
- [25. Editor verification loop](25-editor-verification-loop-2026-04-08.md)
- [26. Editor verification three-round report](26-editor-verification-three-round-report-2026-04-08.md)

### Supplemental history

- [Original project introduction and development report](project-introduction-and-development-report-2026-03-23.md)
- [GitHub hosting strategy](github-hosting-strategy-2026-03-23.md)
- `archive/local-planning/` for local planning records
- `stitch/` for design exploration and source-screen references

Stitch assets are design exploration, not proof of the shipped runtime. Use the
screenshots under `assets/readme/` for the current documentation tour; they are
generated from the real application.

## Localized release documentation

The public release set is indexed at [i18n/README.md](i18n/README.md).
English is the publishable authority for that set; Traditional Chinese is the
maintained human-readable companion for this documentation refresh. Other
translations may lag and must be revalidated before release.

## Evidence language

Use these labels in substantial reviews:

- `VERIFIED`: supported by inspected source, authoritative documents, a test
  result, or actual execution output.
- `INFERRED`: a reasoned interpretation based on identified evidence.
- `UNKNOWN`: missing, inaccessible, untested, or otherwise unverified.

Do not promote an older report, a generated screenshot, or a passing narrow test
to broader current verification.

## Contributing and documentation rules

Before merging:

1. Keep the root README focused on value, quick start, product flow, trust
   boundaries, and current entry points.
2. Put detailed implementation and dated planning in this documentation set.
3. Give important new public Markdown an English authority and a
   `.zh-tw.md` Traditional Chinese companion.
4. Preserve commands, paths, filenames, identifiers, mode names, and data
   fields exactly across translations.
5. Do not edit `docs/shared/` mirrors independently.
6. Regenerate product screenshots with built-in demo-safe material:

   ```bash
   npm run docs:capture-screenshots
   ```

7. Run the repository gate:

   ```bash
   npm run lint
   npm test
   npm run docs:check
   npm run verify:build-size
   npm run verify:public-build
   npm run test:e2e
   ```

8. Do not commit secrets, private paths, real customer material, or
   unredacted local runtime evidence.
