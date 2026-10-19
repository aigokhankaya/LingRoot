---
name: lingroot-video-factory
description: Orchestrate and validate LingRoot topic packages that reuse one shared visual manifest across A1-C2. Use when creating a dry-run package, changing the production workflow, inspecting generated outputs, or reviewing compliance with the "Same topic. Your level." invariant.
---

# LingRoot Video Factory

1. Read `CLAUDE.md`, relevant schemas and `config/` before changing the pipeline.
2. Keep one `VisualScenes` manifest per topic. Never place images or scenes in a
   level package.
3. Route orchestration through `src/workflows/` and providers through service
   interfaces.
4. Default to mock adapters, `DRY_RUN=true` and `PUBLISH_MODE=review`.
   Use `npm run core:check` only for an explicit LingRoot Core HTTP check.
5. Generate topic, level, social, QA and production artifacts under `outputs/`.
6. Run the complete Definition of Done command set from `CLAUDE.md`.
7. Stop on missing levels, invalid scene references, missing artifacts, render
   failure or suspected secret leakage.
