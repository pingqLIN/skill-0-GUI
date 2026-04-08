# 25. Editor Verification Loop (2026-04-08)

Back to index: [README.md](./README.md)

Related chapters:
- [23-browser-density-review-loop-2026-04-08.md](./23-browser-density-review-loop-2026-04-08.md)
- [24-browser-density-three-round-report-2026-04-08.md](./24-browser-density-three-round-report-2026-04-08.md)

## 25.1 Purpose

This brief defines the browser-first verification loop for edit flows.

The goal is not only "the form can save".

The goal is:

- executable: a reviewer can actually complete the edit flow
- inspectable: the UI shows what changed
- comparable: before and after states can be compared without guesswork
- verifiable: exported or derived artifacts confirm the edited result deterministically

## 25.2 Required Skills And Tooling

Use this minimal set:

- `playwright`
- `audit`
- `harden`

Context comes from `.impeccable.md`.

Decision:

- use a real browser, not only component tests
- use repeatable seeded workspace state
- produce artifacts that show both UI state and exported verification state

## 25.3 What Must Be Tested

Every round must check these edit paths:

1. global edit
2. structured SkillDocument edit
3. JSON edit with invalid and valid save paths

Each path must answer:

1. Can the user open the editor without hunting for it?
2. After saving, what visible signal confirms the edit landed?
3. Can the user compare the change from the original state?
4. Can the exported review packet or report prove the new state?
5. Is the result deterministic, or did unrelated data change?

## 25.4 Three-Round Loop

### Round 1

- capture current edit flows in browser
- record friction, ambiguity, and non-deterministic side effects
- identify missing verification signals

### Round 2

- remove non-deterministic edit side effects
- strengthen save feedback, comparison surfaces, and exported verification
- add automated tests for the browser findings

### Round 3

- re-run browser review as an external auditor
- reject cosmetic churn
- keep only changes that improve execution, comparison, or verification

## 25.5 Acceptance Standard

Do not close this slice unless:

1. a global edit can be saved and verified through both UI and exported artifact
2. a structured edit can be compared against the original state
3. invalid JSON produces a clear blocking error and valid JSON can still save
4. editing no longer mutates unrelated metrics or state randomly
5. browser artifacts and automated tests both prove the final behavior
