# Audio Generation Pipeline Documentation

## Overview
This document outlines the optimized audio generation pipelines used in the LingRoot application. All processes have been refactored to minimize LLM calls while maintaining high content quality.

**Key Optimization:** Multiple separate LLM calls (Translation -> Adaptation -> Content Generation) have been consolidated into single, optimized prompts that handle multiple tasks at once.

---

## 1. Text/Document to TTS Pipeline (`ttsController.js`)

Used when a user inputs raw text, uploads a file (PDF/DOCX), or provides a web link.

### Old Process (Deprecated):
1. Extract Text
2. Clean Text
3. **LLM Call 1:** Translate to English
4. **LLM Call 2:** Adapt to CEFR Level
5. Chunk & TTS

### New Optimized Process:
1. **Extract Text:** Extract text from file/url/input.
2. **Clean Text:** Basic cleaning.
3. **Optimized LLM Call:** `translateAndAdaptToCEFR(text, sourceLang, level)`
   - **Prompt:** `translate_and_adapt_{level}.txt`
   - **Action:** Translates text to English AND adapts it to the target CEFR level in a single pass.
   - **Quality Focus:** Ensures natural flow, context retention, and strict vocabulary rules.
4. **Daily Pattern Extraction:** Extract learning patterns (1 LLM call, optional/async).
5. **TTS Synthesis:** Convert the final adapted text to speech.

**Cost Savings:** ~43% token reduction per request.

---

## 2. Topic Tree Pipeline (`topicPipelineController.js`)

Used when a user selects a topic from the curriculum tree to generate a lesson.

### Old Process (Deprecated):
1. Suggest Subtopics
2. **LLM Call 1:** Generate English Content
3. **LLM Call 2:** Translate to Turkish
4. **LLM Call 3:** Adapt English to CEFR Level
5. TTS

### New Optimized Process:
1. **Suggest Subtopics:** (1 LLM call, fast).
2. **Optimized LLM Call:** `generateBilingualContent(topic, targetLang, level)`
   - **Prompt:** `generate_bilingual_{level}.txt`
   - **Action:** Generates high-quality educational content in English (for audio) AND target language (for display) simultaneously.
   - **Output:** JSON object with aligned texts.
   - **Quality Focus:** Engaging tone, educational reinforcement, natural translation.
3. **Daily Pattern Extraction:** (1 LLM call, optional/async).
4. **TTS Synthesis:** Convert the English part to speech.

**Cost Savings:** ~47% token reduction per request.

---

## 3. Simple Topic Pipeline (`inputExtractor.js`)

Used when a user types a simple topic string (e.g., "History of Rome") into the TTS input box.

### Old Process (Deprecated):
1. **LLM Call 1:** Generate English Content
2. **LLM Call 2:** Translate to Turkish
3. TTS

### New Optimized Process:
1. **Optimized LLM Call:** `generateBilingualContent(topic, targetLang, level)`
   - Reuses the same optimized function as the Topic Tree pipeline.
   - Generates both English narration and translated text in one go.
2. **TTS Synthesis:** Convert the English part to speech.

**Cost Savings:** ~33% token reduction per request.

---

## Prompt Standards (Quality Control)

All prompts (`generate_bilingual_*.txt` and `translate_and_adapt_*.txt`) have been updated to include strict quality instructions:
- **Natural Flow:** Avoid robotic/stiff phrasing.
- **Context Retention:** Keep the core meaning and emotion.
- **Engaging Tone:** Make content interesting for learners.
- **Strict CEFR:** Adhere to vocabulary and grammar limits for the specific level.

## Legacy Code Status
All legacy fallback functions (`generateNarrationForTopicLegacy`, multi-step try-catch blocks) have been **removed** from the codebase to ensure the optimized path is always used.
