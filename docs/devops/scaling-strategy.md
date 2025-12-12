# Scaling Strategy

**Last Updated:** December 2025  
**Phase:** Phase 4 – Scaling (see PROJECT_MEMORY.md)

This document describes how LingRoot should scale when usage increases, focusing on backend workers, GPU tasks, database, and delivery.

---

## 1. Goals

- Maintain low latency for TTS and AI chat
- Keep audio pipeline stable under high load
- Control cost of GPU workers and external APIs
- Preserve data integrity and security

---

## 2. Backend API Scaling

### 2.1 Horizontal Scaling

- Run multiple backend instances behind a load balancer.
- Stateless design: user session is carried in JWT, not server memory.
- Shared services:
  - Supabase (DB + Auth)
  - Storage (R2 / Supabase Storage)

### 2.2 Rate Limiting & Throttling

- Implement per-user and per-IP rate limits for:
  - TTS processing endpoints
  - AI chat endpoints
- Use built-in middleware or an external gateway (e.g. Cloudflare rules) to protect from abuse.

### 2.3 Caching

- Cache static configuration (voices list, plan configs) in memory or a small KV store.
- Consider caching frequently accessed content (e.g. book metadata) with TTL.

---

## 3. GPU Workers & Audio Pipeline

From `PROJECT_MEMORY.md` Phase 4:

- GPU workers on **Hetzner** nodes (40–48 GB VRAM)
- MFA tasks are **queue-based**
- Whisper threads auto-balanced

### 3.1 Whisper + MFA Workers

- Deploy workers as separate processes/services from the main API.
- Use a queue (e.g. Redis, database-backed queue, or managed queue) for:
  - Whisper transcription jobs
  - MFA realignment jobs

Scaling rules:
- Increase worker count when queue depth or processing time exceeds thresholds.
- Decrease workers when utilization is low to save cost.

### 3.2 TTS Chunking Rules

- Respect max segment length (≈1500 characters) to:
  - Avoid timeouts
  - Parallelize long texts
- Use concurrent requests to TTS providers up to a safe limit, then queue.

---

## 4. Database & Storage

### 4.1 Supabase / PostgreSQL

- Monitor:
  - CPU, RAM, I/O utilization
  - Connection count
  - Slow queries
- Optimizations:
  - Add indexes consistent with query patterns
  - Archive or prune old logs where safe
  - Use read replicas if read-heavy workloads emerge

### 4.2 Storage (Cloudflare R2 & Supabase Storage)

- Store long-lived audio (TTS outputs) in **Cloudflare R2** for cost efficiency.
- Store user-generated content and smaller assets in **Supabase Storage**.
- Enable lifecycle policies for rarely accessed objects (e.g. cold storage).

---

## 5. CDN & Edge

- Place static assets (web) and media behind a CDN (Cloudflare).
- Ensure caching headers are set correctly for:
  - JS/CSS bundles (immutable with hashes)
  - Images and icons
  - Public audio previews (if any)

---

## 6. Observability

### 6.1 Metrics

Track at minimum:
- Request rate and latency (p50, p95, p99)
- Error rate (4xx, 5xx)
- Queue depth for GPU/MFA workers
- DB CPU / memory usage

### 6.2 Logging

- Structured logs from backend and workers
- Centralized log storage with filters (by user ID, request ID)

### 6.3 Alerts

Set alerts for:
- High error rate
- Long queue times for audio/MFA jobs
- DB near resource limits

---

## 7. Cost Management

- Monitor:
  - OpenAI usage per user / per month
  - Google TTS character usage
  - GPU instance hours
- Implement quotas at plan level (see subscription plans) to cap expensive workloads.

---

## 8. Rollout Strategy

- Use **canary releases** for risky backend changes.
- Gradually enable new features for a percentage of users.
- Maintain backwards compatibility in API and database migrations where possible.

---

## Related Documentation

- [Production Deployment Guide](./production-deploy.md)
- [System Overview](../architecture/system-overview.md)
- [Database Schema Overview](../database/schema-overview.md)
- [Audio Pipeline](../architecture/ai-pipeline.md)
