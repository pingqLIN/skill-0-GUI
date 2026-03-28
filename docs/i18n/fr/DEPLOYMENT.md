# Skill-0 Review Studio Deploiement

## Profil de deploiement public

- `SKILL0_MODE=standalone`
- `VITE_ENABLE_3D=false`
- `PORT=4173` ou port fourni par la plateforme

## Construire et lancer

1. `npm install`
2. `npm run build`
3. `npm start`

## Routes runtime

- `GET /api/bridge-status`
- `GET /api/example-skill`
- `POST /api/parse-skill`

## Checklist de release

- le branding utilise `Skill-0 Review Studio`
- le mode standalone est actif
- la 3D est desactivee dans le build public
- upload, analyse, rendu du resultat et export sont verifies manuellement
