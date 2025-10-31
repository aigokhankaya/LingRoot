import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  ScrollView,
  Modal,
  Dimensions,
  Pressable,
  ActivityIndicator,
} from 'react-native';
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

interface AudioPlayerProps {
  track: AudioTrack;
  visible: boolean;
  onClose: () => void;
  timepoints?: Timepoint[];
  words?: string[];
}

const { width: screenWidth } = Dimensions.get('window');

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  track,
  visible,
  onClose,
  timepoints = [],
  words = [],
}) => {
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const { setCurrentTrack, setIsPlaying, isPlaying, currentTrack, sound, setSound, stopAllAudio } = useAudioContext();
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(-1);
  
  // Removed complex drift correction - using simple web-like approach
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set()); // Seçilen kelimeler
  const [highlightMode, setHighlightMode] = useState<'word' | 'sentence'>('word'); // Default kelime takibi
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [addingWord, setAddingWord] = useState(false); // Loading state for adding word
  const [addingWordText, setAddingWordText] = useState(''); // Text to show while adding
  
  // Use refs to track the latest values for highlighting
  const durationRef = useRef(0);
  const isLoadedRef = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const wordRefs = useRef<Map<number, any>>(new Map());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [originalLoading, setOriginalLoading] = useState(false);
  const [originalText, setOriginalText] = useState<string>(track.original_turkish || '');
  useEffect(() => {
    setOriginalText(track.original_turkish || '');
    
    // Debug: Log track timing info
    console.log('📊 Track Info:', {
      id: track.id,
      timepoints: timepoints?.length || 0,
      words: words?.length || 0,
      duration: track.real_duration || track.duration,
    });
    
    if (timepoints && timepoints.length > 0) {
      console.log('🎯 First 3 timepoints:', timepoints.slice(0, 3));
      console.log('🎯 Last 3 timepoints:', timepoints.slice(-3));
    }
  }, [track.id, track.original_turkish, timepoints, words]);

  // Text parsing - Memoized to prevent unnecessary re-renders
  const textData = useMemo(() => {
    const getTextForHighlight = () => {
      if (track.adapted_text) return track.adapted_text;
      if (track.translated_text) return track.translated_text;
      return track.title;
    };

    const textToHighlight = getTextForHighlight();
    const wordsArray = words.length > 0 ? words : textToHighlight.split(' ');
    const sentences = textToHighlight.split(/[.!?]+/).filter(s => s.trim().length > 0);

    return {
      textToHighlight,
      wordsArray,
      sentences
    };
  }, [track.adapted_text, track.translated_text, track.title, words]);

  const { textToHighlight, wordsArray, sentences } = textData;

  // Log text data when component mounts or track changes
  useEffect(() => {
  }, [track.id, textToHighlight, sentences.length, wordsArray.length]);

  // Debug: Log initial data - GİZLENDİ
  // GIZLENDİ - Debug console.log mesajları

  // Debug: Track duration changes - GİZLENDİ
  // GIZLENDİ - Debug console.log mesajları

  // Debug timepoints data - GİZLENDİ  
  // GIZLENDİ - Debug console.log mesajları

  // Initialize audio
  useEffect(() => {
    if (visible) {
      // Only load audio if it's not the current track or no sound is loaded
      if (!sound || currentTrack?.id !== track.id) {
        loadAudio();
      } else {
        // Get current status from existing sound
        if (sound) {
          sound.getStatusAsync().then((status) => {
            if (status.isLoaded) {
              const statusAny = status as any;
              const actualDuration = statusAny.durationMillis || track.duration * 1000;
              const actualPosition = statusAny.positionMillis || 0;
              setDuration(actualDuration);
              setPosition(actualPosition);
              setIsLoaded(true);
              
              // Update refs as well
              durationRef.current = actualDuration;
              isLoadedRef.current = true;
            }
          });
        }
      }
    } else {
      // Reset states when modal closes but DON'T unload audio
      setIsLoaded(false);
      setDuration(0);
      setPosition(0);
      setCurrentWordIndex(-1);
      setCurrentSentenceIndex(-1);
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
  }, [visible, track.url, track.id]);

  // Fast highlighting interval - 50ms for smooth word tracking
  useEffect(() => {
    if (isPlaying && sound && isLoaded) {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Start fast interval for word highlighting
      intervalRef.current = setInterval(async () => {
        try {
          const status = await sound.getStatusAsync();
          if ((status as any).isLoaded && (status as any).isPlaying) {
            const currentTimeInSeconds = (status as any).positionMillis / 1000;
            updateHighlighting(currentTimeInSeconds);
          }
        } catch (error) {
          // Silent error handling
        }
      }, 20); // 20ms = 50 updates per second - balanced speed for smooth tracking

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
      
      setPosition(status.positionMillis || 0);
      
      // Update global playing state based on actual audio status
      setIsPlaying(status.isPlaying);
      
      // Update global current track - only set when playing, clear when finished
      if (status.isPlaying) {
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
    
    if (highlightMode === 'word') {
      updateWordHighlighting(currentTimeInSeconds);
    } else {
      updateSentenceHighlighting(currentTimeInSeconds);
    }
  };

  // Binary search for better performance on long texts
  const findWordIndexBinarySearch = useCallback((currentTime: number, timepoints: Timepoint[]): number => {
    if (timepoints.length === 0) return -1;
    
    let left = 0;
    let right = timepoints.length - 1;
    let result = -1;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const tp = timepoints[mid];
      const nextTp = timepoints[mid + 1];
      
      if (currentTime >= tp.timeSeconds) {
        result = mid;
        if (!nextTp || currentTime < nextTp.timeSeconds) {
          return mid; // Perfect match
        }
        left = mid + 1; // Search right half
      } else {
        right = mid - 1; // Search left half
      }
    }
    
    return result;
  }, []);

  const updateWordHighlighting = useCallback((currentTime: number) => {
    if (!timepoints || timepoints.length === 0) return;
    
    const newWordIndex = findWordIndexBinarySearch(currentTime, timepoints);

    // Only update if word changed
    if (newWordIndex !== -1 && newWordIndex !== currentWordIndex) {
      setCurrentWordIndex(newWordIndex);
      scrollToWord(newWordIndex);
    }
  }, [timepoints, currentWordIndex, findWordIndexBinarySearch]);

  const updateSentenceHighlighting = (currentTime: number) => {
    const totalDuration = durationRef.current / 1000;
    const progress = totalDuration > 0 ? currentTime / totalDuration : 0;
    const newSentenceIndex = Math.floor(progress * sentences.length);
    const boundedIndex = Math.min(Math.max(0, newSentenceIndex), sentences.length - 1);
    if (boundedIndex !== currentSentenceIndex && boundedIndex >= 0) {
      setCurrentSentenceIndex(boundedIndex);
    }
  };

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

  const handlePlayPause = async () => {
    if (!sound) {
      return;
    }

    try {
      // Get actual sound status before making decision
      const currentStatus = await sound.getStatusAsync();

      if ((currentStatus as any).isPlaying) {
        await sound.pauseAsync();
      } else {
        // Check if audio has finished or is at the end
        const statusAny = currentStatus as any;
        const currentPosition = statusAny.positionMillis || 0;
        const audioDuration = statusAny.durationMillis || duration;
        
        // If audio finished or is within 100ms of the end, restart from beginning
        if (statusAny.didJustFinish || (audioDuration > 0 && currentPosition >= audioDuration - 100)) {
          await sound.setPositionAsync(0);
          setPosition(0);
          setCurrentWordIndex(-1);
          setCurrentSentenceIndex(-1);
        }
        
        await sound.playAsync();
      }
      
      // Wait a bit and verify the status change
      setTimeout(async () => {
        try {
          const verifyStatus = await sound.getStatusAsync();
        } catch (verifyError) {
          // silent in production
        }
      }, 100);
      
    } catch (error) {
      Alert.alert('Hata', 'Ses oynatılırken hata oluştu');
    }
  };

  const handleSeek = useCallback(async (newPosition: number) => {
    if (!sound) {
      return;
    }

    try {
      await sound.setPositionAsync(newPosition);
    } catch (error) {
      // silent in production
    }
  }, [sound]);

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
    if (timepoints.length > 0 && timepoints[wordIndex]) {
      const timepoint = timepoints[wordIndex];
      const positionMs = timepoint.timeSeconds * 1000;
      await handleSeek(positionMs);
    } else {
      // Fallback: estimate position based on word index
      const totalDuration = duration / 1000;
      if (totalDuration > 0 && wordsArray.length > 0) {
        const estimatedTime = (wordIndex / wordsArray.length) * totalDuration;
        const positionMs = estimatedTime * 1000;
        await handleSeek(positionMs);
      }
    }
  }, [wordsArray, timepoints, duration, handleSeek]);

  const handleWordLongPress = useCallback((word: string, wordIndex: number) => {
    const cleanWord = word.replace(/[.,!?;:]/g, ''); // Remove punctuation

    Alert.alert(
      language === 'tr' ? 'Kelime Seçimi' : 'Word Selection',
      language === 'tr' 
        ? `"${cleanWord}" kelimesini kelime listenize eklemek istiyor musunuz?`
        : `Do you want to add "${cleanWord}" to your vocabulary list?`,
      [
        {
          text: language === 'tr' ? 'İptal' : 'Cancel',
          style: 'cancel',
        },
        {
          text: language === 'tr' ? 'Kelime Ekle' : 'Add Word',
          style: 'default',
          onPress: () => handleAddWordToVocabulary(cleanWord, wordIndex),
        },
      ]
    );
  }, [language]);

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

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderHighlightedText = () => {
    if (highlightMode === 'word') {
      return renderWordHighlighting;
    } else {
      return renderSentenceHighlighting;
    }
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

  const renderWordHighlighting = useMemo(() => {
    return (
      <SkiaWordHighlight
        words={wordsArray}
        currentWordIndex={currentWordIndex}
        selectedWords={selectedWords}
        fontSize={16}
        lineHeight={24}
        containerWidth={screenWidth - 32}
        onWordPress={handleWordPress}
        onWordLongPress={handleWordLongPress}
        mode="word"
      />
    );
  }, [wordsArray, currentWordIndex, selectedWords, handleWordPress, handleWordLongPress]);

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
        lineHeight={20}
        containerWidth={screenWidth - 32}
        onSentencePress={handleSentencePressCallback}
        onWordLongPress={handleWordLongPress}
      />
    );
  }, [sentences, currentSentenceIndex, selectedWords, handleSentencePressCallback, handleWordLongPress]);

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
          <Text style={styles.title} numberOfLines={1}>
            {track.title}
          </Text>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>{track.level}</Text>
          </View>
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
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          directionalLockEnabled={true}
          scrollEventThrottle={16}
          onMomentumScrollEnd={async (e) => {
            const idx = Math.round((e.nativeEvent.contentOffset.x || 0) / screenWidth);
            setPageIndex(idx);
            if (idx === 1 && !originalText && !originalLoading) {
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
              contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16 }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              scrollEventThrottle={16}
              removeClippedSubviews={false}
              bounces={true}
            >
              <Pressable style={styles.textWrapper}>
                {renderHighlightedText()}
              </Pressable>
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
                <Text style={styles.originalTitle}>Orijinal Türkçe Metin</Text>
                {originalLoading ? (
                  <Text style={styles.originalText}>Yükleniyor...</Text>
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
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>{addingWordText}</Text>
            </View>
          </View>
        )}

        {/* Controls */}
        <View style={styles.controlsContainer}>
          {/* Mode Toggle - GİZLENDİ: 'Cümle' butonu gizlendi */}

          {/* Debug Button - GİZLENDİ */}
          {/* GIZLENDI - Debug butonu kaldırıldı */}

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPercentage}%` }
                ]}
              />
            </View>
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
                <Icon name="hourglass-empty" size={32} color="#007AFF" />
              ) : (
                <Icon
                  name={isPlaying ? "pause" : "play-arrow"}
                  size={32}
                  color="#007AFF"
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.infoButton}
              onPress={() => Alert.alert('Bilgi', `Kelime sayısı: ${wordsArray.length}\nSüre: ${formatTime(duration)}\nCümle sayısı: ${sentences.length}\nAktif cümle: ${currentSentenceIndex + 1}`)}
            >
              <Icon name="info" size={24} color="#666" />
            </TouchableOpacity>

            {/* Test Button - Cümle vurgusu test etmek için */}
            <TouchableOpacity
              style={styles.testButton}
              onPress={() => {
                const nextIndex = (currentSentenceIndex + 1) % sentences.length;
                setCurrentSentenceIndex(nextIndex);
                Alert.alert('Debug Info', 
                  `Aktif Cümle: ${nextIndex + 1}/${sentences.length}\n` +
                  `Süre: ${formatTime(duration)}\n` +
                  `Pozisyon: ${formatTime(position)}\n` +
                  `Yüklü: ${isLoaded ? 'Evet' : 'Hayır'}\n` +
                  `Oynatılıyor: ${isPlaying ? 'Evet' : 'Hayır'}`
                );
              }}
            >
              <Icon name="bug-report" size={20} color="#ff6b35" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
    color: '#2563EB',
    textDecorationLine: 'underline',
    fontSize: 13,
    marginLeft: 8,
  },
  closeButton: {
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  originalBox: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  originalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  originalText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
  },
  levelBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
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
    backgroundColor: '#007AFF',
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
    backgroundColor: '#007AFF',
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
    backgroundColor: '#007AFF40',
    borderColor: '#007AFF',
    borderWidth: 3,
    shadowColor: '#007AFF',
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
    color: '#007AFF',
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
    backgroundColor: '#007AFF',
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
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginHorizontal: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
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
});

export default AudioPlayer; 