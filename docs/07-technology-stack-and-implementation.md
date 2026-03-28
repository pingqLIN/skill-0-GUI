# Chapter 7. Technology Stack and Implementation

Back to index: [README.md](./README.md)

Related chapters:
- [04-bridge-parser-and-analysis.md](./04-bridge-parser-and-analysis.md)
- [05-frontend-workbench.md](./05-frontend-workbench.md)
- [06-deployment-operations-and-configuration.md](./06-deployment-operations-and-configuration.md)

## 7.1 Languages

- TypeScript
- JavaScript ESM
- Python
- Markdown
- JSON

## 7.2 Frontend Framework and Rendering

- `react`
- `react-dom`
- `vite`
- `@vitejs/plugin-react`

Role:

- application shell
- browser rendering
- local development workflow

## 7.3 Styling and Motion

- `tailwindcss`
- `@tailwindcss/vite`
- `framer-motion`
- `lucide-react`

Role:

- utility styling
- animated transitions
- iconography
- visual polish

## 7.4 Charts and Graph Visualization

- `recharts`
- `three`
- `react-force-graph-3d`

Role:

- radar charts
- force-directed structural visualization
- 3D phase or task relationship rendering

## 7.5 Internationalization

- `i18next`
- `react-i18next`
- `i18next-browser-languagedetector`

Role:

- multilingual interface rendering
- language auto-detection
- Chinese and English presentation

## 7.6 Runtime Server

- `express`

Role:

- production/static delivery
- REST-like parser endpoints
- external website runtime

## 7.7 File and Data Utilities

- `jszip`

Role:

- zipped skill package expansion

## 7.8 Parser Integration

- Python `skill-0` parser bridge
- bundled standalone parser fallback

Role:

- canonical parser delegation
- compatibility-oriented fallback parsing
- bridge orchestration

## 7.9 Type and Node Support

- `typescript`
- `@types/node`
- `@types/express`
- `tsx`

Role:

- type checking
- Node runtime developer support

## 7.10 Current Dependency Note

`@emotion/is-prop-valid` remains necessary because the existing `dist` bundle imports it indirectly, and development/runtime verification would fail without it.

Stale AI-only and unused native dependencies have been removed from the active manifest so the deployable runtime better matches the real bridge/standalone architecture.

## 7.11 Implementation Style

The implementation style of the repository is mixed but understandable:

- runtime-critical code is now centered in small Node/ESM files
- earlier UI logic was component-rich and exploratory
- parser-facing logic is deterministic in structure but heuristic in enrichment
- deployment concerns are now separated from dev-only Vite concerns

## 7.12 Technology Summary

The project is a hybrid of:

- modern React visualization frontend
- lightweight Node/Express runtime
- Python parser delegation
- fallback-compatible local analysis logic

That stack is suitable for a reviewable demo/product hybrid, especially when canonical and standalone operation both matter.
