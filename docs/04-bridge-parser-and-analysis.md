# Chapter 4. Bridge, Parser, and Analysis Logic

Back to index: [README.md](./README.md)

Related chapters:
- [02-runtime-and-system-architecture.md](./02-runtime-and-system-architecture.md)
- [03-functional-modules.md](./03-functional-modules.md)
- [07-technology-stack-and-implementation.md](./07-technology-stack-and-implementation.md)
- [09-complex-skill-analysis-spec.md](./09-complex-skill-analysis-spec.md)
- [10-complex-skill-risk-schema.md](./10-complex-skill-risk-schema.md)

## 4.1 Purpose

This chapter explains the most important backend logic in the repository:

- how parser roots are resolved
- how canonical parsing is invoked
- how fallback parsing works
- how parser output is transformed into GUI-oriented analysis structures

## 4.2 Canonical Parser Bridge

Canonical parser integration is implemented in [../bridge/skill0Bridge.mjs](../bridge/skill0Bridge.mjs).

The bridge uses the canonical parser from the main repository:

- `/home/miles/dev2/skill-0/scripts/auto_parse.py`

Root selection order:

1. `SKILL0_PARSER_ROOT`
2. `SKILL0_ROOT` as a backward-compatible alias
3. `/home/miles/dev2/skill-0`
4. `/home/miles/dev/projects/skill-0`

Validation rule:

- a candidate root is only accepted if `scripts/auto_parse.py` exists

Execution rule:

- on Linux/macOS: execute `python3 -c ...`
- on Windows: execute `wsl.exe python3 -c ...`

## 4.3 Fallback Parser

The standalone parser exists for continuity, demoability, and deployability.

Fallback logic includes:

- frontmatter parsing
- markdown section extraction
- code block command extraction
- action classification
- rule detection
- directive detection
- deduplication
- normalization into the same top-level contract used by the GUI

It produces:

- `meta`
- `original_definition`
- `decomposition.actions`
- `decomposition.rules`
- `decomposition.directives`

This is compatibility-oriented, not implementation-identical to canonical Skill-0 parsing.

## 4.4 Transformation Layer

Canonical or fallback parser output is transformed into a richer payload used by the GUI.

Transformation outputs include:

- `projectId`
- `projectName`
- `riskAssessment`
- `securityScan`
- `threeClassification`
- `globalMetrics`
- `phases`
- `parserResult`
- `bridge`

This layer is what allows the same parser result to be rendered as:

- a dashboard summary
- a phase flow
- a decomposition board
- a security matrix
- a vector-space graph

## 4.5 Derived Metric Logic

The bridge computes several derived metrics from parser output:

- external call count
- non-deterministic action count
- blocking rule count
- strategic directive count

These feed:

- `negativeIntent`
- `riskLevel`
- `operability`
- `decisionConfidence`
- `reworkRate`
- `goalAchievementRate`

These are heuristic visualization metrics, not governance-grade production policy decisions.

## 4.6 Phase Synthesis

The runtime constructs six synthetic analysis phases:

1. Source Intake
2. Action Decomposition
3. Rule Evaluation
4. Directive Mapping
5. Trace Assembly
6. Delivery Snapshot

These phases do not necessarily exist as literal canonical Skill-0 runtime phases; they are a UI-facing interpretation layer used to structure the workflow presentation.

## 4.7 Security Findings Behavior

The bridge can populate `securityScan.findings` in two ways:

1. by returning an empty list when no special condition exists
2. by adding a bridge warning finding when canonical parser execution is unavailable and standalone fallback is used

This helps the UI show that the result came from a degraded but operational mode.

## 4.8 Legacy Analysis Logic

Tracked history in `HEAD` shows two earlier analysis-oriented services:

- `src/services/staticAnalyzerService.ts`
- `src/services/skillScanner.ts`

These are important for understanding the conceptual evolution of the product:

### `staticAnalyzerService.ts`

This older service performed local heuristic analysis with:

- keyword-based risk estimation
- synthetic phase generation
- random-looking metric variation

It is best understood as a prototype or simulation layer.

### `skillScanner.ts`

This tracked module implemented a more detailed context-aware security scanner with:

- markdown context parsing
- code block awareness
- severity adjustment inside fenced code examples
- standards-aligned detection metadata

This module shows that the product was designed to handle security review as more than a single scalar risk score.

## 4.9 Equivalence Position

Parser equivalence should be stated precisely:

- in bridge mode, the GUI uses the same parser implementation as `skill-0`
- in standalone mode, the GUI uses a compatible fallback parser with the same high-level contract

That means:

- bridge mode = implementation identity
- standalone mode = contract compatibility

## 4.10 Extension Chapters for Complex Skill Review

The parser and transformation layer described in this chapter is the substrate for the analysis-method chapters that follow.

Use these companion chapters for review logic above raw parsing:

- [09-complex-skill-analysis-spec.md](./09-complex-skill-analysis-spec.md) for resource-aware graph analysis of main skills, subskills, and command references
- [10-complex-skill-risk-schema.md](./10-complex-skill-risk-schema.md) for ranking and mode-aware finding structure
- [11-evidence-based-warning-template.md](./11-evidence-based-warning-template.md) for reviewer-facing warning language and reminder shaping
