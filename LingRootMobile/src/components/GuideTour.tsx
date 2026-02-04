import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CopilotProvider, useCopilot, TooltipProps } from 'react-native-copilot';
import { COLORS } from '../theme/colors';

// ---- Storage Keys ----
const HOME_TOUR_KEY = 'guide_tour_completed';
const LIBRARY_TOUR_KEY = 'guide_tour_library_completed';
const PROFILE_TOUR_KEY = 'guide_tour_profile_completed';
const CREATE_TOUR_KEY = 'guide_tour_create_completed';
const AUDIOPLAYER_TOUR_KEY = 'guide_tour_audioplayer_completed';
const VOCABULARY_TOUR_KEY = 'guide_tour_vocabulary_completed';

export { HOME_TOUR_KEY, LIBRARY_TOUR_KEY, PROFILE_TOUR_KEY, CREATE_TOUR_KEY, AUDIOPLAYER_TOUR_KEY, VOCABULARY_TOUR_KEY };

// ---- Home Tour Steps ----
export const TOUR_STEPS: Record<string, { tr: string; en: string }> = {
  liro: {
    tr: 'Liro AI ile ilgi alanlarından içerik oluştur ve seviyene uygun dinle.',
    en: 'Create content from your interests with Liro AI and listen at your level.',
  },
  tts: {
    tr: 'İngilizce metin yaz veya yapıştır — AI seviyene uyarlar ve seslendirir.',
    en: 'Write or paste English text — AI adapts it to your level and voices it.',
  },
  uploadFile: {
    tr: 'PDF veya Word dosyanı yükle — AI seviyene uyarlar ve seslendirir.',
    en: 'Upload your PDF or Word file — AI adapts it to your level and voices it.',
  },
  podcast: {
    tr: 'Herhangi bir konuda podcast oluştur ve dinleyerek öğren.',
    en: 'Create a podcast on any topic and learn by listening.',
  },
  topicTree: {
    tr: 'İlgi alanlarından konu ağacı oluştur ve alt konularla içerik üret.',
    en: 'Build a topic tree from your interests and generate content from subtopics.',
  },
  vocabulary: {
    tr: 'Dinlerken öğrendiğin kelimeleri burada takip et.',
    en: 'Track the words you learn while listening.',
  },
  searchBooks: {
    tr: 'Binlerce kitap arasında ara ve seviyene uygun olanını bul.',
    en: 'Search thousands of books and find the one that matches your level.',
  },
  homeLibrary: {
    tr: 'Tüm ses dosyalarına Kütüphane\'den ulaşabilirsin. Aşağıdaki Kütüphane butonu da aynı yere gider.',
    en: 'Access all your audio files from the Library. The Library button below goes to the same place.',
  },
  homeRecentTracks: {
    tr: 'Son 5 kaydını buradan hızlıca dinleyebilirsin.',
    en: 'Quickly listen to your last 5 records from here.',
  },
};

// Map feature IDs to tour step config
export const TOUR_STEP_MAP: Record<number, { order: number; name: string }> = {
  1: { order: 2, name: 'tts' },
  2: { order: 3, name: 'uploadFile' },
  3: { order: 4, name: 'podcast' },
  4: { order: 5, name: 'topicTree' },
  5: { order: 6, name: 'vocabulary' },
  6: { order: 7, name: 'searchBooks' },
};

// ---- Library Tour Steps ----
export const LIBRARY_TOUR_STEPS: Record<string, { tr: string; en: string }> = {
  librarySearch: {
    tr: 'Ses dosyalarında arama yaparak istediğin içeriği hızlıca bul.',
    en: 'Quickly find the content you want by searching audio files.',
  },
  libraryFavorites: {
    tr: 'Favori içeriklerini işaretleyip kolayca eriş.',
    en: 'Mark your favorite content and access it easily.',
  },
  libraryTypeFilter: {
    tr: 'İçerik türüne göre filtrele: Podcast, Metin, Kitap ve dahası.',
    en: 'Filter by content type: Podcast, Text, Book and more.',
  },
  libraryLevelFilter: {
    tr: 'CEFR seviyene göre içerikleri filtrele.',
    en: 'Filter content by your CEFR level.',
  },
  libraryTrackItem: {
    tr: 'Bir kayda dokunarak dinlemeye başla. Uzun basarak favorilere ekle.',
    en: 'Tap a track to start listening. Long press to add to favorites.',
  },
};

