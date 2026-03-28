# Skill-0 Review Studio

`Skill-0 Review Studio` 是以審查為核心的 Skill-0 解析結果工作台。

目前公開版定位：

- 以 `standalone` 模式部署
- 公開版停用互動式 3D 工作區
- 保留輕量 review map、parser 分析面板與匯出流程
- standalone 匯出結果屬於相容性審查產物，不應視為 canonical 等價性的最終證據
- 目前適合 public beta，不是含持久化的最終正式版

目前工程狀態：

- 型別檢查通過
- 測試通過
- production build 通過
- shared docs sync 檢查通過
- 已在本機驗證 production 形式的 standalone server 與 API routes

核心文件：

- [功能說明](./FEATURES.md)
- [部署說明](./DEPLOYMENT.md)
