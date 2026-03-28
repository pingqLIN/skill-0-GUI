# Chapter 2. Runtime and System Architecture

Back to index: [README.md](./README.md)

Related chapters:
- [03-functional-modules.md](./03-functional-modules.md)
- [04-bridge-parser-and-analysis.md](./04-bridge-parser-and-analysis.md)
- [06-deployment-operations-and-configuration.md](./06-deployment-operations-and-configuration.md)

## 2.1 Architectural Summary

The current system has three major runtime layers:

1. Frontend delivery layer
   Serves the existing built UI from `dist/`.

2. API orchestration layer
   Exposes parser-oriented endpoints in both development and production runtimes.

3. Parser execution layer
   Uses either the canonical `skill-0` parser or a bundled standalone fallback parser.

## 2.2 Runtime Components

### Development runtime

Development mode is driven by [../vite.config.ts](../vite.config.ts).

Responsibilities:

- boot the Vite dev server
- serve the browser app
- expose `/api/bridge-status`
- expose `/api/example-skill`
- expose `/api/parse-skill`
- delegate all parser logic to `bridge/skill0Bridge.mjs`

### Production or external-web runtime

Production mode is driven by [../server.mjs](../server.mjs).

Responsibilities:

- start an Express server
- serve `dist/`
- expose the same three API endpoints
- reuse the same bridge module as development mode

### Shared bridge module

The shared integration layer is [../bridge/skill0Bridge.mjs](../bridge/skill0Bridge.mjs).

Responsibilities:

- resolve canonical parser roots
- choose bridge mode
- invoke `skill-0` parser when available
- fall back to bundled standalone parsing when needed
- normalize parser outputs into the GUI-oriented response shape

## 2.3 Runtime Modes

### Mode A: auto bridge mode

Used when `SKILL0_MODE=auto` or omitted.

Behavior:

- check `SKILL0_PARSER_ROOT` first
- otherwise check `SKILL0_ROOT` as a backward-compatible alias
- otherwise probe `/home/miles/dev2/skill-0`
- otherwise probe `/home/miles/dev/projects/skill-0`
- if parser root is found, use canonical parser
- if parser root is not found or parser invocation fails, use fallback parser

### Mode B: forced standalone mode

Used when `SKILL0_MODE=standalone`.

Behavior:

- do not probe local `skill-0` filesystem roots
- do not attempt canonical parser invocation
- always use bundled standalone parser logic

This mode is important for public deployment where local `/home/miles/...` assumptions are invalid.

## 2.4 API Surface

### `GET /api/bridge-status`

Purpose:

- show whether runtime is currently in `skill-0` or `standalone` mode
- expose the resolved canonical root when applicable

### `GET /api/example-skill`

Purpose:

- load a sample skill file from the canonical repository when available
- otherwise serve the bundled standalone example

### `POST /api/parse-skill`

Purpose:

- accept `text` and `skillName`
- run parser flow
- return visualization-oriented payload with:
  - `bridge`
  - `parserResult`
  - `globalMetrics`
  - `phases`
  - `riskAssessment`
  - `securityScan`
  - `threeClassification`

## 2.5 Data Flow

### Canonical bridge path

1. Client submits skill text
2. Runtime calls `parseSkill(...)` in `bridge/skill0Bridge.mjs`
3. Bridge resolves `SKILL0_PARSER_ROOT`, `SKILL0_ROOT`, or default local roots
4. Bridge runs Python parser via `python3` or `wsl.exe python3`
5. Parser returns canonical Skill-0 decomposition JSON
6. Bridge enriches and transforms output for GUI usage
7. Runtime returns JSON to the frontend

### Standalone fallback path

1. Client submits skill text
2. Bridge cannot use canonical parser or is forced into standalone mode
3. Bridge runs local heuristic decomposition logic
4. Bridge wraps the result in the same high-level contract
5. Runtime returns compatible payload to the frontend

## 2.6 Architectural Strengths

- Same bridge logic is reused by development and production runtimes.
- Public deployment can be self-contained.
- Canonical parser identity is preserved in bridge mode.
- Fail-open behavior is replaced with structured fallback behavior.

## 2.7 Architectural Constraint

The current frontend is still delivered from `dist/`, not from an active source-driven `src/` tree in the working copy. This does not block runtime operation, but it weakens maintainability.
