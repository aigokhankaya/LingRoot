# OpenAI Integration

**Last Updated:** December 2025  
**Service:** OpenAI API  
**Files:** `backend/utils/openaiClient.js`, `backend/utils/cefrAdapter.js`, `backend/utils/liroPromptGenerator.js`

## Overview

OpenAI powers the core AI functionality of LingRoot, including CEFR text adaptation, translation, AI chat (Liro), topic generation, and content analysis.

## Configuration

### Environment Variables

```env
OPENAI_API_KEY=sk-your-api-key
OPENAI_MODEL=gpt-4o-mini           # Default for CEFR adaptation
OPENAI_CHAT_MODEL=gpt-4o           # Default for AI chat
OPENAI_EMBEDDING_MODEL=text-embedding-ada-002
```

### Initialization

```javascript
// utils/openaiClient.js
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

module.exports = { openai };
```

## Usage Patterns

### 1. CEFR Text Adaptation

**Purpose:** Adapt text to specific CEFR levels (A1-C2)

```javascript
// utils/cefrAdapter.js
async function adaptToCEFR(text, level) {
  const promptPath = `prompts/cefr_${level}.txt`;
  const systemPrompt = fs.readFileSync(promptPath, 'utf-8');
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text }
    ],
    temperature: 0.3,
    max_tokens: 4000
  });
  
  return response.choices[0].message.content;
}
```

### 2. AI Chat (Liro Assistant)

**Purpose:** Language learning conversational AI

```javascript
// controllers/aiChatController.js
async function sendMessage(conversationId, userMessage, userProfile) {
  const systemPrompt = generateLiroPrompt(userProfile);
  const history = await getConversationHistory(conversationId);
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userMessage }
    ],
    temperature: 0.7,
    max_tokens: 1000
  });
  
  return response.choices[0].message.content;
}
```

### 3. Translation

**Purpose:** Translate text to/from English

```javascript
async function translateToEnglish(text, sourceLanguage) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { 
        role: 'system', 
        content: `Translate the following ${sourceLanguage} text to English. Preserve meaning and tone.`
      },
      { role: 'user', content: text }
    ],
    temperature: 0.2
  });
  
  return response.choices[0].message.content;
}
```

### 4. Text Embeddings

**Purpose:** Generate embeddings for topic similarity search

```javascript
async function createEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text
  });
  
  return response.data[0].embedding;
}
```

### 5. Topic Extraction

**Purpose:** Extract learning topics from conversations

```javascript
async function extractTopics(conversationText) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: TOPIC_EXTRACTION_PROMPT },
      { role: 'user', content: conversationText }
    ],
    response_format: { type: 'json_object' }
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

## Models Used

| Model | Use Case | Token Limit | Cost |
|-------|----------|-------------|------|
| `gpt-4o` | AI Chat, Complex tasks | 128K | Higher |
| `gpt-4o-mini` | CEFR adaptation, Translation | 128K | Lower |
| `text-embedding-ada-002` | Embeddings | 8K | Minimal |

## Error Handling

```javascript
async function callOpenAI(requestFn) {
  try {
    return await requestFn();
  } catch (error) {
    if (error.code === 'rate_limit_exceeded') {
      logger.warn('OpenAI rate limit, retrying after delay');
      await delay(60000);
      return await requestFn();
    }
    
    if (error.code === 'context_length_exceeded') {
      logger.error('Content too long for model');
      throw new AppError('CONTENT_TOO_LONG', 'Text exceeds model limit', 400);
    }
    
    if (error.code === 'insufficient_quota') {
      logger.error('OpenAI quota exceeded');
      throw new AppError('AI_QUOTA_EXCEEDED', 'AI service quota exceeded', 503);
    }
    
    logger.error('OpenAI API error:', error);
    throw new AppError('OPENAI_API_ERROR', 'AI service unavailable', 502);
  }
}
```

## Rate Limiting

| Tier | RPM | TPM |
|------|-----|-----|
| Tier 1 | 500 | 30,000 |
| Tier 2 | 5,000 | 450,000 |
| Tier 3 | 5,000 | 1,000,000 |

**Implementation:**
```javascript
const rateLimit = require('express-rate-limit');

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20, // 20 AI requests per minute per user
  message: { error: 'AI rate limit exceeded' }
});
```

## Cost Tracking

```javascript
// utils/costTracker.js
async function trackOpenAICost(userId, model, inputTokens, outputTokens) {
  const costs = {
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'text-embedding-ada-002': { input: 0.0001 }
  };
  
  const cost = (inputTokens / 1000 * costs[model].input) +
               (outputTokens / 1000 * (costs[model].output || 0));
  
  await db('api_costs').insert({
    user_id: userId,
    service: 'openai',
    model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost,
    created_at: new Date()
  });
}
```

## Security Considerations

1. **API Key Protection:** Never expose in client-side code
2. **Input Validation:** Sanitize user input before sending
3. **Output Filtering:** Check AI responses for harmful content
4. **Rate Limiting:** Prevent abuse and cost overruns
5. **Logging:** Log requests without sensitive content

## Performance Optimization

1. **Streaming:** Use streaming for long responses
2. **Caching:** Cache common translations/adaptations
3. **Batching:** Combine multiple small requests
4. **Model Selection:** Use appropriate model for task

## Fallback Strategy

```javascript
const AI_FALLBACK = {
  async adaptText(text, level) {
    // If OpenAI fails, return original text with warning
    return {
      text: text,
      warning: 'CEFR adaptation unavailable',
      adapted: false
    };
  }
};
```

## Related Files

- `backend/utils/openaiClient.js` - Client initialization
- `backend/utils/cefrAdapter.js` - CEFR adaptation
- `backend/utils/liroPromptGenerator.js` - Chat prompts
- `backend/utils/translateAndAdapt.js` - Translation
- `backend/prompts/` - All prompt templates

## Related Documentation

- [AI Pipeline](../architecture/ai-pipeline.md)
- [CEFR Conversion](../prompts/cefr-conversion.md)
- [Liro Assistant](../prompts/liro-assistant.md)
