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
  onEnded?: () => void;
  externalAudioRef?: React.RefObject<HTMLAudioElement | null>;
}

interface UseWordSyncReturn {
  activeWordIndex: number;
  isPlaying: boolean;
  isBuffering: boolean;
  isLoading: boolean;
  error: string | null;
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

// Normalize: lowercase, strip everything except letters, digits, apostrophe
const normalizeWord = (word: string): string =>
  word.toLowerCase().replace(/[^a-z0-9']/g, '');

// Backend timepoints'lerden fuzzy-aligned word timestamps oluşturma
// MFA kelime sayısı ile display kelime sayısı farklı olabilir (em/en dash split, ellipsis vb.)
// Bu fonksiyon two-pointer greedy alignment ile doğru eşleşmeyi sağlar
const createOptimizedWordTimestamps = (timepoints: Timepoint[], words: string[], offsetMs: number = 100): WordTimestamp[] => {
  // Güvenlik kontrolleri
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

  const offsetSeconds = offsetMs / 1000;

  // Word count mismatch uyarısı — alignment drift göstergesi
  if (words.length !== timepoints.length) {
    console.warn(
      `⚠️ [WORD SYNC] Word count mismatch — display: ${words.length}, MFA timepoints: ${timepoints.length}. Fuzzy alignment active.`
    );
  }

  const result: WordTimestamp[] = [];
  let tpIdx = 0;

  for (let i = 0; i < words.length; i++) {
    const displayWord = words[i];
    const cleanDisplay = normalizeWord(displayWord);

    // Pure punctuation (e.g., standalone "—") → interpolate from neighbors
    if (cleanDisplay === '') {
      const prevEnd = result.length > 0 ? result[result.length - 1].endTime : 0;
      result.push({ word: displayWord, startTime: prevEnd, endTime: prevEnd });
      continue;
    }

    // MFA ran out of words → interpolate remaining display words
    if (tpIdx >= timepoints.length) {
      const prevEnd = result.length > 0 ? result[result.length - 1].endTime : 0;
      result.push({ word: displayWord, startTime: prevEnd, endTime: prevEnd + 0.3 });
      continue;
    }

    const tp = timepoints[tpIdx];
    if (!tp || typeof tp !== 'object') {
      console.warn(`⚠️ [TIMEPOINT ERROR] Invalid timepoint at index ${tpIdx}:`, tp);
      const prevEnd = result.length > 0 ? result[result.length - 1].endTime : 0;
      result.push({ word: displayWord, startTime: prevEnd, endTime: prevEnd + 0.3 });
      tpIdx++;
      continue;
    }

    const tpWord = normalizeWord(tp.word || '');

    if (tpWord === cleanDisplay) {
      // Direct 1:1 match
      const startTime = tp.timeSeconds || 0;
      const endTime = tp.endTimeSeconds || (startTime + 0.5);
      result.push({ word: displayWord, startTime, endTime });
      tpIdx++;
    } else if (cleanDisplay.length > tpWord.length && cleanDisplay.startsWith(tpWord)) {
      // Display word encompasses multiple MFA words (e.g., "well—known" → "well" + "known")
      const startTime = tp.timeSeconds || 0;
      let consumed = tpWord;
      tpIdx++;

      while (tpIdx < timepoints.length) {
        const nextTp = timepoints[tpIdx];
        const nextNorm = normalizeWord(nextTp?.word || '');
        if (nextNorm && cleanDisplay.startsWith(consumed + nextNorm)) {
          consumed += nextNorm;
          tpIdx++;
          if (consumed === cleanDisplay) break;
        } else {
          break;
        }
      }

      const endTime = timepoints[tpIdx - 1]?.endTimeSeconds || (startTime + 0.5);
      result.push({ word: displayWord, startTime, endTime });
    } else {
      // No exact match — use current timepoint as best guess, advance both pointers
      const startTime = tp.timeSeconds || 0;
      const endTime = tp.endTimeSeconds || (startTime + 0.5);
      result.push({ word: displayWord, startTime, endTime });
      tpIdx++;
    }
  }

  // Apply offset
  if (offsetSeconds !== 0) {
    for (const wt of result) {
      wt.startTime = Math.max(0, wt.startTime - offsetSeconds);
      wt.endTime = Math.max(wt.startTime + 0.1, wt.endTime - offsetSeconds);
    }
  }

  return result;
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
  originalText,
  onEnded,
  externalAudioRef
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
  const animationFrameId = useRef<number | null>(null);
  const isInitializedRef = useRef<boolean>(false);
  const lastSeekTimeRef = useRef<number>(-1);

  // ✅ CRITICAL FIX: onEnded callback'ini ref'te sakla
  // Böylece her render'da useEffect tetiklenmez
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  // ARIA Live Region güncellemesi için callback
  const updateLiveRegion = useCallback((wordIndex: number, word: string) => {
    const liveRegion = document.getElementById('word-sync-live-region');
    if (liveRegion && wordIndex >= 0) {
      liveRegion.textContent = word;
    }
  }, []);

  // Senkronizasyon döngüsü - requestAnimationFrame ile kelime takibi
  const syncLoop = useCallback(() => {
    if (!audioRef.current) {
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
  }, [wordTimestamps, updateLiveRegion, isPlaying]);

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
    if (!audioRef.current) {
      console.log('❌ [PLAY DEBUG] Missing audio element');
      return;
    }

    try {
      // ✅ CRITICAL FIX: Reset currentTime if it's at or past the end
      const audioDuration = audioRef.current.duration || 0;
      const audioCurrentTime = audioRef.current.currentTime || 0;

      // If audio is at or past the end, reset to beginning
      if (audioDuration > 0 && audioCurrentTime >= audioDuration - 0.1) {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
        setActiveWordIndex(-1);
      }

      console.log('🎵 [PLAY DEBUG] Calling audio.play()...');
      await audioRef.current.play();
      console.log('✅ [PLAY DEBUG] audio.play() succeeded');
      setIsPlaying(true);
      startSync();
    } catch (error: any) {
      console.error('❌ [PLAY DEBUG] Oynatma hatası:', error);
      setError(`Oynatma hatası: ${error?.message || 'Bilinmeyen hata'}`);
      setIsPlaying(false);
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

  // Audio error handling
  const [error, setError] = useState<string | null>(null);

  // Audio kurulum ve temizlik
  useEffect(() => {
    console.log('🔄 [AUDIO SETUP DEBUG] useEffect called with dependencies:', {
      audioUrl,
      isInitializedRef: isInitializedRef.current,
      hasExternalAudio: !!externalAudioRef?.current
    });

    // Reset initialization for new audioUrl
    isInitializedRef.current = false;
    setError(null); // Reset error on new url

    console.log('🔄 [AUDIO SETUP DEBUG] Reset isInitializedRef, proceeding with setup...');

    console.log('🚀 [AUDIO SETUP DEBUG] Starting audio initialization...');

    // Eğer harici bir audio ref yoksa ve içeride oluşturulmuş bir audio varsa temizle
    if (!externalAudioRef && audioRef.current) {
      console.log('🧹 [AUDIO SETUP DEBUG] Cleaning up previous local audio element...');
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current.load(); // Force release of previous audio resources
    }

    // AudioContext ve HTMLAudioElement'i oluştur
    if (externalAudioRef?.current) {
      console.log('🔗 [AUDIO SETUP DEBUG] Using EXTERNAL Audio Ref');
      audioRef.current = externalAudioRef.current;
    } else {
      console.log('🆕 [AUDIO SETUP DEBUG] Creating NEW Audio element');
      audioRef.current = new Audio(audioUrl);

      // Ensure currentTime starts at 0 for new audio
      audioRef.current.currentTime = 0;

      // CORS settings only for internal audio
      try {
        const urlOrigin = new URL(audioUrl, window.location.href).origin;
        if (urlOrigin === window.location.origin) {
          audioRef.current.crossOrigin = 'anonymous';
        }
      } catch {
        // Safe to ignore
      }
    }

    console.log('🎵 [AUDIO SETUP DEBUG] Audio element ready with URL:', audioUrl.substring(0, 80));

    // Web Audio API KULLANILMIYOR - direkt HTML5 Audio API ile ses çalıyor
    console.log('✅ [AUDIO SETUP DEBUG] Using HTML5 Audio API (no Web Audio)');

    // Olay dinleyicilerini tanımla
    const handleLoadedMetadata = () => {
      console.log('✅ [AUDIO DEBUG] handleLoadedMetadata called');
      const audioDuration = audioRef.current?.duration || 0;
      setDuration(audioDuration);
      setIsLoading(false);
      setError(null);
      console.log(`🎵 Audio loaded: ${audioDuration}s`);
    };

    const handleCanPlayThrough = () => {
      console.log('✅ [AUDIO DEBUG] handleCanPlayThrough called - audio is ready to play');
      setIsLoading(false);
    };

    const handlePlay = () => {
      console.log('▶️ [AUDIO DEBUG] handlePlay called');
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
      setIsPlaying(false);
      stopSync();
    };

    const handleEnded = () => {
      console.log('⏹️ [AUDIO DEBUG] handleEnded called');
      setIsPlaying(false);
      stopSync();
      setActiveWordIndex(-1);
      updateLiveRegion(-1, '');
      if (onEndedRef.current) onEndedRef.current();
    };

    const handleWaiting = () => {
      console.log('⏳ [AUDIO DEBUG] handleWaiting called');
      setIsBuffering(true);
      stopSync();
    };

    const handlePlaying = () => {
      console.log('🎮 [AUDIO DEBUG] handlePlaying called');
      setIsBuffering(false);
      setIsPlaying(true);
      startSync();
    };

    const handleError = (e: Event | string) => {
      console.error('❌ [AUDIO DEBUG] Audio error occurred:', e);
      // ... error handling logic ...
      let errorMessage = 'Ses dosyası yüklenemedi';
      if (audioRef.current && audioRef.current.error) {
        const code = audioRef.current.error.code;
        switch (code) {
          case 1: errorMessage = 'Kullanıcı işlemi iptal etti (MEDIA_ERR_ABORTED)'; break;
          case 2: errorMessage = 'Ağ hatası (MEDIA_ERR_NETWORK)'; break;
          case 3: errorMessage = 'Ses çözülemedi (MEDIA_ERR_DECODE)'; break;
          case 4: errorMessage = 'Dosya bulunamadı veya desteklenmiyor (MEDIA_ERR_SRC_NOT_SUPPORTED)'; break;
          default: errorMessage = 'Bilinmeyen ses hatası';
        }
      }
      setError(errorMessage);
      setIsLoading(false);
      setIsPlaying(false);
    };

    // Olay dinleyicilerini ekle
    const audio = audioRef.current;
    if (audio) {
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('canplaythrough', handleCanPlayThrough);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('waiting', handleWaiting);
      audio.addEventListener('playing', handlePlaying);
      audio.addEventListener('error', handleError);

      // Eğer external audio ise ve zaten yüklü/çalıyorsa state'i güncelle
      if (externalAudioRef && audio.readyState >= 1) {
        handleLoadedMetadata();
        if (!audio.paused && !audio.ended) {
          handlePlaying();
        }
      }
    }

    isInitializedRef.current = true;

    // Temizlik fonksiyonu
    return () => {
      stopSync();

      if (audio) {
        // ✅ CRITICAL FIX: Sadece internal audio ise durdur
        if (!externalAudioRef) {
          console.log('🧹 [AUDIO CLEANUP] Pausing internal audio');
          audio.pause();
        } else {
          console.log('🛡️ [AUDIO CLEANUP] Skipping pause for external audio');
        }

        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('canplaythrough', handleCanPlayThrough);
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('waiting', handleWaiting);
        audio.removeEventListener('playing', handlePlaying);
        audio.removeEventListener('error', handleError);
      }
    };
  }, [audioUrl, externalAudioRef]); // Re-run if url or external ref changes

  return {
    activeWordIndex,
    isPlaying,
    isBuffering,
    isLoading,
    error,
    currentTime,
    duration,
    wordTimestamps,
    play,
    pause,
    seek,
    setPlaybackRate
  };
};