export type LingrootVoiceId =
  // Basic
  | 'lr_us_female_basic_1'
  | 'lr_us_male_basic_1'
  | 'lr_gb_female_basic_1'
  | 'lr_gb_male_basic_1'
  | 'lr_au_female_basic_1'
  | 'lr_in_female_basic_1'
  // Silver
  | 'lr_us_female_silver_1'
  | 'lr_us_male_silver_1'
  | 'lr_gb_female_silver_1'
  | 'lr_gb_male_silver_1'
  | 'lr_au_female_silver_1'
  | 'lr_in_female_silver_1'
  // Gold
  | 'lr_us_female_gold_1'
  | 'lr_us_male_gold_1'
  | 'lr_us_female_gold_2'
  | 'lr_us_male_gold_2'
  // Platinum
  | 'lr_us_female_platinum_1'
  | 'lr_us_male_platinum_1'
  // Generative
  | 'lr_us_female_generative_1'
  | 'lr_us_male_generative_1'
  | 'lr_gb_female_generative_1'
  | 'lr_gb_male_generative_1';

interface VoiceDisplayEntry {
  en: string;
  tr: string;
}

const LINGROOT_VOICE_DISPLAY_NAMES: Record<string, VoiceDisplayEntry> = {
  // === Legacy voice IDs (backward compatibility) ===
  // Basic voices
  lr_us_female_basic_1: { en: 'American Female 1', tr: 'Amerikan Kadın 1' },
  lr_us_male_basic_1: { en: 'American Male 1', tr: 'Amerikan Erkek 1' },
  lr_gb_female_basic_1: { en: 'British Female 1', tr: 'İngiliz Kadın 1' },
  lr_gb_male_basic_1: { en: 'British Male 1', tr: 'İngiliz Erkek 1' },
  lr_au_female_basic_1: { en: 'Australian Female 1', tr: 'Avustralyalı Kadın 1' },
  lr_in_female_basic_1: { en: 'Indian Female 1', tr: 'Hint Kadın 1' },
  // Silver voices
  lr_us_female_silver_1: { en: 'American Female 2', tr: 'Amerikan Kadın 2' },
  lr_us_male_silver_1: { en: 'American Male 2', tr: 'Amerikan Erkek 2' },
  lr_gb_female_silver_1: { en: 'British Female 2', tr: 'İngiliz Kadın 2' },
  lr_gb_male_silver_1: { en: 'British Male 2', tr: 'İngiliz Erkek 2' },
  lr_au_female_silver_1: { en: 'Australian Female 2', tr: 'Avustralyalı Kadın 2' },
  lr_in_female_silver_1: { en: 'Indian Female 2', tr: 'Hint Kadın 2' },
  // Gold voices
  lr_us_female_gold_1: { en: 'American Female 3', tr: 'Amerikan Kadın 3' },
  lr_us_male_gold_1: { en: 'American Male 3', tr: 'Amerikan Erkek 3' },
  lr_us_female_gold_2: { en: 'American Female 6', tr: 'Amerikan Kadın 6' },
  lr_us_male_gold_2: { en: 'American Male 6', tr: 'Amerikan Erkek 6' },
  // Platinum voices
  lr_us_female_platinum_1: { en: 'American Female 5', tr: 'Amerikan Kadın 5' },
  lr_us_male_platinum_1: { en: 'American Male 5', tr: 'Amerikan Erkek 5' },
  // Generative voices
  lr_us_female_generative_1: { en: 'American Female 4', tr: 'Amerikan Kadın 4' },
  lr_us_male_generative_1: { en: 'American Male 4', tr: 'Amerikan Erkek 4' },
  lr_gb_female_generative_1: { en: 'British Female 3', tr: 'İngiliz Kadın 3' },
  lr_gb_male_generative_1: { en: 'British Male 3', tr: 'İngiliz Erkek 3' },

  // === New active voice IDs (tier-based naming) ===
  // en-US Basic
  lr_us_standard_f: { en: 'American Female Basic 1', tr: 'Amerikan Kadın Basic 1' },
  lr_us_standard_j: { en: 'American Male Basic 1', tr: 'Amerikan Erkek Basic 1' },
  // en-US Silver
  lr_us_wavenet_f: { en: 'American Female Silver 1', tr: 'Amerikan Kadın Silver 1' },
  lr_us_wavenet_j: { en: 'American Male Silver 1', tr: 'Amerikan Erkek Silver 1' },
  lr_us_neural2_f: { en: 'American Female Silver 2', tr: 'Amerikan Kadın Silver 2' },
  lr_us_neural2_j: { en: 'American Male Silver 2', tr: 'Amerikan Erkek Silver 2' },
  // en-US Gold
  lr_us_chirp3hd_callirrhoe: { en: 'American Female Gold 1', tr: 'Amerikan Kadın Gold 1' },
  lr_us_chirp3hd_laomedeia: { en: 'American Female Gold 2', tr: 'Amerikan Kadın Gold 2' },
  lr_us_chirp3hd_algenib: { en: 'American Male Gold 1', tr: 'Amerikan Erkek Gold 1' },
  lr_us_chirp3hd_algieba: { en: 'American Male Gold 2', tr: 'Amerikan Erkek Gold 2' },
  lr_us_chirp3hd_sadachbia: { en: 'American Male Gold 3', tr: 'Amerikan Erkek Gold 3' },
  // en-US Platinum
  lr_us_studio_o: { en: 'American Female Platinum 1', tr: 'Amerikan Kadın Platinum 1' },
  lr_us_studio_q: { en: 'American Male Platinum 1', tr: 'Amerikan Erkek Platinum 1' },

  // en-GB Basic
  lr_gb_standard_c: { en: 'British Female Basic 1', tr: 'İngiliz Kadın Basic 1' },
  lr_gb_standard_b: { en: 'British Male Basic 1', tr: 'İngiliz Erkek Basic 1' },
  // en-GB Silver
  lr_gb_wavenet_f: { en: 'British Female Silver 1', tr: 'İngiliz Kadın Silver 1' },
  lr_gb_wavenet_b: { en: 'British Male Silver 1', tr: 'İngiliz Erkek Silver 1' },
  lr_gb_neural2_c: { en: 'British Female Silver 2', tr: 'İngiliz Kadın Silver 2' },
  lr_gb_neural2_b: { en: 'British Male Silver 2', tr: 'İngiliz Erkek Silver 2' },
  // en-GB Gold
  lr_gb_chirp3hd_aoede: { en: 'British Female Gold 1', tr: 'İngiliz Kadın Gold 1' },
  lr_gb_chirp3hd_sulafat: { en: 'British Female Gold 2', tr: 'İngiliz Kadın Gold 2' },
  lr_gb_chirp3hd_sadaltager: { en: 'British Male Gold 1', tr: 'İngiliz Erkek Gold 1' },
  lr_gb_chirp3hd_iapetus: { en: 'British Male Gold 2', tr: 'İngiliz Erkek Gold 2' },
  lr_gb_chirp3hd_algieba: { en: 'British Male Gold 3', tr: 'İngiliz Erkek Gold 3' },
  // en-GB Platinum
  lr_gb_studio_c: { en: 'British Female Platinum 1', tr: 'İngiliz Kadın Platinum 1' },
  lr_gb_studio_b: { en: 'British Male Platinum 1', tr: 'İngiliz Erkek Platinum 1' },
};

/**
 * Returns user-facing voice display name for a Lingroot voice ID.
 * Falls back to provided fallback or the raw id when not found.
 */
export function getVoiceDisplayName(
  id: string | null | undefined,
  language: string,
  fallback?: string,
): string {
  if (!id) {
    return fallback || '';
  }

  const entry = LINGROOT_VOICE_DISPLAY_NAMES[id];
  if (entry) {
    return language === 'tr' ? entry.tr : entry.en;
  }

  return fallback || id;
}
