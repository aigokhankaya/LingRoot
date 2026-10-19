# src/services

Provider-neutral service contracts and deterministic domain builders. Phase 1
includes LingRoot/image/render/storage interfaces and social metadata builders.

All external calls go through `src/adapters/`. In Phase 1 everything is mocked
or local.

The LingRoot Core service also owns the versioned scene-aware request builder
used by both mock and HTTP implementations.

Visual scene planning is provider-independent. `ImageClient` only accepts a
validated single-scene generation request and returns bytes plus provenance.

`StorageClient` uses normalized object keys and exposes store/retrieve/remove.
Cloud adapters return canonical provider paths without assuming public access.
Private cloud adapters can create short-lived read URLs for renderer access;
these URLs must remain transient.

The JSON2Video movie builder converts one provider-neutral `RenderPayload` into
an ordered custom 1080×1920 movie document and rejects inaccessible local refs.

`YouTubeClient` exposes private video upload plus private playlist ensure and
duplicate-safe item insertion. Public publishing and metadata cross-link
updates remain separate milestones.
