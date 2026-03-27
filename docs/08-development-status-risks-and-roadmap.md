# Chapter 8. Development Status, Risks, and Roadmap

Back to index: [README.md](./README.md)

Related chapters:
- [01-project-overview.md](./01-project-overview.md)
- [05-frontend-workbench.md](./05-frontend-workbench.md)
- [06-deployment-operations-and-configuration.md](./06-deployment-operations-and-configuration.md)
- [09-complex-skill-analysis-spec.md](./09-complex-skill-analysis-spec.md)
- [10-complex-skill-risk-schema.md](./10-complex-skill-risk-schema.md)
- [11-evidence-based-warning-template.md](./11-evidence-based-warning-template.md)
- [12-ui-design-review-2026-03-23.md](./12-ui-design-review-2026-03-23.md)
- [13-ui-rebuild-backlog.md](./13-ui-rebuild-backlog.md)
- [14-ui-and-remaining-development-plan-2026-03-24.md](./14-ui-and-remaining-development-plan-2026-03-24.md)

## 8.1 Current Status

The project is currently in a recovered integration state.

What is true now:

- canonical bridge to `/home/miles/dev2/skill-0` works
- standalone fallback mode works
- a deployable external-web runtime exists
- the source-driven frontend baseline has been restored
- Vitest now covers the restored app shell, bridge services, bridge internals, Express routes, and live API integration
- the frontend exposes parser mode in the workspace shell so reviewers can distinguish canonical output from fallback output
- the heaviest workbench modules now load lazily instead of shipping only as a monolithic first-load bundle
- `VectorSpace` now defaults to a lightweight review-map surface and loads the 3D workspace only on explicit demand
- documentation for external review now exists
- development and production runtimes share the same bridge logic
- the current CI workflow checks entrypoints, TypeScript, mirrored docs, tests, and the production build
- `npm run build` and `npm test` are currently green in the working tree

## 8.2 Major Improvements Completed

### Bridge repair

Resolved:

- wrong canonical root path
- unconditional `wsl` execution in Linux/WSL
- failing `/api/example-skill`
- failing `/api/parse-skill`

### Resilience

Added:

- standalone parser fallback
- bundled sample skill
- forced standalone mode via `SKILL0_MODE=standalone`

### Deployment readiness

Added:

- `server.mjs`
- `npm start`
- public-web-suitable runtime path

### Documentation

Added:

- this full chaptered documentation set

## 8.3 Main Risks Still Present

### Bundle size and source hardening debt

The source-driven UI has been restored and the heaviest modules have been split into lazy chunks. `VectorSpace` now uses a map-first design and defers 3D loading, but the 3D workspace still produces a very large secondary bundle and the application has not yet completed its accessibility and structural hardening pass.

Impact:

- maintainability is much better than before
- first load is materially better than before, but production polish and performance still need work

### Fallback parser non-identity

Standalone mode is compatible, not identical.

Impact:

- useful for public deployment and demos
- not suitable for claiming strict canonical equivalence in all cases

### Legacy dependency shape

The bundle required `@emotion/is-prop-valid` even though the package manifest did not previously declare it explicitly.

Impact:

- indicates the current asset/dependency state may still have historical drift

### Vite dev parity gap

The Express runtime and the Vite dev middleware share the same bridge logic, but the Vite side still benefits from explicit automated parity coverage.

Impact:

- runtime behavior is aligned in practice
- the development server should continue to be protected by dedicated API parity tests

## 8.4 Recommended Next Steps

### Priority 1

Harden the restored `src/` application tree instead of treating source restoration itself as the blocker.

Selective rebuild guidance:

- continue rebuilding high-friction modules incrementally
- do not default to a full UI rewrite while measured, isolated rebuilds are still working

### Priority 2

Add automated tests for:

- `GET /api/bridge-status`
- `GET /api/example-skill`
- `POST /api/parse-skill`

in both:

- Vite dev mode

Status:

- Express runtime mode now has automated route and live integration coverage
- Vite dev middleware parity still needs explicit automated coverage

### Priority 3

Add fixture-based comparison tests between:

- canonical parser output
- standalone parser output

### Priority 4

Expose bridge mode visually in the frontend so end users can tell whether they are reviewing canonical or fallback-derived results.

Status:

- completed for the main workspace shell
- still needs stronger user-facing explanation inside exported reports and review summaries

### Priority 5

Decide product strategy:

- keep `skill-0-GUI` as an independent external-facing site
- or fold its strongest UI ideas into the main `skill-0` dashboard ecosystem

### Priority 6

Implement the complex-skill analysis extension set defined in:

- [09-complex-skill-analysis-spec.md](./09-complex-skill-analysis-spec.md)
- [10-complex-skill-risk-schema.md](./10-complex-skill-risk-schema.md)
- [11-evidence-based-warning-template.md](./11-evidence-based-warning-template.md)

This is the most direct path to turning the existing parser bridge and fallback parser into a reviewer-useful system for large multi-skill graphs.

### Priority 7

Treat the UI review as a tracked-design-model issue, not as proof that the current runtime layer is source-complete.

Use:

- [12-ui-design-review-2026-03-23.md](./12-ui-design-review-2026-03-23.md)
- [13-ui-rebuild-backlog.md](./13-ui-rebuild-backlog.md)

to sequence:

- source restoration or reconstruction
- accessibility baseline work
- responsive safety
- design-token normalization
- shell and hook refactoring

### Priority 8

Use the integrated execution plan in:

- [14-ui-and-remaining-development-plan-2026-03-24.md](./14-ui-and-remaining-development-plan-2026-03-24.md)

to sequence the remaining work across:

- source restoration
- UI baseline quality
- bridge/runtime confidence
- complex-skill review intelligence
- release and operations hardening

## 8.5 Delivery Statement

The project is no longer blocked by bridge failure. It is now:

`deployment-capable, reviewable, fallback-safe, and architecturally clearer than before`

Its remaining problems are mostly about UI hardening, Vite-side runtime confidence, bundle size, and long-term maintainability.
