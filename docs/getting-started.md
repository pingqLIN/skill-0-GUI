# Guided Local Review

Traditional Chinese companion:
[getting-started.zh-tw.md](./getting-started.zh-tw.md)

This guide runs one complete, demo-safe Skill-0 Review Studio workflow. It uses
the real application and built-in sample material; it does not execute a skill,
read a private repository, or prove canonical equivalence.

## 1. Start the development workspace

Prerequisites:

- Node.js 20 (CI baseline)
- npm

Install the locked dependencies:

```bash
npm ci
```

For this demo-safe walkthrough, force standalone mode so the app does not probe
or expose a local canonical-parser checkout.

PowerShell:

```powershell
$env:SKILL0_MODE = 'standalone'
npm run dev
```

macOS or Linux:

```bash
SKILL0_MODE=standalone npm run dev
```

Open:

- <http://127.0.0.1:5173/> for the review workspace
- <http://127.0.0.1:5173/demo> for the public demo entry

`VITE_PORT` overrides `5173`. Always use the address printed by Vite when a
custom port is configured.

## 2. Learn the product boundary

The `/demo` entry explains the four product stages: intake, validation, review,
and export. Its evidence sheet is display content for orientation, not parser
execution evidence.

![Public demo entry with the four-stage review flow](assets/readme/01-demo-entry-desktop.png)

Select **Open demo workspace** to enter the task-first intake.

## 3. Prepare a safe source

Choose **Open a demo workspace**. The app inserts a built-in `SKILL.md` sample
and highlights the next analysis action.

![Task-first intake with the safe demo selected](assets/readme/02-guided-intake-desktop.png)

For your own material, choose the input that matches the review:

| Review goal | Available source path |
|---|---|
| One skill | Paste a `SKILL.md`, import a supported URL, or use a compatible file |
| Skill bundle | Import files, a folder, or ZIP; then choose the primary skill |
| Continue work | Restore one of the browser-local drafts |
| Learn the flow | Use the built-in demo-safe sample |

Before using private material, confirm that the active runtime and hosting
environment are approved for that data.

## 4. Analyze and inspect the evidence rail

Select **Analyze Skill**. When analysis finishes:

1. confirm the parser mode banner;
2. review blocking issues in the persistent rail;
3. inspect validation, consistency, path, and source evidence;
4. open an issue in the structured editor only after understanding its evidence;
5. rerun the relevant checks after a material edit.

![Workspace showing parser mode, blocking issues, and export readiness](assets/readme/03-review-workspace-evidence.png)

The screenshot uses the bundled standalone parser. `Fallback preview only`
means the result is useful for compatibility review but is not strict canonical
equivalence proof.

## 5. Record the decision and satisfy the export gate

Use the review workspace to record:

- reviewer notes and issue-level notes;
- review status;
- reviewer summary;
- decision log;
- sign-off identity;
- the four sign-off checks;
- handoff state.

Formal exports stay locked until the review state, sign-off checks, and blocking
evidence allow them.

![Reviewer decision drawer showing the incomplete review gate and next action](assets/readme/04-review-decision-gate.png)

This is an intentional trust boundary. A scenario title or completed edit does
not itself grant approval.

## 6. Export the appropriate artifact

When the UI reports that formal exports are available, open **Action Tray** and
choose the artifact that matches the consumer:

| Artifact | Consumer |
|---|---|
| Review report (`.md`) | Human reviewer or release handoff |
| Review packet (`.json`) | Governance or automation tooling |
| Skill export (`.skill.md`) | Reviewed content handoff |
| SkillDocument (`.skill.json`) | Structured downstream integration |

Standalone and LLM-assisted outputs retain their mode limitations in exported
metadata. If the UI requires a canonical rerun, complete that rerun before
treating the artifact as final evidence.

## 7. Run the deployable server

Build and start the Node/Express runtime:

```bash
npm run build
npm start
```

The server defaults to <http://127.0.0.1:4173>. Confirm runtime health:

```text
GET /healthz
GET /api/bridge-status
```

For a self-contained public profile, use:

```text
SKILL0_MODE=standalone
VITE_ENABLE_3D=false
```

Do not set `SKILL0_PARSER_ROOT` or `SKILL0_ROOT` in that profile.

## 8. Verify the repository

Run the narrowest relevant check first. Before merging a documentation or UI
change, run the complete repository gate:

```bash
npm run lint
npm test
npm run docs:check
npm run verify:build-size
npm run verify:public-build
npm run test:e2e
```

Regenerate this guide's screenshots from the real app:

```bash
npm run docs:capture-screenshots
```

The capture command:

- forces `SKILL0_MODE=standalone`;
- uses the built-in demo-safe scenarios;
- uses repo-local Playwright at 1440 × 1024;
- writes documentation images to `docs/assets/readme/`;
- may write Playwright diagnostics to `.playwright-cli/test-results/` after a failed run;
- asserts the visible product state before each capture.

## Trust checklist

Before treating a review as complete:

- [ ] Active parser mode is visible and recorded.
- [ ] Blocking validation, consistency, and path findings are resolved or explicitly accepted.
- [ ] Material edits have been rechecked.
- [ ] Review status, summary, checklist, and sign-off are complete.
- [ ] Export metadata correctly states equivalence and canonical rerun requirements.
- [ ] No secret, private path, or unrelated source appears in screenshots or exports.

Normative references:

- [Mode and equivalence contract](shared/02-mode-and-equivalence-contract.md)
- [Parser contract](shared/01-parser-contract.md)
- [Deployment and configuration](06-deployment-operations-and-configuration.md)
