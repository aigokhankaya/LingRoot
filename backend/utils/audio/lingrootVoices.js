// backend/utils/audio/lingrootVoices.js
// Data-driven Lingroot voice abstraction layer.
// Maps 230 Google TTS voices to provider-agnostic Lingroot IDs with active/passive control.

// ─── Section 1: Constants ───

const ACCENT_MAP = {
  'en-US': 'american',
  'en-GB': 'british',
  'en-AU': 'australian',
  'en-IN': 'indian',
};

const ACCENT_LABEL_TR = {
  'en-US': 'Amerikan',
  'en-GB': 'Ingiliz',
  'en-AU': 'Avustralyali',
  'en-IN': 'Hint',
};

const GENDER_LABEL_TR = { female: 'Kadin', male: 'Erkek' };

const VOICE_TYPE_QUALITY = {
  standard: 'basic',
  wavenet: 'silver',
  neural2: 'silver',
  news: 'silver',
  casual: 'silver',
  polyglot: 'silver',
  studio: 'platinum',
  'chirp-hd': 'gold',
  'chirp3-hd': 'gold',
};

const VOICE_TYPE_LABEL = {
  standard: 'Standard',
  wavenet: 'WaveNet',
  neural2: 'Neural2',
  news: 'News',
  casual: 'Casual',
  polyglot: 'Polyglot',
  studio: 'Studio',
  'chirp-hd': 'Chirp-HD',
  'chirp3-hd': 'Chirp3-HD',
};

function buildLabel(locale, voiceType, suffix, gender) {
  const accentTR = ACCENT_LABEL_TR[locale];
  const typeLbl = VOICE_TYPE_LABEL[voiceType];
  const genderTR = GENDER_LABEL_TR[gender];
  return `${accentTR} ${typeLbl} ${suffix} (${genderTR})`;
}

// ─── Section 2: Voice Data (compact) ───
// Format: [suffix, gender]

const VOICE_DATA = {
  'en-US': {
    standard: [
      ['A', 'male'], ['B', 'male'], ['C', 'female'], ['D', 'male'], ['E', 'female'],
      ['F', 'female'], ['G', 'female'], ['H', 'female'], ['I', 'male'], ['J', 'male'],
    ],
    wavenet: [
      ['A', 'male'], ['B', 'male'], ['C', 'female'], ['D', 'male'], ['E', 'female'],
      ['F', 'female'], ['G', 'female'], ['H', 'female'], ['I', 'male'], ['J', 'male'],
    ],
    neural2: [
      ['A', 'male'], ['C', 'female'], ['D', 'male'], ['E', 'female'], ['F', 'female'],
      ['G', 'female'], ['H', 'female'], ['I', 'male'], ['J', 'male'],
    ],
    news: [['K', 'female'], ['L', 'female'], ['N', 'male']],
    casual: [['K', 'male']],
    polyglot: [['1', 'male']],
    studio: [['O', 'female'], ['Q', 'male']],
    'chirp-hd': [['D', 'male'], ['F', 'female'], ['O', 'female']],
  },
  'en-GB': {
    standard: [
      ['A', 'female'], ['B', 'male'], ['C', 'female'], ['D', 'male'],
      ['F', 'female'], ['N', 'female'], ['O', 'male'],
    ],
    wavenet: [
      ['A', 'female'], ['B', 'male'], ['C', 'female'], ['D', 'male'],
      ['F', 'female'], ['N', 'female'], ['O', 'male'],
    ],
    neural2: [
      ['A', 'female'], ['B', 'male'], ['C', 'female'], ['D', 'male'],
      ['F', 'female'], ['N', 'female'], ['O', 'male'],
    ],
    news: [
      ['G', 'female'], ['H', 'female'], ['I', 'female'], ['J', 'male'],
      ['K', 'male'], ['L', 'male'], ['M', 'male'],
    ],
    studio: [['B', 'male'], ['C', 'female']],
    'chirp-hd': [['D', 'male'], ['F', 'female'], ['O', 'female']],
  },
  'en-AU': {
    standard: [['A', 'female'], ['B', 'male'], ['C', 'female'], ['D', 'male']],
    wavenet: [['A', 'female'], ['B', 'male'], ['C', 'female'], ['D', 'male']],
    neural2: [['A', 'female'], ['B', 'male'], ['C', 'female'], ['D', 'male']],
    news: [['E', 'female'], ['F', 'female'], ['G', 'male']],
    polyglot: [['1', 'male']],
    'chirp-hd': [['D', 'male'], ['F', 'female'], ['O', 'female']],
  },
  'en-IN': {
    standard: [
      ['A', 'female'], ['B', 'male'], ['C', 'male'], ['D', 'female'],
      ['E', 'female'], ['F', 'male'],
    ],
    wavenet: [
      ['A', 'female'], ['B', 'male'], ['C', 'male'], ['D', 'female'],
      ['E', 'female'], ['F', 'male'],
    ],
    neural2: [['A', 'female'], ['B', 'male'], ['C', 'male'], ['D', 'female']],
    'chirp-hd': [['D', 'male'], ['F', 'female'], ['O', 'female']],
  },
};

