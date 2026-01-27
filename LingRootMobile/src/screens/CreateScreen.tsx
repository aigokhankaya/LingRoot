import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Modal,
  Dimensions,
  Linking,
  AppState,
} from 'react-native';
import { Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { pick, keepLocalCopy } from '@react-native-documents/picker';
import { CEFRLevel, TTSRequest, Voice, VoiceCategory, VoiceFilter, AudioTrack } from '../types';
import { useRoute, useFocusEffect, useNavigation } from '@react-navigation/native';
import { useLanguage } from '../contexts/LanguageContext';
import * as ttsService from '../services/ttsService';
import * as bookService from '../services/bookService';
import { submitContent } from '../services/contentService';
import { getMyPlanFeatures, PlanFeatures, getUsageSummary } from '../services/subscriptionService';
import AudioPlayer from '../components/AudioPlayer';
import { getVoiceDisplayName } from '../utils/voiceDisplayNames';
import { COLORS } from '../theme/colors';
import { AnalyticsHelper } from '../utils/AnalyticsHelper';

const CreateScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const prevModeRef = useRef<string>(
    route.params?.mode === 'file' ? 'file'
      : route.params?.mode === 'book' ? 'book'
      : route.params?.mode === 'suggestion' ? 'suggestion'
      : route.params?.mode === 'youtube' ? 'youtube'
      : route.params?.mode === 'podcast' ? 'podcast'
      : 'text'
  );
  const [mode, setMode] = useState<'text' | 'file' | 'book' | 'suggestion' | 'youtube' | 'podcast'>(
    route.params?.mode === 'file'
      ? 'file'
      : route.params?.mode === 'book'
        ? 'book'
        : route.params?.mode === 'suggestion'
          ? 'suggestion'
          : route.params?.mode === 'youtube'
            ? 'youtube'
            : route.params?.mode === 'podcast'
              ? 'podcast'
              : 'text'
  );
  const { t, language } = useLanguage();
  const screenHeight = Dimensions.get('window').height;
  const [isTextExpanded, setIsTextExpanded] = useState(false);
  const [inputText, setInputText] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel>('B1');
  const [speechRate, setSpeechRate] = useState(1.0);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingVoice, setIsCreatingVoice] = useState(false);
  const [isTtsJobLocked, setIsTtsJobLocked] = useState(false);
  const [ttsJobMessage, setTtsJobMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [createdTrack, setCreatedTrack] = useState<AudioTrack | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [planFeatures, setPlanFeatures] = useState<PlanFeatures | null>(null);

  // Success alert modal state
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [successAlertEstimatedTime, setSuccessAlertEstimatedTime] = useState('');

  // Error alert modal state
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorAlertTitle, setErrorAlertTitle] = useState('');
  const [errorAlertMessage, setErrorAlertMessage] = useState('');
  const [errorAlertAction, setErrorAlertAction] = useState<{ label: string; onPress: () => void } | null>(null);

  const showError = (title: string, message: string, action?: { label: string; onPress: () => void }) => {
    setErrorAlertTitle(title);
    setErrorAlertMessage(message);
    setErrorAlertAction(action || null);
    setShowErrorAlert(true);
  };

  useFocusEffect(
    React.useCallback(() => {
      const checkActiveJob = async () => {
        try {
          const res = await ttsService.getActiveTtsJob();
          if (res && res.hasActiveJob) {
            setIsTtsJobLocked(true);
            setIsCreatingVoice(true);
            setTtsJobMessage(
              language === 'tr'
                ? 'Ses oluşturma süreci devam ediyor. Lütfen bitmesini bekleyin.'
                : 'An audio creation process is still running. Please wait for it to finish.'
            );
          } else {
            setIsTtsJobLocked(false);
            setIsCreatingVoice(false);
            setTtsJobMessage(null);
          }
        } catch (e) {
          // Sessizce geç; hata durumunda kullanıcıyı kilitlemeyelim
          setIsTtsJobLocked(false);
        }
      };

      const nextMode: 'text' | 'file' | 'book' | 'suggestion' | 'youtube' | 'podcast' =
        route.params?.mode === 'file'
          ? 'file'
          : route.params?.mode === 'book'
            ? 'book'
            : route.params?.mode === 'suggestion'
              ? 'suggestion'
              : route.params?.mode === 'youtube'
                ? 'youtube'
                : route.params?.mode === 'podcast'
                  ? 'podcast'
                  : 'text';
      const prevMode = prevModeRef.current;
      setMode(nextMode);
      prevModeRef.current = nextMode;

      // Preselect podcast provider if Create screen is opened in podcast mode
      if (nextMode === 'podcast') {
        const providerParam = (route.params as any)?.podcastProvider;
        if (providerParam === 'google') {
          setPodcastTtsProvider('google');
        } else if (providerParam === 'n8n') {
          setPodcastTtsProvider('n8n');
        }
      }

      // Ekrana her odaklanıldığında aktif job durumunu kontrol et
      checkActiveJob();

      // Firebase Analytics: Screen View
      AnalyticsHelper.logScreenView('Create', 'CreateScreen');

      // Topic Tree'den gelen hazır uzun metni sadece text modunda ve input boşken uygula
      if (
        nextMode === 'text' &&
        (!inputText || inputText.trim().length === 0) &&
        typeof route.params?.initialText === 'string' &&
        route.params.initialText.trim().length > 0
      ) {
        setInputText(route.params.initialText);
      }

      // Topic Tree'den gelen seviye bilgisini (topicLevel) text modunda uygula
      if (
        nextMode === 'text' &&
        typeof route.params?.topicLevel === 'string' &&
        route.params.topicLevel.trim().length > 0
      ) {
        const lvl = route.params.topicLevel.trim().toUpperCase();
        if (['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(lvl)) {
          setSelectedLevel(lvl as CEFRLevel);
        }
      }

      // Her zaman suggestion mode'a girerken temizle
      if (nextMode === 'suggestion') {
        setSuggestion('');
        setSuggestionResults([]);
        setInputText('');
        setIsConvertingSuggestion(false);
        setConvertingText('');
      }

      // Diğer mode'lar için sadece mode değiştiğinde temizle
      if (prevMode !== nextMode && nextMode !== 'suggestion') {
        setInputText('');
        setSelectedFile(null);
        setSelectedBook(null);
        setSelectedChapterId(null);
        setSelectedChapterText('');
        setSuggestion('');
        setSuggestionResults([]);
        setYoutubeUrl('');
        setYoutubeLoading(false);
        setYoutubeError(null);
      }
    }, [route.params?.mode, language])
  );
  // --- Suggestion Mode State ---
  const [suggestion, setSuggestion] = useState('');
  const [suggestionResults, setSuggestionResults] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isConvertingSuggestion, setIsConvertingSuggestion] = useState(false);
  const [convertingText, setConvertingText] = useState('');

  // --- YouTube Mode State ---
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [youtubeLoading, setYoutubeLoading] = useState<boolean>(false);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);

  // --- İçerik Süresi Seçenekleri ---
  // 1.5 dk, 5 dk, 10 dk, 15 dk seçenekleri (tüm modlar için ortak)
  const DURATION_OPTIONS = [
    { value: 2, label: '2 dk', description: '~300\nkelime' },
    { value: 5, label: '5 dk', description: '~750\nkelime' },
    { value: 7, label: '7 dk', description: '~1050\nkelime' },
    { value: 10, label: '10 dk', description: '~1500\nkelime' },
  ];

  // --- Podcast Mode State ---
  const [podcastTopic, setPodcastTopic] = useState<string>('');
  const [podcastDuration, setPodcastDuration] = useState<number>(5); // Varsayılan 5 dk
  const [podcastTtsProvider, setPodcastTtsProvider] = useState<string>('n8n'); // TTS Provider: 'n8n' or 'google'
  const [isCreatingPodcast, setIsCreatingPodcast] = useState<boolean>(false);
  const [podcastError, setPodcastError] = useState<string | null>(null);
  const [podcastStyleType, setPodcastStyleType] = useState<string>('friendly_chat');
  const [podcastHostSpeakerId, setPodcastHostSpeakerId] = useState<string>('Kore');
  const [podcastGuestSpeakerId, setPodcastGuestSpeakerId] = useState<string>('Puck');
  const [podcastPersonalityA, setPodcastPersonalityA] = useState<string>('curious_enthusiast');
  const [podcastPersonalityB, setPodcastPersonalityB] = useState<string>('knowledgeable_friend');
  const [podcastIncludeHumor, setPodcastIncludeHumor] = useState<boolean>(true);
  const [podcastIncludeFiller, setPodcastIncludeFiller] = useState<boolean>(true);
  const [showPodcastHostVoiceModal, setShowPodcastHostVoiceModal] = useState(false);
  const [showPodcastGuestVoiceModal, setShowPodcastGuestVoiceModal] = useState(false);

  const GEMINI_PODCAST_SPEAKERS = [
    { value: 'Aoede', label: 'Aoede (F)' },
    { value: 'Kore', label: 'Kore (F)' },
    { value: 'Leda', label: 'Leda (F)' },
    { value: 'Callirrhoe', label: 'Callirrhoe (F)' },
    { value: 'Zephyr', label: 'Zephyr (F)' },
    { value: 'Charon', label: 'Charon (M)' },
    { value: 'Fenrir', label: 'Fenrir (M)' },
    { value: 'Orus', label: 'Orus (M)' },
    { value: 'Puck', label: 'Puck (M)' },
    { value: 'Achilles', label: 'Achilles (M)' },
  ];

  const getGeminiSpeakerLabel = (value?: string) => {
    const found = GEMINI_PODCAST_SPEAKERS.find(s => s.value === value);
    return found?.label || value || '';
  };

  useFocusEffect(
    React.useCallback(() => {
      if (mode === 'podcast') {
        setPodcastTopic('');
        setPodcastError(null);
      }
      return () => { };
    }, [mode])
  );

  // Helper: open external URL reliably without Expo WebBrowser
  const openExternalUrl = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        // Fallback attempt
        await Linking.openURL(url);
      }
    } catch (err) {
      try { await Linking.openURL(url); } catch { }
    }
  };

  const fetchYoutubeSubtitle = async () => {
    if (isTtsJobLocked) {
      const msg =
        ttsJobMessage ||
        (language === 'tr'
          ? 'Ses oluşturma süreci devam ediyor. Lütfen bitmesini bekleyin.'
          : 'An audio creation process is still running. Please wait for it to finish.');
      showError(t('common.info'), msg);
      return;
    }
    AnalyticsHelper.logEvent('action_fetch_youtube_click_mobile', { url: youtubeUrl });
    if (!youtubeUrl || !/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(youtubeUrl)) {
      showError(t('common.error'), 'Geçerli bir YouTube linki girin');
      return;
    }
    setYoutubeLoading(true);
    setYoutubeError(null);
    try {
      const resp = await fetch('https://yt-subtitle-api-na5bfjgtjq-ew.a.run.app/api/subtitle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl, temizle: true, dil: 'tr' })
      });
      const contentType = resp.headers.get('content-type') || '';
      if (!resp.ok) {
        let errBody: any = null;
        if (contentType.includes('application/json')) {
          try { errBody = await resp.json(); } catch { errBody = null; }
        } else {
          try { errBody = await resp.text(); } catch { errBody = ''; }
        }
        const noSubs = (errBody && (errBody?.detail?.error_code === 'NO_SUBTITLES' || errBody?.error_code === 'NO_SUBTITLES'));
        if (noSubs) {
          throw new Error('Bu videoda altyazı bulunmamaktadır');
        }
        throw new Error(`HTTP ${resp.status}`);
      }
      if (!contentType.includes('application/json')) {
        const text = await resp.text();
        if (!text || !text.trim()) throw new Error('Bu videoda altyazı bulunmamaktadır');
        setInputText(text);
        return;
      }
      const data = await resp.json();
      if (data?.detail?.error_code === 'NO_SUBTITLES' || data?.error_code === 'NO_SUBTITLES') {
        throw new Error('Bu videoda altyazı bulunmamaktadır');
      }
      const text = data?.text || data?.data?.text || '';
      if (!text || !text.trim()) throw new Error('Bu videoda altyazı bulunmamaktadır');
      setInputText(text);
      showError(t('common.success'), 'Altyazı metni yüklendi');
    } catch (e: any) {
      setYoutubeError(e?.message || 'Altyazı çekilemedi');
      showError(t('common.error'), e?.message || 'Altyazı çekilemedi');
    } finally {
      setYoutubeLoading(false);
    }
  };

  const handleGetSuggestions = async () => {
    if (isTtsJobLocked) {
      if (ttsJobMessage) {
        showError(t('common.info'), ttsJobMessage);
      }
      return;
    }
    if (!suggestion.trim()) {
      showError(t('common.error'), t('suggestions.alerts.pleaseEnterTopic'));
      return;
    }
    setIsLoadingSuggestions(true);
    try {
      const res = await ttsService.getTopicSuggestions(suggestion, selectedLevel);

      if (res?.success) {
        const suggestions = res.suggestions || [];
        setSuggestionResults(suggestions);

        // Set first suggestion to input text area
        if (suggestions.length > 0) {
          const firstSuggestion = suggestions[0];
          setInputText(firstSuggestion);
        }
      } else {
        showError(t('common.error'), res?.message || t('suggestions.alerts.fetchFailed'));
      }
    } catch (e: any) {
      showError(t('common.error'), e.message || t('common.unexpectedError'));
    } finally {
      setIsLoadingSuggestions(false);
    }
  };


  // Voice selection states - Default to empty
  const [selectedVoiceCategory, setSelectedVoiceCategory] = useState<string>('standard');
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [selectedAccent, setSelectedAccent] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState<boolean>(false);
  const [showVoiceSelection, setShowVoiceSelection] = useState<boolean>(false);
  const hasActiveFilters = selectedAccent !== 'all' || selectedGender !== 'all' || selectedVoiceCategory !== 'standard';
  const [shouldPromoteSelectedVoiceTop, setShouldPromoteSelectedVoiceTop] = useState<boolean>(false);
  const [currentProvider, setCurrentProvider] = useState<string>('google'); // TTS provider

  const levels: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  // --- Book Search State ---
  const [bookQ, setBookQ] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [isSearchingBooks, setIsSearchingBooks] = useState(false);
  const [bookResults, setBookResults] = useState<any[]>([]);
  const [bookPage, setBookPage] = useState(1);
  const [bookTotalPages, setBookTotalPages] = useState(1);
  const [selectedBook, setSelectedBook] = useState<any | null>(null);
  const [bookChapters, setBookChapters] = useState<any[]>([]);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);
  const [selectedChapterText, setSelectedChapterText] = useState<string>('');

  const levelDescriptions = {
    A1: t('create.cefrDescriptions.A1'),
    A2: t('create.cefrDescriptions.A2'),
    B1: t('create.cefrDescriptions.B1'),
    B2: t('create.cefrDescriptions.B2'),
    C1: t('create.cefrDescriptions.C1'),
    C2: t('create.cefrDescriptions.C2'),
  } as const;

  // Derive filters (category, accent) from a voice name like "en-GB-Chirp3-HD-Achernar"
  const deriveFiltersFromVoiceName = (voiceName?: string): { category: string; accent: string } => {
    const name = (voiceName || '').toString();
    // Category
    let category = 'standard';
    if (name.includes('Chirp') || name.toLowerCase().includes('chirp')) category = 'chirp3d';
    else if (name.includes('Studio')) category = 'studio';
    else if (name.toLowerCase().includes('neural2')) category = 'neural2';
    else if (name.toLowerCase().includes('wavenet')) category = 'wavenet';
    // Accent by language code
    let accent = 'american';
    if (name.includes('en-GB')) accent = 'british';
    else if (name.includes('en-AU')) accent = 'australian';
    else if (name.includes('en-CA')) accent = 'canadian';
    else if (name.includes('en-IN')) accent = 'indian';
    else if (name.includes('en-US')) accent = 'american';
    return { category, accent };
  };

  // Accent normalization helper: maps codes like GB/US and languageCode (en-GB, en-US)
  // to our UI accents: british, american, australian, canadian, indian
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

  // Helper to determine if a voice matches a specific category (Provider agnostic)
  const isVoiceInCategory = (voice: any, category: string, provider: string): boolean => {
    const vName = (voice.name || '').toLowerCase();
    const pVoice = voice.providerVoice || {};
    const pName = (pVoice.name || '').toLowerCase();
    const pEngine = (pVoice.engine || '').toLowerCase();
    const quality = (voice.quality || '').toLowerCase();

    if (provider === 'amazon' || provider === 'polly') {
      if (category === 'standard') return quality === 'basic' || pEngine === 'standard';
      if (category === 'neural') return quality === 'premium' || pEngine === 'neural';
      if (category === 'generative') return quality === 'generative' || quality === 'ultra' || pEngine === 'generative';
      return false;
    } else {
      // Google (default)
      if (category === 'standard') return quality === 'basic' || vName.includes('standard') || pName.includes('standard');
      // Wavenet is mostly deprecated/merged into Neural/Standard, but we map 'premium' to it for backward compat if tab exists
      if (category === 'wavenet') return quality === 'premium' || vName.includes('wavenet') || pName.includes('wavenet');
      if (category === 'neural2') return quality === 'premium' || vName.includes('neural2') || pName.includes('neural2');
      if (category === 'studio') return quality === 'platinum' || vName.includes('studio') || pName.includes('studio');
      if (category === 'chirp3d') return quality === 'gold' || quality === 'ultra' || vName.includes('chirp') || pName.includes('chirp');
      return false;
    }
  };

  // Backend kategori paramını doğrudan kullan
  const mapCategoryForBackend = (category?: string): string | undefined => {
    if (!category || category === 'all') return undefined;
    return category;
  };

  // Dynamic Voice Categories based on Provider
  const voiceCategories: VoiceCategory[] = React.useMemo(() => {
    if (currentProvider === 'amazon' || currentProvider === 'polly') {
      return [
        { value: 'standard', label: 'Standard', icon: 'volume-up', badge: t('create.voice.badge.free') },
        { value: 'neural', label: 'Neural', icon: 'star', badge: t('create.voice.badge.premium') },
        { value: 'generative', label: 'Generative', icon: 'psychology', badge: 'Ultra' },
      ];
    } else {
      // Google
      return [
        { value: 'standard', label: 'Standard', icon: 'volume-up', badge: t('create.voice.badge.free') },
        { value: 'wavenet', label: 'WaveNet', icon: 'graphic-eq', badge: t('create.voice.badge.premium') },
        { value: 'neural2', label: 'Neural2', icon: 'star', badge: 'Plus' },
        { value: 'studio', label: 'Studio', icon: 'mic', badge: 'Pro' },
        { value: 'chirp3d', label: 'Chirp', icon: 'surround-sound', badge: 'Ultra' },
      ];
    }
  }, [currentProvider, t]);



  // Voice filters
  const accentOptions = [
    { value: 'all', label: t('create.voice.filters.all') },
    { value: 'american', label: t('create.voice.accents.american') },
    { value: 'british', label: t('create.voice.accents.british') },
    { value: 'australian', label: t('create.voice.accents.australian') },
    { value: 'canadian', label: t('create.voice.accents.canadian') },
    { value: 'indian', label: t('create.voice.accents.indian') },
  ];

  const genderOptions = [
    { value: 'all', label: t('create.voice.filters.all') },
    { value: 'male', label: t('create.voice.genders.male') },
    { value: 'female', label: t('create.voice.genders.female') },
  ];

  // Fetch plan features
  useEffect(() => {
    const fetchPlanFeatures = async () => {
      try {
        const result = await getMyPlanFeatures();
        setPlanFeatures(result.features);
      } catch (error) {
        console.error('Error loading plan features:', error);
      }
    };
    fetchPlanFeatures();
  }, []);

  // Fetch current TTS provider
  useEffect(() => {
    const fetchProvider = async () => {
      try {
        const response = await ttsService.getTtsProvider();
        if (response?.provider) {
          console.log('🎙️ TTS Provider from admin settings:', response.provider);
          setCurrentProvider(response.provider);
          // Provider değiştiğinde ses listesini yenile
          fetchAvailableVoices();
        }
      } catch (error) {
        console.error('Error fetching TTS provider:', error);
        // Default to amazon if error
        setCurrentProvider('amazon');
      }
    };
    fetchProvider();
  }, []);

  // Fetch available voices
  const fetchAvailableVoices = async () => {
    setLoadingVoices(true);
    try {
      const response = await ttsService.getAvailableVoices();


      // Backend'den { provider: 'google', voices: [...] } formatında geliyor
      const apiResponse = response as any;
      const voices = apiResponse.voices || apiResponse.data?.voices || [];

      if (voices.length > 0) {

        // Voice alanlarını normalize et (name, category, accent, gender)
        const processedVoices = voices.map((voice: any) => {
          const name = voice.name || voice.voiceName || voice.id || voice.code;

          // Kategori - Amazon Polly'nin 'engine' field'ını da kontrol et
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

          // Aksan
          const languageCode = voice.languageCode || voice.locale || voice.lang || '';
          const normalizedAccent = normalizeAccentValue(voice.accent, languageCode);

          // Cinsiyet
          const rawGender = voice.gender || voice.ssmlGender || voice.ssml_gender || voice.voiceGender;
          const normalizedGender = (rawGender || '').toString().toLowerCase();

          return {
            ...voice,
            name,
            category,
            accent: normalizedAccent,
            gender: normalizedGender,
          };
        });



        // Web tarafıyla birebir: Backend zaten filtreleyip gönderiyor → UI tarafında tekrar filtreleme yok
        setAvailableVoices(processedVoices);
        setSelectedVoice((prev: string) => {
          const source = processedVoices;
          if (source.some((v: any) => v.name === prev)) return prev;
          const preferred = source.find((v: any) => (selectedGender === 'all') || v.gender === selectedGender);
          return preferred?.name || source[0]?.name || prev;
        });
      } else {

      }
    } catch (error) {

    } finally {
      setLoadingVoices(false);
    }
  };

  // Fetch filtered voices
  const fetchFilteredVoices = async (accent?: string, gender?: string, category?: string) => {
    setLoadingVoices(true);
    try {
      const backendCategory = mapCategoryForBackend(category);

      console.log('🎙️ [FETCH FILTERED] Request params:', { accent, gender, category, backendCategory });

      const response = await ttsService.getFilteredVoices(accent, gender, undefined, backendCategory);

      console.log('🎙️ [FETCH FILTERED] Raw response:', JSON.stringify(response, null, 2));

      // Response şekli: { provider, voices, ... } veya { success, data } olabilir
      const apiResponse: any = response as any;
      const voices: any[] =
        apiResponse?.voices ||
        apiResponse?.data?.voices ||
        (Array.isArray(apiResponse?.data) ? apiResponse.data : []) ||
        [];

      console.log('🎙️ [FETCH FILTERED] Extracted voices count:', voices.length);
      if (voices.length > 0) {
        console.log('🎙️ [FETCH FILTERED] First voice sample:', JSON.stringify(voices[0], null, 2));
      } else {
        console.log('🎙️ [FETCH FILTERED] ❌ NO VOICES RETURNED!');
      }

      if (Array.isArray(voices) && voices.length >= 0) {
        // Studio + Male fallback (backend deploy beklenirken geçici çözüm)
        if (voices.length === 0 && (category === 'studio') && (gender === 'male')) {
          const fallbackName = accent === 'british' ? 'en-GB-Studio-B' : accent === 'american' ? 'en-US-Studio-M' : undefined;
          if (fallbackName) {
            const fallback = [{
              name: fallbackName,
              category: 'studio',
              accent: accent,
              gender: 'male',
              displayName: fallbackName.includes('GB') ? 'UK English Male (Studio)' : 'US English Male (Studio)',
              ssmlSupport: false,
              package: 'Platinum',
              languageCode: fallbackName.includes('GB') ? 'en-GB' : 'en-US'
            }];
            setAvailableVoices(fallback as any);
            setSelectedVoice(fallbackName);
            setLoadingVoices(false);
            return;
          }
        }

        // Wavenet + AU/CA/IN fallback (backend deploy beklenirken geçici çözüm)
        if (voices.length === 0 && (category === 'wavenet') && (accent === 'australian' || accent === 'canadian' || accent === 'indian')) {
          const map: Record<string, { male: string; female: string; lang: string }> = {
            australian: { male: 'en-AU-Wavenet-D', female: 'en-AU-Wavenet-A', lang: 'en-AU' },
            canadian: { male: 'en-CA-Wavenet-D', female: 'en-CA-Wavenet-A', lang: 'en-CA' },
            indian: { male: 'en-IN-Wavenet-D', female: 'en-IN-Wavenet-A', lang: 'en-IN' },
          };
          const cfg = map[accent];
          const chosen = (gender === 'male') ? cfg.male : cfg.female;
          const fallback = [{
            name: chosen,
            category: 'wavenet',
            accent: accent,
            gender: gender || 'female',
            displayName: chosen.split('-').slice(-1)[0],
            ssmlSupport: true,
            package: 'Premium',
            languageCode: cfg.lang,
          }];
          setAvailableVoices(fallback as any);
          setSelectedVoice(chosen);
          setLoadingVoices(false);
          return;
        }
        // Voice alanlarını normalize et (name, category, accent, gender)
        const processedVoices = voices.map((voice: any) => {
          const name = voice.name || voice.voiceName || voice.id || voice.code;

          // Kategori - Amazon Polly'nin 'engine' field'ını da kontrol et
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

          // Aksan
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

          // Cinsiyet
          const rawGender = voice.gender || voice.ssmlGender || voice.ssml_gender || voice.voiceGender;
          const normalizedGender = (rawGender || '').toString().toLowerCase();

          return {
            ...voice,
            name,
            category,
            accent: normalizedAccent,
            gender: normalizedGender,
          };
        });

        setAvailableVoices(processedVoices);
        // Keep current selection if still valid; otherwise pick the first from filtered list
        setSelectedVoice((prev) => {
          if (processedVoices.some(v => v.name === prev)) return prev;
          // Prefer a voice that matches selected gender when available
          const preferred = processedVoices.find(v => (selectedGender === 'all') || v.gender === selectedGender);
          return preferred?.name || processedVoices[0]?.name || prev;
        });
      }
    } catch (error) {

    } finally {
      setLoadingVoices(false);
    }
  };

  const filterVoices = (
    voices: Voice[],
    category: string,
    gender: string,
    accent: string
  ) => {
    return voices
      .filter(v => {
        // Use generic matcher since we have dynamic categories
        return isVoiceInCategory(v, category, currentProvider);
      })
      .filter(v => gender === 'all' || v.gender === gender)
      .filter(v => accent === 'all' || v.accent === accent);
  };

  const getFilteredVoicesByCategory = () => {
    // Web'de olduğu gibi: filtre aktifse backend zaten filtrelenmiş listyi gönderiyor → doğrudan göster
    if (hasActiveFilters) {
      return availableVoices;
    }

    // First apply plan-based voice category filtering
    let voices = availableVoices;
    console.log('🔍 [Mobile Voice Filter] --------------------------------------------------');
    console.log('🔍 [Mobile Voice Filter] Current Provider:', currentProvider);
    console.log('🔍 [Mobile Voice Filter] Plan features:', JSON.stringify(planFeatures?.voice_categories));
    console.log('🔍 [Mobile Voice Filter] Total voices before filter:', availableVoices.length);
    if (availableVoices.length > 0) {
      const sample = availableVoices[0];
      console.log('🔍 [Mobile Voice Filter] Sample voice:', JSON.stringify({ name: sample.name, quality: sample.quality, category: sample.category, providerVoice: sample.providerVoice }));
    }

    if (planFeatures?.voice_categories) {
      voices = availableVoices.filter(voice => {
        const categories = planFeatures.voice_categories!;
        const isAmazon = currentProvider === 'amazon' || currentProvider === 'polly';

        if (isAmazon) {
          const isStandard = isVoiceInCategory(voice, 'standard', 'amazon') && categories.amazon_standard;
          const isNeural = isVoiceInCategory(voice, 'neural', 'amazon') && categories.amazon_neural;
          const isGenerative = isVoiceInCategory(voice, 'generative', 'amazon') && categories.amazon_generative;
          return isStandard || isNeural || isGenerative;
        } else {
          // Google
          const isStandard = isVoiceInCategory(voice, 'standard', 'google') && (categories.standard ?? true); // Default true if undefined
          const isWavenet = isVoiceInCategory(voice, 'wavenet', 'google') && (categories.wavenet || categories.neural2); // Allow wavenet if neural2 is enabled (backward compat)
          const isNeural2 = isVoiceInCategory(voice, 'neural2', 'google') && categories.neural2;
          const isStudio = isVoiceInCategory(voice, 'studio', 'google') && categories.studio;
          const isChirp = isVoiceInCategory(voice, 'chirp3d', 'google') && categories.chirp3d;

          const result = isStandard || isWavenet || isNeural2 || isStudio || isChirp;
          if (!result && voices.length < 5) { // Log detailed failure for first few voices
            // console.log(`❌ [Filter Fail] ${voice.name} | Q:${voice.quality} | S:${categories.standard}/${isStandard} W:${categories.wavenet}/${isWavenet} N:${categories.neural2}/${isNeural2}`);
          }
          return result;
        }
      });
      console.log('🔍 [Mobile Voice Filter] Voices after plan filter:', voices.length);
    }

    // Then apply local kategori/gender/aksan filtresi
    const result = filterVoices(voices, selectedVoiceCategory, selectedGender, selectedAccent);
    console.log('🔍 [Mobile Voice Filter] Selected Category:', selectedVoiceCategory);
    console.log('🔍 [Mobile Voice Filter] Final voices after all filters:', result.length);
    console.log('🔍 [Mobile Voice Filter] --------------------------------------------------');
    return result;
  };

  // --- Book Search Handlers ---
  const handleSearchBooks = async (nextPage?: number) => {
    const hasCriteria = bookQ.trim() || bookTitle.trim() || bookAuthor.trim();
    if (!hasCriteria) return;
    setIsSearchingBooks(true);
    try {
      const res = await bookService.searchBooks({ q: bookQ, title: bookTitle, author: bookAuthor, page: nextPage || 1, per_page: 10 });
      setBookResults(res.books || []);
      setBookPage(res.page || 1);
      setBookTotalPages(res.total_pages || 1);
      setSelectedBook(null);
      setBookChapters([]);
      setSelectedChapterId(null);
      setSelectedChapterText('');
    } catch (e: any) {
      showError(t('common.error'), e.message || t('Arama başarısız'));
    } finally {
      setIsSearchingBooks(false);
    }
  };

  const handleLoadChapters = async (book: any) => {
    setSelectedBook(book);
    setIsLoadingChapters(true);
    try {
      const list = await bookService.getBookChapters(book.id);
      setBookChapters(list || []);
      // Auto-select first chapter text if available
      if (Array.isArray(list) && list.length > 0) {
        const first = list[0];
        setSelectedChapterId(first.id);
        setSelectedChapterText(first.chapter_text || '');
      } else {
        setSelectedChapterId(null);
        setSelectedChapterText('');
      }
    } catch (e: any) {
      showError(t('common.error'), e.message || t('Bölümler alınamadı'));
    } finally {
      setIsLoadingChapters(false);
    }
  };

  // Load voices, then load default voice and apply matching filters so it appears selected
  useEffect(() => {
    (async () => {
      try {
        await fetchAvailableVoices();
        const settings = await ttsService.getUserSettings();
        const dv = settings?.default_voice;
        // Only apply default voice automatically if it looks like a Lingroot ID
        if (dv && typeof dv === 'string' && dv.startsWith('lr_')) {
          setSelectedVoice(dv);
          setShouldPromoteSelectedVoiceTop(true);
        }
      } catch (e) {

      }
    })();
  }, []);

  // Keep selected voice at top whenever available voices change
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
    // Kategori değiştiğinde veya filtreler değiştiğinde backend'den filtrele
    if (selectedVoiceCategory !== 'standard') {
      // Neural veya diğer kategoriler seçiliyse backend'den filtrele (accent/gender ile birlikte)
      fetchFilteredVoices(selectedAccent, selectedGender, selectedVoiceCategory);
    } else if (selectedAccent !== 'all' || selectedGender !== 'all') {
      // Sadece accent/gender filtresi varsa (standard kategoride) backend'den filtrele
      fetchFilteredVoices(selectedAccent, selectedGender);
    } else {
      // Hiç filtre yoksa tüm sesleri getir
      fetchAvailableVoices();
    }
  }, [selectedAccent, selectedGender, selectedVoiceCategory]);

  const handleCreateAudio = async () => {
    // Log analytics event
    AnalyticsHelper.logEvent('action_generate_audio_click_mobile', {
      content_type: mode,
      level: selectedLevel,
      voice: selectedVoice,
      speaking_rate: speechRate
    });
    if (isTtsJobLocked) {
      if (ttsJobMessage) {
        showError(t('common.info'), ttsJobMessage);
      }
      return;
    }
    try {
      // Usage limit pre-check
      const summary = await getUsageSummary();
      const sData: any = (summary as any)?.data || {};
      if (summary?.success && (sData?.isExceeded || sData?.hasPlan === false)) {
        showError(
          t('common.error'),
          sData?.hasPlan === false
            ? 'Aktif paketiniz yok. Lütfen Apple Store üzerinden paket satın alın.'
            : 'Paket kullanım sınırınız aşıldı. Lütfen paket yükseltin veya sonraki dönemi bekleyin.',
          {
            label: 'Paket Al',
            onPress: () => {
              setShowErrorAlert(false);
              navigation.navigate('Packages' as never);
            },
          }
        );
        return;
      }
    } catch (e: any) {
      // Silent check - hata olursa yine de devam edip async isteği deneriz
    }

    handleAsyncAudioCreation();
  };

  const handleAsyncAudioCreation = async () => {
    if (isTtsJobLocked) {
      if (ttsJobMessage) {
        showError(t('common.info'), ttsJobMessage);
      }
      return;
    }
    // Suggestion mode: if no input yet, rewrite the topic/suggestion into narration text first
    let effectiveInputText = inputText;
    if (mode === 'suggestion' && !effectiveInputText.trim()) {
      const base = (suggestionResults && suggestionResults.length > 0)
        ? suggestionResults[0]
        : suggestion;
      if (!base || !base.trim()) {
        showError(t('common.error'), t('suggestions.alerts.pleaseEnterTopic'));
        return;
      }
      try {
        setIsLoading(true);
        const rr = await ttsService.rewriteToNarration(base, selectedLevel);
        const narration = rr?.data?.narration_text || base;
        effectiveInputText = narration;
        setInputText(narration);
      } catch (e: any) {
        setIsLoading(false);
        showError(t('common.error'), e.message || t('common.unexpectedError'));
        return;
      } finally {
        setIsLoading(false);
      }
    }

    if (mode === 'book') {
      if (!selectedChapterText || selectedChapterText.trim().length === 0) {
        showError(t('common.error'), t('create.book.alerts.selectChapter'));
        return;
      }
    } else if (mode !== 'file' && !effectiveInputText.trim()) {
      showError(t('common.error'), t('create.alerts.enterTextOrFile'));
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'file' && selectedFile) {
        // File upload process - ASYNC
        const formData = new FormData();
        formData.append('file', {
          uri: selectedFile.uri,
          type: selectedFile.mimeType,
          name: selectedFile.name,
        } as any);

        formData.append('type', 'file');
        formData.append('input', selectedFile.name);
        formData.append('level', selectedLevel);
        formData.append('speakingRate', speechRate.toString());
        formData.append('voice', selectedVoice);
        formData.append('sesHizi', speechRate.toString());
        formData.append('voiceName', selectedVoice);
        formData.append('gender', selectedGender);
        formData.append('accent', selectedAccent);

        const response = await ttsService.processFileToSpeechAsync(formData);

        if (response.success) {
          setSelectedFile(null);
          setSuccessAlertEstimatedTime(response.estimatedTime || '2-5 minutes');
          setShowSuccessAlert(true);
          setIsCreatingVoice(true);
        } else {
          showError(t('common.error'), t('create.alerts.fileProcessFailed'));
        }
      } else {
        // Text/Book processing - ASYNC
        const textToProcess = mode === 'book' ? selectedChapterText : effectiveInputText;
        const topicIdForRequest =
          route.params && typeof (route.params as any).topicId === 'string'
            ? (route.params as any).topicId
            : undefined;
        const request: TTSRequest = {
          type: 'text',
          input: textToProcess,
          level: selectedLevel,
          speakingRate: speechRate,
          voice: selectedVoice,
          sesHizi: speechRate,
          voiceName: selectedVoice,
          gender: selectedGender as any,
          accent: selectedAccent as any,
          topic_id: topicIdForRequest,
          engine: mapCategoryForBackend(selectedVoiceCategory),
        };

        // Firebase Analytics: Content creation started
        AnalyticsHelper.logEvent('content_creation_start', {
          type: 'narration',
          content_type: mode,
          level: selectedLevel,
          voice: selectedVoice,
          text_length: textToProcess.length,
        });

        console.log('🎯 [CREATE] Calling processTextToSpeechAsync...');
        const response = await ttsService.processTextToSpeechAsync(request);

        if (response.success) {
          if (mode === 'text' || mode === 'suggestion' || mode === 'youtube') {
            setInputText('');
          } else if (mode === 'book') {
            setSelectedBook(null);
            setSelectedChapterId(null);
            setSelectedChapterText('');
          }

          setSuccessAlertEstimatedTime(response.estimatedTime || '2-5 minutes');
          setShowSuccessAlert(true);
          setIsCreatingVoice(true);

          // Firebase Analytics: Content creation completed (async job started successfully)
          AnalyticsHelper.logEvent('content_creation_complete', {
            type: 'narration',
            content_type: mode,
            level: selectedLevel,
            voice: selectedVoice,
            status: 'async_started',
          });
        } else {
          showError(t('common.error'), t('create.alerts.audioCreateFailed'));
        }
      }
    } catch (error: any) {
      console.error('🔴 [CREATE ASYNC] Error:', error);

      // Backend, devam eden iş varken yeni istek gelirse TTS_JOB_IN_PROGRESS döndürüyor
      if (error?.code === 'TTS_JOB_IN_PROGRESS') {
        const msg =
          language === 'tr'
            ? 'Ses oluşturma süreci devam ediyor. Lütfen mevcut işlemin bitmesini bekleyin.'
            : 'An audio creation process is already running. Please wait for it to finish before starting a new one.';
        setIsTtsJobLocked(true);
        setIsCreatingVoice(true);
        setTtsJobMessage(msg);
        showError(t('common.info'), msg);
        return;
      }

      const emsg = error?.message || '';
      if (
        emsg.includes('Aktif paketiniz yok') ||
        emsg.includes('kullanım sınırınız aşıldı') ||
        emsg.includes('USAGE_LIMIT_EXCEEDED') ||
        emsg.includes('NO_ACTIVE_PLAN')
      ) {
        showError(
          t('common.error'),
          emsg,
          {
            label: 'Paket Al',
            onPress: () => {
              setShowErrorAlert(false);
              navigation.navigate('Packages' as never);
            },
          }
        );
      } else {
        showError(t('common.error'), emsg || t('common.unexpectedError'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePodcast = async () => {
    // Podcast Log
    AnalyticsHelper.logEvent('action_create_podcast_click_mobile', {
      topic: podcastTopic,
      level: selectedLevel,
      duration: podcastDuration,
    });

    if (!podcastTopic || podcastTopic.trim().length === 0) {
      showError(
        t('common.error'),
        language === 'tr' ? 'Lütfen bir podcast konusu girin.' : 'Please enter a podcast topic.'
      );
      return;
    }

    if (isTtsJobLocked) {
      if (ttsJobMessage) {
        showError(t('common.info'), ttsJobMessage);
      }
      return;
    }

    setIsCreatingPodcast(true);
    setPodcastError(null);

    // Firebase Analytics: Podcast creation started
    AnalyticsHelper.logEvent('content_creation_start', {
      type: 'podcast',
      topic: podcastTopic.trim(),
      level: selectedLevel,
      duration: podcastDuration,
      tts_provider: podcastTtsProvider,
    });

    try {
      // Google podcast: run async in background and notify when ready
      if (podcastTtsProvider === 'google') {
        const response: any = await ttsService.createPodcastAsync({
          topic: podcastTopic.trim(),
          level: selectedLevel,
          duration: podcastDuration,
          ttsProvider: 'google',
          hostSpeakerId: podcastHostSpeakerId,
          guestSpeakerId: podcastGuestSpeakerId,
          styleType: podcastStyleType,
          personalityA: podcastPersonalityA,
          personalityB: podcastPersonalityB,
          includeHumor: podcastIncludeHumor,
          includeFiller: podcastIncludeFiller,
        });

        if (response?.success) {
          const estimated = response.estimatedTime || (language === 'tr' ? '2-5 dakika' : '2-5 minutes');
          setSuccessAlertEstimatedTime(estimated);
          setPodcastTopic('');
          setShowSuccessAlert(true);
          // setIsTtsJobLocked(true); // Don't lock immediately to allow modal interaction
          return;
        }

        throw new Error(
          response?.message || (language === 'tr' ? 'Podcast oluşturulamadı.' : 'Podcast could not be created.')
        );
      }

      const response: any = await ttsService.createPodcast({
        topic: podcastTopic.trim(),
        level: selectedLevel,
        duration: podcastDuration,
        ttsProvider: podcastTtsProvider,
        hostSpeakerId: podcastTtsProvider === 'google' ? podcastHostSpeakerId : undefined,
        guestSpeakerId: podcastTtsProvider === 'google' ? podcastGuestSpeakerId : undefined,
        styleType: podcastStyleType,
        personalityA: podcastPersonalityA,
        personalityB: podcastPersonalityB,
        includeHumor: podcastIncludeHumor,
        includeFiller: podcastIncludeFiller,
      });

      const success = response?.success !== false;
      const audioUrl =
        response?.podcast_url ||
        response?.audio_url ||
        response?.mp3_url ||
        response?.audioUrl;
      const vttUrl =
        response?.vtt_url ||
        response?.vtt_subtitles ||
        response?.subtitlesUrl ||
        response?.data?.subtitles?.vtt;

      if (!success || !audioUrl) {
        throw new Error(
          response?.message ||
          (language === 'tr' ? 'Podcast oluşturulamadı.' : 'Podcast could not be created.')
        );
      }

      // Podcast başarılı oluşturulduktan sonra, içeriği contenthistory tablosuna kaydet (web tarafındaki submitContent fallback'ine benzer)
      let timepoints: any = response?.timepoints;
      let words: any = response?.words;

      const topicForTrack = response?.topic || podcastTopic.trim();
      const transcriptForTrack =
        response?.transcript ||
        response?.message ||
        podcastTopic.trim();

      try {
        if (typeof timepoints === 'string') {
          timepoints = JSON.parse(timepoints);
        }
      } catch { }

      try {
        if (typeof words === 'string') {
          words = JSON.parse(words);
        }
      } catch { }

      const safeTimepoints = Array.isArray(timepoints) ? timepoints : [];
      const safeWords = Array.isArray(words) ? words : [];

      // Podcast içeriğini contenthistory'ye kaydederken varsa MFA timepoints/words'ü de gönder
      try {
        const topicForHistory = topicForTrack;
        const transcriptText = transcriptForTrack;

        await submitContent({
          input: topicForHistory,
          input_type: 'podcast',
          level: selectedLevel,
          mp3_url: audioUrl,
          translated_text: transcriptText,
          adapted_text: transcriptText,
          timepoints: safeTimepoints,
          words: safeWords
        });
        console.log('[Mobile][PODCAST] Podcast submitted to contenthistory via submitContent (with timings)');
      } catch (submitErr) {
        console.error('[Mobile][PODCAST] submitContent failed for podcast:', submitErr);
        // DB kaydı fallback'inin başarısız olması kullanıcıya podcast oynatmayı engellemesin
      }

      let durationSecondsRaw: any = null;
      if (typeof response?.duration_seconds === 'number') {
        durationSecondsRaw = response.duration_seconds;
      } else if (typeof response?.duration === 'number') {
        durationSecondsRaw = response.duration;
      } else if (typeof response?.duration_seconds === 'string') {
        durationSecondsRaw = parseFloat(response.duration_seconds);
      } else if (typeof response?.duration === 'string') {
        durationSecondsRaw = parseFloat(response.duration);
      } else if (typeof response?.data?.duration === 'number') {
        durationSecondsRaw = response.data.duration;
      } else if (typeof response?.data?.totalDuration === 'string') {
        durationSecondsRaw = parseFloat(response.data.totalDuration);
      }

      const durationSeconds =
        typeof durationSecondsRaw === 'number' && Number.isFinite(durationSecondsRaw) && durationSecondsRaw > 0
          ? durationSecondsRaw
          : 180;

      const trackId = String(response?.contenthistory_id || Date.now().toString());

      const newTrack: AudioTrack = {
        id: trackId,
        title: transcriptForTrack || topicForTrack,
        url: audioUrl,
        level: selectedLevel,
        duration: durationSeconds,
        created_at: new Date().toISOString(),
        input_type: 'podcast',
        translated_text: transcriptForTrack,
        adapted_text: transcriptForTrack,
        original_turkish: topicForTrack,
        mp3_url: audioUrl,
        timepoints: safeTimepoints,
        words: safeWords,
      };

      setCreatedTrack(newTrack);
      setShowPlayer(true);

      // Firebase Analytics: Podcast creation completed
      AnalyticsHelper.logEvent('content_creation_complete', {
        type: 'podcast',
        topic: podcastTopic.trim(),
        level: selectedLevel,
        duration: podcastDuration,
        tts_provider: podcastTtsProvider,
        status: 'completed',
      });
    } catch (e: any) {
      const msg =
        e?.message ||
        (language === 'tr' ? 'Podcast oluşturulamadı.' : 'Podcast could not be created.');
      setPodcastError(msg);
      showError(t('common.error'), msg);
    } finally {
      setIsCreatingPodcast(false);
    }
  };

  const handleFileUpload = async () => {
    try {

      // Use iOS UTIs to avoid greyed-out files; use MIME types on Android
      const pickerTypes = Platform.OS === 'ios'
        ? [
          'com.adobe.pdf', // PDF
          'com.microsoft.word.doc', // DOC
          'org.openxmlformats.wordprocessingml.document', // DOCX
          'public.plain-text', // TXT
        ]
        : [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
        ];

      const [file] = await pick({
        type: pickerTypes,
        presentationStyle: 'fullScreen',
      });
      if (!file) {
        // user cancelled
        return;
      }

      // Make a local copy for reliable access during upload
      const [localCopy] = await keepLocalCopy({
        files: [
          {
            uri: file.uri,
            fileName: file.name || 'document',
          },
        ],
        destination: 'cachesDirectory',
      });

      const uri = (localCopy && (localCopy as any).status === 'success' && (localCopy as any).localUri) ? (localCopy as any).localUri : (file.uri as string);
      const name = file.name || (uri ? uri.split('/').pop() : 'document') || 'document';
      const mimeType = (file as any).type || 'application/octet-stream';
      const size = (file as any).size;

      setSelectedFile({ uri, name, mimeType, size });
      setMode('file');
      showError(t('common.success'), language === 'tr' ? 'Dosya seçildi' : 'File selected');
    } catch (err: any) {
      showError(
        t('common.error'),
        err?.message || (language === 'tr' ? 'Dosya seçimi başarısız' : 'File selection failed')
      );
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    showError(t('common.info'), t('create.alerts.fileCleared'));
  };

  const isPodcastMode = mode === 'podcast';
  const isGlobalCreateDisabled = isPodcastMode
    ? isCreatingPodcast || !podcastTopic.trim()
    : isLoading || isCreatingVoice || isTtsJobLocked;

  const isGlobalCreateBusy = isPodcastMode
    ? isCreatingPodcast
    : isLoading || isCreatingVoice;

  const globalCreateLabel = isPodcastMode
    ? (isCreatingPodcast
      ? (language === 'tr'
        ? 'Podcast oluşturuluyor...'
        : 'Creating podcast...')
      : (language === 'tr'
        ? 'Podcast Oluştur'
        : 'Create Podcast'))
    : (isLoading
      ? (selectedFile ? t('create.buttons.processingFile') : t('create.buttons.processing'))
      : isCreatingVoice
        ? (language === 'tr' ? 'Ses oluşturuluyor...' : 'Creating Voice...')
        : t('create.buttons.createAudio'));

  return (
    <SafeAreaView style={styles.container}>
      {/* Loading overlay for suggestion conversion */}
      {isConvertingSuggestion && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>{convertingText}</Text>
          </View>
        </View>
      )}

      {isTtsJobLocked && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>
              {ttsJobMessage ||
                (language === 'tr'
                  ? 'Ses oluşturma süreci devam ediyor. Lütfen bitmesini bekleyin.'
                  : 'An audio creation process is still running. Please wait for it to finish.')}
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.header}>
          <Text style={styles.subtitle}>
            {t('create.subtitle')}
          </Text>
        </View>

        {mode === 'podcast' && (
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>
              {language === 'tr' ? 'Podcast Oluştur' : 'Create Podcast'}
            </Text>
            <Text style={{ fontSize: 14, color: '#666', marginBottom: 12 }}>
              {language === 'tr'
                ? 'Podcast için bir konu girin ve seviye ile süreyi seçin.'
                : 'Enter a topic for the podcast and choose the level and duration.'}
            </Text>

            {/* TTS Provider Selection Removed - Defaulting to Google TTS */}

            {podcastTtsProvider === 'google' && (
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.filterLabel}>Host voice</Text>
                <TouchableOpacity
                  style={styles.voiceSelectionButton}
                  onPress={() => setShowPodcastHostVoiceModal(true)}
                >
                  <Icon name="record-voice-over" size={22} color={COLORS.primary} />
                  <View style={styles.voiceSelectionInfo}>
                    <Text style={styles.voiceSelectionText}>{getGeminiSpeakerLabel(podcastHostSpeakerId)}</Text>
                  </View>
                  <Icon name="arrow-forward-ios" size={16} color={COLORS.primary} />
                </TouchableOpacity>

                <Text style={[styles.filterLabel, { marginTop: 12 }]}>Guest voice</Text>
                <TouchableOpacity
                  style={styles.voiceSelectionButton}
                  onPress={() => setShowPodcastGuestVoiceModal(true)}
                >
                  <Icon name="record-voice-over" size={22} color={COLORS.primary} />
                  <View style={styles.voiceSelectionInfo}>
                    <Text style={styles.voiceSelectionText}>{getGeminiSpeakerLabel(podcastGuestSpeakerId)}</Text>
                  </View>
                  <Icon name="arrow-forward-ios" size={16} color={COLORS.primary} />
                </TouchableOpacity>

                <Modal
                  visible={showPodcastHostVoiceModal}
                  transparent
                  animationType="fade"
                  onRequestClose={() => setShowPodcastHostVoiceModal(false)}
                >
                  <View style={styles.voiceModalBackdrop}>
                    <View style={[styles.voiceModalContent, { maxHeight: '75%', width: '92%' }]}>
                      <View style={styles.voiceModalHeader}>
                        <View>
                          <Text style={styles.voiceModalTitle}>Host voice</Text>
                        </View>
                        <TouchableOpacity onPress={() => setShowPodcastHostVoiceModal(false)}>
                          <Icon name="close" size={24} color="#666" />
                        </TouchableOpacity>
                      </View>
                      <ScrollView style={styles.voiceList} keyboardShouldPersistTaps="handled">
                        {GEMINI_PODCAST_SPEAKERS.filter(s => s.label.includes('(F)')).map((opt) => (
                          <TouchableOpacity
                            key={`host_${opt.value}`}
                            style={[styles.voiceItem, podcastHostSpeakerId === opt.value && styles.voiceItemActive]}
                            onPress={() => {
                              setPodcastHostSpeakerId(opt.value);
                              setShowPodcastHostVoiceModal(false);
                            }}
                          >
                            <View style={styles.voiceItemInfo}>
                              <Text style={styles.voiceItemName}>{opt.label}</Text>
                            </View>
                            {podcastHostSpeakerId === opt.value && (
                              <Icon name="check" size={20} color={COLORS.primary} />
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                </Modal>

                <Modal
                  visible={showPodcastGuestVoiceModal}
                  transparent
                  animationType="fade"
                  onRequestClose={() => setShowPodcastGuestVoiceModal(false)}
                >
                  <View style={styles.voiceModalBackdrop}>
                    <View style={[styles.voiceModalContent, { maxHeight: '75%', width: '92%' }]}>
                      <View style={styles.voiceModalHeader}>
                        <View>
                          <Text style={styles.voiceModalTitle}>Guest voice</Text>
                        </View>
                        <TouchableOpacity onPress={() => setShowPodcastGuestVoiceModal(false)}>
                          <Icon name="close" size={24} color="#666" />
                        </TouchableOpacity>
                      </View>
                      <ScrollView style={styles.voiceList} keyboardShouldPersistTaps="handled">
                        {GEMINI_PODCAST_SPEAKERS.filter(s => s.label.includes('(M)')).map((opt) => (
                          <TouchableOpacity
                            key={`guest_${opt.value}`}
                            style={[styles.voiceItem, podcastGuestSpeakerId === opt.value && styles.voiceItemActive]}
                            onPress={() => {
                              setPodcastGuestSpeakerId(opt.value);
                              setShowPodcastGuestVoiceModal(false);
                            }}
                          >
                            <View style={styles.voiceItemInfo}>
                              <Text style={styles.voiceItemName}>{opt.label}</Text>
                            </View>
                            {podcastGuestSpeakerId === opt.value && (
                              <Icon name="check" size={20} color={COLORS.primary} />
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                </Modal>
              </View>
            )}


            <TextInput
              style={[styles.textInput, { minHeight: 100, borderColor: COLORS.slate300 }]}
              placeholder={
                language === 'tr'
                  ? 'Podcast için bir konu girin (Örn: İnternetin tarihi)...'
                  : 'Enter a topic for the podcast (e.g. The history of the Internet)...'
              }
              value={podcastTopic}
              onChangeText={setPodcastTopic}
              multiline
              textAlignVertical="top"
            />
            <View style={{ marginTop: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8 }}>
                {language === 'tr' ? 'İçerik Süresi' : 'Content Duration'}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 6,
                }}
              >
                {DURATION_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={{
                      flex: 1,
                      marginHorizontal: 3,
                      paddingVertical: 10,
                      borderRadius: 8,
                      borderWidth: 2,
                      borderColor: podcastDuration === opt.value ? COLORS.primary : '#ddd',
                      backgroundColor: podcastDuration === opt.value ? '#E3F2FD' : '#fff',
                      alignItems: 'center',
                    }}
                    onPress={() => setPodcastDuration(opt.value)}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: podcastDuration === opt.value ? COLORS.primary : '#333',
                      }}
                    >
                      {opt.label}
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        color: podcastDuration === opt.value ? COLORS.primary : '#888',
                        marginTop: 2,
                        textAlign: 'center',
                      }}
                    >
                      {opt.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                {language === 'tr'
                  ? `Oluşturulacak içeriğin yaklaşık süresi (±%15 tolerans)`
                  : `Approximate duration of the content (±15% tolerance)`}
              </Text>
            </View>

            {podcastError && (
              <Text style={{ color: '#d32f2f', marginTop: 8 }}>{podcastError}</Text>
            )}
          </View>
        )}

        {mode === 'suggestion' && (
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>{t('suggestions.title')}</Text>
            <TextInput
              style={[styles.textInput]}
              placeholder={t('suggestions.input.placeholder')}
              value={suggestion}
              onChangeText={setSuggestion}
            />
            <TouchableOpacity
              style={[styles.searchButton, isLoadingSuggestions && styles.createButtonDisabled]}
              onPress={handleGetSuggestions}
              disabled={isLoadingSuggestions}
            >
              {isLoadingSuggestions ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Icon name="lightbulb" size={20} color="#fff" />
                  <Text style={styles.createButtonText}>{t('suggestions.buttons.getSuggestions')}</Text>
                </>
              )}
            </TouchableOpacity>
            {suggestionResults.length > 0 && (
              <View style={{ marginTop: 8 }}>
                {suggestionResults.map((s, idx) => (
                  <TouchableOpacity
                    key={`${idx}-${s.substring(0, 10)}`}
                    style={styles.bookCard}
                    onPress={async () => {
                      try {
                        setIsConvertingSuggestion(true);
                        setConvertingText(language === 'tr' ? 'Öneri metne dönüştürülüyor...' : 'Converting suggestion to text...');

                        const rr = await ttsService.rewriteToNarration(s, selectedLevel);
                        const narration = rr?.data?.narration_text || s;
                        setInputText(narration);

                        showError(t('common.success'), t('Öneri metne dönüştürüldü'));
                      } catch (e: any) {
                        showError(t('common.error'), e.message || t('common.unexpectedError'));
                      } finally {
                        setIsConvertingSuggestion(false);
                        setConvertingText('');
                      }
                    }}
                  >
                    <View style={{ marginRight: 10 }}><Icon name="description" size={20} color="#FF9500" /></View>
                    <Text style={{ flex: 1, color: '#333' }}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {((mode === 'text' || mode === 'youtube') || (mode === 'suggestion' && (suggestionResults.length > 0 || inputText.length > 0))) && (
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>{t('create.input.title')}</Text>
            {mode === 'youtube' && (
              <View style={{ marginBottom: 10 }}>
                <View style={styles.bookSearchRow}>
                  <Icon name="ondemand-video" size={20} color="#666" />
                  <TextInput
                    style={[styles.textField]}
                    placeholder={'YouTube video URL'}
                    value={youtubeUrl}
                    onChangeText={setYoutubeUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <TouchableOpacity
                  style={[styles.searchButton, youtubeLoading && styles.createButtonDisabled]}
                  onPress={fetchYoutubeSubtitle}
                  disabled={youtubeLoading}
                >
                  {youtubeLoading ? <ActivityIndicator color="white" size="small" /> : (
                    <>
                      <Icon name="closed-caption" size={20} color="#fff" />
                      <Text style={styles.createButtonText}>
                        {language === 'tr' ? 'Altyazı Çek' : 'Fetch Subtitles'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                {youtubeError ? (
                  <Text style={{ color: '#d32f2f', marginTop: 6 }}>{youtubeError}</Text>
                ) : null}
              </View>
            )}
            <TextInput
              style={[
                styles.textInput,
                selectedFile && styles.textInputDisabled,
                !isTextExpanded && { maxHeight: Math.floor(screenHeight * 0.25) },
              ]}
              placeholder={selectedFile ? t('create.input.placeholderDisabled') : t('create.input.placeholder')}
              value={inputText}
              onChangeText={setInputText}
              multiline
              textAlignVertical="top"
              editable={!selectedFile}
              scrollEnabled
            />
            {!selectedFile && (
              <>
                <TouchableOpacity
                  onPress={() => setIsTextExpanded(v => !v)}
                  activeOpacity={0.8}
                  style={[styles.textExpander, isTextExpanded && styles.textExpanderExpanded, { alignSelf: 'stretch' }]}
                >
                  <Text style={styles.textExpanderLabel}>
                    {isTextExpanded ? (t('create.input.collapse') || 'Daralt') : (t('create.input.expand') || 'Genişlet')}
                  </Text>
                  <Icon name={isTextExpanded ? 'expand-less' : 'expand-more'} size={18} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.charCount}>{t('create.input.charCount', { count: inputText.length })}</Text>
              </>
            )}
          </View>
        )}

        {/* Divider hidden in single-mode screens */}

        {mode === 'book' && (
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>{t('create.book.title')}</Text>
            <View style={styles.bookSearchRow}>
              <Icon name="search" size={20} color="#666" />
              <TextInput
                style={[styles.textField]}
                placeholder={t('create.book.inputs.qPlaceholder')}
                value={bookQ}
                onChangeText={setBookQ}
                returnKeyType="search"
                onSubmitEditing={() => handleSearchBooks(1)}
              />
            </View>
            <View style={styles.bookSearchRow}>
              <Icon name="title" size={20} color="#666" />
              <TextInput
                style={[styles.textField]}
                placeholder={t('create.book.inputs.titlePlaceholder')}
                value={bookTitle}
                onChangeText={setBookTitle}
                returnKeyType="search"
                onSubmitEditing={() => handleSearchBooks(1)}
              />
            </View>
            <View style={styles.bookSearchRow}>
              <Icon name="person" size={20} color="#666" />
              <TextInput
                style={[styles.textField]}
                placeholder={t('create.book.inputs.authorPlaceholder')}
                value={bookAuthor}
                onChangeText={setBookAuthor}
                returnKeyType="search"
                onSubmitEditing={() => handleSearchBooks(1)}
              />
            </View>
            <TouchableOpacity
              style={[styles.searchButton, !(bookQ.trim() || bookTitle.trim() || bookAuthor.trim()) && styles.createButtonDisabled]}
              onPress={() => handleSearchBooks(1)}
              disabled={isSearchingBooks || !(bookQ.trim() || bookTitle.trim() || bookAuthor.trim())}
            >
              {isSearchingBooks ? <ActivityIndicator color="white" size="small" /> : (
                <>
                  <Icon name="search" size={20} color="#fff" />
                  <Text style={styles.createButtonText}>{t('create.book.buttons.search')}</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Results */}
            {!selectedBook ? (
              <View style={{ marginTop: 12 }}>
                {bookResults.map((b) => (
                  <TouchableOpacity key={b.id} style={styles.bookCard} onPress={() => handleLoadChapters(b)}>
                    <View style={{ marginRight: 10 }}><Icon name="menu-book" size={24} color="#3f51b5" /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bookTitle}>{b.title}</Text>
                      <Text style={styles.bookAuthor}>{b.authors}</Text>
                    </View>
                    <Icon name="chevron-right" size={18} color="#999" />
                  </TouchableOpacity>
                ))}
                {bookResults.length === 0 && !isSearchingBooks && (
                  <Text style={{ color: '#888', textAlign: 'center', marginTop: 8 }}>{t('create.book.emptyResults')}</Text>
                )}
              </View>
            ) : (
              <View style={{ marginTop: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <TouchableOpacity onPress={() => { setSelectedBook(null); setBookChapters([]); setSelectedChapterId(null); setSelectedChapterText(''); }}>
                    <Icon name="arrow-back" size={22} color={COLORS.primary} />
                  </TouchableOpacity>
                  <Text style={[styles.bookTitle, { marginLeft: 8 }]} numberOfLines={1}>{selectedBook.title}</Text>
                </View>
                {isLoadingChapters ? (
                  <ActivityIndicator color={COLORS.primary} />
                ) : (
                  <View>
                    {bookChapters.map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        style={[styles.chapterItem, selectedChapterId === c.id && styles.chapterItemActive]}
                        onPress={() => { setSelectedChapterId(c.id); setSelectedChapterText(c.chapter_text || ''); }}
                      >
                        <View style={styles.chapterIndex}><Text style={styles.chapterIndexText}>{c.chapter_index}</Text></View>
                        <Text style={styles.chapterTitle} numberOfLines={2}>{c.chapter_title}</Text>
                        {selectedChapterId === c.id && <Icon name="check" size={18} color={COLORS.primary} />}
                      </TouchableOpacity>
                    ))}
                    {bookChapters.length === 0 && (
                      <Text style={{ color: '#888', textAlign: 'center', marginTop: 8 }}>{t('create.book.noChapters')}</Text>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {mode === 'file' && (
          selectedFile ? (
            <View style={styles.selectedFileContainer}>
              <View style={styles.selectedFileInfo}>
                <Icon name="insert-drive-file" size={24} color={COLORS.primary} />
                <View style={styles.fileDetails}>
                  <Text style={styles.fileName}>{selectedFile.name}</Text>
                  <Text style={styles.fileSize}>
                    {selectedFile.size ? `${Math.round(selectedFile.size / 1024)} KB` : 'Boyut bilinmiyor'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.clearFileButton} onPress={clearSelectedFile}>
                <Icon name="clear" size={20} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.fileButton} onPress={handleFileUpload}>
              <Icon name="upload-file" size={24} color={COLORS.primary} />
              <Text style={styles.fileButtonText}>{t('create.file.uploadButton')}</Text>
            </TouchableOpacity>
          )
        )}

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>{t('create.cefr.title')}</Text>
          <View style={styles.levelSelector}>
            {levels.map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.levelButton,
                  selectedLevel === level && styles.levelButtonActive,
                ]}
                onPress={() => {
                  setSelectedLevel(level);
                  AnalyticsHelper.logEvent('interaction_setting_level_mobile', { level });
                }}
              >
                <Text
                  style={[
                    styles.levelButtonText,
                    selectedLevel === level && styles.levelButtonTextActive,
                  ]}
                >
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.levelDescription}>{levelDescriptions[selectedLevel]}</Text>
        </View>

        {false && (
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>{t('create.speed.title')}</Text>
            <View style={styles.speedContainer}>
              <TouchableOpacity
                style={styles.speedButton}
                onPress={() => setSpeechRate(Math.max(0.5, speechRate - 0.1))}
              >
                <Icon name="remove" size={24} color={COLORS.primary} />
              </TouchableOpacity>
              <Text style={styles.speedText}>{speechRate.toFixed(1)}x</Text>
              <TouchableOpacity
                style={styles.speedButton}
                onPress={() => setSpeechRate(Math.min(2.0, speechRate + 0.1))}
              >
                <Icon name="add" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.speedLabels}>
              <Text style={styles.speedLabel}>{t('create.speed.slow')}</Text>
              <Text style={styles.speedLabel}>{t('create.speed.normal')}</Text>
              <Text style={styles.speedLabel}>{t('create.speed.fast')}</Text>
            </View>
          </View>
        )}

        {/* Voice Selection Section */}
        {!isPodcastMode && (
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
                      // Reset voice selection when category changes
                      const filteredVoices = filterVoices(
                        availableVoices,
                        newCategory,
                        selectedGender,
                        selectedAccent
                      );
                      if (filteredVoices.length > 0) {
                        const preferred = filteredVoices.find(v => (selectedGender === 'all') || v.gender === selectedGender);
                        setSelectedVoice(preferred?.name || filteredVoices[0].name);
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
                      onPress={() => {
                        setSelectedAccent(accent.value);
                        AnalyticsHelper.logEvent('interaction_setting_accent_mobile', { accent: accent.value });
                      }}
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
                      onPress={() => {
                        setSelectedGender(gender.value);
                        AnalyticsHelper.logEvent('interaction_setting_gender_mobile', { gender: gender.value });
                      }}
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
                // Modal açılmadan önce web'deki gibi mevcut filtrelerle backend'den tazele
                try {
                  if (hasActiveFilters) {
                    await fetchFilteredVoices(selectedAccent, selectedGender, selectedVoiceCategory);
                  } else {
                    await fetchAvailableVoices();
                  }
                } catch (e) {

                }
                setShowVoiceSelection(true);
              }}
            >
              <Icon name="record-voice-over" size={24} color={COLORS.primary} />
              <View style={styles.voiceSelectionInfo}>
                <Text style={styles.voiceSelectionText}>
                  {selectedVoice ? `${getVoiceDisplayName(selectedVoice, language)} (${selectedVoice})` : t('create.voice.selectPrompt')}
                </Text>
                <Text style={styles.voiceSelectionSubtext}>
                  {getFilteredVoicesByCategory().find(v => v.name === selectedVoice)?.description || t('create.voice.selectHint')}
                </Text>
              </View>
              <Icon name="arrow-forward-ios" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Voice Selection Modal - uses RN Modal so it opens in viewport regardless of scroll */}
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
                    {getFilteredVoicesByCategory().map((item) => (
                      <TouchableOpacity
                        key={item.name}
                        style={[
                          styles.voiceItem,
                          selectedVoice === item.name && styles.voiceItemActive,
                        ]}
                        onPress={() => {
                          setSelectedVoice(item.name);
                        }}
                      >
                        <View style={styles.voiceItemInfo}>
                          <Text style={styles.voiceItemName}>
                            {`${getVoiceDisplayName(item.name, language, item.name)} (${item.name})`}
                          </Text>
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
                      onPress={async () => {
                        try {
                          await ttsService.saveDefaultVoiceSetting(selectedVoice);
                          setShouldPromoteSelectedVoiceTop(true);
                          showError(
                            t('common.success'),
                            language === 'tr' ? 'Varsayılan ses kaydedildi' : 'Default voice saved'
                          );
                          setShowVoiceSelection(false);
                        } catch (e: any) {
                          showError(
                            t('common.error'),
                            e.message || (language === 'tr' ? 'Kaydedilemedi' : 'Could not save')
                          );
                        }
                      }}
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

        {/* Create Button - Now inside ScrollView */}
        <TouchableOpacity
          style={[
            styles.createButton,
            isGlobalCreateDisabled && styles.createButtonDisabled,
          ]}
          onPress={isPodcastMode ? handleCreatePodcast : handleCreateAudio}
          disabled={isGlobalCreateDisabled}
        >
          {isGlobalCreateBusy ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Icon name={isPodcastMode ? 'graphic-eq' : 'volume-up'} size={24} color="white" />
          )}
          <Text style={styles.createButtonText}>{globalCreateLabel}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Audio Player Modal */}
      {createdTrack && (
        <AudioPlayer
          track={createdTrack}
          visible={showPlayer}
          onClose={() => {
            setShowPlayer(false);
            setCreatedTrack(null);
            // Navigate to Library after closing player
            navigation.navigate('Library' as never);
          }}
          timepoints={createdTrack.timepoints || []}
          words={createdTrack.words || []}
        />
      )}

      {/* Success Alert Modal */}
      <Modal
        visible={showSuccessAlert}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessAlert(false)}
      >
        <TouchableOpacity
          style={styles.successModalOverlay}
          activeOpacity={1}
          onPress={() => setShowSuccessAlert(false)}
        >
          <View style={styles.successModalContainer}>
            {/* Success Icon */}
            <View style={styles.successIconContainer}>
              <LinearGradient
                colors={[COLORS.brandTeal, '#0D9488']}
                style={styles.successIconGradient}
              >
                <Icon name="check" size={40} color="#FFFFFF" />
              </LinearGradient>
            </View>

            {/* Title */}
            <Text style={styles.successModalTitle}>
              {language === 'tr' ? 'İşlem Başlatıldı!' : 'Processing Started!'}
            </Text>

            {/* Message */}
            <Text style={styles.successModalMessage}>
              {language === 'tr'
                ? `Sesiniz arka planda oluşturuluyor.\n${successAlertEstimatedTime} içinde bildirim alacaksınız.`
                : `Your audio is being created in the background.\nYou'll receive a notification in ${successAlertEstimatedTime}.`}
            </Text>

            {/* Progress indicator */}
            <View style={styles.successProgressRow}>
              <Icon name="notifications-active" size={16} color={COLORS.brandTeal} />
              <Text style={styles.successProgressText}>
                {language === 'tr' ? 'Bildirim gönderilecek' : 'Notification will be sent'}
              </Text>
            </View>

            {/* OK Button */}
            <TouchableOpacity
              style={styles.successModalButton}
              onPress={() => setShowSuccessAlert(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.successModalButtonText}>
                {language === 'tr' ? 'Tamam' : 'OK'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      {/* Error Alert Modal */}
      <Modal
        visible={showErrorAlert}
        transparent
        animationType="fade"
        onRequestClose={() => setShowErrorAlert(false)}
      >
        <TouchableOpacity
          style={styles.successModalOverlay}
          activeOpacity={1}
          onPress={() => setShowErrorAlert(false)}
        >
          <View style={styles.successModalContainer}>
            {/* Error Icon */}
            <View style={styles.successIconContainer}>
              <LinearGradient
                colors={[COLORS.danger, '#B91C1C']}
                style={styles.successIconGradient}
              >
                <Icon name="error-outline" size={40} color="#FFFFFF" />
              </LinearGradient>
            </View>

            {/* Title */}
            <Text style={styles.successModalTitle}>
              {errorAlertTitle}
            </Text>

            {/* Message */}
            <Text style={styles.successModalMessage}>
              {errorAlertMessage}
            </Text>

            {/* Action Button (e.g. "Paket Al") */}
            {errorAlertAction && (
              <TouchableOpacity
                style={styles.errorActionButton}
                onPress={errorAlertAction.onPress}
                activeOpacity={0.8}
              >
                <Text style={styles.errorActionButtonText}>
                  {errorAlertAction.label}
                </Text>
              </TouchableOpacity>
            )}

            {/* OK / Close Button */}
            <TouchableOpacity
              style={[
                styles.successModalButton,
                errorAlertAction ? styles.errorDismissButton : styles.errorPrimaryButton,
              ]}
              onPress={() => setShowErrorAlert(false)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.successModalButtonText,
                errorAlertAction && styles.errorDismissButtonText,
              ]}>
                {language === 'tr' ? 'Tamam' : 'OK'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: COLORS.brandIndigo,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: COLORS.slate700,
    textAlign: 'center',
    fontWeight: '600',
  },
  // Book search styles
  bookSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.slate200,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: COLORS.surface,
    gap: 12,
  },
  textField: {
    flex: 1,
    fontSize: 15,
    color: COLORS.slate700,
    paddingVertical: 0,
    fontWeight: '500',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.brandTeal,
    padding: 14,
    borderRadius: 16,
    gap: 8,
  },
  bookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 20,
    borderLeftWidth: 6,
    borderLeftColor: COLORS.brandIndigo,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
  },
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 20,
    borderLeftWidth: 6,
    borderLeftColor: COLORS.brandTeal,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
    gap: 12,
  },
  chapterItemActive: {
    borderWidth: 2,
    borderColor: COLORS.brandTeal,
    backgroundColor: 'rgba(39, 190, 170, 0.05)',
  },
  chapterIndex: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.brandTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterIndexText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  chapterTitle: {
    flex: 1,
    fontSize: 14,
    color: COLORS.slate700,
    fontWeight: '600',
  },
  bookTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.slate800,
  },
  bookAuthor: {
    fontSize: 12,
    color: COLORS.slate500,
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingBottom: 160,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingTop: 60,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.slate800,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.slate500,
    fontWeight: '500',
  },
  inputSection: {
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
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.slate300,
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: COLORS.slate700,
    minHeight: 120,
    textAlignVertical: 'top',
    backgroundColor: COLORS.slate50,
    fontWeight: '500',
  },
  charCount: {
    fontSize: 10,
    color: COLORS.slate300,
    textAlign: 'right',
    marginTop: 8,
    fontWeight: '700',
  },
  textExpander: {
    marginTop: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: COLORS.slate50,
    borderWidth: 1,
    borderColor: COLORS.slate100,
  },
  textExpanderExpanded: {
    backgroundColor: 'rgba(39, 190, 170, 0.05)',
    borderColor: COLORS.brandTeal,
  },
  textExpanderLabel: {
    color: COLORS.slate400,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.slate100,
  },
  dividerText: {
    marginHorizontal: 16,
    color: COLORS.slate300,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 24,
    padding: 24,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.slate200,
    borderStyle: 'dashed',
  },
  fileButtonText: {
    marginLeft: 12,
    fontSize: 14,
    color: COLORS.slate500,
    fontWeight: '700',
  },
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
  levelSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
    justifyContent: 'center',
  },
  levelButton: {
    width: '30%',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.slate100,
  },
  levelButtonActive: {
    backgroundColor: COLORS.brandTeal,
    borderColor: COLORS.brandTeal,
    shadowColor: COLORS.brandTeal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  levelButtonText: {
    fontSize: 12,
    color: COLORS.slate300,
    fontWeight: '700',
  },
  levelButtonTextActive: {
    color: '#FFFFFF',
  },
  levelDescription: {
    fontSize: 12,
    color: COLORS.slate500,
    marginTop: 8,
    fontWeight: '500',
  },
  speedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  speedButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.slate50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.slate100,
  },
  speedText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.slate700,
    marginHorizontal: 24,
    minWidth: 50,
    textAlign: 'center',
  },
  speedLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  speedLabel: {
    fontSize: 11,
    color: COLORS.slate400,
    fontWeight: '500',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.brandOrange,
    marginHorizontal: 24,
    marginTop: 20,
    marginBottom: 120,
    padding: 18,
    borderRadius: 24,
    shadowColor: COLORS.brandOrange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  createButtonDisabled: {
    backgroundColor: COLORS.slate200,
    shadowOpacity: 0,
    elevation: 0,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginLeft: 10,
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
  textInputDisabled: {
    backgroundColor: COLORS.slate50,
    color: COLORS.slate300,
  },
  selectedFileContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 6,
    borderLeftColor: COLORS.brandTeal,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  selectedFileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileDetails: {
    marginLeft: 12,
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.slate800,
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    color: COLORS.slate500,
  },
  clearFileButton: {
    padding: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 16,
  },

  // Voice Selection Styles
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
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  voiceModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  // New: Backdrop for RN Modal to center content on screen
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
  // Success Modal Styles
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  successModalContainer: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
    elevation: 24,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.brandTeal,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  successModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.slate800,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  successModalMessage: {
    fontSize: 15,
    color: COLORS.slate500,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
    fontWeight: '500',
  },
  successProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brandTeal + '10',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 24,
    gap: 8,
  },
  successProgressText: {
    fontSize: 13,
    color: COLORS.brandTeal,
    fontWeight: '600',
  },
  successModalButton: {
    width: '100%',
    backgroundColor: COLORS.brandTeal,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: COLORS.brandTeal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  successModalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Error Modal Styles
  errorActionButton: {
    width: '100%',
    backgroundColor: COLORS.danger,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: COLORS.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  errorActionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  errorPrimaryButton: {
    backgroundColor: COLORS.danger,
    shadowColor: COLORS.danger,
  },
  errorDismissButton: {
    backgroundColor: COLORS.slate200,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  errorDismissButtonText: {
    color: COLORS.slate600,
  },
});

export default CreateScreen; 