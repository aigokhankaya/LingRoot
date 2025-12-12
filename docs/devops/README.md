# DevOps Documentation Overview

**Last Updated:** December 2025  
**Scope:** Dev environment, configuration, production deploy, scaling

This file serves as an entry point for all DevOps‑related documentation in the `docs/devops/` folder.

---

## Files in This Folder

- `local-setup.md`  
  Step‑by‑step guide for running LingRoot locally:
  - Required tools and environment
  - Backend and frontend startup
  - Basic troubleshooting tips

- `environment-variables.md`  
  Central reference for all environment variables used across:
  - Backend
  - Frontend
  - Mobile (where applicable)
  - External integrations (OpenAI, Google TTS, Supabase, etc.)

- `production-deploy.md`  
  Production deployment guide covering:
  - Backend behind Cloudflare Tunnel
  - Web frontend deploy (Next.js)
  - Mobile app configuration for production API
  - Migration and secrets management guidelines

- `scaling-strategy.md`  
  High‑level strategy for:
  - Scaling backend API instances
  - GPU/MFA workers and queue‑based processing
  - Database and storage scaling on Supabase / R2
  - Monitoring, alerting, and cost management

---

## How to Use These Docs

- **New developer / operator:**
  1. Read `local-setup.md` to get a working dev environment.
  2. Review `environment-variables.md` before touching any `.env` files.

- **Preparing a production deployment:**
  1. Follow `production-deploy.md` end‑to‑end.
  2. Cross‑check resource and scaling assumptions in `scaling-strategy.md`.

- **Making infra changes:**
  - Update the relevant file(s) here **in the same PR** as the code/infra change, so docs stay in sync with reality.

---

## Related Documentation

- `../architecture/system-overview.md` – Overall architecture
- `../architecture/ai-pipeline.md` – AI/TTS pipeline
- `../database/schema-overview.md` – Database schema
- `../integrations/cloudflare.md` – Cloudflare Tunnel setup details

