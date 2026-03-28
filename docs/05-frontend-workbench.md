# Chapter 5. Frontend Workbench

Back to index: [README.md](./README.md)

Related chapters:
- [03-functional-modules.md](./03-functional-modules.md)
- [07-technology-stack-and-implementation.md](./07-technology-stack-and-implementation.md)
- [08-development-status-risks-and-roadmap.md](./08-development-status-risks-and-roadmap.md)
- [12-ui-design-review-2026-03-23.md](./12-ui-design-review-2026-03-23.md)
- [13-ui-rebuild-backlog.md](./13-ui-rebuild-backlog.md)

## 5.1 Scope

This chapter describes the restored React workbench model that is now present in the working tree and remains important as the main source-driven authoring surface.

Primary tracked files:

- `src/main.tsx`
- `src/App.tsx`
- `src/components/Dashboard.tsx`
- `src/components/Flowchart.tsx`
- `src/components/PhaseDetails.tsx`
- `src/components/DecompositionBoard.tsx`
- `src/components/SecurityMatrix.tsx`
- `src/components/VectorSpace.tsx`
- `src/components/SideEditor.tsx`
- `src/i18n.ts`

## 5.2 Bootstrap and Shell

Based on `src/main.tsx`, the UI bootstraps with:

- React
- `createRoot`
- `StrictMode`
- global CSS
- i18n initialization

Based on `src/App.tsx`, the app shell includes:

- header with title and repo links
- language toggle
- empty-state intake studio
- analysis workspace
- action panel
- tabbed view switching

## 5.3 Dashboard Summary

`src/components/Dashboard.tsx` provides a high-level summary layer for analyzed results.

Key functions:

- show delivery time
- show confidence
- show rework rate
- show goal achievement
- display a radar chart for multi-axis assessment
- summarize risk assessment
- summarize three-classification output
- deep-link back into relevant phases

This component acts as the executive summary panel for the workbench.

## 5.4 Flowchart

`src/components/Flowchart.tsx` visualizes the phase sequence.

Key functions:

- show phases as selectable nodes
- show phase-to-phase artifact transfers
- distinguish direct, deferred, and terminal flows
- display decision nodes inline with phase flow
- animate context transfer between phases

This is the most process-oriented view in the workbench.

## 5.5 Phase Details

`src/components/PhaseDetails.tsx` is the detailed inspection panel for a selected phase.

Key functions:

- show inputs, tasks, and outputs
- show source and target phase relationships
- expose decision-node thresholds and outcomes
- support edit actions for phases and decisions
- expose expandable telemetry and contextual references

This component is the closest thing to a phase debugger in the original design.

## 5.6 Decomposition Board

`src/components/DecompositionBoard.tsx` presents parser-native decomposition output.

Key functions:

- show parser metadata
- show schema and parser version references
- display action, rule, and directive cards
- display execution paths
- show JSON-oriented structure summaries
- trace parser entities back to uploaded support/context files
- support reverse trace from context file to parser entities

This is the component most directly tied to canonical parser output.

## 5.7 Security Matrix

`src/components/SecurityMatrix.tsx` visualizes risk and findings for review.

Key functions:

- show overall risk
- compute anomaly score
- display gating and standards alignment
- expand findings into detailed inspection rows
- expose line-level context and severity information

This workbench area presents the project as a review console, not just a visualization toy.

## 5.8 Vector Space

`src/components/VectorSpace.tsx` provides a 3D graph view using `react-force-graph-3d`.

Key functions:

- create a central skill node
- create phase nodes
- create task nodes
- create output nodes
- render semantic-style structural relationships in 3D

This view is largely communicative and exploratory rather than operationally essential.

## 5.9 Side Editor

`src/components/SideEditor.tsx` is the inline editing surface.

Key functions:

- edit global project data
- edit decision-node thresholds and outcomes
- preserve edits in local state before save
- support slide-in workbench editing without leaving context

## 5.10 Internationalization

`src/i18n.ts` shows support for:

- English
- Chinese
- `zh-TW`
- `zh-CN`

This is backed by:

- `src/locales/en.json`
- `src/locales/zh.json`

The presence of i18n in the tracked source model indicates that bilingual presentation was a first-class product requirement.

## 5.11 Frontend Design Character

The tracked UI model is not a minimal CRUD dashboard. It was designed as:

- a visual analysis studio
- a narrative phase explorer
- a security and decomposition review surface
- a bilingual presentation layer

## 5.12 Current Constraint

The source-driven UI baseline has been restored, but it is not yet fully hardened. The remaining constraints are now about accessibility, responsive safety, bundle size, and structural cleanup rather than source absence.

The design-quality implications of this workbench are reviewed in [12-ui-design-review-2026-03-23.md](./12-ui-design-review-2026-03-23.md), and the execution-oriented rebuild order is defined in [13-ui-rebuild-backlog.md](./13-ui-rebuild-backlog.md).
