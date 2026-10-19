# LingRoot Video Factory

Local, mock-first production system for YouTube Shorts and Instagram Reels.

Core promise: **Same topic. Your level.**

## Current phase

Phase 1 is complete and remains the deterministic regression baseline:

- TypeScript CLI
- mock LingRoot, image and render adapters
- local filesystem output
- semantic QA and production reports
- scheduler preview/smoke test

Phase 2 adds real adapters one boundary at a time. LingRoot Core API, OpenAI
image generation, Supabase Storage and JSON2Video render boundaries are
implemented. `dry-run` must still force mock/local adapters. Real provider
traffic is allowed only through explicit `*:check` commands until end-to-end
signed asset delivery and production orchestration are enabled.

Phase 3 YouTube boundaries include resumable private-first video upload,
duplicate-safe playlist management and review-gated public release. Publishing
remains outside `produce`/`daily`; the explicit `approve` + `release` path owns
all YouTube mutations.

## Source-of-truth order

When documentation conflicts, use this precedence:

1. JSON Schemas in `schemas/`
2. Runtime configuration in `config/` and `.env.example`
3. Architecture decisions in `docs/architecture/decisions/`
4. This file
5. Product and runbook documentation in `docs/`
6. The archived original brief under `gkn/`

Resolve conflicts explicitly; do not silently implement two competing models.

## Critical visual invariant

Each topic owns exactly one shared visual manifest and one scene order.

All produced CEFR levels reuse that manifest:

- A1
- A2
- B1
- B2
- C1
- C2

Level packages must not contain independent image or scene arrays. Only these
elements may vary by level:

- script
- audio
- subtitles
- speaking rate
- level badge
- YouTube metadata
- Instagram metadata

Enforce the rule structurally in schemas and semantically in QA.

## Architecture boundaries

Dependency direction:

```text
CLI → workflows → service interfaces → adapters
                ↘ QA/core
```

- `src/core/`: contracts, validation, config, filesystem and logging.
- `src/services/`: provider-neutral interfaces and domain builders.
- `src/adapters/`: mock/local or future provider implementations.
- `src/workflows/`: orchestration only.
- `src/qa/`: semantic package and artifact checks.
- `src/cli/`: argument parsing and process exit behavior.

Workflows must depend on service interfaces, not concrete external providers.
Real providers must be replaceable without rewriting workflow logic.

## Fixed rules

- Never use n8n.
- Never commit `.env`.
- Never log or write secrets into generated packages or reports.
- Default to `PUBLISH_MODE=review`.
- `PUBLISH_MODE=auto_public` also requires `AUTO_PUBLIC_PUBLISH=true`.
- Phase 1 performs no external API calls.
- Every run emits `topic-package.json`, `qa-report.json` and
  `production-report.json`.
- Generated artifacts live under `outputs/` and remain git-ignored.

## Production modes

- `dry-run`: six levels, mock adapters, small shared scene set.
- `test-single-level`: one selected level, two shared scenes.
- `test-six-levels`: six levels, two shared scenes.
- `production`: six levels and configured scene count; still mock-only while
  `DRY_RUN=true`.

## Definition of done

A Phase 1 change is complete only when:

```bash
npm run typecheck
npm test
npm run validate:schemas
npm run dry-run
npm run qa
npm run scheduler:test
npm run build
```

All commands must pass without network access.

When changing the LingRoot Core integration, local contract tests must also
cover authentication, timeout/retry behavior, schema validation and shared
scene references. `npm run core:check` is manual because it requires configured
network credentials.

When changing image generation:

- plan scenes separately from provider calls;
- generate exactly once per shared scene, never once per CEFR level;
- keep moderation `auto`;
- validate binary format and non-secret provenance;
- keep `npm run image:check` manual because it has real API cost.

When changing storage:

- treat buckets as private unless explicitly documented otherwise;
- never emit service-role credentials or authenticated download URLs;
- reject absolute and traversal object keys;
- retry uploads only when the operation is explicitly idempotent/upsert;
- verify upload/download/delete with `storage:check`.

When changing rendering:

- preserve the shared scene order in the provider movie JSON;
- require renderer-accessible HTTP(S) image/audio/subtitle sources;
- never retry non-idempotent movie submission blindly;
- retry only status polling and final video download;
- hard-fail async `error`/`timeout`, resolution drift and invalid MP4 output.

For real integration checks:

- default to one level, one scene and short duration;
- sign private asset URLs only for longer than the render poll timeout;
- never persist signed URL query tokens or Core asset URLs;
- remove temporary remote image objects in `finally`;
- keep real multi-provider checks manual and outside the default test suite.

For YouTube publishing:

- Phase 3 starts with private-only resumable uploads;
- reject metadata that is not explicitly `privacyStatus=private`;
- set `notifySubscribers=false`;
- keep OAuth access/refresh tokens out of logs and output;
- query resumable session state before retrying ambiguous video uploads;
- create playlists with the gated release target privacy;
- find an exact-title owned playlist before creating it;
- reject an existing exact-title playlist when it conflicts with a private
  target; an explicit public target may promote the owned playlist;
- check `playlistItems.list` before inserting a video to prevent duplicates;
- keep playlist mutations behind the explicit `youtube:playlist-check`;
- public video and playlist updates require both `PUBLISH_MODE=auto_public` and
  `AUTO_PUBLIC_PUBLISH=true`, and only run after QA-backed operator approval;
- never attach public publishing to `produce`, `daily` or an unapproved run.

The generated package must contain:

- one common image manifest
- one level directory per requested level
- mock script, audio, SRT, VTT and video artifacts
- render payloads
- YouTube and Instagram metadata
- package-level and level-level QA reports
- production report

Hard-fail QA when:

- a requested level is missing or duplicated
- topic IDs disagree
- a script/subtitle references an unknown shared scene
- an expected artifact is missing
- render status failed
- required metadata is missing
- generated output appears to contain a secret

## Documentation ownership

- `README.md`: contributor setup and command reference.
- `docs/product/`: product intent and scope.
- `docs/architecture/`: architecture and durable decisions.
- `docs/runbooks/`: operational procedures.
- `docs/roadmap.md`: status, milestones and next work.
- `gkn/CodexYapilan.md`: mandatory shared work/coordination log.
- Other files under `gkn/`: original source material; not active contracts.

## Shared work log

Before starting work, read `gkn/CodexYapilan.md` and `git status --short`.

For every implementation or documentation task:

1. Record the task and owned files under its active-work section before making
   broad changes when parallel work is possible.
2. Update the log after completing the work with files changed, validation
   results, remaining risks and the next planned step.
3. Never mark unverified work complete.
4. Preserve entries written by other workers.

Keep this file concise. Put explanations and operational detail in `docs/`.
