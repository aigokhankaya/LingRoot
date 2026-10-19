# src/adapters

Boundary to the outside world: LingRoot Core API, image provider, storage,
render engine, YouTube, Instagram and Google.

Phase 1 includes mock LingRoot, image and render adapters plus local storage.
**No external API calls are permitted while `DRY_RUN=true`.**

Phase 2 includes the versioned HTTP LingRoot Core adapter. Normal dry-run still
forces the mock adapter; use `npm run core:check` for an explicit real
connection check.

It also includes the OpenAI Image API adapter. Scene planning remains in the
service layer; the adapter only generates one binary image for one shared
scene. Use `npm run image:check` for an explicit paid API check.

Supabase Storage is the first cloud storage adapter. Buckets remain private,
service-role credentials stay server-side and `npm run storage:check` performs
an explicit upload/download/delete round trip.

JSON2Video is the first real render adapter. It submits once, polls
asynchronously, validates the final status/resolution and downloads an MP4.
Use `npm run render:check` with renderer-accessible asset URLs.

YouTube Phase 3 begins with private-only resumable uploads. OAuth tokens are
refreshed server-side, subscriber notifications are disabled and interrupted
uploads query the session offset before resuming. The same adapter can find or
create exact-title owned private playlists and performs a membership lookup
before inserting a video, so repeated commands remain duplicate-safe.
