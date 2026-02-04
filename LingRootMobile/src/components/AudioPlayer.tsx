import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  useWindowDimensions,
  ScrollView,
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import secureStorage from '../services/secureStorage';
import { Platform } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Replaced expo-av with our TrackPlayer-based service
import { createSound } from '../services/audioService';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AudioTrack, Timepoint } from '../types';
import { useAudioContext } from '../contexts/AudioContext';
import { lookupVocabularyWord } from '../services/vocabularyService';
import { getUserContentById } from '../services/contentService';
import perfLog from '../utils/performanceLogger';
import { useLanguage } from '../contexts/LanguageContext';
import { SkiaWordHighlight } from './SkiaWordHighlight';
import { SkiaSentenceHighlight } from './SkiaSentenceHighlight';
import { getEnvironmentConfig } from '../services/environmentConfig';
import { COLORS } from '../theme/colors';
import { useCustomAlert } from '../contexts/AlertContext';
import { CopilotStep, walkthroughable } from 'react-native-copilot';
import { AUDIOPLAYER_TOUR_STEPS } from './GuideTour';
import { AnalyticsHelper } from '../utils/AnalyticsHelper';
import { PodcastDialogueView } from './audio/PodcastDialogueView';
import { WordPopupModal } from './audio/WordPopupModal';
import { PlaybackControls } from './audio/PlaybackControls';

const WalkthroughableView = walkthroughable(View);

interface AudioPlayerProps {
  track: AudioTrack;
  visible: boolean;
  onClose: () => void;
  timepoints?: Timepoint[];
  words?: string[];
  initialHighlightMode?: 'word' | 'sentence';
  asScreen?: boolean; // When true, renders without Modal wrapper (for use as navigation screen)
  enableTour?: boolean; // When true, wraps key elements with CopilotStep for guide tour
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  track,
  visible,
  onClose,
  timepoints = [],
  words = [],
  initialHighlightMode = 'word',
  asScreen = false,
  enableTour = false,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { language, t } = useLanguage();
  const lang = language === 'tr' ? 'tr' : 'en';
  const { showAlert } = useCustomAlert();
  const { setCurrentTrack, setIsPlaying, isPlaying, currentTrack, sound, setSound, stopAllAudio } = useAudioContext();
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(-1);
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState(-1);
  const [wordPopup, setWordPopup] = useState<{ mode: 'info' | 'confirm'; word: string; data?: any } | null>(null);

