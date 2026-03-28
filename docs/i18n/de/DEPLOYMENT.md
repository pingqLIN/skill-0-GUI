# Skill-0 Review Studio Deployment

## Oeffentliches Deployment-Profil

- `SKILL0_MODE=standalone`
- `VITE_ENABLE_3D=false`
- `PORT=4173` oder ein von der Plattform vorgegebener Port

## Build und Start

1. `npm install`
2. `npm run build`
3. `npm start`

## Runtime-Routen

- `GET /api/bridge-status`
- `GET /api/example-skill`
- `POST /api/parse-skill`

## Release-Checkliste

- Branding ist auf `Skill-0 Review Studio` vereinheitlicht
- Standalone-Modus ist aktiv
- 3D ist im Public Build deaktiviert
- Upload, Analyse, Ergebnisanzeige und Export wurden manuell getestet
