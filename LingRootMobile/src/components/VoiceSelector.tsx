import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Voice, VoiceCategory } from '../types';
import * as ttsService from '../services/ttsService';
import { getMyPlanFeatures, PlanFeatures } from '../services/subscriptionService';
import { getVoiceDisplayName } from '../utils/voiceDisplayNames';
import { useLanguage } from '../contexts/LanguageContext';
import { COLORS } from '../theme/colors';

// ─── Exported types ───────────────────────────────────────────

export interface VoiceSelectionResult {
  voiceName: string;
  category: string;
  accent: string;
  gender: string;
  engine: string | undefined;
  provider: string;
}

interface VoiceSelectorProps {
  onVoiceChange: (result: VoiceSelectionResult) => void;
  userId?: string;
  language: string;
  compact?: boolean;
}

// ─── Component ────────────────────────────────────────────────

const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  onVoiceChange,
  userId,
  language: langProp,
  compact = false,
}) => {
  const { t } = useLanguage();

  // Voice selection state
  const [selectedVoiceCategory, setSelectedVoiceCategory] = useState<string>('basic');
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [selectedAccent, setSelectedAccent] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);
  const [allVoices, setAllVoices] = useState<Voice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState<boolean>(false);
  const [showVoiceSelection, setShowVoiceSelection] = useState<boolean>(false);
  const [shouldPromoteSelectedVoiceTop, setShouldPromoteSelectedVoiceTop] = useState<boolean>(false);
  const [defaultVoiceName, setDefaultVoiceName] = useState<string>('');
  const [currentProvider, setCurrentProvider] = useState<string>('google');
  const [planFeatures, setPlanFeatures] = useState<PlanFeatures | null>(null);

  const hasActiveFilters = selectedAccent !== 'all' || selectedGender !== 'all' || selectedVoiceCategory !== 'basic';

  // ─── Helpers (ported from CreateScreen) ───────────────────

  const deriveFiltersFromVoiceName = (voiceName?: string): { category: string; accent: string; gender: string } => {
    const name = (voiceName || '').toString();
    const nameLower = name.toLowerCase();
    let category = 'basic';
    if (nameLower.includes('chirp')) category = 'gold';
    else if (nameLower.includes('studio')) category = 'platinum';
    else if (nameLower.includes('neural2')) category = 'silver';
    else if (nameLower.includes('wavenet')) category = 'silver';

    let accent = 'american';
    if (name.includes('en-GB') || nameLower.includes('_gb_')) accent = 'british';
    else if (name.includes('en-AU') || nameLower.includes('_au_')) accent = 'australian';
    else if (name.includes('en-CA') || nameLower.includes('_ca_')) accent = 'canadian';
    else if (name.includes('en-IN') || nameLower.includes('_in_')) accent = 'indian';
    else if (name.includes('en-US') || nameLower.includes('_us_')) accent = 'american';

    let gender = 'all';
    const displayName = getVoiceDisplayName(name, 'en', '').toLowerCase();
    if (displayName.includes('female')) gender = 'female';
    else if (displayName.includes('male')) gender = 'male';
    return { category, accent, gender };
  };

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

  const isVoiceInCategory = (voice: Record<string, unknown>, category: string, provider: string): boolean => {
    const vName = ((voice.name as string) || '').toLowerCase();
    const pVoice = (voice.providerVoice || {}) as Record<string, unknown>;
    const pName = ((pVoice.name as string) || '').toLowerCase();
    const pEngine = ((pVoice.engine as string) || '').toLowerCase();
    const quality = ((voice.quality as string) || '').toLowerCase();

    if (provider === 'amazon' || provider === 'polly') {
      if (category === 'basic') return quality === 'basic' || pEngine === 'standard';
      if (category === 'neural') return quality === 'premium' || pEngine === 'neural';
      if (category === 'generative') return quality === 'generative' || quality === 'ultra' || pEngine === 'generative';
      return false;
    } else {
      if (category === 'basic') return quality === 'basic' || vName.includes('standard') || pName.includes('standard');
      if (category === 'silver') {
        const isWavenet = vName.includes('wavenet') || pName.includes('wavenet');
        const isNeural2 = vName.includes('neural2') || pName.includes('neural2');
        return quality === 'silver' || isWavenet || isNeural2;
      }
      if (category === 'gold') return quality === 'gold' || vName.includes('chirp') || pName.includes('chirp') || vName.includes('journey') || pName.includes('journey');
      if (category === 'platinum') return quality === 'platinum' || vName.includes('studio') || pName.includes('studio');
      return false;
    }
  };

  const mapCategoryForBackend = (category?: string): string | undefined => {
    if (!category || category === 'all') return undefined;
    return category;
  };

  // ─── Memoised option lists ────────────────────────────────

  const voiceCategories: VoiceCategory[] = useMemo(() => {
    if (currentProvider === 'amazon' || currentProvider === 'polly') {
      return [
        { value: 'basic', label: 'Basic', icon: 'volume-up', badge: t('create.voice.badge.free') },
        { value: 'neural', label: 'Neural', icon: 'star', badge: t('create.voice.badge.premium') },
        { value: 'generative', label: 'Generative', icon: 'psychology', badge: 'Ultra' },
      ];
    }
    return [
      { value: 'basic', label: 'Basic', icon: 'volume-up', badge: t('create.voice.badge.free') },
      { value: 'silver', label: 'Silver', icon: 'graphic-eq', badge: t('create.voice.badge.premium') },
      { value: 'gold', label: 'Gold', icon: 'surround-sound', badge: 'Ultra' },
      { value: 'platinum', label: 'Platinum', icon: 'mic', badge: 'Pro' },
    ];
  }, [currentProvider, t]);

  const voicesForCurrentCategory = useMemo(() => {
    if (allVoices.length === 0) return [];
    let voices: Voice[] = allVoices;
    if (planFeatures?.voice_categories) {
      const cats = planFeatures.voice_categories;
      const isAmazon = currentProvider === 'amazon' || currentProvider === 'polly';
      voices = voices.filter(voice => {
        if (isAmazon) {
          return (isVoiceInCategory(voice as unknown as Record<string, unknown>, 'basic', 'amazon') && cats.amazon_standard) ||
            (isVoiceInCategory(voice as unknown as Record<string, unknown>, 'neural', 'amazon') && cats.amazon_neural) ||
            (isVoiceInCategory(voice as unknown as Record<string, unknown>, 'generative', 'amazon') && cats.amazon_generative);
        }
        return (isVoiceInCategory(voice as unknown as Record<string, unknown>, 'basic', 'google') && (cats.standard ?? true)) ||
          (isVoiceInCategory(voice as unknown as Record<string, unknown>, 'silver', 'google') && (cats.wavenet || cats.neural2)) ||
          (isVoiceInCategory(voice as unknown as Record<string, unknown>, 'gold', 'google') && cats.chirp3d) ||
          (isVoiceInCategory(voice as unknown as Record<string, unknown>, 'platinum', 'google') && cats.studio);
      });
    }
    return voices.filter(v => isVoiceInCategory(v as unknown as Record<string, unknown>, selectedVoiceCategory, currentProvider));
  }, [allVoices, selectedVoiceCategory, currentProvider, planFeatures]);

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

  // ─── Data fetching ────────────────────────────────────────

  const processVoiceList = (voices: Record<string, unknown>[]): Voice[] => {
    return voices.map((voice) => {
      const name = (voice.name || voice.voiceName || voice.id || voice.code) as string;
      let category = (voice.quality || voice.category || voice.type || voice.voiceType || voice.engine) as string | undefined;
      if (!category) {
        const voiceName = name || '';
        if (voiceName.includes('Chirp') || voiceName.toLowerCase().includes('chirp')) category = 'chirp3d';
        else if (voiceName.includes('Studio')) category = 'studio';
        else if (voiceName.toLowerCase().includes('neural2')) category = 'neural2';
        else if (voiceName.toLowerCase().includes('wavenet')) category = 'wavenet';
        else category = 'standard';
      }
      const languageCode = (voice.languageCode || voice.locale || voice.lang || '') as string;
      const normalizedAccent = normalizeAccentValue(voice.accent as string | undefined, languageCode);
      const rawGender = (voice.gender || voice.ssmlGender || voice.ssml_gender || voice.voiceGender) as string | undefined;
      const normalizedGender = (rawGender || '').toString().toLowerCase();
      return {
        ...voice,
        name,
        category,
        accent: normalizedAccent,
        gender: normalizedGender,
      } as unknown as Voice;
    });
  };

  const fetchAvailableVoices = useCallback(async () => {
    setLoadingVoices(true);
    try {
      const response = await ttsService.getAvailableVoices();
      const apiResponse = response as unknown as Record<string, unknown>;
      const voices = (apiResponse.voices || (apiResponse.data as Record<string, unknown>)?.voices || []) as Record<string, unknown>[];
      if (voices.length > 0) {
        const processed = processVoiceList(voices);
        setAllVoices(processed);
        setAvailableVoices(processed);
        setSelectedVoice((prev: string) => {
          if (processed.some(v => v.name === prev)) return prev;
          const preferred = processed.find(v => (selectedGender === 'all') || v.gender === selectedGender);
          return preferred?.name || processed[0]?.name || prev;
        });
      }
    } catch {
      // silent
    } finally {
      setLoadingVoices(false);
    }
  }, [selectedGender]);

  const fetchFilteredVoices = useCallback(async (accent?: string, gender?: string, category?: string) => {
    setLoadingVoices(true);
    try {
      const backendCategory = mapCategoryForBackend(category);
      const response = await ttsService.getFilteredVoices(accent, gender, undefined, backendCategory);
      const apiResponse = response as unknown as Record<string, unknown>;
      const voices: Record<string, unknown>[] =
        (apiResponse?.voices ||
        (apiResponse?.data as Record<string, unknown>)?.voices ||
        (Array.isArray(apiResponse?.data) ? apiResponse.data : []) ||
        []) as Record<string, unknown>[];

      if (Array.isArray(voices) && voices.length >= 0) {
        // Studio + Male fallback
        if (voices.length === 0 && (category === 'studio') && (gender === 'male')) {
          const fallbackName = accent === 'british' ? 'en-GB-Studio-B' : accent === 'american' ? 'en-US-Studio-M' : undefined;
          if (fallbackName) {
            const fallback = [{
              name: fallbackName, category: 'studio', accent, gender: 'male',
              displayName: fallbackName.includes('GB') ? 'UK English Male (Studio)' : 'US English Male (Studio)',
              ssmlSupport: false, package: 'Platinum',
              languageCode: fallbackName.includes('GB') ? 'en-GB' : 'en-US',
            }];
            setAvailableVoices(fallback as unknown as Voice[]);
            setSelectedVoice(fallbackName);
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
          const cfg = map[accent!];
          const chosen = (gender === 'male') ? cfg.male : cfg.female;
          const fallback = [{
            name: chosen, category: 'wavenet', accent, gender: gender || 'female',
            displayName: chosen.split('-').slice(-1)[0], ssmlSupport: true, package: 'Premium',
            languageCode: cfg.lang,
          }];
          setAvailableVoices(fallback as unknown as Voice[]);
          setSelectedVoice(chosen);
          setLoadingVoices(false);
          return;
        }

        const processed = processVoiceList(voices);
        setAvailableVoices(processed);
        setSelectedVoice((prev) => {
          if (processed.some(v => v.name === prev)) return prev;
          const preferred = processed.find(v => (selectedGender === 'all') || v.gender === selectedGender);
          return preferred?.name || processed[0]?.name || prev;
        });
      }
    } catch {
      // silent
    } finally {
      setLoadingVoices(false);
    }
  }, [selectedGender]);

  const filterVoices = useCallback((voices: Voice[], category: string, gender: string, accent: string) => {
    return voices
      .filter(v => isVoiceInCategory(v as unknown as Record<string, unknown>, category, currentProvider))
      .filter(v => gender === 'all' || v.gender === gender)
      .filter(v => accent === 'all' || v.accent === accent);
  }, [currentProvider]);

  const getFilteredVoicesByCategory = useCallback(() => {
    if (hasActiveFilters) return availableVoices;
    let voices = availableVoices;
    if (planFeatures?.voice_categories) {
      voices = availableVoices.filter(voice => {
        const categories = planFeatures.voice_categories!;
        const isAmazon = currentProvider === 'amazon' || currentProvider === 'polly';
        if (isAmazon) {
          return (isVoiceInCategory(voice as unknown as Record<string, unknown>, 'basic', 'amazon') && categories.amazon_standard) ||
            (isVoiceInCategory(voice as unknown as Record<string, unknown>, 'neural', 'amazon') && categories.amazon_neural) ||
            (isVoiceInCategory(voice as unknown as Record<string, unknown>, 'generative', 'amazon') && categories.amazon_generative);
        }
        return (isVoiceInCategory(voice as unknown as Record<string, unknown>, 'basic', 'google') && (categories.standard ?? true)) ||
          (isVoiceInCategory(voice as unknown as Record<string, unknown>, 'silver', 'google') && (categories.wavenet || categories.neural2)) ||
          (isVoiceInCategory(voice as unknown as Record<string, unknown>, 'gold', 'google') && categories.chirp3d) ||
          (isVoiceInCategory(voice as unknown as Record<string, unknown>, 'platinum', 'google') && categories.studio);
      });
    }
    return filterVoices(voices, selectedVoiceCategory, selectedGender, selectedAccent);
  }, [availableVoices, planFeatures, currentProvider, selectedVoiceCategory, selectedGender, selectedAccent, hasActiveFilters, filterVoices]);

  // ─── Effects ──────────────────────────────────────────────

  // Fetch plan features
  useEffect(() => {
    (async () => {
      try {
        const result = await getMyPlanFeatures(userId);
        setPlanFeatures(result.features);
      } catch {
        // silent
      }
    })();
  }, [userId]);

  // Fetch TTS provider
  useEffect(() => {
    (async () => {
      try {
        const response = await ttsService.getTtsProvider();
        if (response?.provider) {
          setCurrentProvider(response.provider);
          fetchAvailableVoices();
        }
      } catch {
        setCurrentProvider('amazon');
      }
    })();
  }, []);

  // Load voices + default voice on focus
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          await fetchAvailableVoices();
          const settings = await ttsService.getUserSettings();
          const dv = settings?.data?.default_voice;
          if (dv && typeof dv === 'string') {
            setDefaultVoiceName(dv);
            setSelectedVoice(dv);
            setShouldPromoteSelectedVoiceTop(true);
            const { category, accent, gender } = deriveFiltersFromVoiceName(dv);
            setSelectedVoiceCategory(category);
            setSelectedAccent(accent);
            setSelectedGender(gender);
          } else {
            setDefaultVoiceName('');
          }
        } catch {
          // silent
        }
      })();
    }, [])
  );

  // Promote selected voice to top
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

  // Refetch voices when filters change
  useEffect(() => {
    if (selectedVoiceCategory !== 'basic') {
      fetchFilteredVoices(selectedAccent, selectedGender, selectedVoiceCategory);
    } else if (selectedAccent !== 'all' || selectedGender !== 'all') {
      fetchFilteredVoices(selectedAccent, selectedGender);
    } else {
      fetchAvailableVoices();
    }
  }, [selectedAccent, selectedGender, selectedVoiceCategory]);

  // Notify parent whenever selection changes
  useEffect(() => {
    if (!selectedVoice) return;
    onVoiceChange({
      voiceName: selectedVoice,
      category: selectedVoiceCategory,
      accent: selectedAccent,
      gender: selectedGender,
      engine: mapCategoryForBackend(selectedVoiceCategory),
      provider: currentProvider,
    });
  }, [selectedVoice, selectedVoiceCategory, selectedAccent, selectedGender, currentProvider]);

  // ─── Render ───────────────────────────────────────────────

  const gap = compact ? 6 : 10;

  return (
    <View style={compact ? styles.containerCompact : styles.container}>
      <Text style={compact ? styles.sectionTitleCompact : styles.sectionTitle}>
        {t('create.voice.title')}
      </Text>

      {/* Voice Categories */}
      <View style={[styles.voiceCategoryContainer, compact && { marginBottom: 8 }]}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap, justifyContent: 'center' }}>
          {voiceCategories.map((category) => (
            <TouchableOpacity
              key={category.value}
              style={[
                styles.voiceCategoryButton,
                selectedVoiceCategory === category.value && styles.voiceCategoryButtonActive,
                compact && styles.voiceCategoryButtonCompact,
              ]}
              onPress={() => {
                setSelectedVoiceCategory(category.value);
                setSelectedAccent('all');
                setSelectedGender('all');
                const filtered = filterVoices(availableVoices, category.value, 'all', 'all');
                if (filtered.length > 0) {
                  setSelectedVoice(filtered[0].name);
                }
              }}
            >
              <Icon name={category.icon} size={compact ? 14 : 16} color={selectedVoiceCategory === category.value ? '#FFF' : COLORS.primary} />
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
      <View style={[styles.voiceFiltersContainer, compact && { marginBottom: 8 }]}>
        <View style={[styles.filterGroup, { marginBottom: compact ? 8 : 16, marginRight: 0 }]}>
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
        onPress={async () => {
          try {
            if (hasActiveFilters) {
              await fetchFilteredVoices(selectedAccent, selectedGender, selectedVoiceCategory);
            } else {
              await fetchAvailableVoices();
            }
          } catch {
            // silent
          }
          setShowVoiceSelection(true);
        }}
      >
        <Icon name="record-voice-over" size={compact ? 20 : 24} color={COLORS.primary} />
        <View style={styles.voiceSelectionInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.voiceSelectionText}>
              {selectedVoice ? getVoiceDisplayName(selectedVoice, langProp, selectedVoice) : t('create.voice.selectPrompt')}
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
                  {currentProvider === 'polly' || currentProvider === 'amazon' ? 'Amazon Polly' : currentProvider === 'azure' ? 'Azure TTS' : 'Google TTS'}
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
                      const nameA = getVoiceDisplayName(a.name, langProp, a.displayName || a.name);
                      const nameB = getVoiceDisplayName(b.name, langProp, b.displayName || b.name);
                      return nameA.localeCompare(nameB);
                    })
                    .map((item) => (
                      <TouchableOpacity
                        key={item.name}
                        style={[
                          styles.voiceItem,
                          selectedVoice === item.name && styles.voiceItemActive,
                        ]}
                        onPress={() => setSelectedVoice(item.name)}
                      >
                        <View style={styles.voiceItemInfo}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.voiceItemName}>
                              {getVoiceDisplayName(item.name, langProp, item.displayName || item.name)}
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
                            {` \u2022 ${item.gender === 'male' ? t('create.voice.genders.male') : t('create.voice.genders.female')}`}
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
                    style={styles.defaultVoiceButton}
                    onPress={async () => {
                      try {
                        await ttsService.saveDefaultVoiceSetting(selectedVoice);
                        setDefaultVoiceName(selectedVoice);
                        setShouldPromoteSelectedVoiceTop(true);
                        setShowVoiceSelection(false);
                      } catch {
                        setShowVoiceSelection(false);
                      }
                    }}
                  >
                    <Text style={styles.defaultVoiceButtonText}>
                      {langProp === 'tr' ? 'Varsayilan Ses Sec' : 'Set as Default Voice'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  containerCompact: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  sectionTitleCompact: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 10,
    textTransform: 'uppercase',
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
  voiceCategoryButtonCompact: {
    paddingVertical: 10,
    borderRadius: 12,
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
  defaultVoiceBadge: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  defaultVoiceBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
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
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  defaultVoiceButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default VoiceSelector;
