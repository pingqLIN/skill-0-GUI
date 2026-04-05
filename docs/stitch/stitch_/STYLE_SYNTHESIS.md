# Stitch Style Synthesis

## 1. 這輪已經抓對的方向

現有 Stitch 輸出已經找到一個適合 `Skill-0 Review Studio` 的主視覺語言，可以延續：

- `editorial_workbench/DESIGN.md` 的核心風格成立
- 暖白、紙感、深石板色的結構層級成立
- serif headline + utilitarian sans 的 pairing 成立
- 小圓角、低裝飾、no-line rule 成立
- 左側窄 rail + 主要工作面 + 次要資訊欄 的殼成立

這些都比目前一般 SaaS dashboard 更接近「review console / evidence desk / operator cockpit」。

## 2. 這輪需要修正的問題

### 內容不夠忠於真實產品

- `homepage_intake` 與 `review_workspace_overview` 裡的大量 copy 還是 generic placeholder
- 現有畫面沒有完整表達實際產品的 sample scenarios、review gates、exports、checks/context 分頁
- 畫面中的數據與 labels 需要更貼近真實工作流，不要像虛構的監控儀表板

### 功能覆蓋還不完整

- 缺少明確的 `pipeline / vector / matrix` 視圖切換語意
- 缺少完整的 `review / checks / context` reviewer rail 分頁
- 缺少完整 sign-off 與 export 畫面
- 缺少 parser mode 對 canonical / standalone / unknown 的真實語意區分

### 結構需要更 reviewer-first

- `homepage_intake_top_nav` 的主結構偏弱，不適合當主要殼
- 真正主方向應該維持左 rail，因為它更符合 reviewer cockpit 的密度與節奏
- truth signals 需要更 persistent，而不是只在局部區塊出現

## 3. 下一輪應保留的視覺決策

### 保留

- warm industrial palette
- Newsreader 類型的 editorial serif 作為 heading family
- Inter 類型的 utilitarian sans 作為 UI family
- 小圓角或近直角
- tonal separation 取代重 border
- asymmetric layout
- persistent rail + split panes + tabbed dense modules

### 不要退回去

- 不要變成 SaaS landing page
- 不要變成 KPI card grid
- 不要變成 heavy glassmorphism
- 不要變成 consumer-polished collaborative product
- 不要加入與產品無關的 charts

## 4. 下一輪要強化的結構

### A. 首頁 / Intake

首頁應是 intake-led 的 operational desk，不是 feature marketing page。

畫面主角應該是：

- skill URL input
- paste area
- upload zone
- pending/supporting files preview
- bridge / parser readiness

sample scenarios、docs、outputs 都應是圍繞 intake 的次級區塊，而不是一排 feature cards。

### B. Workspace Shell

工作區需要一個穩定殼：

- 左 rail：導覽與 quick actions
- 中央：active review context
- 右 rail：review / checks / context
- 頂部 truth bar：parser mode、evidence status、validation state、review decision、export readiness

### C. Checks / Evidence

validation 與 consistency 不應該只像普通警示列表，而要像 reviewer 的判斷面板：

- blocked
- attention
- clean

要能讓 reviewer 快速知道哪裡需要回頭檢查 supporting files、diff、path walk、references。

### D. Sign-off / Export

sign-off 不能只是表單角落的欄位，應該被做成一個有明確門檻感的 release gate：

- reviewer summary
- reviewer signoff
- 4 個 sign-off gates
- decision log
- export actions
- output preview / handoff framing

## 5. 文案與內容策略

下一輪不要再用抽象的 generic copy。文案要貼近真實產品語意：

- `parser mode`
- `bridge status`
- `review status`
- `supporting files`
- `consistency checks`
- `analysis findings`
- `decision log`
- `review packet`
- `.skill.md export`

sample scenarios 應使用真實內容：

- `Mode overview`
- `Bundle intake review`
- `Publish approval gate`

review status 應使用真實狀態：

- `draft`
- `in review`
- `changes requested`
- `approved`

## 6. 最終生成目標

下一輪 Stitch 結果不應只是「更漂亮的 mockup」，而應該是：

- 風格上延續現有 editorial workbench
- 架構上更忠於實際產品
- 功能上完整覆蓋 intake、analysis、review、export
- 內容上更像真實 reviewer workspace，而不是概念型展示稿
