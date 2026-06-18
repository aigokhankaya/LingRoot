const DEFAULT_HOST_SPEAKER = 'Kore';
const DEFAULT_GUEST_SPEAKER = 'Charon';

const GEMINI_SPEAKERS = {
  Aoede: { gender: 'female' },
  Kore: { gender: 'female' },
  Leda: { gender: 'female' },
  Zephyr: { gender: 'female' },
  Callirrhoe: { gender: 'female' },
  Charon: { gender: 'male' },
  Fenrir: { gender: 'male' },
  Orus: { gender: 'male' },
  Puck: { gender: 'male' },
  Achird: { gender: 'male' },
};

const LEGACY_VOICE_MAPPING = {
  Achilles: 'Achird',
};

const GEMINI_TO_NEURAL2_FALLBACK = {
  Kore: 'en-US-Neural2-F',
  Aoede: 'en-GB-Neural2-C',
  Leda: 'en-US-Neural2-C',
  Zephyr: 'en-US-Neural2-F',
  Callirrhoe: 'en-US-Neural2-F',
  Charon: 'en-US-Neural2-J',
  Fenrir: 'en-US-Neural2-D',
  Orus: 'en-US-Neural2-J',
  Puck: 'en-GB-Neural2-B',
  Achird: 'en-US-Neural2-D',
};

function normalizeSpeakerId(speakerId) {
  if (!speakerId || typeof speakerId !== 'string') {
    return speakerId;
  }

  return LEGACY_VOICE_MAPPING[speakerId] || speakerId;
}

function isValidGeminiSpeaker(speakerId) {
  return typeof speakerId === 'string' && Boolean(GEMINI_SPEAKERS[speakerId]);
}

function deriveLanguageCodeFromVoiceName(voiceName, fallback = 'en-US') {
  if (!voiceName || typeof voiceName !== 'string') {
    return fallback;
  }

  const parts = voiceName.split('-');
  if (parts.length >= 2) {
    return `${parts[0]}-${parts[1]}`;
  }

  return fallback;
}

function resolveNeural2FallbackVoice(speakerId, speakerRole) {
  const normalizedSpeakerId = normalizeSpeakerId(speakerId);
  const mappedVoice = GEMINI_TO_NEURAL2_FALLBACK[normalizedSpeakerId];

  if (mappedVoice) {
    return mappedVoice;
  }

  const inferredGender = GEMINI_SPEAKERS[normalizedSpeakerId]?.gender;
  if (inferredGender === 'female') {
    return 'en-US-Neural2-F';
  }

  if (inferredGender === 'male') {
    return 'en-US-Neural2-J';
  }

  return speakerRole === 'A' ? 'en-US-Neural2-F' : 'en-US-Neural2-J';
}

function resolveVoicePlan(options = {}) {
  const normalizedRequestedHost = normalizeSpeakerId(options.requestedHostSpeakerId);
  const normalizedRequestedGuest = normalizeSpeakerId(options.requestedGuestSpeakerId);
  const normalizedScriptHost = normalizeSpeakerId(options.scriptSpeakerAId);
  const normalizedScriptGuest = normalizeSpeakerId(options.scriptSpeakerBId);

  let finalHostSpeakerId = isValidGeminiSpeaker(normalizedRequestedHost)
    ? normalizedRequestedHost
    : (isValidGeminiSpeaker(normalizedScriptHost) ? normalizedScriptHost : DEFAULT_HOST_SPEAKER);

  let finalGuestSpeakerId = isValidGeminiSpeaker(normalizedRequestedGuest)
    ? normalizedRequestedGuest
    : (isValidGeminiSpeaker(normalizedScriptGuest) ? normalizedScriptGuest : DEFAULT_GUEST_SPEAKER);

  if (finalHostSpeakerId === finalGuestSpeakerId) {
    const hostGender = GEMINI_SPEAKERS[finalHostSpeakerId]?.gender;
    finalGuestSpeakerId = hostGender === 'female' ? DEFAULT_GUEST_SPEAKER : DEFAULT_HOST_SPEAKER;
    if (finalGuestSpeakerId === finalHostSpeakerId) {
      finalGuestSpeakerId = finalHostSpeakerId === DEFAULT_HOST_SPEAKER ? DEFAULT_GUEST_SPEAKER : DEFAULT_HOST_SPEAKER;
    }
  }

  const hostFallbackVoiceName = resolveNeural2FallbackVoice(finalHostSpeakerId, 'A');
  const guestFallbackVoiceName = resolveNeural2FallbackVoice(finalGuestSpeakerId, 'B');

  return {
    host: {
      geminiSpeakerId: finalHostSpeakerId,
      fallbackVoiceName: hostFallbackVoiceName,
      languageCode: deriveLanguageCodeFromVoiceName(hostFallbackVoiceName),
      gender: GEMINI_SPEAKERS[finalHostSpeakerId]?.gender || 'female',
    },
    guest: {
      geminiSpeakerId: finalGuestSpeakerId,
      fallbackVoiceName: guestFallbackVoiceName,
      languageCode: deriveLanguageCodeFromVoiceName(guestFallbackVoiceName),
      gender: GEMINI_SPEAKERS[finalGuestSpeakerId]?.gender || 'male',
    },
  };
}

module.exports = {
  DEFAULT_GUEST_SPEAKER,
  DEFAULT_HOST_SPEAKER,
  deriveLanguageCodeFromVoiceName,
  normalizeSpeakerId,
  resolveNeural2FallbackVoice,
  resolveVoicePlan,
};
