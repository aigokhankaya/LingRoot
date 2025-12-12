# Translation Prompts

**Last Updated:** December 2025  
**Location:** `/backend/prompts/`

## Overview

Translation prompts handle multi-directional translation between languages while maintaining CEFR level appropriateness and cultural context.

## Prompt Files

### Core Translation Prompts

| File | Purpose | Direction |
|------|---------|-----------|
| `translate_to_english.txt` | Translate any language to English | Any → EN |
| `translate_sentence_to_turkish.txt` | Translate sentences to Turkish | EN → TR |
| `translate_word_to_turkish.txt` | Translate individual words | EN → TR |

### Level-Specific Translation

| File | Level | Purpose |
|------|-------|---------|
| `content/translate_and_adapt_A1.txt` | A1 | Translate + adapt to beginner |
| `content/translate_and_adapt_A2.txt` | A2 | Translate + adapt to elementary |
| `content/translate_and_adapt_B1.txt` | B1 | Translate + adapt to intermediate |
| `content/translate_and_adapt_B2.txt` | B2 | Translate + adapt to upper-intermediate |
| `content/translate_and_adapt_C1.txt` | C1 | Translate + adapt to advanced |
| `content/translate_and_adapt_C2.txt` | C2 | Translate + adapt to proficiency |

### Reverse Translation (English → Native)

| File | Level | Purpose |
|------|-------|---------|
| `content/translate_from_english_A1.txt` | A1 | Translate to native (simplified) |
| `content/translate_from_english_A2.txt` | A2 | Translate to native |
| `content/translate_from_english_B1.txt` | B1 | Translate to native |
| `content/translate_from_english_B2.txt` | B2 | Translate to native |
| `content/translate_from_english_C1.txt` | C1 | Translate to native |
| `content/translate_from_english_C2.txt` | C2 | Translate to native |

## Prompt Structure

### translate_to_english.txt

```text
You are a professional translator. Translate the following text to English.

## Requirements:
1. Preserve the original meaning and tone
2. Maintain paragraph structure
3. Keep proper nouns unchanged
4. Preserve formatting (lists, headings, etc.)

## Guidelines:
- Use natural, fluent English
- Avoid literal translations that sound awkward
- Maintain cultural references where appropriate
- For idioms, find English equivalents

## Input Text:
{text}

## Translation:
```

### translate_sentence_to_turkish.txt

```text
You are a language learning assistant. Translate the following English sentence to Turkish.

## Requirements:
1. Provide natural Turkish translation
2. Keep the sentence structure appropriate for Turkish
3. Use common vocabulary when possible

## Sentence:
{sentence}

## Turkish Translation:
```

### translate_word_to_turkish.txt

```text
Translate the following English word to Turkish. Provide:
1. Primary translation
2. Alternative translations (if any)
3. Part of speech
4. Example sentence in both languages

## Word: {word}

## Response Format:
{
  "word": "...",
  "translation": "...",
  "alternatives": ["..."],
  "partOfSpeech": "...",
  "example": {
    "english": "...",
    "turkish": "..."
  }
}
```

## Combined Translation + Adaptation

### translate_and_adapt_A1.txt

```text
You are a language simplification expert. Your task is to:
1. Translate the text to English (if not already in English)
2. Adapt the English text to CEFR A1 level

## A1 Level Constraints:
- Maximum 8 words per sentence
- Basic, concrete vocabulary only
- Simple present and past tense only
- No compound sentences
- No abstract concepts

## Priority: Simplicity over accuracy

## Input Text:
{text}

## Output (A1 English):
```

### translate_from_english_B1.txt

```text
You are a language learning assistant. Translate the following B1-level English text to {target_language}.

## Requirements:
1. Maintain the B1 difficulty level in the translation
2. Use vocabulary appropriate for B1 learners of {target_language}
3. Keep sentence structures at intermediate complexity
4. Preserve the educational value of the content

## English Text:
{text}

## {target_language} Translation:
```

## Implementation

### Translation Utility

```javascript
// utils/translateAndAdapt.js
const fs = require('fs');
const path = require('path');
const { openai } = require('./openaiClient');

async function translateAndAdapt(text, level, targetLang = 'en') {
  // Load appropriate prompt
  const promptPath = path.join(
    __dirname, 
    '../prompts/content', 
    `translate_and_adapt_${level}.txt`
  );
  const prompt = fs.readFileSync(promptPath, 'utf-8');
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: text }
    ],
    temperature: 0.3
  });
  
  return response.choices[0].message.content;
}

async function translateFromEnglish(text, level, targetLang) {
  const promptPath = path.join(
    __dirname,
    '../prompts/content',
    `translate_from_english_${level}.txt`
  );
  let prompt = fs.readFileSync(promptPath, 'utf-8');
  prompt = prompt.replace(/{target_language}/g, targetLang);
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: text }
    ],
    temperature: 0.3
  });
  
  return response.choices[0].message.content;
}
```

### Word Translation Service

```javascript
// utils/wordTranslationService.js
async function translateWord(word, targetLang = 'tr') {
  const prompt = fs.readFileSync('prompts/translate_word_to_turkish.txt', 'utf-8');
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: word }
    ],
    response_format: { type: 'json_object' }
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

## Language Detection

```javascript
async function detectLanguage(text) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'Detect the language of the following text. Return only the ISO 639-1 code (e.g., "en", "tr", "de").'
      },
      { role: 'user', content: text.substring(0, 500) }
    ],
    max_tokens: 10
  });
  
  return response.choices[0].message.content.trim().toLowerCase();
}
```

## Quality Considerations

### Translation Accuracy

| Level | Priority | Trade-offs |
|-------|----------|------------|
| A1-A2 | Simplicity | May lose nuance |
| B1-B2 | Balance | Moderate simplification |
| C1-C2 | Accuracy | Preserve complexity |

### Common Issues

| Issue | Solution |
|-------|----------|
| Idiom literal translation | Use equivalent expressions |
| Cultural references lost | Add context or adapt |
| Sentence too long | Split into multiple sentences |
| Technical terms | Provide explanation |

## Testing

```javascript
// Test translation quality
const testCases = [
  { input: 'Merhaba, nasılsın?', expected: 'Hello, how are you?' },
  { input: 'Das ist ein Test.', expected: 'This is a test.' }
];

for (const test of testCases) {
  const result = await translateToEnglish(test.input);
  console.log(`Input: ${test.input}`);
  console.log(`Expected: ${test.expected}`);
  console.log(`Got: ${result}`);
}
```

## Related Documentation

- [CEFR Conversion](./cefr-conversion.md)
- [AI Pipeline](../architecture/ai-pipeline.md)
- [OpenAI Integration](../integrations/openai.md)
