# AI Pipeline Architecture

**Last Updated:** December 2025  
**Primary AI Provider:** OpenAI (GPT-4o, GPT-4o-mini)

## Overview

The AI Pipeline is the core intelligence layer of LingRoot, responsible for language processing, CEFR adaptation, translation, and content generation.

## Pipeline Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AI PIPELINE FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Input → Extraction → Translation → CEFR Adapt → TTS → Output             │
│     │          │            │            │          │       │               │
│     ▼          ▼            ▼            ▼          ▼       ▼               │
│  Various   Text from    To English    Level     Audio    MP3 +            │
│  Sources   Sources      (if needed)   Adjust    Synth    VTT              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Core Services

### 1. OpenAI Client (`utils/openaiClient.js`)

```javascript
// Capabilities
- Chat completions (GPT-4o, GPT-4o-mini)
- Text embeddings (ada-002)
- Token counting
- Rate limit handling
- Error recovery
```

**Configuration:**
```javascript
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Model selection by task
const models = {
  chat: 'gpt-4o',
  adaptation: 'gpt-4o-mini',
  translation: 'gpt-4o-mini',
  embedding: 'text-embedding-ada-002'
};
```

### 2. CEFR Adapter (`utils/cefrAdapter.js`)

Adapts text to specific CEFR levels (A1-C2).

**Process:**
```
Input Text → Level Detection → Prompt Selection → GPT Processing → Adapted Output
```

**Level Characteristics:**

| Level | Max Sentence Length | Vocabulary | Grammar |
|-------|---------------------|------------|---------|
| A1 | 8 words | Basic, concrete | Simple present/past |
| A2 | 12 words | Common | Present, past, future |
| B1 | 15 words | Intermediate | All tenses, conditionals |
| B2 | 20 words | Advanced | Complex structures |
| C1 | 25 words | Sophisticated | Nuanced expressions |
| C2 | Unlimited | Native-like | Full complexity |

### 3. Translation Service (`utils/translateAndAdapt.js`)

```javascript
// Translation flow
async function translateAndAdapt(text, targetLevel, sourceLang, targetLang) {
  // 1. Detect source language
  const detected = await detectLanguage(text);
  
  // 2. Translate to English if needed
  if (detected !== 'en') {
    text = await translateToEnglish(text);
  }
  
  // 3. Adapt to CEFR level
  const adapted = await adaptToCEFR(text, targetLevel);
  
  // 4. Optionally translate to target language
  if (targetLang !== 'en') {
    return await translateFromEnglish(adapted, targetLang);
  }
  
  return adapted;
}
```

### 4. Liro AI Assistant (`utils/liroPromptGenerator.js`)

The conversational AI for language learning.

**Capabilities:**
- Contextual conversation
- CEFR-appropriate responses
- Topic suggestions
- Grammar explanations
- Vocabulary help

**System Prompt Structure:**
```javascript
const systemPrompt = {
  role: 'Language learning assistant',
  userLevel: 'A2', // Dynamic based on user
  nativeLanguage: 'tr',
  targetLanguage: 'en',
  personality: 'Friendly, encouraging, patient'
};
```

## Prompt Library

### Directory Structure

```
backend/prompts/
├── cefr_A1.txt                    # CEFR adaptation prompt - A1
├── cefr_A2.txt                    # CEFR adaptation prompt - A2
├── cefr_B1.txt                    # CEFR adaptation prompt - B1
├── cefr_B2.txt                    # CEFR adaptation prompt - B2
├── cefr_C1.txt                    # CEFR adaptation prompt - C1
├── cefr_C2.txt                    # CEFR adaptation prompt - C2
├── content/
│   ├── content_generation_*.txt   # Content generation (6 levels)
│   ├── generate_bilingual_*.txt   # Bilingual content (6 levels)
│   ├── translate_and_adapt_*.txt  # Translation + adaptation (6 levels)
│   └── translate_from_english_*.txt # Reverse translation (6 levels)
├── topic_hierarchy/
│   └── topic_generation.txt       # Topic tree generation
├── liro_system_default.txt        # Default Liro personality
├── liro_system_personalized.txt   # Personalized Liro (with user data)
├── liro_daily_suggestions.txt     # Daily topic suggestions
├── topic_extractor.txt            # Extract topics from text
├── translate_to_english.txt       # English translation
├── translate_sentence_to_turkish.txt # Sentence translation
└── translate_word_to_turkish.txt  # Word translation
```

### Prompt Engineering Guidelines

1. **Structure:** Each prompt includes role, task, constraints, examples
2. **Level-specific:** Separate prompts for each CEFR level
3. **Bilingual:** Support for native language scaffolding
4. **Examples:** Few-shot learning with examples

