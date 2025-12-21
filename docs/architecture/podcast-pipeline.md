# Podcast Generation Pipeline

**Last Updated:** December 2025  
**Status:** ✅ Active (n8n dependency removed)

## Overview

LingRoot's Podcast Generation system creates educational, multi-speaker podcasts using AI-generated scripts and high-quality Google TTS voices. The system is now fully integrated within the codebase, eliminating the previous n8n webhook dependency.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ POST /api/tts/create-podcast                                     │
│ Body: { topic: "AI Ethics", level: "B1", duration: 5 }          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. Script Generation (OpenAI GPT-4o)                            │
│    - Prompt: generate_podcast_script.txt                        │
│    - Output: { title, description, dialogue[] }                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Multi-Speaker TTS (Google TTS Journey Voices)                │
│    - Host  → en-US-Journey-F (Female, friendly)                 │
│    - Expert → en-US-Journey-D (Male, authoritative)             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Audio Merge (FFmpeg)                                         │
│    - Concatenate segments                                       │
│    - Generate VTT subtitles                                     │
│    - Output: Single MP3 file                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Storage Upload (Supabase/Cloudflare R2)                      │
│    - Audio: podcasts_{requestId}_{timestamp}.mp3                │
│    - VTT:   podcasts_{requestId}_{timestamp}.vtt                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. ContentHistory Save                                          │
│    - input_type: 'podcast'                                      │
│    - words, timepoints for sync playback                        │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. createPodcast.js (`backend/utils/createPodcast.js`)

Main podcast generation module.

| Function | Description |
|----------|-------------|
| `generatePodcastScript()` | Creates AI script using GPT-4o |
| `createPodcast()` | Full pipeline: script → TTS → merge → upload |

**Dependencies:**
```javascript
const { synthesizeWithGoogle } = require('./googleTTS');
const { mergeAudioSegmentsToBuffer } = require('./audioMerger');
const { uploadToSupabase } = require('./storageUploader');
```

### 2. Prompt Template (`backend/prompts/content/generate_podcast_script.txt`)

```
You are an expert English teacher and podcast host.
Create a lively, educational podcast script about: "{{topic}}"
Target CEFR level: {{level}}

Output JSON:
{
  "title": "Catchy podcast title",
  "description": "Short summary",
  "dialogue": [
    { "speaker": "Host", "text": "..." },
    { "speaker": "Expert", "text": "..." }
  ]
}

Duration: ~{{duration}} minutes (~130 words/minute)
```

### 3. Voice Configuration

| Role | Voice Name | Characteristics |
|------|------------|-----------------|
| Host | `en-US-Journey-F` | Female, friendly, curious |
| Expert | `en-US-Journey-D` | Male, authoritative, clear |

### 4. TTS Route (`backend/routes/ttsRoutes.js`)

```javascript
router.post("/create-podcast", authenticate, async (req, res) => {
  const { topic, level, duration } = req.body;
  const result = await createPodcast(topic, level, duration);
  // Save to contenthistory, return URLs
});
```

## API Endpoint

### POST `/api/tts/create-podcast`

**Request:**
```json
{
  "topic": "Sustainable Energy",
  "level": "B1",
  "duration": 5
}
```

**Response:**
```json
{
  "success": true,
  "mp3_url": "https://storage.../podcasts_xxx.mp3",
  "vtt_url": "https://storage.../podcasts_xxx.vtt",
  "topic": "Green Energy Revolution",
  "level": "B1",
  "duration_seconds": 300,
  "words": ["Green", "energy", "..."],
  "timepoints": [{ "word": "Green", "timeSeconds": 0.0 }, ...],
  "contenthistory_id": "uuid-xxx"
}
```

**Authentication:** Required (JWT Bearer token)

## CEFR Level Adaptation

Script complexity adjusts based on level:

| Level | Vocabulary | Sentence Complexity |
|-------|------------|---------------------|
| A1/A2 | Simple, basic words | Short, clear sentences |
| B1/B2 | Wider vocab, idioms | More complex structures |
| C1/C2 | Sophisticated | Natural, nuanced flow |

## Storage Configuration

Files are stored based on `FILE_STORAGE_PROVIDER` environment variable:

| Provider | Path Format |
|----------|-------------|
| Supabase | `audio/podcasts_{id}.mp3` |
| Cloudflare R2 | `audio/podcasts_{id}.mp3` |

## VTT Subtitle Generation

Word-level timing is estimated based on:
- Average speaking rate: ~150 words/minute
- 0.5 second gap between speaker turns

```javascript
function generateVTT(timings) {
    let vtt = "WEBVTT\n\n";
    timings.forEach(t => {
        vtt += `${formatTime(t.startTime)} --> ${formatTime(t.endTime)}\n${t.word}\n\n`;
    });
    return vtt;
}
```

## Error Handling

| Error | Resolution |
|-------|------------|
| OpenAI timeout | Retry with smaller duration |
| TTS failure | Log and return partial result |
| FFmpeg error | Fallback: return individual segments |
| Upload failure | Retry once, then fail gracefully |

## Cost Tracking

Podcast generation costs are tracked in `contenthistory`:

| Field | Example Value |
|-------|---------------|
| `tts_provider` | 'google' |
| `tts_voice_name` | 'en-US-Journey-F,en-US-Journey-D' |
| `tts_category` | 'podcast' |
| `entry_source` | 'podcast' |

## Migration Notes (from n8n)

**Before (n8n webhook):**
```
Frontend → n8n Webhook → Script Gen → TTS → Upload → Response
```

**After (in-code):**
```
Frontend → /api/tts/create-podcast → createPodcast() → Response
```

✅ **Benefits:**
- Faster response times (no external webhook latency)
- Better error handling and logging
- Unified codebase maintenance
- Reduced external dependencies

## Related Documentation

- [AI Pipeline](./ai-pipeline.md)
- [TTS Controller](../codebase/api-services.md#tts-controller)
- [Content Processing](./system-overview.md)
