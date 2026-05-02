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
  useWindowDimensions,
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
import { useAuth } from '../contexts/AuthContext';
import { useTtsJob } from '../contexts/TtsJobContext';
import * as ttsService from '../services/ttsService';
import * as bookService from '../services/bookService';
import { submitContent } from '../services/contentService';
import { getMyPlanFeatures, PlanFeatures, getUsageSummary } from '../services/subscriptionService';
import { getVoiceDisplayName } from '../utils/voiceDisplayNames';
import { getEnvironmentConfig } from '../services/environmentConfig';
import { CopilotStep, walkthroughable } from 'react-native-copilot';
import { COLORS } from '../theme/colors';
import { AnalyticsHelper } from '../utils/AnalyticsHelper';
import {
  TourProvider,
  CreateTooltip,
  CREATE_TOUR_STEPS,
  CREATE_TOUR_KEY,
  useTourAutoStart,
} from '../components/GuideTour';
import { VoiceSelectionPanel } from '../components/create/VoiceSelectionPanel';
import { BookSearchView } from '../components/create/BookSearchView';
import { PodcastConfigPanel, PodcastConfig, PodcastConfigPanelRef } from '../components/create/PodcastConfigPanel';

const WalkthroughableView = walkthroughable(View);

const CreateScreenContent: React.FC = () => {
  const { height: screenHeight } = useWindowDimensions();
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
  const { user } = useAuth();
  const { isTtsJobLocked, ttsJobMessage, lockTtsJob, unlockTtsJob, checkActiveJob } = useTtsJob();
  const lang = language === 'tr' ? 'tr' : 'en';
  const scrollViewRef = useRef<ScrollView>(null);
  const podcastConfigRef = useRef<PodcastConfigPanelRef>(null);
  const createTourKey = mode === 'podcast'
    ? `${CREATE_TOUR_KEY}_podcast`
    : mode === 'file'
      ? `${CREATE_TOUR_KEY}_file`
      : mode === 'book'
        ? `${CREATE_TOUR_KEY}_book`
        : CREATE_TOUR_KEY;
  useTourAutoStart(createTourKey, 800, scrollViewRef);
  const [isTextExpanded, setIsTextExpanded] = useState(false);
  const [inputText, setInputText] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel>('B1');
  const [speechRate, setSpeechRate] = useState(1.0);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingVoice, setIsCreatingVoice] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [planFeatures, setPlanFeatures] = useState<PlanFeatures | null>(null);

  // Success alert modal state
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [successAlertEstimatedTime, setSuccessAlertEstimatedTime] = useState('');

  // Error alert modal state
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorAlertTitle, setErrorAlertTitle] = useState('');
  const [errorAlertMessage, setErrorAlertMessage] = useState('');
  const [errorAlertAction, setErrorAlertAction] = useState<{ label: string; onPress: () => void } | null>(null);
  const [errorAlertType, setErrorAlertType] = useState<'error' | 'success' | 'info'>('error');
  const [debugJobId, setDebugJobId] = useState<string | null>(null);
  const [debugJobSnapshot, setDebugJobSnapshot] = useState<any>(null);
  const [isTestEnv, setIsTestEnv] = useState(false);
  const debugPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const normalizeEstimatedTime = (value?: string) => {
    const fallback = language === 'tr' ? '10-15 dakika' : '10-15 minutes';
    const baseValue = value || fallback;
    const normalizedValue = baseValue.replace(/2\s*[–-]\s*5/g, '10-15');

    if (language === 'tr') {
      return normalizedValue.replace('minutes', 'dakika').replace('minute', 'dakika');
    }

    return normalizedValue;
  };

  const showError = (title: string, message: string, action?: { label: string; onPress: () => void }) => {
    setErrorAlertTitle(title);
    setErrorAlertMessage(message);
    setErrorAlertAction(action || null);
    // Auto-detect type from title
    const successKey = t('common.success');
    const infoKey = t('common.info');
    if (title === successKey) {
      setErrorAlertType('success');
    } else if (title === infoKey) {
      setErrorAlertType('info');
    } else {
      setErrorAlertType('error');
    }
    setShowErrorAlert(true);
  };

  useEffect(() => {
    getEnvironmentConfig().then((config) => {
      setIsTestEnv(config.environment === 'test');
    }).catch(() => { });
  }, []);

  const stopDebugPolling = () => {
    if (debugPollRef.current) {
      clearInterval(debugPollRef.current);
      debugPollRef.current = null;
    }
  };

  const fetchDebugJob = async (jobId: string) => {
    try {
      const res = await ttsService.getJobStatus(jobId);
      const job = res?.job;
      if (job) {
        setDebugJobSnapshot(job);
        if (job.status === 'completed' || job.status === 'failed') {
          stopDebugPolling();
        }
      }
    } catch (error: any) {
      setDebugJobSnapshot({
        id: jobId,
        status: 'debug_fetch_failed',
        error: error?.message || 'Debug job fetch failed',
      });
      stopDebugPolling();
    }
  };

  const startDebugPolling = (jobId: string) => {
    setDebugJobId(jobId);
    stopDebugPolling();
    fetchDebugJob(jobId);
    debugPollRef.current = setInterval(() => {
      fetchDebugJob(jobId);
    }, 3000);
  };

  useFocusEffect(
    React.useCallback(() => {
      // Check for active TTS job via global context
      checkActiveJob().then((hasActiveJob) => {
        setIsCreatingVoice(hasActiveJob);
        // Safety net: if backend says no job, force unlock
        if (!hasActiveJob) {
          unlockTtsJob();
        }
      });

      // Delayed re-check as safety net (handles race conditions and network delays)
      const safetyTimer = setTimeout(() => {
        checkActiveJob().then((hasActiveJob) => {
          setIsCreatingVoice(hasActiveJob);
          if (!hasActiveJob) {
            unlockTtsJob();
          }
        });
      }, 3000);

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

      // Ekrana her odaklanıldığında aktif job durumunu kontrol et
      checkActiveJob();
      ttsService.getActiveTtsJob().then((res) => {
        if (res?.hasActiveJob && res.job?.id) {
          startDebugPolling(res.job.id);
        }
      }).catch(() => { });

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
        setSuggestion('');
        setSuggestionResults([]);
        setYoutubeUrl('');
        setYoutubeLoading(false);
        setYoutubeError(null);
      }

      // Cleanup timer on blur
      return () => {
        clearTimeout(safetyTimer);
      };
    }, [route.params?.mode, language, checkActiveJob, unlockTtsJob])
  );

  useEffect(() => {
    return () => {
      stopDebugPolling();
    };
  }, []);
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
  const [isCreatingPodcast, setIsCreatingPodcast] = useState<boolean>(false);

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


  // Voice selection states - Only keep what's needed by parent
  const [selectedVoice, setSelectedVoice] = useState<string>('');

  const levels: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  // --- Book Search State ---
  const [selectedBook, setSelectedBook] = useState<{ id: number; title: string; authors: string } | null>(null);
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


  // Fetch plan features (with caching - userId enables user-aware cache)
  useEffect(() => {
    const fetchPlanFeatures = async () => {
      try {
        const result = await getMyPlanFeatures(user?.id);
        setPlanFeatures(result.features);
      } catch (error) {
        console.error('Error loading plan features:', error);
      }
    };
    fetchPlanFeatures();
  }, [user?.id]);


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

    // Lock TTS job immediately to prevent navigation to other screens
    const lockMsg = language === 'tr'
      ? 'Ses oluşturma süreci devam ediyor. Lütfen bitmesini bekleyin.'
      : 'An audio creation process is still running. Please wait for it to finish.';
    lockTtsJob(lockMsg);

    // Suggestion mode: if no input yet, rewrite the topic/suggestion into narration text first
    let effectiveInputText = inputText;
    if (mode === 'suggestion' && !effectiveInputText.trim()) {
      const base = (suggestionResults && suggestionResults.length > 0)
        ? suggestionResults[0]
        : suggestion;
      if (!base || !base.trim()) {
        unlockTtsJob();
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
        unlockTtsJob();
        showError(t('common.error'), e.message || t('common.unexpectedError'));
        return;
      } finally {
        setIsLoading(false);
      }
    }

    if (mode === 'book') {
      if (!selectedChapterText || selectedChapterText.trim().length === 0) {
        unlockTtsJob();
        showError(t('common.error'), t('create.book.alerts.selectChapter'));
        return;
      }
    } else if (mode !== 'file' && !effectiveInputText.trim()) {
      unlockTtsJob();
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

        const response = await ttsService.processFileToSpeechAsync(formData);

        if (response.success) {
          if (response.jobId) {
            startDebugPolling(response.jobId);
          }
          setSelectedFile(null);
          const localizedTime = normalizeEstimatedTime(response.estimatedTime);
          setSuccessAlertEstimatedTime(localizedTime);
          setShowSuccessAlert(true);
          setIsCreatingVoice(true);
        } else {
          unlockTtsJob();
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
          topic_id: topicIdForRequest,
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
          if (response.jobId) {
            startDebugPolling(response.jobId);
          }
          if (mode === 'text' || mode === 'suggestion' || mode === 'youtube') {
            setInputText('');
          } else if (mode === 'book') {
            setSelectedBook(null);
            setSelectedChapterId(null);
            setSelectedChapterText('');
          }

          const localizedTime2 = normalizeEstimatedTime(response.estimatedTime);
          setSuccessAlertEstimatedTime(localizedTime2);
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
          unlockTtsJob();
          showError(t('common.error'), t('create.alerts.audioCreateFailed'));
        }
      }
    } catch (error: any) {
      console.error('🔴 [CREATE ASYNC] Error:', error);
      unlockTtsJob();

      // Backend, devam eden iş varken yeni istek gelirse TTS_JOB_IN_PROGRESS döndürüyor
      if (error?.code === 'TTS_JOB_IN_PROGRESS') {
        const msg =
          language === 'tr'
            ? 'Ses oluşturma süreci devam ediyor. Lütfen mevcut işlemin bitmesini bekleyin.'
            : 'An audio creation process is already running. Please wait for it to finish before starting a new one.';
        lockTtsJob(msg);
        setIsCreatingVoice(true);
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

  const handleCreatePodcast = async (configArg?: PodcastConfig | unknown) => {
    // Check if configArg is actually a PodcastConfig (has 'topic' property)
    // TouchableOpacity's onPress passes an event object, not our config
    const isValidConfig = configArg && typeof configArg === 'object' && 'topic' in configArg;
    const config = isValidConfig ? (configArg as PodcastConfig) : podcastConfigRef.current?.getConfig();

    console.log('[Podcast] configArg:', configArg);
    console.log('[Podcast] isValidConfig:', isValidConfig);
    console.log('[Podcast] config from ref:', podcastConfigRef.current?.getConfig());
    console.log('[Podcast] final config:', config);

    if (!config) {
      showError(
        t('common.error'),
        language === 'tr' ? 'Podcast yapılandırması alınamadı.' : 'Could not get podcast configuration.'
      );
      return;
    }

    // Podcast Log
    AnalyticsHelper.logEvent('action_create_podcast_click_mobile', {
      topic: config.topic,
      level: selectedLevel,
      duration: config.duration,
    });

    if (!config.topic || config.topic.trim().length === 0) {
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

    // Lock TTS job immediately to prevent navigation to other screens
    const lockMsg = language === 'tr'
      ? 'Podcast oluşturma süreci devam ediyor. Lütfen bitmesini bekleyin.'
      : 'A podcast creation process is still running. Please wait for it to finish.';
    lockTtsJob(lockMsg);

    setIsCreatingPodcast(true);

    // Firebase Analytics: Podcast creation started
    AnalyticsHelper.logEvent('content_creation_start', {
      type: 'podcast',
      topic: config.topic.trim(),
      level: selectedLevel,
      duration: config.duration,
      tts_provider: config.ttsProvider,
    });

    try {
      // Google podcast: run async in background and notify when ready
      if (config.ttsProvider === 'google') {
        const response: unknown = await ttsService.createPodcastAsync({
          topic: config.topic.trim(),
          level: selectedLevel,
          duration: config.duration,
          ttsProvider: 'google',
          hostSpeakerId: config.hostSpeakerId,
          guestSpeakerId: config.guestSpeakerId,
          styleType: config.styleType,
          personalityA: config.personalityA,
          personalityB: config.personalityB,
          includeHumor: config.includeHumor,
          includeFiller: config.includeFiller,
        });

        const resp = response as { success?: boolean; estimatedTime?: string; message?: string };

        if (resp?.success) {
          if ((resp as any).jobId) {
            startDebugPolling((resp as any).jobId);
          }
          const estimated = normalizeEstimatedTime(resp.estimatedTime);
          setSuccessAlertEstimatedTime(estimated);
          setShowSuccessAlert(true);
          return;
        }

        throw new Error(
          resp?.message || (language === 'tr' ? 'Podcast oluşturulamadı.' : 'Podcast could not be created.')
        );
      }

      const response: unknown = await ttsService.createPodcast({
        topic: config.topic.trim(),
        level: selectedLevel,
        duration: config.duration,
        ttsProvider: config.ttsProvider,
        hostSpeakerId: config.ttsProvider === 'google' ? config.hostSpeakerId : undefined,
        guestSpeakerId: config.ttsProvider === 'google' ? config.guestSpeakerId : undefined,
        styleType: config.styleType,
        personalityA: config.personalityA,
        personalityB: config.personalityB,
        includeHumor: config.includeHumor,
        includeFiller: config.includeFiller,
      });

      const resp = response as {
        success?: boolean;
        podcast_url?: string;
        audio_url?: string;
        mp3_url?: string;
        audioUrl?: string;
        vtt_url?: string;
        vtt_subtitles?: string;
        subtitlesUrl?: string;
        data?: { subtitles?: { vtt?: string } };
        message?: string;
        timepoints?: unknown;
        words?: unknown;
        topic?: string;
        transcript?: string;
        duration_seconds?: number | string;
        duration?: number | string;
        contenthistory_id?: number;
      };

      const success = resp?.success !== false;
      const audioUrl =
        resp?.podcast_url ||
        resp?.audio_url ||
        resp?.mp3_url ||
        resp?.audioUrl;
      const vttUrl =
        resp?.vtt_url ||
        resp?.vtt_subtitles ||
        resp?.subtitlesUrl ||
        resp?.data?.subtitles?.vtt;

      if (!success || !audioUrl) {
        throw new Error(
          resp?.message ||
          (language === 'tr' ? 'Podcast oluşturulamadı.' : 'Podcast could not be created.')
        );
      }

      // Podcast başarılı oluşturulduktan sonra, içeriği contenthistory tablosuna kaydet (web tarafındaki submitContent fallback'ine benzer)
      let timepoints: unknown = resp?.timepoints;
      let words: unknown = resp?.words;

      const topicForTrack = resp?.topic || config.topic.trim();
      const transcriptForTrack =
        resp?.transcript ||
        resp?.message ||
        config.topic.trim();

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

      let durationSecondsRaw: number | null = null;
      if (typeof resp?.duration_seconds === 'number') {
        durationSecondsRaw = resp.duration_seconds;
      } else if (typeof resp?.duration === 'number') {
        durationSecondsRaw = resp.duration;
      } else if (typeof resp?.duration_seconds === 'string') {
        durationSecondsRaw = parseFloat(resp.duration_seconds);
      } else if (typeof resp?.duration === 'string') {
        durationSecondsRaw = parseFloat(resp.duration);
      }

      const durationSeconds =
        typeof durationSecondsRaw === 'number' && Number.isFinite(durationSecondsRaw) && durationSecondsRaw > 0
          ? durationSecondsRaw
          : 180;

      const trackId = String(resp?.contenthistory_id || Date.now().toString());

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

      // Navigate to AudioPlayer screen instead of using modal
      navigation.navigate('AudioPlayer', {
        track: newTrack,
        highlightMode: 'word'
      });

      // Unlock TTS job since ElevenLabs podcast completed synchronously
      unlockTtsJob();

      // Firebase Analytics: Podcast creation completed
      AnalyticsHelper.logEvent('content_creation_complete', {
        type: 'podcast',
        topic: config.topic.trim(),
        level: selectedLevel,
        duration: config.duration,
        tts_provider: config.ttsProvider,
        status: 'completed',
      });
    } catch (e: unknown) {
      const error = e as { message?: string };
      const msg =
        error?.message ||
        (language === 'tr' ? 'Podcast oluşturulamadı.' : 'Podcast could not be created.');
      unlockTtsJob();
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
  const isGlobalCreateDisabled = isLoading || isCreatingVoice || isTtsJobLocked;
  const isGlobalCreateBusy = isLoading || isCreatingVoice;
  const globalCreateLabel = isLoading
    ? (selectedFile ? t('create.buttons.processingFile') : t('create.buttons.processing'))
    : isCreatingVoice
      ? (language === 'tr' ? 'Ses oluşturuluyor...' : 'Creating Voice...')
      : t('create.buttons.createAudio');

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
        ref={scrollViewRef}
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
          <CopilotStep order={1} name="createPodcastConfig" text={CREATE_TOUR_STEPS.createPodcastConfig[lang]}>
            <WalkthroughableView>
              <PodcastConfigPanel
                ref={podcastConfigRef}
                onCreatePodcast={handleCreatePodcast}
                language={language}
                t={t}
                initialTtsProvider={(route.params as any)?.podcastProvider}
              />
            </WalkthroughableView>
          </CopilotStep>
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
          <CopilotStep order={1} name="createTextInput" text={CREATE_TOUR_STEPS.createTextInput[lang]}>
          <WalkthroughableView style={styles.inputSection}>
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
          </WalkthroughableView>
          </CopilotStep>
        )}

        {/* Divider hidden in single-mode screens */}

        {mode === 'book' && (
          <CopilotStep order={1} name="createBookSearch" text={CREATE_TOUR_STEPS.createBookSearch[lang]}>
            <WalkthroughableView>
              <BookSearchView
                onBookSelect={(book) => setSelectedBook(book)}
                onChapterSelect={(chapterId, chapterText) => {
                  setSelectedChapterId(chapterId);
                  setSelectedChapterText(chapterText);
                }}
                onError={showError}
                t={t}
              />
            </WalkthroughableView>
          </CopilotStep>
        )}

        {mode === 'file' && (
          <CopilotStep order={1} name="createFileUpload" text={CREATE_TOUR_STEPS.createFileUpload[lang]}>
            <WalkthroughableView>
              {selectedFile ? (
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
              )}
            </WalkthroughableView>
          </CopilotStep>
        )}

        <CopilotStep order={2} name="createCefrLevel" text={CREATE_TOUR_STEPS.createCefrLevel[lang]}>
        <WalkthroughableView style={styles.settingsSection}>
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
        </WalkthroughableView>
        </CopilotStep>

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
          <CopilotStep order={3} name="createVoiceSelect" text={CREATE_TOUR_STEPS.createVoiceSelect[lang]}>
          <WalkthroughableView>
            <VoiceSelectionPanel
              selectedVoice={selectedVoice}
              onVoiceSelect={setSelectedVoice}
              planFeatures={planFeatures}
              language={language}
              t={t}
              onError={showError}
              onSuccess={(title, message) => showError(title, message)}
            />
          </WalkthroughableView>
          </CopilotStep>
        )}

        {/* Create Button - Now inside ScrollView */}
        <CopilotStep order={4} name="createButton" text={CREATE_TOUR_STEPS.createButton[lang]}>
        <WalkthroughableView>
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
        </WalkthroughableView>
        </CopilotStep>

        {isTestEnv && debugJobSnapshot && (
          <View style={styles.debugCard}>
            <Text style={styles.debugTitle}>Debug Job</Text>
            <Text style={styles.debugMeta}>jobId: {debugJobId || debugJobSnapshot.id || '-'}</Text>
            <Text style={styles.debugMeta}>status: {debugJobSnapshot.status || '-'}</Text>
            {debugJobSnapshot.error ? (
              <Text style={styles.debugError}>error: {String(debugJobSnapshot.error)}</Text>
            ) : null}
            <ScrollView style={styles.debugScroll} nestedScrollEnabled>
              <Text selectable style={styles.debugText}>
                {JSON.stringify(
                  {
                    progress: debugJobSnapshot.progress,
                    queuePosition: debugJobSnapshot.queuePosition,
                    resultDebug: debugJobSnapshot.result?.debug_info || null,
                    resultMessage: debugJobSnapshot.result?.message || null,
                    debugLogs: debugJobSnapshot.debugLogs || [],
                    fullError: debugJobSnapshot.error || null,
                  },
                  null,
                  2
                )}
              </Text>
            </ScrollView>
          </View>
        )}
      </ScrollView>

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
      {/* Alert Modal (Error / Success / Info) */}
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
            {/* Icon */}
            <View style={styles.successIconContainer}>
              <LinearGradient
                colors={
                  errorAlertType === 'success'
                    ? [COLORS.brandTeal, '#0D9488']
                    : errorAlertType === 'info'
                      ? [COLORS.brandOrange, '#D97706']
                      : [COLORS.danger, '#B91C1C']
                }
                style={styles.successIconGradient}
              >
                <Icon
                  name={
                    errorAlertType === 'success'
                      ? 'check-circle'
                      : errorAlertType === 'info'
                        ? 'info'
                        : 'error-outline'
                  }
                  size={40}
                  color="#FFFFFF"
                />
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
                style={[
                  styles.errorActionButton,
                  errorAlertType !== 'error' && { backgroundColor: COLORS.brandTeal, shadowColor: COLORS.brandTeal },
                ]}
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
                errorAlertAction
                  ? styles.errorDismissButton
                  : errorAlertType === 'error'
                    ? styles.errorPrimaryButton
                    : null,
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
  debugCard: {
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 16,
    borderRadius: 18,
    backgroundColor: COLORS.slate900,
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  debugMeta: {
    marginTop: 6,
    fontSize: 12,
    color: COLORS.slate300,
  },
  debugError: {
    marginTop: 8,
    fontSize: 12,
    color: '#fca5a5',
  },
  debugScroll: {
    maxHeight: 260,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
  },
  debugText: {
    fontSize: 11,
    lineHeight: 16,
    color: '#dbeafe',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
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

const CreateScreen: React.FC = () => (
  <TourProvider tooltip={CreateTooltip}>
    <CreateScreenContent />
  </TourProvider>
);

export default React.memo(CreateScreen);
