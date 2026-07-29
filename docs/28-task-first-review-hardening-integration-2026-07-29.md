# Task-First Review Hardening Integration Report

Date: `2026-07-29`

Traditional Chinese companion: [28-task-first-review-hardening-integration-2026-07-29.zh-tw.md](./28-task-first-review-hardening-integration-2026-07-29.zh-tw.md)

## Objective

Complete the task-first Review Studio hardening integration stage on `main`, preserve the review evidence boundary, and make the new browser and accessibility contract repeatable in CI.

## Integrated Scope

`main` was fast-forwarded from `40e4b16` to `91e1c51`, integrating the ten commits from `codex/review-studio-hardening` without a merge commit or conflict.

The integrated behavior includes:

- task-first intake choices for a single skill, a skill bundle, saved drafts, and the demo workspace
- conditional intake controls for paste, URL, file/folder, and ZIP sources
- a five-record browser-local draft library with restore, edit, export, and confirmed delete actions
- editable imported sources before analysis
- reviewer-facing evidence boundaries in `PhaseDetails`
- desktop and mobile Playwright coverage
- serious and critical accessibility checks through `@axe-core/playwright`

## Verification Evidence

The following checks were run from the integrated `main` worktree:

| Check | Result |
|---|---|
| `npm run lint` | `VERIFIED` |
| `npm test` | `VERIFIED`: 147 passed, 2 skipped |
| `npm run verify:build-size` | `VERIFIED`: entry chunk below the 500 KiB gate |
| `npm run verify:public-build` | `VERIFIED`: 16 assets, no 3D entry/vendor chunk |
| `PLAYWRIGHT_PORT=43290 npm run test:e2e` | `VERIFIED`: 14 passed across desktop and mobile |
| task-owned dev-server cleanup | `VERIFIED`: port `43290` clear after the run |

The first isolated-port Playwright run completed its browser artifacts but the Windows runner did not exit after its managed web server finished. The runner was terminated, the task-owned server was reused for a clean second run with a formal zero exit code, and that server was then stopped by verified PID ownership. `playwright.config.ts` now accepts `PLAYWRIGHT_PORT` so local QA can avoid disrupting an existing Review Studio session.

## CI Continuity

`.github/workflows/ci.yml` now defines a separate `browser-qa` job that:

1. installs the locked npm dependencies,
2. installs Chromium with Playwright system dependencies, and
3. runs the same `npm run test:e2e` contract.

The integration was subsequently published through pull request `#9`. GitHub Actions run `30470757290` completed successfully at merge commit `a25be55`:

- `validate`: `VERIFIED`
- `browser-qa`: `VERIFIED`

The workflow's `actions/checkout` and `actions/setup-node` steps are maintained on their current Node 24-compatible major versions. Repository rules require both jobs to pass before changes can merge into `main`.

## Remaining Risk

- GitHub Dependabot currently reports zero open alerts; this does not replace a fresh package-manager audit.
- The standard build still emits the known large lazy 3D vendor chunk, while the enforced entry-size and public-build boundaries pass.
- The repository is public, but this integration did not perform a product deployment, tunnel change, or production runtime mutation.

## Stage Decision

The task-first Review Studio hardening integration criteria are satisfied locally and on GitHub-hosted CI. Future changes should continue through pull requests with `validate` and `browser-qa` as required checks.
