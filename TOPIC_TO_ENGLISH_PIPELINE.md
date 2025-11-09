# 🎯 Topic → Leveled English Text Pipeline

## Overview

This pipeline generates CEFR-leveled English educational content from a Turkish topic. It consists of 4 main stages and produces ready-to-read English text **without triggering TTS synthesis**.

## Pipeline Flow

```
Topic Input → Topic Suggestions → Turkish Narration → English Translation → CEFR Adaptation → Final Text
```

## Stages

### 1️⃣ Topic Suggestions
**Prompt:** `backend/prompts/topic_detail_suggestions.txt`  
**Model:** `gpt-4o`  
**Temperature:** `0.6`  
**Endpoint:** `/api/topic-pipeline/suggestions`

**Purpose:** Generate 5 detailed subtopic suggestions from the user's topic.

**Input:**
```json
{
  "topic": "Yapay Zeka",
  "level": "B1"
}
```

**Output:**
```json
{
  "success": true,
  "data": {
    "topic": "Yapay Zeka",
    "level": "B1",
    "suggestions": [
      "**Yapay Zeka Tarihi**: Yapay zekanın gelişim süreci ve önemli kilometre taşları.",
      "**Makine Öğrenmesi Teknikleri**: Temel makine öğrenmesi algoritmaları ve uygulamaları.",
      "**Yapay Zeka Etiği**: Yapay zeka kullanımındaki etik sorunlar ve toplumsal etkiler.",
      "**Doğal Dil İşleme**: Bilgisayarların insan dilini anlama ve işleme yöntemleri.",
      "**Yapay Zeka ve Gelecek**: Yapay zekanın gelecekteki potansiyel etkileri ve gelişmeler."
    ]
  }
}
```

**Rules:**
- Suggestions must be in Turkish
- Each suggestion has a **bold title** and 1-2 sentence description
- 5 suggestions total
- Suggestions must be distinct from each other

---

### 2️⃣ Turkish Narration Generation
**Prompt:** `backend/prompts/rewrite_to_narrations.txt`  
**Model:** `gpt-4o`  
**Temperature:** `0.7`  
**Endpoint:** `/api/narration/rewrite`

**Purpose:** Generate a detailed Turkish educational narration based on the selected topic/subtopic.

**Input:**
```json
{
  "input_text": "Yapay Zeka Tarihi",
  "level": "B1"
}
```

**Output:**
```json
{
  "success": true,
  "data": {
    "original_text": "Yapay Zeka Tarihi",
    "narration_text": "[900-1500 word Turkish narration]",
    "level": "B1"
  }
}
```

**Length Guidelines:**
- **A1-A2:** 600–900 words
- **B1-B2:** 900–1500 words
- **C1-C2:** 1500–2000 words

**Rules:**
- Turkish only
- Educational tone (not academic)
- Structure: introduction → development → conclusion
- 3-5 sentences per paragraph
- No headings, bullet points, or markdown
- Preserve proper nouns (names, dates, places)

---

### 3️⃣ English Translation
**Prompt:** `backend/prompts/translate_to_english.txt`  
**Model:** `gpt-4o`  
**Temperature:** `0.3`  
**Endpoint:** Internal (part of `/api/tts/process`)

**Purpose:** Translate Turkish narration to CEFR-leveled English.

**Processing:**
- Text is chunked before translation
- Each chunk is translated with level-awareness
- Chunks are merged back together

**Translation Rules by Level:**

**A1-A2:**
- Simple tenses (present, past, future)
- Short sentences
- Basic vocabulary

**B1-B2:**
- Richer vocabulary
- Moderate complexity
- Natural flow

**C1-C2:**
- Native-like flow
- Advanced vocabulary
- Complex structures allowed

**Special Rules:**
- Convert numbers to spoken form (1938 → "nineteen thirty-eight")
- Preserve paragraph structure
- No bullet points or formatting
- Full translation (no summarization)

