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

const LINGROOT_VOICE_DISPLAY_NAMES: Record<LingrootVoiceId, VoiceDisplayEntry> = {
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

  const entry = (LINGROOT_VOICE_DISPLAY_NAMES as Record<string, VoiceDisplayEntry>)[id];
  if (entry) {
    return language === 'tr' ? entry.tr : entry.en;
  }

  return fallback || id;
}
