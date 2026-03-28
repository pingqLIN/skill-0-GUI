# Skill-0 Review Studio Documentation Index

Updated: `2026-03-24`

This documentation set is the primary review package for `Skill-0 Review Studio`. It is organized as a main index plus chaptered companion documents so each functional area can be reviewed independently while still mapping back to one master table of contents.

Localized release docs for the public release are indexed at [i18n/README.md](./i18n/README.md).

## Scope Note

This repository now has a restored source-driven frontend baseline in the working tree, but some earlier review notes still discuss the period when only the runtime shell was available. Read the docs with that transition in mind:

1. The current working runtime and source baseline
   This is the actively executable and editable layer in the working tree today. It is centered on:
   - `src/`
   - `vite.config.ts`
   - `server.mjs`
   - `bridge/skill0Bridge.mjs`
   - `standalone/`
   - `dist/` as the build artifact generated from source

2. Historical design-model review context
   Some chapters were written while the source-driven UI was only being inferred from tracked history. Those chapters remain useful for product and rebuild analysis, but the source files are now present again in the working tree:
   - `src/App.tsx`
   - `src/components/*`
   - `src/services/*`
   - `src/i18n.ts`

This dossier documents both layers explicitly and distinguishes between:

- `Current runtime`
- `Tracked design/source model`

## Chapter Map

| Chapter | File | Focus | Key Cross References |
|---|---|---|---|
| 1 | [01-project-overview.md](./01-project-overview.md) | Product purpose, target users, repository scope | Ch. 2, Ch. 3, Ch. 8 |
| 2 | [02-runtime-and-system-architecture.md](./02-runtime-and-system-architecture.md) | Runtime topology, dev/prod paths, component boundaries | Ch. 3, Ch. 4, Ch. 6 |
| 3 | [03-functional-modules.md](./03-functional-modules.md) | End-user functions and operational workflows | Ch. 2, Ch. 4, Ch. 5 |
| 4 | [04-bridge-parser-and-analysis.md](./04-bridge-parser-and-analysis.md) | Parser bridge, fallback parser, transformation logic, analysis behavior | Ch. 2, Ch. 3, Ch. 7 |
| 5 | [05-frontend-workbench.md](./05-frontend-workbench.md) | React workbench design, visualization modules, editor, i18n | Ch. 3, Ch. 7, Ch. 8 |
| 6 | [06-deployment-operations-and-configuration.md](./06-deployment-operations-and-configuration.md) | Scripts, env vars, deployable server, operations guidance | Ch. 2, Ch. 4, Ch. 8 |
| 7 | [07-technology-stack-and-implementation.md](./07-technology-stack-and-implementation.md) | Languages, libraries, implementation choices, dependency rationale | Ch. 4, Ch. 5, Ch. 6 |
| 8 | [08-development-status-risks-and-roadmap.md](./08-development-status-risks-and-roadmap.md) | Delivery status, constraints, risks, next steps | Ch. 1, Ch. 5, Ch. 6 |
| 9 | [09-complex-skill-analysis-spec.md](./09-complex-skill-analysis-spec.md) | Resource-aware analysis flow for main skills, subskills, and command references | Ch. 4, Ch. 8, Ch. 10 |
| 10 | [10-complex-skill-risk-schema.md](./10-complex-skill-risk-schema.md) | Risk categories, severity/confidence model, ranking contract | Ch. 4, Ch. 9, Ch. 11 |
| 11 | [11-evidence-based-warning-template.md](./11-evidence-based-warning-template.md) | Evidence-backed warning language, reminder patterns, output style | Ch. 3, Ch. 9, Ch. 10 |
| 12 | [12-ui-design-review-2026-03-23.md](./12-ui-design-review-2026-03-23.md) | UI quality review for the tracked workbench design model | Ch. 5, Ch. 8, Ch. 13 |
| 13 | [13-ui-rebuild-backlog.md](./13-ui-rebuild-backlog.md) | Execution-oriented rebuild backlog for restoring the workbench UI | Ch. 5, Ch. 8, Ch. 12 |
| 14 | [14-ui-and-remaining-development-plan-2026-03-24.md](./14-ui-and-remaining-development-plan-2026-03-24.md) | Integrated development plan for UI recovery and remaining engineering work | Ch. 8, Ch. 12, Ch. 13 |
| 15 | [15-milestone-issue-list-2026-03-24.md](./15-milestone-issue-list-2026-03-24.md) | Issue-ready milestone list derived from the development plan | Ch. 13, Ch. 14 |

## Fast Reading Paths

### For external reviewers

Read in this order:

1. [01-project-overview.md](./01-project-overview.md)
2. [02-runtime-and-system-architecture.md](./02-runtime-and-system-architecture.md)
3. [03-functional-modules.md](./03-functional-modules.md)
4. [08-development-status-risks-and-roadmap.md](./08-development-status-risks-and-roadmap.md)
5. [09-complex-skill-analysis-spec.md](./09-complex-skill-analysis-spec.md)
6. [10-complex-skill-risk-schema.md](./10-complex-skill-risk-schema.md)
7. [11-evidence-based-warning-template.md](./11-evidence-based-warning-template.md)
8. [12-ui-design-review-2026-03-23.md](./12-ui-design-review-2026-03-23.md)
9. [14-ui-and-remaining-development-plan-2026-03-24.md](./14-ui-and-remaining-development-plan-2026-03-24.md)
10. [15-milestone-issue-list-2026-03-24.md](./15-milestone-issue-list-2026-03-24.md)

