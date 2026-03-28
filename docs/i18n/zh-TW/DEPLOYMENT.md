# Skill-0 Review Studio 部署說明

## 公開部署設定

- `SKILL0_MODE=standalone`
- `VITE_ENABLE_3D=false`
- `PORT=4173` 或平台提供的埠號

## 建置與啟動

1. `npm install`
2. `npm run build`
3. `npm start`

## Runtime 路由

- `GET /api/bridge-status`
- `GET /api/example-skill`
- `POST /api/parse-skill`

## 發版前確認

- 對外名稱已統一為 `Skill-0 Review Studio`
- 已確認 standalone mode 啟用
- 已確認公開 build 關閉 3D
- 已手動 smoke test 上傳、分析、結果顯示與匯出流程
