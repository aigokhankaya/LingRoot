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
  const shouldDebug = false;
  if (shouldDebug) { }

  let low = 0;
  let high = wordTimestamps.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const { word, startTime, endTime } = wordTimestamps[mid];

    if (shouldDebug) { }

    // Kesin geçiş mantığı:
    // currentTime >= startTime && currentTime < endTime
    if (currentTime >= startTime && currentTime < endTime) {
      if (shouldDebug) { }
      return mid;
    } else if (currentTime < startTime) {
      // Aranan zaman kelimeden önce - sol yarıyı ara
      high = mid - 1;
      if (shouldDebug) { }
    } else {
      // currentTime >= endTime - sağ yarıyı ara
      low = mid + 1;
      if (shouldDebug) { }
    }
  }

  if (shouldDebug) { }

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
  // console removed

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

    if (false) { }

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

  // DEBUG: Removed verbose init log

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
  const lastSeekTimeRef = useRef<number>(-1);

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
      // console removed
      return;
    }

    // Check actual audio element state instead of just React state to avoid race conditions
    const isActuallyPlaying = !audioRef.current.paused && !audioRef.current.ended;
    console.log(`🎵 [AUDIO STATE DEBUG] React isPlaying: ${isPlaying}, Audio paused: ${audioRef.current.paused}, Audio ended: ${audioRef.current.ended}, isActuallyPlaying: ${isActuallyPlaying}`);

    if (!isActuallyPlaying) {
      console.log(`🛑 [SYNC LOOP DEBUG] Stopping - audio not actually playing`);
      return;
    }

    // Web Audio API'nin yüksek hassasiyetli saatinden mevcut zamanı al
    const currentAudioTime = audioRef.current.currentTime;
    setCurrentTime(currentAudioTime);

    // Binary search ile aktif kelimeyi bul
    const newIndex = findCurrentWordIndex(wordTimestamps, currentAudioTime);

    // DEBUG: Log current sync state every 10 frames (not too spammy)
    if (false) { }

    // Check if we're in a seek operation - if so, don't override the word index
    if (lastSeekTimeRef.current !== -1) {
      console.log(`🚫 Skipping sync loop update - seek in progress to ${lastSeekTimeRef.current}s`);
      return;
    }

    console.log(`🔄 [SYNC DEBUG] Sync loop running - currentTime: ${currentAudioTime.toFixed(3)}s, isPlaying: ${isPlaying}`);

    // Sadece aktif kelime değiştiğinde state'i güncelle - gereksiz render'ları önler
    setActiveWordIndex(prevIndex => {
      if (newIndex !== prevIndex) {
        const prevWord = prevIndex >= 0 ? wordTimestamps[prevIndex]?.word : 'NONE';
        const newWord = newIndex >= 0 ? wordTimestamps[newIndex]?.word : 'NONE';

        console.log(`🔄 Sync loop: word ${prevIndex} → ${newIndex} at ${currentAudioTime.toFixed(3)}s`);

        if (newIndex >= 0) {
          const { startTime, endTime } = wordTimestamps[newIndex];
          // console removed

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
    // console removed
    if (animationFrameId.current) {
      // console removed
      cancelAnimationFrame(animationFrameId.current);
    }
    animationFrameId.current = requestAnimationFrame(syncLoop);
    // console removed
  }, [syncLoop]);

  const stopSync = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
  }, []);

  // Oynatma fonksiyonu
  const play = useCallback(async () => {
    // console removed

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
        // console removed
        await audioContextRef.current.resume();
      }

      // console removed
      await audioRef.current.play();
      setIsPlaying(true);
      startSync();
      // console removed
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
    console.log(`🎯 SEEK CALLED! Jumping to time: ${time}s`);
    if (audioRef.current) {
      // Store seek time to prevent sync loop from overriding
      lastSeekTimeRef.current = time;

      audioRef.current.currentTime = time;

      // Seek sonrası anında senkronizasyon için kelimeyi bul
      const newIndex = findCurrentWordIndex(wordTimestamps, time);
      console.log(`🔍 After seek, found word index: ${newIndex} for time ${time}s`);
      setActiveWordIndex(newIndex);
      setCurrentTime(time);

      if (newIndex >= 0) {
        const word = wordTimestamps[newIndex]?.word || '';
        console.log(`🎯 Setting active word: "${word}" at index ${newIndex}`);
        updateLiveRegion(newIndex, word);
      }

      // Clear seek flag after a short delay to allow sync loop to resume
      setTimeout(() => {
        lastSeekTimeRef.current = -1;
        console.log('🔓 [SEEK DEBUG] Seek protection cleared, sync loop can resume');
        if (audioRef.current && !audioRef.current.paused) {
          startSync();
        }
      }, 100);
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
    console.log('🔍 [TIMESTAMPS DEBUG] Sample timestamp structure:', calculatedTimestamps[0]);
  }, [timepoints, originalText, duration]);

  // Audio kurulum ve temizlik
  useEffect(() => {
    console.log('🔄 [AUDIO SETUP DEBUG] useEffect called with dependencies:', {
      audioUrl,
      isInitializedRef: isInitializedRef.current,
      willSkip: isInitializedRef.current
    });

    // ✅ CRITICAL FIX: Reset ALL playback states when audioUrl changes
    // This prevents the "audio already finished" bug when loading a shorter audio after a longer one
    console.log('🔄 [AUDIO SETUP DEBUG] Resetting all playback states for new audio...');
    setCurrentTime(0);
    setDuration(0);
    setActiveWordIndex(-1);
    setIsPlaying(false);
    setIsBuffering(false);
    setIsLoading(true);
    setWordTimestamps([]);
    lastSeekTimeRef.current = -1;

    // Stop any existing sync loop
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }

    // Reset initialization for new audioUrl
    isInitializedRef.current = false;

    console.log('🔄 [AUDIO SETUP DEBUG] Reset isInitializedRef, proceeding with setup...');

    console.log('🚀 [AUDIO SETUP DEBUG] Starting audio initialization...');

    // ✅ CRITICAL: Clean up previous audio before creating new one
    if (audioRef.current) {
      console.log('🧹 [AUDIO SETUP DEBUG] Cleaning up previous audio element...');
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current.load(); // Force release of previous audio resources
    }

    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
      sourceNodeRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {
        // Ignore close errors
      }
    }

    // AudioContext ve HTMLAudioElement'i oluştur
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) {
      console.error('❌ [AUDIO SETUP DEBUG] Web Audio API desteklenmiyor');
      return;
    }

    audioContextRef.current = new AudioContext();
    audioRef.current = new Audio(audioUrl);

    // Ensure currentTime starts at 0 for new audio
    audioRef.current.currentTime = 0;

    // IMPORTANT:
    // We must set crossOrigin='anonymous' to allow Web Audio API (createMediaElementSource)
    // to access the audio data. If we don't set this for cross-origin URLs (e.g. backend on 5001, frontend on 3000),
    // the audio node will output silence (security feature).
    // The backend is configured to send CORS headers, so this is safe and required.
    try {
      audioRef.current.crossOrigin = 'anonymous';
    } catch (e) {
      console.warn('Error setting crossOrigin', e);
    }

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
      console.log('🔧 [PLAY DEBUG] Setting isPlaying to TRUE');
      setIsPlaying(true);
      startSync();
    };

    const handlePause = () => {
      console.log('⏸️ [AUDIO DEBUG] handlePause called');

      // Ignore pause events during seek operations
      if (lastSeekTimeRef.current !== -1) {
        console.log('🚫 [PAUSE DEBUG] Ignoring pause during seek operation');
        return;
      }

      console.log('🔧 [PAUSE DEBUG] Setting isPlaying to FALSE');
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
      console.log('🔧 [PLAYING DEBUG] Setting isPlaying to TRUE');
      setIsBuffering(false);
      setIsPlaying(true); // CRITICAL FIX: Set isPlaying to true when audio starts playing
      startSync(); // Start sync when audio is playing
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