// ---- Profile Tour Steps ----
export const PROFILE_TOUR_STEPS: Record<string, { tr: string; en: string }> = {
  profileInfo: {
    tr: 'Profil bilgilerini burada görebilirsin.',
    en: 'You can see your profile information here.',
  },
  profileSettings: {
    tr: 'Hesap bilgilerini ve şifre ayarlarını buradan yönet.',
    en: 'Manage your account info and password settings here.',
  },
  profileLanguage: {
    tr: 'Uygulama dilini Türkçe veya İngilizce olarak değiştir.',
    en: 'Change the app language to Turkish or English.',
  },
  profileReminder: {
    tr: 'Öğrenme hatırlatıcılarını ayarla, günlük pratik yapmayı unutma.',
    en: 'Set learning reminders so you never miss daily practice.',
  },
  profileUsage: {
    tr: 'Kalan kullanım hakkını buradan takip et.',
    en: 'Track your remaining usage here.',
  },
  profilePackages: {
    tr: 'Paket bilgilerini ve geçmişini görüntüle.',
    en: 'View your package details and history.',
  },
  profileSupport: {
    tr: 'Herhangi bir sorunda destek ekibine buradan ulaş.',
    en: 'Reach the support team here for any issues.',
  },
};

// Map profile menu item IDs to tour step config
export const PROFILE_MENU_TOUR_MAP: Record<number, { order: number; name: string }> = {
  1: { order: 2, name: 'profileSettings' },
  1.5: { order: 3, name: 'profileLanguage' },
  2: { order: 4, name: 'profileReminder' },
  3: { order: 5, name: 'profileUsage' },
  3.2: { order: 6, name: 'profilePackages' },
  3.5: { order: 7, name: 'profileSupport' },
};

// ---- Create Tour Steps ----
export const CREATE_TOUR_STEPS: Record<string, { tr: string; en: string }> = {
  createTextInput: {
    tr: 'Buraya İngilizce metin yaz veya yapıştır. AI seviyene uyarlayıp seslendirecek.',
    en: 'Write or paste English text here. AI will adapt it to your level and voice it.',
  },
  createCefrLevel: {
    tr: 'İngilizce seviyeni seç. İçerik bu seviyeye göre uyarlanır.',
    en: 'Select your English level. Content will be adapted to this level.',
  },
  createVoiceSelect: {
    tr: 'Seslendirme için bir ses seç. Farklı aksan ve cinsiyetleri deneyebilirsin.',
    en: 'Choose a voice for narration. You can try different accents and genders.',
  },
  createButton: {
    tr: 'Hazır olduğunda bu butona bas ve ses oluşturmayı başlat.',
    en: 'When ready, tap this button to start creating your audio.',
  },
};

// ---- AudioPlayer Tour Steps ----
export const AUDIOPLAYER_TOUR_STEPS: Record<string, { tr: string; en: string }> = {
  playerText: {
    tr: 'Metin, ses ile senkronize olarak vurgulanır. Kelimelere uzun basarak kelime listene ekleyebilirsin.',
    en: 'Text is highlighted in sync with the audio. Long press words to add them to your vocabulary.',
  },
  playerOriginalToggle: {
    tr: 'Orijinal metni görmek için bu butona bas. Sola kaydır veya butona tekrar bas.',
    en: 'Tap this button to see the original text. Swipe left or tap again.',
  },
  playerControls: {
    tr: 'Oynat/duraklat, hız ayarı ve ilerleme çubuğunu buradan kontrol et.',
    en: 'Control play/pause, speed settings and progress bar here.',
  },
  playerSpeed: {
    tr: 'Dinleme hızını değiştir. Yavaş dinlemek anlamayı kolaylaştırır.',
    en: 'Change listening speed. Slower playback makes comprehension easier.',
  },
};

// ---- Vocabulary Tour Steps ----
export const VOCABULARY_TOUR_STEPS: Record<string, { tr: string; en: string }> = {
  vocabStats: {
    tr: 'Toplam, öğrenilen ve yeni kelime sayılarını burada takip et.',
    en: 'Track your total, learned and new word counts here.',
  },
  vocabAddWord: {
    tr: 'Yeni bir kelime eklemek için bu butona bas. AI anlam ve örnek cümleyi otomatik bulur.',
    en: 'Tap this button to add a new word. AI automatically finds meaning and example.',
  },
  vocabSearch: {
    tr: 'Kelime veya anlam arayarak hızlıca bul.',
    en: 'Quickly find words by searching word or meaning.',
  },
  vocabFilters: {
    tr: 'Öğrenme durumuna göre filtrele: Tümü, Öğrenildi veya Yeni.',
    en: 'Filter by learning status: All, Learned or New.',
  },
  vocabLevelFilter: {
    tr: 'CEFR seviyesine göre filtrele.',
    en: 'Filter by CEFR level.',
  },
  vocabWordCard: {
    tr: 'Kelimeye dokun detayları gör. Sol taraftaki işaretle öğrenildi olarak kaydet.',
    en: 'Tap a word to see details. Use the left checkbox to mark as learned.',
  },
};

