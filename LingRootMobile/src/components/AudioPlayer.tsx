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
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(-1);
  const [highlightMode, setHighlightMode] = useState<'word' | 'sentence'>('word');
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isLoaded, setIsLoaded] = useState(false);
  
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

    return {
      textToHighlight,
      wordsArray,
      sentences
    };
  }, [track.adapted_text, track.translated_text, track.title, words]);

  const { textToHighlight, wordsArray, sentences } = textData;

  // Debug: Log initial data
  useEffect(() => {
    console.log('🚀 [AUDIO PLAYER INIT]', {
      trackTitle: track.title,
      trackUrl: track.url,
      textToHighlight: textToHighlight.substring(0, 100) + '...',
      wordsLength: wordsArray.length,
      sentencesLength: sentences.length,
      timepointsLength: timepoints.length,
      propsWords: words.length
    });
  }, [track.title, track.url, textToHighlight, wordsArray.length, sentences.length, timepoints.length, words.length]);

  // Debug: Track duration changes
  useEffect(() => {
    console.log('📏 [DURATION STATE CHANGE]', {
      duration,
      durationInSeconds: duration / 1000,
      isLoaded
    });
  }, [duration, isLoaded]);

  // Debug timepoints data
  useEffect(() => {
    console.log('🎯 [TIMEPOINTS DEBUG] AudioPlayer loaded with data:', {
      trackId: track.id,
      trackTitle: track.title.substring(0, 50) + '...',
      timepointsCount: timepoints.length,
      wordsCount: words.length,
      hasTimepoints: timepoints.length > 0,
      hasWords: words.length > 0,
      firstTimepoint: timepoints[0] || null,
      lastTimepoint: timepoints[timepoints.length - 1] || null
    });
    
    if (timepoints.length > 0) {
      console.log('📊 [TIMEPOINTS DATA] First 5 timepoints:', timepoints.slice(0, 5));
    }
  }, [track.id, timepoints, words]);

  // Initialize audio
  useEffect(() => {
    if (visible) {
      loadAudio();
    } else {
      // Reset states when modal closes
      setIsLoaded(false);
      setDuration(0);
      setPosition(0);
      setIsPlaying(false);
      setCurrentWordIndex(-1);
      setCurrentSentenceIndex(-1);
    }
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [visible, track.url]);

  const loadAudio = async () => {
    try {
      setIsLoading(true);
      setIsLoaded(false);
      setDuration(0);
      setPosition(0);
      console.log('🔊 [LOAD AUDIO] Starting to load:', track.url);
      
      // Set audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      
      // Unload previous sound
      if (sound) {
        console.log('🔊 [LOAD AUDIO] Unloading previous sound');
        await sound.unloadAsync();
      }

      console.log('🔊 [LOAD AUDIO] Creating new sound from:', track.url);
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: track.url },
        { shouldPlay: false }
      );

      setSound(newSound);

      // Set up status update listener first
      newSound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);

      // Get audio status and force duration update
      const status = await newSound.getStatusAsync();
      if (status.isLoaded) {
        const statusAny = status as any;
        console.log('🔊 [LOAD AUDIO] Audio loaded successfully. Duration from status:', statusAny.durationMillis, 'ms');
        
        // Use audio duration if available, fallback to track duration estimate
        const audioDuration = statusAny.durationMillis;
        const trackDurationMs = track.duration * 1000; // track.duration is in seconds
        const finalDuration = audioDuration || trackDurationMs;
        
        console.log('🔊 [DURATION OPTIONS]', {
          audioDuration,
          trackDurationMs,
          finalDuration,
          trackDurationSec: track.duration
        });
        
        setDuration(finalDuration);
        setIsLoaded(true);
        
        // Force a status update to ensure everything is synced
        setTimeout(async () => {
          const latestStatus = await newSound.getStatusAsync();
          const latestStatusAny = latestStatus as any;
          console.log('🔊 [DURATION FORCE UPDATE CHECK]', {
            statusDuration: latestStatusAny.durationMillis,
            currentDuration: finalDuration
          });
          
          if (latestStatus.isLoaded && latestStatusAny.durationMillis && latestStatusAny.durationMillis !== finalDuration) {
            console.log('🔊 [DURATION FORCE UPDATE] Updating to:', latestStatusAny.durationMillis, 'ms');
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
      setPosition(status.positionMillis || 0);
      setIsPlaying(status.isPlaying);
      
      // Update duration ONLY if not already set (prevent excessive state updates)
      const statusAny = status as any;
      if (statusAny.durationMillis && duration === 0) {
        console.log('📏 [DURATION UPDATE] Setting duration:', statusAny.durationMillis, 'ms');
        setDuration(statusAny.durationMillis);
        setIsLoaded(true);
      }
      
      if (status.isPlaying) {
        const currentTimeInSeconds = status.positionMillis / 1000;
        updateHighlighting(currentTimeInSeconds);
      }
    }
  };

  const updateHighlighting = (currentTimeInSeconds: number) => {
    const totalDurationSeconds = duration / 1000;
    
    // Skip if audio is not yet loaded
    if (!isLoaded || duration <= 0) {
      console.log('⏸️ [HIGHLIGHT SKIP] Audio not loaded yet:', { 
        isLoaded,
        duration, 
        currentTime: currentTimeInSeconds,
        soundExists: !!sound 
      });
      return;
    }
    
    // Only log occasionally to avoid spam
    if (Math.floor(currentTimeInSeconds) % 2 === 0) {
              console.log('🔍 [HIGHLIGHT DEBUG]', {
          currentTime: currentTimeInSeconds,
          highlightMode,
          timepointsLength: timepoints.length,
          wordsLength: wordsArray.length,
          duration: totalDurationSeconds,
          durationMs: duration
        });
    }
    
    if (highlightMode === 'word') {
      updateWordHighlighting(currentTimeInSeconds);
    } else {
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
      
      // Debug log only occasionally to avoid spam
      if (Math.floor(currentTime) % 3 === 0) {
        console.log('🔍 [WORD HIGHLIGHT DEBUG]', {
          currentTime,
          newWordIndex,
          currentWordIndex,
          timepointsCount: timepoints.length,
          currentTimepoint: newWordIndex >= 0 ? timepoints[newWordIndex] : null
        });
      }
    } else {
      // Skip highlighting if no timepoints data
      console.log('⚠️ [NO TIMEPOINTS] No timepoints data available for highlighting');
      return;
    }

    if (newWordIndex !== currentWordIndex && newWordIndex >= 0) {
      console.log('✅ [WORD CHANGE]', {
        oldIndex: currentWordIndex,
        newIndex: newWordIndex,
        word: wordsArray[newWordIndex],
        currentTime,
        timepoint: timepoints[newWordIndex]
      });
      setCurrentWordIndex(newWordIndex);
      scrollToWord(newWordIndex);
    }
  }, [timepoints, duration, wordsArray, currentWordIndex]);

  const updateSentenceHighlighting = (currentTime: number) => {
    const totalDuration = duration / 1000;
    const progress = totalDuration > 0 ? currentTime / totalDuration : 0;
    const newSentenceIndex = Math.floor(progress * sentences.length);
    const boundedIndex = Math.min(Math.max(0, newSentenceIndex), sentences.length - 1);
    
    console.log('🔤 [SENTENCE HIGHLIGHT]', {
      currentTime,
      totalDuration,
      progress,
      newSentenceIndex,
      boundedIndex,
      totalSentences: sentences.length
    });
    
    if (boundedIndex !== currentSentenceIndex && boundedIndex >= 0) {
      console.log('✅ [SENTENCE CHANGE]', {
        oldIndex: currentSentenceIndex,
        newIndex: boundedIndex,
        sentence: sentences[boundedIndex]?.substring(0, 50) + '...'
      });
      setCurrentSentenceIndex(boundedIndex);
    }
  };

  const scrollToWord = useCallback((wordIndex: number) => {
    const wordRef = wordRefs.current.get(wordIndex);
    
    if (wordRef && scrollViewRef.current) {
      wordRef.measureLayout(
        scrollViewRef.current,
        (x: number, y: number) => {
          console.log('📜 [SCROLL] Scrolling to word:', wordIndex, 'at position:', { x, y });
          scrollViewRef.current?.scrollTo({
            y: y - 100,
            animated: true
          });
        },
        (error: any) => {
          console.warn('📜 [SCROLL ERROR]', error);
        }
      );
    } else {
      console.warn('📜 [SCROLL] Cannot scroll - missing refs:', {
        wordIndex,
        hasWordRef: !!wordRef,
        hasScrollView: !!scrollViewRef.current,
        totalRefs: wordRefs.current.size
      });
    }
  }, []);

  const handlePlayPause = async () => {
    if (!sound) return;

    try {
      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
    } catch (error) {
      console.error('Error playing/pausing audio:', error);
      Alert.alert('Hata', 'Ses oynatılırken hata oluştu');
    }
  };

  const handleSeek = useCallback(async (newPosition: number) => {
    if (!sound) {
      console.warn('⏰ [SEEK] No sound object available');
      return;
    }

    try {
      console.log('⏰ [SEEK] Seeking to position:', newPosition, 'ms');
      await sound.setPositionAsync(newPosition);
      console.log('⏰ [SEEK] Successfully seeked to:', newPosition, 'ms');
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
    console.log('👆 [WORD PRESS]', {
      wordIndex,
      word: wordsArray[wordIndex],
      hasTimepoints: timepoints.length > 0,
      timepointExists: timepoints[wordIndex] ? true : false
    });
    
    if (timepoints.length > 0 && timepoints[wordIndex]) {
      const timepoint = timepoints[wordIndex];
      const positionMs = timepoint.timeSeconds * 1000;
      console.log('⏰ [WORD PRESS] Seeking to timepoint:', timepoint.timeSeconds, 'seconds');
      await handleSeek(positionMs);
    } else {
      // Fallback: estimate position based on word index
      const totalDuration = duration / 1000;
      if (totalDuration > 0 && wordsArray.length > 0) {
        const estimatedTime = (wordIndex / wordsArray.length) * totalDuration;
        const positionMs = estimatedTime * 1000;
        console.log('⏰ [WORD PRESS] Estimated seek to:', estimatedTime, 'seconds');
        await handleSeek(positionMs);
      }
    }
  }, [wordsArray, timepoints, duration, handleSeek]);

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
  }, [wordsArray, currentWordIndex, handleWordPress]);

  const renderSentenceHighlighting = () => {
    return (
      <View style={styles.textContainer}>
        {sentences.map((sentence, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.sentenceContainer,
              index === currentSentenceIndex && styles.highlightedSentence
            ]}
          >
            <Text 
              style={[
                styles.sentence,
                index === currentSentenceIndex && styles.highlightedSentenceText
              ]}
            >
              {sentence.trim()}.
            </Text>
          </TouchableOpacity>
        ))}
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
            <Text style={styles.sectionTitle}>
              {highlightMode === 'word' ? 'Kelime Vurgulama' : 'Cümle Vurgulama'}
            </Text>
            {renderHighlightedText()}
          </View>
        </ScrollView>

        {/* Controls */}
        <View style={styles.controlsContainer}>
          {/* Mode Toggle */}
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                highlightMode === 'word' && styles.modeButtonActive
              ]}
              onPress={() => setHighlightMode('word')}
            >
              <Text style={[
                styles.modeButtonText,
                highlightMode === 'word' && styles.modeButtonTextActive
              ]}>
                Kelime
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeButton,
                highlightMode === 'sentence' && styles.modeButtonActive
              ]}
              onPress={() => setHighlightMode('sentence')}
            >
              <Text style={[
                styles.modeButtonText,
                highlightMode === 'sentence' && styles.modeButtonTextActive
              ]}>
                Cümle
              </Text>
            </TouchableOpacity>
          </View>

          {/* Debug Button */}
          <TouchableOpacity
            style={styles.debugButton}
            onPress={() => {
              console.log('🔧 [DEBUG BUTTON] Manual test:', {
                isLoaded,
                duration,
                position,
                soundExists: !!sound,
                timepointsLength: timepoints.length,
                wordsLength: wordsArray.length
              });
            }}
          >
            <Text style={styles.debugButtonText}>
              🔧 DEBUG: isLoaded={isLoaded.toString()}, duration={duration}
            </Text>
          </TouchableOpacity>

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
              onPress={() => Alert.alert('Bilgi', `Kelime sayısı: ${wordsArray.length}\nSüre: ${formatTime(duration)}`)}
            >
              <Icon name="info" size={24} color="#666" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.infoButton}
              onPress={() => {
                console.log('🧪 [MANUAL TEST] Forcing highlight at word 5');
                setCurrentWordIndex(5);
                if (duration > 0) {
                  updateHighlighting(2.5);
                } else {
                  console.log('🧪 [MANUAL TEST] Duration still 0:', duration);
                }
              }}
            >
              <Icon name="bug-report" size={24} color="#f44336" />
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
    marginBottom: 8,
    padding: 8,
    borderRadius: 6,
  },
  highlightedSentence: {
    backgroundColor: '#007AFF20',
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
});

export default AudioPlayer; 