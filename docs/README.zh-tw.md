# Skill-0 Review Studio 說明文件

英文權威版本：[README.md](./README.md)

本中心將目前產品指引與具有日期的規畫、審查紀錄分開。維運決策應以目前原始碼、
契約、測試與最新驗證報告為準；較舊文件用於理解設計歷史。

最近重整日期：`2026-07-31`

## 依目標開始

| 目標 | 建議閱讀路徑 |
|---|---|
| 五分鐘理解產品 | [繁中根 README](../README.zh-tw.md) → [專案總覽](01-project-overview.zh-tw.md) |
| 完成一次本機審查 | [本機審查操作導覽](getting-started.zh-tw.md) |
| 了解功能與審查流程 | [功能模組](03-functional-modules.zh-tw.md) → [前端工作台](05-frontend-workbench.md) |
| 整合解析器或執行環境 | [執行環境架構](02-runtime-and-system-architecture.md) → [解析器橋接](04-bridge-parser-and-analysis.md) |
| 設定或部署服務 | [部署、維運與設定](06-deployment-operations-and-configuration.md) |
| 評估解析模式可信度 | [模式與等價性契約](shared/02-mode-and-equivalence-contract.md) |
| 檢查目前交付證據 | [任務式審查強化整合報告](28-task-first-review-hardening-integration-2026-07-29.zh-tw.md) |
| 了解目前 UI/UX 視覺契約 | [UI/UX v2 設計契約](29-uiux-v2-design-contract-2026-07-31.zh-tw.md) |

## 目前產品文件

| 文件 | 用途 |
|---|---|
| [本機審查操作導覽](getting-started.zh-tw.md) | 可重現、含真實畫面的匯入到匯出流程 |
| [1. 專案總覽](01-project-overview.zh-tw.md) | 產品目的、使用者與程式庫邊界 |
| [2. 執行環境與系統架構](02-runtime-and-system-architecture.md) | 開發與正式環境拓撲 |
| [3. 功能模組](03-functional-modules.zh-tw.md) | 使用者功能與工作流程 |
| [4. 解析器橋接與分析](04-bridge-parser-and-analysis.md) | canonical bridge、standalone parser 與分析行為 |
| [5. 前端工作台](05-frontend-workbench.md) | 審查介面、編輯器、視覺化與在地化 |
| [6. 部署、維運與設定](06-deployment-operations-and-configuration.md) | 指令、環境變數、端點與託管 |
| [7. 技術堆疊與實作](07-technology-stack-and-implementation.md) | 主要函式庫與實作選擇 |
| [8. 開發狀態、風險與規畫](08-development-status-risks-and-roadmap.md) | 較廣泛的狀態與風險紀錄；引用前需重新驗證日期性宣告 |
| [9. 複雜技能分析規格](09-complex-skill-analysis-spec.md) | 多檔案與資源受限分析方法 |
| [10. 複雜技能風險結構](10-complex-skill-risk-schema.md) | 嚴重度、信心與排序契約 |
| [11. 證據式警告範本](11-evidence-based-warning-template.md) | 適合審查交接的警告用語 |

目前行為的可執行權威來源主要包括：

- `src/App.tsx`
- `src/components/GuidedIntakeLanding.tsx`
- `src/components/ReviewWorkspace.tsx`
- `bridge/skill0Bridge.mjs`
- `server.mjs`
- `vite.config.ts`
- `e2e/review-studio.spec.ts`
- `.github/workflows/ci.yml`

## 共享信任契約

`docs/shared/` 內的檔案是 canonical `skill-0/docs/shared/` 來源的受管理鏡像：

- [共享契約索引](shared/README.md)
- [解析器契約](shared/01-parser-contract.md)
- [模式與等價性契約](shared/02-mode-and-equivalence-contract.md)
- [共享術語](shared/03-shared-terminology.md)
- [跨程式庫工作階段規則](shared/04-cross-repo-session-rules.md)

不得獨立編輯這些鏡像。使用下列指令更新或驗證：

```bash
npm run docs:sync
npm run docs:check
```

`docs:check` 會驗證共享文件鏡像契約，但不會證明其他說明文件都是最新版本，
也不會證明不同語言內容的語義完全一致。

## 目前整合證據

