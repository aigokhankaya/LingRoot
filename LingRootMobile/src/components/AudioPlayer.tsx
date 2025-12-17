import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  ScrollView,
  PanResponder,
  ActivityIndicator,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Replaced expo-av with our TrackPlayer-based service
import { createSound } from '../services/audioService';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AudioTrack, Timepoint } from '../types';
import { useAudioContext } from '../contexts/AudioContext';
import { addWordToVocabulary, addWordWithTranslation, apiService } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { SkiaWordHighlight } from './SkiaWordHighlight';
import { SkiaSentenceHighlight } from './SkiaSentenceHighlight';
import { getEnvironmentConfig } from '../services/environmentConfig';
import { COLORS } from '../theme/colors';

interface AudioPlayerProps {
  track: AudioTrack;
  visible: boolean;
  onClose: () => void;
  timepoints?: Timepoint[];
  words?: string[];
  initialHighlightMode?: 'word' | 'sentence';
}

const { width: screenWidth } = Dimensions.get('window');

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  track,
  visible,
  onClose,
  timepoints = [],
  words = [],
  initialHighlightMode = 'word',
}) => {
  const insets = useSafeAreaInsets();
  const { language, t } = useLanguage();
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
  const [showPatterns, setShowPatterns] = useState(false); // Toggle pattern highlighting
  const [patterns, setPatterns] = useState<Array<{ 
    pattern: string; 
    meaning?: string;
    pattern_tr?: string;
    example_sentence?: string;
    example_sentence_tr?: string;
  }>>([]);
  const [loadingPatterns, setLoadingPatterns] = useState(false);
  
  // Debug: Log showPatterns changes
  useEffect(() => {
    console.log(`🎨 [AudioPlayer] showPatterns changed to: ${showPatterns}`);
    if (showPatterns && patterns.length === 0) {
      loadPatterns();
    }
  }, [showPatterns]);
  
  // Load patterns from backend
  const loadPatterns = async () => {
    if (loadingPatterns || !textToHighlight || !track.level) return;
    
    try {
      setLoadingPatterns(true);
      console.log(`🔍 [AudioPlayer] Loading patterns for level: ${track.level}`);
      
      const apiUrl = await getEnvironmentConfig().then(config => config.baseUrl);
      const token = await AsyncStorage.getItem('auth_token') || await AsyncStorage.getItem('userToken');
      
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
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  
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
      const result = await apiService.lookupVocabularyWord(cleanWord);

      if (!result.found || !result.data) {
        Alert.alert(
          language === 'tr' ? 'Bilgi' : 'Info',
          language === 'tr'
            ? `"${cleanWord}" kelimesi için henüz sözlük kaydı bulunamadı.\n\nBu kelimeyi kelime listenize ekleyebilirsiniz.`
            : `There is no dictionary entry yet for "${cleanWord}".\n\nYou can add this word to your vocabulary list.`,
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
    } catch (error: any) {
      Alert.alert(
        language === 'tr' ? 'Hata' : 'Error',
        language === 'tr'
          ? `Kelime bilgisi yüklenirken hata oluştu: ${error?.message || 'Bilinmeyen hata'}`
          : `An error occurred while loading word info: ${error?.message || 'Unknown error'}`,
      );
    }
  }, [language, loadPronunciation]);
  const [addingWord, setAddingWord] = useState(false); // Loading state for adding word
  const [addingWordText, setAddingWordText] = useState(''); // Text to show while adding
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
  const latestWordPositionRef = useRef<{ top: number; bottom: number; height: number } | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
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
    const wordsArray = words.length > 0 ? words : textToHighlight.split(' ');
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
          const visibleBottom = currentScroll + textViewportHeight;
          const bottomTrigger = visibleBottom - 40;
          const rowBottom = y + h;

          if (rowBottom < bottomTrigger) {
            return;
          }

          lastAutoScrollTsRef.current = now;
          const alignPadding = 16;
          const desiredOffset = Math.max(0, y - alignPadding);
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
      // Reset states when modal closes but DON'T unload audio
      setIsLoaded(false);
      setDuration(0);
      setPosition(0);
      setCurrentWordIndex(-1);
      setCurrentSentenceIndex(-1);
      setCurrentDialogueIndex(-1);
      setSelectedWords(new Set()); // Seçilen kelimeleri temizle
      
      // Reset refs as well
      durationRef.current = 0;
      isLoadedRef.current = false;
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
      console.log(`🎵 [AUDIO LOAD] Loading audio from URL: ${track.url}`);
      console.log(`🎵 [AUDIO LOAD] Track ID: ${track.id}, Title: ${track.adapted_text?.substring(0, 50)}...`);
      
      // Create TrackPlayer-backed sound
      const newSound = await createSound(track.url);
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
      Alert.alert('Hata', `Ses dosyası yüklenirken hata oluştu: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      if (!pauseRequestedRef.current) {
        setPosition(status.positionMillis || 0);
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
    const visibleBottom = currentScroll + textViewportHeight;
    const alignPadding = 16; // Small offset so text isn't glued to the top
    const bottomTrigger = visibleBottom - alignPadding;

    if (position.bottom < bottomTrigger) {
      return; // Highlight still comfortably inside viewport
    }

    const desiredOffset = Math.max(0, position.top - alignPadding);

    // Avoid micro-adjustments that cause oscillation
    if (Math.abs(desiredOffset - currentScroll) < 4) {
      return;
    }

    const now = Date.now();
    if (now - lastAutoScrollTsRef.current < 150) {
      return; // Throttle auto-scroll updates
    }
    lastAutoScrollTsRef.current = now;

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
          } catch {}
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
      Alert.alert('Hata', 'Ses çalıştırılırken hata oluştu');
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
      
      // CRITICAL: Verify actual position after seek
      const statusImmediate = await sound.getStatusAsync();
      if (statusImmediate.isLoaded) {
        const immediatePosition = statusImmediate.positionMillis;
        console.log(`🔊 [AUDIO IMMEDIATE] Position right after seek: ${(immediatePosition / 1000).toFixed(2)}s (expected: ${(positionMs / 1000).toFixed(2)}s)`);
      }
      
      // CRITICAL: Wait 500ms and check again - audio buffer might need time
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const statusDelayed = await sound.getStatusAsync();
      if (statusDelayed.isLoaded) {
        const delayedPosition = statusDelayed.positionMillis;
        console.log(`🔊 [AUDIO DELAYED] Position after 500ms: ${(delayedPosition / 1000).toFixed(2)}s (expected: ${(positionMs / 1000).toFixed(2)}s)`);
        
        if (Math.abs(delayedPosition - positionMs) > 500) {
          console.error(`❌ [SEEK ERROR] Position mismatch after 500ms! Expected ${(positionMs / 1000).toFixed(2)}s but got ${(delayedPosition / 1000).toFixed(2)}s (diff: ${Math.abs(delayedPosition - positionMs)}ms)`);
        }
      }
      
      if (knownWordIndex !== undefined) {
        console.log(`🎯 [SEEK] Using known word index ${knownWordIndex}`);
        currentWordIndexRef.current = knownWordIndex;
        if (!isPodcastTranscript) {
          setCurrentWordIndex(knownWordIndex);
          scrollToWord(knownWordIndex);
        } else {
          updateWordHighlighting(positionMs / 1000);
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
              updateWordHighlighting(currentTimeInSeconds);
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
  }, [sound, timepoints, findWordIndexLinear, scrollToWord, isPlaying, elapsedTime, isPodcastTranscript, updateWordHighlighting]);

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

  const handleAddWordToVocabulary = useCallback(async (word: string, wordIndex: number) => {
    const cleanWord = word.replace(/[.,!?;:]/g, ''); // Remove punctuation
    
    // Show loading state
    setAddingWord(true);
    setAddingWordText(language === 'tr' ? `"${cleanWord}" kelimesi ekleniyor...` : `Adding "${cleanWord}"...`);
    
    try {
      // Create context from surrounding words or text
      let context = '';
      let originalSentence = '';
      if (wordsArray.length > 0 && wordIndex >= 0 && wordIndex < wordsArray.length) {
        const startIndex = Math.max(0, wordIndex - 5);
        const endIndex = Math.min(wordsArray.length, wordIndex + 6);
        const contextWords = wordsArray.slice(startIndex, endIndex);
        context = contextWords.join(' ');
      } else {
        // Fallback: use text around the word
        const textToSearch = textToHighlight.toLowerCase();
        const wordPos = textToSearch.indexOf(cleanWord.toLowerCase());
        if (wordPos >= 0) {
          const start = Math.max(0, wordPos - 50);
          const end = Math.min(textToHighlight.length, wordPos + 50);
          context = textToHighlight.substring(start, end);
        } else {
          context = `The word "${cleanWord}" appears in an English text.`;
        }
      }

      // Find original sentence
      const sentences = textToHighlight.split(/[.!?;]+/).map(s => s.trim()).filter(s => s.length > 5);
      originalSentence = sentences.find(sentence => 
        sentence.toLowerCase().includes(cleanWord.toLowerCase())
      ) || context;

      // Call the real API with translation (like web version)
      const result = await addWordWithTranslation(
        cleanWord,
        context, // Context for AI translation
        '', // Level boş - OpenAI otomatik belirleyecek
        originalSentence
      );

      // Add word to selected words set for UI feedback
      setSelectedWords(prev => new Set([...prev, cleanWord.toLowerCase()]));

      // Show detailed success message like web version
      if (result.isExisting) {
        Alert.alert(
          language === 'tr' ? 'Bilgi!' : 'Info!',
          language === 'tr'
            ? `"${cleanWord}" kelimesi zaten kelime listenizdedir:\n\nAnlam: ${result.data.definition || 'Belirtilmemiş'}\nÖrnek: ${result.data.example_sentence || 'Belirtilmemiş'}`
            : `"${cleanWord}" is already in your vocabulary list:\n\nMeaning: ${result.data.definition || 'Not specified'}\nExample: ${result.data.example_sentence || 'Not specified'}`,
          [{ text: language === 'tr' ? 'Tamam' : 'OK' }]
        );
      } else if (result.translationError) {
        Alert.alert(
          language === 'tr' ? 'Uyarı!' : 'Warning!',
          language === 'tr'
            ? `"${cleanWord}" kelimesi eklendi ancak çeviri yapılamadı. Anlamı manuel olarak ekleyebilirsiniz.`
            : `"${cleanWord}" was added but translation failed. You can add the meaning manually.`,
          [{ text: language === 'tr' ? 'Tamam' : 'OK' }]
        );
      } else {
        Alert.alert(
          language === 'tr' ? 'Başarılı!' : 'Success!',
          language === 'tr'
            ? `"${cleanWord}" kelimesi başarıyla eklendi!\n\nAnlam: ${result.data.definition}\nÖrnek Cümle: ${result.data.example_sentence}\nSeviye: ${result.data.level}`
            : `"${cleanWord}" was successfully added!\n\nMeaning: ${result.data.definition}\nExample: ${result.data.example_sentence}\nLevel: ${result.data.level}`,
          [{ text: language === 'tr' ? 'Tamam' : 'OK' }]
        );
      }
      
    } catch (error: any) {
      if (error.message?.includes('zaten listede mevcut')) {
        Alert.alert(
          language === 'tr' ? 'Bilgi' : 'Info',
          language === 'tr'
            ? `"${cleanWord}" kelimesi zaten kelime listenizdedir.`
            : `"${cleanWord}" is already in your vocabulary list.`
        );
      } else {
        Alert.alert(
          language === 'tr' ? 'Hata' : 'Error',
          language === 'tr'
            ? `Kelime eklenirken bir hata oluştu: ${error.message || 'Lütfen internet bağlantınızı kontrol edin.'}`
            : `An error occurred while adding the word: ${error.message || 'Please check your internet connection.'}`
        );
      }
    } finally {
      // Hide loading state
      setAddingWord(false);
      setAddingWordText('');
    }
  }, [wordsArray, textToHighlight, language]);

  const handleWordLongPress = useCallback(async (word: string, wordIndex: number) => {
    const cleanWord = word.replace(/[.,!?;:]/g, ''); // Remove punctuation

    // CASE 1: Kelime bu kullanıcı için zaten vocabulary + user_vocabulary'de kayıtlıysa
    // doğrudan anlam popup'ı göster ve "Kelime Ekle" opsiyonu sunma
    try {
      const result = await apiService.lookupVocabularyWord(cleanWord);
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

    // CASE 2 & 3: Kullanıcı için kelime kaydı yoksa - web ile aynı mantıkta kısa bir onay sor
    Alert.alert(
      language === 'tr' ? 'Kelime Ekle' : 'Add Word',
      language === 'tr'
        ? `"${cleanWord}" kelimesini kelime listenize eklemek istiyor musunuz?`
        : `Do you want to add "${cleanWord}" to your vocabulary list?`,
      [
        {
          text: language === 'tr' ? 'İptal' : 'Cancel',
          style: 'cancel',
        },
        {
          text: language === 'tr' ? 'Kelimeyi Ekle' : 'Add Word',
          style: 'default',
          onPress: () => handleAddWordToVocabulary(cleanWord, wordIndex),
        },
      ],
    );
  }, [language, handleAddWordToVocabulary, loadPronunciation]);

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderHighlightedText = () => {
    console.log(`🎨 [AudioPlayer] renderHighlightedText - showPatterns: ${showPatterns}, level: ${track.level}`);
    
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
      pattern_tr: p.pattern_tr || '',
      example_sentence: p.example_sentence || '',
      example_sentence_tr: p.example_sentence_tr || ''
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
  }, [wordsArray, currentWordIndex, selectedWords, handleWordPress, handleWordLongPress, patternData, showPatterns]);

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
      />
    );
  }, [sentences, currentSentenceIndex, selectedWords, handleSentencePressCallback, handleWordLongPress]);

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

  const renderPodcastDialogues = () => {
    if (!dialogueSegments || dialogueSegments.length === 0) {
      return (
        <Text style={styles.podcastFallbackText}>
          {language === 'tr' ? 'Podcast metni bulunamadı.' : 'Podcast transcript is not available.'}
        </Text>
      );
    }

    return (
      <View style={styles.podcastDialoguesContainer}>
        {dialogueSegments.map((segment, index) => {
          const isActive = index === currentDialogueIndex;
          const speakerKey = (segment.speaker || '').toUpperCase();
          const isRight = speakerKey === 'B';
          const speakerLabel = (segment as any).speakerLabel
            ? (segment as any).speakerLabel
            : segment.speaker
            ? `Speaker ${speakerKey}`
            : language === 'tr'
            ? 'Anlatıcı'
            : 'Narrator';

          return (
            <View
              key={`${index}-${speakerKey}-${segment.content.slice(0, 10)}`}
              ref={(ref) => {
                if (ref) {
                  dialogueRefs.current.set(index, ref);
                }
              }}
              style={[
                styles.podcastDialogueRow,
                isRight ? styles.podcastDialogueRowRight : styles.podcastDialogueRowLeft,
              ]}
            >
              <View
                style={[
                  styles.podcastBubble,
                  isRight ? styles.podcastBubbleRight : styles.podcastBubbleLeft,
                  isActive && styles.podcastBubbleActive,
                ]}
              >
                <Text style={[styles.podcastSpeakerLabel, isRight && styles.podcastSpeakerLabelRight]}>
                  {speakerLabel}
                </Text>
                <TouchableOpacity activeOpacity={0.8} onPress={() => handleDialoguePress(index)}>
                  <Text
                    style={[
                      styles.podcastBubbleText,
                      isRight && styles.podcastBubbleTextRight,
                    ]}
                  >
                    {segment.content
                      .split(/\s+/)
                      .filter(word => word.length > 0)
                      .map((word, wordIndex, arr) => {
                        const range = dialogueLineRanges.find(r => r.lineIndex === index);
                        let globalIndex = range ? range.startIndex + wordIndex : -1;
                        if (globalIndex < 0 || globalIndex >= wordsArray.length) {
                          globalIndex = wordIndex;
                        }
                        return (
                          <Text
                            key={`${index}-${wordIndex}`}
                            onLongPress={() => handleWordLongPress(word, globalIndex)}
                          >
                            {word}
                            {wordIndex < arr.length - 1 ? ' ' : ''}
                          </Text>
                        );
                      })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const progressPercentage = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      transparent
    >
      <View style={[styles.container, { paddingTop: insets.top + 56 }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(8, insets.top + 8) }]}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Kapat"
          >
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>
          {isTestEnvironment && (
            <View style={styles.centerBadge}>
              <TouchableOpacity
                onPress={() => {
                  console.log(`🔄 [AudioPlayer] Toggling patterns: ${showPatterns} -> ${!showPatterns}, pageIndex: ${pageIndex}`);
                  setShowPatterns(!showPatterns);
                }}
                style={[styles.patternToggle, showPatterns && styles.patternToggleActive]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="highlight" size={18} color={showPatterns ? '#FFF' : '#666'} />
                <Text style={[styles.patternToggleText, showPatterns && styles.patternToggleTextActive]}>
                  Patterns
                </Text>
              </TouchableOpacity>
            </View>
          )}
          {pageIndex === 0 ? (
            <TouchableOpacity 
              style={styles.originalTextButton}
              onPress={() => {
                horizontalScrollRef.current?.scrollTo({ x: screenWidth, animated: true });
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.originalTextButtonText}>
                {t('audioPlayer.originalTextButton')}
              </Text>
              <Icon name="chevron-right" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.originalTextButton}
              onPress={() => {
                horizontalScrollRef.current?.scrollTo({ x: 0, animated: true });
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Icon name="chevron-left" size={20} color={COLORS.primary} />
              <Text style={styles.originalTextButtonText}>
                {t('audioPlayer.backToTranslationButton')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Extra floating close button to guarantee tappable area */}
        <TouchableOpacity
          onPress={onClose}
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
        <ScrollView
          ref={horizontalScrollRef}
          horizontal
          pagingEnabled
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
                const res = await apiService.getUserContentById(track.id);
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
                // Debug: Log scroll position occasionally
                if (Math.floor(offsetY) % 100 === 0) {
                  console.log(`📜 [SCROLL] Offset: ${offsetY.toFixed(0)}px`);
                }
              }}
            >
              <View style={styles.textWrapper}>
                {pageIndex === 0 && (
                  isPodcastTranscript
                    ? renderPodcastDialogues()
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
                      const textToCopy = originalText || track.original_turkish || '';
                      if (textToCopy) {
                        Clipboard.setString(textToCopy);
                        Alert.alert(
                          t('audioPlayer.copySuccessTitle'),
                          t('audioPlayer.copySuccessMessage'),
                          [{ text: t('common.ok') }]
                        );
                      }
                    }}
                    style={styles.copyButton}
                  >
                    <Icon name="content-copy" size={20} color={COLORS.primary} />
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

        {/* Loading indicator for adding word */}
        {addingWord && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>{addingWordText}</Text>
            </View>
          </View>
        )}

        {/* Controls */}
        <View style={styles.controlsContainer}>
          {/* Mode Toggle - GİZLENDİ: 'Cümle' butonu gizlendi */}

          {/* Debug Button - GİZLENDİ */}
          {/* GIZLENDI - Debug butonu kaldırıldı */}

          {/* Manual Seek Time Input - Only visible in TEST environment */}
          {isTestEnvironment && (
            <View style={styles.manualSeekContainer}>
              <TextInput
                style={styles.timeInput}
                placeholder="Sn"
                keyboardType="numeric"
                maxLength={4}
                value={manualSeconds}
                onChangeText={setManualSeconds}
              />
              <Text style={styles.timeSeparator}>.</Text>
              <TextInput
                style={styles.timeInput}
                placeholder="Ms"
                keyboardType="numeric"
                maxLength={3}
                value={manualMillis}
                onChangeText={setManualMillis}
              />
              <TouchableOpacity
                style={styles.seekButton}
                onPress={() => {
                  const seconds = parseFloat(manualSeconds || '0');
                  const millis = parseFloat(manualMillis || '0');
                  const totalMs = (seconds * 1000) + millis;
                  console.log(`🎯 [MANUAL SEEK] Seeking to ${seconds}.${millis}s (${totalMs}ms)`);
                  handleSeek(totalMs);
                }}
              >
                <Text style={styles.seekButtonText}>Git</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <TouchableOpacity 
              style={styles.progressBar}
              activeOpacity={0.8}
              hitSlop={{ top: 12, bottom: 12, left: 0, right: 0 }}
              onPress={(e) => {
                const { locationX } = e.nativeEvent;
                const progressBarWidth = screenWidth - 32 - 100; // Total width minus padding and time text
                const percentage = locationX / progressBarWidth;
                const seekPosition = percentage * duration;
                console.log(`📊 [PROGRESS BAR] Clicked at ${locationX}px, seeking to ${(seekPosition / 1000).toFixed(2)}s`);
                handleSeek(seekPosition);
              }}
            >
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPercentage}%` }
                ]}
              />
            </TouchableOpacity>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>

          {/* Playback Controls */}
          <View style={styles.playbackControls}>
            <TouchableOpacity
              style={styles.speedButton}
              onPress={handleSpeedChange}
            >
              <Text style={styles.speedText}>{playbackRate}x</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.playButton}
              onPress={handlePlayPause}
              disabled={isLoading}
            >
              {isLoading ? (
                <Icon name="hourglass-empty" size={32} color={COLORS.primary} />
              ) : (
                <Icon
                  name={isPlaying ? "pause" : "play-arrow"}
                  size={32}
                  color={COLORS.primary}
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.infoButton}
              onPress={() => Alert.alert('Bilgi', `Kelime sayısı: ${wordsArray.length}\nSüre: ${formatTime(duration)}\nCümle sayısı: ${sentences.length}\nAktif cümle: ${currentSentenceIndex + 1}`)}
            >
              <Icon name="info" size={24} color="#666" />
            </TouchableOpacity>

            {/* Level Badge */}
            <View style={styles.levelBadgeBottom}>
              <Text style={styles.levelText}>{track.level}</Text>
            </View>
          </View>
        </View>

        {/* Word info popup */}
        {wordPopup && (
          <Modal
            transparent
            visible
            animationType="fade"
            onRequestClose={() => {
              setWordPopup(null);
            }}
          >
            <TouchableOpacity
              style={styles.wordPopupOverlay}
              activeOpacity={1}
              onPress={() => {
                setWordPopup(null);
              }}
            >
              <View style={styles.wordPopupCard}>
                <Text style={styles.wordPopupLabel}>
                  {language === 'tr' ? 'Seçilen kelime' : 'Selected word'}
                </Text>
                <Text style={styles.wordPopupWord}>
                  {wordPopup.data?.original_word || wordPopup.data?.word || wordPopup.word}
                </Text>

                {wordPopup.mode === 'info' ? (
                  <>
                    <Text style={styles.wordPopupLine}>
                      <Text style={styles.wordPopupLineLabel}>
                        {language === 'tr' ? 'Anlam: ' : 'Meaning: '}
                      </Text>
                      <Text>{wordPopup.data?.definition || '-'}</Text>
                    </Text>
                    <Text style={styles.wordPopupLine}>
                      <Text style={styles.wordPopupLineLabel}>
                        {language === 'tr' ? 'Seviye: ' : 'Level: '}
                      </Text>
                      <Text>{(wordPopup.data?.level || '').toUpperCase() || '-'}</Text>
                    </Text>
                    <Text style={styles.wordPopupLine}>
                      <Text style={styles.wordPopupLineLabel}>
                        {language === 'tr' ? 'Örnek: ' : 'Example: '}
                      </Text>
                      <Text>{wordPopup.data?.example_sentence || '-'}</Text>
                    </Text>
                    <Text style={styles.wordPopupLine}>
                      <Text style={styles.wordPopupLineLabel}>
                        {language === 'tr' ? 'Türkçe Örnek: ' : 'Turkish Example: '}
                      </Text>
                      <Text>{wordPopup.data?.example_sentence_turkish || '-'}</Text>
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.wordPopupLine, { marginBottom: 8 }]}>
                      {language === 'tr'
                        ? `"${wordPopup.word}" kelimesini kelime listenize eklemek istiyor musunuz?`
                        : `Do you want to add "${wordPopup.word}" to your vocabulary list?`}
                    </Text>
                  </>
                )}

                {wordPopup.mode === 'confirm' && (
                  <View style={styles.wordPopupActionsRow}>
                    <TouchableOpacity
                      style={[styles.wordPopupActionButton, styles.wordPopupCancelButton]}
                      onPress={() => {
                        setWordPopup(null);
                      }}
                    >
                      <Text style={styles.wordPopupCancelText}>
                        {language === 'tr' ? 'İptal' : 'Cancel'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.wordPopupActionButton, styles.wordPopupConfirmButton]}
                      onPress={() => {
                        handleAddWordToVocabulary(wordPopup.word, 0);
                        setWordPopup(null);
                      }}
                    >
                      <Text style={styles.wordPopupConfirmText}>
                        {language === 'tr' ? 'Kelimeyi Ekle' : 'Add Word'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </Modal>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  wordPopupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wordPopupCard: {
    width: '85%',
    maxWidth: 380,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  wordPopupLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  wordPopupWord: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  wordPopupLine: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 4,
  },
  wordPopupLineLabel: {
    fontWeight: '600',
  },
  wordPopupActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  wordPopupActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginLeft: 8,
  },
  wordPopupCancelButton: {
    backgroundColor: '#E5E7EB',
  },
  wordPopupConfirmButton: {
    backgroundColor: COLORS.primary,
  },
  wordPopupCancelText: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  },
  wordPopupConfirmText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelBadgeBottom: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
  podcastDialoguesContainer: {
    paddingVertical: 8,
  },
  podcastDialogueRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  podcastDialogueRowLeft: {
    justifyContent: 'flex-start',
  },
  podcastDialogueRowRight: {
    justifyContent: 'flex-end',
  },
  podcastBubble: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  podcastBubbleLeft: {
    backgroundColor: '#e5e7eb',
    borderTopLeftRadius: 4,
  },
  podcastBubbleRight: {
    backgroundColor: COLORS.primary,
    borderTopRightRadius: 4,
  },
  podcastBubbleActive: {
    borderWidth: 2,
    borderColor: '#facc15',
    shadowColor: '#facc15',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  podcastSpeakerLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    color: '#4b5563',
  },
  podcastSpeakerLabelRight: {
    color: '#e5e7eb',
    textAlign: 'right',
  },
  podcastBubbleText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#111827',
  },
  podcastBubbleTextRight: {
    color: '#f9fafb',
    textAlign: 'right',
  },
  podcastFallbackText: {
    fontSize: 14,
    color: '#6b7280',
  },
  controlsContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 2,
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  modeButtonActive: {
    backgroundColor: COLORS.primary,
  },
  modeButtonText: {
    fontSize: 14,
    color: '#666',
  },
  modeButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    minWidth: 40,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  playbackControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  speedButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
  },
  speedText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoButton: {
    padding: 8,
  },
  debugButton: {
    padding: 8,
    backgroundColor: '#ffeb3b',
    borderRadius: 4,
    marginVertical: 8,
  },
  debugButtonText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
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
  // sentenceIndicator and number styles removed
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  testButton: {
    padding: 8,
    backgroundColor: '#ff6b35',
    borderRadius: 16,
  },
  manualSeekContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    width: 60,
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: '#fff',
  },
  timeSeparator: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 4,
    color: '#333',
  },
  seekButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 12,
  },
  seekButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AudioPlayer; 