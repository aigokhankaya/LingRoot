import React, { useState, useEffect, useRef } from 'react';
import { addWordToVocabulary, addWordWithTranslation } from '../lib/api';

interface Timepoint {
  timeSeconds: number;
  endTimeSeconds?: number;
  word?: string;
}

interface WordTimestamp {
  word: string;
  startTime: number;
  endTime: number;
}

interface VttCue {
  startTime: number;
  endTime: number;
  text: string;
}

interface SyncedTextPlayerProps {
  audioUrl: string;
  vttUrl?: string;
  words: string[];
  timepoints: Timepoint[];
  originalText: string;
  speakingRate?: number; // Konuşma hızı bilgisi
  className?: string;
  showControls?: boolean;
  autoHighlight?: boolean;
  level?: string;
  originalTurkish?: string;
  downloadUrls?: {
    mp3: string;
    vtt?: string;
  };
  stats?: {
    wordsCount?: number;
    timepointsCount?: number;
  };
}

// Context Menu interface
interface ContextMenu {
  show: boolean;
  x: number;
  y: number;
  word: string;
  wordIndex: number;
}

// VTT Parser utility
const parseVTT = (vttContent: string): VttCue[] => {
  const lines = vttContent.split('\n');
  const cues: VttCue[] = [];
  let currentCue: Partial<VttCue> = {};
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines and headers
    if (!line || line === 'WEBVTT') continue;
    
    // Time code line (format: 00:00.000 --> 00:02.000)
    if (line.includes('-->')) {
      const [startStr, endStr] = line.split('-->').map(s => s.trim());
      currentCue.startTime = parseTimeCode(startStr);
      currentCue.endTime = parseTimeCode(endStr);
    }
    // Text line
    else if (currentCue.startTime !== undefined && currentCue.endTime !== undefined) {
      currentCue.text = line;
      cues.push(currentCue as VttCue);
      currentCue = {};
    }
  }
  
  return cues;
};

// Parse time code string (00:00.000) to seconds
const parseTimeCode = (timeStr: string): number => {
  const [time, milliseconds] = timeStr.split('.');
  const [minutes, seconds] = time.split(':').map(Number);
  return minutes * 60 + seconds + (parseInt(milliseconds) / 1000);
};

