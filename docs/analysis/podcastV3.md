# Podcast V3 Technical Design

## Purpose

This document defines a new podcast generation architecture named `podcastV3`.

Goals:

- Reduce end-to-end podcast generation latency
- Reduce Google Gemini TTS quota pressure
- Remove nested fallback chains and duplicated synthesis logic
- Preserve selected speaker intent consistently across primary and fallback providers
- Make production behavior observable and debuggable
- Keep rollout safe behind `PODCAST_TYPE=v3`

Non-goals:

- Rewriting unrelated TTS flows
- Migrating existing historical podcast rows immediately
- Replacing all legacy podcast code in the first release

---

## Runtime Gate

`podcastV3` must be enabled only when:

```env
PODCAST_TYPE=v3
```

Behavior rules:

- If `PODCAST_TYPE=v3`, backend routes use the new V3 orchestrator
- If `PODCAST_TYPE` is anything else, current behavior remains unchanged
- Existing `v2` and legacy flows continue to work without modification during rollout

Recommended route behavior:

1. `v3` -> `createPodcastV3(...)`
2. `new` -> existing V2 flow
3. any other value -> existing legacy flow

This must be implemented as an explicit branch at the route/controller boundary, not inferred deep inside the audio utilities.

---

## Current Problems

### 1. Too many TTS requests

Current systems synthesize per turn. For long podcasts this becomes dozens of separate TTS calls.

Result:

- High latency
- High quota pressure
- Frequent 429 errors
- Larger retry/cooldown overhead

### 2. Fallback chain is fragmented

Current behavior can move across multiple systems:

- V2 Gemini speaker pipeline
- legacy Gemini per-turn fallback
- legacy Neural2 fallback

This causes:

- inconsistent voice behavior
- inconsistent transcript/timing behavior
- duplicated logic
- harder debugging

### 3. Voice resolution is not unified

Gemini speaker IDs and Google voice names are resolved in separate places.

Result:

- voice consistency bugs
- fallback language mismatches
- repeated logic for gender/language resolution

### 4. Alignment sits in the critical path

Alignment is required before completion even when a fast response would be more useful.

Result:

- increased latency
- failure surface increases
- expensive alignment blocks successful audio delivery

### 5. No single orchestration model

The current system has generation decisions spread across routes and utilities.

Result:

- error handling is inconsistent
- fallback policy is difficult to reason about
- performance tuning is fragmented

---

## Design Principles

### 1. Single orchestrator

One job orchestrator owns:

- generation order
- provider strategy
- retry policy
- degradation policy
- persistence

### 2. Chunk-based synthesis

Primary speed improvement comes from reducing TTS request count.

Instead of:

- 1 request per turn

Use:

- N requests per speaker chunk

This is the most important design change in V3.

### 3. One voice plan per job

Resolve voices once at the beginning and pass the resolved plan through the entire pipeline.

### 4. Explicit degradation tree

Do not jump between unrelated pipelines. Use one controlled fallback strategy.

### 5. Observable step timings

Every major phase must emit structured duration and count metrics.

---

## Proposed Architecture

### Main entry

```text
PodcastRoute
  -> PodcastV3Orchestrator
      -> ScriptEngine
      -> VoicePlanResolver
      -> ChunkBuilder
      -> TtsEngine
      -> AlignmentEngine
      -> PersistenceEngine
      -> NotificationEngine
```

### Module overview

#### `PodcastV3Orchestrator`

Responsibilities:

- accept input options
- choose generation profile
- call all engines in order
- handle retries and degradation
- produce final response payload

#### `ScriptEngine`

Responsibilities:

- generate script
- generate `turns_original`
- enforce structural consistency

Output:

- `title`
- `turns`
- `turns_original`
- `usage`

#### `VoicePlanResolver`

Responsibilities:

- resolve host and guest voices once
- map Gemini voices to fallback provider voices
- resolve language code per provider
- ensure host and guest remain distinct

Output:

- `voicePlan`

#### `ChunkBuilder`

Responsibilities:

- group speaker turns
- chunk by byte budget
- preserve turn boundaries

Output:

- `speakerChunks`

#### `TtsEngine`

Responsibilities:

- synthesize chunks
- use provider adapters
- return audio per chunk with metadata

Output:

- `audioChunks`

#### `AlignmentEngine`

Responsibilities:

- align merged chunk outputs
- split chunk timings back to turns
- generate turn-level and word-level timing

Output:

- `timingData`

#### `PersistenceEngine`

Responsibilities:

- merge audio
- upload audio
- upload VTT
- persist DB rows

#### `NotificationEngine`

Responsibilities:

- completion notifications
- failure notifications

---

## New Core Data Types

### `PodcastGenerationProfile`

