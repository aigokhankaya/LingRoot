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
} from 'react-native';
import { Audio } from 'expo-av';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AudioTrack, Timepoint } from '../types';
import { useAudioContext } from '../contexts/AudioContext';
import { addWordToVocabulary, addWordWithTranslation } from '../services/api';

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
  const { setCurrentTrack, setIsPlaying, isPlaying, currentTrack, sound, setSound, stopAllAudio } = useAudioContext();
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(-1);
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set()); // Seçilen kelimeler
  const [highlightMode, setHighlightMode] = useState<'word' | 'sentence'>('sentence'); // Default cümle yapıldı
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Use refs to track the latest values for highlighting
  const durationRef = useRef(0);
  const isLoadedRef = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const wordRefs = useRef<Map<number, any>>(new Map());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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

    console.log('📝 [TEXT PARSING]', {
      trackId: track.id,
      textSource: track.adapted_text ? 'adapted_text' : (track.translated_text ? 'translated_text' : 'title'),
      textLength: textToHighlight.length,
      wordsCount: wordsArray.length,
      sentencesCount: sentences.length,
      firstSentence: sentences[0]?.substring(0, 50) + '...'
    });

    return {
      textToHighlight,
      wordsArray,
      sentences
    };
  }, [track.adapted_text, track.translated_text, track.title, words]);

  const { textToHighlight, wordsArray, sentences } = textData;

  // Log text data when component mounts or track changes
  useEffect(() => {
    console.log('📝 [TEXT DATA] Component updated:', {
      trackId: track.id,
      hasAdaptedText: !!track.adapted_text,
      hasTranslatedText: !!track.translated_text,
      textLength: textToHighlight.length,
      sentencesCount: sentences.length,
      wordsCount: wordsArray.length
    });
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
        console.log('🔊 [AUDIO EFFECT] Using existing audio instance for track:', track.id);
        // Get current status from existing sound
        if (sound) {
          sound.getStatusAsync().then((status) => {
            if (status.isLoaded) {
              const statusAny = status as any;
              const actualDuration = statusAny.durationMillis || track.duration * 1000;
              const actualPosition = statusAny.positionMillis || 0;
              
              console.log('🔊 [EXISTING AUDIO] Setting states:', {
                duration: actualDuration,
                position: actualPosition,
                isPlaying: statusAny.isPlaying
              });
              
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
      
      console.log('🔊 [AUDIO EFFECT] Modal closed, keeping audio instance');
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
      
      console.log('🔊 [LOAD AUDIO] Starting for track:', track.id);
      
      // Stop any existing audio first
      await stopAllAudio();
      // Set audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      console.log('🔊 [LOAD AUDIO] Creating new sound for:', track.url);
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: track.url },
        { shouldPlay: false }
      );

      setSound(newSound);
      console.log('🔊 [LOAD AUDIO] Sound created and set globally');

      // Set up status update listener first
      newSound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);

      // Get audio status and force duration update
      const status = await newSound.getStatusAsync();
      console.log('🎵 [LOAD AUDIO STATUS]', {
        isLoaded: status.isLoaded,
        durationMillis: (status as any).durationMillis,
        trackDuration: track.duration,
        trackDurationMs: track.duration * 1000
      });

      if (status.isLoaded) {
        const statusAny = status as any;

        // Use audio duration if available, fallback to track duration estimate
        const audioDuration = statusAny.durationMillis;
        const trackDurationMs = track.duration * 1000; // track.duration is in seconds
        const finalDuration = audioDuration || trackDurationMs;

        console.log('🎵 [SETTING DURATION]', {
          audioDuration,
          trackDurationMs,
          finalDuration
        });

        setDuration(finalDuration);
        setIsLoaded(true);
        
        // Update refs as well
        durationRef.current = finalDuration;
        isLoadedRef.current = true;
        
        console.log('🔊 [LOAD AUDIO] Audio loaded successfully, duration:', finalDuration);
        // Force a status update to ensure everything is synced
        setTimeout(async () => {
          const latestStatus = await newSound.getStatusAsync();
          const latestStatusAny = latestStatus as any;

          if (latestStatus.isLoaded && latestStatusAny.durationMillis && latestStatusAny.durationMillis !== finalDuration) {
            console.log('🎵 [UPDATING DURATION]', latestStatusAny.durationMillis);
            setDuration(latestStatusAny.durationMillis);
          }
        }, 100);
      }

    } catch (error) {
      console.error('🔊 [LOAD AUDIO ERROR]', error);
      Alert.alert('Hata', 'Ses dosyası yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      console.log('🔊 [PLAYBACK STATUS]', {
        isPlaying: status.isPlaying,
        position: status.positionMillis,
        duration: status.durationMillis,
        didJustFinish: status.didJustFinish,
        trackId: track.id
      });
      
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
          console.log('🔊 [DURATION UPDATE] Duration set to:', actualDuration);
        }
        if (!isLoaded) {
          setIsLoaded(true);
          isLoadedRef.current = true;
          console.log('🔊 [LOADED UPDATE] Audio marked as loaded');
        }
      }

      if (status.isPlaying) {
        const currentTimeInSeconds = status.positionMillis / 1000;
        console.log('🎵 [PLAYBACK UPDATE]', {
          currentTime: currentTimeInSeconds.toFixed(2),
          duration: (duration / 1000).toFixed(2),
          statusDuration: statusAny.durationMillis ? (statusAny.durationMillis / 1000).toFixed(2) : 'N/A',
          isLoaded,
          position: status.positionMillis
        });
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
      console.log('🔤 [HIGHLIGHT] Skipping - audio not loaded or duration zero', {
        isLoaded: currentIsLoaded,
        duration: currentDuration
      });
      return;
    }
    
    console.log('🔤 [HIGHLIGHT] Mode:', highlightMode, 'Time:', currentTimeInSeconds, 'Duration:', currentDuration);
    if (highlightMode === 'word') {
      updateWordHighlighting(currentTimeInSeconds);
    } else {
      console.log('📝 [CALLING SENTENCE HIGHLIGHTING]');
      updateSentenceHighlighting(currentTimeInSeconds);
    }
  };

  const updateWordHighlighting = useCallback((currentTime: number) => {
    let newWordIndex = -1;

    if (timepoints.length > 0) {
      // Find the word that should be highlighted at the current time
      // We want the latest timepoint that has started but not ended
      for (let i = timepoints.length - 1; i >= 0; i--) {
        const timepoint = timepoints[i];
        if (currentTime >= timepoint.timeSeconds) {
          // Check if this timepoint has ended
          if (timepoint.endTimeSeconds && currentTime <= timepoint.endTimeSeconds) {
            newWordIndex = i;
            break;
          } else if (!timepoint.endTimeSeconds) {
            // If no endTime, assume this is the current word
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
    
    console.log('🔤 [SENTENCE HIGHLIGHT]', {
      currentTime,
      totalDuration,
      progress,
      newSentenceIndex,
      boundedIndex,
      currentSentenceIndex,
      sentencesLength: sentences.length
    });
    if (boundedIndex !== currentSentenceIndex && boundedIndex >= 0) {
      console.log('✅ [SENTENCE CHANGE]', `${currentSentenceIndex} → ${boundedIndex}`);
      setCurrentSentenceIndex(boundedIndex);
      console.log('🔤 [SENTENCE HIGHLIGHT] Updated to sentence:', boundedIndex);
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
          console.warn('📜 [SCROLL ERROR]', error);
        }
      );
    }
  }, []);

  const handlePlayPause = async () => {
    if (!sound) {
      console.log('🔊 [PLAY/PAUSE] No sound object');
      return;
    }

    console.log('🔊 [PLAY/PAUSE] Current state:', {
      isPlaying,
      soundLoaded: !!sound,
      trackId: track.id
    });

    try {
      // Get actual sound status before making decision
      const currentStatus = await sound.getStatusAsync();
      console.log('🔊 [PLAY/PAUSE] Actual sound status:', {
        isLoaded: currentStatus.isLoaded,
        isPlaying: (currentStatus as any).isPlaying
      });

      if ((currentStatus as any).isPlaying) {
        console.log('🔊 [PLAY/PAUSE] Attempting to pause...');
        await sound.pauseAsync();
        console.log('🔊 [PLAY/PAUSE] Pause command sent');
      } else {
        console.log('🔊 [PLAY/PAUSE] Attempting to play...');
        await sound.playAsync();
        console.log('🔊 [PLAY/PAUSE] Play command sent');
      }
      
      // Wait a bit and verify the status change
      setTimeout(async () => {
        try {
          const verifyStatus = await sound.getStatusAsync();
          console.log('🔊 [PLAY/PAUSE] Verified status:', {
            isPlaying: (verifyStatus as any).isPlaying
          });
        } catch (verifyError) {
          console.error('🔊 [PLAY/PAUSE] Verify error:', verifyError);
        }
      }, 100);
      
    } catch (error) {
      console.error('🔊 [PLAY/PAUSE ERROR]', error);
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
      console.error('⏰ [SEEK ERROR]', error);
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
        console.error('Error changing playback speed:', error);
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
      'Kelime Seçimi',
      `"${cleanWord}" kelimesini kelime listenize eklemek istiyor musunuz?`,
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Kelime Ekle',
          style: 'default',
          onPress: () => handleAddWordToVocabulary(cleanWord, wordIndex),
        },
      ]
    );
  }, []);

  const handleAddWordToVocabulary = useCallback(async (word: string, wordIndex: number) => {
    const cleanWord = word.replace(/[.,!?;:]/g, ''); // Remove punctuation
    
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

      console.log('📝 [VOCABULARY] Adding word:', {
        word: cleanWord,
        context: context.substring(0, 100),
        sentence: originalSentence,
        level: track.level
      });

      // Call the real API with translation (like web version)
      const result = await addWordWithTranslation(
        cleanWord,
        context, // Context for AI translation
        track.level,
        originalSentence
      );

      // Add word to selected words set for UI feedback
      setSelectedWords(prev => new Set([...prev, cleanWord.toLowerCase()]));

      // Show detailed success message like web version
      if (result.isExisting) {
        Alert.alert(
          'Bilgi!',
          `"${cleanWord}" kelimesi zaten kelime listenizdedir:\n\nAnlam: ${result.data.definition || 'Belirtilmemiş'}\nÖrnek: ${result.data.example_sentence || 'Belirtilmemiş'}`,
          [{ text: 'Tamam' }]
        );
      } else if (result.translationError) {
        Alert.alert(
          'Uyarı!',
          `"${cleanWord}" kelimesi eklendi ancak çeviri yapılamadı. Anlamı manuel olarak ekleyebilirsiniz.`,
          [{ text: 'Tamam' }]
        );
      } else {
        Alert.alert(
          'Başarılı!',
          `"${cleanWord}" kelimesi başarıyla eklendi!\n\nAnlam: ${result.data.definition}\nÖrnek Cümle: ${result.data.example_sentence}\nSeviye: ${result.data.level}`,
          [{ text: 'Tamam' }]
        );
      }
      
    } catch (error: any) {
      console.error('📝 [VOCABULARY ERROR]', error);
      if (error.message?.includes('zaten listede mevcut')) {
        Alert.alert(
          'Bilgi',
          `"${cleanWord}" kelimesi zaten kelime listenizdedir.`
        );
      } else {
        Alert.alert(
          'Hata', 
          `Kelime eklenirken bir hata oluştu: ${error.message || 'Lütfen internet bağlantınızı kontrol edin.'}`
        );
      }
    }
  }, [wordsArray, textToHighlight, track.level]);

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

  const renderWordHighlighting = useCallback(() => {
    return (
      <View style={styles.textContainer}>
        {wordsArray.map((word, index) => (
          <TouchableOpacity
            key={index}
            ref={(ref) => {
              if (ref) {
                wordRefs.current.set(index, ref);
              }
            }}
            onPress={() => handleWordPress(index)}
            onLongPress={() => handleWordLongPress(word, index)}
            style={[
              styles.wordContainer,
              index === currentWordIndex && styles.highlightedWord
            ]}
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
        ))}
      </View>
    );
  }, [wordsArray, currentWordIndex, handleWordPress, handleWordLongPress]);

  const renderSentenceHighlighting = () => {
    // Cümleye tıklandığında o cümlenin başına atla
    const handleSentencePress = (sentenceIndex: number) => {
      const totalDuration = duration / 1000;
      if (totalDuration > 0) {
        const sentenceProgress = sentenceIndex / sentences.length;
        const targetTime = sentenceProgress * totalDuration;
        const positionMs = targetTime * 1000;
        handleSeek(positionMs);
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
              onPress={() => handleSentencePress(sentenceIndex)}
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
              {/* Cümle numarası göstergesi */}
              <View style={styles.sentenceIndicator}>
                <Text style={[
                  styles.sentenceNumber,
                  isCurrentSentence && styles.sentenceNumberActive
                ]}>
                  {sentenceIndex + 1}
                </Text>
              </View>
            </TouchableOpacity>
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
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>
            {track.title}
          </Text>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>{track.level}</Text>
          </View>
        </View>

        {/* Text Display */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.textWrapper}>
            {/* GİZLENDİ - Section title kaldırıldı */}
            {renderHighlightedText()}
          </View>
        </ScrollView>

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
                console.log('🧪 [TEST] Manuel cümle değişimi:', nextIndex);
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
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    position: 'relative',
    minHeight: 40, // Sabit yükseklik
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
    lineHeight: 24,
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
    margin: 1, // Adjust as needed for spacing between words
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
  sentenceIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentenceNumber: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  sentenceNumberActive: {
    backgroundColor: '#fff',
    color: '#007AFF',
  },
  testButton: {
    padding: 8,
    backgroundColor: '#ff6b35',
    borderRadius: 16,
  },
});

export default AudioPlayer; 