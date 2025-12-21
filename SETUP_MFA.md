# MFA Integration Setup Guide

## Overview

This guide explains how to set up and test the MFA (Montreal Forced Aligner) integration for high-accuracy word-level timestamp generation.

## What is MFA?

MFA analyzes the actual audio waveform to generate precise word-level timestamps, eliminating the drift issues from TTS API timepoints. This provides:

- **Millisecond precision**: Real acoustic analysis vs. estimated timing
- **No drift**: Eliminates 1+ second sync issues after 2+ minutes
- **No overlap**: Words don't overlap in timeline
- **Perfect sync**: Ideal for karaoke-style word highlighting

## Installation

### Option 1: Docker (Recommended for Production)

```bash
# Pull MFA Docker image
docker pull mmcauliffe/montreal-forced-aligner

# Verify installation
docker run mmcauliffe/montreal-forced-aligner mfa version
```

### Option 2: Conda (Recommended for Development)

```bash
# Create conda environment
conda create -n aligner -c conda-forge montreal-forced-aligner

# Activate environment
conda activate aligner

# Verify installation
mfa version
```

### Option 3: pip (Alternative)

```bash
pip install montreal-forced-aligner
mfa version
```

## Backend Configuration

### 1. Enable MFA in Environment

Add to your `.env` file:

```env
# Enable MFA alignment (set to 'true' to use MFA, 'false' to use TTS timepoints)
USE_MFA_ALIGNMENT=true

# (Optional) Use remote MFA alignment service (recommended for production)
USE_REMOTE_MFA=true

# Remote MFA base URL
MFA_SERVICE_URL=https://api.booklevel.store

# Remote MFA request timeout (ms)
MFA_REMOTE_TIMEOUT_MS=300000

# Remote MFA async mode (recommended if you see Cloudflare 524 on long alignments)
# Uses: POST /api/mfa/align-async + GET /api/mfa/job/:jobId polling
MFA_REMOTE_ASYNC=true
MFA_REMOTE_ASYNC_POLL_INTERVAL_MS=1500
MFA_REMOTE_ASYNC_TIMEOUT_MS=300000

# If remote MFA fails, allow falling back to local MFA
MFA_REMOTE_FALLBACK_TO_LOCAL=true
```

### 2. Model Download (Automatic)

Models are automatically downloaded on first use:

**English (US)**:
- Acoustic: `english_mfa`
- Dictionary: `english_mfa`
- G2P: `english_mfa`

**English (UK)**:
- Acoustic: `english_mfa` (multi-dialect)
- Dictionary: `english_uk_mfa`
- G2P: `english_uk_mfa`

### 3. Manual Model Download (Optional)

If you want to pre-download models:

```bash
# For US English
mfa model download acoustic english_mfa
mfa model download dictionary english_mfa
mfa model download g2p english_mfa

# For UK English
mfa model download dictionary english_uk_mfa
mfa model download g2p english_uk_mfa
```

## Testing

### 1. Start Backend

```bash
cd backend
npm install
npm start
```

### 2. Test TTS Endpoint

```bash
curl -X POST http://localhost:5001/api/tts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "input": "The Montreal Forced Aligner provides accurate word-level timestamps.",
    "input_type": "text",
    "voice": "en-US-Standard-C",
    "level": "b1"
  }'
```

### 3. Check Response

Look for `source: 'mfa'` in timepoints:

```json
{
  "success": true,
  "timepoints": [
    {
      "word": "The",
      "timeSeconds": 0.062,
      "endTimeSeconds": 0.187,
      "index": 0,
      "hasRealTiming": true,
      "source": "mfa"  // ← MFA-generated timing
    },
    ...
  ]
}
```

### 4. Check Logs

Backend logs will show:

```
🎯 Starting MFA alignment for high-accuracy timestamps...
✅ MFA alignment complete - 12 words aligned
🔍 MFA sample timing: [{ word: 'The', startTime: 0.062, endTime: 0.187 }, ...]
✅ Using MFA timepoints - 12 words with acoustic alignment
```

If MFA fails, you'll see:

```
⚠️ MFA alignment failed, falling back to TTS timepoints: [error message]
⚠️ Using TTS timepoints - 12 words with estimated timing
```

## Frontend Verification

### 1. Web AudioPlayer

When MFA is active, you'll see:

```
Sync Quality: ✓ Acoustic (MFA)  |  Millisecond precision
```

When using TTS timepoints:

```
Sync Quality: ⚠ Estimated (TTS)
```

### 2. Performance Indicators

- **Smooth highlighting**: 60 FPS with `requestAnimationFrame`
- **No word skipping**: O(1) amortized search algorithm
- **No drift**: Perfect sync throughout entire audio

## Troubleshooting

### MFA Not Found

**Error**: `MFA is not installed`

**Solution**:
```bash
# Install via conda
conda install -c conda-forge montreal-forced-aligner

# Or via pip
pip install montreal-forced-aligner
```

### Models Not Downloaded

**Error**: `Model not found: english_mfa`

**Solution**:
```bash
mfa model download acoustic english_mfa
mfa model download dictionary english_mfa
mfa model download g2p english_mfa
```

### Audio Format Issues

**Error**: `Failed to parse audio file`

**Solution**: MFA works best with WAV files. The backend automatically converts MP3 to WAV.

### Slow Performance

**First run**: 30-60 seconds (model download + alignment)
**Subsequent runs**: 5-10 seconds (alignment only)

**Optimization**: Consider caching MFA results in database for frequently used texts.

## Performance Comparison

### TTS Timepoints (Old)
- ❌ Drift: 1+ seconds after 2 minutes
- ❌ Overlap: Words can overlap in timeline
- ❌ Estimated: Based on text length, not actual audio
- ⚠️ Accuracy: ~70-80%

### MFA Timepoints (New)
- ✅ No drift: Perfect sync throughout
- ✅ No overlap: Real acoustic boundaries
- ✅ Measured: Actual waveform analysis
- ✅ Accuracy: ~95-99%

## Production Deployment

### 1. Docker Compose

```yaml
services:
  backend:
    build: ./backend
    environment:
      - USE_MFA_ALIGNMENT=true
    volumes:
      - mfa-models:/root/.mfa
  
  mfa:
    image: mmcauliffe/montreal-forced-aligner
    volumes:
      - mfa-models:/root/.mfa

volumes:
  mfa-models:
```

### 2. Caching Strategy

Consider caching MFA results:

```javascript
// Pseudo-code
const cacheKey = `mfa:${hash(text + voice)}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const mfaResult = await mfaAligner.generateWordTimestamps(...);
await redis.set(cacheKey, JSON.stringify(mfaResult), 'EX', 86400); // 24h cache
```

### 3. Fallback Strategy

The system automatically falls back to TTS timepoints if MFA fails:

```javascript
if (useMFA) {
  try {
    mfaWordTimings = await mfaAligner.generateWordTimestamps(...);
  } catch (mfaError) {
    logger.warn('MFA failed, using TTS timepoints');
    // Continue with TTS timepoints
  }
}
```

## References

- MFA Documentation: https://montreal-forced-aligner.readthedocs.io/
- MFA-Analiz.md: Detailed technical analysis (Turkish)
- Backend Implementation: `/backend/utils/mfaAligner.js`
- Frontend Implementation: `/frontend/src/components/AudioPlayer.tsx`

## Support

For issues or questions:
1. Check logs for error messages
2. Verify MFA installation: `mfa version`
3. Test with simple text first
4. Check model downloads: `mfa model list`