### For engineers

Read in this order:

1. [02-runtime-and-system-architecture.md](./02-runtime-and-system-architecture.md)
2. [04-bridge-parser-and-analysis.md](./04-bridge-parser-and-analysis.md)
3. [05-frontend-workbench.md](./05-frontend-workbench.md)
4. [07-technology-stack-and-implementation.md](./07-technology-stack-and-implementation.md)
5. [09-complex-skill-analysis-spec.md](./09-complex-skill-analysis-spec.md)
6. [10-complex-skill-risk-schema.md](./10-complex-skill-risk-schema.md)
7. [12-ui-design-review-2026-03-23.md](./12-ui-design-review-2026-03-23.md)
8. [13-ui-rebuild-backlog.md](./13-ui-rebuild-backlog.md)
9. [14-ui-and-remaining-development-plan-2026-03-24.md](./14-ui-and-remaining-development-plan-2026-03-24.md)
10. [15-milestone-issue-list-2026-03-24.md](./15-milestone-issue-list-2026-03-24.md)

### For operators and deployers

Read in this order:

1. [06-deployment-operations-and-configuration.md](./06-deployment-operations-and-configuration.md)
2. [08-development-status-risks-and-roadmap.md](./08-development-status-risks-and-roadmap.md)
3. [09-complex-skill-analysis-spec.md](./09-complex-skill-analysis-spec.md)
4. [10-complex-skill-risk-schema.md](./10-complex-skill-risk-schema.md)

Supplemental note:

- [github-hosting-strategy-2026-03-23.md](./github-hosting-strategy-2026-03-23.md)

## Shared Contract Documents

The following files are mirrored from the canonical shared-doc source in `skill-0/docs/shared/`:

- [shared/README.md](./shared/README.md)
- [shared/01-parser-contract.md](./shared/01-parser-contract.md)
- [shared/02-mode-and-equivalence-contract.md](./shared/02-mode-and-equivalence-contract.md)
- [shared/03-shared-terminology.md](./shared/03-shared-terminology.md)
- [shared/04-cross-repo-session-rules.md](./shared/04-cross-repo-session-rules.md)

Refresh them by running:

```bash
npm run docs:sync
```

## Canonical File Map

### Current runtime and source baseline

- [../src/main.tsx](../src/main.tsx)
- [../src/App.tsx](../src/App.tsx)
- [../vite.config.ts](../vite.config.ts)
- [../server.mjs](../server.mjs)
- [../bridge/skill0Bridge.mjs](../bridge/skill0Bridge.mjs)
- [../standalone/example-skill.md](../standalone/example-skill.md)
- [../standalone/skill-decomposition.schema.json](../standalone/skill-decomposition.schema.json)
- [../package.json](../package.json)
- [../.env.example](../.env.example)

### Source model reference

- `src/main.tsx`
- `src/App.tsx`
- `src/components/Dashboard.tsx`
- `src/components/Flowchart.tsx`
- `src/components/PhaseDetails.tsx`
- `src/components/DecompositionBoard.tsx`
- `src/components/SecurityMatrix.tsx`
- `src/components/VectorSpace.tsx`
- `src/components/SideEditor.tsx`
- `src/services/parserBridgeService.ts`
- `src/services/geminiService.ts`
- `src/services/skillScanner.ts`
- `src/services/staticAnalyzerService.ts`
- `src/types/intake.ts`
- `src/i18n.ts`

## Relationship to Earlier Single-File Report

The earlier summary file [project-introduction-and-development-report-2026-03-23.md](./project-introduction-and-development-report-2026-03-23.md) is retained as a short-form entry note. This index and its chapter set are now the detailed review package.

## Analysis Extension Set

The analysis-method extension set for complex skills is:

1. [09-complex-skill-analysis-spec.md](./09-complex-skill-analysis-spec.md)
2. [10-complex-skill-risk-schema.md](./10-complex-skill-risk-schema.md)
3. [11-evidence-based-warning-template.md](./11-evidence-based-warning-template.md)

These chapters define how the project should analyze multi-skill graphs under constrained compute, how findings are ranked, and how warnings are rendered into review-ready language.

## UI Recovery Set

The UI recovery set for the tracked workbench model is:

1. [12-ui-design-review-2026-03-23.md](./12-ui-design-review-2026-03-23.md)
2. [13-ui-rebuild-backlog.md](./13-ui-rebuild-backlog.md)
3. [14-ui-and-remaining-development-plan-2026-03-24.md](./14-ui-and-remaining-development-plan-2026-03-24.md)
4. [15-milestone-issue-list-2026-03-24.md](./15-milestone-issue-list-2026-03-24.md)

These chapters distinguish design-model quality findings from runtime status, and translate the review into an execution order for continuing to harden the restored source-driven UI.
