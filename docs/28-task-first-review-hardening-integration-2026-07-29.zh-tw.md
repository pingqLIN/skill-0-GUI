# Task-First 審查強化整合報告

日期：`2026-07-29`

英文主文件：[28-task-first-review-hardening-integration-2026-07-29.md](./28-task-first-review-hardening-integration-2026-07-29.md)

## 目標

完成 task-first Review Studio 在 `main` 的強化整合階段、維持審查證據邊界，並讓新的瀏覽器與無障礙驗證能由 CI 重複執行。

## 已整合範圍

`main` 已由 `40e4b16` fast-forward 到 `91e1c51`，無 merge commit、無衝突地整合 `codex/review-studio-hardening` 的十筆提交。

整合後行為包含：

- 單一 skill、skill bundle、已儲存草稿與示範工作區的 task-first intake 選項
- 依任務顯示貼上、URL、檔案／資料夾與 ZIP 輸入控制
- 最多五筆、儲存在瀏覽器本機的草稿清單，支援恢復、編輯、輸出與確認後刪除
- 分析前編輯已匯入的來源內容
- `PhaseDetails` 的 reviewer-facing 證據邊界
- desktop 與 mobile Playwright 覆蓋
- 透過 `@axe-core/playwright` 執行 serious 與 critical 無障礙檢查

## 驗證證據

以下檢查均由整合後的 `main` worktree 執行：

| 檢查 | 結果 |
|---|---|
| `npm run lint` | `VERIFIED` |
| `npm test` | `VERIFIED`：147 passed、2 skipped |
| `npm run verify:build-size` | `VERIFIED`：entry chunk 低於 500 KiB gate |
| `npm run verify:public-build` | `VERIFIED`：16 個 assets，沒有 3D entry/vendor chunk |
| `PLAYWRIGHT_PORT=43290 npm run test:e2e` | `VERIFIED`：desktop 與 mobile 共 14 passed |
| task-owned dev server 清理 | `VERIFIED`：測試後 port `43290` 已清空 |

第一次使用隔離 port 的 Playwright 執行已產生完整瀏覽器產物，但 Windows runner 在受管理的 web server 完成後沒有退出。該 runner 已終止；之後重用 task-owned server 正式重跑並取得 exit code 0，最後依已驗證的 PID ownership 停止該 server。`playwright.config.ts` 現在可用 `PLAYWRIGHT_PORT` 覆寫 port，因此本機 QA 不必干擾既有的 Review Studio session。

## CI 延續性

`.github/workflows/ci.yml` 現在有獨立的 `browser-qa` job，會：

1. 安裝 lockfile 固定的 npm dependencies；
2. 安裝 Chromium 與 Playwright system dependencies；
3. 執行相同的 `npm run test:e2e` contract。

後續已透過 pull request `#9` 發布這項整合。GitHub Actions run `30470757290` 已在 merge commit `a25be55` 成功完成：

- `validate`：`VERIFIED`
- `browser-qa`：`VERIFIED`

Workflow 的 `actions/checkout` 與 `actions/setup-node` steps 維持在目前相容 Node 24 的 major 版本。Repository rules 要求兩項 job 都通過後，變更才能合併到 `main`。

## 剩餘風險

- GitHub Dependabot 目前有零筆 open alert；這不取代重新執行 package-manager audit。
- 標準 build 仍會產生已知的大型 lazy 3D vendor chunk，但強制執行的 entry-size 與 public-build boundary 均通過。
- Repository 已公開，但本次整合未執行產品部署、tunnel 修改或 production runtime mutation。

## 階段決策

Task-first Review Studio hardening 的本機與 GitHub-hosted CI 驗收條件均已滿足。後續變更應持續透過 pull request，並以 `validate` 與 `browser-qa` 作為 required checks。
