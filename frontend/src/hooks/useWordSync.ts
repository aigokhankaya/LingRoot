import { useState, useRef, useEffect, useCallback } from 'react';

interface Timepoint {
  timeSeconds: number;
  endTimeSeconds?: number;
  word?: string;
  markName?: string;
}

interface WordTimestamp {
  word: string;
  startTime: number;
  endTime: number;
}

interface UseWordSyncProps {
  audioUrl: string;
  timepoints: Timepoint[];
  originalText: string;
}

interface UseWordSyncReturn {
  activeWordIndex: number;
  isPlaying: boolean;
  isBuffering: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  wordTimestamps: WordTimestamp[];
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  setPlaybackRate: (rate: number) => void;
}

// Zaman noktaları dizisinde binary search (ikili arama) yapan yardımcı fonksiyon
// O(log n) karmaşıklığı ile çok verimli arama - kesin geçişler
const findCurrentWordIndex = (wordTimestamps: WordTimestamp[], currentTime: number): number => {
  if (!wordTimestamps || wordTimestamps.length === 0) {
    return -1;
  }

  // Debug için mevcut zamanı log et (çok az sıklıkla)
  const shouldDebug = Math.random() < 0.01; // 1% chance
  if (shouldDebug) {
    console.log(`🔍 [BINARY SEARCH DEBUG] Searching for word at ${currentTime.toFixed(3)}s (${Math.round(currentTime * 1000)}ms)`);
  }

  let low = 0;
  let high = wordTimestamps.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const { word, startTime, endTime } = wordTimestamps[mid];

    if (shouldDebug) {
      console.log(`  🔍 [BINARY] Checking mid=${mid}: "${word}" | ${startTime.toFixed(3)}s-${endTime.toFixed(3)}s | Current: ${currentTime.toFixed(3)}s`);
    }

    // Kesin geçiş mantığı:
    // currentTime >= startTime && currentTime < endTime
    if (currentTime >= startTime && currentTime < endTime) {
      if (shouldDebug) {
        console.log(`  ✅ [WORD FOUND] Binary search found: Word ${mid}: "${word}" at ${currentTime.toFixed(3)}s`);
      }
      return mid;
    } else if (currentTime < startTime) {
      // Aranan zaman kelimeden önce - sol yarıyı ara
      high = mid - 1;
      if (shouldDebug) {
        console.log(`  ⬅️ [BINARY] Time before word, searching left: high=${high}`);
      }
    } else {
      // currentTime >= endTime - sağ yarıyı ara
      low = mid + 1;
      if (shouldDebug) {
        console.log(`  ➡️ [BINARY] Time after word, searching right: low=${low}`);
      }
    }
  }

  if (shouldDebug) {
    console.log(`  ❌ [NO MATCH] Binary search found no word for time ${currentTime.toFixed(3)}s`);
  }

  // Hiçbir kelime aralığında değilse
  return -1;
};

// Backend timepoints'lerden optimized word timestamps oluşturma
const createOptimizedWordTimestamps = (timepoints: Timepoint[], words: string[], offsetMs: number = 100): WordTimestamp[] => {
  // Çoklu güvenlik kontrolü
  if (!timepoints) {
    console.warn('⚠️ [TIMEPOINTS ERROR] timepoints is null/undefined');
    return [];
  }
  
  if (!Array.isArray(timepoints)) {
    console.warn('⚠️ [TIMEPOINTS ERROR] timepoints is not an array:', typeof timepoints, timepoints);
    return [];
  }
  
  if (timepoints.length === 0) {
    console.warn('⚠️ [TIMEPOINTS ERROR] timepoints array is empty');
    return [];
  }

  const offsetSeconds = offsetMs / 1000; // ms'yi saniyeye çevir
  console.log(`⏰ [OFFSET DEBUG] Applying offset: -${offsetMs}ms (-${offsetSeconds}s) to ${timepoints.length} timepoints`);

  return timepoints.map((tp, index) => {
    // Her timepoint objesini kontrol et
    if (!tp || typeof tp !== 'object') {
      console.warn(`⚠️ [TIMEPOINT ERROR] Invalid timepoint at index ${index}:`, tp);
      return {
        word: words[index] || `word_${index}`,
        startTime: 0,
        endTime: 0.5
      };
    }
    
    const originalStartTime = tp.timeSeconds || 0;
    const originalEndTime = tp.endTimeSeconds || (tp.timeSeconds + 0.5);
    
    // Offset uygula ama negatif değerleri engelle
    const adjustedStartTime = Math.max(0, originalStartTime - offsetSeconds);
    const adjustedEndTime = Math.max(adjustedStartTime + 0.1, originalEndTime - offsetSeconds);
    
    if (index < 3) { // İlk 3 kelime için debug log
      console.log(`🔧 [OFFSET DEBUG] Word ${index + 1}: "${tp.word}" | Original: ${originalStartTime.toFixed(3)}-${originalEndTime.toFixed(3)}s | Adjusted: ${adjustedStartTime.toFixed(3)}-${adjustedEndTime.toFixed(3)}s`);
    }
    
    return {
      word: tp.word || words[index] || `word_${index}`,
      startTime: adjustedStartTime,
      endTime: adjustedEndTime
    };
  });
};