// ---- Tooltip Factory ----
function createTourTooltip(stepTexts: Record<string, { tr: string; en: string }>) {
  const totalSteps = Object.keys(stepTexts).length;

  const TourTooltip: React.FC = () => {
    const {
      goToNext,
      goToPrev,
      stop,
      currentStep,
      isFirstStep,
      isLastStep,
      currentStepNumber,
    } = useCopilot();

    const stepName = currentStep?.name || '';
    const stepConfig = stepTexts[stepName];
    const isTR = stepConfig
      ? currentStep?.text === stepConfig.tr
      : true;

    return (
      <View style={tooltipStyles.container}>
        <TouchableOpacity
          style={tooltipStyles.skipButton}
          onPress={() => stop()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={tooltipStyles.skipText}>
            {isTR ? 'Atla' : 'Skip'}
          </Text>
        </TouchableOpacity>

        <Text style={tooltipStyles.stepText}>
          {currentStep?.text || ''}
        </Text>

        <View style={tooltipStyles.bottomRow}>
          <Text style={tooltipStyles.counter}>
            {currentStepNumber}/{totalSteps}
          </Text>

          <View style={tooltipStyles.navButtons}>
            {!isFirstStep && (
              <TouchableOpacity
                style={tooltipStyles.prevButton}
                onPress={() => goToPrev()}
              >
                <Text style={tooltipStyles.prevButtonText}>
                  {isTR ? 'Geri' : 'Back'}
                </Text>
              </TouchableOpacity>
            )}

            {isLastStep ? (
              <TouchableOpacity
                style={tooltipStyles.nextButton}
                onPress={() => stop()}
              >
                <Text style={tooltipStyles.nextButtonText}>
                  {isTR ? 'Tamam' : 'Got it!'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={tooltipStyles.nextButton}
                onPress={() => goToNext()}
              >
                <Text style={tooltipStyles.nextButtonText}>
                  {isTR ? 'Sonraki' : 'Next'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return TourTooltip;
}

// ---- Generated Tooltip Components ----
export const CustomTooltip = createTourTooltip(TOUR_STEPS);
export const LibraryTooltip = createTourTooltip(LIBRARY_TOUR_STEPS);
export const ProfileTooltip = createTourTooltip(PROFILE_TOUR_STEPS);
export const CreateTooltip = createTourTooltip(CREATE_TOUR_STEPS);
export const AudioPlayerTooltip = createTourTooltip(AUDIOPLAYER_TOUR_STEPS);
export const VocabularyTooltip = createTourTooltip(VOCABULARY_TOUR_STEPS);

// ---- Tooltip Styles ----
const tooltipStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.brandTeal,
    borderRadius: 16,
    padding: 16,
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  skipButton: {
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
  skipText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontWeight: '600',
  },
  stepText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    marginBottom: 16,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counter: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: '700',
  },
  navButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  prevButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  prevButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  nextButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  nextButtonText: {
    color: COLORS.brandTeal,
    fontSize: 14,
    fontWeight: '700',
  },
});

// ---- Rounded rect SVG sub-path helper ----
function roundedRectSubPath(
  x: number, y: number, w: number, h: number, borderRadius: number,
): string {
  const r = Math.min(borderRadius, w / 2, h / 2);
  return (
    `M${x + r},${y}` +
    `H${x + w - r}` +
    `A${r},${r},0,0,1,${x + w},${y + r}` +
    `V${y + h - r}` +
    `A${r},${r},0,0,1,${x + w - r},${y + h}` +
    `H${x + r}` +
    `A${r},${r},0,0,1,${x},${y + h - r}` +
    `V${y + r}` +
    `A${r},${r},0,0,1,${x + r},${y}Z`
  );
}

// ---- Custom SVG mask path with rounded corners ----
export function roundedMaskPath({
  size,
  position,
  canvasSize,
}: {
  size: { x: { _value: number }; y: { _value: number } };
  position: { x: { _value: number }; y: { _value: number } };
  canvasSize: { x: number; y: number };
}): string {
  const x = position.x._value;
  const y = position.y._value;
  const w = size.x._value;
  const h = size.y._value;

  return (
    `M0,0H${canvasSize.x}V${canvasSize.y}H0V0Z` +
    roundedRectSubPath(x, y, w, h, 16)
  );
}

// ---- Home-specific mask: dual highlight for library step ----
export function homeMaskPath({
  size,
  position,
  canvasSize,
  step,
}: {
  size: { x: { _value: number }; y: { _value: number } };
  position: { x: { _value: number }; y: { _value: number } };
  canvasSize: { x: number; y: number };
  step?: { name: string };
}): string {
  const x = position.x._value;
  const y = position.y._value;
  const w = size.x._value;
  const h = size.y._value;

  // Outer mask + main cutout
  let path =
    `M0,0H${canvasSize.x}V${canvasSize.y}H0V0Z` +
    roundedRectSubPath(x, y, w, h, 16);

  // Add second cutout over Library tab icon
  if (step?.name === 'homeLibrary') {
    const sw = canvasSize.x;
    const sh = canvasSize.y;
    // Tab bar layout from AppNavigator: bottom=24, left=24, right=24, height=64, paddingH=8
    const tabBarLeft = 24;
    const tabBarPadH = 8;
    const tabItemMarginH = 4;
    const tabItemMarginV = 8;
    const tabBarH = 64;
    const tabBarBottom = 24;
    const numTabs = 4;
    const tabBarInnerW = sw - tabBarLeft * 2 - tabBarPadH * 2;
    const tabW = tabBarInnerW / numTabs;
    // Library is 2nd tab (index 1)
    const tx = tabBarLeft + tabBarPadH + tabW * 1 + tabItemMarginH;
    const ty = sh - tabBarBottom - tabBarH + tabItemMarginV;
    const tw = tabW - tabItemMarginH * 2;
    const th = tabBarH - tabItemMarginV * 2;

    path += roundedRectSubPath(tx, ty, tw, th, 24);
  }

  return path;
}

// ---- Reusable CopilotProvider wrapper ----
export const TourProvider: React.FC<{
  tooltip: React.ComponentType;
  children: React.ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  maskPath?: (args: any) => string;
}> = ({ tooltip, children, maskPath }) => (
  <CopilotProvider
    overlay="svg"
    animated={true}
    backdropColor="rgba(0, 0, 0, 0.7)"
    tooltipComponent={tooltip as unknown as React.ComponentType<TooltipProps>}
    stepNumberComponent={() => null}
    verticalOffset={0}
    svgMaskPath={(maskPath || roundedMaskPath) as unknown as (args: Record<string, unknown>) => string}
    margin={16}
    arrowColor={COLORS.brandTeal}
    tooltipStyle={{
      backgroundColor: 'transparent',
      borderRadius: 0,
      paddingTop: 0,
      paddingHorizontal: 0,
      overflow: 'visible' as const,
    }}
  >
    {children}
  </CopilotProvider>
);

// ---- Tour completion hook ----
export function useGuideTour(storageKey: string = HOME_TOUR_KEY) {
  const [isCompleted, setIsCompleted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(storageKey)
      .then((value) => {
        setIsCompleted(value === 'true');
      })
      .catch(() => {
        setIsCompleted(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [storageKey]);

  const markCompleted = useCallback(async () => {
    try {
      await AsyncStorage.setItem(storageKey, 'true');
      setIsCompleted(true);
    } catch {
      // Silent failure
    }
  }, [storageKey]);

  return {
    isCompleted,
    isLoading,
    shouldShow: !isCompleted && !isLoading,
    markCompleted,
  };
}

// ---- Auto-start tour hook (use inside CopilotProvider) ----
export function useTourAutoStart(
  storageKey: string,
  delay: number = 1000,
  scrollViewRef?: React.RefObject<ScrollView | null>,
) {
  const { start, copilotEvents } = useCopilot();
  const { shouldShow, markCompleted } = useGuideTour(storageKey);

  useEffect(() => {
    const handler = () => {
      if (shouldShow) markCompleted();
    };
    copilotEvents.on('stop', handler);
    return () => {
      copilotEvents.off('stop', handler);
    };
  }, [copilotEvents, shouldShow, markCompleted]);

  useEffect(() => {
    if (shouldShow) {
      const timer = setTimeout(() => {
        // Scroll to top before starting tour so first steps are visible
        if (scrollViewRef?.current) {
          scrollViewRef.current.scrollTo({ y: 0, animated: false });
        }
        // Start copilot without passing scrollViewRef to avoid unwanted auto-scroll
        start();
      }, delay);
      return () => clearTimeout(timer);
    }
    // start reference changes on each provider re-render; only shouldShow should trigger this
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldShow]);
}