## Content Generation Pipeline

### Topic Pipeline (`controllers/topicPipelineController.js`)

```javascript
// Flow
1. User selects topic from hierarchy
2. System generates content outline
3. AI creates CEFR-appropriate text
4. Bilingual version generated (if requested)
5. TTS audio synthesized
6. VTT subtitles created
7. Content stored in database
```

### Podcast Generation (`utils/createPodcast.js`)

Multi-speaker podcast creation with AI-generated scripts.

**Flow:**
```javascript
// Podcast Pipeline
1. User requests topic + level + duration
2. AI generates Host/Expert dialogue script (GPT-4o)
3. Multi-speaker TTS (Google Journey voices)
4. Audio segments merged (FFmpeg)
5. VTT subtitles generated
6. Files uploaded to storage
7. ContentHistory record created
```

**Voices:**
| Role | Voice | Character |
|------|-------|-----------|
| Host | `en-US-Journey-F` | Friendly, curious |
| Expert | `en-US-Journey-D` | Authoritative, clear |

**CEFR Adaptation in Script:**
- A1/A2: Simple vocabulary, short sentences
- B1/B2: Wider vocabulary, idioms
- C1/C2: Sophisticated, natural language

### Embedding & RAG System

```javascript
// Topic suggestion using embeddings
async function suggestTopics(userProfile) {
  // 1. Get user's interests and history
  const userEmbedding = await createEmbedding(userProfile);
  
  // 2. Find similar topics
  const similar = await findSimilarTopics(userEmbedding);
  
  // 3. Filter by user level
  return filterByLevel(similar, userProfile.cefrLevel);
}
```

## Text Processing Utilities

### Text Processor (`utils/textProcessor.js`)

```javascript
// Functions
cleanTextForTTS(text)      // Remove emojis, markdown, etc.
chunkText(text, maxLen)    // Split for TTS processing
normalizeWhitespace(text)  // Clean spacing
extractSentences(text)     // Sentence segmentation
```

### Input Extractor (`utils/inputExtractor.js`)

Handles extraction from various sources:

| Source | Extractor | Output |
|--------|-----------|--------|
| YouTube | `extractFromYouTube()` | Transcript text |
| Web URL | `extractFromWeb()` | Clean article text |
| PDF | `extractFromPDF()` | Plain text |
| DOCX | `extractFromDocx()` | Plain text |
| EPUB | `extractFromEPUB()` | Chapter text |

## TTS Integration

### Voice Selection

```javascript
// Available TTS providers
const providers = {
  google: ['en-US-Wavenet-D', 'en-GB-Wavenet-A', ...],
  azure: ['en-US-JennyNeural', 'en-GB-RyanNeural', ...],
  polly: ['Joanna', 'Matthew', ...]
};

// Voice categories
const categories = {
  professional: [...],
  casual: [...],
  children: [...]
};
```

### Audio Generation Flow

```javascript
async function generateAudio(text, voice, rate) {
  // 1. Chunk text for TTS limits
  const chunks = chunkText(text, 4000);
  
  // 2. Generate audio for each chunk
  const audioBuffers = await Promise.all(
    chunks.map(chunk => synthesize(chunk, voice, rate))
  );
  
  // 3. Merge audio files
  const merged = await mergeAudio(audioBuffers);
  
  // 4. Upload to storage
  const url = await uploadToStorage(merged);
  
  return url;
}
```

## Error Handling

```javascript
// AI-specific error handling
try {
  const result = await openai.chat.completions.create({...});
} catch (error) {
  if (error.code === 'rate_limit_exceeded') {
    await delay(60000);
    return retry(request);
  }
  if (error.code === 'context_length_exceeded') {
    return handleLongContent(content);
  }
  throw new AIServiceError(error.message);
}
```

## Cost Tracking

```javascript
// Token usage tracking
const costTracker = {
  logUsage(model, inputTokens, outputTokens) {
    const cost = calculateCost(model, inputTokens, outputTokens);
    saveToDatabase(userId, model, cost);
  }
};
```

## Performance Optimizations

1. **Caching:** Cache embeddings for repeated topics
2. **Batching:** Group similar requests
3. **Streaming:** Use streaming for long responses
4. **Fallback:** Graceful degradation if AI unavailable

## Related Documentation

- [Translation Prompts](../prompts/translation.md)
- [CEFR Conversion](../prompts/cefr-conversion.md)
- [Topic Generation](../prompts/topic-generation.md)
- [Liro Assistant](../prompts/liro-assistant.md)
