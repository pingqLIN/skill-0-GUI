# Chapter 1. Project Overview

Back to index: [README.md](./README.md)

## 1.1 Project Definition

`skill-0-GUI` is a visualization-oriented application for interpreting Skill-0 parser output. Its purpose is to turn parsed skill structures into an interactive analysis workspace that can be used for review, demonstration, exploration, and external presentation.

At a product level, it combines:

- skill ingestion
- parser invocation
- decomposition visualization
- phase-flow inspection
- risk-oriented review summaries
- export-oriented output handling

## 1.2 Primary Use Cases

The project supports three major usage modes:

1. Local integration workbench
   Used by a developer or operator who has access to the main `skill-0` repository and wants canonical parser results.

2. Standalone demo or resilience mode
   Used when the main `skill-0` repository is absent, unavailable, or intentionally excluded from deployment.

3. Public or external review website
   Used as a deployable web application that serves a frontend and matching API endpoints through `server.mjs`.

These modes are expanded in:
- [02-runtime-and-system-architecture.md](./02-runtime-and-system-architecture.md)
- [06-deployment-operations-and-configuration.md](./06-deployment-operations-and-configuration.md)

## 1.3 Repository State

The repository is currently in a transition state.

### Current runtime reality

The executable system today is built around:

- `dist/` for frontend delivery
- `vite.config.ts` for development-time APIs
- `server.mjs` for deployable runtime APIs and static delivery
- `bridge/skill0Bridge.mjs` for shared parser integration logic
- `standalone/` for bundled fallback assets

### Tracked source reality

The richer React workbench still exists in git `HEAD`, but its `src/` files are deleted in the current working tree. These tracked files remain important for documenting intended product scope and the original UI system.

This means the project is best described as:

`runtime-recovered and deployment-capable, with the richer source-driven UI model still partially detached from the live working tree`

This status is analyzed in:
- [05-frontend-workbench.md](./05-frontend-workbench.md)
- [08-development-status-risks-and-roadmap.md](./08-development-status-risks-and-roadmap.md)

## 1.4 Main Deliverables

The project currently delivers the following assets:

- a browser-served frontend entry through `dist/index.html`
- a development API layer embedded in Vite
- a production-oriented Node/Express server runtime
- a bridge to the canonical Skill-0 parser
- a bundled standalone fallback parser
- a bundled sample skill for offline or self-contained use
- documentation suitable for external review

## 1.5 Audience

The documentation and application are relevant to:

- engineering reviewers
- system integrators
- operators preparing a public or internal deployment
- external stakeholders who need to understand the parser-driven UI concept

## 1.6 Review Boundary

This project is not the canonical parser implementation itself. The canonical parser lives in `/home/miles/dev2/skill-0`. `skill-0-GUI` is the presentation and integration layer around that parser, with a compatibility-oriented fallback parser for standalone operation.

The parser boundary is detailed in:
- [04-bridge-parser-and-analysis.md](./04-bridge-parser-and-analysis.md)

## 1.7 Summary

In simple terms:

- `skill-0` is the canonical parser and underlying system of record
- `skill-0-GUI` is the visualization and interaction layer
- the GUI can now run with or without the canonical repository
- the deployable runtime is now suitable for future external website delivery
