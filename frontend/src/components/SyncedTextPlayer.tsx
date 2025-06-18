import React, { useState, useEffect, useRef } from 'react';

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
  const [timingMethod, setTimingMethod] = useState<'VTT' | 'Backend' | 'Adaptive' | 'Linear'>('VTT');
  const [playbackRate, setPlaybackRate] = useState<number>(1.0); // 0.5x ile 2.0x arası hız kontrolü
  const [highlightType, setHighlightType] = useState<'word' | 'sentence'>('word'); // Vurgulama türü

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

  // Adaptive timing hesaplama fonksiyonu (konuşma hızını dikkate alır)
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
    
    const textWords = originalText.split(/\s+/).filter(word => word.length > 0);
    let calculatedTimestamps: WordTimestamp[] = [];
    let activeMethod = 'Linear';
    
    // Öncelik sırası: Backend Real Timepoints → VTT → Adaptive → Linear
    if (timepoints && timepoints.length > 0) {
      // Backend'den gelen gerçek timepoints (EN YÜKSEK ÖNCELİK)
      // Bu timing'ler zaten konuşma hızına göre hesaplanmış
      calculatedTimestamps = textWords.map((word, index) => {
        const timepoint = timepoints[index];
        const nextTimepoint = timepoints[index + 1];
        
        // Backend timepoints'leri DOĞRUDAN kullan (speaking rate zaten uygulanmış)
        const startTime = timepoint ? timepoint.timeSeconds : 
          (index / textWords.length) * audioDuration;
        
        // Eğer backend'den endTime geliyorsa onu kullan, yoksa tahmin et
        const endTime = timepoint?.endTimeSeconds !== undefined 
          ? timepoint.endTimeSeconds
          : (nextTimepoint ? nextTimepoint.timeSeconds : 
              (index < textWords.length - 1 ? ((index + 1) / textWords.length) * audioDuration : audioDuration));
        
        return { 
          word, 
          startTime, 
          endTime 
        };
      });
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
      console.log(`🔍 Backend timepoints have endTime: ${hasEndTimes}`);
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
      const currentTime = audio.currentTime;
      setCurrentTime(currentTime);
      
      // Çok hassas kelime tracking - backend timepoints için optimize edilmiş
      let foundWordIndex = -1;
      
              // Backend timepoints varsa çok hassas eşleşme kullan
        if (timingMethod === 'Backend') {
          // ULTRA HASSAS SENKRONIZASYON - Birebir timing için
          // Hiç tolerans kullanmadan tam eşleşme
          
          // 1. TAM ZAMANLAMA KONTROLÜ - Kelimenin tam zamanı içinde mi?
          for (let i = 0; i < wordTimestamps.length; i++) {
            const timestamp = wordTimestamps[i];
            
            // Kelime tam zamanı içinde mi kontrol et - hiç tolerans yok
            if (currentTime >= timestamp.startTime && currentTime <= timestamp.endTime) {
              foundWordIndex = i;
              break;
            }
          }
          
          // Tam eşleşme yoksa, EN YAKINI değil, EN UYGUN ZAMANI bul
          if (foundWordIndex === -1) {
            // Çok küçük toleransla sadece çok yakın olanları kabul et
            const ultraPreciseTolerance = 0.01; // Sadece 10ms tolerans - çok hassas
            
            for (let i = 0; i < wordTimestamps.length; i++) {
              const timestamp = wordTimestamps[i];
              
              // Kelimenin başlangıcına çok yakınsa (10ms içinde)
              if (Math.abs(currentTime - timestamp.startTime) <= ultraPreciseTolerance) {
                foundWordIndex = i;
                break;
              }
            }
          }
          
          // Hala bulunamadıysa, gelecek kelimeyi kontrol et (ses biraz önde olabilir)
          if (foundWordIndex === -1) {
            const futureCheckTolerance = 0.05; // 50ms gelecek kontrolü
            
            for (let i = 0; i < wordTimestamps.length; i++) {
              const timestamp = wordTimestamps[i];
              
              // Gelecek kelime çok yakınsa ve mevcut time biraz ilerideyse
              if (currentTime > timestamp.startTime - futureCheckTolerance && 
                  currentTime < timestamp.startTime + futureCheckTolerance) {
                foundWordIndex = i;
                break;
              }
            }
          }
      } else {
        // Diğer timing methodları için normal tolerance
        const baseTolerance = 0.15; // 150ms base tolerance
        const tolerance = baseTolerance / Math.max(speakingRate, 0.5); // Minimum 0.5x rate
        
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
          
          const maxDistance = 1.0 / Math.max(speakingRate, 0.5);
          if (closestDistance <= maxDistance) {
            foundWordIndex = closestIndex;
          }
        }
      }
      
      // AGRESIF GÜNCELLEME - Kelime atlamamak için
      if (foundWordIndex !== -1) {
        // HEMEN güncelle - hiç bekleme
        setCurrentWordIndex(foundWordIndex);
        
        // Debug bilgisi - ULTRA HASSAS SENKRONIZASYON tracking  
        if (process.env.NODE_ENV === 'development') {
          const timestamp = wordTimestamps[foundWordIndex];
          const actualOffset = currentTime - timestamp.startTime;
          const wordDuration = timestamp.endTime - timestamp.startTime;
          const wordProgress = (currentTime - timestamp.startTime) / wordDuration;
          
          // Ultra hassas senkronizasyon kriterleri
          const isExactMatch = currentTime >= timestamp.startTime && currentTime <= timestamp.endTime;
          const offsetMs = Math.abs(actualOffset) * 1000; // milisaniye cinsinden
          
          const syncStatus = isExactMatch ? '🎯 EXACT MATCH' : 
                            offsetMs <= 10 ? '🟢 Ultra Precise (<10ms)' : 
                            offsetMs <= 25 ? '🟡 Very Good (<25ms)' : 
                            offsetMs <= 50 ? '🟠 Acceptable (<50ms)' : '🔴 Off Sync (>50ms)';
          
          const rangeIcon = isExactMatch ? '✅' : '❌';
          const progressIcon = wordProgress >= 0 && wordProgress <= 1 ? '📍' : '📌';
          
          console.log(`${rangeIcon} ${progressIcon} Word ${foundWordIndex}: "${timestamp?.word}" | Time: ${currentTime.toFixed(3)}s | Range: ${timestamp?.startTime.toFixed(3)}s-${timestamp?.endTime.toFixed(3)}s | ${syncStatus} | Offset: ${actualOffset > 0 ? '+' : ''}${actualOffset.toFixed(3)}s (${offsetMs.toFixed(1)}ms) | Progress: ${(wordProgress * 100).toFixed(1)}% | Rate: ${playbackRate}x`);
        }
      } else {
        // Kelime bulunamadıysa VURGULAMAYı ÇıKAR - tam senkron için
        // Sadece tam eşleşme olduğunda vurgula, yoksa hiç vurgulama
        if (currentWordIndex !== -1) {
          setCurrentWordIndex(-1); // Vurgulamayı kaldır
        }
      }
      
      // CÜMLE VURGULAMASI - Hangi cümlede olduğumuzu bul
      if (highlightType === 'sentence' && sentenceTimestamps.length > 0) {
        let foundSentenceIndex = -1;
        
        // Aktif cümleyi bul
        for (let i = 0; i < sentenceTimestamps.length; i++) {
          const sentence = sentenceTimestamps[i];
          if (currentTime >= sentence.startTime && currentTime <= sentence.endTime) {
            foundSentenceIndex = i;
            break;
          }
        }
        
        // Bulunamadıysa en yakın cümleyi bul
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
          
          // Geniş toleransla kabul et
          if (closestDistance <= 0.2) {
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

    // ULTRA HIGH FREQUENCY UPDATE - 240 FPS equivalent
    // Birebir senkronizasyon için çok yüksek frekans güncelleme
    let lastUpdateTime = 0;
    const targetInterval = 1000 / 240; // 240 FPS = ~4.17ms interval
    
    const updateLoop = (currentAnimationTime: number) => {
      if (currentAnimationTime - lastUpdateTime >= targetInterval) {
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
  }, [currentWordIndex, wordTimestamps, vttCues, currentCueIndex, autoHighlight, highlightType, sentenceTimestamps, playbackRate]);

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
          className="text-lg leading-loose" 
          style={{ 
            lineHeight: '3rem',
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
              className={`inline-block cursor-pointer transition-colors duration-[25ms] hover:text-blue-600 font-semibold ${
                isCurrentWord 
                  ? 'bg-yellow-300 text-yellow-900 rounded shadow-lg' 
                  : 'text-gray-800'
              }`}
              onClick={() => timestamp && handleWordClick(index, timestamp.startTime)}
              title={timestamp ? `Kelime ${index + 1}: ${timestamp.startTime.toFixed(2)}s - ${timestamp.endTime.toFixed(2)}s` : 'Timing bilgisi yok'}
              style={{
                // SABİT BOYUTLAR - Layout shift'i önlemek için
                minHeight: '2.2rem',
                height: '2.2rem',
                // SABİT PADDING - vurgulu/vurgusuz aynı boyut
                padding: '0.25rem 0.5rem',
                margin: '0.125rem 0.25rem',
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
    
    return (
      <div className="text-lg leading-loose" style={{ lineHeight: '2.5rem' }}>
        {sentenceTimestamps.map((sentenceData, index) => {
          const isCurrentSentence = index === currentSentenceIndex;
          
          return (
            <span
              key={index}
              className={`inline-block mx-2 my-1 cursor-pointer transition-all duration-[25ms] hover:text-blue-600 ${
                isCurrentSentence 
                  ? 'bg-blue-200 text-blue-900 font-bold px-3 py-2 rounded-lg shadow-lg border-2 border-blue-400' 
                  : 'text-gray-800 px-2 py-1 hover:bg-gray-100 rounded'
              }`}
              onClick={() => handleSentenceClick(index, sentenceData.startTime)}
              title={`Cümle ${index + 1}: ${sentenceData.startTime.toFixed(2)}s - ${sentenceData.endTime.toFixed(2)}s`}
              style={{
                // SABİT YÜKSEKLİK - her cümle aynı yükseklikte
                minHeight: '2.5rem',
                display: 'inline-flex',
                alignItems: 'center',
                verticalAlign: 'top',
                // Cümle vurgulaması için özel styling
                boxShadow: isCurrentSentence ? '0 0 12px rgba(59, 130, 246, 0.6)' : 'none',
                transform: 'none',
                wordBreak: 'break-word'
              }}
            >
              {sentenceData.sentence.trim()}.
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

  return (
    <div className={`w-full ${className}`}>
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        className="hidden"
      />
      
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
        {/* Header with level and speaking rate */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <i className="fas fa-headphones mr-3 text-blue-600"></i>
            📖 Synchronized Text
          </h2>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            {level && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                Seviye: {level}
              </span>
            )}
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full">
              TTS Hız: {speakingRate}x
            </span>
            <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full">
              Oynatma: {playbackRate}x
            </span>
            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
              {timingMethod} Mode
            </span>
            {userInteractions.length > 0 && (
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                {userInteractions.length} hints
              </span>
            )}
          </div>
        </div>

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

        {/* Highlight Type Controls */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
            <i className="fas fa-highlighter mr-2 text-purple-600"></i>
            Vurgulama Türü
          </h3>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setHighlightType('word')}
              className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium flex items-center space-x-2 ${
                highlightType === 'word'
                  ? 'bg-purple-600 text-white shadow-lg transform scale-105'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-purple-50 hover:border-purple-300'
              }`}
              title="Kelimeleri tek tek vurgula"
            >
              <i className="fas fa-font text-sm"></i>
              <span>Kelime</span>
            </button>
            
            <button
              onClick={() => setHighlightType('sentence')}
              className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium flex items-center space-x-2 ${
                highlightType === 'sentence'
                  ? 'bg-purple-600 text-white shadow-lg transform scale-105'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-purple-50 hover:border-purple-300'
              }`}
              title="Cümleleri vurgula"
            >
              <i className="fas fa-paragraph text-sm"></i>
              <span>Cümle</span>
            </button>
          </div>
          <div className="mt-3 text-sm text-gray-600 flex items-center">
            <i className="fas fa-info-circle mr-2"></i>
            <span>
              {highlightType === 'word' && 'Kelimeler tek tek vurgulanır - detaylı takip için ideal'}
              {highlightType === 'sentence' && 'Cümleler bütün olarak vurgulanır - genel anlama odaklanma için ideal'}
            </span>
          </div>
        </div>

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
        
          {renderHighlightedText()}
          
          {currentCueIndex >= 0 && vttCues[currentCueIndex] && (
            <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
              <div className="text-sm text-blue-600 font-medium">Current Subtitle:</div>
              <div className="text-blue-800">{vttCues[currentCueIndex].text}</div>
            </div>
          )}
        </div>
      
      {/* Audio Controls */}
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

      {/* Download Section */}
      {downloadUrls && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <a
                href={downloadUrls.mp3}
                download
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <i className="fas fa-download mr-2"></i>
                MP3 İndir
              </a>
              {downloadUrls.vtt && (
                <a
                  href={downloadUrls.vtt}
                  download
                  className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <i className="fas fa-closed-captioning mr-2"></i>
                  VTT İndir
                </a>
              )}
            </div>
            
            {stats && (
              <div className="text-sm text-gray-500">
                {stats.wordsCount && (
                  <span>{stats.wordsCount} kelime • </span>
                )}
                {stats.timepointsCount && (
                  <span>{stats.timepointsCount} timing point</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start">
          <i className="fas fa-info-circle text-yellow-600 mt-1 mr-3"></i>
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-1">💡 Nasıl Kullanılır:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Audio oynatmak için play butonuna basın</li>
              <li>Kelimeler otomatik olarak vurgulanacak</li>
              <li>Kelimeye tıklayarak o bölümü dinleyebilirsiniz</li>
              <li>Adaptive mod siz tıkladıkça öğrenir ve zamanlamayı iyileştirir</li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-600">
          <div>Audio URL: {audioUrl}</div>
          <div>Audio Loaded: {isAudioLoaded ? '✅' : '❌'} | Duration: {audioDuration.toFixed(2)}s | Current Time: {currentTime.toFixed(2)}s | Word Index: {currentWordIndex}</div>
          <div>Speaking Rate: {speakingRate}x | Timing Method: {timingMethod} | Words: {wordTimestamps.length} | VTT Cues: {vttCues.length}</div>
          <div>Timepoints: {timepoints?.length || 0} | User Interactions: {userInteractions.length}</div>
          {currentWordIndex >= 0 && wordTimestamps[currentWordIndex] && (
            <div className="mt-2 p-2 bg-yellow-100 rounded">
              <div className="flex items-center justify-between">
                <div>
                  <strong>Current Word:</strong> "{wordTimestamps[currentWordIndex].word}" | 
                  <strong> Expected:</strong> {wordTimestamps[currentWordIndex].startTime.toFixed(2)}s-{wordTimestamps[currentWordIndex].endTime.toFixed(2)}s | 
                  <strong> Actual:</strong> {currentTime.toFixed(2)}s
                </div>
                <div className="flex items-center space-x-2">
                  {(() => {
                    const offset = currentTime - wordTimestamps[currentWordIndex].startTime;
                    const absOffset = Math.abs(offset);
                    let status = '✅';
                    let statusText = 'Perfect';
                    let statusColor = 'text-green-600';
                    
                    if (absOffset > 0.2) {
                      status = '❌';
                      statusText = 'Off';
                      statusColor = 'text-red-600';
                    } else if (absOffset > 0.1) {
                      status = '⚠️';
                      statusText = 'Close';
                      statusColor = 'text-yellow-600';
                    }
                    
                    return (
                      <div className={`flex items-center space-x-1 ${statusColor}`}>
                        <span>{status}</span>
                        <span className="font-medium">{statusText}</span>
                        <span className="text-xs">({offset > 0 ? '+' : ''}{offset.toFixed(2)}s)</span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
} 