| 報告 | 證據界線 |
|---|---|
| [28. 任務式審查強化整合](28-task-first-review-hardening-integration-2026-07-29.md) | 特定時間點的整合、CI、瀏覽器與無障礙證據 |
| [28. 繁中參考版](28-task-first-review-hardening-integration-2026-07-29.zh-tw.md) | 供人工閱讀的繁中 companion |
| [29. UI/UX v2 設計契約](29-uiux-v2-design-contract-2026-07-31.zh-tw.md) | 已實作的工作台殼層、響應式行為與視覺參考 |
| [27. 審查工作台細節對齊](27-review-workspace-polish-alignment-2026-04-09.md) | 有界線的視覺改善摘要 |

報告只記錄其日期與 commit 當下已驗證的內容，不會自動證明目前 checkout
[檢出內容]；需要重新執行相關檢查。

## 具有日期的設計、規畫與審查紀錄

以下文件保留產品決策與較早期的審查循環。除非目前原始碼或實際執行再次確認，
否則其中的狀態、畫面、指令與「下一步」都應視為歷史紀錄。

### 介面與交付規畫

- [12. 介面設計審查](12-ui-design-review-2026-03-23.md)
- [13. 介面重建待辦](13-ui-rebuild-backlog.md)
- [14. 介面與剩餘開發計畫](14-ui-and-remaining-development-plan-2026-03-24.md)
- [15. 里程碑問題清單](15-milestone-issue-list-2026-03-24.md)
- [16. 開發執行摘要](16-development-execution-brief-2026-03-28.md)
- [17. 後期開發計畫](17-late-stage-development-plan-2026-03-28.md)
- [18. MVP 執行計畫](18-mvp-execution-plan-2026-03-28.md)
- [19. MVP 一致性與下一階段摘要](19-mvp-consistency-and-next-execution-brief-2026-03-28.md)
- [20. 線上示範計畫](20-online-demo-plan-2026-04-03.md)

### 瀏覽器與編輯器審查循環

- [21. 單畫面審查工作區摘要](21-single-screen-review-workspace-brief-2026-04-08.md)
- [22. 結構層次與工具列執行摘要](22-structural-depth-and-toolbar-execution-brief-2026-04-08.md)
- [23. 瀏覽器密度審查循環](23-browser-density-review-loop-2026-04-08.md)
- [24. 瀏覽器密度三輪報告](24-browser-density-three-round-report-2026-04-08.md)
- [25. 編輯器驗證循環](25-editor-verification-loop-2026-04-08.md)
- [26. 編輯器驗證三輪報告](26-editor-verification-three-round-report-2026-04-08.md)

### 補充歷史

- [初期專案介紹與開發報告](project-introduction-and-development-report-2026-03-23.md)
- [GitHub 託管策略](github-hosting-strategy-2026-03-23.md)
- `archive/local-planning/`：本機規畫紀錄
- `stitch/`：設計探索與來源畫面參考

Stitch 資產屬於設計探索，不是已交付執行環境的證明。目前操作導覽應使用
`assets/readme/` 內由真實應用程式產生的畫面。

## 在地化公開版文件

公開版文件索引位於 [i18n/README.md](i18n/README.md)。英文是該組文件的
可發佈權威版本；繁體中文是本次文件更新持續維護的人工參考版。其他翻譯可能
落後，發佈前必須重新驗證。

## 證據用語

重大審查應使用下列標記：

- `VERIFIED`：有已檢查原始碼、權威文件、測試結果或實際執行輸出支持。
- `INFERRED`：根據已指明證據做出的合理推論。
- `UNKNOWN`：缺少資料、無法存取、未測試或尚未驗證。

不得把舊報告、產生的畫面或通過的狹窄測試提升為更廣泛的目前驗證。

## 貢獻與文件規則

合併前：

1. 根 README 應聚焦產品價值、快速開始、流程、信任界線與目前入口。
2. 詳細實作與具有日期的規畫應放在本文件集。
3. 重要的新公開 Markdown 應具備英文權威版本與 `.zh-tw.md` 繁中 companion。
4. 翻譯時必須完整保留指令、路徑、檔名、識別碼、模式名稱與資料欄位。
5. 不得獨立編輯 `docs/shared/` 鏡像。
6. 使用內建安全示範資料重新產生產品畫面：

   ```bash
   npm run docs:capture-screenshots
   ```

7. 執行程式庫品質門檻：

   ```bash
   npm run lint
   npm test
   npm run docs:check
   npm run verify:build-size
   npm run verify:public-build
   npm run test:e2e
   ```

8. 不得提交機密、私人路徑、真實客戶資料或未遮蔽的本機執行證據。
