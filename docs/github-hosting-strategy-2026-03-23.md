# GitHub Hosting Strategy

Updated: `2026-03-23`

This note explains how `skill-0-GUI` should use GitHub in a way that matches its actual runtime architecture.

## 1. Short Answer

Use GitHub for:

- repository hosting
- pull requests and review
- GitHub Actions CI
- optional release automation

Do not use GitHub Pages for the full application runtime.

## 2. Why GitHub Pages Is Not the Right Primary Host

The current repository exposes runtime endpoints through Vite development middleware and through `server.mjs` in production mode:

- `GET /api/bridge-status`
- `GET /api/example-skill`
- `POST /api/parse-skill`

Those routes require a Node/Express process. GitHub Pages is a static site host and cannot run this server process.

Even when the parser runs in `standalone` mode, the frontend still expects these runtime endpoints to exist.

## 3. Recommended GitHub-Centric Delivery Model

Recommended structure:

1. GitHub repository remains the source of truth
2. GitHub Actions runs `lint`, syntax checks, and production builds
3. Public deployment runs on a Node-capable platform
4. Public deployment sets `SKILL0_MODE=standalone`
5. Public deployment should usually set `VITE_ENABLE_3D=false`

Suitable runtime platforms include:

- Render
- Railway
- Fly.io
- Google Cloud Run
- a self-managed VM or container host

## 4. Deployment Modes

### Internal integration deployment

Use when the host can reach the canonical repository:

- `SKILL0_MODE=auto`
- `SKILL0_PARSER_ROOT=/home/miles/dev2/skill-0`

### Public deployment

Use when the app must be self-contained and must not depend on local filesystem paths:

- `SKILL0_MODE=standalone`
- omit `SKILL0_PARSER_ROOT`
- `VITE_ENABLE_3D=false`

This mode is the correct path for an externally hosted public website.

## 5. GitHub Actions Scope

The repository should treat GitHub Actions as CI and packaging infrastructure.

Recommended baseline checks:

- `npm run lint`
- `npm run build`
- `node --check server.mjs`
- `node --check bridge/skill0Bridge.mjs`

That set validates the deployable runtime shape without pretending GitHub itself is the runtime platform.

## 6. Practical Recommendation

If the goal is to “put it on GitHub,” the technically correct meaning should be:

- code on GitHub
- CI on GitHub Actions
- runtime elsewhere

If the goal is specifically “GitHub Pages,” then the architecture would have to change again so the frontend no longer depends on runtime API routes.

## 7. Review Statement

> `skill-0-GUI` should use GitHub as its source-control and CI platform, but not as the final full-runtime host. The current bridge/standalone architecture requires a Node process for `/api/bridge-status`, `/api/example-skill`, and `/api/parse-skill`. Therefore, the correct public deployment model is GitHub repository plus GitHub Actions for CI, with the application itself hosted on a Node-capable platform and configured with `SKILL0_MODE=standalone` for external use.
