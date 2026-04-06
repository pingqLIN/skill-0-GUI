# Chapter 6. Deployment, Operations, and Configuration

Back to index: [README.md](./README.md)

Related chapters:
- [02-runtime-and-system-architecture.md](./02-runtime-and-system-architecture.md)
- [04-bridge-parser-and-analysis.md](./04-bridge-parser-and-analysis.md)
- [08-development-status-risks-and-roadmap.md](./08-development-status-risks-and-roadmap.md)
- [13-ui-rebuild-backlog.md](./13-ui-rebuild-backlog.md)

## 6.1 Scripts

Defined in [../package.json](../package.json):

- `npm run dev`
  Starts the Vite development server on port `3000`.

- `npm run build`
  Builds the frontend bundle.

- `npm run preview`
  Runs Vite preview.

- `npm start`
  Starts the deployable Node/Express server in `server.mjs`.

- `npm run clean`
  Removes `dist/`.

- `npm run lint`
  Runs TypeScript no-emit checking.

- `npm run build:public`
  Builds the deployable public profile with `VITE_ENABLE_3D=false`.

- `npm run verify:public-build`
  Verifies the public-build output profile.

## 6.2 Environment Variables

Defined or documented in [../.env.example](../.env.example):

- `APP_URL`
  App-hosting URL variable.

- `PORT`
  Runtime port for `server.mjs`.

- `SKILL0_MODE`
  `auto` or `standalone`.

- `SKILL0_PARSER_ROOT`
  Preferred explicit root for canonical `skill-0` parser bridge.

- `SKILL0_ROOT`
  Backward-compatible alias for `SKILL0_PARSER_ROOT`.

- `VITE_ENABLE_3D`
  Build-time flag for the optional 3D vector workspace. Set to `false` for lighter public builds.

- `SKILL0_API_BODY_LIMIT`
  Optional JSON payload limit for uploaded review bundles.

- `SKILL0_REQUEST_TIMEOUT_MS`
  End-to-end timeout for a single parse request.

- `SKILL0_LLM_MODE`
  `disabled` or `fallback` for the server-side recovery adapter.

- `SKILL0_LLM_PROVIDER`
  Provider-neutral selector for the LLM recovery adapter.

- `SKILL0_LLM_MODEL`
  Optional model override for the LLM recovery adapter.

- `SKILL0_LLM_API_KEY`
  Server-side secret for the recovery adapter.

- `SKILL0_LLM_TIMEOUT_MS`
  Provider timeout for the recovery adapter.

- `SKILL0_LLM_MAX_INPUT_CHARS`
  Prompt-budget guardrail for recovery requests.

## 6.3 Recommended Deployment Modes

### Internal integration deployment

Use when the deployment environment has local access to the canonical repository.

Recommended:

- `SKILL0_MODE=auto`
- `SKILL0_PARSER_ROOT=/home/miles/dev2/skill-0`
- `VITE_ENABLE_3D=true`

### External or public deployment

Use when the website must be self-contained.

Recommended:

- `SKILL0_MODE=standalone`
- `SKILL0_LLM_MODE=fallback`
- omit `SKILL0_PARSER_ROOT`
- `VITE_ENABLE_3D=false`

This prevents filesystem assumptions about `/home/miles/...`.

### Render-first public deployment

This repository now includes a Render Blueprint in [../render.yaml](../render.yaml).

Recommended first hosted profile:

- `SKILL0_MODE=standalone`
- `SKILL0_LLM_MODE=fallback`
- omit `SKILL0_PARSER_ROOT`
- omit `SKILL0_ROOT`
- `VITE_ENABLE_3D=false`
- `npm ci && npm run build:public`
- `npm start`

Operational intent:

- keep the first public deployment self-contained
- do not vendor canonical parser source into this repository in this phase
- reserve canonical parser bridging for controlled internal environments
- allow a server-side `llm-assisted` recovery path for unknown or future formats when a provider is configured
- keep `llm-assisted` output draft-only and never present it as final equivalence evidence

## 6.4 GitHub Platform Strategy

GitHub is appropriate for:

- repository hosting
- pull requests and code review
- GitHub Actions CI
- optional release artifact automation

GitHub Pages is not appropriate for the full runtime because this project depends on Node/Express API routes such as `/api/parse-skill`.

Recommended GitHub-facing production pattern:

