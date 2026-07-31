# Chapter 1. Project Overview

Traditional Chinese companion:
[01-project-overview.zh-tw.md](./01-project-overview.zh-tw.md)

Back to the [documentation hub](./README.md).

## 1.1 Product definition

`skill-0-GUI`, presented as **Skill-0 Review Studio**, is the reviewer-facing
workspace around Skill-0 parser output. It turns a skill source and its parser
evidence into a structured review, decision, and export workflow.

The product is not a skill runner. Its responsibility is to:

1. prepare one skill or a supporting bundle for analysis;
2. invoke the configured parser path;
3. keep parser mode and source provenance visible;
4. surface validation, consistency, path, and review findings;
5. support evidence-aware edits and reviewer decisions;
6. gate formal exports until review requirements are satisfied.

## 1.2 Repository boundary

| Repository | Responsibility |
|---|---|
| [`skill-0`](https://github.com/pingqLIN/skill-0) | Canonical parser and shared contract source |
| `skill-0-GUI` | Intake, parser integration, review UI, decision state, and export |

The GUI includes a compatibility-oriented standalone parser so it can run
without a local canonical checkout. Standalone output must not be presented as
strict canonical equivalence.

## 1.3 Intended users

- Reviewers who need visible evidence before approving a skill
- Skill authors who need issue-to-editor feedback
- Integrators connecting Skill-0 output to a human review step
- Operators preparing a controlled internal or self-contained public runtime
- External stakeholders evaluating the review flow without executing a skill

## 1.4 Main workflow

```text
Choose review goal
  → prepare one source or a bundle
  → analyze
  → inspect mode, provenance, checks, and blocking issues
  → edit and recheck when needed
  → record decision, checklist, summary, and sign-off
  → export when the handoff gate allows it
```

The task-first entry offers four starting points:

- review one skill;
- review a skill bundle;
- continue a browser-local draft;
- open a demo-safe workspace.

## 1.5 Runtime modes

| Mode | Runtime behavior | Evidence boundary |
|---|---|---|
| `canonical` | Calls the configured local `skill-0` parser bridge | Strongest parser path; material edits may still require a rerun |
| `standalone` | Uses the bundled fallback parser | Compatibility review only; not strict equivalence proof |
| `llm-assisted` | Uses an approved server-side recovery adapter | Draft-only and never final equivalence evidence |

The normative contract is
[shared/02-mode-and-equivalence-contract.md](./shared/02-mode-and-equivalence-contract.md).

## 1.6 Current deliverables

- React and Vite review application under `src/`
- Development-time API middleware in `vite.config.ts`
- Deployable Node/Express runtime in `server.mjs`
- Shared parser integration in `bridge/skill0Bridge.mjs`
- Bundled standalone parser assets under `standalone/`
- Browser-local draft storage and draft export
- Review report, review packet, `.skill.md`, and `.skill.json` outputs
- English and Traditional Chinese product interface
- Repo-local unit, integration, build, browser, and accessibility gates

`dist/` is generated output. The source-driven React application is the
maintainable product authority.

## 1.7 Explicit non-goals

The current project does not imply:

- skill execution;
- strict equivalence for standalone or LLM-assisted output;
- server-backed document persistence;
- multi-user collaboration or shared review history;
- in-product GitHub pull-request automation;
- a completed public deployment.

## 1.8 Trust model

Review exports remain useful outside the UI only when they preserve:

- active parser mode and mode source;
- review and handoff status;
- validation and reviewer evidence;
- equivalence status;
- `canonical_rerun_required`;
- draft-only limitations.

For a real, screenshot-backed walkthrough, continue with
[getting-started.md](./getting-started.md).
