# 本機審查操作導覽

英文權威版本：[getting-started.md](./getting-started.md)

本指南會執行一次完整且安全的 Skill-0 Review Studio 示範流程。流程使用真實
應用程式與內建範例，不會執行技能、不會讀取私人程式庫，也不會宣稱
canonical 等價性。

## 1. 啟動開發工作台

必要條件：

- Node.js 20（CI 基準）
- npm

安裝 lockfile 鎖定的依賴：

```bash
npm ci
```

這次安全示範應強制使用 standalone 模式，避免應用程式探測或顯示本機
canonical parser（標準解析器）的檢出路徑。

PowerShell：

```powershell
$env:SKILL0_MODE = 'standalone'
npm run dev
```

macOS 或 Linux：

```bash
SKILL0_MODE=standalone npm run dev
```

開啟：

- <http://127.0.0.1:5173/>：審查工作台
- <http://127.0.0.1:5173/demo>：公開示範入口

`VITE_PORT` 可覆寫 `5173`。若有設定自訂連接埠，請以 Vite 在終端輸出的
實際網址為準。

## 2. 先理解產品界線

`/demo` 入口會說明匯入、驗證、審查與匯出四個階段。畫面中的證據表單是
產品導覽內容，不是解析器執行證據。

![公開示範入口與四階段審查流程](assets/readme/01-demo-entry-desktop.png)

選擇 **Open demo workspace** 進入以任務為起點的匯入畫面。

## 3. 準備安全來源

選擇 **Open a demo workspace**。應用程式會填入內建 `SKILL.md` 範例，
並標示下一個分析動作。

![已選擇安全示範的任務式匯入畫面](assets/readme/02-guided-intake-desktop.png)

若要使用自己的資料，請依審查目標選擇輸入方式：

| 審查目標 | 可用來源 |
|---|---|
| 單一技能 | 貼上 `SKILL.md`、匯入受支援網址或使用相容檔案 |
| 技能套件 | 匯入多個檔案、資料夾或 ZIP，再選擇主要技能 |
| 接續工作 | 還原瀏覽器本機草稿 |
| 熟悉流程 | 使用內建安全示範 |

使用私人資料前，請先確認目前執行環境與託管環境已獲准處理該資料。

## 4. 分析並檢查證據側欄

選擇 **Analyze Skill**。分析完成後：

1. 確認解析器模式橫幅；
2. 檢查固定顯示側欄中的阻擋問題；
3. 檢查驗證、一致性、路徑與來源證據；
4. 先理解問題證據，再於結構化編輯器開啟問題；
5. 重大修改後重新執行相關檢查。

![工作台顯示解析器模式、阻擋問題與匯出準備狀態](assets/readme/03-review-workspace-evidence.png)

畫面使用內建 standalone parser（獨立解析器）。`Fallback preview only`
表示結果可用於相容性審查，但不是嚴格 canonical 等價性證明。

## 5. 記錄決策並完成匯出門檻

使用審查工作台記錄：

- 審查者備註與問題層級備註；
- 審查狀態；
- 審查者摘要；
- 決策紀錄；
- 簽核身分；
- 四項簽核檢查；
- 交接狀態。

在審查狀態、簽核檢查與阻擋證據都允許前，正式匯出功能會維持鎖定。

![審查決策面板顯示尚未完成的門檻與下一個動作](assets/readme/04-review-decision-gate.png)

這是一項刻意設計的信任界線。情境名稱或完成編輯本身都不會授予核准。

## 6. 匯出正確的產物

當介面顯示可進行正式匯出後，開啟 **Action Tray**，並依使用者選擇產物：

| 產物 | 使用者 |
|---|---|
| 審查報告（`.md`） | 人工審查者或發版交接 |
| 審查封包（`.json`） | 治理或自動化工具 |
| 技能匯出（`.skill.md`） | 經審查內容交接 |
| SkillDocument（`.skill.json`） | 結構化下游整合 |

`standalone` 與 `llm-assisted` 輸出會在匯出中保留模式限制。若介面要求
canonical 重新執行，必須完成後才能把產物視為最終證據。

## 7. 執行可部署伺服器

建置並啟動 Node/Express 執行環境：

```bash
npm run build
npm start
```

伺服器預設位址為 <http://127.0.0.1:4173>。確認健康狀態：

```text
GET /healthz
GET /api/bridge-status
```

自包含公開版設定：

```text
SKILL0_MODE=standalone
VITE_ENABLE_3D=false
```

此設定不得加入 `SKILL0_PARSER_ROOT` 或 `SKILL0_ROOT`。

## 8. 驗證程式庫

先執行與變更最相關的最小檢查。合併文件或介面變更前，執行完整品質門檻：

```bash
npm run lint
npm test
npm run docs:check
npm run verify:build-size
npm run verify:public-build
npm run test:e2e
```

從真實應用程式重新產生本指南畫面：

```bash
npm run docs:capture-screenshots
```

擷取指令會：

- 強制使用 `SKILL0_MODE=standalone`；
- 使用內建安全示範情境；
- 使用專案內 Playwright 與 1440 × 1024 畫面；
- 將說明文件圖片寫入 `docs/assets/readme/`；
- 若執行失敗，可能把 Playwright 診斷資料寫入 `.playwright-cli/test-results/`；
- 每次擷取前驗證可見產品狀態。

## 信任檢查清單

把審查視為完成前，請確認：

- [ ] 目前解析器模式已顯示並留下紀錄。
- [ ] 阻擋性的驗證、一致性與路徑問題已解決或明確接受。
- [ ] 重大修改後已重新檢查。
- [ ] 審查狀態、摘要、檢查清單與簽核皆已完成。
- [ ] 匯出中正確記錄等價性與 canonical 重新執行要求。
- [ ] 螢幕截圖與匯出內容不含機密、本機私人路徑或無關來源。

規範參考：

- [模式與等價性契約](shared/02-mode-and-equivalence-contract.md)
- [解析器契約](shared/01-parser-contract.md)
- [部署與設定](06-deployment-operations-and-configuration.md)
