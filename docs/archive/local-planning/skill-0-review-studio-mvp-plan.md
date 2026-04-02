# Skill-0 Review Studio MVP 規劃報告

## 摘要

本文件針對 `pingqLIN/skill-0-review-studio` 提出一份可落地的 MVP 規劃，目標是將其定位為 **Skill-0 的人工審查、編輯、驗證、測試與視覺化工作台**，而不是另一套新的 parser。

本報告包含：

1. MVP 功能清單
2. 完整資訊架構 / 頁面設計草圖
3. 資料模型設計（editor state / review state / test state）
4. GitHub issue 規劃（16 個可執行 issue）

---

# 1. MVP 功能清單

## 1.1 MVP 核心目標

MVP 需要能回答以下 5 個問題：

1. 我能不能打開一份 skill？
2. 我能不能修改 skill？
3. 我能不能知道改完有沒有壞？
4. 我能不能看懂 skill 的結構？
5. 我能不能把結果存回去？

---

## 1.2 MVP 必做功能

### A. 專案 / 檔案載入

#### 1. 載入 skill JSON
支援：
- 上傳本地 `.json`
- 貼上 JSON
- 載入 sample skill

#### 2. 載入原始來源文件
支援：
- 上傳 `SKILL.md`
- 上傳 markdown / text
- 可選擇同時載入 source 與 parsed JSON

---

### B. 編輯能力

#### 3. JSON Raw Editor
- Monaco Editor
- JSON 格式化
- syntax highlight
- inline error

#### 4. Structured Form Editor
可編：
- meta
- actions
- rules
- directives
- execution paths

#### 5. 元素 CRUD
對 action / rule / directive 可：
- 新增
- 編輯
- 刪除
- 複製

#### 6. 雙向同步
- 改表單 → 更新 JSON
- 改 JSON → 更新表單

---

### C. 驗證能力

#### 7. Schema Validation
- 顯示 valid / invalid
- 列出錯誤
- 指到欄位位置

#### 8. 結構一致性檢查
至少先做：
- ID 唯一
- execution path 引用存在
- 必填欄位完整
- action/rule/directive 型別正確

---

### D. 視覺化能力

#### 9. Execution Path Graph
- 將 path 畫成流程圖
- action / rule / directive 不同顏色
- 點擊節點可定位到 editor

#### 10. 基本統計面板
顯示：
- actions 數量
- rules 數量
- directives 數量
- path 數量
- validation errors 數量

---

### E. 測試能力

#### 11. 基本測試面板
至少先做：
- run validation
- run consistency check
- run simple path walk

#### 12. 測試結果面板
- pass / fail
- 錯誤描述
- 對應節點 / 欄位

---

### F. 匯入 / 匯出能力

#### 13. 匯出 skill JSON
- download file
- copy to clipboard

#### 14. 匯出 review report（簡版）
包含：
- 修改摘要
- validation 結果
- 測試結果
- reviewer notes

---

### G. 基本 review 能力

#### 15. Reviewer Notes
支援：
- 全域備註
- 元素級備註

#### 16. 修改前後 Diff
至少先做 JSON diff：
- 加欄位
- 刪欄位
- 更新值

---

## 1.3 MVP 先不要做的功能

避免一開始過度膨脹，建議延後：

- 多人協作
- PR 自動建立
- AI 自動改寫
- 完整 provenance mapping overlay
- enterprise 權限系統
- cloud sync
- 即時多人編輯
- 複雜安全規則引擎

---

# 2. 完整資訊架構 / 頁面設計草圖

## 2.1 頂層資訊架構

```text
Skill-0 Review Studio
├─ Dashboard
├─ Review Workspace
│  ├─ Source View
│  ├─ Structured Editor
│  ├─ JSON Editor
│  ├─ Graph View
│  ├─ Validation Panel
│  ├─ Test Panel
│  └─ Notes / Diff
├─ Test Lab
├─ Export Center
└─ Settings
```

---

## 2.2 頁面 1：Dashboard

### 目的
專案入口頁。

### 內容
- Recent files
- Start new review
- Upload skill JSON
- Upload source + parsed pair
- Open sample data

### 區塊
- Hero: Load skill to review
- Recent items list
- Quick actions
- Validation summary if reopening draft

---

## 2.3 頁面 2：Review Workspace（核心頁）

### 建議版面

