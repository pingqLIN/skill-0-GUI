# 20. Online Demo Plan

Back to index: [README.md](./README.md)

Related docs:

- [06-deployment-operations-and-configuration.md](./06-deployment-operations-and-configuration.md)
- [08-development-status-risks-and-roadmap.md](./08-development-status-risks-and-roadmap.md)
- [github-hosting-strategy-2026-03-23.md](./github-hosting-strategy-2026-03-23.md)
- [shared/02-mode-and-equivalence-contract.md](./shared/02-mode-and-equivalence-contract.md)

## 20.1 Goal

Ship an online demo that is easy for external reviewers to understand within a few minutes, without overstating what the product or parser guarantees.

The demo should optimize for:

- fast onboarding
- honest parser-mode messaging
- clear reviewer workflow storytelling
- low operational complexity

## 20.2 Recommended First Demo Profile

Use a standalone public deployment first.

Recommended settings:

- `SKILL0_MODE=standalone`
- `VITE_ENABLE_3D=false`
- deploy through `server.mjs` on a Node-capable host

Why this profile first:

- no dependency on local filesystem parser roots
- lower risk than a canonical-bridge external deployment
- easier to explain to new users
- lighter bundle and simpler support posture

## 20.3 Demo Audience

Primary audience:

- reviewers
- maintainers
- technically literate external evaluators

Secondary audience:

- new contributors
- operators evaluating hosting posture

The first version should not optimize for general consumer traffic.

## 20.4 Demo Narrative

The demo page should walk users through a short, predictable story:

1. what Skill-0 Review Studio is
2. what canonical mode vs standalone mode means
3. how a reviewer goes from input to sign-off
4. what gets exported as review evidence
5. where to read deeper documentation

## 20.5 Recommended Demo Page Sections

### Hero

- short explanation of the product
- one honest sentence about standalone demo scope
- clear CTA to open the workspace

### Why it exists

- parser output alone is not a review workflow
- reviewers need visible mode, evidence, and sign-off structure

### How it works

- intake
- validation and consistency
- notes and diff review
- summary, sign-off, and export

### Trust and fidelity

- explain canonical vs standalone
- link directly to the shared mode/equivalence contract

### Example artifacts

- review report
- SkillDocument JSON
- `.skill.md`

### Docs and next steps

- README
- docs index
- deployment guide
- roadmap

## 20.6 Product Constraints To Keep Visible

The demo must clearly state:

- which parser mode produced the result
- whether the output is compatibility-oriented or canonical
- that standalone mode is not strict equivalence proof
- that local draft persistence is browser-local, not shared collaboration

## 20.7 Technical Work Required

### Must-have

- choose hosting target
- confirm standalone public deployment profile
- prepare demo-safe seed content
- write mode/fidelity copy for the landing experience
- add obvious links to documentation

### Should-have

- add a dedicated demo route or landing wrapper
- provide one or two curated sample review scenarios
- add simple analytics or event logging for demo flows

### Later

- canonical internal demo environment
- shared reviewer sessions
- persistent review history

## 20.8 Copy Requirements

The demo should avoid vague or inflated language.

Safe positioning:

- review-first workspace
- standalone compatibility demo
- exportable review evidence
- reviewer sign-off workflow

Unsafe positioning without evidence:

- identical to canonical parser
- drop-in equivalent in all cases
- production-grade collaborative review platform

## 20.9 Deployment Recommendation

For the first online demo:

- use a Node-capable host
- keep the app in standalone mode
- disable 3D
- prioritize stability, clarity, and small operational surface

This is consistent with:

- [github-hosting-strategy-2026-03-23.md](./github-hosting-strategy-2026-03-23.md)
- [06-deployment-operations-and-configuration.md](./06-deployment-operations-and-configuration.md)

## 20.10 Execution Checklist

- [ ] choose hosting provider
- [ ] lock demo environment variables
- [ ] prepare demo-safe sample content
- [ ] write landing-page copy
- [ ] add documentation links from the demo surface
- [ ] smoke-test standalone mode end to end
- [ ] verify exported artifacts from the demo flow
- [ ] capture screenshots or a short walkthrough for reviewers

## 20.11 Recommended Next Slice

The next implementation slice for the online demo should be:

1. define the demo information architecture
2. add a lightweight landing/demo entry flow
3. wire curated examples and documentation links
4. verify the public standalone deployment profile
