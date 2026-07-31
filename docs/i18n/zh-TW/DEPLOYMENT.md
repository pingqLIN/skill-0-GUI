# Skill-0 Review Studio 部署說明

英文權威版本：[../en/DEPLOYMENT.md](../en/DEPLOYMENT.md)

## 公開部署設定

```text
SKILL0_MODE=standalone
VITE_ENABLE_3D=false
```

- 省略 `SKILL0_PARSER_ROOT` 與 `SKILL0_ROOT`
- 使用平台提供的 `PORT`；本機正式環境預設為 `4173`
- 只有在已核准伺服器端供應商完成設定時，才啟用 `SKILL0_LLM_MODE=fallback`
- 絕不可透過 `VITE_*` 變數公開供應商金鑰

## 建置與啟動

```bash
npm ci
npm run build:public
npm start
```

開發伺服器使用不同流程：

```bash
npm run dev
```

預設位址為 <http://127.0.0.1:5173>；可使用 `VITE_PORT` 覆寫連接埠。

## 執行環境檢查

至少確認：

```text
GET /healthz
GET /api/bridge-status
GET /api/example-skill
POST /api/parse-skill
```

`/api/bridge-status` 必須回報預期模式；公開版不得顯示私人標準解析器
（canonical parser）路徑。

## 發版檢查清單

- [ ] 產品名稱為 `Skill-0 Review Studio`。
- [ ] 執行環境明確使用 `standalone` 模式。
- [ ] 公開版建置已排除可選的 3D vendor chunk。
- [ ] 用戶端建置不含 canonical parser 根目錄或供應商機密。
- [ ] 已冒煙測試匯入、分析、阻擋問題、審查決策與匯出門檻。
- [ ] `standalone` 與 `llm-assisted` 信任用語保持可見。
- [ ] 瀏覽器本機草稿未被描述成伺服器端持久化。

完整說明請見[部署與設定章節](../../06-deployment-operations-and-configuration.md)。
