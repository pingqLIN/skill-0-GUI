# Skill-0 Review Studio

`Skill-0 Review Studio` is a review-first workspace for Skill-0 parser output.

Current public release posture:

- deploy in `standalone` mode
- disable the interactive 3D workspace in public builds
- keep the lightweight review map, parser surfaces, and export flow
- treat standalone exports as compatibility-review artifacts, not strict canonical-equivalence evidence
- treat this release as a public beta, not a persistence-backed final product

Current engineering state:

- type check passes
- tests pass
- production build passes
- shared-doc sync check passes
- production-style standalone server and API routes have been verified locally

Core docs:

- [Features](./FEATURES.md)
- [Deployment](./DEPLOYMENT.md)
