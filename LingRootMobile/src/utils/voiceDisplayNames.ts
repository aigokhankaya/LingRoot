export type LingrootVoiceId =
  | 'lr_us_female_basic_1'
  | 'lr_us_male_basic_1'
  | 'lr_gb_female_basic_1'
  | 'lr_gb_male_basic_1'
  | 'lr_au_female_basic_1'
  | 'lr_in_female_basic_1'
  | 'lr_us_female_premium_1'
  | 'lr_us_male_premium_1'
  | 'lr_gb_female_premium_1'
  | 'lr_gb_male_premium_1'
  | 'lr_au_female_premium_1'
  | 'lr_in_female_premium_1';

interface VoiceDisplayEntry {
  en: string;
  tr: string;
}

const LINGROOT_VOICE_DISPLAY_NAMES: Record<LingrootVoiceId, VoiceDisplayEntry> = {
  // Basic voices
  lr_us_female_basic_1: { en: 'Female 1', tr: 'Kadın 1' },
  lr_us_male_basic_1: { en: 'Male 1', tr: 'Erkek 1' },
  lr_gb_female_basic_1: { en: 'Female 2', tr: 'Kadın 2' },
  lr_gb_male_basic_1: { en: 'Male 2', tr: 'Erkek 2' },
  lr_au_female_basic_1: { en: 'Female 3', tr: 'Kadın 3' },
  lr_in_female_basic_1: { en: 'Female 4', tr: 'Kadın 4' },
  // Premium voices
  lr_us_female_premium_1: { en: 'Female 5', tr: 'Kadın 5' },
  lr_us_male_premium_1: { en: 'Male 3', tr: 'Erkek 3' },
  lr_gb_female_premium_1: { en: 'Female 6', tr: 'Kadın 6' },
  lr_gb_male_premium_1: { en: 'Male 4', tr: 'Erkek 4' },
  lr_au_female_premium_1: { en: 'Female 7', tr: 'Kadın 7' },
  lr_in_female_premium_1: { en: 'Female 8', tr: 'Kadın 8' },
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
