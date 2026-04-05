# Skill-0 Review Studio

Review-first tooling for inspecting, validating, annotating, and signing off on Skill-0 parser output.

`Skill-0 Review Studio` sits between parser execution and final reviewer approval. It gives reviewers one place to:

- load a `SKILL.md`, SkillDocument JSON, or bundled review context
- switch between canonical bridge mode and standalone fallback mode
- inspect validation, consistency, and path-walk results
- capture reviewer notes, review status, decision log, summary, and sign-off
- complete explicit sign-off gates before external review
- export a dedicated review report plus `.skill.md` / `.json`

## Why This Project Exists

Raw parser output is useful, but it is not the same thing as a review workflow.

This project focuses on the missing layer:

- make parser mode visible
- keep fidelity and equivalence wording honest
- let reviewers record decisions instead of relying on screenshots or memory
- produce exportable artifacts that are still understandable outside the UI

If you need the parser itself, see the upstream `skill-0` repository.
If you need the reviewer-facing workspace around that parser output, this repository is the right entry point.

## Current Rebuild Direction

The active rebuild tracks two constraints at the same time:

- reuse the strongest layout and visual ideas from the Stitch exploration as a style donor
- keep the real product contract intact: `intake -> analysis -> review -> export`

What that means in practice:

- Stitch output informs tone, grouping, and density decisions
- the React app remains the source of truth for workflow, parser-mode wording, checks, sign-off, and exports
- generic analytics cockpit patterns are intentionally rejected when they conflict with reviewer workflows

## What You Can Do Today

### For first-time users

- paste a skill draft directly into the intake panel
- import a SkillDocument JSON without calling the bridge
- load a bundle with one primary skill file plus supporting context files
- restore your last local draft automatically after reload

### For reviewers

- inspect parser mode and review guidance
- run validation, consistency, and path-walk checks
- add session notes and element-level notes
- review the before/after diff summary
- set review status: `draft`, `in review`, `changes requested`, `approved`
- record reviewer summary and sign-off name
- complete sign-off gates before external review
- export a dedicated review report

### For operators

- run with the canonical local `skill-0` parser when available
- run in standalone mode for self-contained demos or public deployment
- disable the optional 3D surface for lighter public builds

## Quick Start

Prerequisites:

- Node.js 20+

Install and run:

```bash
npm install
npm run dev
```

Then open:

- `http://localhost:3000/`

If you only want the deployable runtime:

```bash
npm run build
npm start
```

## Two Runtime Modes

### Canonical mode

The app calls the real `skill-0` parser through the local bridge. Use this when you want the strongest review confidence.

### Standalone mode

The app uses the bundled fallback parser. Use this for demos, lightweight review, or external hosting where the local `skill-0` repository is not available.

Important: standalone mode is compatibility-oriented. It should not be presented as strict canonical equivalence unless separate evidence exists.

Advanced contract:

- [Mode and equivalence contract](docs/shared/02-mode-and-equivalence-contract.md)
- [Parser contract](docs/shared/01-parser-contract.md)

## New User Path

If you are new to the project, read in this order:

1. this README
2. [Documentation index](docs/README.md)
3. [Project overview](docs/01-project-overview.md)
4. [Functional modules](docs/03-functional-modules.md)
5. [Frontend workbench](docs/05-frontend-workbench.md)

If you want to understand deployment and hosting:

1. [Deployment, operations, and configuration](docs/06-deployment-operations-and-configuration.md)
2. [GitHub hosting strategy](docs/github-hosting-strategy-2026-03-23.md)
3. [Online demo plan](docs/20-online-demo-plan-2026-04-03.md)
4. [UI rebuild backlog](docs/13-ui-rebuild-backlog.md)

If you want the current execution status:

1. [Late-stage development plan](docs/17-late-stage-development-plan-2026-03-28.md)
2. [MVP execution plan](docs/18-mvp-execution-plan-2026-03-28.md)
3. [MVP consistency and next execution brief](docs/19-mvp-consistency-and-next-execution-brief-2026-03-28.md)

## Common Commands

Development:

```bash
npm run dev
```

Verification:

```bash
npm run lint
npm test
npm run docs:check
```

Builds:

```bash
npm run build
npm run build:public
npm run verify:build-size
npm run verify:public-build
```

Shared docs:

