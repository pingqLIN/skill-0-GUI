# Skill-0 Review Studio

英文權威版本：[../en/README.md](../en/README.md)

`Skill-0 Review Studio` 將 Skill-0 解析結果轉化為解析模式清楚可見、
以證據為基礎的審查、決策與匯出流程。

## 公開版定位

- 以 `standalone` 模式部署
- 公開版停用可選的 3D 工作區
- 讓解析器模式、證據界線、審查狀態與匯出門檻保持可見
- standalone 匯出屬於相容性審查產物，不是嚴格 canonical 等價性證據
- LLM-assisted recovery（大型語言模型輔助修復）僅限草稿
- 草稿保留在瀏覽器本機，不代表伺服器端持久化或多人審查歷史

## 從這裡開始

- [本機審查操作導覽](../../getting-started.zh-tw.md)
- [功能說明](./FEATURES.md)
- [部署說明](./DEPLOYMENT.md)
- [完整繁中說明文件中心](../../README.zh-tw.md)
- [模式與等價性契約](../../shared/02-mode-and-equivalence-contract.md)

## 驗證證據

具有日期的[任務式審查強化整合報告](../../28-task-first-review-hardening-integration-2026-07-29.zh-tw.md)
記錄特定 commit 的型別檢查、測試、建置、瀏覽器、無障礙與 CI 證據。
發佈前仍必須重新執行目前程式庫的品質門檻；舊報告不會自動證明目前 checkout。
