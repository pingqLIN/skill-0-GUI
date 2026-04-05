# Stitch Refinement Pack

這個資料夾不是原始產品規格，而是「已生成過一輪 Stitch 視覺結果之後」的第二輪精修包。

目的只有一個：

- 保留目前 Stitch 已經抓到的 editorial / review workbench 方向
- 把畫面內容、流程順序、功能覆蓋，拉回真正的 `Skill-0 Review Studio`

## 現有資料夾用途

- `editorial_workbench/DESIGN.md`
  - 目前最準的風格北極星
  - 可保留的核心：warm industrial palette、editorial typography、no-line rule、tight radius、left review rail
- `homepage_intake/`
  - 首頁與 intake 的最佳現成方向
  - 問題是文案與內容還偏 generic
- `review_workspace_overview/`
  - workspace shell 的最佳現成方向
  - 問題是功能覆蓋不完整，truth signals 與 sign-off/export 還不夠強
- `homepage_intake_top_nav/`
  - 可作為局部參考
  - 不建議當主方向，因為它弱化了 reviewer workbench 的左 rail 結構

## 新增文件

- `STYLE_SYNTHESIS.md`
  - 把現有 Stitch 成果整理成可延續的風格規則
- `SCREEN_CONTENT_MAP.md`
  - 把真實產品流程與資訊內容映射成畫面需求
- `prompt-c-faithful-editorial-refinement.txt`
  - 下一輪最適合直接貼進 Stitch 的精修 prompt

## 建議使用順序

1. 在 Stitch 選 `Web App`
2. 上傳 `docs/stitch/skill-0-review-studio-summary.txt`
3. 上傳新版 UI 的 4 張參考截圖
4. 再上傳這個資料夾中的 `STYLE_SYNTHESIS.md` 與 `SCREEN_CONTENT_MAP.md`
5. 貼上 `prompt-c-faithful-editorial-refinement.txt`

## 這一輪的設計原則

- 首頁不是 marketing page，而是 intake-led review desk
- 流程必須維持：`intake -> analysis -> review -> export`
- parser mode、evidence status、validation、review decision 必須持續可見
- 高密度來自更好的分組與層級，不是更多卡片
- 不能發明 collaboration、AI copilot、cloud sync、ticket workflow
