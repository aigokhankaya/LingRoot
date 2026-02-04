import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Voice, VoiceCategory, CEFRLevel } from '../../types';
import { PlanFeatures } from '../../services/subscriptionService';
import * as ttsService from '../../services/ttsService';
import { getVoiceDisplayName } from '../../utils/voiceDisplayNames';
import { COLORS } from '../../theme/colors';

// Extended Voice type for API responses with additional properties
interface ExtendedVoice extends Omit<Voice, 'category' | 'providerVoice'> {
  voiceName?: string;
  code?: string;
  type?: string;
  voiceType?: string;
  engine?: string;
  quality?: string;
  languageCode?: string;
  locale?: string;
  lang?: string;
  ssmlGender?: string;
  ssml_gender?: string;
  voiceGender?: string;
  package?: string;
  category?: string; // Allow any category string
  providerVoice?: {
    name?: string;
    languageCode?: string;
    engine?: string;
  };
}

interface VoiceSelectionPanelProps {
  selectedVoice: string;
  onVoiceSelect: (voiceName: string) => void;
  planFeatures: PlanFeatures | null;
  language: string;
  t: (key: string, params?: Record<string, unknown>) => string;
  onError: (title: string, message: string) => void;
  onSuccess: (title: string, message: string) => void;
}

export const VoiceSelectionPanel: React.FC<VoiceSelectionPanelProps> = ({
  selectedVoice,
  onVoiceSelect,
  planFeatures,
  language,
  t,
  onError,
  onSuccess,
}) => {
  const [selectedVoiceCategory, setSelectedVoiceCategory] = useState<string>('basic');
  const [selectedAccent, setSelectedAccent] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [availableVoices, setAvailableVoices] = useState<ExtendedVoice[]>([]);
  const [allVoices, setAllVoices] = useState<ExtendedVoice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState<boolean>(false);
  const [showVoiceSelection, setShowVoiceSelection] = useState<boolean>(false);
  const [shouldPromoteSelectedVoiceTop, setShouldPromoteSelectedVoiceTop] = useState<boolean>(false);
  const [defaultVoiceName, setDefaultVoiceName] = useState<string>('');
  const [currentProvider, setCurrentProvider] = useState<string>('google');

  const hasActiveFilters = selectedAccent !== 'all' || selectedGender !== 'all' || selectedVoiceCategory !== 'basic';

  // Helper to determine if a voice matches a specific category (Provider agnostic)
  const isVoiceInCategory = (voice: ExtendedVoice, category: string, provider: string): boolean => {
    const vName = (voice.name || '').toLowerCase();
    const pVoice = voice.providerVoice || { name: '', engine: '' };
    const pName = (pVoice.name || '').toLowerCase();
    const pEngine = (pVoice.engine || '').toLowerCase();
    const quality = (voice.quality || '').toLowerCase();

    if (provider === 'amazon' || provider === 'polly') {
      if (category === 'basic') return quality === 'basic' || pEngine === 'standard';
      if (category === 'neural') return quality === 'premium' || pEngine === 'neural';
      if (category === 'generative') return quality === 'generative' || quality === 'ultra' || pEngine === 'generative';
      return false;
    } else {
      // Google (default)
      if (category === 'basic') return quality === 'basic' || vName.includes('standard') || pName.includes('standard');
      // Silver = WaveNet + Neural2
      if (category === 'silver') {
        const isWavenet = vName.includes('wavenet') || pName.includes('wavenet');
        const isNeural2 = vName.includes('neural2') || pName.includes('neural2');
        return quality === 'silver' || isWavenet || isNeural2;
      }
      // Gold = Chirp3D + Journey
      if (category === 'gold') return quality === 'gold' || vName.includes('chirp') || pName.includes('chirp') || vName.includes('journey') || pName.includes('journey');
      // Platinum = Studio
      if (category === 'platinum') return quality === 'platinum' || vName.includes('studio') || pName.includes('studio');
      return false;
    }
  };

  // Backend kategori paramını doğrudan kullan
  const mapCategoryForBackend = (category?: string): string | undefined => {
    if (!category || category === 'all') return undefined;
    return category;
  };

  // Dynamic Voice Categories based on Provider
  const voiceCategories: VoiceCategory[] = useMemo(() => {
    if (currentProvider === 'amazon' || currentProvider === 'polly') {
      return [
        { value: 'basic', label: 'Basic', icon: 'volume-up', badge: t('create.voice.badge.free') },
        { value: 'neural', label: 'Neural', icon: 'star', badge: t('create.voice.badge.premium') },
        { value: 'generative', label: 'Generative', icon: 'psychology', badge: 'Ultra' },
      ];
    } else {
      // Google - 4 categories
      return [
        { value: 'basic', label: 'Basic', icon: 'volume-up', badge: t('create.voice.badge.free') },
        { value: 'silver', label: 'Silver', icon: 'graphic-eq', badge: t('create.voice.badge.premium') },
        { value: 'gold', label: 'Gold', icon: 'surround-sound', badge: 'Ultra' },
        { value: 'platinum', label: 'Platinum', icon: 'mic', badge: 'Pro' },
      ];
    }
  }, [currentProvider, t]);

  // Voices filtered by plan permissions + selected category
  const voicesForCurrentCategory = useMemo(() => {
    if (allVoices.length === 0) return [];

    let voices = allVoices;
    if (planFeatures?.voice_categories) {
      const cats = planFeatures.voice_categories;
      const isAmazon = currentProvider === 'amazon' || currentProvider === 'polly';
      voices = voices.filter(voice => {
        if (isAmazon) {
          return (isVoiceInCategory(voice, 'basic', 'amazon') && cats.amazon_standard) ||
            (isVoiceInCategory(voice, 'neural', 'amazon') && cats.amazon_neural) ||
            (isVoiceInCategory(voice, 'generative', 'amazon') && cats.amazon_generative);
        }
        return (isVoiceInCategory(voice, 'basic', 'google') && (cats.standard ?? true)) ||
          (isVoiceInCategory(voice, 'silver', 'google') && (cats.wavenet || cats.neural2)) ||
          (isVoiceInCategory(voice, 'gold', 'google') && cats.chirp3d) ||
          (isVoiceInCategory(voice, 'platinum', 'google') && cats.studio);
      });
    }

    return voices.filter(v => isVoiceInCategory(v, selectedVoiceCategory, currentProvider));
  }, [allVoices, selectedVoiceCategory, currentProvider, planFeatures]);

  // Voice filters - dynamic based on selected category
  const accentOptions = useMemo(() => {
    const allOption = { value: 'all', label: t('create.voice.filters.all') };
    const fullList = [
      { value: 'american', label: t('create.voice.accents.american') },
      { value: 'british', label: t('create.voice.accents.british') },
      { value: 'australian', label: t('create.voice.accents.australian') },
      { value: 'canadian', label: t('create.voice.accents.canadian') },
      { value: 'indian', label: t('create.voice.accents.indian') },
    ];

    if (voicesForCurrentCategory.length === 0) return [allOption, ...fullList];

    const accents: Set<string> = new Set(voicesForCurrentCategory.map(v => v.accent).filter(Boolean));
    return [allOption, ...fullList.filter(opt => accents.has(opt.value))];
  }, [voicesForCurrentCategory, t]);

  const genderOptions = useMemo(() => {
    const allOption = { value: 'all', label: t('create.voice.filters.all') };
    const fullGenders = [
      { value: 'male', label: t('create.voice.genders.male') },
      { value: 'female', label: t('create.voice.genders.female') },
    ];

    if (voicesForCurrentCategory.length === 0) return [allOption, ...fullGenders];

    const genders: Set<string> = new Set(voicesForCurrentCategory.map(v => v.gender).filter(Boolean));
    return [allOption, ...fullGenders.filter(opt => genders.has(opt.value))];
  }, [voicesForCurrentCategory, t]);

  // Accent normalization helper
  const normalizeAccentValue = (accent?: string, languageCode?: string): string => {
    const a = (accent || '').toLowerCase();
    const lc = (languageCode || '').toLowerCase();
    if (a === 'british' || a === 'american' || a === 'australian' || a === 'canadian' || a === 'indian') return a;
    if (a === 'gb' || a === 'uk') return 'british';
    if (a === 'us' || a === 'usa') return 'american';
    if (a === 'au' || a === 'aus' || a === 'au_english') return 'australian';
    if (a === 'ca' || a === 'can') return 'canadian';
    if (a === 'in' || a === 'ind') return 'indian';
    if (lc.includes('-gb')) return 'british';
    if (lc.includes('-us')) return 'american';
    if (lc.includes('-au')) return 'australian';
    if (lc.includes('-ca')) return 'canadian';
    if (lc.includes('-in')) return 'indian';
    return 'american';
  };

  // Derive filters from voice name
  const deriveFiltersFromVoiceName = (voiceName?: string): { category: string; accent: string; gender: string } => {
    const name = (voiceName || '').toString();
    const nameLower = name.toLowerCase();
    // Category
    let category = 'basic';
    if (nameLower.includes('chirp')) category = 'gold';
    else if (nameLower.includes('studio')) category = 'platinum';
    else if (nameLower.includes('neural2')) category = 'silver';
    else if (nameLower.includes('wavenet')) category = 'silver';
    // Accent
    let accent = 'american';
    if (name.includes('en-GB') || nameLower.includes('_gb_')) accent = 'british';
    else if (name.includes('en-AU') || nameLower.includes('_au_')) accent = 'australian';
    else if (name.includes('en-CA') || nameLower.includes('_ca_')) accent = 'canadian';
    else if (name.includes('en-IN') || nameLower.includes('_in_')) accent = 'indian';
    else if (name.includes('en-US') || nameLower.includes('_us_')) accent = 'american';
    // Gender
    let gender = 'all';
    const displayName = getVoiceDisplayName(name, 'en', '').toLowerCase();
    if (displayName.includes('female')) gender = 'female';
    else if (displayName.includes('male')) gender = 'male';
    return { category, accent, gender };
  };

  // Fetch available voices
  const fetchAvailableVoices = async () => {
    setLoadingVoices(true);
    try {
      const response = await ttsService.getAvailableVoices();
      const apiResponse = response as { provider?: string; voices?: ExtendedVoice[]; data?: { voices?: ExtendedVoice[] } };
      const voices = apiResponse.voices || apiResponse.data?.voices || [];

      if (voices.length > 0) {
        const processedVoices = voices.map((voice: ExtendedVoice) => {
          const name = voice.name || voice.voiceName || voice.id || voice.code;
          let category = voice.quality || voice.category || voice.type || voice.voiceType || voice.engine;
          if (!category) {
            const voiceName = name || '';
            if (voiceName.includes('Chirp') || voiceName.toLowerCase().includes('chirp')) {
              category = 'chirp3d';
            } else if (voiceName.includes('Studio')) {
              category = 'studio';
            } else if (voiceName.toLowerCase().includes('neural2')) {
              category = 'neural2';
            } else if (voiceName.toLowerCase().includes('wavenet')) {
              category = 'wavenet';
            } else {
              category = 'standard';
            }
          }

          const languageCode = voice.languageCode || voice.locale || voice.lang || '';
          const normalizedAccent = normalizeAccentValue(voice.accent, languageCode);

          const rawGender = voice.gender || voice.ssmlGender || voice.ssml_gender || voice.voiceGender;
          const normalizedGender = (rawGender || '').toString().toLowerCase();

          return {
            ...voice,
            name,
            category,
            accent: normalizedAccent,
            gender: normalizedGender,
          } as ExtendedVoice;
        });

        setAllVoices(processedVoices);
        setAvailableVoices(processedVoices);
      }
    } catch (error) {
      console.error('Error fetching voices:', error);
    } finally {
      setLoadingVoices(false);
    }
  };

  // Fetch filtered voices
  const fetchFilteredVoices = async (accent?: string, gender?: string, category?: string) => {
    setLoadingVoices(true);
    try {
      const backendCategory = mapCategoryForBackend(category);
      const response = await ttsService.getFilteredVoices(accent, gender, undefined, backendCategory);

      const apiResponse: { provider?: string; voices?: ExtendedVoice[]; data?: ExtendedVoice[] | { voices?: ExtendedVoice[] } } = response as { provider?: string; voices?: ExtendedVoice[]; data?: ExtendedVoice[] | { voices?: ExtendedVoice[] } };
      const voices: ExtendedVoice[] =
        apiResponse?.voices ||
        (apiResponse?.data && 'voices' in apiResponse.data ? apiResponse.data.voices : []) ||
        (Array.isArray(apiResponse?.data) ? apiResponse.data : []) ||
        [];

      if (Array.isArray(voices) && voices.length >= 0) {
        // Fallback logic for studio + male (temporary solution)
        if (voices.length === 0 && (category === 'studio') && (gender === 'male')) {
          const fallbackName = accent === 'british' ? 'en-GB-Studio-B' : accent === 'american' ? 'en-US-Studio-M' : undefined;
          if (fallbackName) {
            const fallback: ExtendedVoice[] = [{
              id: fallbackName,
              name: fallbackName,
              category: 'studio',
              accent: accent,
              gender: 'male',
              displayName: fallbackName.includes('GB') ? 'UK English Male (Studio)' : 'US English Male (Studio)',
              ssmlSupport: false,
              package: 'Platinum',
              languageCode: fallbackName.includes('GB') ? 'en-GB' : 'en-US'
            } as ExtendedVoice];
            setAvailableVoices(fallback);
            onVoiceSelect(fallbackName);
            setLoadingVoices(false);
            return;
          }
        }

        // Wavenet + AU/CA/IN fallback
        if (voices.length === 0 && (category === 'wavenet') && (accent === 'australian' || accent === 'canadian' || accent === 'indian')) {
          const map: Record<string, { male: string; female: string; lang: string }> = {
            australian: { male: 'en-AU-Wavenet-D', female: 'en-AU-Wavenet-A', lang: 'en-AU' },
            canadian: { male: 'en-CA-Wavenet-D', female: 'en-CA-Wavenet-A', lang: 'en-CA' },
            indian: { male: 'en-IN-Wavenet-D', female: 'en-IN-Wavenet-A', lang: 'en-IN' },
          };
          const cfg = map[accent];
          const chosen = (gender === 'male') ? cfg.male : cfg.female;
          const fallback: ExtendedVoice[] = [{
            id: chosen,
            name: chosen,
            category: 'wavenet',
            accent: accent,
            gender: gender || 'female',
            displayName: chosen.split('-').slice(-1)[0],
            ssmlSupport: true,
            package: 'Premium',
            languageCode: cfg.lang,
          } as ExtendedVoice];
          setAvailableVoices(fallback);
          onVoiceSelect(chosen);
          setLoadingVoices(false);
          return;
        }

        const processedVoices = voices.map((voice: ExtendedVoice) => {
          const name = voice.name || voice.voiceName || voice.id || voice.code;
          let category = voice.category || voice.type || voice.voiceType || voice.engine;
          if (!category) {
            const voiceName = name || '';
            if (voiceName.includes('Chirp') || voiceName.toLowerCase().includes('chirp')) {
              category = 'chirp3d';
            } else if (voiceName.includes('Studio')) {
              category = 'studio';
            } else if (voiceName.toLowerCase().includes('neural2')) {
              category = 'neural2';
            } else if (voiceName.toLowerCase().includes('wavenet')) {
              category = 'wavenet';
            } else {
              category = 'standard';
            }
          }

          const languageCode = voice.languageCode || voice.locale || voice.lang || '';
          let normalizedAccent = (voice.accent || '').toString().toLowerCase();
          if (!normalizedAccent) {
            const lc = languageCode.toLowerCase();
            if (lc.includes('-gb')) normalizedAccent = 'british';
            else if (lc.includes('-us')) normalizedAccent = 'american';
            else if (lc.includes('-au')) normalizedAccent = 'australian';
            else if (lc.includes('-ca')) normalizedAccent = 'canadian';
            else if (lc.includes('-in')) normalizedAccent = 'indian';
            else normalizedAccent = 'american';
          }

          const rawGender = voice.gender || voice.ssmlGender || voice.ssml_gender || voice.voiceGender;
          const normalizedGender = (rawGender || '').toString().toLowerCase();

          return {
            ...voice,
            name,
            category,
            accent: normalizedAccent,
            gender: normalizedGender,
          } as ExtendedVoice;
        });

        setAvailableVoices(processedVoices);
      }
    } catch (error) {
      console.error('Error fetching filtered voices:', error);
    } finally {
      setLoadingVoices(false);
    }
  };

  const filterVoices = (
    voices: ExtendedVoice[],
    category: string,
    gender: string,
    accent: string
  ) => {
    return voices
      .filter(v => isVoiceInCategory(v, category, currentProvider))
      .filter(v => gender === 'all' || v.gender === gender)
      .filter(v => accent === 'all' || v.accent === accent);
  };

  const getFilteredVoicesByCategory = () => {
    if (hasActiveFilters) {
      return availableVoices;
    }

    let voices = availableVoices;
    if (planFeatures?.voice_categories) {
      voices = availableVoices.filter(voice => {
        const categories = planFeatures.voice_categories!;
        const isAmazon = currentProvider === 'amazon' || currentProvider === 'polly';

        if (isAmazon) {
          const isBasic = isVoiceInCategory(voice, 'basic', 'amazon') && categories.amazon_standard;
          const isNeural = isVoiceInCategory(voice, 'neural', 'amazon') && categories.amazon_neural;
          const isGenerative = isVoiceInCategory(voice, 'generative', 'amazon') && categories.amazon_generative;
          return isBasic || isNeural || isGenerative;
        } else {
          const isBasic = isVoiceInCategory(voice, 'basic', 'google') && (categories.standard ?? true);
          const isSilver = isVoiceInCategory(voice, 'silver', 'google') && (categories.wavenet || categories.neural2);
          const isGold = isVoiceInCategory(voice, 'gold', 'google') && categories.chirp3d;
          const isPlatinum = isVoiceInCategory(voice, 'platinum', 'google') && categories.studio;
          return isBasic || isSilver || isGold || isPlatinum;
        }
      });
    }

    return filterVoices(voices, selectedVoiceCategory, selectedGender, selectedAccent);
  };

  // Fetch current TTS provider
  useEffect(() => {
    const fetchProvider = async () => {
      try {
        const response = await ttsService.getTtsProvider();
        if (response?.provider) {
          setCurrentProvider(response.provider);
          fetchAvailableVoices();
        }
      } catch (error) {
        console.error('Error fetching TTS provider:', error);
        setCurrentProvider('amazon');
      }
    };
    fetchProvider();
  }, []);

  // Load default voice on mount
  useEffect(() => {
    (async () => {
      try {
        await fetchAvailableVoices();
        const settings = await ttsService.getUserSettings();
        const dv = settings?.data?.default_voice;
        if (dv && typeof dv === 'string') {
          setDefaultVoiceName(dv);
          onVoiceSelect(dv);
          setShouldPromoteSelectedVoiceTop(true);
          const { category, accent, gender } = deriveFiltersFromVoiceName(dv);
          setSelectedVoiceCategory(category);
          setSelectedAccent(accent);
          setSelectedGender(gender);
        } else {
          setDefaultVoiceName('');
        }
      } catch (e) {
        console.error('Error loading default voice:', e);
      }
    })();
  }, []);

  // Keep selected voice at top
  useEffect(() => {
    if (!shouldPromoteSelectedVoiceTop) return;
    if (!selectedVoice || availableVoices.length === 0) {
      setShouldPromoteSelectedVoiceTop(false);
      return;
    }
    const index = availableVoices.findIndex(v => v.name === selectedVoice);
    if (index > 0) {
      const reordered = [availableVoices[index], ...availableVoices.filter((_, i) => i !== index)];
      if (JSON.stringify(reordered.map(v => v.name)) !== JSON.stringify(availableVoices.map(v => v.name))) {
        setAvailableVoices(reordered);
      }
    }
    setShouldPromoteSelectedVoiceTop(false);
  }, [availableVoices, selectedVoice, shouldPromoteSelectedVoiceTop]);

  // Update filtered voices when filters change
  useEffect(() => {
    if (selectedVoiceCategory !== 'basic') {
      fetchFilteredVoices(selectedAccent, selectedGender, selectedVoiceCategory);
    } else if (selectedAccent !== 'all' || selectedGender !== 'all') {
      fetchFilteredVoices(selectedAccent, selectedGender);
    } else {
      fetchAvailableVoices();
    }
  }, [selectedAccent, selectedGender, selectedVoiceCategory]);

  const handleSaveDefaultVoice = async () => {
    try {
      await ttsService.saveDefaultVoiceSetting(selectedVoice);
      setDefaultVoiceName(selectedVoice);
      setShouldPromoteSelectedVoiceTop(true);
      setShowVoiceSelection(false);
      setTimeout(() => {
        onSuccess(
          t('common.success'),
          language === 'tr' ? 'Varsayılan ses kaydedildi' : 'Default voice saved'
        );
      }, 400);
    } catch (e: unknown) {
      const error = e as { message?: string };
      setShowVoiceSelection(false);
      setTimeout(() => {
        onError(
          t('common.error'),
          error.message || (language === 'tr' ? 'Kaydedilemedi' : 'Could not save')
        );
      }, 400);
    }
  };

  const handleOpenModal = async () => {
    try {
      if (hasActiveFilters) {
        await fetchFilteredVoices(selectedAccent, selectedGender, selectedVoiceCategory);
      } else {
        await fetchAvailableVoices();
      }
    } catch (e) {
      console.error('Error refreshing voices:', e);
    }
    setShowVoiceSelection(true);
  };

  return (
    <>
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>{t('create.voice.title')}</Text>

        {/* Voice Categories */}
        <View style={styles.voiceCategoryContainer}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            {voiceCategories.map((category) => (
              <TouchableOpacity
                key={category.value}
                style={[
                  styles.voiceCategoryButton,
                  selectedVoiceCategory === category.value && styles.voiceCategoryButtonActive,
                ]}
                onPress={() => {
                  const newCategory = category.value;
                  setSelectedVoiceCategory(newCategory);
                  setSelectedAccent('all');
                  setSelectedGender('all');
                  const filteredVoices = filterVoices(
                    availableVoices,
                    newCategory,
                    'all',
                    'all'
                  );
                  if (filteredVoices.length > 0) {
                    onVoiceSelect(filteredVoices[0].name);
                  }
                }}
              >
                <Icon name={category.icon} size={16} color={selectedVoiceCategory === category.value ? '#FFF' : COLORS.primary} />
                <Text style={[
                  styles.voiceCategoryText,
                  selectedVoiceCategory === category.value && styles.voiceCategoryTextActive,
                ]}>
                  {category.label}
                </Text>
                <View style={styles.voiceBadge}>
                  <Text style={styles.voiceBadgeText}>{category.badge}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Voice Filters */}
        <View style={styles.voiceFiltersContainer}>
          <View style={[styles.filterGroup, { marginBottom: 16, marginRight: 0 }]}>
            <Text style={styles.filterLabel}>{t('create.voice.filters.accent')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {accentOptions.map((accent) => (
                <TouchableOpacity
                  key={accent.value}
                  style={[
                    styles.filterButton,
                    selectedAccent === accent.value && styles.filterButtonActive,
                  ]}
                  onPress={() => setSelectedAccent(accent.value)}
                >
                  <Text style={[
                    styles.filterButtonText,
                    selectedAccent === accent.value && styles.filterButtonTextActive,
                  ]}>
                    {accent.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={[styles.filterGroup, { marginRight: 0 }]}>
            <Text style={styles.filterLabel}>{t('create.voice.filters.gender')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {genderOptions.map((gender) => (
                <TouchableOpacity
                  key={gender.value}
                  style={[
                    styles.filterButton,
                    selectedGender === gender.value && styles.filterButtonActive,
                  ]}
                  onPress={() => setSelectedGender(gender.value)}
                >
                  <Text style={[
                    styles.filterButtonText,
                    selectedGender === gender.value && styles.filterButtonTextActive,
                  ]}>
                    {gender.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Voice Selection Button */}
        <TouchableOpacity
          style={styles.voiceSelectionButton}
          onPress={handleOpenModal}
        >
          <Icon name="record-voice-over" size={24} color={COLORS.primary} />
          <View style={styles.voiceSelectionInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.voiceSelectionText}>
                {selectedVoice ? getVoiceDisplayName(selectedVoice, language, selectedVoice) : t('create.voice.selectPrompt')}
              </Text>
              {defaultVoiceName !== '' && selectedVoice === defaultVoiceName && (
                <View style={styles.defaultVoiceBadge}>
                  <Text style={styles.defaultVoiceBadgeText}>Default</Text>
                </View>
              )}
            </View>
            <Text style={styles.voiceSelectionSubtext}>
              {getFilteredVoicesByCategory().find(v => v.name === selectedVoice)?.description || t('create.voice.selectHint')}
            </Text>
          </View>
          <Icon name="arrow-forward-ios" size={16} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Voice Selection Modal */}
      <Modal
        visible={showVoiceSelection}
        transparent
        animationType="fade"
        onRequestClose={() => setShowVoiceSelection(false)}
      >
        <View style={styles.voiceModalBackdrop}>
          <View style={[styles.voiceModalContent, { maxHeight: '75%', width: '92%' }]}>
            <View style={styles.voiceModalHeader}>
              <View>
                <Text style={styles.voiceModalTitle}>{t('create.voice.modal.title')}</Text>
                <Text style={styles.providerBadge}>
                  {currentProvider === 'polly' || currentProvider === 'amazon' ? '🎙️ Amazon Polly' : currentProvider === 'azure' ? '🔷 Azure TTS' : '☁️ Google TTS'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowVoiceSelection(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            {loadingVoices ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={styles.voiceLoader} />
            ) : (
              <View>
                <ScrollView style={styles.voiceList}>
                  {getFilteredVoicesByCategory()
                    .sort((a, b) => {
                      const nameA = getVoiceDisplayName(a.name, language, a.displayName || a.name);
                      const nameB = getVoiceDisplayName(b.name, language, b.displayName || b.name);
                      return nameA.localeCompare(nameB);
                    })
                    .map((item) => (
                    <TouchableOpacity
                      key={item.name}
                      style={[
                        styles.voiceItem,
                        selectedVoice === item.name && styles.voiceItemActive,
                      ]}
                      onPress={() => onVoiceSelect(item.name)}
                    >
                      <View style={styles.voiceItemInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.voiceItemName}>
                            {getVoiceDisplayName(item.name, language, item.displayName || item.name)}
                          </Text>
                          {defaultVoiceName !== '' && item.name === defaultVoiceName && (
                            <View style={styles.defaultVoiceBadge}>
                              <Text style={styles.defaultVoiceBadgeText}>Default</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.voiceItemDescription}>
                          {(item.accent === 'american' && t('create.voice.accents.american')) ||
                            (item.accent === 'british' && t('create.voice.accents.british')) ||
                            (item.accent === 'australian' && t('create.voice.accents.australian')) ||
                            (item.accent === 'canadian' && t('create.voice.accents.canadian')) ||
                            (item.accent === 'indian' && t('create.voice.accents.indian')) || item.accent}
                          {` • ${item.gender === 'male' ? t('create.voice.genders.male') : t('create.voice.genders.female')}`}
                        </Text>
                        {item.ssmlSupport && (
                          <Text style={styles.voiceItemSSML}>{t('create.voice.modal.ssmlSupported')}</Text>
                        )}
                      </View>
                      {selectedVoice === item.name && (
                        <Icon name="check" size={20} color={COLORS.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {selectedVoice ? (
                  <TouchableOpacity
                    style={[styles.defaultVoiceButton, !selectedVoice && styles.createButtonDisabled]}
                    onPress={handleSaveDefaultVoice}
                    disabled={!selectedVoice}
                  >
                    <Text style={styles.defaultVoiceButtonText}>
                      {language === 'tr' ? 'Varsayılan Ses Seç' : 'Set as Default Voice'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  settingsSection: {
    marginHorizontal: 24,
    marginBottom: 20,
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    shadowColor: COLORS.brandIndigo,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 32,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.slate400,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginLeft: 4,
  },
  voiceCategoryContainer: {
    marginBottom: 16,
  },
  voiceCategoryButton: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  voiceCategoryButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  voiceCategoryText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginLeft: 4,
  },
  voiceCategoryTextActive: {
    color: 'white',
  },
  voiceBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  voiceBadgeText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '600',
  },
  voiceFiltersContainer: {
    marginBottom: 16,
  },
  filterGroup: {
    flex: 1,
    marginRight: 8,
  },
  filterLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 6,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  voiceSelectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  voiceSelectionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  voiceSelectionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  voiceSelectionSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  voiceModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '70%',
  },
  voiceModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  voiceModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  providerBadge: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 4,
    fontWeight: '500',
  },
  voiceLoader: {
    paddingVertical: 40,
  },
  voiceList: {
    maxHeight: 300,
  },
  voiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f8f8f8',
  },
  voiceItemActive: {
    backgroundColor: '#E3F2FD',
  },
  voiceItemInfo: {
    flex: 1,
  },
  voiceItemName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  voiceItemDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  voiceItemSSML: {
    fontSize: 10,
    color: '#4CAF50',
    marginTop: 2,
    fontWeight: '600',
  },
  defaultVoiceButton: {
    marginTop: 12,
    backgroundColor: COLORS.brandTeal,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: COLORS.brandTeal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
  defaultVoiceButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  defaultVoiceBadge: {
    backgroundColor: COLORS.brandTeal + '18',
    borderWidth: 1,
    borderColor: COLORS.brandTeal + '40',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defaultVoiceBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.brandTeal,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  createButtonDisabled: {
    backgroundColor: COLORS.slate200,
    shadowOpacity: 0,
    elevation: 0,
  },
});
