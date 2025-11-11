# MFA (Montreal Forced Aligner) Integration

## Overview

This integration adds high-accuracy word-level timestamp generation using MFA acoustic analysis, eliminating the drift issues from TTS API timepoints.

## Installation

### Option 1: Docker (Recommended)

```bash
docker pull mmcauliffe/montreal-forced-aligner
```

### Option 2: Conda

```bash
conda create -n aligner -c conda-forge montreal-forced-aligner
conda activate aligner
```

## Configuration

Add to your `.env` file:

```env
# Enable MFA alignment (set to 'true' to use MFA, 'false' to use TTS timepoints)
USE_MFA_ALIGNMENT=false
```

## Usage

When `USE_MFA_ALIGNMENT=true`, the TTS controller will:

1. Generate audio using TTS API (Google/Polly)
2. Run MFA acoustic alignment on the audio file
3. Return MFA-generated timepoints instead of TTS timepoints
4. Fall back to TTS timepoints if MFA fails

## Models

The system automatically downloads required models:

### English (US)
- Acoustic: `english_mfa`
- Dictionary: `english_mfa`
- G2P: `english_mfa`

### English (UK)
- Acoustic: `english_mfa` (multi-dialect)
- Dictionary: `english_uk_mfa`
- G2P: `english_uk_mfa`

## Benefits

- **Eliminates drift**: No more 1+ second sync issues
- **Acoustic accuracy**: Real waveform analysis vs. estimated timing
- **No overlap**: Words don't overlap in timeline
- **Millisecond precision**: Perfect for karaoke-style highlighting

## Performance

- First run: ~30-60 seconds (model download + alignment)
- Subsequent runs: ~5-10 seconds (alignment only)
- Recommended for production with caching

## Troubleshooting

If MFA fails, the system automatically falls back to TTS timepoints. Check logs for:

```
⚠️ MFA alignment failed, falling back to TTS timepoints
```

Common issues:
- MFA not installed
- Models not downloaded
- Audio format incompatible (use WAV)
