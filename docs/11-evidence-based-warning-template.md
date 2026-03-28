# Chapter 11. Evidence-Based Warning Templates

**Implementation status:** 🟡 Designed

Back to index: [README.md](./README.md)

Related chapters:
- [03-functional-modules.md](./03-functional-modules.md)
- [09-complex-skill-analysis-spec.md](./09-complex-skill-analysis-spec.md)
- [10-complex-skill-risk-schema.md](./10-complex-skill-risk-schema.md)

## 11.1 Purpose

This chapter defines how analysis results should be turned into warnings, reminders, and reviewer-facing guidance.

The objective is not maximum verbosity. The objective is maximum action value.

## 11.2 Required Warning Shape

Each warning should contain four parts in this order:

1. `Finding`
2. `Evidence`
3. `Risk`
4. `Recommended action`

This structure keeps the output grounded. It also makes the warning usable in UI cards, reports, or external review notes.

## 11.3 Default Wording Rules

Warnings should:

- point to a specific path, node, or command
- describe observed behavior before inferred intent
- distinguish certainty from inference
- explain why the finding matters operationally
- end with a concrete next step

Warnings should not:

- list every command in the skill
- claim maliciousness without evidence
- repeat parser metadata with no consequence
- hide fallback degradation inside vague wording

## 11.4 Canonical Template

Use this default structure:

- `Finding:` concise statement of what is wrong or important
- `Evidence:` direct observable facts from the parsed structure
- `Risk:` why this changes operator trust, scope, or safety
- `Recommended action:` the smallest practical next step

Short example:

- `Finding:` The main skill reaches a subskill that executes shell commands.
- `Evidence:` The main path invokes `subskill.deploy`, which contains `npm run deploy` and `rsync` command references.
- `Risk:` The effective authority is higher than a review reader would assume from the top-level description alone.
- `Recommended action:` Review the deployment subskill separately before approving this skill for routine use.

## 11.5 Reminder Prioritization Rule

By default, the system should emit no more than:

- three reminders for compact analyses
- five reminders for complex graphs

Reminder priority should favor:

1. destructive or security-relevant authority
2. unresolved references on the main path
3. scope mismatch between description and behavior
4. hidden environment or repository dependencies
5. fallback-mode caveats that change equivalence claims

## 11.6 Template Library

### Hidden authority

- `Finding:` A reachable subskill performs higher-authority actions than the parent description implies.
- `Evidence:` The main path reaches `{node}` which includes `{command}` and is classified as `{authorityClass}`.
- `Risk:` Reviewers may approve the parent skill as low-impact even though the reachable path can modify files, execute processes, or call external systems.
- `Recommended action:` Review the referenced subskill separately and label the parent skill with the highest reachable authority.

### Unresolved reference

- `Finding:` The analysis cannot resolve a referenced subskill or command file on the active execution path.
- `Evidence:` `{reference}` is declared by `{node}` but no matching file or command target was resolved.
- `Risk:` The actual behavior and authority boundary of this skill cannot be verified confidently.
- `Recommended action:` Resolve the missing reference or downgrade trust in this skill until the dependency is available.

### Scope drift

- `Finding:` The declared purpose of the skill does not match the behavior indicated by its reachable commands.
- `Evidence:` The description says `{declaredScope}`, but reachable commands include `{observedBehavior}`.
- `Risk:` Operators may grant permissions or rely on outputs that do not match the real execution scope.
- `Recommended action:` Rewrite the skill description or split the higher-authority path into a separately reviewable skill.

### Hidden dependency

- `Finding:` This skill depends on undocumented environment state.
- `Evidence:` Execution references `{envVar}`, `{binary}`, or `{repo}` without declaring it as an input requirement.
- `Risk:` Portability and reproducibility are weaker than the skill appears to claim.
- `Recommended action:` Document the dependency explicitly and treat missing dependency handling as part of the review.

### Fallback degradation

- `Finding:` The current result comes from standalone compatibility mode rather than canonical parser identity.
- `Evidence:` Bridge metadata reports fallback mode and the parser path degraded from canonical execution.
- `Risk:` Structural findings remain useful, but strict equivalence claims to `skill-0` should not be made from this result alone.
- `Recommended action:` Re-run the analysis in canonical bridge mode before making parity-sensitive decisions.

### Failure-mode opacity

- `Finding:` The skill includes a fallback path, but the degraded behavior is not clearly described.
- `Evidence:` The graph includes a fallback branch from `{node}` to `{fallbackNode}` without a user-facing explanation of what changes.
- `Risk:` Reviewers may treat the fallback path as equivalent even when trust, completeness, or side effects differ.
- `Recommended action:` Add an explicit fallback notice and summarize what is preserved versus degraded.

## 11.7 Handling Inference Carefully

When inference is necessary, warnings should say so explicitly.

Preferred phrases:

- `The analysis indicates...`
- `The reachable path suggests...`
- `This appears to depend on...`
- `Equivalence is not verified in the current mode...`

Avoid overclaiming phrases such as:

- `This definitely does...`
- `This is safe...`
- `This is identical...`

unless the evidence fully supports those claims.

## 11.8 External Review Format

For external review packages, warnings should be collapsed into a flat list with stable wording.

Recommended rendering fields:

- severity
- title
- affected path
- evidence summary
- reviewer action

This matches the chaptered review package structure and keeps warnings easy to quote in audit or approval notes.

## 11.9 Summary

Real warning value comes from restraint.

The system should prefer a small number of precise reminders over a large number of generic cautions. If a warning does not change what the reviewer should do next, it is probably not worth showing.
