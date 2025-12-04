# TTS & SSML Prompts

**Last Updated:** December 2025  
**Pipeline Layer:** TTS Prompt (SSML generator)

This document describes how LingRoot uses prompts to generate SSML markup for high‑quality text‑to‑speech output.

---

## 1. Role of the TTS Prompt

The TTS prompt sits **after** CEFR adaptation and translation:

1. Source text (YouTube, web, book, chat)
2. Translation (if needed)
3. CEFR adaptation (level A1–C2)
4. **TTS/SSML generation (this layer)**
5. Audio synthesis (Google TTS)
6. MFA alignment → VTT/SRT

Responsibilities:
- Insert SSML markup without changing semantic meaning
- Control speaking rate and pausing
- Prepare segments that respect provider limits

---

## 2. Constraints from PROJECT_MEMORY

From `PROJECT_MEMORY.md`:

- **Speed default:** `1.05`
- **Pitch:** between `-2` and `+2`
- **Max segment length:** `≈1500` characters
- **Default break:** `<break time="300ms"/>`
- Audio pipeline: `Whisper → Cleanup → CEFR adaptation → TTS (Google) → Audio merge → MFA → VTT/SRT`

The prompt must enforce these constraints when generating SSML.

---

## 3. Input & Output

### 3.1 Input (to model)

```jsonc
{
  "text": "Today I learned about photosynthesis...",
  "level": "B1",
  "voice": "en-US-Wavenet-D",
  "speakingRate": 1.05,
  "maxSegmentLength": 1500
}
```

### 3.2 Output (from model)

```jsonc
{
  "segments": [
    {
      "ssml": "<speak><prosody rate=\"1.05\">Today I learned about <break time=\"300ms\"/> how plants make their own food.</prosody></speak>",
      "approx_characters": 120
    }
  ]
}
```

The backend is responsible for:
- Validating the JSON
- Sending each `ssml` segment to Google TTS
- Merging audio segments in order

---

## 4. System Prompt Guidelines

The system prompt for SSML generation should instruct the model to:

- Keep the **meaning and CEFR difficulty** identical to the input text
- Avoid adding new information or examples
- Use `<break time="300ms"/>` between logical phrases and sentences
- Use `<prosody rate="1.05">` unless a different rate is explicitly provided
- Avoid adding audio effects (no `<audio>` tags, no sound effects)

Simplified system prompt sketch:

> You are an SSML generator for English learning content. You receive already adapted English text. Your task is to wrap the text in SSML for Google Text‑to‑Speech, inserting short pauses and prosody markers without changing the meaning.

---

## 5. Segmenting Long Texts

The prompt must:

- Suggest segment boundaries at sentence or paragraph breaks
- Ensure each segment is below `maxSegmentLength`
- Maintain valid SSML in each segment (`<speak>...</speak>`)

Example constraint section in the prompt:

```text
If the text is long, split it into multiple segments.
Each segment must:
- Be valid SSML for Google TTS
- Start with <speak> and end with </speak>
- Have fewer than 1500 characters
Return JSON with an array called "segments" where each element has a "ssml" string.
```

---

## 6. CEFR-Specific Nuances

While the TTS layer does **not** change the level, it should:

- Preserve sentence boundaries from CEFR adaptation
- Avoid merging multiple simple sentences into one complex sentence
- Keep A1 texts short and very clear (no nested clauses)

---

## 7. Error Handling

If the model detects that the input is not valid plain text (e.g. already contains SSML or HTML), it should:

- Either clean the text (strip markup) before adding SSML
- Or return an explicit error field in JSON (depending on implementation)

Example error payload:

```jsonc
{
  "error": "INPUT_NOT_PLAIN_TEXT"
}
```

The backend then decides whether to retry with cleaned input.

---

## Related Documentation

- [CEFR Conversion Prompts](./cefr-conversion.md)
- [AI Pipeline Architecture](../architecture/ai-pipeline.md)
- [Google TTS Integration](../integrations/google-tts.md)