  // Removed complex drift correction - using simple web-like approach
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set()); // Seçilen kelimeler
  const [highlightMode, setHighlightMode] = useState<'word' | 'sentence' | 'pattern'>(initialHighlightMode); // Use mode from Library
  const [showPatterns, setShowPatterns] = useState(true); // Toggle pattern highlighting - Default true
  const [patterns, setPatterns] = useState<Array<{
    pattern: string;
    type?: string;
    translation?: string;        // Backend field name
    example_text?: string;       // Backend field name
    example_translation?: string; // Backend field name
    level?: string;
    // Keep old field names for backward compatibility
    meaning?: string;
    pattern_tr?: string;
    example_sentence?: string;
    example_sentence_tr?: string;
  }>>([]);
  const [loadingPatterns, setLoadingPatterns] = useState(false);


  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [isClosing, setIsClosing] = useState(false); // Track if modal is closing to hide Skia early

  // Debug: Log pageIndex changes
  useEffect(() => {
    console.log(`📄 [AudioPlayer] pageIndex changed to: ${pageIndex}`);
  }, [pageIndex]);

  const loadPronunciation = useCallback(async (_word: string) => {
    // Pronunciation feature removed on mobile
    return;
  }, []);

  const handleShowWordInfo = useCallback(async (word: string) => {
    const cleanWord = word.replace(/[.,!?;:]/g, '');

    try {
      const result = await lookupVocabularyWord(cleanWord);

      if (!result.found || !result.data) {
        showAlert(
          language === 'tr' ? 'Bilgi' : 'Info',
          language === 'tr'
            ? `"${cleanWord}" kelimesi için henüz sözlük kaydı bulunamadı.\n\nBu kelimeyi kelime listenize ekleyebilirsiniz.`
            : `There is no dictionary entry yet for "${cleanWord}".\n\nYou can add this word to your vocabulary list.`,
          [{ text: 'OK', style: 'default' }],
          'info-outline',
          '#3B82F6'
        );
        return;
      }

      const w = result.data;

      setWordPopup({
        mode: 'info',
        word: cleanWord,
        data: w,
      });
      await loadPronunciation(cleanWord);
    } catch (error: unknown) {
      showAlert(
        language === 'tr' ? 'Hata' : 'Error',
        language === 'tr'
          ? `Kelime bilgisi yüklenirken hata oluştu: ${(error as Error)?.message || 'Bilinmeyen hata'}`
          : `An error occurred while loading word info: ${(error as Error)?.message || 'Unknown error'}`,
        [{ text: 'OK', style: 'default' }],
        'error-outline',
        '#EF4444'
      );
    }
  }, [language, loadPronunciation]);
  const [elapsedTime, setElapsedTime] = useState(0); // Elapsed time since play started
  const [textViewportHeight, setTextViewportHeight] = useState(0);
  const scrollOffsetRef = useRef<number>(0); // Track scroll position for touch events (use ref to avoid re-renders)
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const playStartTimeRef = useRef<number>(0);
  const accumulatedTimeRef = useRef<number>(0);

  // Use refs to track the latest values for highlighting
  const durationRef = useRef(0);
  const isLoadedRef = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const horizontalScrollRef = useRef<ScrollView>(null);
  const wordRefs = useRef<Map<number, any>>(new Map());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const highlightTickInFlightRef = useRef(false);
  const pauseRequestedRef = useRef(false);
  const currentWordIndexRef = useRef(-1);
  const lastStatusPositionMsRef = useRef(0);
  const lastStatusTsRef = useRef(0);
  const pauseFreezePositionMsRef = useRef<number | null>(null);
  const playbackRateRef = useRef(1);
  const lastAutoScrollTsRef = useRef(0);
  const wasPlayingRef = useRef(false); // Track previous play state to prevent event spam
  const latestWordPositionRef = useRef<{ top: number; bottom: number; height: number } | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [originalText, setOriginalText] = useState('');
  const [originalLoading, setOriginalLoading] = useState(false);
  const [manualSeconds, setManualSeconds] = useState('');
  const [manualMillis, setManualMillis] = useState('');
  const [isTestEnvironment, setIsTestEnvironment] = useState(false);

  // Check if app is in test environment
  useEffect(() => {
    getEnvironmentConfig().then(config => {
      setIsTestEnvironment(config.environment === 'test');
    });
  }, []);

  useEffect(() => {
    setOriginalText(track.original_turkish || '');
    console.log('[AudioPlayer] track.original_turkish updated:', {
      id: track.id,
      hasOriginalTurkish: !!track.original_turkish,
      originalTurkishLength: track.original_turkish ? track.original_turkish.length : 0,
    });

    // Debug: Log track timing info
    console.log('📊 Track Info:', {
      id: track.id,
      timepoints: timepoints?.length || 0,
      words: words?.length || 0,
      duration: track.real_duration || track.duration,
    });

    if (timepoints && timepoints.length > 0) {
      console.log('🎯 First 10 timepoints:', timepoints.slice(0, 10));
      console.log('🎯 Last 3 timepoints:', timepoints.slice(-3));

      // Find "Furthermore" and log surrounding words
      const furthermoreIndex = timepoints.findIndex(tp => tp?.word?.toLowerCase().includes('furthermore'));
      if (furthermoreIndex !== -1) {
        const start = Math.max(0, furthermoreIndex - 5);
        const end = Math.min(timepoints.length, furthermoreIndex + 6);
        console.log(`🔍 Found "Furthermore" at index ${furthermoreIndex}. Surrounding timepoints (${start}-${end}):`);
        timepoints.slice(start, end).forEach((tp, idx) => {
          console.log(`  [${start + idx}] "${tp.word}" @ ${tp.timeSeconds.toFixed(2)}s`);
        });
      }
    }
  }, [track.id, track.original_turkish, timepoints, words]);

  useEffect(() => {
    if (!visible) return;
    if (!showOriginal) return;
    if (originalLoading) return;
    if (originalText && originalText.trim().length > 0) return;
    if (!track.id) return;

    (async () => {
      perfLog.start('loadOriginalText', 'AudioPlayer');
      try {
        setOriginalLoading(true);
        const res = await getUserContentById(track.id);
        if ((res as any)?.success && (res as any)?.data?.input) {
          setOriginalText((res as any).data.input);
        }
      } catch (err) {
        // silent in production
      } finally {
        setOriginalLoading(false);
        perfLog.end('loadOriginalText');
      }
    })();
  }, [visible, track.id, showOriginal, originalLoading, originalText]);

  // Text parsing - Memoized to prevent unnecessary re-renders
  const textData = useMemo(() => {
    const getTextForHighlight = () => {
      const adapted = track.adapted_text || '';
      const translated = track.translated_text || '';
      const isPodcast = track.input_type === 'podcast';

      if (isPodcast) {
        const hasDialogueLabels = (txt: string) => /^(Speaker\s+[A-Z]:|Host:|Guest:)/im.test(txt);
        const looksLikeDialogue = (txt: string) => hasDialogueLabels(txt) || /\r?\n/.test(txt);

        // Prefer dialogue-formatted text for podcasts (so bubble view + dialogue highlighting works)
        if (translated && looksLikeDialogue(translated) && (!adapted || !looksLikeDialogue(adapted))) {
          return translated;
        }
      }

      if (adapted) return adapted;
      if (translated) return translated;
      return track.title;
    };

    const textToHighlight = getTextForHighlight();
    const wordsArray = words.length > 0 ? words : textToHighlight.split(/\s+/).filter(w => w.length > 0);
    const sentences = textToHighlight.split(/[.!?]+/).filter(s => s.trim().length > 0);

    // Debug: Check array lengths
    console.log(`📊 Array lengths: wordsArray=${wordsArray.length}, words prop=${words.length}`);
    if (wordsArray.length !== words.length && words.length > 0) {
      console.warn(`⚠️ MISMATCH! wordsArray.length (${wordsArray.length}) !== words.length (${words.length})`);
    }

    return {
      textToHighlight,
      wordsArray,
      sentences
    };
  }, [track.adapted_text, track.translated_text, track.title, words]);

  const { textToHighlight, wordsArray, sentences } = textData;

  // Auto-load patterns when content matches
  useEffect(() => {
    // Always reload patterns when article changes
    if (track.level && textToHighlight && !loadingPatterns) {
      loadPatterns();
    }
  }, [track.level, textToHighlight]);

  // Load patterns from backend
  const loadPatterns = async () => {
    if (loadingPatterns || !textToHighlight || !track.level) return;

    try {
      setLoadingPatterns(true);

      const apiUrl = await getEnvironmentConfig().then(config => config.baseUrl);
      const token = await secureStorage.getItem('auth_token') || await AsyncStorage.getItem('userToken');

      const response = await fetch(`${apiUrl}/api/patterns/find`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: textToHighlight, level: track.level })
      });

      const data = await response.json();
      console.log(`📊 [AudioPlayer] Found ${data.patterns?.length || 0} patterns`);

      if (data.success && data.patterns) {
        setPatterns(data.patterns);
      }
    } catch (error) {
      console.error('❌ [AudioPlayer] Error loading patterns:', error);
    } finally {
      setLoadingPatterns(false);
    }
  };

  const isPodcastTranscript = useMemo(() => {
    if (track.input_type === 'podcast') return true;
    if (!textToHighlight) return false;
    return /^(Speaker\s+[AB]:|Host:|Guest:)/im.test(textToHighlight);
  }, [track.input_type, textToHighlight]);

  // Dialogue lines derived directly from the transcript text (like web OutputSection/NewSyncedTextPlayer)
  const dialogueLines = useMemo(() => {
    if (!isPodcastTranscript || !textToHighlight) {
      return [] as string[];
    }

    return textToHighlight
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }, [isPodcastTranscript, textToHighlight]);

  const originalDialogueLines = useMemo(() => {
    if (!isPodcastTranscript || !originalText) {
      return [] as string[];
    }

    return originalText
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }, [isPodcastTranscript, originalText]);

  // For each dialogue line, map it to a [startIndex, endIndex] range in the global word sequence
  // so we can convert active word index -> active dialogue index (same as web's dialogueLineRanges)
  const dialogueLineRanges = useMemo(() => {
    if (!dialogueLines.length) {
      return [] as { lineIndex: number; startIndex: number; endIndex: number }[];
    }

    const hasDialogueFormat = dialogueLines.some(line => /^(Speaker\s+[A-Z]:|Host:|Guest:)/i.test(line));
    if (!hasDialogueFormat) {
      return [] as { lineIndex: number; startIndex: number; endIndex: number }[];
    }

    const ranges: { lineIndex: number; startIndex: number; endIndex: number }[] = [];
    let globalIndex = 0;

    dialogueLines.forEach((line, lineIndex) => {
      const match = line.match(/^(Speaker\s+([A-Z])|Host|Guest):\s*(.*)$/i);
      const textPart = match ? match[3] : line;
      const wordsInLine = textPart
        .split(/\s+/)
        .filter(word => word.length > 0);

      if (!wordsInLine.length) {
        return;
      }

      const startIndex = globalIndex;
      const endIndex = globalIndex + wordsInLine.length - 1;
      ranges.push({ lineIndex, startIndex, endIndex });
      globalIndex += wordsInLine.length;
    });

    return ranges;
  }, [dialogueLines]);

  // Dialogue segments used for rendering (Speaker bubbles) + explicit timing from MFA word timepoints
  const dialogueSegments = useMemo(() => {
    if (!isPodcastTranscript || dialogueLines.length === 0) {
      return [] as { speaker: string; speakerLabel?: string; content: string; startTime?: number; endTime?: number }[];
    }

    const baseSegments = dialogueLines.map(line => {
      const match = line.match(/^(Speaker\s+([A-Z])|Host|Guest):\s*(.*)$/i);
      if (match) {
        const prefix = (match[1] || '').trim();
        const speakerLetter = (match[2] || '').trim();
        const content = (match[3] || '').trim();

        const lowerPrefix = prefix.toLowerCase();
        let speaker = '';
        let speakerLabel: string | undefined;

        if (lowerPrefix.startsWith('speaker')) {
          speaker = (speakerLetter || '').toUpperCase();
          speakerLabel = speaker ? `Speaker ${speaker}` : undefined;
        } else if (lowerPrefix === 'host') {
          speaker = 'A';
          speakerLabel = 'Host';
        } else if (lowerPrefix === 'guest') {
          speaker = 'B';
          speakerLabel = 'Guest';
        }

        return {
          speaker,
          speakerLabel,
          content: content || line,
        } as { speaker: string; speakerLabel?: string; content: string; startTime?: number; endTime?: number };
      }

      return {
        speaker: '',
        content: line,
      } as { speaker: string; speakerLabel?: string; content: string; startTime?: number; endTime?: number };
    });

    if (!timepoints || timepoints.length === 0 || dialogueLineRanges.length === 0) {
      return baseSegments;
    }

    const totalWords = timepoints.length;

    const segmentsWithTiming = baseSegments.map((seg, index) => {
      const range = dialogueLineRanges.find(r => r.lineIndex === index);
      if (!range) {
        return seg;
      }

      let startWordIndex = range.startIndex;
      if (startWordIndex < 0) startWordIndex = 0;
      if (startWordIndex >= totalWords) startWordIndex = totalWords - 1;

      // End word index: either just before next segment's start, or this range's end
      const nextRange = dialogueLineRanges.find(r => r.lineIndex === index + 1);
      let endWordIndex: number;
      if (nextRange && typeof nextRange.startIndex === 'number') {
        endWordIndex = nextRange.startIndex - 1;
      } else {
        endWordIndex = range.endIndex;
      }

      if (endWordIndex < startWordIndex) {
        endWordIndex = startWordIndex;
      }
      if (endWordIndex >= totalWords) {
        endWordIndex = totalWords - 1;
      }

      const startTp = timepoints[startWordIndex];
      const endTp = timepoints[endWordIndex];

      const segWithTimes: { speaker: string; speakerLabel?: string; content: string; startTime?: number; endTime?: number } = {
        ...seg,
      };

      if (startTp && typeof startTp.timeSeconds === 'number') {
        segWithTimes.startTime = startTp.timeSeconds;
      }

      if (endTp) {
        if (typeof endTp.endTimeSeconds === 'number') {
          segWithTimes.endTime = endTp.endTimeSeconds;
        } else if (typeof endTp.timeSeconds === 'number') {
          segWithTimes.endTime = endTp.timeSeconds + 0.5;
        }
      }

      return segWithTimes;
    });

    return segmentsWithTiming;
  }, [isPodcastTranscript, dialogueLines, dialogueLineRanges, timepoints]);

  const originalDialogueSegments = useMemo(() => {
    if (!isPodcastTranscript || dialogueSegments.length === 0 || originalDialogueLines.length === 0) {
      return [] as { content: string }[];
    }

    const segments = originalDialogueLines.map(line => {
      const match = line.match(/^(Speaker\s+([A-Z])|Host|Guest):\s*(.*)$/i);
      if (match) {
        const content = (match[3] || '').trim();
        return { content: content || line };
      }
      return { content: line };
    });

    return segments;
  }, [isPodcastTranscript, dialogueSegments.length, originalDialogueLines]);

  const dialogueRefs = useRef<Map<number, any>>(new Map());

  const scrollToDialogue = useCallback((dialogueIndex: number) => {
    if (pageIndex !== 0) return;
    if (!scrollViewRef.current) return;
    if (dialogueIndex < 0) return;

    const now = Date.now();
    const SCROLL_THROTTLE = 250;
    if (now - lastAutoScrollTsRef.current < SCROLL_THROTTLE) {
      return;
    }
    const rowRef = dialogueRefs.current.get(dialogueIndex);
    if (rowRef && scrollViewRef.current) {
      rowRef.measureLayout(
        scrollViewRef.current,
        (_x: number, y: number, _w: number, h: number) => {
          if (textViewportHeight <= 0) {
            return;
          }

          const currentScroll = scrollOffsetRef.current || 0;
          const visibleTop = currentScroll;
          const visibleBottom = currentScroll + textViewportHeight;
          const rowTop = y;
          const rowBottom = y + h;

          // Check if row is fully visible
          const topPadding = 40;
          const bottomPadding = 40;
          const isAboveViewport = rowTop < visibleTop + topPadding;
          const isBelowViewport = rowBottom > visibleBottom - bottomPadding;

          // If row is already visible, don't scroll
          if (!isAboveViewport && !isBelowViewport) {
            return;
          }

          lastAutoScrollTsRef.current = now;
          const alignPadding = 16;
          // Center the dialogue in viewport for better UX
          const desiredOffset = Math.max(0, y - (textViewportHeight / 3));
          scrollViewRef.current?.scrollTo({ y: desiredOffset, animated: true });
          scrollOffsetRef.current = desiredOffset;
        },
        (_error: any) => {
          // silently ignore
        }
      );
    }
  }, [pageIndex, textViewportHeight]);

  useEffect(() => {
    if (!isPodcastTranscript) return;
    if (currentDialogueIndex < 0) return;
    scrollToDialogue(currentDialogueIndex);
  }, [isPodcastTranscript, currentDialogueIndex, scrollToDialogue]);

  // Debug: Log initial data - GİZLENDİ
  // GIZLENDİ - Debug console.log mesajları

  // Debug: Track duration changes - GİZLENDİ
  // GIZLENDİ - Debug console.log mesajları

  // Debug timepoints data - GİZLENDİ  
  // GIZLENDİ - Debug console.log mesajları

  useEffect(() => {
    // Only load if visible - prevent duplicate loads
    if (visible) {
      loadAudio();

      // Log content view
      if (track.id) {
        AnalyticsHelper.logEvent('content_view', {
          content_id: track.id,
          content_title: track.title,
          content_type: track.input_type || 'unknown',
          cefr_level: track.level || 'unknown'
        });
      }

      // Reset elapsed time when new track loads
      setElapsedTime(0);
      accumulatedTimeRef.current = 0;
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
    }
  }, [track.id, visible]);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      // Cleanup elapsed timer
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
      }
    };
  }, [sound]);

  useEffect(() => {
    if (!visible) {
      // Defer state resets so they don't trigger re-renders while
      // the native Modal slide-out animation is still running.
      // Re-rendering a large component tree mid-animation can freeze
      // the iOS UI thread.
      const timer = setTimeout(() => {
        perfLog.mark('audioPlayer:cleanup:start');
        // Reset states when modal closes but DON'T unload audio
        setIsLoaded(false);
        setDuration(0);
        setPosition(0);
        setCurrentWordIndex(-1);
        setCurrentSentenceIndex(-1);
        setCurrentDialogueIndex(-1);
        setSelectedWords(new Set());
        setWordPopup(null); // Close any open word popup to prevent frozen UI
        setIsClosing(false); // Reset closing state

        // Reset refs as well
        durationRef.current = 0;
        isLoadedRef.current = false;
        perfLog.mark('audioPlayer:cleanup:end');
      }, 350);

      return () => clearTimeout(timer);
    } else {
      // Reset isClosing when modal opens
      setIsClosing(false);
    }

    return () => {
      // Cleanup interval but keep audio running globally
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [visible]);

  useEffect(() => {
    playbackRateRef.current = playbackRate;
  }, [playbackRate]);

  // Fast highlighting interval - 50ms for smooth word tracking
  useEffect(() => {
    if (isPlaying && sound && isLoaded) {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Start fast interval for word highlighting
      intervalRef.current = setInterval(async () => {
        if (pauseRequestedRef.current) {
          return;
        }
        if (highlightTickInFlightRef.current) return;
        highlightTickInFlightRef.current = true;

        try {
          const basePos = lastStatusPositionMsRef.current;
          const baseTs = lastStatusTsRef.current;
          const deltaMs = baseTs > 0 ? Math.max(0, Date.now() - baseTs) : 0;
          const rate = playbackRateRef.current || 1;

          const estimatedPositionMs = basePos + (deltaMs * rate);
          const currentTimeInSeconds = estimatedPositionMs / 1000;
          updateHighlighting(currentTimeInSeconds);
        } finally {
          highlightTickInFlightRef.current = false;
        }
      }, 80); // 80ms ≈ 12.5 updates per second

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      // Clear interval when paused
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [isPlaying, sound, isLoaded]);

  const loadAudio = async () => {
    try {
      setIsLoading(true);
      setIsLoaded(false);
      setDuration(0);
      setPosition(0);

      // Stop any existing audio first
      await stopAllAudio();

      // CRITICAL: Log audio URL to verify which file is being loaded
      // Use url or mp3_url (API returns mp3_url, but AudioTrack interface has both)
      const audioUrl = track.url || track.mp3_url;
      console.log(`🎵 [AUDIO LOAD] Loading audio from URL: ${audioUrl}`);
      console.log(`🎵 [AUDIO LOAD] Track ID: ${track.id}, Title: ${track.adapted_text?.substring(0, 50)}...`);

      if (!audioUrl) {
        throw new Error('No audio URL available');
      }

      // Create TrackPlayer-backed sound
      const newSound = await createSound(audioUrl);
      setSound(newSound);

      // Set up status update listener first
      newSound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);

      // Get audio status and force duration update
      const status = await newSound.getStatusAsync();

      if (status.isLoaded) {
        const statusAny = status as any;

        // Use audio duration if available, fallback to track duration estimate
        const audioDuration = statusAny.durationMillis;
        const trackDurationMs = track.duration * 1000; // track.duration is in seconds
        const finalDuration = audioDuration || trackDurationMs;

        setDuration(finalDuration);
        setIsLoaded(true);

        // Update refs as well
        durationRef.current = finalDuration;
        isLoadedRef.current = true;
        // Force a status update to ensure everything is synced
        setTimeout(async () => {
          const latestStatus = await newSound.getStatusAsync();
          const latestStatusAny = latestStatus as any;

          if (latestStatus.isLoaded && latestStatusAny.durationMillis && latestStatusAny.durationMillis !== finalDuration) {
            setDuration(latestStatusAny.durationMillis);
          }
        }, 100);
      }

    } catch (error) {
      showAlert('Hata', `Ses dosyası yüklenirken hata oluştu: ${error}`, [{ text: 'OK', style: 'default' }], 'error-outline', '#EF4444');
    } finally {
      setIsLoading(false);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      if (!pauseRequestedRef.current) {
        setPosition(status.positionMillis || 0);

        // Log Play/Pause transitions - use ref to prevent spam
        if (status.isPlaying && !wasPlayingRef.current) {
          AnalyticsHelper.logEvent('audio_play_start', {
            content_id: track.id,
            audio_url: track.url || track.mp3_url,
            duration: duration / 1000 // seconds
          });
        }
        wasPlayingRef.current = status.isPlaying;

        setIsPlaying(status.isPlaying);
        lastStatusPositionMsRef.current = status.positionMillis || 0;
        lastStatusTsRef.current = Date.now();
      } else {
        if (status.isPlaying) {
          setIsPlaying(false);
        }
      }

      // Update global current track - only set when playing, clear when finished
      if (!pauseRequestedRef.current && status.isPlaying) {
        setCurrentTrack(track);
      } else if (status.didJustFinish) {
        // Log completion
        AnalyticsHelper.logEvent('audio_play_complete', {
          content_id: track.id,
          duration_listened: duration / 1000
        });

        // Only clear when audio actually finished, not when paused
        setCurrentTrack(null);
      }

      // Update duration and isLoaded state from actual audio status
      const statusAny = status as any;
      if (statusAny.durationMillis) {
        const actualDuration = statusAny.durationMillis;
        if (duration !== actualDuration) {
          setDuration(actualDuration);
          durationRef.current = actualDuration;
        }
        if (!isLoaded) {
          setIsLoaded(true);
          isLoadedRef.current = true;
        }
      }

      // Note: Highlighting is now handled by fast interval in useEffect
    }
  };

  const updateHighlighting = (currentTimeInSeconds: number) => {
    // Use refs for the most up-to-date values
    const currentDuration = durationRef.current;
    const currentIsLoaded = isLoadedRef.current;

    // Skip if audio is not yet loaded
    if (!currentIsLoaded || currentDuration <= 0) {
      return;
    }

    // Always keep word index in sync (used for both normal and podcast transcripts)
    if (timepoints && timepoints.length > 0) {
      updateWordHighlighting(currentTimeInSeconds);
    }

    // For non-podcast content, optionally use sentence-level highlighting
    // Podcast dialogue highlighting is instead driven purely from currentWordIndex
    // to avoid double-driving state and jitter between segments.
    if (!isPodcastTranscript && highlightMode === 'sentence') {
      updateSentenceHighlighting(currentTimeInSeconds);
    }
  };

  // Binary search for accurate word finding - matches web implementation
  const findWordIndexLinear = useCallback((currentTime: number, timepoints: Timepoint[]): number => {
    if (timepoints.length === 0) return -1;

    // Binary search for efficiency
    let left = 0;
    let right = timepoints.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const tp = timepoints[mid];
      const endTime = tp.endTimeSeconds || tp.timeSeconds + 0.5;

      // Check if we're in this word's time range
      if (currentTime >= tp.timeSeconds && currentTime < endTime) {
        return mid;
      }

      if (currentTime < tp.timeSeconds) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    // Fallback: find closest word
    return timepoints.reduce((closest, tp, idx) => {
      const currentDist = Math.abs(currentTime - tp.timeSeconds);
      const closestDist = Math.abs(currentTime - timepoints[closest].timeSeconds);
      return currentDist < closestDist ? idx : closest;
    }, 0);
  }, []);

  // Scroll in chunks of 5 lines instead of every word
  const lastScrollTime = useRef(0);
  const lastScrolledWordIndex = useRef(-1);
  const WORDS_PER_LINE = 8; // Approximate words per line
  const LINES_PER_SCROLL = 5; // Scroll every 5 lines
  const WORDS_PER_SCROLL = WORDS_PER_LINE * LINES_PER_SCROLL; // ~40 words

  const scrollToWord = useCallback((wordIndex: number) => {
    const now = Date.now();
    const SCROLL_THROTTLE = 100; // Only scroll every 100ms

    if (now - lastScrollTime.current < SCROLL_THROTTLE) {
      return; // Skip this scroll
    }

    // Only scroll if we've moved at least WORDS_PER_SCROLL words
    const wordDifference = Math.abs(wordIndex - lastScrolledWordIndex.current);
    if (lastScrolledWordIndex.current !== -1 && wordDifference < WORDS_PER_SCROLL) {
      return; // Skip - not enough words passed yet
    }

    lastScrollTime.current = now;
    lastScrolledWordIndex.current = wordIndex;
    const wordRef = wordRefs.current.get(wordIndex);

    if (wordRef && scrollViewRef.current) {
      wordRef.measureLayout(
        scrollViewRef.current,
        (x: number, y: number) => {
          scrollViewRef.current?.scrollTo({
            y: y - 100,
            animated: true // Enable smooth animation for chunk scrolling
          });
        },
        (error: any) => {
          // silently ignore scroll measurement errors in production
        }
      );
    }
  }, []);

  const ensureHighlightedWordVisible = useCallback((position: { top: number; bottom: number; height: number }) => {
    if (pageIndex !== 0) return; // Only auto-scroll on translated text page
    if (!scrollViewRef.current || textViewportHeight <= 0) return;

    const currentScroll = scrollOffsetRef.current || 0;
    const alignPadding = 16; // Margin from edges

    // Define visible thresholds
    const visibleTop = currentScroll + alignPadding;
    const visibleBottom = currentScroll + textViewportHeight - alignPadding;

    const isBelow = position.bottom > visibleBottom;
    const isAbove = position.top < visibleTop;

    // If strictly inside the safe zone, do nothing
    if (!isBelow && !isAbove) {
      return;
    }

    const now = Date.now();
    // Throttle auto-scroll updates
    if (now - lastAutoScrollTsRef.current < 150) {
      return;
    }
    lastAutoScrollTsRef.current = now;

    let desiredOffset = currentScroll;

    if (isAbove) {
      // Scroll UP: Put the word at the top + padding
      desiredOffset = Math.max(0, position.top - alignPadding);
    } else if (isBelow) {
      // Scroll DOWN: Put the word near the top (standard reading flow) 
      // OR keep it at bottom? Usually moving it to top is better for continuous reading.
      // Current implementation moved it to top: `position.top - alignPadding`.
      // Let's stick to that for consistency, or maybe center it?
      // Moving to top is simpler and matches existing logic.
      desiredOffset = Math.max(0, position.top - alignPadding);
    }

    // Avoid micro-adjustments
    if (Math.abs(desiredOffset - currentScroll) < 4) {
      return;
    }

    scrollViewRef.current.scrollTo({ y: desiredOffset, animated: true });
    scrollOffsetRef.current = desiredOffset;
  }, [pageIndex, textViewportHeight]);

  const handleWordPositionChange = useCallback((info: { index: number; top: number; bottom: number; height: number }) => {
    latestWordPositionRef.current = info;
    ensureHighlightedWordVisible(info);
  }, [ensureHighlightedWordVisible]);

  const updateWordHighlighting = useCallback((currentTime: number) => {
    if (!timepoints || timepoints.length === 0) return;

    let effectiveTime = currentTime;
    if (isPodcastTranscript) {
      const PODCAST_HIGHLIGHT_OFFSET_SECONDS = 0.3;
      effectiveTime = Math.max(0, currentTime - PODCAST_HIGHLIGHT_OFFSET_SECONDS);
    }

    const newWordIndexInArray = findWordIndexLinear(effectiveTime, timepoints);

    if (Math.floor(currentTime) % 30 === 0 && Math.floor(currentTime * 10) % 10 === 0) {
      const tp = timepoints[newWordIndexInArray];
      console.log(`[SYNC CHECK] Time: ${currentTime.toFixed(2)}s | IndexInArray: ${newWordIndexInArray} | Word: "${tp?.word}" | WordStart: ${tp?.timeSeconds.toFixed(2)}s | WordEnd: ${tp?.endTimeSeconds?.toFixed(2)}s | Drift: ${(currentTime - tp?.timeSeconds).toFixed(2)}s`);
    }

    if (newWordIndexInArray !== -1) {
      const tp = timepoints[newWordIndexInArray];
      const globalIndex = typeof tp.index === 'number' ? tp.index : newWordIndexInArray;
      currentWordIndexRef.current = globalIndex;

      if (isPodcastTranscript) {
        if (dialogueLineRanges.length > 0) {
          const foundRange = dialogueLineRanges.find(r => globalIndex >= r.startIndex && globalIndex <= r.endIndex);
          const newDialogueIdx = foundRange ? foundRange.lineIndex : -1;
          if (newDialogueIdx !== currentDialogueIndex) {
            setCurrentDialogueIndex(newDialogueIdx);
          }
        }
        return;
      }

      if (globalIndex !== currentWordIndex) {
        setCurrentWordIndex(globalIndex);
        if (!isPodcastTranscript) {
          scrollToWord(globalIndex);
        }
      }
    }
  }, [timepoints, currentWordIndex, findWordIndexLinear, scrollToWord, isPodcastTranscript, dialogueLineRanges, currentDialogueIndex]);

  const updateSentenceHighlighting = (currentTime: number) => {
    const totalDuration = durationRef.current / 1000;
    const progress = totalDuration > 0 ? currentTime / totalDuration : 0;
    const newSentenceIndex = Math.floor(progress * sentences.length);
    const boundedIndex = Math.min(Math.max(0, newSentenceIndex), sentences.length - 1);
    if (boundedIndex !== currentSentenceIndex && boundedIndex >= 0) {
      setCurrentSentenceIndex(boundedIndex);
    }
  };

  const updateDialogueHighlighting = (currentTime: number) => {
    if (!isPodcastTranscript || dialogueSegments.length === 0) {
      return;
    }

    const totalDuration = durationRef.current / 1000;
    if (totalDuration <= 0) {
      return;
    }

    // Dialogue highlighting is now primarily driven by currentWordIndex to
    // match the web implementation. This function remains as a fallback for
    // any non-MFA cases where only segment times are available.
    const effectiveTime = currentTime;

    let newIndex = -1;

    for (let i = 0; i < dialogueSegments.length; i++) {
      const seg = dialogueSegments[i] as { startTime?: number; endTime?: number };
      if (typeof seg.startTime !== 'number') continue;

      const start = seg.startTime;
      const nextSeg = dialogueSegments[i + 1] as { startTime?: number; endTime?: number } | undefined;
      const fallbackEnd = nextSeg && typeof nextSeg.startTime === 'number' ? nextSeg.startTime : totalDuration;
      const end = typeof seg.endTime === 'number' ? seg.endTime : fallbackEnd;

      const margin = 0.15;

      if (effectiveTime + margin >= start && effectiveTime <= end + margin) {
        newIndex = i;
        break;
      }
    }

    // If not found, pick the closest segment by startTime
    if (newIndex === -1) {
      let bestIdx = -1;
      let bestDelta = Number.POSITIVE_INFINITY;
      for (let i = 0; i < dialogueSegments.length; i++) {
        const seg = dialogueSegments[i] as { startTime?: number };
        if (typeof seg.startTime !== 'number') continue;
        const delta = Math.abs(effectiveTime - seg.startTime);
        if (delta < bestDelta) {
          bestDelta = delta;
          bestIdx = i;
        }
      }
      if (bestIdx !== -1) {
        newIndex = bestIdx;
      }
    }

    if (newIndex !== -1 && newIndex !== currentDialogueIndex) {
      setCurrentDialogueIndex(newIndex);
    }
  };

  const handlePlayPause = async () => {
    if (!sound || !isLoaded) {
      console.warn('⚠️ Sound not loaded yet');
      return;
    }

    try {
      if (isPlaying) {
        pauseRequestedRef.current = true;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        highlightTickInFlightRef.current = false;

        if (elapsedTimerRef.current) {
          clearInterval(elapsedTimerRef.current);
          elapsedTimerRef.current = null;
        }
        accumulatedTimeRef.current = elapsedTime;
        setIsPlaying(false);

        try {
          const latest = await sound.getStatusAsync();
          if ((latest as any)?.isLoaded) {
            const latestPos = (latest as any).positionMillis || position;
            pauseFreezePositionMsRef.current = latestPos;
            setPosition(latestPos);
            lastStatusPositionMsRef.current = latestPos;
            lastStatusTsRef.current = Date.now();
          }
        } catch {
          pauseFreezePositionMsRef.current = position;
          lastStatusPositionMsRef.current = position;
          lastStatusTsRef.current = Date.now();
        }

        await sound.pauseAsync();

        setTimeout(async () => {
          try {
            const st = await sound.getStatusAsync();
            if ((st as any)?.isLoaded && (st as any)?.isPlaying) {
              await sound.pauseAsync();
            }
          } catch { }
        }, 150);
      } else {
        console.log('▶️ Playing audio...');
        pauseRequestedRef.current = false;
        pauseFreezePositionMsRef.current = null;
        await sound.playAsync();
        console.log('✅ Audio playing');
        setIsPlaying(true);

        lastStatusPositionMsRef.current = position;
        lastStatusTsRef.current = Date.now();

        // Start elapsed timer
        playStartTimeRef.current = Date.now();
        elapsedTimerRef.current = setInterval(() => {
          const elapsed = Math.floor((Date.now() - playStartTimeRef.current) / 1000);
          setElapsedTime(accumulatedTimeRef.current + elapsed);
        }, 100);
      }
    } catch (error) {
      console.error('Play/Pause error:', error);
      showAlert('Hata', 'Ses çalıştırılırken hata oluştu', [{ text: 'OK', style: 'default' }], 'error-outline', '#EF4444');
    }
  };

  const handleSeek = useCallback(async (positionMs: number, knownWordIndex?: number) => {
    if (!sound) return;
    try {
      console.log(`🎯 [SEEK START] Seeking to ${positionMs}ms (${(positionMs / 1000).toFixed(2)}s)`);

      await sound.setPositionAsync(positionMs);
      setPosition(positionMs);

      if (!isPlaying) {
        pauseFreezePositionMsRef.current = positionMs;
        lastStatusPositionMsRef.current = positionMs;
        lastStatusTsRef.current = Date.now();
      }

      if (knownWordIndex !== undefined) {
        console.log(`🎯 [SEEK] Using known word index ${knownWordIndex}`);
        currentWordIndexRef.current = knownWordIndex;
        if (!isPodcastTranscript) {
          setCurrentWordIndex(knownWordIndex);
          scrollToWord(knownWordIndex);
        } else {
          // For podcast: directly update dialogue index during seek to avoid stale closure issues
          if (dialogueLineRanges.length > 0) {
            const foundRange = dialogueLineRanges.find(r => knownWordIndex >= r.startIndex && knownWordIndex <= r.endIndex);
            const newDialogueIdx = foundRange ? foundRange.lineIndex : -1;
            console.log(`🎯 [SEEK PODCAST] Setting dialogue index to ${newDialogueIdx} for word index ${knownWordIndex}`);
            setCurrentDialogueIndex(newDialogueIdx);
          }
        }
      } else {
        const currentTimeInSeconds = positionMs / 1000;
        if (timepoints && timepoints.length > 0) {
          const newWordIndexInArray = findWordIndexLinear(currentTimeInSeconds, timepoints);
          if (newWordIndexInArray !== -1) {
            const foundWord = timepoints[newWordIndexInArray];
            const globalIndex = typeof foundWord.index === 'number' ? foundWord.index : newWordIndexInArray;
            console.log(`🎯 [SEEK] Seeked to ${currentTimeInSeconds.toFixed(2)}s → Found word array index ${newWordIndexInArray}, global index ${globalIndex}: "${foundWord?.word}" (${foundWord?.timeSeconds.toFixed(2)}s - ${foundWord?.endTimeSeconds?.toFixed(2)}s)`);
            currentWordIndexRef.current = globalIndex;
            if (!isPodcastTranscript) {
              setCurrentWordIndex(globalIndex);
              scrollToWord(globalIndex);
            } else {
              // For podcast: directly update dialogue index during seek to avoid stale closure issues
              if (dialogueLineRanges.length > 0) {
                const foundRange = dialogueLineRanges.find(r => globalIndex >= r.startIndex && globalIndex <= r.endIndex);
                const newDialogueIdx = foundRange ? foundRange.lineIndex : -1;
                console.log(`🎯 [SEEK PODCAST] Setting dialogue index to ${newDialogueIdx} for word index ${globalIndex}`);
                setCurrentDialogueIndex(newDialogueIdx);
              }
            }
          } else {
            console.warn(`⚠️ [SEEK] No word found for time ${currentTimeInSeconds.toFixed(2)}s`);
          }
        }
      }

      // Reset elapsed timer when seeking
      if (isPlaying) {
        playStartTimeRef.current = Date.now();
        accumulatedTimeRef.current = elapsedTime;
      }
    } catch (error) {
      console.error('Seek error:', error);
    }
  }, [sound, timepoints, findWordIndexLinear, scrollToWord, isPlaying, elapsedTime, isPodcastTranscript, dialogueLineRanges, playbackRate]);

  const handleSpeedChange = async () => {
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    const currentIndex = speeds.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % speeds.length;
    const newSpeed = speeds[nextIndex];

    setPlaybackRate(newSpeed);

    if (sound) {
      try {
        await sound.setRateAsync(newSpeed, true);
      } catch (error) {
        // silent in production
      }
    }
  };
  const handleWordPress = useCallback(async (wordIndex: number) => {
    const clickedWord = wordsArray[wordIndex];
    console.log(`📍 [WORD PRESS] Clicked word index: ${wordIndex}, word: "${clickedWord}"`);
    console.log(`📍 [WORD PRESS] Timepoints length: ${timepoints.length}, Words length: ${wordsArray.length}`);

    setCurrentWordIndex(wordIndex);

    const normalize = (w?: string) =>
      (w || '').toLowerCase().replace(/[.,!?;:]/g, '');

    if (timepoints.length > 0) {
      let targetIndex = -1;

      const backendIndex = timepoints.findIndex(tp => typeof tp.index === 'number' && tp.index === wordIndex);
      if (backendIndex !== -1) {
        targetIndex = backendIndex;
        console.log(`📍 [WORD PRESS] Using backend index match: timepoints[${backendIndex}].index=${timepoints[backendIndex].index} for clicked index ${wordIndex}`);
      } else {
        const clickedClean = normalize(clickedWord);
        let bestDistance = Number.POSITIVE_INFINITY;
        const MAX_DISTANCE = 80;

        timepoints.forEach((tp, idx) => {
          if (!tp.word) return;
          const tpClean = normalize(tp.word);
          if (tpClean === clickedClean) {
            const distance = Math.abs(idx - wordIndex);
            if (distance < bestDistance && distance <= MAX_DISTANCE) {
              bestDistance = distance;
              targetIndex = idx;
            }
          }
        });

        if (targetIndex === -1 && timepoints[wordIndex]) {
          targetIndex = wordIndex;
        }
      }

      if (targetIndex === -1) {
        console.warn(`⚠️ [WORD PRESS] No matching timepoint found for word "${clickedWord}" (index ${wordIndex})`);
      } else {
        const timepoint = timepoints[targetIndex];
        const highlightIndex = typeof timepoint.index === 'number' ? timepoint.index : wordIndex;

        console.log(`📍 [WORD PRESS] Using timepoint array index ${targetIndex}, global index ${highlightIndex} for word "${clickedWord}" → "${timepoint.word}" at ${timepoint.timeSeconds.toFixed(2)}s`);

        if (targetIndex > 0) {
          const prevWord = timepoints[targetIndex - 1];
          console.log(`📍 [WORD PRESS] Previous word: "${prevWord.word}" at ${prevWord.timeSeconds.toFixed(2)}s`);
        }
        if (targetIndex > 1) {
          const prevWord2 = timepoints[targetIndex - 2];
          console.log(`📍 [WORD PRESS] 2 words before: "${prevWord2.word}" at ${prevWord2.timeSeconds.toFixed(2)}s`);
        }

        const positionMs = timepoint.timeSeconds * 1000;

        await handleSeek(positionMs, highlightIndex);

        if (sound) {
          const status = await sound.getStatusAsync();
          if (status.isLoaded) {
            const actualPositionMs = status.positionMillis;
            const actualPositionS = actualPositionMs / 1000;
            console.log(`🔊 [AUDIO] Actual position after seek: ${actualPositionS.toFixed(2)}s (expected: ${timepoint.timeSeconds.toFixed(2)}s)`);
          }
        }

        if (!isPlaying && sound) {
          console.log('▶️ [WORD PRESS] Starting playback from clicked word');
          await sound.playAsync();
          setIsPlaying(true);
          playStartTimeRef.current = Date.now();
          accumulatedTimeRef.current = elapsedTime;
        }
      }
    } else {
      console.warn(`⚠️ [WORD PRESS] No timepoints available, using fallback estimation`);
      const totalDuration = duration / 1000;
      if (totalDuration > 0 && wordsArray.length > 0) {
        const estimatedTime = (wordIndex / wordsArray.length) * totalDuration;
        const positionMs = estimatedTime * 1000;
        console.log(`📍 [WORD PRESS] Estimated time: ${estimatedTime.toFixed(2)}s`);
        await handleSeek(positionMs, wordIndex);

        if (!isPlaying && sound) {
          await sound.playAsync();
          setIsPlaying(true);
          playStartTimeRef.current = Date.now();
          accumulatedTimeRef.current = elapsedTime;
        }
      }
    }
  }, [wordsArray, timepoints, duration, handleSeek, isPlaying, sound, elapsedTime]);

  const handleWordLongPress = useCallback(async (word: string, wordIndex: number) => {
    const cleanWord = word.replace(/[.,!?;:]/g, ''); // Remove punctuation

    // CASE 1: Kelime bu kullanıcı için zaten vocabulary + user_vocabulary'de kayıtlıysa
    // doğrudan anlam popup'ı göster ve "Kelime Ekle" opsiyonu sunma
    try {
      const result = await lookupVocabularyWord(cleanWord);
      if (result.found && result.data && result.hasUserWord) {
        const w = result.data;

        setWordPopup({
          mode: 'info',
          word: cleanWord,
          data: w,
        });
        await loadPronunciation(cleanWord);
        return;
      }
    } catch (err) {
      console.error('Error during vocabulary lookup on long press:', err);
      // Hata durumunda normal seçenekli diyaloğa devam et
    }

    // CASE 2 & 3: Kullanıcı için kelime kaydı yoksa - confirm popup ile onay al
    // showAlert yerine wordPopup state kullanarak Modal içinde göster
    setWordPopup({
      mode: 'confirm',
      word: cleanWord,
      data: { wordIndex },
    });
  }, [language, loadPronunciation]);

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Custom close handler - hides Skia first to prevent iOS freeze
  const handleSafeClose = useCallback(() => {
    perfLog.mark('audioPlayer:safeClose:start');
    // First hide Skia components
    setIsClosing(true);
    // Wait for next frame to ensure Skia is unmounted, then close modal
    requestAnimationFrame(() => {
      setTimeout(() => {
        onClose();
        perfLog.mark('audioPlayer:safeClose:afterOnClose');
      }, 50);
    });
  }, [onClose]);

  const renderHighlightedText = () => {
    console.log(`🎨 [AudioPlayer] renderHighlightedText - showPatterns: ${showPatterns}, level: ${track.level}, isClosing: ${isClosing}`);

    // Don't render Skia components when closing to prevent iOS freeze
    if (isClosing) {
      return (
        <View style={{ padding: 16 }}>
          <Text style={{ color: '#666', textAlign: 'center' }}>...</Text>
        </View>
      );
    }

    // Always render word/sentence highlighting (Skia-based)
    if (highlightMode === 'word') {
      return renderWordHighlighting;
    } else {
      return renderSentenceHighlighting;
    }

    // Note: Pattern highlighting is currently disabled because it conflicts with Skia rendering
    // TODO: Integrate pattern highlighting into Skia components for better performance
  };

  // Memoize individual word components for better performance
  const WordComponent = React.memo(({ word, index, isHighlighted }: { word: string; index: number; isHighlighted: boolean }) => {
    let lastTap = 0;
    let tapTimeout: NodeJS.Timeout;

    const handleTap = () => {
      const now = Date.now();
      const DOUBLE_TAP_DELAY = 300;

      if (lastTap && now - lastTap < DOUBLE_TAP_DELAY) {
        clearTimeout(tapTimeout);
        handleWordLongPress(word, index);
        lastTap = 0;
      } else {
        lastTap = now;
        tapTimeout = setTimeout(() => {
          handleWordPress(index);
          lastTap = 0;
        }, DOUBLE_TAP_DELAY);
      }
    };

    return (
      <TouchableOpacity
        ref={(ref) => {
          if (ref) {
            wordRefs.current.set(index, ref);
          }
        }}
        onPress={handleTap}
        onLongPress={() => handleWordLongPress(word, index)}
        style={[
          styles.wordContainer,
          isHighlighted && styles.highlightedWord
        ]}
        delayLongPress={300}
      >
        <Text
          style={[
            styles.word,
            isHighlighted && styles.highlightedWordText
          ]}
        >
          {word}
        </Text>
      </TouchableOpacity>
    );
  });

  // Calculate pattern data with full info
  const patternData = useMemo(() => {
    console.log(`🎨 [AudioPlayer] Calculating pattern data - showPatterns: ${showPatterns}, patterns.length: ${patterns.length}`);

    if (!showPatterns || patterns.length === 0) {
      console.log(`⚠️ [AudioPlayer] No patterns to highlight`);
      return [];
    }

    const data = patterns.map(p => ({
      pattern: p.pattern.toLowerCase().trim(),
      type: p.type || 'pattern',
      // Use new backend field names, fallback to old names for backward compatibility
      translation: p.translation || p.pattern_tr || '',
      example_text: p.example_text || p.example_sentence || '',
      example_translation: p.example_translation || p.example_sentence_tr || '',
      level: p.level || ''
    }));

    console.log(`🎨 [AudioPlayer] Total pattern data: ${data.length}`);
    return data;
  }, [showPatterns, patterns]);

  const renderWordHighlighting = useMemo(() => {
    console.log(`🔄 [AudioPlayer] renderWordHighlighting useMemo - showPatterns: ${showPatterns}, patternData.length: ${patternData.length}`);
    return (
      <SkiaWordHighlight
        words={wordsArray}
        currentWordIndex={currentWordIndex}
        selectedWords={selectedWords}
        fontSize={16}
        lineHeight={28}
        containerWidth={screenWidth - 32}
        scrollOffsetRef={scrollOffsetRef}
        onWordPress={handleWordPress}
        onWordLongPress={handleWordLongPress}
        mode="word"
        onWordPositionChange={handleWordPositionChange}
        patternData={patternData}
        showPatterns={showPatterns}
        visible={visible}
      />
    );

    // SKIA VERSION (disabled for debugging)
    // return (
    //   <SkiaWordHighlight
    //     words={wordsArray}
    //     currentWordIndex={currentWordIndex}
    //     selectedWords={selectedWords}
    //     fontSize={16}
    //     lineHeight={28}
    //     containerWidth={screenWidth - 32}
    //     scrollOffsetRef={scrollOffsetRef}
    //     onWordPress={handleWordPress}
    //     onWordLongPress={handleWordLongPress}
    //     mode="word"
    //   />
    // );
  }, [wordsArray, currentWordIndex, selectedWords, handleWordPress, handleWordLongPress, patternData, showPatterns, visible]);

  const handleSentencePressCallback = useCallback((sentenceIndex: number, sentenceText: string) => {
    const totalDuration = duration / 1000;
    if (totalDuration > 0) {
      const sentenceProgress = sentenceIndex / sentences.length;
      const targetTime = sentenceProgress * totalDuration;
      const positionMs = targetTime * 1000;
      handleSeek(positionMs);
    }
  }, [duration, sentences.length, handleSeek]);

  const renderSentenceHighlighting = useMemo(() => {
    return (
      <SkiaSentenceHighlight
        sentences={sentences}
        currentSentenceIndex={currentSentenceIndex}
        selectedWords={selectedWords}
        fontSize={16}
        lineHeight={28}
        containerWidth={screenWidth - 32}
        onSentencePress={handleSentencePressCallback}
        onWordLongPress={handleWordLongPress}
        visible={visible}
      />
    );
  }, [sentences, currentSentenceIndex, selectedWords, handleSentencePressCallback, handleWordLongPress, visible]);

  const handleDialoguePress = useCallback((index: number) => {
    if (!dialogueSegments || dialogueSegments.length === 0) {
      return;
    }

    const seg = dialogueSegments[index] as { startTime?: number };
    const totalDuration = durationRef.current / 1000;
    if (totalDuration <= 0) {
      return;
    }

    let targetTime: number;

    if (typeof seg.startTime === 'number') {
      targetTime = seg.startTime;
    } else {
      const progress = dialogueSegments.length > 1 ? index / dialogueSegments.length : 0;
      targetTime = progress * totalDuration;
    }

    const positionMs = targetTime * 1000;
    handleSeek(positionMs);
  }, [dialogueSegments, handleSeek]);

  // Moved to PodcastDialogueView component

  // Inner content - rendered with or without Modal wrapper based on asScreen prop
  const playerContent = (
      <View style={[styles.container, { paddingTop: insets.top + 56 }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(8, insets.top + 8) }]}>
          <TouchableOpacity
            onPress={handleSafeClose}
            style={styles.closeButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Kapat"
          >
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>

          {/* Show Original Text toggle - works for both podcast and text content */}
          {enableTour ? (
            <CopilotStep order={1} name="playerOriginalToggle" text={AUDIOPLAYER_TOUR_STEPS.playerOriginalToggle[lang]}>
              <WalkthroughableView>
                <TouchableOpacity
                  style={[styles.originalToggleButton, showOriginal ? styles.originalToggleButtonOn : styles.originalToggleButtonOff]}
                  onPress={() => {
                    setShowOriginal(prev => !prev);
                    if (!isPodcastTranscript) {
                      if (!showOriginal) {
                        horizontalScrollRef.current?.scrollTo({ x: screenWidth, animated: true });
                        setPageIndex(1);
                      } else {
                        horizontalScrollRef.current?.scrollTo({ x: 0, animated: true });
                        setPageIndex(0);
                      }
                    }
                  }}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text style={[styles.originalToggleButtonText, showOriginal ? styles.originalToggleButtonTextOn : styles.originalToggleButtonTextOff]}>
                    {isPodcastTranscript ? 'Show Original Text' : t('audioPlayer.originalTextButton')}
                  </Text>
                  {isPodcastTranscript && (
                    <View style={[styles.originalTogglePill, showOriginal ? styles.originalTogglePillOn : styles.originalTogglePillOff]}>
                      <View style={[styles.originalToggleKnob, showOriginal ? styles.originalToggleKnobOn : styles.originalToggleKnobOff]} />
                    </View>
                  )}
                </TouchableOpacity>
              </WalkthroughableView>
            </CopilotStep>
          ) : (
            <TouchableOpacity
              style={[styles.originalToggleButton, showOriginal ? styles.originalToggleButtonOn : styles.originalToggleButtonOff]}
              onPress={() => {
                setShowOriginal(prev => !prev);
                if (!isPodcastTranscript) {
                  if (!showOriginal) {
                    horizontalScrollRef.current?.scrollTo({ x: screenWidth, animated: true });
                    setPageIndex(1);
                  } else {
                    horizontalScrollRef.current?.scrollTo({ x: 0, animated: true });
                    setPageIndex(0);
                  }
                }
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={[styles.originalToggleButtonText, showOriginal ? styles.originalToggleButtonTextOn : styles.originalToggleButtonTextOff]}>
                {isPodcastTranscript ? 'Show Original Text' : t('audioPlayer.originalTextButton')}
              </Text>
              {isPodcastTranscript && (
                <View style={[styles.originalTogglePill, showOriginal ? styles.originalTogglePillOn : styles.originalTogglePillOff]}>
                  <View style={[styles.originalToggleKnob, showOriginal ? styles.originalToggleKnobOn : styles.originalToggleKnobOff]} />
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Extra floating close button to guarantee tappable area */}
        <TouchableOpacity
          onPress={handleSafeClose}
          style={[
            styles.floatingClose,
            { top: Math.max(12, insets.top + 6) }
          ]}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          accessibilityRole="button"
          accessibilityLabel="Kapat"
        >
          <Icon name="close" size={22} color="#333" />
        </TouchableOpacity>

        {/* Swipeable pages: current EN on page 0, original TR on page 1 */}
        {/* For podcast content, horizontal scroll is disabled - original text shown inline in bubbles */}
        <ScrollView
          ref={horizontalScrollRef}
          horizontal
          pagingEnabled
          scrollEnabled={!isPodcastTranscript}
          showsHorizontalScrollIndicator={false}
          directionalLockEnabled={true}
          scrollEventThrottle={16}
          onMomentumScrollEnd={async (e) => {
            const idx = Math.round((e.nativeEvent.contentOffset.x || 0) / screenWidth);
            setPageIndex(idx);
            if (idx === 1 && !originalText && !originalLoading) {
              // Önce notification'dan gelen track.original_turkish'i kullanmayı dene
              if (track.original_turkish) {
                console.log('[AudioPlayer] Using track.original_turkish for originalText on first open:', {
                  id: track.id,
                  length: track.original_turkish.length,
                });
                setOriginalText(track.original_turkish);
                return;
              }

              // Eğer track.original_turkish yoksa, backend'den içeriği çekmeye çalış
              try {
                setOriginalLoading(true);
                const res = await getUserContentById(track.id);
                if ((res as any)?.success && (res as any)?.data?.input) {
                  setOriginalText((res as any).data.input);
                }
              } catch (err) {
                // silent in production
              } finally {
                setOriginalLoading(false);
              }
            }
          }}
          style={{ flex: 1 }}
        >
          <View style={{ width: screenWidth, flex: 1 }}>
            <ScrollView
              ref={scrollViewRef}
              style={[styles.scrollContainer, { paddingTop: 8, width: '100%' }]}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              scrollEventThrottle={16}
              removeClippedSubviews={false}
              bounces={true}
              onLayout={(event) => {
                const { height } = event.nativeEvent.layout;
                setTextViewportHeight(height);
              }}
              onScroll={(event) => {
                const offsetY = event.nativeEvent.contentOffset.y;
                scrollOffsetRef.current = offsetY;
                if (Math.floor(offsetY) % 100 === 0) {
                  console.log(`📜 [SCROLL] Offset: ${offsetY.toFixed(0)}px`);
                }
              }}
            >
              <View style={styles.textWrapper}>
                {pageIndex === 0 && (
                  isPodcastTranscript
                    ? <PodcastDialogueView
                        dialogueSegments={dialogueSegments}
                        originalDialogueSegments={originalDialogueSegments}
                        currentDialogueIndex={currentDialogueIndex}
                        showOriginal={showOriginal}
                        wordsArray={wordsArray}
                        dialogueLineRanges={dialogueLineRanges}
                        onDialoguePress={handleDialoguePress}
                        onWordLongPress={handleWordLongPress}
                        language={lang}
                        dialogueRefs={dialogueRefs}
                      />
                    : renderHighlightedText()
                )}
              </View>
            </ScrollView>
          </View>
          <View style={{ width: screenWidth, flex: 1 }}>
            <ScrollView
              style={[styles.scrollContainer, { paddingTop: 8, width: '100%' }]}
              contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16 }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              scrollEventThrottle={16}
              removeClippedSubviews={false}
              bounces={true}
            >
              <Pressable>
                <View style={styles.originalHeader}>
                  <Text style={styles.originalTitle}>
                    {t('audioPlayer.originalTurkishTitle')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      if (copiedFeedback) return;
                      perfLog.mark('copy:start');
                      const textToCopy = originalText || track.original_turkish || '';
                      if (textToCopy) {
                        Clipboard.setString(textToCopy);
                        perfLog.mark('copy:end');
                        setCopiedFeedback(true);
                        setTimeout(() => setCopiedFeedback(false), 1500);
                      }
                    }}
                    style={styles.copyButton}
                  >
                    <Icon
                      name={copiedFeedback ? 'check-circle' : 'content-copy'}
                      size={20}
                      color={copiedFeedback ? '#10B981' : COLORS.primary}
                    />
                  </TouchableOpacity>
                </View>
                {originalLoading ? (
                  <Text style={styles.originalText}>
                    {t('audioPlayer.originalLoading')}
                  </Text>
                ) : (
                  <Text style={styles.originalText}>{originalText || track.original_turkish || '—'}</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </ScrollView>

        {/* Controls */}
        <PlaybackControls
          isPlaying={isPlaying}
          isLoading={isLoading}
          duration={duration}
          position={position}
          playbackRate={playbackRate}
          isTestEnvironment={isTestEnvironment}
          manualSeconds={manualSeconds}
          manualMillis={manualMillis}
          wordsArray={wordsArray}
          sentences={sentences}
          currentSentenceIndex={currentSentenceIndex}
          enableTour={enableTour}
          tourSteps={AUDIOPLAYER_TOUR_STEPS}
          lang={lang}
          level={track.level}
          onPlayPause={handlePlayPause}
          onSpeedChange={handleSpeedChange}
          onSeek={handleSeek}
          onManualSecondsChange={setManualSeconds}
          onManualMillisChange={setManualMillis}
          onInfoPress={() => showAlert(
            'Bilgi',
            `Kelime sayısı: ${wordsArray.length}\nSüre: ${formatTime(duration)}\nCümle sayısı: ${sentences.length}\nAktif cümle: ${currentSentenceIndex + 1}`,
            [{ text: 'OK', style: 'default' }],
            'info-outline',
            '#3B82F6'
          )}
        />

        {/* Word info popup */}
        <WordPopupModal
          visible={visible}
          wordPopup={wordPopup}
          language={lang}
          wordsArray={wordsArray}
          textToHighlight={textToHighlight}
          onClose={() => setWordPopup(null)}
          onWordAdded={(word) => setSelectedWords(prev => new Set([...prev, word]))}
        />
      </View>
  );

  // When used as a screen (via React Navigation), render without Modal wrapper
  if (asScreen) {
    return playerContent;
  }

  // When used as a modal component, wrap in Modal
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleSafeClose}
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onDismiss={() => perfLog.mark('modal:onDismiss')}
    >
      {playerContent}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 10,
    elevation: 6,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  linkText: {
    color: COLORS.primary,
    textDecorationLine: 'underline',
    fontSize: 13,
    marginLeft: 8,
  },
  closeButton: {
    marginRight: 12,
  },
  patternToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    gap: 4,
  },
  patternToggleActive: {
    backgroundColor: '#FFD700',
  },
  patternToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  patternToggleTextActive: {
    color: '#333',
  },
  patternListContainer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#FFD700',
    backgroundColor: '#FFFEF0',
    borderRadius: 8,
    padding: 16,
  },
  patternListTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  centerBadge: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  originalTextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
  },
  originalTextButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  originalToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginLeft: 'auto',
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  originalToggleButtonOn: {
    backgroundColor: COLORS.accent,
    opacity: 1,
  },
  originalToggleButtonOff: {
    backgroundColor: COLORS.accent,
    opacity: 0.35,
  },
  originalToggleButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  originalToggleButtonTextOn: {
    color: COLORS.accentForeground,
  },
  originalToggleButtonTextOff: {
    color: COLORS.accentForeground,
  },
  originalTogglePill: {
    width: 36,
    height: 20,
    borderRadius: 999,
    padding: 2,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  originalTogglePillOn: {
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  originalTogglePillOff: {
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  originalToggleKnob: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.accentForeground,
  },
  originalToggleKnobOn: {
    alignSelf: 'flex-end',
  },
  originalToggleKnobOff: {
    alignSelf: 'flex-start',
  },
  originalBox: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  originalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  originalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  copyButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  originalText: {
    fontSize: 16,
    lineHeight: 28,
    color: '#374151',
    textAlign: 'justify',
    letterSpacing: 0.3,
  },
  levelBadge: {
    backgroundColor: COLORS.brandOrange,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  levelBadgeBottom: {
    backgroundColor: COLORS.brandOrange,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    minWidth: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.brandOrange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  levelText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  scrollContainer: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 0,
  },
  textWrapper: {
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  textContainer: {
    paddingHorizontal: 16,
    width: '100%',
  },
  wordsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  wordWrapper: {
    marginRight: 4,
    marginBottom: 4,
  },
  wordTouchable: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  highlightedWordTouchable: {
    backgroundColor: COLORS.accent,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  justifiedText: {
    width: '100%',
    lineHeight: 36,
    fontSize: 16,
    color: '#333',
  },
  inlineWord: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  inlineHighlightedWord: {
    color: '#fff',
    fontWeight: '600',
  },
  wordContainer: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    marginVertical: 2,
    minWidth: 'auto',
  },
  highlightedWord: {
    backgroundColor: COLORS.accent,
    borderRadius: 4,
  },
  word: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    textAlign: 'left',
  },
  highlightedWordText: {
    color: '#fff',
    fontWeight: '600',
  },
  sentenceContainer: {
    marginBottom: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    position: 'relative',
    minHeight: 0,
  },
  highlightedSentence: {
    backgroundColor: 'rgba(76, 175, 80, 0.25)',
    borderColor: COLORS.primary,
    borderWidth: 3,
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
    transform: [{ scale: 1.02 }],
  },
  sentence: {
    fontSize: 16,
    color: '#333',
    lineHeight: 20,
  },
  highlightedSentenceText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  sentenceWordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  wordInSentence: {
    marginHorizontal: 0,
    marginVertical: 0,
  },
  selectedWord: {
    backgroundColor: '#FFD700', // Sarı arka plan
    borderRadius: 4,
    paddingHorizontal: 2,
    paddingVertical: 1,
  },
  selectedWordText: {
    color: '#333',
    fontWeight: '600',
  },
  floatingClose: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 10,
  },
});

export default AudioPlayer; 