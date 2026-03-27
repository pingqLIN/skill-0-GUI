# Chapter 6. Deployment, Operations, and Configuration

Back to index: [README.md](./README.md)

Related chapters:
- [02-runtime-and-system-architecture.md](./02-runtime-and-system-architecture.md)
- [04-bridge-parser-and-analysis.md](./04-bridge-parser-and-analysis.md)
- [08-development-status-risks-and-roadmap.md](./08-development-status-risks-and-roadmap.md)

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
- omit `SKILL0_PARSER_ROOT`
- `VITE_ENABLE_3D=false`

This prevents filesystem assumptions about `/home/miles/...`.

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

- `GET /api/bridge-status`
- `GET /api/example-skill`
- `POST /api/parse-skill`

These endpoints behave consistently in:

- Vite development mode
- Express production mode

## 6.6 Static Delivery

The current deployable server serves:

- `dist/` as static frontend assets
- `dist/index.html` as the app entry for catch-all routes

This makes the project hostable as a single web process.

## 6.7 Validation Performed

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

## 6.8 CI Workflow

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

## 6.9 Operational Caveat

The deployable runtime is ready, and the source-driven frontend baseline is now restored in the working tree. Operationally, this means:

- deployment is possible
- runtime verification is possible
- ongoing UI maintenance can now happen in source, but still needs further hardening
- public deployments can remove the 3D vector workspace without affecting parser, bridge, or review-map functionality

## 6.10 Recommended Operator Checklist

1. Decide whether deployment should be canonical-bridge or standalone.
2. Set `SKILL0_MODE` explicitly.
3. If canonical mode is required, set `SKILL0_PARSER_ROOT` explicitly.
4. Build and serve `dist/`.
5. Smoke-test all three API endpoints.
6. Record whether results are coming from canonical or fallback mode.
7. Decide whether the deployment should expose the optional 3D vector workspace; default public posture is `VITE_ENABLE_3D=false`.
