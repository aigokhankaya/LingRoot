# Daily Patterns Prompts

**Last Updated:** December 2025  
**Pipeline Layer:** Daily usage patterns analysis

This document describes the prompt strategy used to analyse users’ daily learning patterns and generate recommendations (e.g. best time to study, suggested session length).

---

## 1. Purpose

The **Daily Patterns** prompts:

- Analyse historical usage events (TTS requests, AI chats, book sessions)
- Detect when and how users prefer to learn
- Suggest realistic, CEFR-aligned practice windows
- Provide short, actionable suggestions rather than long reports

This layer sits **after** translation/CEFR adaptation in the logical pipeline but works mostly on metadata, not raw text.

---

## 2. Inputs & Outputs

### 2.1 Input Schema (conceptual)

```jsonc
{
  "user_id": "2f3b9a3f-...",
  "time_zone": "Europe/Istanbul",
  "events": [
    {
      "type": "tts",
      "timestamp": "2025-11-30T07:35:10Z",
      "duration_seconds": 300,
      "level": "B1"
    },
    {
      "type": "chat",
      "timestamp": "2025-11-30T19:12:44Z",
      "messages": 6,
      "level": "B1"
    }
  ]
}
```

### 2.2 Output Schema (to backend)

```jsonc
{
  "recommended_sessions": [
    {
      "time_of_day": "morning",
      "local_start": "07:30",
      "duration_minutes": 15,
      "reason": "User often studies between 07:00–08:00 on weekdays."
    },
    {
      "time_of_day": "evening",
      "local_start": "20:00",
      "duration_minutes": 20,
      "reason": "User frequently starts long sessions after 19:30."
    }
  ],
  "consistency_score": 0.78,
  "notes_for_ui": [
    "Highlight morning reminder as primary CTA.",
    "Suggest 2–3 short sessions per week instead of daily heavy usage."
  ]
}
```

All fields must be **valid JSON** and safe to store in Supabase.

---

## 3. System Prompt Guidelines

Key requirements for the model:

- Do **not** invent data; only use statistics derived from provided events
- Respect the user’s **time zone**
- Prefer **short, realistic** suggestions instead of perfection
- Avoid medical/psychological advice; focus purely on study rhythm

Example system prompt (simplified):

> You are an assistant that analyses learning activity logs and produces a simple JSON summary of daily study patterns. You do not change the content itself, only describe when the user tends to learn and suggest realistic short practice windows.

---

## 4. CEFR Considerations

Daily Patterns prompts:

- **Do not generate user-facing English text directly**
- Provide neutral descriptions (`reason`, `notes_for_ui`) that are later adapted by other layers if needed
- Must not contradict CEFR rules defined in `cefr-conversion.md` when they indirectly influence copy

---

## 5. Example Prompt Template

```text
SYSTEM:
You analyse a list of user learning events (audio listening, reading, chat) and return a JSON object describing recommended study windows.

USER:
Here is the user event history in JSON format.
Only use this data. Do not guess or add new events.

<USER_EVENTS_JSON>
...
</USER_EVENTS_JSON>

Return only JSON with this shape:
{
  "recommended_sessions": [
    {
      "time_of_day": "morning" | "afternoon" | "evening" | "night",
      "local_start": "HH:MM",
      "duration_minutes": number,
      "reason": string
    }
  ],
  "consistency_score": number between 0 and 1,
  "notes_for_ui": string[]
}
```

---

## 6. Storage & Usage

- Results may be stored in a dedicated table (e.g. `daily_usage_patterns`) as hinted by migrations.
- UI uses `recommended_sessions` to:
  - Pre-fill reminder settings
  - Order CTAs (e.g. "Study now" suggestions)

---

## Related Documentation

- [CEFR Conversion Prompts](./cefr-conversion.md)
- [Liro Assistant Prompts](./liro-assistant.md)
- [AI Pipeline Architecture](../architecture/ai-pipeline.md)
