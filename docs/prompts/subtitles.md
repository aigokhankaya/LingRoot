# Subtitle (VTT/SRT) Prompts

**Last Updated:** December 2025  
**Pipeline Layer:** Subtitle Prompt (optional)

This document describes the prompt layer responsible for generating or refining subtitles (VTT/SRT) after audio has been produced and aligned.

---

## 1. Position in the Pipeline

End‑to‑end pipeline reminder:

1. Whisper – transcription
2. Cleanup – normalize text, remove artefacts
3. CEFR adaptation – level‑appropriate text
4. TTS (Google) – audio synthesis
5. MFA – forced alignment (word/segment timestamps)
6. **Subtitle generation (this layer)** → `.vtt` / `.srt`

Subtitles must match the **final audio**, not the raw source.

---

## 2. Inputs & Outputs

### 2.1 Input (conceptual)

```jsonc
{
  "segments": [
    {
      "text": "Today I learned about plants.",
      "start": 0.0,
      "end": 3.2
    },
    {
      "text": "They make their own food using light.",
      "start": 3.2,
      "end": 7.4
    }
  ],
  "format": "vtt" // or "srt"
}
```

### 2.2 Output Examples

**VTT:**

```text
WEBVTT

00:00.000 --> 00:03.200
Today I learned about plants.

00:03.200 --> 00:07.400
They make their own food using light.
```

**SRT:**

```text
1
00:00:00,000 --> 00:00:03,200
Today I learned about plants.

2
00:00:03,200 --> 00:00:07,400
They make their own food using light.
```

The model may generate either the **final subtitle file content** or an intermediate JSON structure that the backend renders to VTT/SRT.

---

## 3. System Prompt Guidelines

The subtitle prompt must ensure:

- Timestamps remain unchanged or only adjusted minimally for readability
- Text stays aligned with CEFR level and content produced earlier
- No additional explanations, translations or examples are added
- Output contains **only** subtitles, no commentary

Example system instruction:

> You receive a list of segments with text and timestamps that already match the final audio. You must return valid WebVTT (or SRT) subtitles without changing the meaning or level of the text. Do not add new sentences. Do not output JSON.

(Or the reverse, if the implementation prefers JSON → backend renderer.)

---

## 4. CEFR & Bilingual Considerations

When content is bilingual (e.g. Turkish + English):

- The decision to show both languages or only English should be made **outside** this prompt.
- If subtitles are bilingual, follow the structure defined in `translation.md` and `cefr-conversion.md` (e.g. first line EN, second line TR).

The subtitle layer itself must not invent translations.

---

## 5. Formatting Rules

- For **VTT**:
  - File must start with `WEBVTT`
  - Use `.` as millisecond separator (`00:00.000`)
- For **SRT**:
  - Index lines start from `1`
  - Use `,` as millisecond separator (`00:00:00,000`)
- Avoid lines that are too long; prefer simple line breaks at clause boundaries.

---

## 6. Error Handling

If the input segments are inconsistent (overlapping times, negative durations), the model should either:

- Try to minimally fix them (e.g. clamp, round), **or**
- Return a clear error message (if using JSON mode) for backend handling.

Example JSON error (if applicable):

```jsonc
{
  "error": "INVALID_TIMESTAMPS"
}
```

---

## Related Documentation

- [AI Pipeline Architecture](../architecture/ai-pipeline.md)
- [CEFR Conversion Prompts](./cefr-conversion.md)
- [Translation Prompts](./translation.md)
- [Google TTS Integration](../integrations/google-tts.md)