---

### 4️⃣ CEFR Adaptation
**Prompt:** `backend/prompts/cefr_{level}.txt`  
**Model:** `gpt-4-turbo` (configurable via `OPENAI_CEFR_MODEL`)  
**Temperature:** `0.6`  
**Endpoint:** Internal (part of `/api/tts/process`)

**Purpose:** Rewrite English text to match exact CEFR level requirements.

**Level-Specific Rules:**

#### A1 Level
- **Vocabulary:** CEFR A1 list + NGSL first 600 words only
- **Grammar:** Simple present/past only
- **Sentences:** ≤ 9 words, one idea per sentence
- **Forbidden:** Passive voice, conditionals, phrasal verbs, abstract nouns
- **Compression:** May reduce to 65-100% of original length
- **Style:** Clear, beginner-friendly

#### A2 Level
- **Vocabulary:** A1-A2 words
- **Grammar:** Simple present, past, future
- **Sentences:** ≤ 12 words, 1-2 clauses
- **Connectors:** and, but, because, so
- **Length:** 95%+ of original

#### B1 Level
- **Vocabulary:** Intermediate words, basic idioms
- **Grammar:** Conditionals and passive voice allowed
- **Tenses:** Present perfect, comparatives, adverbs
- **Style:** Natural, avoiding overly academic language

#### B2 Level
- **Vocabulary:** Upper-intermediate
- **Grammar:** Flexible sentence structures
- **Connectors:** although, while, however, in contrast
- **Style:** Fluent transitions

#### C1 Level
- **Vocabulary:** Advanced vocab, abstract nouns, idioms
- **Grammar:** Embedded clauses, inversion, complex passive
- **Style:** Smooth, natural transitions, formal/academic tone allowed

#### C2 Level
- **Vocabulary:** Near-native precision
- **Grammar:** All structures, rhetorical devices
- **Style:** Metaphor, allusion, abstract argumentation

---

## API Endpoints

### Complete Pipeline (All 4 Steps)

**POST** `/api/topic-pipeline/generate`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "topic": "Yapay Zeka",
  "level": "B1",
  "selected_subtopic": "Yapay Zeka Tarihi (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "topic": "Yapay Zeka",
    "level": "B1",
    "selected_subtopic": "Yapay Zeka Tarihi",
    "suggestions": ["...", "...", "..."],
    "narration_tr": "[Turkish narration text]",
    "translation_en": "[English translation]",
    "adapted_text": "[CEFR B1 adapted text]",
    "usage": {
      "suggestions": { "prompt_tokens": 150, "completion_tokens": 200, "total_tokens": 350 },
      "narration": { "prompt_tokens": 200, "completion_tokens": 800, "total_tokens": 1000 },
      "translation": { "prompt_tokens": 800, "completion_tokens": 700, "total_tokens": 1500 },
      "adaptation": { "prompt_tokens": 700, "completion_tokens": 600, "total_tokens": 1300 }
    }
  }
}
```

---

### Step 1 Only (Suggestions)

**POST** `/api/topic-pipeline/suggestions`

**Body:**
```json
{
  "topic": "Yapay Zeka",
  "level": "B1"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "topic": "Yapay Zeka",
    "level": "B1",
    "suggestions": ["...", "...", "...", "...", "..."]
  }
}
```

---

### Step 2 Only (Narration)

**POST** `/api/narration/rewrite`

**Body:**
```json
{
  "input_text": "Yapay Zeka Tarihi",
  "level": "B1"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "original_text": "Yapay Zeka Tarihi",
    "narration_text": "[Turkish narration]",
    "level": "B1"
  }
}
```

---

## Usage Example (Frontend)

```typescript
// Complete pipeline
const response = await fetch('/api/topic-pipeline/generate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    topic: 'Yapay Zeka',
    level: 'B1'
  })
});

const data = await response.json();