- GitHub repository as source of truth
- GitHub Actions for `lint` and `build`
- GitHub Actions workflow also runs `node --check`, `npm run docs:check`, and `npm test`
- external Node-capable host for `npm start`
- `SKILL0_MODE=standalone` for public deployments
- `VITE_ENABLE_3D=false` for public builds unless the 3D view is a deliberate product requirement

## 6.5 Operational Endpoints

Runtime endpoints:

- `GET /healthz`
- `GET /api/bridge-status`
- `GET /api/example-skill`
- `POST /api/parse-skill`
- `POST /api/resolve-skill-url`

These endpoints behave consistently in:

- Vite development mode
- Express production mode

## 6.6 Static Delivery

The current deployable server serves:

- `dist/` as static frontend assets
- `dist/index.html` as the app entry for catch-all routes

This makes the project hostable as a single web process.

## 6.7 Persistence Posture

Public hosting should assume ephemeral server storage.

Recommended stance:

- do not rely on uploaded files remaining on disk after restart
- do not rely on server-local draft or session history
- keep draft persistence browser-local unless a later server-backed persistence layer is added explicitly

This is especially important for Render Free, where the service can spin down and restart.

## 6.8 Render Free Validation Checklist

Before calling the deployment acceptable, verify all of the following on Render Free:

- the service builds from a clean clone using `render.yaml`
- the site loads without boot errors
- `GET /healthz` returns `ok: true`
- `GET /api/bridge-status` reports standalone mode
- `GET /api/bridge-status` also shows whether `llm-assisted` fallback is available
- `GET /api/example-skill` returns the bundled sample
- paste intake parses successfully through `POST /api/parse-skill`
- skill URL import succeeds for a supported remote source or fails with a clear user-facing explanation
- sample scenarios still produce coherent review flows
- review summary, sign-off, and export actions remain available end to end
- the app still recovers cleanly after a cold start

## 6.9 Render Starter Upgrade Path

After Render Free validation is complete:

1. change the service instance type from `free` to `starter`
2. keep the same build and start commands
3. keep `SKILL0_MODE=standalone` as the public default
4. add `SKILL0_PARSER_ROOT` only for a separate internal deployment that intentionally exposes canonical parser behavior
5. add persistent disk only if a later feature truly requires server-retained files

This keeps the first public deployment simple while leaving room for a stricter internal profile later.

## 6.10 Validation Performed

The following verification was completed during this update:

- `npm run lint`
- `node --check server.mjs`
- `node --check bridge/skill0Bridge.mjs`
- `npm run docs:check`
- `npm test`
- `npm run build`
- `npm run dev`
- development endpoint validation on port `3000`
- `npm start`
- production endpoint validation on port `4173`
- forced standalone validation with `SKILL0_MODE=standalone` on port `4174`

Validated outcomes:

- canonical bridge mode resolves `/home/miles/dev2/skill-0`
- example skill loads from canonical repo when available
- parser requests succeed through canonical `auto_parse.py`
- standalone mode returns bundled sample and fallback parser output
- public standalone deployments can expose a server-side `llm-assisted` recovery capability without exposing canonical parser roots

## 6.11 CI Workflow

The repository includes a GitHub Actions workflow at [../.github/workflows/ci.yml](../.github/workflows/ci.yml).

It runs on:

- push to `main`
- pull requests
- manual `workflow_dispatch`

It currently validates:

- runtime entrypoints with `node --check`
- TypeScript with `npm run lint`
- mirrored docs with `npm run docs:check`
- tests with `npm test`
- production build with `npm run build`

## 6.12 Operational Caveat

The deployable runtime is ready, and the source-driven frontend baseline is now restored in the working tree. Operationally, this means:

- deployment is possible
- runtime verification is possible
- ongoing UI maintenance can now happen in source, but still needs further hardening
- public deployments can remove the 3D vector workspace without affecting parser, bridge, or review-map functionality

## 6.13 Recommended Operator Checklist

1. Decide whether deployment should be canonical-bridge or standalone.
2. Set `SKILL0_MODE` explicitly.
3. If canonical mode is required, set `SKILL0_PARSER_ROOT` explicitly.
4. Build and serve `dist/`.
5. Smoke-test `/healthz` plus all API endpoints.
6. Record whether results are coming from canonical or fallback mode.
7. Decide whether the deployment should expose the optional 3D vector workspace; default public posture is `VITE_ENABLE_3D=false`.
