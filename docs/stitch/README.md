# Stitch Generation Pack

This folder contains a small, upload-ready package for generating a redesigned `Skill-0 Review Studio` interface in `https://stitch.withgoogle.com/`.

Use this pack when you want Stitch to generate a multi-screen web app concept that preserves the current product workflow and feature coverage.

## Files

- `skill-0-review-studio-summary.txt`
  - one-page product and feature summary
  - safe to upload as reference text
- `prompt-a-conservative-full-coverage.txt`
  - preserves the current reviewer workflow and full feature coverage
- `prompt-b-bold-redesign.txt`
  - preserves functionality but pushes the visual system further
- `screenshot-upload-checklist.md`
  - capture plan for the most useful screenshots to upload alongside the prompt

## Recommended Stitch Input

Use this order:

1. Choose `Web App`
2. Paste one prompt file into Stitch
3. Upload `skill-0-review-studio-summary.txt`
4. Upload 2-4 screenshots described in `screenshot-upload-checklist.md`

Do not upload:

- raw source files from `src/`
- locale JSON
- tests
- long planning or roadmap documents
- full repo archives

## Which Prompt To Start With

- Start with `prompt-a-conservative-full-coverage.txt` if you want a safer redesign that keeps the current reviewer workbench structure obvious.
- Use `prompt-b-bold-redesign.txt` if you want a more assertive visual rethink while keeping the same product loop and major functions.

## Source Basis

This pack is based on the current rebuild worktree:

- `.impeccable.md`
- `README.md`
- `docs/03-functional-modules.md`
- `docs/05-frontend-workbench.md`
- `src/content/sampleScenarios.ts`

## Follow-up Prompt Pattern

If Stitch invents extra features, use:

```text
Remove collaboration, chat, comments, cloud sync, and project management features. Keep only the current Skill-0 reviewer workflow and export surfaces.
```

If Stitch weakens information density, use:

```text
Keep the same structure, but increase information density with docked rails, tighter typographic hierarchy, stronger grouping, and persistent truth signals for parser mode, evidence status, and review decision.
```