if (data.success) {
  console.log('Final English text:', data.data.adapted_text);
  console.log('Turkish narration:', data.data.narration_tr);
  console.log('Suggestions:', data.data.suggestions);
}
```

---

## Token Usage & Cost Estimation

### Typical Token Counts (B1 Level, 1200-word narration)

| Stage | Prompt Tokens | Completion Tokens | Total Tokens | Cost (GPT-4o) |
|-------|--------------|-------------------|--------------|---------------|
| Suggestions | 150 | 200 | 350 | $0.0018 |
| Narration | 200 | 800 | 1,000 | $0.0050 |
| Translation | 800 | 700 | 1,500 | $0.0075 |
| Adaptation (GPT-4-Turbo) | 700 | 600 | 1,300 | $0.0170 |
| **Total** | **1,850** | **2,300** | **4,150** | **~$0.031** |

*Costs are approximate based on OpenAI pricing as of Nov 2024.*

---

## Environment Variables

```bash
# General OpenAI model (narration, translation)
OPENAI_MODEL=gpt-4o

# CEFR adaptation model (higher quality)
OPENAI_CEFR_MODEL=gpt-4-turbo

# OpenAI API key
OPENAI_API_KEY=sk-...
```

---

## Differences from TTS Pipeline

| Feature | Topic Pipeline | TTS Pipeline |
|---------|---------------|--------------|
| **Output** | Text only | Audio + VTT subtitles |
| **Endpoints** | `/api/topic-pipeline/*` | `/api/tts/process` |
| **Final Step** | CEFR adaptation | TTS synthesis + audio merge |
| **Storage** | Returns JSON | Uploads to Supabase storage |
| **Use Case** | Reading practice | Listening practice |

---

## File Structure

```
backend/
├── controllers/
│   ├── topicPipelineController.js    # Complete 4-step pipeline
│   ├── narrationController.js         # Step 2 (Turkish narration)
│   └── topicDetailController.js       # Legacy suggestions endpoint
├── routes/
│   ├── topicPipelineRoutes.js        # /api/topic-pipeline/* routes
│   └── narrationRoutes.js             # /api/narration/* routes
├── prompts/
│   ├── topic_detail_suggestions.txt   # Step 1 prompt
│   ├── rewrite_to_narrations.txt      # Step 2 prompt
│   ├── translate_to_english.txt       # Step 3 prompt
│   ├── cefr_A1.txt                    # Step 4 prompt (A1)
│   ├── cefr_A2.txt                    # Step 4 prompt (A2)
│   ├── cefr_B1.txt                    # Step 4 prompt (B1)
│   ├── cefr_B2.txt                    # Step 4 prompt (B2)
│   ├── cefr_C1.txt                    # Step 4 prompt (C1)
│   └── cefr_C2.txt                    # Step 4 prompt (C2)
└── utils/
    ├── inputExtractor.js              # Translation utility
    ├── cefrAdapter.js                 # CEFR adaptation utility
    └── textProcessor.js               # Chunking utilities
```

---

## Testing

```bash
# Test suggestions endpoint
curl -X POST http://localhost:5001/api/topic-pipeline/suggestions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"topic": "Yapay Zeka", "level": "B1"}'

# Test complete pipeline
curl -X POST http://localhost:5001/api/topic-pipeline/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"topic": "Yapay Zeka", "level": "B1"}'
```

---

## Next Steps for TTS Integration

If you want to convert the generated text to audio:

1. Take the `adapted_text` from the pipeline response
2. Send it to `/api/tts/process` with:
   - `input`: The adapted text
   - `input_type`: "text"
   - `level`: Same CEFR level
   - `voice`: Selected TTS voice

The TTS controller will:
- Skip translation and adaptation (text is already prepared)
- Chunk the text
- Synthesize audio
- Generate VTT subtitles
- Upload to Supabase storage

---

**Last Updated:** 2024-11-09  
**Status:** ✅ Production Ready  
**Version:** 1.0.0