```ts
type PodcastGenerationProfile = {
  name: 'fast' | 'balanced' | 'accurate'
  ttsProviderOrder: Array<'gemini' | 'neural2'>
  alignmentProviderOrder: Array<'groq' | 'mfa' | 'estimate'>
  chunking: {
    maxInputBytes: number
    maxTurnsPerChunk: number
    maxPauseBoundaryMerges: number
  }
  limiter: {
    maxConcurrency: number
    minSpacingMs: number
    cooldownBaseMs: number
  }
  durationProbe: {
    enabled: boolean
    concurrency: number
  }
}
```

### `VoicePlan`

```ts
type VoicePlan = {
  host: {
    geminiSpeakerId: string
    fallbackVoiceName: string
    languageCode: string
    gender: 'male' | 'female'
  }
  guest: {
    geminiSpeakerId: string
    fallbackVoiceName: string
    languageCode: string
    gender: 'male' | 'female'
  }
}
```

### `PodcastTurn`

```ts
type PodcastTurn = {
  turnId: string
  originalIndex: number
  speaker: 'A' | 'B'
  text: string
  translatedText?: string
  wordCount: number
}
```

### `SpeakerChunk`

```ts
type SpeakerChunk = {
  chunkId: string
  speaker: 'A' | 'B'
  voice: {
    providerVoiceId: string
    languageCode: string
  }
  turns: PodcastTurn[]
  combinedText: string
  combinedWordCount: number
  estimatedBytes: number
}
```

### `SynthesizedChunk`

```ts
type SynthesizedChunk = {
  chunkId: string
  speaker: 'A' | 'B'
  audioBuffer: Buffer
  combinedText: string
  turns: PodcastTurn[]
  durationSeconds?: number
  durationEstimated?: boolean
  provider: 'gemini' | 'neural2'
}
```

---

## Chunking Strategy

### Why chunking

Chunking is the main latency improvement.

Current behavior:

- 40+ turns can become 40+ requests

V3 target:

- 40+ turns should usually become 8-14 requests

### Chunk rules

Build chunks per speaker using:

1. max UTF-8 byte budget
2. max turns per chunk
3. optional soft merge around very short turns

Recommended defaults:

- `maxInputBytes = 2400`
- `maxTurnsPerChunk = 4`
- preserve speaker purity inside a chunk

### Important constraint

Chunking must preserve turn boundaries in metadata even if multiple turns are synthesized together.

This is required so alignment can split the chunk timing back into original turns.

---

## TTS Engine Design

### Provider adapters

V3 should use adapters with a common interface:

```ts
interface PodcastTtsAdapter {
  synthesizeChunk(input: {
    chunk: SpeakerChunk
    voicePlan: VoicePlan
    profile: PodcastGenerationProfile
    jobContext: PodcastJobContext
  }): Promise<SynthesizedChunk>
}
```

Adapters:

- `GeminiPodcastTtsAdapter`
- `Neural2PodcastTtsAdapter`

### Gemini adapter

Responsibilities:

- use resolved Gemini speaker IDs
- respect model limiter
- return one buffer per chunk
- classify 429 as quota degradation signal

### Neural2 adapter

Responsibilities:

- use resolved fallback voice names
- derive language from voice plan, never hardcode `en-US`
- synthesize one buffer per chunk

### TTS degradation policy

For each job:

1. try Gemini with chosen profile
2. if quota/rate-limit threshold exceeded for the job, degrade to Neural2
3. do not bounce back and forth between providers during one job

This avoids mixed-provider inconsistency inside a single podcast.

---

## Alignment Engine Design

### Default provider policy

V3 should default to:

- `groq` for `fast`
- `groq` for `balanced`
- `groq -> mfa -> estimate` for `accurate`

### Key design change

Alignment should operate on merged speaker-chunk audio, not individual per-turn audio.

Flow:

1. merge synthesized chunks per speaker
2. run alignment once per speaker
3. split aligned timings back to chunk boundaries
4. split chunk timings back to turn boundaries

### Estimated fallback

If alignment fails:

- use duration-estimated timings
- do not fail the whole podcast unless audio synthesis also failed

---

## Generation Profiles

### `fast`

Use when:

- long podcasts
- quota pressure is high
- user wants speed

Config:

- chunk synthesis enabled
- `groq` alignment
- no per-segment ffprobe
- estimated durations acceptable

### `balanced`

Default profile.

Config:

- chunk synthesis enabled
- `groq` alignment
- optional limited duration probing
- moderate concurrency

### `accurate`

Use only when explicitly required.

Config:

- chunk synthesis enabled
- low concurrency
- richer timing validation
- optional MFA

---

## V3 Rollout Behavior

### Route-level branching

At request entry:

```js
if (process.env.PODCAST_TYPE === 'v3') {
  return createPodcastV3(...)
}

if (process.env.PODCAST_TYPE === 'new') {
  return createPodcastV2(...)
}

return createGoogleTTSPodcast(...)
```

### Hard rule

V3 must not call V2 or legacy internals as hidden fallback paths.

If V3 degrades, it must degrade inside the V3 orchestrator using V3 adapters.

---

## Observability

Each job must emit structured logs for:

