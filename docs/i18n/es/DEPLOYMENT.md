# Skill-0 Review Studio Despliegue

## Perfil de despliegue publico

- `SKILL0_MODE=standalone`
- `VITE_ENABLE_3D=false`
- `PORT=4173` o el puerto definido por la plataforma

## Construccion y arranque

1. `npm install`
2. `npm run build`
3. `npm start`

## Rutas runtime

- `GET /api/bridge-status`
- `GET /api/example-skill`
- `POST /api/parse-skill`

## Checklist de release

- el branding usa `Skill-0 Review Studio`
- el modo standalone esta activo
- 3D esta deshabilitado en el build publico
- se hicieron smoke tests manuales de carga, analisis, resultado y exportacion
