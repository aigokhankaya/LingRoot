---
name: render-qa
description: Validate LingRoot render payloads and generated video artifacts. Use when checking render-payload.json, diagnosing a failed render, verifying 9:16 output, comparing shared visuals across levels, or deciding whether a topic package can pass QA.
---

# Render QA

1. Validate every render payload against its schema.
2. Confirm 1080×1920 output, supported FPS and target duration.
3. Confirm audio, subtitle and video artifacts exist for each requested level.
4. Confirm every payload uses the topic’s shared visual manifest and scene order.
5. Check subtitle timing and scene references.
6. Hard-fail missing media, failed render status, manifest drift or secret leakage.
7. Record findings in package and level QA reports.