// Fallback linear timestamps oluşturma
const createLinearWordTimestamps = (words: string[], duration: number): WordTimestamp[] => {
  if (!words || words.length === 0 || !duration) {
    return [];
  }

  const timePerWord = duration / words.length;
  
  return words.map((word, index) => ({
    word,
    startTime: index * timePerWord,
    endTime: (index + 1) * timePerWord
  }));
};

export const useWordSync = ({ 
  audioUrl, 
  timepoints, 
  originalText 
}: UseWordSyncProps): UseWordSyncReturn => {
  
  // DEBUG: Log what hook receives
  console.log('🎪 [USE WORD SYNC DEBUG] Hook initialized with:', {
    audioUrl,
    timepointsLength: timepoints?.length || 0,
    hasOriginalText: !!originalText,
    originalTextLength: originalText?.length || 0,
    firstTimepoint: timepoints?.[0] || 'NO_TIMEPOINTS'
  });
  
  // State'ler: Bu state'ler değiştiğinde bileşen yeniden render edilir
  const [activeWordIndex, setActiveWordIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [wordTimestamps, setWordTimestamps] = useState<WordTimestamp[]>([]);

  // Ref'ler: Yeniden render'lar arasında değerlerini korur ama render tetiklemezler
  // Ses altyapısı için kullanılırlar
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const isInitializedRef = useRef<boolean>(false);

  // ARIA Live Region güncellemesi için callback
  const updateLiveRegion = useCallback((wordIndex: number, word: string) => {
    const liveRegion = document.getElementById('word-sync-live-region');
    if (liveRegion && wordIndex >= 0) {
      liveRegion.textContent = word;
    }
  }, []);

  // Senkronizasyon döngüsü - Web Audio API + requestAnimationFrame
  const syncLoop = useCallback(() => {
    if (!audioRef.current || !audioContextRef.current) {
      console.log('🔄 [SYNC DEBUG] Sync skipped - missing audio/context:', {
        hasAudio: !!audioRef.current,
        hasContext: !!audioContextRef.current
      });
      return;
    }

    // Check actual audio element state instead of just React state to avoid race conditions
    const isActuallyPlaying = !audioRef.current.paused && !audioRef.current.ended;
    if (!isActuallyPlaying) {
      console.log('🔄 [SYNC DEBUG] Sync skipped - audio not playing:', {
        isPlayingState: isPlaying,
        audioPaused: audioRef.current.paused,
        audioEnded: audioRef.current.ended,
        isActuallyPlaying
      });
      return;
    }

    // Web Audio API'nin yüksek hassasiyetli saatinden mevcut zamanı al
    const currentAudioTime = audioRef.current.currentTime;
    setCurrentTime(currentAudioTime);

    // Binary search ile aktif kelimeyi bul
    const newIndex = findCurrentWordIndex(wordTimestamps, currentAudioTime);

    // DEBUG: Log current sync state every 10 frames (not too spammy)
    if (Math.random() < 0.05) { // 5% chance to log - more detailed when issues
      console.log('🔄 [SYNC DEBUG] Current sync state:', {
        currentTime: currentAudioTime.toFixed(3),
        currentTimeMs: Math.round(currentAudioTime * 1000),
        wordTimestampsLength: wordTimestamps.length,
        newIndex,
        currentWord: newIndex >= 0 ? wordTimestamps[newIndex]?.word : 'NONE',
        currentWordRange: newIndex >= 0 ? 
          `${Math.round(wordTimestamps[newIndex].startTime * 1000)}ms-${Math.round(wordTimestamps[newIndex].endTime * 1000)}ms` : 
          'N/A',
        isPlaying
      });
    }

    // Sadece aktif kelime değiştiğinde state'i güncelle - gereksiz render'ları önler
    setActiveWordIndex(prevIndex => {
      if (newIndex !== prevIndex) {
        const prevWord = prevIndex >= 0 ? wordTimestamps[prevIndex]?.word : 'NONE';
        const newWord = newIndex >= 0 ? wordTimestamps[newIndex]?.word : 'NONE';
        
        console.log(`✨ [WORD TRANSITION DEBUG] ${currentAudioTime.toFixed(3)}s: "${prevWord}" (${prevIndex}) → "${newWord}" (${newIndex})`);
        
        if (newIndex >= 0) {
          const { startTime, endTime } = wordTimestamps[newIndex];
          console.log(`🎯 [TIMING DEBUG] Word "${newWord}" range: ${startTime.toFixed(3)}s - ${endTime.toFixed(3)}s | Current: ${currentAudioTime.toFixed(3)}s`);
          
          // ARIA Live Region güncellemesi
          updateLiveRegion(newIndex, newWord);
        }
      }
      return newIndex;
    });

    // Ses çalmaya devam ediyorsa bir sonraki frame'i talep et
    if (!audioRef.current.paused && !audioRef.current.ended) {
      animationFrameId.current = requestAnimationFrame(syncLoop);
    }
  }, [wordTimestamps, updateLiveRegion]);

  // Döngüyü başlatan ve durduran fonksiyonlar
  const startSync = useCallback(() => {
    console.log('🚀 [START SYNC DEBUG] startSync called');
    if (animationFrameId.current) {
      console.log('🚀 [START SYNC DEBUG] Canceling existing animation frame');
      cancelAnimationFrame(animationFrameId.current);
    }
    animationFrameId.current = requestAnimationFrame(syncLoop);
    console.log('🚀 [START SYNC DEBUG] New animation frame requested');
  }, [syncLoop]);

  const stopSync = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
  }, []);

  // Oynatma fonksiyonu
  const play = useCallback(async () => {
    console.log('▶️ [PLAY DEBUG] Play function called');
    
    if (!audioRef.current || !audioContextRef.current) {
      console.log('❌ [PLAY DEBUG] Missing audio references:', {
        hasAudio: !!audioRef.current,
        hasContext: !!audioContextRef.current
      });
      return;
    }

    try {
      // Mobil tarayıcılar için AudioContext'i başlatma gerekliliği
      if (audioContextRef.current.state === 'suspended') {
        console.log('🔄 [PLAY DEBUG] Resuming suspended AudioContext');
        await audioContextRef.current.resume();
      }

      console.log('🚀 [PLAY DEBUG] Starting audio playback');
      await audioRef.current.play();
      setIsPlaying(true);
      startSync();
      console.log('✅ [PLAY DEBUG] Audio playback started, sync enabled');
    } catch (error) {
      console.error('❌ [PLAY DEBUG] Oynatma hatası:', error);
    }
  }, [startSync]);

  // Duraklatma fonksiyonu
  const pause = useCallback(() => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    setIsPlaying(false);
    stopSync();
  }, [stopSync]);

  // Belirli bir zamana atlama fonksiyonu
  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      
      // Seek sonrası anında senkronizasyon için kelimeyi bul
      const newIndex = findCurrentWordIndex(wordTimestamps, time);
      setActiveWordIndex(newIndex);
      setCurrentTime(time);
      
      if (newIndex >= 0) {
        const word = wordTimestamps[newIndex]?.word || '';
        updateLiveRegion(newIndex, word);
      }
    }
  }, [wordTimestamps, updateLiveRegion]);

  // Oynatma hızını ayarlama
  const setPlaybackRate = useCallback((rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  // Word timestamps hesaplama
  useEffect(() => {
    console.log('🧮 [TIMESTAMPS DEBUG] useEffect triggered with:', {
      duration,
      hasOriginalText: !!originalText,
      originalTextLength: originalText?.length || 0,
      timepointsLength: timepoints?.length || 0
    });
    
    if (!duration || !originalText) {
      console.log('⚠️ [TIMESTAMPS DEBUG] Skipping - missing duration or originalText');
      return;
    }

    const words = originalText.split(/\s+/).filter(word => word.length > 0);
    console.log(`📝 [TIMESTAMPS DEBUG] Split text into ${words.length} words`);
    
    let calculatedTimestamps: WordTimestamp[] = [];

    // Backend timepoints varsa optimize edilmiş timestamps kullan
    if (timepoints && Array.isArray(timepoints) && timepoints.length > 0) {
      console.log('🎯 [TIMESTAMPS DEBUG] Valid timepoints received:', {
        isArray: Array.isArray(timepoints),
        length: timepoints.length,
        firstItem: timepoints[0],
        type: typeof timepoints
      });
      
      // Minimal offset uygula (sadece küçük TTS padding kompensasyonu)
      calculatedTimestamps = createOptimizedWordTimestamps(timepoints, words, 0);
      console.log('🎯 [TIMESTAMPS DEBUG] Using Backend Optimized Timepoints with minimal offset');
    } else {
      console.log('📏 [TIMESTAMPS DEBUG] Invalid/missing timepoints, using fallback:', {
        timepoints: timepoints,
        isArray: Array.isArray(timepoints),
        length: timepoints?.length,
        type: typeof timepoints
      });
      
      // Fallback: Linear distribution
      calculatedTimestamps = createLinearWordTimestamps(words, duration);
      console.log('📏 [TIMESTAMPS DEBUG] Using Linear Fallback Timestamps');
    }

    setWordTimestamps(calculatedTimestamps);
    
    console.log(`📊 [TIMESTAMPS DEBUG] Word Timestamps Created: ${calculatedTimestamps.length} words, Duration: ${duration}s`);
    console.log('🔍 [TIMESTAMPS DEBUG] First 3 timestamps:', calculatedTimestamps.slice(0, 3));
    console.log('🔍 [TIMESTAMPS DEBUG] Last 3 timestamps:', calculatedTimestamps.slice(-3));
  }, [timepoints, originalText, duration]);

  // Audio kurulum ve temizlik
  useEffect(() => {
    console.log('🔄 [AUDIO SETUP DEBUG] useEffect called with dependencies:', {
      audioUrl,
      isInitializedRef: isInitializedRef.current,
      willSkip: isInitializedRef.current
    });
    
    // Reset initialization for new audioUrl
    isInitializedRef.current = false;
    
    console.log('🔄 [AUDIO SETUP DEBUG] Reset isInitializedRef, proceeding with setup...');

    console.log('🚀 [AUDIO SETUP DEBUG] Starting audio initialization...');

    // AudioContext ve HTMLAudioElement'i oluştur
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) {
      console.error('❌ [AUDIO SETUP DEBUG] Web Audio API desteklenmiyor');
      return;
    }

    audioContextRef.current = new AudioContext();
    audioRef.current = new Audio(audioUrl);
    audioRef.current.crossOrigin = "anonymous";

    // Audio elementini AudioContext'e bağla
    try {
      sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
      sourceNodeRef.current.connect(audioContextRef.current.destination);
    } catch (error) {
      console.error('MediaElementSource oluşturma hatası:', error);
    }

    // Olay dinleyicilerini tanımla
    const handleLoadedMetadata = () => {
      console.log('✅ [AUDIO DEBUG] handleLoadedMetadata called, setting isLoading to false');
      const audioDuration = audioRef.current?.duration || 0;
      setDuration(audioDuration);
      setIsLoading(false);
      console.log(`🎵 Audio loaded: ${audioDuration}s`);
      console.log('📊 [DURATION DEBUG] Duration set, word timestamps should be calculated now');
    };

    const handlePlay = () => {
      console.log('▶️ [AUDIO DEBUG] handlePlay called');
      setIsPlaying(true);
      startSync();
    };

    const handlePause = () => {
      console.log('⏸️ [AUDIO DEBUG] handlePause called');
      setIsPlaying(false);
      stopSync();
    };

    const handleEnded = () => {
      console.log('⏹️ [AUDIO DEBUG] handleEnded called');
      setIsPlaying(false);
      stopSync();
      setActiveWordIndex(-1);
      updateLiveRegion(-1, '');
    };

    const handleWaiting = () => {
      console.log('⏳ [AUDIO DEBUG] handleWaiting called');
      setIsBuffering(true);
      stopSync(); // Buffering sırasında sync'i durdur
    };

    const handlePlaying = () => {
      console.log('🎮 [AUDIO DEBUG] handlePlaying called');
      setIsBuffering(false);
      if (isPlaying) {
        startSync(); // Buffering bittikten sonra sync'i yeniden başlat
      }
    };

    const handleError = (e: Event) => {
      console.error('❌ [AUDIO DEBUG] Audio error occurred:', e);
      console.error('❌ [AUDIO DEBUG] Setting isLoading to false due to error');
      setIsLoading(false);
    };

    // Olay dinleyicilerini ekle
    const audio = audioRef.current;
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('error', handleError);

    isInitializedRef.current = true;

    // Temizlik fonksiyonu
    return () => {
      stopSync();
      
      if (audio) {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('waiting', handleWaiting);
        audio.removeEventListener('playing', handlePlaying);
        audio.removeEventListener('error', handleError);
      }
      
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
      }
      
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [audioUrl]); // Only rerun when audioUrl changes!

  return {
    activeWordIndex,
    isPlaying,
    isBuffering,
    isLoading,
    currentTime,
    duration,
    wordTimestamps,
    play,
    pause,
    seek,
    setPlaybackRate
  };
}; 