- profile name
- selected voices
- selected providers
- chunk count
- request count
- total script words
- total TTS chars
- number of retries
- number of 429s
- provider degradation reason
- timing provider used
- step elapsed times

Minimum step timings:

- script generation
- chunk build
- TTS
- duration probe
- alignment
- merge
- upload
- DB save
- total elapsed

Recommended metrics:

- `podcast_v3_jobs_total`
- `podcast_v3_failures_total`
- `podcast_v3_tts_requests_total`
- `podcast_v3_tts_429_total`
- `podcast_v3_chunks_total`
- `podcast_v3_provider_degradation_total`
- `podcast_v3_duration_seconds`

---

## Storage and Persistence

### Phase 1

Keep writing final results into existing `contenthistory` for compatibility.

Add metadata fields if available:

- `entry_source = 'google-podcast-v3'`
- `timing_source`
- `timing_accuracy`
- `tts_provider`
- `tts_voice_name`
- `version = 'v3'`

### Phase 2

Optionally introduce dedicated podcast job tables:

- `podcast_jobs`
- `podcast_job_events`
- `podcast_job_chunks`

This is not required for V3 initial rollout.

---

## Failure Handling

### Retry policy

Retry only transient errors:

- network
- timeout
- provider 5xx

Quota/rate-limit behavior:

- limiter handles cooldown
- adapter reports degradation signal
- orchestrator decides whether to switch provider

### Job-level failure thresholds

Example:

- if Gemini chunk synthesis hits quota more than `N` times in one job, degrade whole job to Neural2
- do not degrade one chunk at a time

This avoids mixed voice/provider output.

---

## File Layout Proposal

```text
backend/
  utils/audio/podcastV3/
    index.js
    orchestrator.js
    profiles.js
    types.js
    scriptEngine.js
    voicePlanResolver.js
    chunkBuilder.js
    ttsEngine.js
    alignerEngine.js
    persistenceEngine.js
    metrics.js
    adapters/
      geminiPodcastTtsAdapter.js
      neural2PodcastTtsAdapter.js
      groqAlignmentAdapter.js
      mfaAlignmentAdapter.js
      estimateAlignmentAdapter.js
```

---

## Implementation Plan

### Phase 1: Safe bootstrap

1. Add `podcastV3/` module structure
2. Add route gate for `PODCAST_TYPE=v3`
3. Add orchestrator skeleton
4. Reuse current script generation as temporary `ScriptEngine`

Deliverable:

- V3 route works behind env gate
- no production behavior changes unless enabled

### Phase 2: Voice plan and chunk model

1. Implement `VoicePlanResolver`
2. Implement `ChunkBuilder`
3. Add unit tests for:
   - byte chunking
   - speaker consistency
   - language resolution
   - fallback mapping

Deliverable:

- stable chunk metadata
- stable provider voice resolution

### Phase 3: TTS adapters

1. Implement `GeminiPodcastTtsAdapter`
2. Implement `Neural2PodcastTtsAdapter`
3. Implement orchestrator degradation tree
4. Add metrics for request counts and 429 counts

Deliverable:

- V3 can synthesize without using V2/legacy internals

### Phase 4: Alignment engine

1. Implement chunk/speaker merge for alignment
2. Implement `groq` adapter
3. Implement turn split logic
4. Add estimated fallback

Deliverable:

- end-to-end V3 output with word timings

### Phase 5: Persistence and rollout

1. Implement `PersistenceEngine`
2. save V3 results into `contenthistory`
3. add `entry_source='google-podcast-v3'`
4. shadow test in staging

Deliverable:

- V3 production candidate

### Phase 6: Optimization pass

1. tune chunk size
2. tune limiter values
3. compare:
   - latency
   - request count
   - quota failures
   - subtitle quality

Deliverable:

- optimized default profile

---

## Required Tests

### Unit tests

- chunking by byte size
- voice plan resolution
- fallback language code resolution
- chunk-to-turn timing split
- degradation tree decisions

### Integration tests

- V3 success path with Gemini
- V3 degrade path to Neural2
- long podcast with `fast` profile
- selected voice preserved through fallback
- subtitle generation from aligned timings

### Regression tests

- `PODCAST_TYPE!=v3` keeps old behavior
- V2 path unchanged
- legacy path unchanged

---

## Acceptance Criteria

V3 is acceptable when:

1. `PODCAST_TYPE=v3` uses only V3 orchestration
2. `PODCAST_TYPE!=v3` keeps existing behavior
3. TTS request count for long podcasts is materially lower than V2
4. selected voices remain consistent through fallback
5. quota failures degrade predictably, not chaotically
6. logs clearly explain provider choice, chunk counts, and step timings

---

## Recommended First Delivery Scope

Do not try to ship everything at once.

Ship first:

1. route gate
2. orchestrator
3. voice plan
4. chunk builder
5. Gemini adapter
6. Neural2 adapter
7. Groq alignment
8. persistence

Delay:

- MFA integration
- dedicated DB tables
- advanced async refinement

This gives the highest practical speed and reliability gain with the lowest rollout risk.
