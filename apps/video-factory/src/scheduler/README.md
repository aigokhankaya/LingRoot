# src/scheduler

Local scheduling of production runs from the content calendar. Phase 1
generates a launchd preview and performs a smoke test without loading a real
LaunchAgent. Config lives in `config/scheduler.json`.

> Reminder: **n8n is forbidden** — no schedule triggers/webhooks. Scheduling is
> a plain local process.
