# Google Cloud Text-to-Speech Integration

**Last Updated:** December 2025  
**Service:** Google Cloud Text-to-Speech API  
**File:** `backend/utils/googleTTS.js`

## Overview

Google Cloud TTS is the primary text-to-speech provider for LingRoot, offering high-quality Wavenet and Neural2 voices for audio content generation.

## Configuration

### Environment Variables

```env
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
# OR inline credentials
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_CLOUD_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

### Initialization

```javascript
// utils/googleTTS.js
const textToSpeech = require('@google-cloud/text-to-speech');

const client = new textToSpeech.TextToSpeechClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});
```

## Usage

### Basic Synthesis

```javascript
async function synthesize(text, voice, speakingRate = 1.0) {
  const request = {
    input: { text },
    voice: {
      languageCode: voice.split('-').slice(0, 2).join('-'),
      name: voice
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate,
      pitch: 0,
      volumeGainDb: 0,
      effectsProfileId: ['small-bluetooth-speaker-class-device']
    }
  };
  
  const [response] = await client.synthesizeSpeech(request);
  return response.audioContent;
}
```

### SSML Synthesis

```javascript
async function synthesizeWithSSML(ssml, voice, speakingRate) {
  const request = {
    input: { ssml },
    voice: {
      languageCode: 'en-US',
      name: voice
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate
    }
  };
  
  const [response] = await client.synthesizeSpeech(request);
  return response.audioContent;
}

// SSML example with pauses
const ssml = `
<speak>
  Hello. <break time="500ms"/>
  Welcome to LingRoot. <break time="300ms"/>
  Let's start learning.
</speak>
`;
```

### Long Text Processing

```javascript
// Google TTS has a 5000 character limit per request
async function synthesizeLongText(text, voice, speakingRate) {
  const chunks = chunkText(text, 4500); // Safety margin
  const audioBuffers = [];
  
  for (const chunk of chunks) {
    const audio = await synthesize(chunk, voice, speakingRate);
    audioBuffers.push(audio);
  }
  
  return mergeAudioBuffers(audioBuffers);
}
```

## Available Voices

### English Voices

| Voice ID | Gender | Type | Quality |
|----------|--------|------|---------|
| `en-US-Wavenet-D` | Male | Wavenet | High |
| `en-US-Wavenet-F` | Female | Wavenet | High |
| `en-GB-Wavenet-A` | Female | Wavenet | High |
| `en-GB-Wavenet-B` | Male | Wavenet | High |
| `en-US-Neural2-A` | Male | Neural2 | Premium |
| `en-US-Neural2-C` | Female | Neural2 | Premium |
| `en-AU-Neural2-A` | Female | Neural2 | Premium |
| `en-AU-Neural2-B` | Male | Neural2 | Premium |

### Other Languages

| Language | Voice Example |
|----------|---------------|
| Turkish | `tr-TR-Wavenet-A` (Female), `tr-TR-Wavenet-B` (Male) |
| German | `de-DE-Wavenet-A`, `de-DE-Wavenet-B` |
| French | `fr-FR-Wavenet-A`, `fr-FR-Wavenet-B` |
| Spanish | `es-ES-Wavenet-B`, `es-ES-Wavenet-C` |

### Voice Selection in Code

```javascript
// utils/lingrootVoices.js
const VOICES = {
  professional: [
    'en-US-Neural2-A',
    'en-US-Neural2-C',
    'en-GB-Neural2-A'
  ],
  casual: [
    'en-US-Wavenet-D',
    'en-US-Wavenet-F'
  ],
  british: [
    'en-GB-Wavenet-A',
    'en-GB-Wavenet-B'
  ],
  australian: [
    'en-AU-Neural2-A',
    'en-AU-Neural2-B'
  ]
};

function getVoice(category, gender) {
  const voices = VOICES[category] || VOICES.professional;
  return voices.find(v => matchesGender(v, gender)) || voices[0];
}
```

## Pricing

| Voice Type | Per 1M Characters |
|------------|-------------------|
| Standard | $4.00 |
| Wavenet | $16.00 |
| Neural2 | $16.00 |

**Free Tier:** 1M Standard, 1M Wavenet characters/month

## Error Handling

```javascript
async function synthesizeWithFallback(text, voice, speakingRate) {
  try {
    return await synthesize(text, voice, speakingRate);
  } catch (error) {
    if (error.code === 3) { // INVALID_ARGUMENT
      logger.warn('Invalid voice, falling back to default');
      return await synthesize(text, 'en-US-Wavenet-D', speakingRate);
    }
    
    if (error.code === 8) { // RESOURCE_EXHAUSTED
      logger.error('Google TTS quota exceeded');
      throw new AppError('TTS_QUOTA_EXCEEDED', 'TTS quota exceeded', 503);
    }
    
    if (error.code === 14) { // UNAVAILABLE
      logger.warn('Google TTS unavailable, trying Azure');
      return await azureTTS.synthesize(text, voice, speakingRate);
    }
    
    throw error;
  }
}
```

## Performance Optimization

### Caching

```javascript
const audioCache = new Map();

async function getCachedAudio(text, voice, rate) {
  const cacheKey = `${hashText(text)}_${voice}_${rate}`;
  
  if (audioCache.has(cacheKey)) {
    return audioCache.get(cacheKey);
  }
  
  const audio = await synthesize(text, voice, rate);
  audioCache.set(cacheKey, audio);
  
  return audio;
}
```

### Parallel Processing

```javascript
async function synthesizeChunksParallel(chunks, voice, rate) {
  const CONCURRENCY = 5;
  const results = [];
  
  for (let i = 0; i < chunks.length; i += CONCURRENCY) {
    const batch = chunks.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(chunk => synthesize(chunk, voice, rate))
    );
    results.push(...batchResults);
  }
  
  return results;
}
```

## Security Considerations

1. **Credentials:** Store securely, never in code
2. **Service Account:** Use minimum required permissions
3. **Quota Monitoring:** Set up billing alerts
4. **Input Sanitization:** Clean text before synthesis
5. **Rate Limiting:** Limit per-user requests

## Quota Management

```javascript
// Track usage per user
async function checkTTSQuota(userId) {
  const today = new Date().toISOString().split('T')[0];
  const usage = await db('tts_usage')
    .where({ user_id: userId, date: today })
    .sum('characters as total')
    .first();
  
  const limit = await getUserDailyLimit(userId);
  
  if (usage.total >= limit) {
    throw new AppError('USAGE_LIMIT_EXCEEDED', 'Daily TTS limit reached', 403);
  }
  
  return limit - usage.total;
}
```

## Related Files

- `backend/utils/googleTTS.js` - Main TTS utility
- `backend/utils/lingrootVoices.js` - Voice definitions
- `backend/utils/audioMerger.js` - Audio merging
- `backend/controllers/ttsController.js` - TTS endpoints

## Related Documentation

- [Azure TTS](./azure-tts.md)
- [AI Pipeline](../architecture/ai-pipeline.md)
- [API Architecture](../architecture/api-architecture.md)
