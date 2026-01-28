// backend/utils/lingrootVoices.js

// Lingroot voice abstraction layer: maps provider-agnostic Lingroot IDs
// to concrete Google TTS and Amazon Polly voice names.
// Labels updated to "Accent Gender Number (Style)" format per user request (names removed).

const LINGROOT_VOICES = [
  // --- US FEMALE ---
  {
    id: 'lr_us_female_basic_1',
    label: 'Amerikan Kadın 1 (Basic)',
    gender: 'female',
    accent: 'american',
    quality: 'basic',
    google: { name: 'en-US-Standard-C', languageCode: 'en-US' },
    polly: { name: 'Joanna', languageCode: 'en-US', engine: 'standard' }
  },
  {
    id: 'lr_us_female_premium_1',
    label: 'Amerikan Kadın 2 (Silver)',
    gender: 'female',
    accent: 'american',
    quality: 'premium',
    google: { name: 'en-US-Neural2-H', languageCode: 'en-US' },
    polly: { name: 'Salli', languageCode: 'en-US', engine: 'neural' }
  },
  {
    id: 'lr_us_journey_female_1',
    label: 'Amerikan Kadın 3 (Gold)',
    gender: 'female',
    accent: 'american',
    quality: 'ultra',
    google: { name: 'en-US-Journey-F', languageCode: 'en-US' }
  },
  {
    id: 'lr_us_female_generative_1',
    label: 'Amerikan Kadın 4 (Generative)',
    gender: 'female',
    accent: 'american',
    quality: 'generative',
    google: { name: 'en-US-Journey-F', languageCode: 'en-US' },
    polly: { name: 'Ruth', languageCode: 'en-US', engine: 'generative' }
  },

  // --- US MALE ---
  {
    id: 'lr_us_male_basic_1',
    label: 'Amerikan Erkek 1 (Basic)',
    gender: 'male',
    accent: 'american',
    quality: 'basic',
    google: { name: 'en-US-Standard-D', languageCode: 'en-US' },
    polly: { name: 'Matthew', languageCode: 'en-US', engine: 'standard' }
  },
  {
    id: 'lr_us_male_premium_1',
    label: 'Amerikan Erkek 2 (Silver)',
    gender: 'male',
    accent: 'american',
    quality: 'premium',
    google: { name: 'en-US-Neural2-J', languageCode: 'en-US' },
    polly: { name: 'Justin', languageCode: 'en-US', engine: 'neural' }
  },
  {
    id: 'lr_us_journey_male_1',
    label: 'Amerikan Erkek 3 (Gold)',
    gender: 'male',
    accent: 'american',
    quality: 'ultra',
    google: { name: 'en-US-Journey-D', languageCode: 'en-US' }
  },
  {
    id: 'lr_us_male_generative_1',
    label: 'Amerikan Erkek 4 (Generative)',
    gender: 'male',
    accent: 'american',
    quality: 'generative',
    google: { name: 'en-US-Journey-D', languageCode: 'en-US' },
    polly: { name: 'Matthew', languageCode: 'en-US', engine: 'generative' }
  },

  // --- GB FEMALE ---
  {
    id: 'lr_gb_female_basic_1',
    label: 'İngiliz Kadın 1 (Basic)',
    gender: 'female',
    accent: 'british',
    quality: 'basic',
    google: { name: 'en-GB-Standard-A', languageCode: 'en-GB' },
    polly: { name: 'Amy', languageCode: 'en-GB', engine: 'standard' }
  },
  {
    id: 'lr_gb_female_premium_1',
    label: 'İngiliz Kadın 2 (Silver)',
    gender: 'female',
    accent: 'british',
    quality: 'premium',
    google: { name: 'en-GB-Neural2-C', languageCode: 'en-GB' },
    polly: { name: 'Emma', languageCode: 'en-GB', engine: 'neural' }
  },
  {
    id: 'lr_gb_female_generative_1',
    label: 'İngiliz Kadın 3 (Generative)',
    gender: 'female',
    accent: 'british',
    quality: 'generative',
    google: { name: 'en-GB-Neural2-C', languageCode: 'en-GB' },
    polly: { name: 'Amy', languageCode: 'en-GB', engine: 'generative' }
  },

  // --- GB MALE ---
  {
    id: 'lr_gb_male_basic_1',
    label: 'İngiliz Erkek 1 (Basic)',
    gender: 'male',
    accent: 'british',
    quality: 'basic',
    google: { name: 'en-GB-Standard-B', languageCode: 'en-GB' },
    polly: { name: 'Brian', languageCode: 'en-GB', engine: 'standard' }
  },
  {
    id: 'lr_gb_male_premium_1',
    label: 'İngiliz Erkek 2 (Silver)',
    gender: 'male',
    accent: 'british',
    quality: 'premium',
    google: { name: 'en-GB-Neural2-B', languageCode: 'en-GB' },
    polly: { name: 'Arthur', languageCode: 'en-GB', engine: 'neural' }
  },
  {
    id: 'lr_gb_male_generative_1',
    label: 'İngiliz Erkek 3 (Generative)',
    gender: 'male',
    accent: 'british',
    quality: 'generative',
    google: { name: 'en-GB-Neural2-B', languageCode: 'en-GB' },
    polly: { name: 'Arthur', languageCode: 'en-GB', engine: 'generative' }
  },

  // --- AU FEMALE ---
  {
    id: 'lr_au_female_basic_1',
    label: 'Avustralyalı Kadın 1 (Basic)',
    gender: 'female',
    accent: 'australian',
    quality: 'basic',
    google: { name: 'en-AU-Standard-C', languageCode: 'en-AU' },
    polly: { name: 'Olivia', languageCode: 'en-AU', engine: 'standard' }
  },
  {
    id: 'lr_au_female_premium_1',
    label: 'Avustralyalı Kadın 2 (Silver)',
    gender: 'female',
    accent: 'australian',
    quality: 'premium',
    google: { name: 'en-AU-Neural2-A', languageCode: 'en-AU' },
    polly: { name: 'Olivia', languageCode: 'en-AU', engine: 'neural' }
  },

  // --- IN FEMALE ---
  {
    id: 'lr_in_female_basic_1',
    label: 'Hint Kadın 1 (Basic)',
    gender: 'female',
    accent: 'indian',
    quality: 'basic',
    google: { name: 'en-IN-Standard-A', languageCode: 'en-IN' },
    polly: { name: 'Kajal', languageCode: 'en-IN', engine: 'standard' }
  },
  {
    id: 'lr_in_female_premium_1',
    label: 'Hint Kadın 2 (Silver)',
    gender: 'female',
    accent: 'indian',
    quality: 'premium',
    google: { name: 'en-IN-Wavenet-A', languageCode: 'en-IN' },
    polly: { name: 'Kajal', languageCode: 'en-IN', engine: 'neural' }
  },
  // --- US STUDIO (Google Only) ---
  {
    id: 'lr_us_studio_male_1',
    label: 'Amerikan Erkek 5 (Platinum)',
    gender: 'male',
    accent: 'american',
    quality: 'platinum',
    google: { name: 'en-US-Studio-O', languageCode: 'en-US' },
    polly: { name: 'Matthew', languageCode: 'en-US', engine: 'neural' } // Fallback to best available
  },
  {
    id: 'lr_us_studio_female_1',
    label: 'Amerikan Kadın 5 (Platinum)',
    gender: 'female',
    accent: 'american',
    quality: 'platinum',
    google: { name: 'en-US-Studio-O', languageCode: 'en-US' },
    polly: { name: 'Joanna', languageCode: 'en-US', engine: 'neural' }
  },

  // --- US CHIRP (Google Only) ---
  {
    id: 'lr_us_chirp_female_1',
    label: 'Amerikan Kadın 6 (Gold)',
    gender: 'female',
    accent: 'american',
    quality: 'gold',
    google: { name: 'en-US-Chirp-HD-F', languageCode: 'en-US' },
    polly: { name: 'Ruth', languageCode: 'en-US', engine: 'generative' } // Closest high-end match
  },
  {
    id: 'lr_us_chirp_male_1',
    label: 'Amerikan Erkek 6 (Gold)',
    gender: 'male',
    accent: 'american',
    quality: 'gold',
    google: { name: 'en-US-Chirp-HD-D', languageCode: 'en-US' },
    polly: { name: 'Matthew', languageCode: 'en-US', engine: 'generative' }
  }
];