// ─── Section 3: Chirp3-HD Speakers (shared across all locales) ───

const CHIRP3_SPEAKERS = [
  ['Achernar', 'female'], ['Achird', 'male'], ['Algenib', 'male'], ['Algieba', 'male'],
  ['Alnilam', 'male'], ['Aoede', 'female'], ['Autonoe', 'female'], ['Callirrhoe', 'female'],
  ['Charon', 'male'], ['Despina', 'female'], ['Enceladus', 'male'], ['Erinome', 'female'],
  ['Fenrir', 'male'], ['Gacrux', 'female'], ['Iapetus', 'male'], ['Kore', 'female'],
  ['Laomedeia', 'female'], ['Leda', 'female'], ['Orus', 'male'], ['Puck', 'male'],
  ['Pulcherrima', 'female'], ['Rasalgethi', 'male'], ['Sadachbia', 'male'],
  ['Sadaltager', 'male'], ['Schedar', 'male'], ['Sulafat', 'female'], ['Umbriel', 'male'],
  ['Vindemiatrix', 'female'], ['Zephyr', 'female'], ['Zubenelgenubi', 'male'],
];

// ─── Section 4: Polly Mappings (only for voices that had Polly in old system) ───

const POLLY_MAPPINGS = {
  'lr_us_standard_c': { name: 'Joanna', languageCode: 'en-US', engine: 'standard' },
  'lr_us_neural2_h': { name: 'Salli', languageCode: 'en-US', engine: 'neural' },
  'lr_us_chirphd_f': { name: 'Ruth', languageCode: 'en-US', engine: 'generative' },
  'lr_us_standard_d': { name: 'Matthew', languageCode: 'en-US', engine: 'standard' },
  'lr_us_neural2_j': { name: 'Justin', languageCode: 'en-US', engine: 'neural' },
  'lr_us_chirphd_d': { name: 'Matthew', languageCode: 'en-US', engine: 'generative' },
  'lr_gb_standard_a': { name: 'Amy', languageCode: 'en-GB', engine: 'standard' },
  'lr_gb_neural2_c': { name: 'Emma', languageCode: 'en-GB', engine: 'neural' },
  'lr_gb_standard_b': { name: 'Brian', languageCode: 'en-GB', engine: 'standard' },
  'lr_gb_neural2_b': { name: 'Arthur', languageCode: 'en-GB', engine: 'neural' },
  'lr_au_standard_c': { name: 'Olivia', languageCode: 'en-AU', engine: 'standard' },
  'lr_au_neural2_a': { name: 'Olivia', languageCode: 'en-AU', engine: 'neural' },
  'lr_in_standard_a': { name: 'Kajal', languageCode: 'en-IN', engine: 'standard' },
  'lr_in_wavenet_a': { name: 'Kajal', languageCode: 'en-IN', engine: 'neural' },
  'lr_us_studio_o': { name: 'Joanna', languageCode: 'en-US', engine: 'neural' },
};

// ─── Section 5: Old ID → New ID Mapping ───

const OLD_ID_MAP = {
  'lr_us_female_basic_1': 'lr_us_standard_c',
  'lr_us_female_silver_1': 'lr_us_neural2_h',
  'lr_us_female_gold_1': 'lr_us_chirphd_f',
  'lr_us_female_generative_1': 'lr_us_chirphd_f',
  'lr_us_male_basic_1': 'lr_us_standard_d',
  'lr_us_male_silver_1': 'lr_us_neural2_j',
  'lr_us_male_gold_1': 'lr_us_chirphd_d',
  'lr_us_male_generative_1': 'lr_us_chirphd_d',
  'lr_gb_female_basic_1': 'lr_gb_standard_a',
  'lr_gb_female_silver_1': 'lr_gb_neural2_c',
  'lr_gb_female_generative_1': 'lr_gb_neural2_c',
  'lr_gb_male_basic_1': 'lr_gb_standard_b',
  'lr_gb_male_silver_1': 'lr_gb_neural2_b',
  'lr_gb_male_generative_1': 'lr_gb_neural2_b',
  'lr_au_female_basic_1': 'lr_au_standard_c',
  'lr_au_female_silver_1': 'lr_au_neural2_a',
  'lr_in_female_basic_1': 'lr_in_standard_a',
  'lr_in_female_silver_1': 'lr_in_wavenet_a',
  'lr_us_male_platinum_1': 'lr_us_studio_o',
  'lr_us_female_platinum_1': 'lr_us_studio_o',
  'lr_us_female_gold_2': 'lr_us_chirphd_f',
  'lr_us_male_gold_2': 'lr_us_chirphd_d',
};

// ─── Section 6: Builder ───

