# Skill-0 Review Studio

This English release set is the publishable semantic authority. Traditional
Chinese companion: [../zh-TW/README.md](../zh-TW/README.md)

`Skill-0 Review Studio` turns Skill-0 parser output into a visible,
evidence-aware review, decision, and export workflow.

## Public release posture

- deploy in `standalone` mode
- disable the optional 3D workspace in public builds
- keep parser mode, evidence boundaries, review status, and export gates visible
- treat standalone exports as compatibility-review artifacts, not strict
  canonical-equivalence evidence
- treat LLM-assisted recovery as draft-only
- keep drafts browser-local; do not imply server-backed persistence or
  multi-user review history

## Start here

- [Guided local review](../../getting-started.md)
- [Features](./FEATURES.md)
- [Deployment](./DEPLOYMENT.md)
- [Complete documentation hub](../../README.md)
- [Mode and equivalence contract](../../shared/02-mode-and-equivalence-contract.md)

## Verification evidence

The dated [task-first hardening integration report](../../28-task-first-review-hardening-integration-2026-07-29.md)
records its commit-scoped lint, test, build, browser, accessibility, and CI
evidence. Rerun the current repository gates before release; a dated report is
not automatic proof of the current checkout.