```text
┌───────────────────────────────────────────────────────────────┐
│ Top Bar: file name | save | validate | test | export         │
├───────────────┬──────────────────────────────┬───────────────┤
│ Left Panel    │ Center Workspace             │ Right Panel   │
│               │                              │               │
│ - Source tab  │ - Structured Form Editor     │ - Validation  │
│ - Outline     │ - JSON Editor                │ - Test Result │
│ - Coverage    │ - Graph View                 │ - Notes       │
│ - Elements    │                              │ - Diff        │
└───────────────┴──────────────────────────────┴───────────────┘
```

---

### 左側欄：Navigation / Context

#### Tabs
1. Source
2. Outline
3. Elements
4. Coverage

#### 用途
快速跳轉，不必一直滾動。

---

### 中央主工作區：三種主要視圖

#### 視圖 1：Structured Form Editor
區塊：
- Meta
- Actions
- Rules
- Directives
- Execution Paths

#### 視圖 2：JSON Editor
- 原始 JSON
- line number
- schema-aware highlight
- format button

#### 視圖 3���Graph View
- 節點類型顏色區分
- 可點選節點回 editor
- 可縮放與拖曳

---

### 右側欄：Quality / Review

#### Panel 1: Validation
- schema errors
- consistency warnings
- quick fixes

#### Panel 2: Tests
- run all tests
- latest results
- failed cases

#### Panel 3: Notes
- reviewer note
- element note

#### Panel 4: Diff
- 與初始版本差異

---

## 2.4 頁面 3：Test Lab

### 內容
- 測試清單
- 新增測試案例
- path simulation
- expected path / actual path
- validation history

### 子區塊
1. Validation Tests
2. Consistency Tests
3. Path Tests
4. Regression Tests

---

## 2.5 頁面 4：Export Center

### 功能
- 匯出 JSON
- 匯出 review report
- 匯出 diff summary
- 匯出 test results

---

## 2.6 頁面 5：Settings

### MVP 先做簡單版
- editor theme
- validation mode
- auto-save
- graph layout preferences

---

## 2.7 Structured Editor 內部設計

### Skill Meta 區塊
欄位例：
- title
- description
- version
- source
- author
- schema version
- tags

### Actions 區塊
每個 action card：
- id
- name
- action_type
- description
- deterministic
- side_effects
- mutable_elements
- immutable_elements
- notes

### Rules 區塊
每個 rule card：
- id
- name
- condition_type
- description
- returns
- inputs
- notes

### Directives 區塊
每個 directive card：
- id
- name
- directive_type
- description
- decomposable
- decomposition_hint
- provenance

### Execution Paths 區塊
每條 path：
- path id / name
- entry condition
- steps
- branches
- success / failure endpoints

---

# 3. 資料模型設計

## 3.1 Editor State

```ts
type EditorState = {
  sessionId: string
  fileName: string | null
  sourceText: string | null
  originalSkillJson: SkillDocument | null
  currentSkillJson: SkillDocument | null

  selectedView: 'form' | 'json' | 'graph'
  selectedElementId: string | null
  selectedElementType: 'action' | 'rule' | 'directive' | null

  dirty: boolean
  lastSavedAt: string | null
  autoSaveEnabled: boolean

  ui: {
    leftPanelTab: 'source' | 'outline' | 'elements' | 'coverage'
    rightPanelTab: 'validation' | 'tests' | 'notes' | 'diff'
    expandedSections: string[]
  }
}
```

---

## 3.2 SkillDocument

```ts
type SkillDocument = {
  meta: {
    title: string
    description?: string
    version?: string
    schema_version?: string
    author?: string
    source?: string
    tags?: string[]
    parse_timestamp?: string
  }
  decomposition: {
    actions: ActionNode[]
    rules: RuleNode[]
    directives: DirectiveNode[]
  }
  execution_paths?: ExecutionPath[]
}
```

---

## 3.3 Action / Rule / Directive

```ts
type ActionNode = {
  id: string
  name: string
  action_type: string
  description?: string
  deterministic?: boolean
  mutable_elements?: string[]
  immutable_elements?: string[]
  side_effects?: string[]
  notes?: string
}

type RuleNode = {
  id: string
  name: string
  condition_type?: string
  description?: string
  returns?: string
  notes?: string
}

type DirectiveNode = {
  id: string
  name: string
  directive_type: string
  description?: string
  decomposable?: boolean
  decomposition_hint?: string
  provenance?: Provenance
  notes?: string
}
```

---

## 3.4 Execution Path

```ts
type ExecutionPath = {
  id: string
  name?: string
  entry_condition?: string
  steps: string[]
  branches?: PathBranch[]
  success_end?: string
  failure_end?: string
}
```

---

## 3.5 Provenance

