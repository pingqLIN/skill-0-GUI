# Skill-0 Review Studio デプロイ説明

## 公開デプロイ設定

- `SKILL0_MODE=standalone`
- `VITE_ENABLE_3D=false`
- `PORT=4173` またはプラットフォーム指定ポート

## ビルドと起動

1. `npm install`
2. `npm run build`
3. `npm start`

## Runtime ルート

- `GET /api/bridge-status`
- `GET /api/example-skill`
- `POST /api/parse-skill`

## リリース前チェック

- 公開名称が `Skill-0 Review Studio` に統一されている
- standalone mode が有効
- 公開 build で 3D が無効
- アップロード、解析、結果表示、エクスポートを手動で smoke test 済み
