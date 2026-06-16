const DEFAULT_LONG_THRESHOLD_MINUTES = 6;

const PROFILES = {
  fast: {
    name: 'fast',
    ttsProviderOrder: ['gemini', 'neural2'],
    alignmentProvider: 'groq',
    chunking: {
      maxInputBytes: 2200,
      maxTurnsPerChunk: 4,
    },
    durationProbe: {
      enabled: false,
      concurrency: 2,
    },
  },
  balanced: {
    name: 'balanced',
    ttsProviderOrder: ['gemini', 'neural2'],
    alignmentProvider: 'groq',
    chunking: {
      maxInputBytes: 2600,
      maxTurnsPerChunk: 4,
    },
    durationProbe: {
      enabled: false,
      concurrency: 3,
    },
  },
  accurate: {
    name: 'accurate',
    ttsProviderOrder: ['gemini', 'neural2'],
    alignmentProvider: 'groq',
    chunking: {
      maxInputBytes: 2000,
      maxTurnsPerChunk: 3,
    },
    durationProbe: {
      enabled: true,
      concurrency: 3,
    },
  },
};

function selectPodcastV3Profile(options = {}) {
  const requestedProfile = String(options.profile || process.env.PODCAST_V3_PROFILE || '').trim().toLowerCase();
  if (requestedProfile && PROFILES[requestedProfile]) {
    return PROFILES[requestedProfile];
  }

  const threshold = Number.parseInt(process.env.PODCAST_V3_LONG_THRESHOLD_MINUTES || '', 10)
    || DEFAULT_LONG_THRESHOLD_MINUTES;
  const duration = Number(options.duration) || 0;

  return duration >= threshold ? PROFILES.fast : PROFILES.balanced;
}

module.exports = {
  PROFILES,
  selectPodcastV3Profile,
};
