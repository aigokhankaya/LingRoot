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
  
  // 🎯 Hybrid Approach - Drift Correction
  const driftOffsetRef = useRef(0); // Accumulated drift offset
  const lastCorrectionTimeRef = useRef(0); // Last time we corrected
  const driftHistoryRef = useRef<number[]>([]); // Track drift over time
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set()); // Seçilen kelimeler
  const [highlightMode, setHighlightMode] = useState<'word' | 'sentence'>('sentence'); // Default cümle yapıldı
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
    
    // 🎯 Reset drift correction for new track
    driftOffsetRef.current = 0;
    lastCorrectionTimeRef.current = 0;
    driftHistoryRef.current = [];
    
    // Debug: Log track timing info
    console.log('🎯 Drift correction reset for new track');
    console.log('📊 Track Info:', {
      id: track.id,
      timepoints: timepoints?.length || 0,
      words: words?.length || 0,
      duration: track.real_duration || track.duration,
      estimatedDuration: track.estimated_duration,
      driftCorrected: track.drift_corrected,
      driftAmount: track.drift_amount,
      driftPercentage: track.drift_percentage
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

      if (status.isPlaying) {
        const currentTimeInSeconds = status.positionMillis / 1000;
        // Pass the actual duration from status instead of relying on state
        updateHighlighting(currentTimeInSeconds);
      }
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

  // 🎯 Hybrid Approach - Calculate Drift
  const calculateDrift = useCallback((currentTime: number, expectedIndex: number): number => {
    if (expectedIndex < 0 || expectedIndex >= timepoints.length) return 0;
    
    const expectedTime = timepoints[expectedIndex].timeSeconds;
    const drift = currentTime - expectedTime;
    
    // Add to drift history
    driftHistoryRef.current.push(drift);
    if (driftHistoryRef.current.length > 10) {
      driftHistoryRef.current.shift(); // Keep last 10 samples
    }
    
    // Calculate average drift
    const avgDrift = driftHistoryRef.current.reduce((a, b) => a + b, 0) / driftHistoryRef.current.length;
    
    return avgDrift;
  }, [timepoints]);

  const updateWordHighlighting = useCallback((currentTime: number) => {
    let newWordIndex = -1;

    if (timepoints.length > 0) {
      // 🎯 Hybrid Approach - Dynamic Drift Correction
      const correctedTime = currentTime + driftOffsetRef.current;
      
      // Find the word that should be highlighted at the corrected time
      for (let i = timepoints.length - 1; i >= 0; i--) {
        const timepoint = timepoints[i];
        
        if (correctedTime >= timepoint.timeSeconds) {
          // Check if this timepoint has ended
          if (timepoint.endTimeSeconds && correctedTime <= timepoint.endTimeSeconds) {
            newWordIndex = i;
            
            // Calculate drift and update offset every 2 seconds
            const now = Date.now();
            if (now - lastCorrectionTimeRef.current > 2000) {
              const drift = calculateDrift(currentTime, i);
              
              console.log(`📊 Drift Analysis:`, {
                currentTime: currentTime.toFixed(3),
                expectedTime: timepoint.timeSeconds.toFixed(3),
                drift: drift.toFixed(3),
                currentOffset: driftOffsetRef.current.toFixed(3),
                wordIndex: i,
                word: timepoint.word || words[i]
              });
              
              // Only apply correction if drift is significant (>100ms)
              if (Math.abs(drift) > 0.1) {
                driftOffsetRef.current = -drift;
                console.log(`🎯 Drift corrected: ${drift.toFixed(3)}s, new offset: ${driftOffsetRef.current.toFixed(3)}s`);
              } else {
                console.log(`✅ Drift acceptable: ${drift.toFixed(3)}s (< 100ms)`);
              }
              
              lastCorrectionTimeRef.current = now;
            }
            
            break;
          } else if (!timepoint.endTimeSeconds) {
            newWordIndex = i;
            break;
          }
        }
      }
    } else {
      // Skip highlighting if no timepoints data
      return;
    }

    if (newWordIndex !== currentWordIndex && newWordIndex >= 0) {
      setCurrentWordIndex(newWordIndex);
      scrollToWord(newWordIndex);
    }
  }, [timepoints, duration, wordsArray, currentWordIndex]);

  const updateSentenceHighlighting = (currentTime: number) => {
    const totalDuration = durationRef.current / 1000;
    const progress = totalDuration > 0 ? currentTime / totalDuration : 0;
    const newSentenceIndex = Math.floor(progress * sentences.length);
    const boundedIndex = Math.min(Math.max(0, newSentenceIndex), sentences.length - 1);
    if (boundedIndex !== currentSentenceIndex && boundedIndex >= 0) {
      setCurrentSentenceIndex(boundedIndex);
    }
  };

  const scrollToWord = useCallback((wordIndex: number) => {
    const wordRef = wordRefs.current.get(wordIndex);

    if (wordRef && scrollViewRef.current) {
      wordRef.measureLayout(
        scrollViewRef.current,
        (x: number, y: number) => {
          scrollViewRef.current?.scrollTo({
            y: y - 100,
            animated: true
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
      return renderWordHighlighting();
    } else {
      return renderSentenceHighlighting();
    }
  };

  // Page-level double-tap to copy FULL text (without stripping punctuation)
  const lastTapRefPage0 = useRef(0);
  const lastTapRefPage1 = useRef(0);
  const DOUBLE_TAP_DELAY_MS = 300;

  const handleCopyFullText = (text: string, label: string) => {
    const toCopy = (text || '').trim();
    if (!toCopy) return;
    try {
      Clipboard.setString(toCopy);
      Alert.alert('Kopyalandı', `${label} panoya kopyalandı`);
    } catch (error) {
      // silent in production
      Alert.alert('Hata', 'Metin panoya kopyalanırken bir hata oluştu');
    }
  };

  const handlePage0Tap = () => {
    const now = Date.now();
    if (now - lastTapRefPage0.current < DOUBLE_TAP_DELAY_MS) {
      handleCopyFullText(textToHighlight, 'Ekrandaki metnin tamamı');
    }
    lastTapRefPage0.current = now;
  };

  const handlePage1Tap = () => {
    const now = Date.now();
    if (now - lastTapRefPage1.current < DOUBLE_TAP_DELAY_MS) {
      const fullOriginal = originalText || track.original_turkish || '';
      handleCopyFullText(fullOriginal, 'Orijinal metnin tamamı');
    }
    lastTapRefPage1.current = now;
  };

  const handleDoubleTap = (text: string) => {
    // Copy text to clipboard
    const cleanText = text.replace(/[.,!?;:]/g, '').trim();
    if (cleanText) {
      try {
        Clipboard.setString(cleanText);
        Alert.alert('Kopyalandı', `"${cleanText}" panoya kopyalandı`);
      } catch (error) {
        // silent in production
        Alert.alert('Hata', 'Metin panoya kopyalanırken bir hata oluştu');
      }
    }
  };

  const renderWordHighlighting = useCallback(() => {
    let lastTap = 0;
    let tapTimeout: NodeJS.Timeout;

    return (
      <View style={styles.textContainer}>
        {wordsArray.map((word, index) => {
          // Handle double tap
          const handleTap = () => {
            const now = Date.now();
            const DOUBLE_TAP_DELAY = 300;
            
            if (lastTap && (now - lastTap) < DOUBLE_TAP_DELAY) {
              // Double tap detected
              clearTimeout(tapTimeout);
              handleDoubleTap(word);
              lastTap = 0;
            } else {
              // Single tap
              lastTap = now;
              tapTimeout = setTimeout(() => {
                handleWordPress(index);
                lastTap = 0;
              }, DOUBLE_TAP_DELAY);
            }
          };

          return (
            <TouchableOpacity
              key={index}
              ref={(ref) => {
                if (ref) {
                  wordRefs.current.set(index, ref);
                }
              }}
              onPress={handleTap}
              onLongPress={() => handleWordLongPress(word, index)}
              style={[
                styles.wordContainer,
                index === currentWordIndex && styles.highlightedWord
              ]}
              delayLongPress={300}
            >
              <Text
                style={[
                  styles.word,
                  index === currentWordIndex && styles.highlightedWordText
                ]}
              >
                {word}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }, [wordsArray, currentWordIndex, handleWordPress, handleWordLongPress]);

  const renderSentenceHighlighting = () => {
    let lastTapTime = 0;
    let lastSentenceIndex = -1;
    let tapTimeout: NodeJS.Timeout;

    // Cümleye tıklandığında o cümlenin başına atla
    const handleSentencePress = (sentenceIndex: number, sentenceText: string) => {
      const now = Date.now();
      const DOUBLE_TAP_DELAY = 300;
      
      if (lastSentenceIndex === sentenceIndex && (now - lastTapTime) < DOUBLE_TAP_DELAY) {
        // Double tap detected
        clearTimeout(tapTimeout);
        handleDoubleTap(sentenceText);
        lastTapTime = 0;
        lastSentenceIndex = -1;
      } else {
        // Single tap - handle seek
        lastTapTime = now;
        lastSentenceIndex = sentenceIndex;
        tapTimeout = setTimeout(() => {
          const totalDuration = duration / 1000;
          if (totalDuration > 0) {
            const sentenceProgress = sentenceIndex / sentences.length;
            const targetTime = sentenceProgress * totalDuration;
            const positionMs = targetTime * 1000;
            handleSeek(positionMs);
          }
          lastTapTime = 0;
          lastSentenceIndex = -1;
        }, DOUBLE_TAP_DELAY);
      }
    };
    return (
      <View style={styles.textContainer}>
        {sentences.map((sentence, sentenceIndex) => {
          const isHighlighted = sentenceIndex === currentSentenceIndex;
          const words = sentence.split(/\s+/).filter(word => word.length > 0);
          const isCurrentSentence = sentenceIndex === currentSentenceIndex;

          return (
            <TouchableOpacity
              key={sentenceIndex}
              style={[
                styles.sentenceContainer,
                isCurrentSentence && styles.highlightedSentence
              ]}
              onPress={() => handleSentencePress(sentenceIndex, sentence)}
              activeOpacity={0.7}
            >
              <View style={styles.sentenceWordsContainer}>
                {words.map((word, wordIndex) => {
                  const cleanWord = word.replace(/[.,!?;:]/g, '').toLowerCase();
                  const isWordSelected = selectedWords.has(cleanWord);
                  
                  return (
                    <TouchableOpacity
                      key={`${sentenceIndex}-${wordIndex}`}
                      style={[
                        styles.wordInSentence,
                        isWordSelected && styles.selectedWord
                      ]}
                      onLongPress={() => handleWordLongPress(word, wordIndex)}
                      delayLongPress={500}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.sentence,
                          isCurrentSentence && styles.highlightedSentenceText,
                          isWordSelected && styles.selectedWordText
                        ]}
                      >
                        {word}{wordIndex < words.length - 1 ? ' ' : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <Text
                  style={[
                    styles.sentence,
                    isCurrentSentence && styles.highlightedSentenceText
                  ]}
                >
                  .
                </Text>
              </View>
              {/* Cümle numarası göstergesi kaldırıldı */}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const progressPercentage = duration > 0 ? (position / duration) * 100 : 0;

  // Sync Feedback - Test için
  const sendSyncFeedback = async (feedback: 'YES' | 'NO') => {
    try {
      const currentData = {
        trackId: track.id,
        currentWordIndex: currentWordIndex,
        currentTime: position,
        expectedWord: track.wordTimings?.[currentWordIndex]?.word || '',
        feedback: feedback,
        wordTimings: track.wordTimings || [],
        timestamp: new Date().toISOString()
      };
      
      await apiService.sendSyncFeedback(currentData);
      Alert.alert(
        'Feedback Gönderildi', 
        `Senkronizasyon: ${feedback}\nKelime: ${currentData.expectedWord}\nSüre: ${position.toFixed(2)}s`,
        [{ text: 'Tamam' }]
      );
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Feedback gönderilemedi');
    }
  };

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

        {/* SYNC TEST BUTTONS - Test için */}
        <View style={styles.syncTestContainer}>
          <TouchableOpacity
            style={[styles.syncButton, styles.yesButton]}
            onPress={() => sendSyncFeedback('YES')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="check-circle" size={20} color="#fff" />
            <Text style={styles.syncButtonText}>✅ YES (Sync OK)</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.syncButton, styles.noButton]}
            onPress={() => sendSyncFeedback('NO')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="cancel" size={20} color="#fff" />
            <Text style={styles.syncButtonText}>❌ NO (Sync Wrong)</Text>
          </TouchableOpacity>
        </View>

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
              <Pressable onPress={handlePage0Tap} style={styles.textWrapper}>
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
              <Pressable onPress={handlePage1Tap}>
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
    padding: 16,
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    lineHeight: 28,
  },
  wordContainer: {
    margin: 2,
    padding: 4,
    borderRadius: 4,
  },
  highlightedWord: {
    backgroundColor: '#007AFF',
  },
  word: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
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
  // Sync Test Buttons
  syncTestContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  yesButton: {
    backgroundColor: '#4CAF50',
  },
  noButton: {
    backgroundColor: '#f44336',
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AudioPlayer; 