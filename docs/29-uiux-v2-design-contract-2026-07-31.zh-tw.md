# UI/UX v2 設計契約

英文權威版本：[29-uiux-v2-design-contract-2026-07-31.md](./29-uiux-v2-design-contract-2026-07-31.md)

狀態：`2026-07-31` UI/UX v2 發布已實作的設計契約。

## 目的

讓 Review Studio 呈現為編輯式工作台：進行中的審查是中心，證據與阻擋問題持續可見，
而 sign-off 是刻意進入的終端操作，不再藏在匯出入口裡。

## 參考概念圖

以下概念圖為本次發布產生的視覺契約，不是執行環境畫面：

- [桌面匯入](assets/uiux-v2/intake-desktop-concept-v2.png)
- [桌面審查](assets/uiux-v2/review-desktop-concept-v2.png)
- [行動審查](assets/uiux-v2/review-mobile-concept-v2.png)

## 產品規則

- parser mode、證據姿態、審查狀態、交接狀態與匯出就緒度必須可見；不得暗示個別 phase
  已經實際執行。
- 桌面版使用固定的左側視圖切換、中間不中斷的工作面，以及持續存在的 reviewer rail。
  開啟 Review、Checks 或 Context 時，該工作會提升為右側細節面板。
- 較小螢幕保留底部細節抽屜，並保持來源編輯器可用：先選擇檔案，再使用文字編輯器，
  不把兩者硬塞進狹窄欄位。
- 使用紙張色表面、深石板色導覽欄、緊湊的全大寫 metadata、方正到細微的圓角與色調層次。
  玻璃效果不是主要的資訊分組方式。
- 匯入導覽必須本地化；JSON、parser、`SkillDocument` 等技術名詞在更精確時保留。

## 驗收檢查

- 目前桌面與行動 viewport 不得出現文件層級的水平溢位。
- 工作區視圖、來源檔案、細節抽屜頁籤及關閉抽屜，都要向輔助技術公開彼此關係。
- 真實應用程式仍可完成匯入、bundle 來源編輯、檢查、reviewer sign-off 與匯出閘門。
- 視覺驗證必須把真實的桌面與行動螢幕截圖和參考概念圖比對；概念圖本身不是交付證據。

## 已知且刻意保留的差異

已交付的 UI 保留既有密集的 parser 面板與底部操作列，因為它們呈現真實審查狀態與匯出功能。
概念圖呈現較平靜、理想化的資訊密度；它們不會取代目前 parser、驗證或 provenance 的界線。
