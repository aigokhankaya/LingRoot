import React, { useState, useCallback, memo, useMemo, useEffect } from 'react';
import { useWordSync } from '../hooks/useWordSync';
import { addWordWithTranslation, lookupVocabularyWord, getApiUrl } from '../lib/api';

interface Timepoint {
  timeSeconds: number;
  endTimeSeconds?: number;
  word?: string;
  markName?: string;
}

interface PatternInfo {
  pattern: string;
  pattern_tr: string;
  example_sentence: string;
  example_sentence_tr: string;
}

interface UseWordSyncReturn {
  activeWordIndex: number;
  isPlaying: boolean;
  isBuffering: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  wordTimestamps: Array<{
    word: string;
    startTime: number;
    endTime: number;
  }>;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setPlaybackRate: (rate: number) => void;
}

interface NewSyncedTextPlayerProps {
  audioUrl: string;
  words: string[];
  timepoints: Timepoint[];
  originalText: string;
  className?: string;
  showControls?: boolean;
  level?: string;
  originalTurkish?: string;
  topic?: string;
  downloadUrls?: {
    mp3: string;
    vtt?: string;
  };
  stats?: {
    wordsCount?: number;
    timepointsCount?: number;
  };
  onPlay?: () => void;
  onActiveSegmentChange?: (segmentIndex: number) => void;
  onWordChange?: (wordIndex: number, isPlaying: boolean) => void;
  hideText?: boolean;
}

interface ContextMenu {
  show: boolean;
  x: number;
  y: number;
  word: string;
  wordIndex: number;
}