export default function SyncedTextPlayer({ 
  audioUrl, 
  vttUrl, 
  words, 
  timepoints, 
  originalText,
  speakingRate = 1.0,
  className = '',
  showControls = true,
  autoHighlight = true,
  level,
  originalTurkish,
  downloadUrls,
  stats
}: SyncedTextPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(-1);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number>(-1);
  const [wordTimestamps, setWordTimestamps] = useState<WordTimestamp[]>([]);
  const [sentenceTimestamps, setSentenceTimestamps] = useState<Array<{sentence: string, startTime: number, endTime: number, wordStartIndex: number, wordEndIndex: number}>>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [vttCues, setVttCues] = useState<VttCue[]>([]);
  const [currentCueIndex, setCurrentCueIndex] = useState<number>(-1);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [isAudioLoaded, setIsAudioLoaded] = useState(false);
  const [userInteractions, setUserInteractions] = useState<Array<{wordIndex: number, timestamp: number}>>([]);
  const [isAdaptiveMode, setIsAdaptiveMode] = useState(true);
  const [timingMethod, setTimingMethod] = useState<'VTT' | 'Backend' | 'Adaptive' | 'Linear'>('Backend');
  const [playbackRate, setPlaybackRate] = useState<number>(1.0); // 0.5x ile 2.0x arası hız kontrolü
  const [highlightType, setHighlightType] = useState<'word' | 'sentence'>('sentence'); // Vurgulama türü - default cümle
  const [timingOffset, setTimingOffset] = useState<number>(0); // Metin vurgusu timing offset (saniye)
  const [contextMenu, setContextMenu] = useState<ContextMenu>({ show: false, x: 0, y: 0, word: '', wordIndex: -1 });
  const [isAddingWord, setIsAddingWord] = useState(false);

  // VTT dosyasını fetch et ve parse et
  useEffect(() => {
    if (!vttUrl) return;
    
    const fetchVTT = async () => {
      try {
        const response = await fetch(vttUrl);
        const vttContent = await response.text();
        const parsedCues = parseVTT(vttContent);
        setVttCues(parsedCues);
        console.log('VTT cues parsed:', parsedCues);
      } catch (error) {
        console.error('VTT fetch error:', error);
      }
    };
    
    fetchVTT();
  }, [vttUrl]);

  // Audio yüklendiğinde gerçek duration'ı al
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    console.log('🎵 Audio URL set:', audioUrl);
    setIsAudioLoaded(false); // Reset loading state

    const handleLoadedMetadata = () => {
      const realDuration = audio.duration;
      setAudioDuration(realDuration);
      setIsAudioLoaded(true);
      console.log('✅ Audio loaded with duration:', realDuration, 'Speaking rate:', speakingRate);
    };

    const handleDurationChange = () => {
      const realDuration = audio.duration;
      if (realDuration && !isNaN(realDuration)) {
        setAudioDuration(realDuration);
        setIsAudioLoaded(true);
        console.log('✅ Audio duration updated:', realDuration, 'Speaking rate:', speakingRate);
      }
    };

    const handleLoadStart = () => {
      console.log('🔄 Audio loading started...');
    };

    const handleCanPlay = () => {
      console.log('✅ Audio can play');
      setIsAudioLoaded(true);
    };

    const handleError = (e: Event) => {
      console.error('❌ Audio loading error:', e);
      console.error('❌ Audio URL that failed:', audioUrl);
      setIsAudioLoaded(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, [audioUrl, speakingRate]);

  // Playback rate değiştiğinde audio'yu güncelle
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && isAudioLoaded) {
      audio.playbackRate = playbackRate;
      console.log(`🎵 Playback rate set to: ${playbackRate}x`);
    }
  }, [playbackRate, isAudioLoaded]);

  // Optimized timing hesaplama fonksiyonu - backend'ten gelen timing'leri kullanır
  const calculateOptimizedTimestamps = (timepoints: Timepoint[]): WordTimestamp[] => {
    // Backend'ten gelen timepoints'ler zaten optimize edilmiş - direkt kullan
    return timepoints.map((tp, index) => ({
      word: tp.word || words[index] || `word_${index}`,
      startTime: tp.timeSeconds || 0,
      endTime: tp.endTimeSeconds || (tp.timeSeconds + 0.5)
    }));
  };

  // Adaptive timing hesaplama fonksiyonu (fallback için - konuşma hızını dikkate alır)
  const calculateAdaptiveTimestamps = (baseDuration: number, userHints: Array<{wordIndex: number, timestamp: number}>) => {
    const textWords = originalText.split(/\s+/).filter(word => word.length > 0);
    
    if (userHints.length === 0) {
      // Konuşma hızına göre ayarlanmış eşit dağıtım
      return textWords.map((word, index) => ({
        word,
        startTime: (index / textWords.length) * baseDuration,
        endTime: ((index + 1) / textWords.length) * baseDuration
      }));
    }

    // Kullanıcı ipuçlarıyla interpolasyon
    const timestamps: WordTimestamp[] = [];
    
    for (let i = 0; i < textWords.length; i++) {
      const word = textWords[i];
      
      // En yakın kullanıcı ipuçlarını bul
      const beforeHints = userHints.filter(h => h.wordIndex <= i);
      const afterHints = userHints.filter(h => h.wordIndex > i);
      
      let startTime: number;
      
      if (beforeHints.length > 0 && afterHints.length > 0) {
        // İki ipucu arasında interpolasyon
        const beforeHint = beforeHints[beforeHints.length - 1];
        const afterHint = afterHints[0];
        
        const progress = (i - beforeHint.wordIndex) / (afterHint.wordIndex - beforeHint.wordIndex);
        startTime = beforeHint.timestamp + (afterHint.timestamp - beforeHint.timestamp) * progress;
      } else if (beforeHints.length > 0) {
        // Sadece önceki ipucu var
        const beforeHint = beforeHints[beforeHints.length - 1];
        const wordsRemaining = textWords.length - beforeHint.wordIndex;
        const timeRemaining = baseDuration - beforeHint.timestamp;
        const avgTimePerWord = timeRemaining / wordsRemaining;
        startTime = beforeHint.timestamp + (i - beforeHint.wordIndex) * avgTimePerWord;
      } else if (afterHints.length > 0) {
        // Sadece sonraki ipucu var
        const afterHint = afterHints[0];
        const avgTimePerWord = afterHint.timestamp / afterHint.wordIndex;
        startTime = i * avgTimePerWord;
      } else {
        // Hiç ipucu yok, eşit dağıtım
        startTime = (i / textWords.length) * baseDuration;
      }
      
      const endTime = i === textWords.length - 1 ? baseDuration : 
        (((i + 1) / textWords.length) * baseDuration);
      
      timestamps.push({ word, startTime, endTime });
    }
    
    return timestamps;
  };

  // Kelime zamanlarını gerçek audio duration ile hesapla (konuşma hızı dahil)
  useEffect(() => {
    if (!isAudioLoaded || !originalText) return;
    
    // DEBUG: Timepoints kontrolü
    console.log('🔍 [SYNCED PLAYER] useEffect triggered:', {
      hasTimepoints: !!timepoints,
      timepointsLength: timepoints?.length || 0,
      timepointsType: typeof timepoints,
      isArray: Array.isArray(timepoints),
      firstTimepoint: timepoints?.[0],
      isAudioLoaded,
      hasOriginalText: !!originalText
    });
    
    const textWords = originalText.split(/\s+/).filter(word => word.length > 0);
    let calculatedTimestamps: WordTimestamp[] = [];
    let activeMethod = 'Linear';
    
    // Öncelik sırası: Backend Optimized Timepoints → VTT → Adaptive → Linear
    if (timepoints && timepoints.length > 0) {
      // Backend'den gelen optimized timepoints (EN YÜKSEK ÖNCELİK)
      // Bu timing'ler SSML mark'ları ile optimize edilmiş ve noktalama temizliği yapılmış
      calculatedTimestamps = calculateOptimizedTimestamps(timepoints);
      activeMethod = 'Backend';
    } else if (vttCues.length > 0) {
      // VTT tabanlı timing (ikinci öncelik)
      calculatedTimestamps = textWords.map((word, index) => {
        const wordProgress = index / textWords.length;
        const nextWordProgress = (index + 1) / textWords.length;
        
        // VTT cue'larından gerçek timing'leri al
        const relevantCue = vttCues.find(cue => {
          const cueWordIndex = Math.floor((cue.startTime / audioDuration) * textWords.length);
          return Math.abs(cueWordIndex - index) <= 1; // 1 kelime tolerans
        });
        
        const startTime = relevantCue ? relevantCue.startTime : wordProgress * audioDuration;
        const endTime = relevantCue ? relevantCue.endTime : nextWordProgress * audioDuration;
        
        return { word, startTime, endTime };
      });
      activeMethod = 'VTT';
    } else if (userInteractions.length > 0 && isAdaptiveMode) {
      // Adaptive mode (üçüncü öncelik)
      calculatedTimestamps = calculateAdaptiveTimestamps(audioDuration, userInteractions);
      activeMethod = 'Adaptive';
    } else {
      // Linear distribution (varsayılan)
      const baseTimePerWord = audioDuration / textWords.length;
      
      calculatedTimestamps = textWords.map((word, index) => ({
        word,
        startTime: index * baseTimePerWord,
        endTime: (index + 1) * baseTimePerWord
      }));
      activeMethod = 'Linear';
    }
    
    setWordTimestamps(calculatedTimestamps);
    setTimingMethod(activeMethod as any);
    
    // Cümle timing'lerini hesapla
    const calculateSentenceTimings = () => {
      // Metni cümlelere böl
      const sentences = originalText.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const sentenceTimings = [];
      
      let currentWordIndex = 0;
      
      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i].trim();
        if (!sentence) continue;
        
        // Bu cümledeki kelime sayısını hesapla
        const sentenceWords = sentence.split(/\s+/).filter(word => word.length > 0);
        const wordStartIndex = currentWordIndex;
        const wordEndIndex = currentWordIndex + sentenceWords.length - 1;
        
        // Cümlenin başlangıç ve bitiş zamanını belirle
        const startTime = calculatedTimestamps[wordStartIndex]?.startTime || 0;
        const endTime = calculatedTimestamps[wordEndIndex]?.endTime || audioDuration;
        
        sentenceTimings.push({
          sentence,
          startTime,
          endTime,
          wordStartIndex,
          wordEndIndex
        });
        
        currentWordIndex += sentenceWords.length;
      }
      
      return sentenceTimings;
    };
    
    const sentenceTimings = calculateSentenceTimings();
    setSentenceTimestamps(sentenceTimings);
    
    console.log(`🎯 Timing method: ${activeMethod}, Speaking rate: ${speakingRate}x, Duration: ${audioDuration}s`);
    console.log(`📊 First 5 word timings:`, calculatedTimestamps.slice(0, 5));
    console.log(`📝 First 3 sentence timings:`, sentenceTimings.slice(0, 3));
    console.log(`🔢 Timepoints from backend (first 5):`, timepoints?.slice(0, 5));
    console.log(`📈 Total words: ${textWords.length}, Total sentences: ${sentenceTimings.length}, Total timepoints: ${timepoints?.length || 0}`);
    
    // Backend timepoints için ek debug bilgisi
    if (activeMethod === 'Backend' && timepoints && timepoints.length > 0) {
      const hasEndTimes = timepoints.some(tp => tp.endTimeSeconds !== undefined);
      console.log(`🔍 Backend timepoints have endTimeSeconds: ${hasEndTimes}`);
      if (hasEndTimes) {
        console.log(`⏱️ Sample timing: "${timepoints[0]?.word}" ${timepoints[0]?.timeSeconds}s-${timepoints[0]?.endTimeSeconds}s`);
      }
    }
  }, [isAudioLoaded, vttCues, timepoints, originalText, audioDuration, userInteractions, isAdaptiveMode, speakingRate]);

  // Audio time tracking
  useEffect(() => {
    if (!autoHighlight) return;
    
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const rawCurrentTime = audio.currentTime;
      const currentTime = rawCurrentTime + timingOffset; // Timing offset uygula
      setCurrentTime(rawCurrentTime); // UI için raw time kullan
      
      // BİREBİR EXACT kelime tracking - Backend timepoints için TAM EŞLEŞME
      let foundWordIndex = -1;
      
      // Backend timepoints varsa TAM BİREBİR EŞLEŞME - HİÇ TOLERANCE YOK
      if (timingMethod === 'Backend' && timepoints && timepoints.length > 0) {
        // TAM BİREBİR SENKRONIZASYON - Sadece exact timing'leri kullan
        for (let i = 0; i < wordTimestamps.length; i++) {
          const timestamp = wordTimestamps[i];
          if (timestamp && 
              currentTime >= timestamp.startTime && 
              currentTime < timestamp.endTime) {
            foundWordIndex = i;
            break;
          }
        }
        
        // DEBUG LOG - sadece kelime değişiminde
        if (foundWordIndex !== currentWordIndex && foundWordIndex !== -1) {
          const timestamp = wordTimestamps[foundWordIndex];
          if (timestamp) {
            console.log(`🎯 BİREBİR TIMING: Word ${foundWordIndex + 1} "${timestamp.word}" | Time: ${currentTime.toFixed(3)}s | Range: ${timestamp.startTime.toFixed(3)}s-${timestamp.endTime.toFixed(3)}s | Offset: ${timingOffset.toFixed(3)}s | Match: ✅`);
          }
        }
        
      } else {
        // Diğer timing methodları için normal tolerance
        const baseTolerance = 0.2; // 200ms tolerance - daha esnek
        const tolerance = baseTolerance / Math.max(speakingRate, 0.5);
        
        for (let i = 0; i < wordTimestamps.length; i++) {
          const timestamp = wordTimestamps[i];
          if (currentTime >= timestamp.startTime - tolerance && 
              currentTime <= timestamp.endTime + tolerance) {
            foundWordIndex = i;
            break;
          }
        }
        
        // Fallback: en yakın kelimeyi bul
        if (foundWordIndex === -1 && wordTimestamps.length > 0) {
          let closestIndex = 0;
          let closestDistance = Math.abs(currentTime - wordTimestamps[0].startTime);
          
          for (let i = 1; i < wordTimestamps.length; i++) {
            const distance = Math.abs(currentTime - wordTimestamps[i].startTime);
            if (distance < closestDistance) {
              closestDistance = distance;
              closestIndex = i;
            }
          }
          
          const maxDistance = 0.8 / Math.max(speakingRate, 0.5); // Esnek mesafe
          if (closestDistance <= maxDistance) {
            foundWordIndex = closestIndex;
          }
        }
      }
      
      // KARARLI GÜNCELLEME - Sık değişim önleme
      if (foundWordIndex !== -1) {
        // Kelime değişim kararlılığı kontrolü
        const shouldUpdate = currentWordIndex === -1 || // İlk kelime
          foundWordIndex !== currentWordIndex || // Gerçek değişim
          Math.abs(foundWordIndex - currentWordIndex) === 1; // Komşu kelime (doğal geçiş)
        
        if (shouldUpdate) {
          // Debug: Sadece önemli değişimleri logla
          if (foundWordIndex !== currentWordIndex) {
            const timestamp = wordTimestamps[foundWordIndex];
            const timingInfo = timestamp ? 
              `${timestamp.startTime.toFixed(3)}s-${timestamp.endTime.toFixed(3)}s` : 'N/A';
            console.log(`🎵 ESNEK GEÇIŞ: ${currentWordIndex} → ${foundWordIndex} | Time: ${currentTime.toFixed(3)}s | Range: ${timingInfo}`);
          }
          
          setCurrentWordIndex(foundWordIndex);
        }
      } else {
        // Hiç eşleşme yoksa - kararlılık için mevcut konumu koru (hemen sıfırlama)
        // Sadece çok uzakta kalındığında sıfırla
        if (currentWordIndex !== -1 && wordTimestamps[currentWordIndex]) {
          const currentTimestamp = wordTimestamps[currentWordIndex];
          const distanceFromCurrent = Math.abs(currentTime - 
            (currentTimestamp.startTime + currentTimestamp.endTime) / 2);
          
          // Çok uzakta kalındıysa sıfırla
          if (distanceFromCurrent > 1.0) { // 1 saniyeden fazla uzakta
            setCurrentWordIndex(-1);
          }
          // Yakınsa mevcut konumu koru (kararlılık)
        }
      }
      
      // CÜMLE VURGULAMASI - Aynı esnek prensiple
      if (highlightType === 'sentence' && sentenceTimestamps.length > 0) {
        let foundSentenceIndex = -1;
        
        // Esnek cümle eşleşmesi
        const sentenceTolerance = 0.3; // 300ms tolerance
        
        for (let i = 0; i < sentenceTimestamps.length; i++) {
          const sentence = sentenceTimestamps[i];
          if (currentTime >= sentence.startTime - sentenceTolerance && 
              currentTime <= sentence.endTime + sentenceTolerance) {
            foundSentenceIndex = i;
            break;
          }
        }
        
        // En yakın cümleyi bul
        if (foundSentenceIndex === -1) {
          let closestIndex = -1;
          let closestDistance = Infinity;
          
          for (let i = 0; i < sentenceTimestamps.length; i++) {
            const sentence = sentenceTimestamps[i];
            const distance = Math.min(
              Math.abs(currentTime - sentence.startTime),
              Math.abs(currentTime - sentence.endTime)
            );
            
            if (distance < closestDistance) {
              closestDistance = distance;
              closestIndex = i;
            }
          }
          
          if (closestDistance <= 0.5) { // 500ms esnek tolerance
            foundSentenceIndex = closestIndex;
          }
        }
        
        if (foundSentenceIndex !== -1) {
          setCurrentSentenceIndex(foundSentenceIndex);
        }
      }
      
      // VTT cue tracking
      const activeCueIndex = vttCues.findIndex(cue => 
        currentTime >= cue.startTime && currentTime <= cue.endTime
      );
      
      if (activeCueIndex !== currentCueIndex) {
        setCurrentCueIndex(activeCueIndex);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentWordIndex(-1);
    };

    // Update frequency - birebir eşleşme için optimize edildi
    const updateInterval = timingMethod === 'Backend' ? 
      (1000 / 240) :  // 240 FPS - birebir eşleşme için maksimum hassasiyet
      (1000 / 120);   // 120 FPS - diğer methodlar için
    
    let lastUpdateTime = 0;
    
    const updateLoop = (currentAnimationTime: number) => {
      if (currentAnimationTime - lastUpdateTime >= updateInterval) {
        if (audio && !audio.paused) {
          handleTimeUpdate();
        }
        lastUpdateTime = currentAnimationTime;
      }
      requestAnimationFrame(updateLoop);
    };
    
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    
    updateLoop(0);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentWordIndex, wordTimestamps, vttCues, currentCueIndex, autoHighlight, highlightType, sentenceTimestamps, playbackRate, timingMethod, timingOffset, timepoints]);

  const handleWordClick = (wordIndex: number, startTime: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    // Audio zamanını ayarla
    audio.currentTime = startTime;
    
    // Kullanıcı etkileşimini kaydet (adaptive learning için)
    const newInteraction = { wordIndex, timestamp: startTime };
    setUserInteractions(prev => {
      const filtered = prev.filter(interaction => interaction.wordIndex !== wordIndex);
      return [...filtered, newInteraction].sort((a, b) => a.wordIndex - b.wordIndex);
    });
    
    // Current word index'i güncelle
    setCurrentWordIndex(wordIndex);
    
    console.log(`Word clicked: ${wordIndex}, Time: ${startTime}s`);
  };

  const handleSentenceClick = (sentenceIndex: number, startTime: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    // Audio zamanını ayarla
    audio.currentTime = startTime;
    
    // Current sentence index'i güncelle
    setCurrentSentenceIndex(sentenceIndex);
    
    console.log(`Sentence clicked: ${sentenceIndex}, Time: ${startTime}s`);
  };

  const renderHighlightedText = () => {
    if (!originalText) return null;
    
    if (highlightType === 'sentence') {
      return renderHighlightedSentences();
    } else {
      return renderHighlightedWords();
    }
  };

  const renderHighlightedWords = () => {
    const textWords = originalText.split(/\s+/).filter(word => word.length > 0);
    
    return (
      <div 
        className="text-lg leading-relaxed" 
        style={{ 
          lineHeight: '1.8rem',
          // CONTAINER STABILIZATION
          overflow: 'hidden',
          position: 'relative',
          // PREVENT LAYOUT SHIFTS
          containIntrinsicSize: 'auto',
          contain: 'layout style'
        }}
      >
        {textWords.map((word, index) => {
          const isCurrentWord = index === currentWordIndex;
          const timestamp = wordTimestamps[index];
          
          return (
            <span
              key={index}
              className={`inline-block cursor-pointer transition-colors duration-[25ms] hover:text-blue-600 font-normal ${
                isCurrentWord 
                  ? 'bg-yellow-300 text-yellow-900 rounded shadow-lg' 
                  : 'text-gray-800'
              }`}
              onClick={() => timestamp && handleWordClick(index, timestamp.startTime)}
              onContextMenu={(e) => handleWordRightClick(e, word, index)}
              title={timestamp && 
                     typeof timestamp.startTime === 'number' && 
                     !isNaN(timestamp.startTime) 
                ? `Kelime ${index + 1}: ${timestamp.startTime.toFixed(2)}s` 
                : 'Timing bilgisi yok'}
              style={{
                // SABİT BOYUTLAR - Layout shift'i önlemek için
                minHeight: '1.8rem',
                height: '1.8rem',
                // SABİT PADDING - vurgulu/vurgusuz aynı boyut (azaltıldı)
                padding: '0.15rem 0.25rem',
                margin: '0.1rem 0.15rem',
                display: 'inline-flex',
                alignItems: 'center',
                verticalAlign: 'top',
                // BOX-SIZING - padding'i boyuta dahil et
                boxSizing: 'border-box',
                // BORDER - vurgulu/vurgusuz aynı kalınlık
                border: isCurrentWord ? '2px solid #fbbf24' : '2px solid transparent',
                // SHADOW - layout'u etkilemesin
                boxShadow: isCurrentWord ? '0 0 8px rgba(251, 191, 36, 0.4)' : 'none',
                // TRANSFORM - hiçbir transform kullanma
                transform: 'none',
                // BACKGROUND - geçiş sırasında boyut değişimi olmasın
                backgroundColor: isCurrentWord ? '#fde68a' : 'transparent',
                // TEXT OVERFLOW - uzun kelimeler için
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 'fit-content',
                // FLEX PROPERTIES - içerik merkezleme
                justifyContent: 'center',
                textAlign: 'center'
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    );
  };

  const renderHighlightedSentences = () => {
    if (sentenceTimestamps.length === 0) return null;
    
    // Genel kelime index'ini hesapla (tüm metindeki kelime sırası için)
    const getWordIndexInText = (sentenceIndex: number, wordIndexInSentence: number) => {
      let totalWords = 0;
      for (let i = 0; i < sentenceIndex; i++) {
        const sentenceWords = sentenceTimestamps[i].sentence.split(/\s+/).filter(word => word.length > 0);
        totalWords += sentenceWords.length;
      }
      return totalWords + wordIndexInSentence;
    };
    
    return (
      <div className="text-lg leading-relaxed" style={{ lineHeight: '1.8rem' }} onClick={hideContextMenu}>
        {sentenceTimestamps.map((sentenceData, index) => {
          const isCurrentSentence = index === currentSentenceIndex;
          const words = sentenceData.sentence.split(/\s+/).filter(word => word.length > 0);
          
          return (
            <span
              key={index}
              className={`inline-block mx-1 my-1 transition-all duration-[25ms] font-normal ${
                isCurrentSentence 
                  ? 'bg-blue-200 text-blue-900 px-2 py-1 rounded-lg shadow-lg border-2 border-blue-400' 
                  : 'text-gray-800 px-1 py-1 hover:bg-gray-100 rounded'
              }`}
              title={`Cümle ${index + 1}: ${sentenceData.startTime.toFixed(2)}s - ${sentenceData.endTime.toFixed(2)}s`}
              style={{
                // SABİT YÜKSEKLİK - her cümle aynı yükseklikte (azaltıldı)
                minHeight: '1.8rem',
                display: 'inline-flex',
                alignItems: 'center',
                verticalAlign: 'top',
                // Cümle vurgulaması için özel styling
                boxShadow: isCurrentSentence ? '0 0 12px rgba(59, 130, 246, 0.6)' : 'none',
                transform: 'none',
                wordBreak: 'break-word'
              }}
            >
              {words.map((word, wordIndex) => {
                const globalWordIndex = getWordIndexInText(index, wordIndex);
                return (
                  <span
                    key={`${index}-${wordIndex}`}
                    className="cursor-pointer hover:bg-yellow-200 rounded px-1 transition-colors duration-150"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSentenceClick(index, sentenceData.startTime);
                    }}
                    onContextMenu={(e) => handleWordRightClick(e, word, globalWordIndex)}
                    title={`Kelime: ${word} (Cümle ${index + 1})`}
                  >
                    {word}{wordIndex < words.length - 1 ? ' ' : ''}
                  </span>
                );
              })}
              .
            </span>
          );
        })}
      </div>
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const seekTime = parseFloat(e.target.value);
    audio.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  // Context menu handling
  const handleWordRightClick = (e: React.MouseEvent, word: string, wordIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      word: word.replace(/[.,!?;:]/g, ''), // Remove punctuation
      wordIndex
    });
  };

  const hideContextMenu = () => {
    setContextMenu({ show: false, x: 0, y: 0, word: '', wordIndex: -1 });
  };

  const handleAddToVocabulary = async () => {
    if (!contextMenu.word || isAddingWord) return;
    
    setIsAddingWord(true);
    try {
      // Kelimenin etrafındaki bağlamı bul
      const wordIndex = contextMenu.wordIndex;
      const allWords = words;
      
      console.log(`Debug - Word index: ${wordIndex}, Total words: ${allWords.length}`);
      console.log(`Debug - All words:`, allWords.slice(Math.max(0, wordIndex - 3), wordIndex + 4));
      
      let context = '';
      let originalSentence = '';
      
      // Orijinal cümleyi bul - cümle sınırlarını belirle
      const findOriginalSentence = (text: string, targetWord: string): string => {
        console.log(`Searching for word "${targetWord}" in text of length: ${text.length}`);
        
        // Daha geniş cümle ayırıcıları kullan ve boş cümleleri temizle
        const sentences = text.split(/[.!?;]+/).map(s => s.trim()).filter(s => s.length > 5);
        
        console.log(`Found ${sentences.length} sentences`);
        
        for (let i = 0; i < sentences.length; i++) {
          const sentence = sentences[i];
          if (sentence.toLowerCase().includes(targetWord.toLowerCase())) {
            console.log(`Found word in sentence ${i}: "${sentence}"`);
            
            // Cümleyi düzenle - nokta yoksa ekle
            let cleanSentence = sentence.trim();
            if (!cleanSentence.match(/[.!?]$/)) {
              cleanSentence += '.';
            }
            return cleanSentence;
          }
        }
        
        console.log(`Word not found in sentences, trying character-based search`);
        
        // Eğer cümlelerde bulamazsa kelimenin etrafındaki metni al
        const wordPos = text.toLowerCase().indexOf(targetWord.toLowerCase());
        if (wordPos >= 0) {
          console.log(`Found word at position: ${wordPos}`);
          
          // Kelimeden önceki ve sonraki cümle sınırlarını bul
          let start = wordPos;
          let end = wordPos + targetWord.length;
          
          // Geriye doğru giderek cümle başlangıcını bul
          while (start > 0 && !text[start].match(/[.!?]/)) {
            start--;
          }
          if (start > 0) start++; // Nokta işaretini geç
          
          // İleriye doğru giderek cümle sonunu bul
          while (end < text.length && !text[end].match(/[.!?]/)) {
            end++;
          }
          if (end < text.length) end++; // Nokta işaretini dahil et
          
          const extractedSentence = text.substring(start, end).trim();
          console.log(`Extracted sentence: "${extractedSentence}"`);
          return extractedSentence;
        }
        
        console.log(`Word "${targetWord}" not found in text`);
        return '';
      };
      
      // Eğer words array'i varsa buradan context al
      if (allWords && allWords.length > 0 && wordIndex >= 0 && wordIndex < allWords.length) {
        const startIndex = Math.max(0, wordIndex - 5);
        const endIndex = Math.min(allWords.length, wordIndex + 6);
        const contextWords = allWords.slice(startIndex, endIndex);
        context = contextWords.join(' ');
        
        // Orijinal cümleyi de bul
        originalSentence = findOriginalSentence(originalText, contextMenu.word);
      }
      
      // Eğer context boşsa original text'ten bir parça al
      if (!context || context.trim().length < 10) {
        console.log('Words array context failed, using originalText');
        const textWords = originalText.split(/\s+/);
        const wordInText = textWords.findIndex(w => w.toLowerCase().includes(contextMenu.word.toLowerCase()));
        
        if (wordInText >= 0) {
          const startIdx = Math.max(0, wordInText - 5);
          const endIdx = Math.min(textWords.length, wordInText + 6);
          context = textWords.slice(startIdx, endIdx).join(' ');
          originalSentence = findOriginalSentence(originalText, contextMenu.word);
        } else {
          // Son çare olarak kelimeyi originalText'te ara
          const wordPos = originalText.toLowerCase().indexOf(contextMenu.word.toLowerCase());
          if (wordPos >= 0) {
            const start = Math.max(0, wordPos - 50);
            const end = Math.min(originalText.length, wordPos + 50);
            context = originalText.substring(start, end);
            originalSentence = findOriginalSentence(originalText, contextMenu.word);
          } else {
            // Hiçbir şey bulamazsa basit bir context oluştur
            context = `The word "${contextMenu.word}" appears in an English text.`;
            originalSentence = '';
          }
        }
      }
      
      console.log(`Final context for "${contextMenu.word}": "${context}"`);
      console.log(`Original sentence for "${contextMenu.word}": "${originalSentence}"`);
      
      // Context hala boşsa hata ver
      if (!context || context.trim().length < 5) {
        throw new Error('Bağlam metni oluşturulamadı. Lütfen manuel olarak kelime ekleyin.');
      }
      
      // OpenAI çevirisi ile kelime ekle
      const result = await addWordWithTranslation(contextMenu.word, context, level, originalSentence);
      
      if (result.isExisting) {
        alert(`"${contextMenu.word}" kelimesi zaten kelime listenizdedir:\n\nAnlam: ${result.data.definition || 'Belirtilmemiş'}\nÖrnek: ${result.data.example_sentence || 'Belirtilmemiş'}`);
      } else if (result.translationError) {
        alert(`"${contextMenu.word}" kelimesi eklendi ancak çeviri yapılamadı. Anlamı manuel olarak ekleyebilirsiniz.`);
      } else {
        alert(`"${contextMenu.word}" kelimesi başarıyla eklendi!\n\nAnlam: ${result.data.definition}\nÖrnek Cümle: ${result.data.example_sentence}\nSeviye: ${result.data.level}`);
      }
      
      console.log(`Word "${contextMenu.word}" processed:`, result);
      
    } catch (error: any) {
      console.error('Error adding word to vocabulary:', error);
      if (error.message.includes('zaten listede mevcut')) {
        alert(`"${contextMenu.word}" kelimesi zaten kelime listenizdedir.`);
      } else {
        alert(`Kelime eklenirken hata oluştu: ${error.message}`);
      }
    } finally {
      setIsAddingWord(false);
      hideContextMenu();
    }
  };

  // Click outside to close context menu
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.show) {
        hideContextMenu();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu.show]);

  return (
    <div className={`w-full ${className}`}>
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        className="hidden"
      />
      
      {/* Context Menu */}
      {contextMenu.show && (
        <div
          className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg py-2 min-w-[150px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1 text-xs text-gray-500 border-b border-gray-200">
            "{contextMenu.word}"
          </div>
          <button
            onClick={handleAddToVocabulary}
            disabled={isAddingWord}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAddingWord ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Çeviriliyor...
              </>
            ) : (
              <>
                <i className="fas fa-plus mr-2 text-green-600"></i>
                Kelime Listesine Ekle (AI Çeviri)
              </>
            )}
          </button>
          <button
            onClick={hideContextMenu}
            className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 flex items-center"
          >
            <i className="fas fa-times mr-2"></i>
            İptal
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
        {/* Header with level and speaking rate - Sadece Hız ve Seviye bilgisi kalacak */}
        {(level || speakingRate) && (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              {level && (
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                  Seviye: {level}
                </span>
              )}
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full">
                Hız: {playbackRate}x
              </span>
            </div>
          </div>
        )}

        {/* Playback Speed Controls */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
            <i className="fas fa-tachometer-alt mr-2 text-orange-600"></i>
            Oynatma Hızı Kontrolü
          </h3>
          <div className="flex items-center space-x-2 flex-wrap">
            {[0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0].map((rate) => (
              <button
                key={rate}
                onClick={() => setPlaybackRate(rate)}
                className={`px-3 py-2 rounded transition-all duration-200 text-sm font-medium min-w-[60px] ${
                  playbackRate === rate
                    ? 'bg-orange-600 text-white shadow-lg transform scale-105'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-orange-50 hover:border-orange-300'
                }`}
                disabled={!isAudioLoaded}
                title={`${rate}x hızında oynat`}
              >
                {rate}x
              </button>
            ))}
          </div>
          <div className="mt-3 text-sm text-gray-600 flex items-center">
            <i className="fas fa-info-circle mr-2"></i>
            <span>
              {playbackRate < 1.0 && 'Daha yavaş konuşma - dil öğrenme için ideal'}
              {playbackRate === 1.0 && 'Normal hız - standart dinleme deneyimi'}
              {playbackRate > 1.0 && playbackRate <= 1.5 && 'Hızlı dinleme - daha verimli öğrenme'}
              {playbackRate > 1.5 && 'Çok hızlı - ileri seviye kullanıcılar için'}
            </span>
          </div>
        </div>

        {/* Ultra Precise Timing Offset Control */}
        <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
          <h3 className="text-lg font-semibold text-red-800 mb-3 flex items-center">
            <i className="fas fa-crosshairs mr-2 text-red-600"></i>
            🎯 Ultra Hassas Metin Vurgusu Senkronizasyonu
          </h3>
          
          {/* Current Offset Display */}
          <div className="mb-4 p-3 bg-white rounded-lg border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-sm font-medium text-gray-700">Mevcut Offset:</div>
                <div className={`text-lg font-bold px-3 py-1 rounded ${
                  timingOffset === 0 ? 'bg-green-100 text-green-800' : 
                  Math.abs(timingOffset) <= 0.1 ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-red-100 text-red-800'
                }`}>
                  {timingOffset > 0 ? '+' : ''}{(timingOffset * 1000).toFixed(0)}ms
                </div>
                <div className="text-xs text-gray-500">
                  ({timingOffset > 0 ? 'Metin önde' : timingOffset < 0 ? 'Metin geride' : 'Senkron'})
                </div>
              </div>
              <button
                onClick={() => setTimingOffset(0)}
                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-sm transition-colors"
                title="Offset'i sıfırla"
              >
                Reset
              </button>
            </div>
          </div>

                     {/* Coarse Adjustment for Large Offsets */}
           <div className="mb-3">
             <div className="text-sm font-medium text-gray-700 mb-2">Büyük Ayarlar (saniye bazında):</div>
             <div className="flex items-center space-x-2 justify-center">
               <button
                 onClick={() => setTimingOffset(prev => Math.max(prev - 1, -5))}
                 className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded font-mono text-sm"
                 title="1 saniye geri"
               >
                 -1s
               </button>
               <button
                 onClick={() => setTimingOffset(prev => Math.max(prev - 0.5, -5))}
                 className="px-3 py-2 bg-red-400 hover:bg-red-500 text-white rounded font-mono text-sm"
                 title="500ms geri"
               >
                 -500ms
               </button>
               <button
                 onClick={() => setTimingOffset(prev => Math.max(prev - 0.1, -5))}
                 className="px-3 py-2 bg-red-300 hover:bg-red-400 text-red-800 rounded font-mono text-sm"
                 title="100ms geri"
               >
                 -100ms
               </button>
               <div className="flex-1 mx-4">
                 <input
                   type="range"
                   min="-5"
                   max="5"
                   step="0.001"
                   value={timingOffset}
                   onChange={(e) => setTimingOffset(parseFloat(e.target.value))}
                   className="w-full h-3 bg-gradient-to-r from-red-300 via-green-300 to-blue-300 rounded-lg appearance-none cursor-pointer"
                   title={`Timing offset: ${(timingOffset * 1000).toFixed(0)}ms`}
                 />
               </div>
               <button
                 onClick={() => setTimingOffset(prev => Math.min(prev + 0.1, 5))}
                 className="px-3 py-2 bg-blue-300 hover:bg-blue-400 text-blue-800 rounded font-mono text-sm"
                 title="100ms ileri"
               >
                 +100ms
               </button>
               <button
                 onClick={() => setTimingOffset(prev => Math.min(prev + 0.5, 5))}
                 className="px-3 py-2 bg-blue-400 hover:bg-blue-500 text-white rounded font-mono text-sm"
                 title="500ms ileri"
               >
                 +500ms
               </button>
               <button
                 onClick={() => setTimingOffset(prev => Math.min(prev + 1, 5))}
                 className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-mono text-sm"
                 title="1 saniye ileri"
               >
                 +1s
               </button>
             </div>
           </div>

           {/* Ultra Fine Adjustment */}
           <div className="mb-4">
             <div className="text-sm font-medium text-gray-700 mb-2">Ultra Hassas Ayar (1ms hassasiyet):</div>
             <div className="flex items-center space-x-2 justify-center">
               <button
                 onClick={() => setTimingOffset(prev => Math.max(prev - 0.001, -5))}
                 className="px-2 py-1 bg-red-200 hover:bg-red-300 text-red-800 rounded text-xs font-mono"
                 title="1ms geri"
               >
                 -1ms
               </button>
               <button
                 onClick={() => setTimingOffset(prev => Math.max(prev - 0.005, -5))}
                 className="px-2 py-1 bg-red-300 hover:bg-red-400 text-red-800 rounded text-xs font-mono"
                 title="5ms geri"
               >
                 -5ms
               </button>
               <button
                 onClick={() => setTimingOffset(prev => Math.max(prev - 0.01, -5))}
                 className="px-2 py-1 bg-red-400 hover:bg-red-500 text-white rounded text-xs font-mono"
                 title="10ms geri"
               >
                 -10ms
               </button>
               <button
                 onClick={() => setTimingOffset(prev => Math.max(prev - 0.05, -5))}
                 className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-mono"
                 title="50ms geri"
               >
                 -50ms
               </button>
               
               <div className="px-4 py-2 bg-gray-100 rounded font-mono text-sm font-bold text-center min-w-[100px]">
                 {timingOffset >= 0 ? '+' : ''}{(timingOffset * 1000).toFixed(0)}ms
               </div>
               
               <button
                 onClick={() => setTimingOffset(prev => Math.min(prev + 0.05, 5))}
                 className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-mono"
                 title="50ms ileri"
               >
                 +50ms
               </button>
               <button
                 onClick={() => setTimingOffset(prev => Math.min(prev + 0.01, 5))}
                 className="px-2 py-1 bg-blue-400 hover:bg-blue-500 text-white rounded text-xs font-mono"
                 title="10ms ileri"
               >
                 +10ms
               </button>
               <button
                 onClick={() => setTimingOffset(prev => Math.min(prev + 0.005, 5))}
                 className="px-2 py-1 bg-blue-300 hover:bg-blue-400 text-blue-800 rounded text-xs font-mono"
                 title="5ms ileri"
               >
                 +5ms
               </button>
               <button
                 onClick={() => setTimingOffset(prev => Math.min(prev + 0.001, 5))}
                 className="px-2 py-1 bg-blue-200 hover:bg-blue-300 text-blue-800 rounded text-xs font-mono"
                 title="1ms ileri"
               >
                 +1ms
               </button>
             </div>
           </div>

                     {/* Quick Presets */}
           <div className="mb-4">
             <div className="text-sm font-medium text-gray-700 mb-2">Hızlı Ayarlar:</div>
             <div className="flex items-center space-x-2 flex-wrap gap-y-2">
               {/* Extreme negative offsets */}
               {[-5, -3, -2, -1, -0.5, -0.25, -0.1, -0.05, 0, 0.05, 0.1, 0.25, 0.5, 1, 2, 3, 5].map((offset) => (
                 <button
                   key={offset}
                   onClick={() => setTimingOffset(offset)}
                   className={`px-2 py-1 rounded text-xs font-mono transition-all duration-200 ${
                     Math.abs(timingOffset - offset) < 0.001
                       ? 'bg-purple-600 text-white shadow-lg transform scale-105'
                       : Math.abs(offset) >= 2
                       ? 'bg-orange-50 text-orange-700 border border-orange-300 hover:bg-orange-100 hover:border-orange-400'
                       : Math.abs(offset) >= 0.5
                       ? 'bg-yellow-50 text-yellow-700 border border-yellow-300 hover:bg-yellow-100 hover:border-yellow-400'
                       : 'bg-white text-gray-700 border border-gray-300 hover:bg-purple-50 hover:border-purple-300'
                   }`}
                   title={`${offset > 0 ? '+' : ''}${(offset * 1000).toFixed(0)}ms offset ayarla`}
                 >
                   {offset > 0 ? '+' : ''}{Math.abs(offset) >= 1 ? offset.toFixed(0) : (offset * 1000).toFixed(0)}
                   {Math.abs(offset) >= 1 ? 's' : 'ms'}
                 </button>
               ))}
             </div>
           </div>

                     <div className="text-xs text-gray-600 flex items-start space-x-2">
             <i className="fas fa-lightbulb mt-0.5 text-yellow-500"></i>
             <div>
               <div className="font-medium mb-1">💡 Kullanım İpuçları:</div>
               <ul className="list-disc list-inside space-y-1">
                 <li><strong>Metin geride kalıyorsa:</strong> Pozitif değer (+) kullanın (mavi butonlar)</li>
                 <li><strong>Metin önde gidiyorsa:</strong> Negatif değer (-) kullanın (kırmızı butonlar)</li>
                 <li><strong>Büyük farklar için:</strong> Saniye bazında butonları (±1s, ±500ms, ±100ms) kullanın</li>
                 <li><strong>İnce ayar için:</strong> Milisaniye butonlarını (±50ms, ±10ms, ±5ms, ±1ms) kullanın</li>
                 <li><strong>Slider:</strong> -5s ile +5s arası sürekli ayar için kaydırıcıyı kullanın</li>
                 <li><strong>Preset'ler:</strong> Yaygın değerler için hızlı preset butonlarını kullanın</li>
               </ul>
             </div>
           </div>
        </div>

        {/* Highlight Type Controls - GİZLENDİ */}
        {/* GIZLENDI - Vurgulama türü default cümle olacak bu yüzden ekrandaki "Vurgulama türü" alanını frontend de gizle */}

        {/* Original Turkish Text */}
        {originalTurkish && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              🇹🇷 Orijinal Türkçe Metin
            </h3>
            <p className="text-gray-700 leading-relaxed">
              {originalTurkish}
            </p>
          </div>
        )}



        {/* Synchronized Text Content */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            🎵 Senkronize Metin
          </h3>

          {/* Audio Controls - Moved here */}
          {showControls && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handlePlayPause}
                  disabled={!isAudioLoaded}
                  className={`flex items-center justify-center w-12 h-12 text-white rounded-full transition-colors ${
                    !isAudioLoaded 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                  title={!isAudioLoaded ? 'Audio yükleniyor...' : isPlaying ? 'Duraklat' : 'Oynat'}
                >
                  {!isAudioLoaded ? (
                    <svg className="w-6 h-6 animate-spin" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                  ) : isPlaying ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                
                <div className="flex-1">
                  <input
                    type="range"
                    min="0"
                    max={audioDuration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    disabled={!isAudioLoaded}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(audioDuration)}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsAdaptiveMode(!isAdaptiveMode)}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      isAdaptiveMode 
                        ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {isAdaptiveMode ? 'Adaptive' : 'Linear'}
                  </button>
                </div>
              </div>
            </div>
          )}
        
          {renderHighlightedText()}
          
          {currentCueIndex >= 0 && vttCues[currentCueIndex] && (
            <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
              <div className="text-sm text-blue-600 font-medium">Current Subtitle:</div>
              <div className="text-blue-800">{vttCues[currentCueIndex].text}</div>
            </div>
          )}
        </div>

      {/* Download Section - GİZLENDİ */}
      {/* GIZLENDI - MP3 indir ve VTT indir linklerini de gizle */}

      {/* Info Box - GİZLENDİ */}
      {/* GIZLENDI - "Yeni Senkronizasyon Mimarisi" başlıklı alanı kaldır */}
      
      {/* Debug Info - GİZLENDİ */}
      {/* GIZLENDI - div class="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-600" olan alanı kaldır */}
      </div>
    </div>
  );
} 