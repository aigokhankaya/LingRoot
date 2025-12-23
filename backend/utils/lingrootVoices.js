// backend/utils/lingrootVoices.js

// Lingroot voice abstraction layer: maps provider-agnostic Lingroot IDs
// to concrete Google TTS and Amazon Polly voice names.

const LINGROOT_VOICES = [
  {
    id: 'lr_us_female_basic_1',
    label: 'Emma – Amerikan Kadın (Sıcak)',
    gender: 'female',
    accent: 'american',
    quality: 'basic',
    google: { name: 'en-US-Standard-C', languageCode: 'en-US' },
    polly: { name: 'Joanna', languageCode: 'en-US', engine: 'standard' }
  },
  {
    id: 'lr_us_male_basic_1',
    label: 'Noah – Amerikan Erkek (Doğal)',
    gender: 'male',
    accent: 'american',
    quality: 'basic',
    google: { name: 'en-US-Standard-D', languageCode: 'en-US' },
    polly: { name: 'Matthew', languageCode: 'en-US', engine: 'standard' }
  },
  {
    id: 'lr_gb_female_basic_1',
    label: 'Sophie – İngiliz Kadın (Sakin)',
    gender: 'female',
    accent: 'british',
    quality: 'basic',
    google: { name: 'en-GB-Standard-A', languageCode: 'en-GB' },
    polly: { name: 'Amy', languageCode: 'en-GB', engine: 'standard' }
  },
  {
    id: 'lr_gb_male_basic_1',
    label: 'James – İngiliz Erkek (Doğal)',
    gender: 'male',
    accent: 'british',
    quality: 'basic',
    google: { name: 'en-GB-Standard-B', languageCode: 'en-GB' },
    polly: { name: 'Brian', languageCode: 'en-GB', engine: 'standard' }
  },
  {
    id: 'lr_au_female_basic_1',
    label: 'Zoe – Avustralyalı Kadın (Canlı)',
    gender: 'female',
    accent: 'australian',
    quality: 'basic',
    google: { name: 'en-AU-Standard-C', languageCode: 'en-AU' },
    polly: { name: 'Olivia', languageCode: 'en-AU', engine: 'standard' }
  },
  {
    id: 'lr_in_female_basic_1',
    label: 'Anaya – Hint Kadın (Net)',
    gender: 'female',
    accent: 'indian',
    quality: 'basic',
    google: { name: 'en-IN-Standard-A', languageCode: 'en-IN' },
    polly: { name: 'Kajal', languageCode: 'en-IN', engine: 'standard' }
  },
  // Premium / Neural personas
  {
    id: 'lr_us_female_premium_1',
    label: 'Luna – Amerikan Kadın (Neural)',
    gender: 'female',
    accent: 'american',
    quality: 'premium',
    google: { name: 'en-US-Neural2-H', languageCode: 'en-US' },
    polly: { name: 'Salli', languageCode: 'en-US', engine: 'neural' }
  },
  {
    id: 'lr_us_male_premium_1',
    label: 'Ethan – Amerikan Erkek (Neural)',
    gender: 'male',
    accent: 'american',
    quality: 'premium',
    google: { name: 'en-US-Neural2-J', languageCode: 'en-US' },
    polly: { name: 'Justin', languageCode: 'en-US', engine: 'neural' }
  },
  {
    id: 'lr_gb_female_premium_1',
    label: 'Charlotte – İngiliz Kadın (Neural)',
    gender: 'female',
    accent: 'british',
    quality: 'premium',
    google: { name: 'en-GB-Neural2-C', languageCode: 'en-GB' },
    polly: { name: 'Emma', languageCode: 'en-GB', engine: 'neural' }
  },
  {
    id: 'lr_gb_male_premium_1',
    label: 'Oliver – İngiliz Erkek (Neural)',
    gender: 'male',
    accent: 'british',
    quality: 'premium',
    google: { name: 'en-GB-Neural2-B', languageCode: 'en-GB' },
    polly: { name: 'Arthur', languageCode: 'en-GB', engine: 'neural' }
  },
  {
    id: 'lr_au_female_premium_1',
    label: 'Mia – Avustralyalı Kadın (Neural)',
    gender: 'female',
    accent: 'australian',
    quality: 'premium',
    google: { name: 'en-AU-Neural2-A', languageCode: 'en-AU' },
    polly: { name: 'Olivia', languageCode: 'en-AU', engine: 'neural' }
  },
  {
    id: 'lr_in_female_premium_1',
    label: 'Isha – Hint Kadın (Neural)',
    gender: 'female',
    accent: 'indian',
    quality: 'premium',
    google: { name: 'en-IN-Wavenet-A', languageCode: 'en-IN' },
    polly: { name: 'Kajal', languageCode: 'en-IN', engine: 'neural' }
  },
  // Ultra Premium / Journey (Audiobook Optimized)
  {
    id: 'lr_us_journey_male_1',
    label: 'Narrator – Amerikan Erkek (Journey/Studio)',
    gender: 'male',
    accent: 'american',
    quality: 'ultra',
    google: { name: 'en-US-Journey-D', languageCode: 'en-US' }
  },
  {
    id: 'lr_us_journey_female_1',
    label: 'Narrator – Amerikan Kadın (Journey/Studio)',
    gender: 'female',
    accent: 'american',
    quality: 'ultra',
    google: { name: 'en-US-Journey-F', languageCode: 'en-US' }
  },
  // OpenAI TTS Voices - Premium quality, human-like
  {
    id: 'lr_openai_alloy',
    label: 'Alloy – Nötr (OpenAI)',
    gender: 'neutral',
    accent: 'american',
    quality: 'premium',
    openai: { name: 'alloy', model: 'tts-1' }
  },
  {
    id: 'lr_openai_echo',
    label: 'Echo – Erkek Sıcak (OpenAI)',
    gender: 'male',
    accent: 'american',
    quality: 'premium',
    openai: { name: 'echo', model: 'tts-1' }
  },
  {
    id: 'lr_openai_fable',
    label: 'Fable – Kadın İngiliz (OpenAI)',
    gender: 'female',
    accent: 'british',
    quality: 'premium',
    openai: { name: 'fable', model: 'tts-1' }
  },
  {
    id: 'lr_openai_onyx',
    label: 'Onyx – Erkek Otoriter (OpenAI)',
    gender: 'male',
    accent: 'american',
    quality: 'premium',
    openai: { name: 'onyx', model: 'tts-1' }
  },
  {
    id: 'lr_openai_nova',
    label: 'Nova – Kadın Enerjik (OpenAI)',
    gender: 'female',
    accent: 'american',
    quality: 'premium',
    openai: { name: 'nova', model: 'tts-1' }
  },
  {
    id: 'lr_openai_shimmer',
    label: 'Shimmer – Kadın Sakin (OpenAI)',
    gender: 'female',
    accent: 'american',
    quality: 'premium',
    openai: { name: 'shimmer', model: 'tts-1' }
  },
  // OpenAI TTS HD Voices - Ultra premium quality
  {
    id: 'lr_openai_nova_hd',
    label: 'Nova HD – Kadın Enerjik (OpenAI Ultra)',
    gender: 'female',
    accent: 'american',
    quality: 'ultra',
    openai: { name: 'nova', model: 'tts-1-hd' }
  },
  {
    id: 'lr_openai_onyx_hd',
    label: 'Onyx HD – Erkek Otoriter (OpenAI Ultra)',
    gender: 'male',
    accent: 'american',
    quality: 'ultra',
    openai: { name: 'onyx', model: 'tts-1-hd' }
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