const ACTIVE_VOICES = new Set([
  'en-US-Standard-F', 'en-US-Standard-J',
  'en-GB-Standard-C', 'en-GB-Standard-B',
  'en-US-Wavenet-F', 'en-US-Wavenet-J',
  'en-GB-Wavenet-F', 'en-GB-Wavenet-B',
  'en-US-Neural2-F', 'en-US-Neural2-J',
  'en-GB-Neural2-C', 'en-GB-Neural2-B',
  'en-US-Studio-O', 'en-US-Studio-Q',
  'en-GB-Studio-B', 'en-GB-Studio-C',
  'en-US-Chirp3-HD-Callirrhoe', 'en-US-Chirp3-HD-Laomedeia',
  'en-US-Chirp3-HD-Algenib', 'en-US-Chirp3-HD-Algieba', 'en-US-Chirp3-HD-Sadachbia',
  'en-GB-Chirp3-HD-Aoede', 'en-GB-Chirp3-HD-Sulafat',
  'en-GB-Chirp3-HD-Sadaltager', 'en-GB-Chirp3-HD-Iapetus', 'en-GB-Chirp3-HD-Algieba',
]);

function buildLocaleShort(locale) {
  return locale.split('-')[1].toLowerCase(); // en-US → us
}

function buildVoiceId(locale, voiceType, suffix) {
  const loc = buildLocaleShort(locale);
  const typeKey = voiceType.replace(/-/g, '');
  return `lr_${loc}_${typeKey}_${suffix.toLowerCase()}`;
}

function buildGoogleName(locale, voiceType, suffix) {
  const typeMap = {
    standard: 'Standard',
    wavenet: 'Wavenet',
    neural2: 'Neural2',
    news: 'News',
    casual: 'Casual',
    polyglot: 'Polyglot',
    studio: 'Studio',
    'chirp-hd': 'Chirp-HD',
    'chirp3-hd': 'Chirp3-HD',
  };
  return `${locale}-${typeMap[voiceType]}-${suffix}`;
}

function isActive(googleName) {
  return ACTIVE_VOICES.has(googleName);
}

function buildAllVoices() {
  const voices = [];

  // Build regular voices from VOICE_DATA
  for (const [locale, types] of Object.entries(VOICE_DATA)) {
    for (const [voiceType, entries] of Object.entries(types)) {
      for (const [suffix, gender] of entries) {
        const id = buildVoiceId(locale, voiceType, suffix);
        const googleName = buildGoogleName(locale, voiceType, suffix);
        voices.push({
          id,
          label: buildLabel(locale, voiceType, suffix, gender),
          gender,
          accent: ACCENT_MAP[locale],
          locale,
          voiceType,
          quality: VOICE_TYPE_QUALITY[voiceType],
          active: isActive(googleName),
          google: { name: googleName, languageCode: locale },
          polly: POLLY_MAPPINGS[id] || null,
        });
      }
    }
  }

  // Build Chirp3-HD voices for all locales
  const chirp3Locales = ['en-US', 'en-GB', 'en-AU', 'en-IN'];
  for (const locale of chirp3Locales) {
    for (const [speaker, gender] of CHIRP3_SPEAKERS) {
      const id = buildVoiceId(locale, 'chirp3-hd', speaker);
      const googleName = buildGoogleName(locale, 'chirp3-hd', speaker);
      voices.push({
        id,
        label: buildLabel(locale, 'chirp3-hd', speaker, gender),
        gender,
        accent: ACCENT_MAP[locale],
        locale,
        voiceType: 'chirp3-hd',
        quality: VOICE_TYPE_QUALITY['chirp3-hd'],
        active: isActive(googleName),
        google: { name: googleName, languageCode: locale },
        polly: null,
      });
    }
  }

  return voices;
}

// Build once at module load
const LINGROOT_VOICES = buildAllVoices();

// ─── Section 7: Exports ───

function getLingrootVoices() {
  return LINGROOT_VOICES;
}

function getLingrootVoiceById(id) {
  if (!id) return null;
  const resolvedId = OLD_ID_MAP[id] || id;
  return LINGROOT_VOICES.find(v => v.id === resolvedId) || null;
}

function resolveOldId(oldId) {
  if (!oldId) return null;
  return OLD_ID_MAP[oldId] || oldId;
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
  return voice.google || null;
}

function getDefaultLingrootVoiceId(languageCode = 'en-US') {
  const lc = (languageCode || 'en-US').toLowerCase();

  if (lc.startsWith('en-gb')) return 'lr_gb_standard_a';
  if (lc.startsWith('en-au')) return 'lr_au_standard_a';
  if (lc.startsWith('en-in')) return 'lr_in_standard_a';
  return 'lr_us_standard_c';
}

module.exports = {
  getLingrootVoices,
  getLingrootVoiceById,
  mapLingrootToProviderVoice,
  getDefaultLingrootVoiceId,
  resolveOldId,
};