```ts
type Provenance = {
  level?: 'basic' | 'full'
  source?: {
    kind?: string
    ref?: string
    version?: string
  }
  original_text?: string
  location?: {
    locator?: string
  }
  extraction?: {
    method?: string
    inferred?: boolean
    confidence?: number
  }
}
```

---

## 3.6 Review State

```ts
type ReviewState = {
  reviewerName?: string
  reviewStatus: 'draft' | 'in_review' | 'changes_requested' | 'approved'
  startedAt?: string
  updatedAt?: string

  globalNotes: ReviewNote[]
  elementNotes: ElementReviewNote[]
  decisionLog: ReviewDecision[]

  diffSummary?: DiffSummary
}
```

---

## 3.7 Review Note

```ts
type ReviewNote = {
  id: string
  createdAt: string
  author: string
  content: string
  severity?: 'info' | 'warning' | 'critical'
}
```

---

## 3.8 Element Review Note

```ts
type ElementReviewNote = {
  id: string
  elementId: string
  elementType: 'action' | 'rule' | 'directive'
  createdAt: string
  author: string
  content: string
  status?: 'open' | 'resolved'
}
```

---

## 3.9 Review Decision

```ts
type ReviewDecision = {
  id: string
  timestamp: string
  action:
    | 'added_element'
    | 'edited_element'
    | 'deleted_element'
    | 'validated'
    | 'tested'
    | 'approved'
    | 'requested_changes'
  targetId?: string
  summary: string
}
```

---

## 3.10 Diff Summary

```ts
type DiffSummary = {
  added: string[]
  removed: string[]
  changed: string[]
  stats: {
    actionsAdded: number
    rulesAdded: number
    directivesAdded: number
    actionsRemoved: number
    rulesRemoved: number
    directivesRemoved: number
    fieldsChanged: number
  }
}
```

---

## 3.11 Test State

```ts
type TestState = {
  validationRuns: ValidationRun[]
  consistencyRuns: ConsistencyRun[]
  pathTestRuns: PathTestRun[]
  regressionRuns: RegressionRun[]

  latestStatus: {
    schemaValid: boolean | null
    consistencyValid: boolean | null
    pathTestsPassed: boolean | null
  }
}
```

---

## 3.12 Validation Run

```ts
type ValidationRun = {
  id: string
  startedAt: string
  finishedAt?: string
  status: 'running' | 'passed' | 'failed'
  errors: ValidationIssue[]
}
```

---

## 3.13 Validation Issue

```ts
type ValidationIssue = {
  code: string
  path: string
  message: string
  severity: 'error' | 'warning'
}
```

---

## 3.14 Consistency Run

```ts
type ConsistencyRun = {
  id: string
  startedAt: string
  finishedAt?: string
  status: 'running' | 'passed' | 'failed'
  issues: ConsistencyIssue[]
}
```

---

## 3.15 Consistency Issue

```ts
type ConsistencyIssue = {
  type:
    | 'duplicate_id'
    | 'missing_reference'
    | 'orphan_path'
    | 'empty_required_field'
    | 'invalid_branch'
  targetId?: string
  message: string
  severity: 'error' | 'warning'
}
```

---

## 3.16 Path Test Run

```ts
type PathTestRun = {
  id: string
  name: string
  startedAt: string
  finishedAt?: string
  inputContext?: Record<string, unknown>
  expectedPath?: string[]
  actualPath?: string[]
  status: 'running' | 'passed' | 'failed'
  message?: string
}
```

---

## 3.17 Regression Run

```ts
type RegressionRun = {
  id: string
  baselineVersion: string
  currentVersion: string
  status: 'running' | 'passed' | 'failed'
  changesDetected: string[]
}
```

---

# 4. GitHub issue 規劃（16 個）

## Epic 1：Project Bootstrap

### Issue 1 — Initialize `skill-0-review-studio` frontend app
**目標**
- 建立前端專案骨架
- 設定 TypeScript、lint、format、測試框架
- 初始化 UI framework

**完成條件**
- 可本地啟動 dev server
- 有基本 layout
- 有 CI lint/test stub

---

### Issue 2 — Define shared domain types for Skill-0 documents
**目標**
- 定義 `SkillDocument`, `ActionNode`, `RuleNode`, `DirectiveNode`, `ExecutionPath`
- 定義 editor/review/test state 型別

**完成條件**
- `src/types/` 完整
- 可供 editor / validator / graph 共用

---

## Epic 2：Loading & Persistence

