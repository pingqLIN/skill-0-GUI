# Screen Content Map

這份文件的目的是把真實產品內容映射成 Stitch 應生成的畫面，不讓生成結果只停留在風格相似。

## Screen 1. Entry Desk / Homepage + Intake

### 必須出現的區塊

- product title: `Skill-0 Review Studio`
- parser / bridge status
- local draft or autosave state
- skill URL input
- paste area for SKILL or SkillDocument JSON
- upload zone for files or folders
- pending files preview
- supporting files preview
- sample scenarios
- docs / resources
- exports overview

### 必須出現的 sample scenarios

- `Mode overview`
- `Bundle intake review`
- `Publish approval gate`

### 適合出現的真實文案

- `Inspect parser mode, reviewer checks, and export flow before loading your own material.`
- `Load a sample bundle with supporting files so you can inspect references, authority, and evidence gates together.`
- `Walk through a release-oriented sample that emphasizes sign-off gates, summary quality, and export readiness.`

## Screen 2. Review Cockpit Overview

### 必須出現的主殼

- left rail
- center review surface
- right reviewer rail
- persistent top truth bar

### truth bar 必須顯示

- parser mode
- evidence status
- validation state
- review decision
- export readiness

### workspace 視圖切換

- `pipeline`
- `vector`
- `matrix`

### quick actions

- global editor
- structured editor
- JSON editor
- export `.skill.md`
- export JSON
- export review report
- export review packet
- reset workspace
- undo

## Screen 3. Pipeline / Analysis View

### 必須出現

- decomposition board
- derived workflow / flowchart
- phase navigation
- phase details
- parser-native entities

### 適合出現的內容類型

- actions
- rules
- directives
- execution paths
- references to supporting files
- parser metadata
- schema version / parser version

## Screen 4. Checks + Context

### checks 分頁必須出現

- schema validation
- consistency checks
- warnings / errors
- path walk or test history
- diff summary

### context 分頁必須出現

- supporting files
- command references
- analysis findings
- source links or evidence links

### reviewer 需要的判斷語意

- `blocked`
- `attention`
- `clean`

## Screen 5. Sign-off + Export

### review rail 必須出現

- reviewer name
- reviewer notes
- review summary
- reviewer signoff
- decision log
- review status

### review status 真實值

- `draft`
- `in review`
- `changes requested`
- `approved`

### 4 個 sign-off gates

- `mode confirmed`
- `validation reviewed`
- `diff reviewed`
- `evidence ready`

### export 必須出現

- `review report`
- `review packet`
- `SkillDocument JSON`
- `.skill.md`

## Sample Data Notes

### Supporting files

可用這種內容：

- `docs/policy.md`
- `scripts/run.py`
- `capability_map_v2.json`
- `context_payload.txt`

### 真實 review narrative

- sample workspace 可以有 `in review`、`changes requested`、`approved` 三種不同狀態
- `Bundle intake review` 適合表現 supporting files 尚未完成 evidence pass
- `Publish approval gate` 適合表現 sign-off 全部完成且 export ready

## 不應出現的內容

- collaboration avatars or multi-user review threads
- chat assistant inside the product
- cloud sync workflow beyond local draft / autosave hints
- generic BI metrics unrelated to parser review
- marketing taglines that weaken the reviewer-first tone
