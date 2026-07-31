# Skill-0 Review Studio Deployment

Traditional Chinese companion: [../zh-TW/DEPLOYMENT.md](../zh-TW/DEPLOYMENT.md)

## Public deployment profile

```text
SKILL0_MODE=standalone
VITE_ENABLE_3D=false
```

- omit `SKILL0_PARSER_ROOT` and `SKILL0_ROOT`
- use the platform-provided `PORT`; the local production default is `4173`
- enable `SKILL0_LLM_MODE=fallback` only when an approved server-side provider
  is configured
- never expose provider keys through `VITE_*` variables

## Build and run

```bash
npm ci
npm run build:public
npm start
```

The development server is separate:

```bash
npm run dev
```

It defaults to <http://127.0.0.1:5173>; `VITE_PORT` overrides the port.

## Runtime checks

Confirm at minimum:

```text
GET /healthz
GET /api/bridge-status
GET /api/example-skill
POST /api/parse-skill
```

`/api/bridge-status` must report the intended mode without exposing a private
canonical-parser path in a public profile.

## Release checklist

- [ ] Product name is `Skill-0 Review Studio`.
- [ ] Runtime mode is explicitly `standalone`.
- [ ] The public build excludes the optional 3D vendor surface.
- [ ] No canonical parser root or provider secret is present in the client build.
- [ ] Intake, analysis, blocking issues, review decision, and gated export are smoke-tested.
- [ ] Standalone and LLM-assisted trust wording remains visible.
- [ ] Browser-local draft behavior is not described as server persistence.

See the full [deployment and configuration chapter](../../06-deployment-operations-and-configuration.md).
