<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Skill-0 Review Studio

`Skill-0 Review Studio` is a review-first workspace for Skill-0 parser output. It supports two operating modes:

- Primary bridge mode: call the canonical parser from `/home/miles/dev2/skill-0`
- Standalone mode: use the bundled fallback parser and example skill when the main repository is unavailable

The project is prepared for public web deployment through `server.mjs`, instead of depending only on Vite dev middleware.

Current engineering baseline:

- source-driven Vite frontend restored
- parser mode badge shown in the workspace
- automated coverage for bridge services, bridge internals, Express routes, and live API integration
- lazy-loaded workbench modules to reduce first-load bundle pressure
- `VectorSpace` rebuilt into a map-first review surface with optional on-demand 3D loading

Current delivery status:

- `npm run build` completes successfully for the main internal build
- `npm test` passes across the current Vitest suite
- `npm run build:public` remains the recommended public profile because it disables the optional 3D workspace
- GitHub Actions CI is configured to run `node --check`, `npm run lint`, `npm run docs:check`, `npm test`, and `npm run build`

Core release docs and translations:

- [docs/i18n/README.md](docs/i18n/README.md)

## Local Development

Prerequisites: Node.js 20+.

1. Install dependencies with `npm install`
2. Copy `.env.example` to `.env.local` if you want to override `SKILL0_PARSER_ROOT`, `PORT`, or `SKILL0_MODE`
3. Start the dev server with `npm run dev`
4. Open `http://localhost:3000/`

Useful frontend flag:

- `VITE_ENABLE_3D=true` keeps the optional 3D vector workspace available
- `VITE_ENABLE_3D=false` removes the 3D entry and keeps only the lightweight review map

## Public Web / Production Mode

1. Run `npm run build` for a full internal build, or `npm run build:public` for the public no-3D build
2. Run `npm start`
3. Open `http://localhost:4173/` or the host/port provided by your deployment platform

`server.mjs` serves the frontend and exposes the same API routes used during local development:

- `GET /api/bridge-status`
- `GET /api/example-skill`
- `POST /api/parse-skill`

## Demo Strategy

Recommended public release profile:

- `SKILL0_MODE=standalone`
- `VITE_ENABLE_3D=false`
- `npm run build:public`

This is the preferred external-review profile when the goal is to demonstrate the parser workflow, review surface, and fallback behavior with the lowest operational cost.

When a server-side online demo is not necessary:

- the goal is UI and workflow review
- standalone parser output is sufficient
- no shared persistence is required
- no canonical `skill-0` runtime proof is required

When a server-side online demo becomes necessary:

- canonical parser behavior must be demonstrated live
- multiple reviewers need a shared hosted environment
- edits must be saved beyond the current browser session
- uploads, drafts, or review history need persistent storage

Current recommendation:

- do not prioritize a full product-style server demo yet
- prioritize the lighter public demo profile first
- only add a fuller server demo when review goals expand from presentation to real multi-user or persistent usage

## Bridge Resolution Order

The primary parser root is resolved in this order:

1. `SKILL0_PARSER_ROOT`
2. `SKILL0_ROOT` (backward-compatible alias)
3. `/home/miles/dev2/skill-0`
4. `/home/miles/dev/projects/skill-0`

If none of these locations contains `scripts/auto_parse.py`, the app switches to standalone mode automatically.

For external deployments, set `SKILL0_MODE=standalone` so the website does not probe local filesystem paths and always uses the bundled parser.

For public builds, also set `VITE_ENABLE_3D=false` unless the deployment explicitly needs the interactive 3D workspace.

## Verification

Use these commands to validate a change locally before pushing:

- `npm run lint`
- `npm test`
- `npm run build`
- `npm run build:public`
- `npm run docs:check`
- `node --check server.mjs`
- `node --check bridge/skill0Bridge.mjs`

Known limits to keep in mind:

- standalone mode is compatible with canonical output, but it is not identical to the canonical `skill-0` parser
- the optional 3D workspace still creates a large secondary bundle, so public builds should keep `VITE_ENABLE_3D=false`
- mirrored shared docs must stay in sync with `skill-0/docs/shared/` and are checked by CI

## GitHub Strategy

`Skill-0 Review Studio` should use GitHub as its source-control and CI control plane, not as the final full-runtime host.

- GitHub Actions: good fit for `lint`, `build`, and release automation
- GitHub Pages: not suitable for the full app because this runtime requires Node/Express API routes
- Recommended public deployment: external Node host running `npm start` with `SKILL0_MODE=standalone`

Recommended public-build profile:

- `SKILL0_MODE=standalone`
- `VITE_ENABLE_3D=false`

A dedicated hosting strategy note is available at [docs/github-hosting-strategy-2026-03-23.md](docs/github-hosting-strategy-2026-03-23.md).

## Shared documentation with `skill-0`

Shared contract documents should not be manually duplicated across repos.

This repository mirrors stable shared docs from `skill-0/docs/shared/` into `docs/shared/`.
Refresh them with:

```bash
npm run docs:sync
```

Keep only cross-repository contracts shared. Product status, deployment notes, and roadmap documents remain repository-specific.

## Notes

- `vite.config.ts` handles development-time routing.
- `server.mjs` provides the deployable runtime for external web hosting.
- local development now runs from `src/main.tsx`; production runtime serves the built frontend from `dist/`.
- current editing is session-local and export-based. The app can modify parsed data in memory and download a regenerated `.skill.md`, but it does not yet persist edits back to a server, database, or repository.
- A detailed project introduction and development report is available at [docs/project-introduction-and-development-report-2026-03-23.md](docs/project-introduction-and-development-report-2026-03-23.md).
