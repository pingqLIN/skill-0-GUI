# Skill-0 Review Studio Deployment

## Public deployment profile

- `SKILL0_MODE=standalone`
- `VITE_ENABLE_3D=false`
- `PORT=4173` or platform-provided port

## Build and run

1. `npm install`
2. `npm run build`
3. `npm start`

## Runtime routes

- `GET /api/bridge-status`
- `GET /api/example-skill`
- `POST /api/parse-skill`

## Release checklist

- confirm branding uses `Skill-0 Review Studio`
- confirm standalone mode is active
- confirm 3D is disabled in the public build
- smoke-test upload, analyze, result rendering, and export
