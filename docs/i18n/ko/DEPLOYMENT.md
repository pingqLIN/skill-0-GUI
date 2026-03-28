# Skill-0 Review Studio 배포 설명

## 공개 배포 프로필

- `SKILL0_MODE=standalone`
- `VITE_ENABLE_3D=false`
- `PORT=4173` 또는 플랫폼 제공 포트

## 빌드 및 실행

1. `npm install`
2. `npm run build`
3. `npm start`

## Runtime 경로

- `GET /api/bridge-status`
- `GET /api/example-skill`
- `POST /api/parse-skill`

## 릴리스 체크리스트

- 대외 명칭이 `Skill-0 Review Studio` 로 통일됨
- standalone mode 가 활성화됨
- 공개 build 에서 3D 가 비활성화됨
- 업로드, 분석, 결과 렌더링, export 를 수동 smoke test 완료
