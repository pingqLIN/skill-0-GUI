---
name: standalone-skill
description: Built-in fallback sample used when the main skill-0 repository is unavailable.
---

# Standalone Skill Demo

Use this sample to validate the GUI even when the main `skill-0` repository is offline.

## Workflow

- Parse the submitted skill markdown into actions, rules, and directives.
- Visualize the resulting decomposition graph and delivery phases.
- Highlight rule density, operability, and risk indicators for review.

## Rules

- Always validate uploaded content before extracting skill structure.
- Never block the whole session when the primary bridge is unavailable.
- Prefer the external `skill-0` parser when it can be reached successfully.

## Principles

The GUI should remain useful as a standalone analysis surface. If the shared parser cannot be reached, the app should fall back to a local parser that preserves the same high-level decomposition contract and keeps the visual workflow available.