function getLingrootVoices() {
  return LINGROOT_VOICES;
}

function getLingrootVoiceById(id) {
  if (!id) return null;
  return LINGROOT_VOICES.find(v => v.id === id) || null;
}

function mapLingrootToProviderVoice(id, provider) {
  const voice = getLingrootVoiceById(id);
  if (!voice) return null;

  const normalized = (provider || '').toLowerCase();
  if (normalized === 'polly' || normalized === 'amazon') {
    return voice.polly || null;
  }

  if (normalized === 'openai') {
    return voice.openai || null;
  }

  // Default to Google for any other provider ('google', 'azure', unknown)
  return voice.google || null;
}

function getDefaultLingrootVoiceId(languageCode = 'en-US') {
  const lc = (languageCode || 'en-US').toLowerCase();

  if (lc.startsWith('en-gb')) {
    return 'lr_gb_female_basic_1';
  }
  if (lc.startsWith('en-au')) {
    return 'lr_au_female_basic_1';
  }
  if (lc.startsWith('en-in')) {
    return 'lr_in_female_basic_1';
  }

  // Fallback to US female basic
  return 'lr_us_female_basic_1';
}

module.exports = {
  getLingrootVoices,
  getLingrootVoiceById,
  mapLingrootToProviderVoice,
  getDefaultLingrootVoiceId,
};
