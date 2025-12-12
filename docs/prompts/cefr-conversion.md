# CEFR Conversion Prompts

**Last Updated:** December 2025  
**Location:** `/backend/prompts/`

## Overview

CEFR (Common European Framework of Reference) conversion prompts adapt text to specific language proficiency levels. Each level has dedicated prompts ensuring appropriate vocabulary, grammar, and sentence complexity.

## Level Specifications

### A1 - Beginner

**File:** `cefr_A1.txt`

**Constraints:**
- Maximum sentence length: 8 words
- Vocabulary: Basic, concrete nouns only
- Grammar: Simple present and past tense only
- No compound sentences (no 'and'/'but' joining clauses)
- No abstract nouns (culture, history, tradition)
- No future tense or 'because' clauses
- Priority: Simplicity over accuracy

**Example Input:**
```
The European Union was established to promote economic cooperation and peace among its member states.
```

**Example Output:**
```
Many countries work together. They help each other. They want peace.
```

### A2 - Elementary

**File:** `cefr_A2.txt`

**Constraints:**
- Maximum sentence length: 12 words
- Vocabulary: Common everyday words
- Grammar: Present, past, and simple future
- Simple compound sentences allowed
- Basic time expressions

**Example Output:**
```
The European Union is a group of countries. They work together for peace and trade.
```

### B1 - Intermediate

**File:** `cefr_B1.txt`

**Constraints:**
- Maximum sentence length: 15 words
- Vocabulary: Intermediate level
- Grammar: All tenses, basic conditionals
- Compound and complex sentences
- Can express opinions and reasons

### B2 - Upper Intermediate

**File:** `cefr_B2.txt`

**Constraints:**
- Maximum sentence length: 20 words
- Vocabulary: Advanced with some idioms
- Grammar: Complex structures, passive voice
- Can handle abstract topics
- Nuanced expressions

### C1 - Advanced

**File:** `cefr_C1.txt`

**Constraints:**
- Maximum sentence length: 25 words
- Vocabulary: Sophisticated, domain-specific
- Grammar: All structures including inversions
- Academic and professional language
- Implicit meaning and inference

### C2 - Proficiency

**File:** `cefr_C2.txt`

**Constraints:**
- No length restrictions
- Native-like vocabulary
- Full grammatical range
- Idiomatic expressions
- Cultural references

## Prompt Structure

Each CEFR prompt follows this structure:

```text
You are a language simplification expert. Your task is to adapt the given text to CEFR level [LEVEL].

## Constraints:
- Maximum sentence length: [X] words
- Vocabulary level: [description]
- Grammar restrictions: [list]
- Avoid: [prohibitions]

## Guidelines:
1. Preserve the main message
2. Maintain paragraph structure
3. Keep proper nouns unchanged
4. [Level-specific guidelines]

## Priority:
[Level-specific priority statement]

## Input Text:
{text}

## Adapted Text:
```

## Content Generation Prompts

### Location: `/backend/prompts/content/`

| File | Purpose |
|------|---------|
| `content_generation_A1.txt` | Generate new A1 content from topic |
| `content_generation_A2.txt` | Generate new A2 content from topic |
| `content_generation_B1.txt` | Generate new B1 content from topic |
| `content_generation_B2.txt` | Generate new B2 content from topic |
| `content_generation_C1.txt` | Generate new C1 content from topic |
| `content_generation_C2.txt` | Generate new C2 content from topic |

### Bilingual Generation

| File | Purpose |
|------|---------|
| `generate_bilingual_A1.txt` | A1 with native language support |
| `generate_bilingual_A2.txt` | A2 with native language support |
| `generate_bilingual_B1.txt` | B1 with native language support |
| `generate_bilingual_B2.txt` | B2 with native language support |
| `generate_bilingual_C1.txt` | C1 with native language support |
| `generate_bilingual_C2.txt` | C2 with native language support |

**Bilingual Format:**
```
[Original sentence in target language]
[Translation in native language]

[Next sentence...]
[Translation...]
```

## Translation + Adaptation

### Location: `/backend/prompts/content/translate_and_adapt_*.txt`

Combined prompts that translate from any language to English AND adapt to CEFR level in one pass.

**Process:**
1. Detect source language
2. Translate to English
3. Adapt to target CEFR level
4. Maintain meaning and structure

### Reverse Translation

| File | Purpose |
|------|---------|
| `translate_from_english_A1.txt` | Translate A1 to native language |
| `translate_from_english_A2.txt` | Translate A2 to native language |
| ... | ... |

## Quality Assurance

### Validation Rules

1. **Sentence Length:** Automatic check against level limits
2. **Vocabulary:** Cross-reference with level word lists
3. **Grammar:** Pattern matching for prohibited structures
4. **Coherence:** Semantic similarity to original

### Common Issues

| Issue | Solution |
|-------|----------|
| Level drift (A1→A2) | Stricter prompts, validation |
| Loss of meaning | Preserve key information flag |
| Unnatural phrasing | Native speaker review |
| Inconsistent style | Style guide enforcement |

## Usage in Code

```javascript
// utils/cefrAdapter.js
const fs = require('fs');
const path = require('path');

async function adaptToCEFR(text, level) {
  const promptPath = path.join(__dirname, '../prompts', `cefr_${level}.txt`);
  const promptTemplate = fs.readFileSync(promptPath, 'utf-8');
  
  const prompt = promptTemplate.replace('{text}', text);
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: prompt }
    ],
    temperature: 0.3, // Lower for consistency
    max_tokens: 2000
  });
  
  return response.choices[0].message.content;
}
```

## Metrics

| Level | Avg. Reduction | Vocabulary Range |
|-------|----------------|------------------|
| A1 | 70% | 500 words |
| A2 | 50% | 1000 words |
| B1 | 30% | 2000 words |
| B2 | 15% | 4000 words |
| C1 | 5% | 8000 words |
| C2 | 0% | Unlimited |

## Related Documentation

- [AI Pipeline](../architecture/ai-pipeline.md)
- [Translation Prompts](./translation.md)
- [Topic Generation](./topic-generation.md)
