# Chapter 3. Functional Modules

Back to index: [README.md](./README.md)

Related chapters:
- [02-runtime-and-system-architecture.md](./02-runtime-and-system-architecture.md)
- [04-bridge-parser-and-analysis.md](./04-bridge-parser-and-analysis.md)
- [05-frontend-workbench.md](./05-frontend-workbench.md)

## 3.1 Functional Breakdown

The application can be understood as six functional modules:

1. Input and intake
2. Example loading
3. Parser execution
4. Visualization workspace
5. Editing and export
6. Mode awareness and deployment safety

## 3.2 Input and Intake

Based on tracked source behavior in `HEAD`:

- `src/App.tsx`
- `src/types/intake.ts`

The intake pipeline supports:

- direct text paste
- multi-file selection
- folder upload
- `.zip` expansion
- primary skill file detection
- support/context file collection

Primary file detection is designed around:

- `.md`
- `.skill`
- `.txt`
- filenames ending in `skill.md`

Support files can include:

- `.json`
- `.yaml`
- `.yml`
- `.toml`
- `.ini`
- `.cfg`
- `.csv`
- `.tsv`
- `.log`

The intake model distinguishes:

- `primary` content
- `context` content
- `upload` source
- `zip` source

## 3.3 Example Loading

The application supports loading an example skill through `/api/example-skill`.

Operational behavior:

- if canonical `skill-0` is available, the example is loaded from `converted-skills/reactjs/SKILL.md`
- otherwise, the example is loaded from `standalone/example-skill.md`

This gives the UI a non-empty operating mode even before user-provided uploads exist.

## 3.4 Parser Execution

The main analysis trigger is the call path behind `analyzeSkillText(...)`.

Current runtime behavior:

- frontend posts to `/api/parse-skill`
- runtime decides bridge mode
- runtime returns a GUI-oriented envelope

Legacy source evolution:

- an older static analyzer existed in `src/services/staticAnalyzerService.ts`
- the preferred source-driven service is `src/services/parserBridgeService.ts`, which delegates to `/api/parse-skill`
- `src/services/geminiService.ts` remains only as a backward-compatible alias during cleanup

This shows an architectural shift from mock or local simulation toward canonical parser-backed analysis.

## 3.5 Visualization Workspace

The intended workbench includes three major views:

- pipeline
- vector
- matrix

These views are described in:
- [05-frontend-workbench.md](./05-frontend-workbench.md)

At the data level, the workspace presents:

- parser metadata
- actions
- rules
- directives
- execution phases
- decision nodes
- risk and confidence metrics
- security findings

## 3.6 Editing and Export

Based on tracked `HEAD` behavior in `src/App.tsx` and `src/components/SideEditor.tsx`, the GUI supports:

- global metadata editing
- phase editing
- decision-node editing
- edit tracking via `modifiedPaths`
- undo/reset against `originalData`
- export to markdown-based `.skill.md`

Export behavior supports two output shapes:

1. parser-result-oriented export
2. higher-level phase-flow export when parser result is absent

Every exported review artifact should also carry parser mode, mode source, and an explicit equivalence framing such as `implementation_identity`, `equivalence_unverified`, or `degraded_path`.

## 3.7 Mode Awareness and Deployment Safety

The system now has an explicit operational distinction between:

- canonical bridge mode
- standalone fallback mode

This is exposed to callers through:

- bridge metadata in API responses
- `GET /api/bridge-status`

This is especially important for external review or public deployment scenarios.

## 3.8 Functional Summary

The project is not only a parser wrapper. It is intended as an analysis workstation with:

- ingestion
- parsing
- decomposition review
- risk framing
- security review presentation
- limited editing
- export
- multi-mode runtime safety