### Issue 3 — Implement skill JSON import/export
**目標**
- 上傳 `.json`
- 載入 sample data
- 匯出 `.json`

**完成條件**
- 使用者可載入與匯出 skill document

---

### Issue 4 — Implement editor session persistence
**目標**
- localStorage / IndexedDB 暫存工作草稿
- 支援 reload 恢復

**完成條件**
- 重整頁面不丟失編輯內容

---

## Epic 3：Editing Experience

### Issue 5 — Build raw JSON editor with syntax highlighting
**目標**
- 整合 Monaco Editor
- JSON 格式化
- 顯示 parse errors

**完成條件**
- 使用者可直接改 JSON

---

### Issue 6 — Build structured form editor for meta/actions/rules/directives
**目標**
- 做表單化編輯 UI
- 支援主要欄位編修

**完成條件**
- 可不碰 JSON 直接編輯 skill 結構

---

### Issue 7 — Add CRUD operations for decomposition elements
**目標**
- 新增 / 編輯 / 刪除 / 複製 action/rule/directive

**完成條件**
- 所有元素都可從 UI 管理

---

### Issue 8 — Implement form/JSON two-way sync
**目標**
- 表單與 JSON 編輯器互相同步
- 避免 state 不一致

**完成條件**
- 任一側修改都能正確反映另一側

---

## Epic 4：Validation & Consistency

### Issue 9 — Integrate Skill-0 JSON schema validation
**目標**
- 接 skill-0 schema
- 顯示 schema validation 結果

**完成條件**
- 顯示 valid / invalid 與錯誤清單

---

### Issue 10 — Implement custom consistency checks
**目標**
- ID 唯一
- missing references
- orphan execution nodes
- required path coverage baseline

**完成條件**
- 有 schema 之外的 custom check 結果

---

## Epic 5：Visualization

### Issue 11 — Create decomposition outline and element navigator
**目標**
- 左側導航
- element list / quick jump

**完成條件**
- reviewer 可快速定位元素

---

### Issue 12 — Build execution path graph view
**目標**
- 視覺化 actions/rules/directives 與 path 連線
- 點擊節點可跳到 editor

**完成條件**
- 可用 graph 理解整體流程

---

### Issue 13 — Add stats and quality summary panel
**目標**
- 顯示元素數量
- path 數量
- 錯誤/警告數量
- review progress summary

**完成條件**
- reviewer 一眼掌握健康狀態

---

## Epic 6：Testing

### Issue 14 — Build test runner panel for validation/consistency/path walk
**目標**
- 在 UI 裡執行 validation、consistency、basic path walk

**完成條件**
- 不需離開 studio 即可測試

---

### Issue 15 — Add test result history and failure inspection
**目標**
- 保留 test runs
- 顯示失敗細節
- 可連回對應元素

**完成條件**
- studio 具備最基本 QA traceability

---

## Epic 7：Review Workflow

### Issue 16 — Implement notes, diff summary, and exportable review report
**目標**
- reviewer notes
- element notes
- JSON diff summary
- 匯出 review report

**完成條件**
- 一次 review 可留下完整輸出成果

---

# 5. 建議里程碑

## Milestone 1 — Bootable Editor
- Issue 1
- Issue 2
- Issue 3
- Issue 5

## Milestone 2 — Editable Studio
- Issue 6
- Issue 7
- Issue 8

## Milestone 3 — Quality Gate
- Issue 9
- Issue 10
- Issue 14
- Issue 15

## Milestone 4 — Reviewer UX
- Issue 11
- Issue 12
- Issue 13
- Issue 16

## Milestone 5 — Persistence
- Issue 4

---

# 6. 對外描述建議

可作為 README 中的 MVP 文案：

> **Skill-0 Review Studio MVP**  
> A browser-based review workspace for Skill-0 documents that supports structured editing, raw JSON editing, schema validation, consistency checks, execution-path visualization, test running, and review export.

---

# 7. 結論

`skill-0-review-studio` 最適合被打造為：

- Skill-0 的人工審查工作台
- Skill-0 的編輯器
- Skill-0 的驗證與測試前台
- Skill-0 的 execution-path 視覺化工具

MVP 階段不應追求過度完整，而應先把以下閉環做通：

**載入 → 編輯 → 驗證 → 視覺化 → 測試 → 匯出**

當這個閉環穩定後，再逐步加入：

- provenance mapping
- AI augmentation
- 安全標記層
- 多人協作
- GitHub PR integration

這樣才能讓 `skill-0-review-studio` 成為真正有使用價值的 studio，而不只是另一個展示型 repo。