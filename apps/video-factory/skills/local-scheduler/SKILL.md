---
name: local-scheduler
description: Prepare, test and review the macOS local scheduler for LingRoot Video Factory. Use when changing scheduler.json, generating a launchd plist, running scheduler smoke tests, troubleshooting daily runs, or documenting install and removal steps.
---

# Local Scheduler

1. Keep scheduling separate from production logic; invoke the deterministic CLI.
2. Prefer macOS launchd and retain cron only as a documented fallback.
3. Run `npm run scheduler:test` before installation.
4. Generate a plist preview under `outputs/scheduler/`; do not load it silently.
5. Use an absolute project path and write stdout/stderr under `logs/`.
6. Keep concurrency at one and publishing in review mode.
7. Never use n8n as a scheduler.
