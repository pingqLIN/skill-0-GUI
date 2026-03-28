# Chapter 9. Complex Skill Analysis Specification

**Implementation status:** 🟡 Designed

Back to index: [README.md](./README.md)

Related chapters:
- [04-bridge-parser-and-analysis.md](./04-bridge-parser-and-analysis.md)
- [08-development-status-risks-and-roadmap.md](./08-development-status-risks-and-roadmap.md)
- [10-complex-skill-risk-schema.md](./10-complex-skill-risk-schema.md)
- [11-evidence-based-warning-template.md](./11-evidence-based-warning-template.md)

## 9.1 Purpose

This chapter defines how `skill-0-GUI` should analyze complex skills under finite time and compute budgets.

The target problem is not a single markdown file. It is a graph that may contain:

- one primary skill definition
- multiple subskills
- command references inside markdown or code blocks
- support files that affect execution context
- missing or unresolved references

The goal is to maximize review value, not to exhaustively explain every line.

## 9.2 Design Objectives

The analysis flow should optimize for five outcomes:

1. structural clarity before deep interpretation
2. deterministic first-pass coverage
3. selective escalation only on high-impact nodes
4. evidence-backed findings instead of broad speculation
5. operator-readable outputs that preserve mode awareness

In practical terms, this means:

- analyze the full reference graph cheaply
- explain only the most consequential portions deeply
- cap user-facing warnings to the highest-value findings

## 9.3 Analysis Inputs

The analysis engine should normalize four input classes:

1. primary skill content
2. referenced subskill content
3. command and tool references
4. support context such as config files, examples, and policy files

Each normalized item should be represented as a graph node with the following minimum metadata:

- `nodeId`
- `nodeType`
- `sourcePath`
- `resolved`
- `authorityProfile`
- `referenceCount`
- `parentNodeIds`

Recommended node types:

- `main_skill`
- `subskill`
- `command_reference`
- `support_context`
- `external_dependency`
- `unresolved_reference`

## 9.4 Two-Pass Resource Strategy

The preferred strategy is a two-pass model.

### Pass A: Cheap deterministic pass

This pass should always run.

It is responsible for:

- parser output normalization
- node and edge extraction
- control-flow graph assembly
- execution-authority classification
- unresolved-reference detection
- fallback/canonical mode annotation
- basic risk heuristics

This pass should avoid expensive narrative generation. Its job is to build a trustworthy structure map.

### Pass B: Selective explanation pass

This pass should run only on the most important graph slices.

Selection criteria should include:

- highest authority nodes
- nodes with write, shell, network, or deployment behavior
- nodes with reference resolution failure
- nodes whose declared purpose differs from inferred behavior
- nodes that materially affect fallback equivalence or review confidence

This pass should generate:

- top findings
- evidence bundles
- user-facing warnings
- concise recommendations

## 9.5 Core Structural Questions

Every complex-skill analysis should answer these questions first:

1. What is the primary execution path?
2. Which subskills are required versus optional?
3. Which commands actually execute authority-bearing actions?
4. Which references cannot be resolved?
5. Where does the system depend on external state, environment, or hidden context?
6. Where does fallback behavior diverge from canonical behavior?

If the engine cannot answer these clearly, it should reduce confidence rather than over-explaining.

## 9.6 Graph Construction Model

The graph should capture at least four edge types:

- `invokes`
- `depends_on`
- `reads_from`
- `writes_to`

Optional but useful edge types:

- `calls_external`
- `degrades_to`
- `contradicts`

This graph allows the system to prioritize a small number of important paths instead of flattening the entire skill ecosystem into one summary.

## 9.7 Execution Authority Classification

Each node should be classified according to what it can actually do.

Recommended authority classes:

- `read_only`
- `content_transform`
- `file_write`
- `process_exec`
- `network_call`
- `system_mutation`
- `unknown_authority`

The highest authority in a reachable path should heavily influence severity ranking. A skill that only reads files is not equivalent to one that shells out, deploys, or mutates system state.

## 9.8 Priority Routing for Deep Analysis

Deep analysis should not be applied uniformly.

The engine should rank nodes and paths using a weighted combination of:

- authority level
- reachability from the main skill
- number of downstream dependents
- unresolved reference count
- mismatch between description and behavior
- dependence on environment variables, external repos, or unavailable binaries
- divergence between canonical and fallback execution

The result should be a ranked queue. Only the top queue items should receive deep explanation.

## 9.9 Required Output Artifacts

For each analysis run, the system should produce five output artifacts:

1. a structural summary of the skill graph
2. a mode statement that distinguishes canonical from fallback behavior
3. a prioritized finding list
4. an evidence bundle per finding
5. a short operator reminder set with concrete next actions

The reminder set should normally be capped at three to five items.

## 9.10 Value Rules for Warnings

Warnings should only be emitted if they satisfy all of the following:

- they point to a concrete node or path
- they include observable evidence
- they change operator understanding or operator action
- they are not duplicated by a more important warning

Low-value warnings include:

- repeating parser metadata without impact
- listing all commands without prioritization
- speculative risk language with no evidence

## 9.11 Mode-Aware Interpretation

The analysis layer must preserve the equivalence statement defined in [04-bridge-parser-and-analysis.md](./04-bridge-parser-and-analysis.md).

That means:

- in canonical bridge mode, structural findings can be stated against the `skill-0` parser implementation
- in standalone mode, findings must be framed as compatibility-oriented analysis rather than strict parser identity

This distinction should be visible in findings, confidence, and final reminders.

## 9.12 Implementation Guidance

For the current repository, the most effective implementation order is:

1. keep the parser bridge and fallback parser contract stable
2. build graph extraction on top of the normalized parser result
3. add ranked finding generation before adding longer prose
4. add fixture-driven tests for known graph shapes and known warnings

This sequencing yields higher review value than attempting natural-language explanation before graph confidence exists.

## 9.13 Summary

The correct strategy for complex skills is not deeper analysis everywhere. It is:

- broad structural coverage
- narrow high-impact deep dives
- evidence-backed warnings
- explicit mode awareness

That is the highest-yield way to turn limited resources into real review value.