const NewSyncedTextPlayer = memo(function NewSyncedTextPlayer({
  audioUrl,
  words,
  timepoints,
  originalText,
  className = '',
  showControls = true,
  level,
  originalTurkish,
  topic,
  downloadUrls,
  stats,
  onPlay,
  onActiveSegmentChange,
  onWordChange,
  hideText = false
}: NewSyncedTextPlayerProps) {
  
  // Use useWordSync hook directly in component
  const {
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
  } = useWordSync({
    audioUrl,
    timepoints,
    originalText
  });

  // Component local state
  const [playbackRate, setLocalPlaybackRate] = useState<number>(1.0);
  const [highlightType, setHighlightType] = useState<'word' | 'sentence'>('word'); // Kelime vurgusu aktif
  const [showPatterns, setShowPatterns] = useState(false);
  const [patterns, setPatterns] = useState<PatternInfo[]>([]);
  const [loadingPatterns, setLoadingPatterns] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<PatternInfo | null>(null);
  
  // Text processing
  const textWords = originalText.split(/\s+/).filter(word => word.length > 0);
  const [contextMenu, setContextMenu] = useState<ContextMenu>({ 
    show: false, x: 0, y: 0, word: '', wordIndex: -1 
  });
  const [isAddingWord, setIsAddingWord] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [hasReportedPlay, setHasReportedPlay] = useState(false);
  const [wordPopup, setWordPopup] = useState<any | null>(null);

  // Call onWordChange callback when activeWordIndex or isPlaying changes
  useEffect(() => {
    if (onWordChange) {
      onWordChange(activeWordIndex, isPlaying);
    }
  }, [activeWordIndex, isPlaying, onWordChange]);

  const dialogueLines = useMemo(
    () =>
      originalText
        ? originalText
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0)
        : [],
    [originalText]
  );

  const dialogueLineRanges = useMemo(() => {
    if (!dialogueLines.length) return [] as { lineIndex: number; startIndex: number; endIndex: number }[];

    // Only treat as dialogue if at least one line looks like "Speaker A:" / "Speaker B:"
    const hasDialogueFormat = dialogueLines.some(line => /Speaker\s+[AB]:/i.test(line));
    if (!hasDialogueFormat) return [] as { lineIndex: number; startIndex: number; endIndex: number }[];

    const ranges: { lineIndex: number; startIndex: number; endIndex: number }[] = [];
    let globalIndex = 0;

    dialogueLines.forEach((line, lineIndex) => {
      // Speaker label'lerini ("Speaker A:" / "Speaker B:") kelime sayımından çıkar,
      // böylece globalIndex MFA'nin label'siz transcriptPlain'indeki kelime indexleriyle hizalanır.
      const match = line.match(/^(Speaker\s+[AB]):\s*(.*)$/i);
      const textOnly = match ? match[2] : line;
      const wordsInLine = textOnly.split(/\s+/).filter(word => word.length > 0);
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

  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(-1);

  // Load patterns from backend
  const loadPatterns = async () => {
    if (loadingPatterns || !originalText || !level) return;
    
    try {
      setLoadingPatterns(true);
      console.log(`🔍 [Pattern] Loading patterns for level: ${level}`);
      
      const token = localStorage.getItem('lingroot_token') || localStorage.getItem('auth_token') || localStorage.getItem('userToken');
      const apiUrl = getApiUrl('patterns/find');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: originalText, level })
      });
      
      const data = await response.json();
      console.log(`📊 [Pattern] Found ${data.patterns?.length || 0} patterns`);
      
      if (data.success && data.patterns) {
        setPatterns(data.patterns);
      }
    } catch (error) {
      console.error('❌ [Pattern] Error loading patterns:', error);
    } finally {
      setLoadingPatterns(false);
    }
  };

  // Format time helper
  const formatTime = (seconds: number) => {
    const totalMs = Math.floor(seconds * 1000);
    const mins = Math.floor(totalMs / 60000);
    const secs = Math.floor((totalMs % 60000) / 1000);
    const ms = totalMs % 1000;
    return `${mins}:${secs.toString().padStart(2, '0')}:${ms.toString().padStart(3, '0')}`;
  };

  // Handle playback rate change
  const handlePlaybackRateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const rate = parseFloat(e.target.value);
    setLocalPlaybackRate(rate);
    setPlaybackRate(rate);
  };

  // Handle seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(e.target.value);
    seek(seekTime);
  };

  const handleWordVocabularyAction = async (rawWord: string, wordIndex: number) => {
    const cleanWord = (rawWord || '').replace(/[.,!?;:]/g, '').trim();
    if (!cleanWord) return;

    console.log('📚 [VOCAB ACTION] Word:', cleanWord, 'index:', wordIndex);

    let result: any = null;
    try {
      result = await lookupVocabularyWord(cleanWord);
    } catch (err) {
      console.error('Error during vocabulary lookup (NewSyncedTextPlayer):', err);
    }

    // Context, handleAddToVocabulary için gerekli
    setContextMenu({
      show: false,
      x: 0,
      y: 0,
      word: cleanWord,
      wordIndex
    });

    if (result && result.found && result.data && result.hasUserWord) {
      const w = result.data;
      setWordPopup({
        mode: 'info',
        word: cleanWord,
        data: {
          original_word: w.original_word,
          word: w.word,
          definition: w.definition,
          example_sentence: w.example_sentence,
          example_sentence_turkish: w.example_sentence_turkish,
          level: w.level,
        },
      });
      return;
    }

    setWordPopup({
      mode: 'confirm',
      word: cleanWord,
      data: result?.data || null,
    });
  };

  // Handle word click (artık hem ses konumunu günceller hem de vocabulary aksiyonunu tetikler)
  const handleWordClick = async (wordIndex: number) => {
    const timestamp = wordTimestamps[wordIndex];
    const clickedWord = textWords[wordIndex];
    
    console.log(`📍 [WEB WORD PRESS] Clicked word index: ${wordIndex}, word: "${clickedWord}"`);
    console.log(`📍 [WEB WORD PRESS] Timepoints length: ${wordTimestamps.length}, Words length: ${textWords.length}`);
    
    if (timestamp) {
      console.log(`📍 [WEB WORD PRESS] Clicked word from array: "${clickedWord}"`);
      console.log(`📍 [WEB WORD PRESS] Timepoint word: "${timestamp.word}", time=${timestamp.startTime.toFixed(2)}s`);
      
      seek(timestamp.startTime);
    }

    // Ardından vocabulary lookup / ekleme akışını çalıştır
    await handleWordVocabularyAction(clickedWord, wordIndex);
  };

  // Context menu handling - sadece vocabulary aksiyonunu tetikler
  const handleWordRightClick = async (e: React.MouseEvent, word: string, wordIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    await handleWordVocabularyAction(word, wordIndex);
  };

  const hideContextMenu = () => {
    setContextMenu({ show: false, x: 0, y: 0, word: '', wordIndex: -1 });
  };

  // Sadece global vocabulary tablosundan anlam/örnek göster
  const handleShowWordInfo = async () => {
    if (!contextMenu.word || isLookingUp) return;

    setIsLookingUp(true);
    try {
      const lookupWord = contextMenu.word.trim();
      if (!lookupWord) return;

      const result = await lookupVocabularyWord(lookupWord);

      if (!result.found || !result.data) {
        alert(
          `"${lookupWord}" kelimesi için henüz sözlük kaydı bulunamadı.\n\n` +
          'Bu kelimeyi "Kelime Listesine Ekle" seçeneği ile ekleyebilirsiniz.'
        );
        return;
      }

      const w = result.data;
      const messageLines = [
        `"${w.original_word || w.word}"`,
        '',
        `Anlam: ${w.definition || '-'}`,
        `Seviye: ${(w.level || '').toUpperCase() || '-'}`,
        `Örnek Cümle: ${w.example_sentence || '-'}`,
        `Türkçe Örnek: ${w.example_sentence_turkish || '-'}`,
      ];

      alert(messageLines.join('\n'));
    } catch (error: any) {
      alert('Kelime bilgisi yüklenirken hata oluştu: ' + (error?.message || 'Bilinmeyen hata'));
    } finally {
      setIsLookingUp(false);
    }
  };

  // Add word to vocabulary
  const handleAddToVocabulary = async () => {
    if (!contextMenu.word || isAddingWord) return;
    
    setIsAddingWord(true);
    try {
      // Create context from surrounding words
      const contextWords = words.slice(
        Math.max(0, contextMenu.wordIndex - 5),
        Math.min(words.length, contextMenu.wordIndex + 6)
      );
      const context = contextWords.join(' ');
      
      // Find original sentence
      const sentences = originalText.split(/[.!?;]+/).map(s => s.trim()).filter(s => s.length > 5);
      const originalSentence = sentences.find(sentence => 
        sentence.toLowerCase().includes(contextMenu.word.toLowerCase())
      ) || '';
      
      const result = await addWordWithTranslation(contextMenu.word, context, '', originalSentence); // Level boş - OpenAI otomatik belirleyecek
      
      console.log('Kelime başarıyla eklendi:', result);
      alert(`"${contextMenu.word}" kelimesi kelime listenize eklendi!`);
    } catch (error) {
      console.error('Kelime ekleme hatası:', error);
      alert('Kelime eklenirken bir hata oluştu.');
    } finally {
      setIsAddingWord(false);
      hideContextMenu();
    }
  };

  // Map activeWordIndex from useWordSync to a dialogue line index (for Speaker A/B transcripts)
  useEffect(() => {
    if (!dialogueLineRanges.length) {
      if (activeSegmentIndex !== -1) {
        setActiveSegmentIndex(-1);
        if (onActiveSegmentChange) {
          onActiveSegmentChange(-1);
        }
      }
      return;
    }

    if (activeWordIndex < 0) {
      return;
    }

    const matchedRange = dialogueLineRanges.find(
      range => activeWordIndex >= range.startIndex && activeWordIndex <= range.endIndex
    );
    const newIndex = matchedRange ? matchedRange.lineIndex : -1;

    if (newIndex !== activeSegmentIndex) {
      setActiveSegmentIndex(newIndex);
      if (onActiveSegmentChange) {
        onActiveSegmentChange(newIndex);
      }
    }
  }, [activeWordIndex, dialogueLineRanges, activeSegmentIndex, onActiveSegmentChange]);

  // Render text with highlighting (word or sentence based)
  const renderText = () => {
    if (highlightType === 'sentence') {
      return renderSentences();
    } else {
      return renderWords();
    }
  };

  // Render sentences with highlighting and word-level interaction
  const renderSentences = () => {
    // Metni cümlelere böl
    const sentences = originalText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
    
    // Basit cümle vurgusu - current time'a göre yaklaşık hesaplama
    const getCurrentSentenceIndex = () => {
      if (!duration || duration === 0) return -1;
      const progress = currentTime / duration;
      return Math.floor(progress * sentences.length);
    };
    
    const currentSentenceIndex = getCurrentSentenceIndex();
    
    // Genel kelime index'ini hesapla (tüm metindeki kelime sırası için)
    const getWordIndexInText = (sentenceIndex: number, wordIndexInSentence: number) => {
      let totalWords = 0;
      for (let i = 0; i < sentenceIndex; i++) {
        const sentenceWords = sentences[i].split(/\s+/).filter(word => word.length > 0);
        totalWords += sentenceWords.length;
      }
      return totalWords + wordIndexInSentence;
    };
    
    return (
      <div 
        className="text-lg leading-relaxed select-text cursor-text"
        style={{ 
          lineHeight: '2rem',
          overflow: 'hidden',
          position: 'relative',
          contain: 'layout style'
        }}
        onClick={hideContextMenu}
      >
        {highlightType === 'word' ? (
          // Kelime bazında vurgulama
          textWords.map((word, index) => {
            const isCurrentWord = index === activeWordIndex;
            const timestamp = wordTimestamps[index];
            
            return (
              <span
                key={index}
                className={`inline-block cursor-pointer transition-all duration-200 mx-1 px-2 py-1 rounded ${
                  isCurrentWord 
                    ? 'bg-yellow-300 text-yellow-900 font-semibold shadow-md scale-105' 
                    : 'text-gray-800 hover:bg-gray-100'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (timestamp) {
                    handleWordClick(index);
                  }
                }}
                onContextMenu={(e) => handleWordRightClick(e, word, index)}
                title={timestamp ? 
                  `Kelime ${index + 1}: ${timestamp.startTime.toFixed(2)}s` : 
                  `Kelime ${index + 1}`
                }
              >
                {word}
              </span>
            );
          })
        ) : (
          // Cümle bazında vurgulama (eski kod)
          sentences.map((sentence, sentenceIndex) => {
            const isCurrentSentence = sentenceIndex === currentSentenceIndex;
            const words = sentence.split(/\s+/).filter(word => word.length > 0);
            
            return (
              <span
                key={sentenceIndex}
                className={`inline-block mx-1 my-1 transition-all duration-200 font-normal ${
                  isCurrentSentence 
                    ? 'bg-primary/10 text-primary px-3 py-2 rounded-lg shadow-lg border-2 border-primary/40' 
                    : 'text-gray-800 px-2 py-1 hover:bg-gray-100 rounded'
                }`}
                title={`Cümle ${sentenceIndex + 1}`}
                style={{
                  minHeight: '2rem',
                  display: 'inline-block',
                  whiteSpace: 'normal',
                  verticalAlign: 'top',
                  boxShadow: isCurrentSentence ? '0 0 12px rgba(59, 130, 246, 0.6)' : 'none',
                  transform: 'none',
                  wordBreak: 'normal'
                }}
              >
                {words.map((word, wordIndex) => {
                  const globalWordIndex = getWordIndexInText(sentenceIndex, wordIndex);
                  return (
                    <span
                      key={`${sentenceIndex}-${wordIndex}`}
                      className="inline inline-block cursor-pointer hover:bg-yellow-200 rounded px-1 transition-colors duration-150"
                      onClick={(e) => {
                        e.stopPropagation();
                        const sentenceProgress = sentenceIndex / sentences.length;
                        const targetTime = sentenceProgress * duration;
                        seek(targetTime);
                      }}
                      onContextMenu={(e) => handleWordRightClick(e, word, globalWordIndex)}
                      title={`Kelime: ${word} (Cümle ${sentenceIndex + 1})`}
                    >
                      {word}{wordIndex < words.length - 1 ? ' ' : ''}
                    </span>
                  );
                })}
                .
              </span>
            );
          })
        )}
      </div>
    );
  };

  // Calculate pattern ranges with useMemo
  const patternRanges = useMemo(() => {
    console.log(`🎨 [Pattern Ranges] showPatterns: ${showPatterns}, patterns.length: ${patterns.length}`);
    
    if (!showPatterns || patterns.length === 0) {
      console.log(`⚠️ [Pattern Ranges] Returning empty - showPatterns: ${showPatterns}, patterns: ${patterns.length}`);
      return [];
    }
    
    const ranges: Array<{ startIndex: number; endIndex: number; patternData: PatternInfo }> = [];
    
    for (const pData of patterns) {
      const phrase = pData.pattern.toLowerCase();
      const phraseWords = phrase.split(/\s+/);
      const phraseLength = phraseWords.length;
      
      console.log(`🔍 [Pattern] Searching for: "${phrase}" (${phraseLength} words)`);
      
      for (let startIdx = 0; startIdx <= textWords.length - phraseLength; startIdx++) {
        const candidateWords = textWords.slice(startIdx, startIdx + phraseLength);
        const candidatePhrase = candidateWords.map(w => w.toLowerCase().replace(/[.,!?;:]/g, '')).join(' ');
        
        if (candidatePhrase === phrase) {
          console.log(`✅ [Pattern] Found "${phrase}" at index ${startIdx}-${startIdx + phraseLength - 1}`);
          ranges.push({
            startIndex: startIdx,
            endIndex: startIdx + phraseLength - 1,
            patternData: pData
          });
        }
      }
    }
    
    console.log(`📊 [Pattern Ranges] Total ranges found: ${ranges.length}`);
    return ranges;
  }, [showPatterns, patterns, textWords]);

  const patternStartMap = useMemo(() => {
    const map = new Map<number, { endIndex: number; patternData: PatternInfo }>();
    patternRanges.forEach(range => {
      map.set(range.startIndex, {
        endIndex: range.endIndex,
        patternData: range.patternData,
      });
    });
    return map;
  }, [patternRanges]);

  // Render words with highlighting (endtime bilgileri kaldırıldı)
  const renderWords = () => {
    const elements: React.ReactNode[] = [];
    let index = 0;
    
    while (index < textWords.length) {
      const patternEntry = patternStartMap.get(index);
      
      if (patternEntry) {
        const { endIndex, patternData } = patternEntry;
        const phraseWords = textWords.slice(index, endIndex + 1);
        const phraseText = phraseWords.join(' ');
        const patternStartIndex = index;
        const isActive = activeWordIndex >= patternStartIndex && activeWordIndex <= endIndex;
        
        elements.push(
          <span
            key={`pattern-${patternStartIndex}`}
            className={`inline-flex cursor-pointer transition-all duration-150 px-3 py-1 rounded-xl border-2 ${
              isActive ? 'bg-yellow-300 border-yellow-500 shadow-lg' : 'bg-yellow-100 border-yellow-300'
            }`}
            style={{
              margin: '0.1rem 0.25rem',
              alignItems: 'center',
              gap: '0.3rem',
            }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPattern(patternData);
            }}
            title={`Pattern: ${patternData.pattern}`}
          >
            <span className="text-gray-900 font-medium">{phraseText}</span>
          </span>
        );
        
        index = endIndex + 1;
        continue;
      }
      
      const word = textWords[index];
      const isCurrentWord = index === activeWordIndex;
      const timestamp = wordTimestamps[index];
      
      elements.push(
        <span
          key={`word-${index}`}
          className={`inline-block cursor-pointer transition-all duration-75 hover:text-primary font-normal ${
            isCurrentWord 
              ? 'bg-yellow-300 text-yellow-900 rounded-md shadow-md scale-105' 
              : 'text-gray-800'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            if (timestamp) {
              handleWordClick(index);
            }
          }}
          onContextMenu={(e) => handleWordRightClick(e, word, index)}
          title={timestamp ? 
            `Kelime ${index + 1}: ${timestamp.startTime.toFixed(2)}s` : 
            'Timing bilgisi yok'
          }
          style={{
            minHeight: '1.8rem',
            padding: '0.2rem 0.3rem',
            margin: '0.1rem 0.2rem',
            display: 'inline-flex',
            alignItems: 'center',
            verticalAlign: 'top',
            boxSizing: 'border-box',
            border: isCurrentWord ? '2px solid #fbbf24' : '2px solid transparent',
            transform: isCurrentWord ? 'scale(1.05)' : 'scale(1)',
            transformOrigin: 'center',
            willChange: isCurrentWord ? 'transform' : 'auto'
          }}
        >
          {word}
        </span>
      );
      
      index += 1;
    }
    
    return (
      <div 
        className="text-lg leading-relaxed select-text cursor-text"
        style={{ 
          lineHeight: '1.8rem',
          // Prevent layout shifts
          overflow: 'hidden',
          position: 'relative',
          contain: 'layout style'
        }}
        onClick={hideContextMenu}
      >
        {elements}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3">Audio yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      {/* ARIA Live Region for accessibility */}
      <div
        id="word-sync-live-region"
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        role="status"
        aria-label="Currently playing word"
      />

      {/* Stats - Topic, Hız ve Seviye bilgisi - GİZLENDİ */}
      {/* GIZLENDI - Seviye ve Süre bilgisi üst alanda zaten gösteriliyor */}

      {/* Vurgulama Türü Kontrolü - GİZLENDİ */}
      {/* GIZLENDI - Vurgulama türü default cümle olacak bu yüzden ekrandaki "Vurgulama türü" alanını frontend de gizle */}

      {/* Text Display */}
      {!hideText && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg min-h-[200px] overflow-y-auto max-h-[400px]">
          {renderText()}
        </div>
      )}

      {/* Audio Controls */}
      {showControls && (
        <div className="space-y-4">
          {/* Playback Controls */}
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={() => {
                if (!isPlaying) {
                  if (!hasReportedPlay && onPlay) {
                    try {
                      onPlay();
                    } catch (e) {
                      console.error('onPlay callback error:', e);
                    }
                    setHasReportedPlay(true);
                  }
                  play();
                } else {
                  pause();
                }
              }}
              disabled={isBuffering}
              className="flex items-center space-x-2 bg-primary hover:bg-primary/90 disabled:bg-gray-400 text-primary-foreground px-6 py-2 rounded-lg font-medium"
            >
              {isBuffering ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Yükleniyor...</span>
                </>
              ) : isPlaying ? (
                <>
                  <i className="fas fa-pause"></i>
                  <span>Duraklat</span>
                </>
              ) : (
                <>
                  <i className="fas fa-play"></i>
                  <span>Oynat</span>
                </>
              )}
            </button>

            {/* Playback Rate */}
            <select
              value={playbackRate}
              onChange={handlePlaybackRateChange}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value={0.5}>0.5x</option>
              <option value={0.75}>0.75x</option>
              <option value={1.0}>1.0x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={2.0}>2.0x</option>
            </select>

            {/* Pattern Toggle Button */}
            {level && (
              <button
                onClick={() => {
                  if (!showPatterns && patterns.length === 0) {
                    loadPatterns();
                  }
                  setShowPatterns(!showPatterns);
                }}
                disabled={loadingPatterns}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  showPatterns 
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
                title="Günlük kullanım kalıplarını göster"
              >
                {loadingPatterns ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Yükleniyor...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Patterns</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>{formatTime(currentTime)}</span>
              <span>Kelime: {activeWordIndex + 1} / {wordTimestamps.length}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / duration) * 100}%, #e5e7eb ${(currentTime / duration) * 100}%, #e5e7eb 100%)`
              }}
            />
          </div>

          {/* Download Links - GİZLENDİ */}
          {/* GIZLENDİ - MP3 indir ve VTT indir linklerini de gizle */}
        </div>
      )}

      {/* Context Menu */}
      {contextMenu.show && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={hideContextMenu}
          />
          <div
            className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg py-2 min-w-[180px]"
            style={{
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`,
            }}
          >
            <button
              onClick={handleShowWordInfo}
              disabled={isLookingUp}
              className="w-full px-4 py-2 text-left hover:bg-blue-50 text-sm text-gray-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLookingUp ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500 mr-2"></div>
                  Yükleniyor...
                </span>
              ) : (
                <span className="flex items-center">
                  <i className="fas fa-book-open mr-2 text-blue-600"></i>
                  Anlamını Göster (Eğer varsa)
                </span>
              )}
            </button>
            <button
              onClick={handleAddToVocabulary}
              disabled={isAddingWord}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm flex items-center disabled:opacity-50"
            >
              {isAddingWord ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-2"></div>
                  Ekleniyor...
                </span>
              ) : (
                <span className="flex items-center">
                  <i className="fas fa-plus-circle mr-2 text-green-600"></i>
                  Kelime Listesine Ekle (AI Çeviri)
                </span>
              )}
            </button>
          </div>
        </>
      )}

      {wordPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
          onClick={() => setWordPopup(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 text-sm text-gray-500">Seçilen kelime</div>
            <div className="mb-4 text-lg font-semibold text-gray-900">
              "{wordPopup.data?.original_word || wordPopup.data?.word || wordPopup.word}"
            </div>

            {wordPopup.mode === 'info' ? (
              <div className="space-y-2 text-sm text-gray-800">
                <div>
                  <span className="font-semibold">Anlam: </span>
                  <span>{wordPopup.data?.definition || '-'}</span>
                </div>
                <div>
                  <span className="font-semibold">Seviye: </span>
                  <span>{(wordPopup.data?.level || '').toUpperCase() || '-'}</span>
                </div>
                <div>
                  <span className="font-semibold">Örnek Cümle: </span>
                  <span>{wordPopup.data?.example_sentence || '-'}</span>
                </div>
                <div>
                  <span className="font-semibold">Türkçe Örnek: </span>
                  <span>{wordPopup.data?.example_sentence_turkish || '-'}</span>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => setWordPopup(null)}
                    className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-sm text-gray-800">
                <p>
                  "{wordPopup.word}" kelimesini kelime listenize eklemek istiyor musunuz?
                </p>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setWordPopup(null)}
                    className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
                  >
                    İptal
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await handleAddToVocabulary();
                        setWordPopup(null);
                      } catch (err) {
                        console.error('Error adding word to vocabulary from popup (NewSyncedTextPlayer):', err);
                      }
                    }}
                    disabled={isAddingWord}
                    className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-60"
                  >
                    Kelimeyi Ekle
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default NewSyncedTextPlayer; 