```bash
npm run docs:sync
npm run docs:check
```

## Environment Variables

Most users can start with defaults. These are the main variables when you need more control:

- `SKILL0_MODE`
- `SKILL0_PARSER_ROOT`
- `SKILL0_ROOT`
- `SKILL0_API_BODY_LIMIT`
- `PORT`
- `VITE_ENABLE_3D`

For detailed runtime behavior, see:

- [Deployment, operations, and configuration](docs/06-deployment-operations-and-configuration.md)
- [Bridge parser and analysis](docs/04-bridge-parser-and-analysis.md)

## Render Deployment

The first hosted profile is intentionally conservative:

- use a Node-capable host
- deploy `server.mjs`, not a static-only export
- run in `SKILL0_MODE=standalone`
- build with `VITE_ENABLE_3D=false`
- do not set `SKILL0_PARSER_ROOT` or `SKILL0_ROOT`

This repository now includes a starter Render Blueprint:

- [render.yaml](render.yaml)

Recommended rollout:

1. validate the standalone public profile on Render Free
2. keep browser-local drafts and treat server storage as ephemeral
3. upgrade to Render Starter only after the standalone review flow is stable

Detailed instructions live in:

- [Deployment, operations, and configuration](docs/06-deployment-operations-and-configuration.md)
- [Online demo plan](docs/20-online-demo-plan-2026-04-03.md)

## Documentation Map

Beginner-friendly:

- [docs/README.md](docs/README.md)
- [docs/01-project-overview.md](docs/01-project-overview.md)
- [docs/03-functional-modules.md](docs/03-functional-modules.md)
- [docs/05-frontend-workbench.md](docs/05-frontend-workbench.md)

Architecture and implementation:

- [docs/02-runtime-and-system-architecture.md](docs/02-runtime-and-system-architecture.md)
- [docs/04-bridge-parser-and-analysis.md](docs/04-bridge-parser-and-analysis.md)
- [docs/07-technology-stack-and-implementation.md](docs/07-technology-stack-and-implementation.md)

Planning and roadmap:

- [docs/16-development-execution-brief-2026-03-28.md](docs/16-development-execution-brief-2026-03-28.md)
- [docs/17-late-stage-development-plan-2026-03-28.md](docs/17-late-stage-development-plan-2026-03-28.md)
- [docs/18-mvp-execution-plan-2026-03-28.md](docs/18-mvp-execution-plan-2026-03-28.md)
- [docs/19-mvp-consistency-and-next-execution-brief-2026-03-28.md](docs/19-mvp-consistency-and-next-execution-brief-2026-03-28.md)
- [docs/20-online-demo-plan-2026-04-03.md](docs/20-online-demo-plan-2026-04-03.md)

Shared contracts:

- [docs/shared/README.md](docs/shared/README.md)
- [docs/shared/02-mode-and-equivalence-contract.md](docs/shared/02-mode-and-equivalence-contract.md)
- [docs/shared/03-shared-terminology.md](docs/shared/03-shared-terminology.md)

## Online Demo Direction

The project is ready for a standalone public demo profile, but the best demo surface still needs product decisions.

The current recommendation is:

- host a public standalone build
- keep parser-mode wording explicit
- disable 3D for the first external demo
- optimize for clear review storytelling, not feature maximalism

Detailed planning lives here:

- [Online demo plan](docs/20-online-demo-plan-2026-04-03.md)

## Current Status

Implemented:

- dedicated review report export
- local draft persistence and reload recovery
- reviewer notes, review status, and decision log
- reviewer summary, sign-off, and explicit sign-off gates
- i18n coverage for the reviewer workflow

Not yet in scope:

- multi-user collaboration
- server-backed persistence
- GitHub PR automation inside the product UI
- strict canonical-equivalence claims without evidence fixtures and repeatable comparison rules

## Security And Trust Notes

- exported artifacts must preserve parser mode and review status context
- standalone mode is useful, but it is not the same as canonical proof
- shared contract docs must stay synchronized with `skill-0`
- transitive dependency overrides in `package.json` are currently used to keep the dependency graph free of known audited vulnerabilities

## Contributing

Before pushing changes, run:

```bash
npm run lint
npm test
npm run docs:check
```

If you update shared contract-facing documentation, also run:

```bash
npm run docs:sync
```
