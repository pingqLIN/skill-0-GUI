# Chapter 10. Complex Skill Risk Schema

**Implementation status:** 🟡 Designed

Back to index: [README.md](./README.md)

Related chapters:
- [04-bridge-parser-and-analysis.md](./04-bridge-parser-and-analysis.md)
- [09-complex-skill-analysis-spec.md](./09-complex-skill-analysis-spec.md)
- [11-evidence-based-warning-template.md](./11-evidence-based-warning-template.md)

## 10.1 Purpose

This chapter defines the risk contract used to rank and explain findings from complex skill analysis.

Its function is to make findings comparable across:

- main skills
- subskills
- command references
- canonical bridge mode
- standalone fallback mode

## 10.2 Core Finding Object

Each finding should be representable as one normalized object.

Recommended fields:

- `findingId`
- `title`
- `category`
- `severity`
- `confidence`
- `mode`
- `affectedNodes`
- `primaryPath`
- `evidence`
- `impact`
- `recommendation`
- `operatorAction`
- `equivalenceNote`

Recommended optional fields:

- `relatedFindings`
- `standardsTags`
- `fallbackBehavior`
- `reviewStatus`

## 10.3 Risk Categories

The minimum category set should be:

1. `control_flow`
2. `execution_authority`
3. `reference_integrity`
4. `scope_drift`
5. `hidden_dependency`
6. `failure_mode`
7. `data_exposure`
8. `non_determinism`

Category intent:

- `control_flow`: the main skill path, ordering, or fallback chain is unclear or contradictory
- `execution_authority`: a reachable node can write, execute, deploy, mutate, or otherwise act with more authority than expected
- `reference_integrity`: files, subskills, or commands cannot be resolved confidently
- `scope_drift`: the declared purpose differs from actual behavior
- `hidden_dependency`: execution depends on undocumented env vars, binaries, repos, or runtime state
- `failure_mode`: degraded behavior is present but unacknowledged or misleading
- `data_exposure`: data leaves expected boundaries or is handled unsafely
- `non_determinism`: results vary materially due to randomness, missing inputs, or unstable routing

## 10.4 Severity Scale

Recommended severity values:

- `critical`
- `high`
- `medium`
- `low`
- `info`

Severity should reflect operator consequence, not just parser curiosity.

Use this interpretation:

- `critical`: likely to cause destructive, security-relevant, or trust-breaking behavior on a normal path
- `high`: materially changes what the skill can do or what the operator should permit
- `medium`: creates review uncertainty, operational drift, or degraded correctness but is not immediately catastrophic
- `low`: relevant but not urgent; worth cleanup or annotation
- `info`: context worth showing without calling it a problem

## 10.5 Confidence Scale

Recommended confidence values:

- `high`
- `medium`
- `low`

Confidence should be determined by evidence quality, not by how strong the wording sounds.

Confidence should increase when:

- references resolve cleanly
- command semantics are explicit
- parser mode is known
- multiple signals support the same conclusion

Confidence should decrease when:

- references are missing
- environment requirements are implicit
- standalone fallback prevents strict identity claims
- the engine is forced to infer intent from sparse text only

## 10.6 Ranking Model

The recommended ranking function should prioritize impact first and explainability second.

Suggested ranking inputs:

- severity weight
- authority weight
- main-path reachability
- blast radius across dependent nodes
- evidence strength
- equivalence degradation penalty

This schema intentionally does not require one universal numeric score. A sortable composite model is sufficient as long as the engine can stably surface the top findings.

## 10.7 Evidence Contract

Every non-info finding should contain at least one evidence item.

Each evidence item should support:

- `kind`
- `sourcePath`
- `nodeId`
- `excerpt`
- `explanation`

Recommended evidence kinds:

- `resolved_reference`
- `missing_reference`
- `command_snippet`
- `parser_mode`
- `fallback_notice`
- `behavior_mismatch`
- `env_dependency`

## 10.8 Equivalence and Mode Fields

To stay aligned with [04-bridge-parser-and-analysis.md](./04-bridge-parser-and-analysis.md), every finding should preserve a mode-aware statement.

Recommended mode values:

- `canonical`
- `standalone`
- `mixed`
- `unknown`

Recommended equivalence notes:

- `implementation_identity`
- `contract_compatible`
- `equivalence_unverified`
- `degraded_path`

This prevents overstating certainty when a result was produced in fallback mode.

## 10.9 Top-Finding Selection Rule

The user-facing layer should usually show no more than five findings by default.

Selection rule:

1. keep the highest-ranked finding in each major category
2. prefer main-path findings over peripheral findings when severity is similar
3. suppress duplicate child findings if a parent path finding already explains the issue
4. always keep a mode/equivalence finding if fallback materially changes trust assumptions

## 10.10 Operator Action Labels

Each finding should carry one action-oriented label.

Recommended labels:

- `review_before_run`
- `confirm_scope`
- `resolve_reference`
- `document_dependency`
- `switch_to_canonical`
- `safe_to_ignore`

These labels help keep the output useful instead of merely descriptive.

## 10.11 Example Compact Finding

Example structure:

- title: `Subskill chain writes files despite read-only description`
- category: `scope_drift`
- severity: `high`
- confidence: `high`
- mode: `canonical`
- equivalenceNote: `implementation_identity`
- operatorAction: `confirm_scope`

Why it ranks high:

- the path is reachable from the main skill
- the command evidence is explicit
- the mismatch changes operator expectations

## 10.12 Summary

The risk schema exists to keep findings:

- comparable
- mode-aware
- evidence-backed
- limited to the most consequential issues

That discipline is necessary if complex skill analysis is going to stay useful at scale.
