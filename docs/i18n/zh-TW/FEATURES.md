# Skill-0 Review Studio 功能說明

## 核心能力

- 可匯入主 skill 檔與輔助 context files 的 intake 工作區
- 在本機 `skill-0` 存在時，可走 canonical parser bridge
- 提供 standalone fallback parser，適合公開 demo 與外部審查
- 以 parser 輸出為主的 decomposition board
- 以 findings、traceability、risk framing 為核心的 dashboard 與 security matrix
- 以輕量 semantic review map 作為公開版主要視覺化介面
- 支援記憶體內編修與 `.skill.md` 匯出

## 公開版邊界

- 公開版不提供互動式 3D 工作區
- 公開版不提供 server-side persistence、共享草稿或多人審查歷史
- 若部署只用 standalone mode，不應宣稱與 canonical parser 完全等價
