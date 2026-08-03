# Chapter 3. Functional Modules

Traditional Chinese companion:
[03-functional-modules.zh-tw.md](./03-functional-modules.zh-tw.md)

Back to the [documentation hub](./README.md).

## 3.1 Task-first intake

The landing workspace starts with the review goal rather than exposing every
control at once:

1. **Review one skill** - paste text, import a supported URL, or prepare a
   compatible source file.
2. **Review a skill bundle** - import files, a folder, or ZIP, select the
   primary skill, inspect supporting files, and edit sources before analysis.
3. **Continue a saved draft** - restore, export, continue, or confirm deletion
   of a browser-local draft.
4. **Open a demo workspace** - load built-in demo-safe content and follow the
   complete review path.

The intake rail keeps active parser mode, draft state, recent activity, review
readiness, and export readiness visible.

## 3.2 Source preparation

The upload preparation layer:

- normalizes supported file input;
- identifies candidate primary skill files;
- distinguishes primary and context roles;
- expands ZIP input through the dynamic JSZip path;
- blocks unsafe or ambiguous bundle conditions;
- makes imported source content editable before parser execution.

URL intake supports explicitly resolved remote sources and returns clear
user-facing errors for unsupported or unsafe requests.

## 3.3 Parser integration

The frontend posts review material to `/api/parse-skill`. Shared integration
logic in `bridge/skill0Bridge.mjs` chooses:

- the configured canonical Skill-0 parser;
- the bundled standalone fallback;
- an optional server-side LLM-assisted recovery adapter.

Every result carries mode and provenance information. The mode determines the
allowed equivalence language and export posture.

## 3.4 Review workspace

The post-analysis workspace combines:

- an executive summary and parser metrics;
- decomposition, pipeline, vector, and compliance views;
- a persistent review rail;
- prioritized blocking issues;
- source and supporting-file context;
- parser findings and provenance;
- validation, consistency, and path-test evidence;
- review decision and handoff state.

The interface keeps unavailable evidence explicit. Workspace-level checks must
not be presented as proof that an individual phase executed.

## 3.5 Editing and revalidation

Reviewers can:

- open blocking issues in the structured editor;
- edit source-oriented or SkillDocument fields;
- inspect JSON when structured context is required;
- track modified paths;
- compare current and original content;
- undo or reset edits;
- rerun relevant checks after material changes.

Editing does not silently upgrade parser equivalence. Exports can require a
canonical rerun after material changes.

## 3.6 Review decision and sign-off

The decision layer records:

- global and element-level notes;
- review status;
- reviewer name and summary;
- decision log;
- sign-off identity;
- four sign-off checks;
- handoff state;
- export-blocking reasons.

Formal exports are enabled only when status, checklist, and blocking evidence
satisfy the handoff gate.

## 3.7 Outputs

The workspace can produce:

- a human-readable review report;
- a machine-readable review packet;
- `.skill.md`;
- `.skill.json`;
- `.draft.json` for browser-local continuation.

Mode, equivalence, `canonical_rerun_required`, and draft-only fields remain part
of the export contract.

## 3.8 Persistence and localization

- Workspace drafts are stored in browser-local IndexedDB.
- Reviewer decision state is stored locally for the active browser profile.
- The public runtime does not provide server-backed shared persistence.
- The reviewer UI supports English and Traditional Chinese.

Local storage is a convenience and recovery feature, not a collaboration or
retention guarantee.

## 3.9 Verification surfaces

Current repository tests cover:

- task-first keyboard navigation;
- browser-local draft restore and export;
- issue-to-editor routing;
- editable bundle sources;
- desktop and mobile viewport bounds;
- serious and critical accessibility violations;
- parser, server route, and export contracts.

Use the current source and test output for verification. Dated reports record
point-in-time results only.
