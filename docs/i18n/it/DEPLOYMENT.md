# Skill-0 Review Studio Deploy

## Profilo di deploy pubblico

- `SKILL0_MODE=standalone`
- `VITE_ENABLE_3D=false`
- `PORT=4173` oppure la porta fornita dalla piattaforma

## Build e avvio

1. `npm install`
2. `npm run build`
3. `npm start`

## Route runtime

- `GET /api/bridge-status`
- `GET /api/example-skill`
- `POST /api/parse-skill`

## Checklist di release

- il branding usa `Skill-0 Review Studio`
- la modalita standalone e attiva
- il 3D e disabilitato nella build pubblica
- upload, analisi, rendering del risultato ed export sono stati verificati manualmente
