# Skill-0 Review Studio 部署说明

## 公开部署设置

- `SKILL0_MODE=standalone`
- `VITE_ENABLE_3D=false`
- `PORT=4173` 或平台提供的端口

## 构建与启动

1. `npm install`
2. `npm run build`
3. `npm start`

## Runtime 路由

- `GET /api/bridge-status`
- `GET /api/example-skill`
- `POST /api/parse-skill`

## 发布前确认

- 对外名称已统一为 `Skill-0 Review Studio`
- 已确认 standalone mode 启用
- 已确认公开 build 关闭 3D
- 已手动 smoke test 上传、分析、结果展示与导出流程
