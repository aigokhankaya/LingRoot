import React, { useState, useCallback, memo, useMemo } from 'react';
import { useWordSync } from '../hooks/useWordSync';
import { addWordWithTranslation, getApiUrl } from '../lib/api';

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
  stats
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
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  // Handle word click
  const handleWordClick = (wordIndex: number) => {
    const timestamp = wordTimestamps[wordIndex];
    const clickedWord = textWords[wordIndex];
    
    console.log(`📍 [WEB WORD PRESS] Clicked word index: ${wordIndex}, word: "${clickedWord}"`);
    console.log(`📍 [WEB WORD PRESS] Timepoints length: ${wordTimestamps.length}, Words length: ${textWords.length}`);
    
    if (timestamp) {
      console.log(`📍 [WEB WORD PRESS] Clicked word from array: "${clickedWord}"`);
      console.log(`📍 [WEB WORD PRESS] Timepoint word: "${timestamp.word}", time=${timestamp.startTime.toFixed(2)}s`);
      
      // Find "idea" words near clicked word (within 30 words)
      const nearbyIdeas = wordTimestamps
        .map((tp, idx) => ({ tp, idx }))
        .filter(({ tp, idx }) => 
          tp.word.toLowerCase() === 'idea' && 
          Math.abs(idx - wordIndex) < 30
        );
      
      if (nearbyIdeas.length > 0) {
        console.log(`🔍 [WEB DEBUG] Found ${nearbyIdeas.length} "idea" word(s) near index ${wordIndex}:`);
        nearbyIdeas.forEach(({ tp, idx }) => {
          console.log(`  - Index ${idx}: time=${tp.startTime.toFixed(2)}s (distance: ${idx - wordIndex})`);
        });
      }
      
      seek(timestamp.startTime);
    }
  };

  // Context menu handling
  const handleWordRightClick = (e: React.MouseEvent, word: string, wordIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
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

      {/* Stats - Topic, Hız ve Seviye bilgisi */}
      {(topic || level || stats) && (
        <div className="mb-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          {topic && (
            <div className="mb-2 text-base font-semibold text-gray-800">
              🎙️ {topic}
            </div>
          )}
          <div className="flex justify-between">
            {level && <span>📈 Seviye: {level}</span>}
            {stats && stats.timepointsCount && <span>⏱️ Süre: {formatTime(duration)}</span>}
          </div>
        </div>
      )}

      {/* Vurgulama Türü Kontrolü - GİZLENDİ */}
      {/* GIZLENDI - Vurgulama türü default cümle olacak bu yüzden ekrandaki "Vurgulama türü" alanını frontend de gizle */}

      {/* Text Display */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg min-h-[200px] overflow-y-auto max-h-[400px]">
        {renderText()}
      </div>

      {/* Audio Controls */}
      {showControls && (
        <div className="space-y-4">
          {/* Playback Controls */}
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={isPlaying ? pause : play}
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
          {/* GIZLENDI - MP3 indir ve VTT indir linklerini de gizle */}
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
            className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg py-2 min-w-[150px]"
            style={{
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`,
            }}
          >
            <button
              onClick={handleAddToVocabulary}
              disabled={isAddingWord}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 disabled:opacity-50"
            >
              {isAddingWord ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-2"></div>
                  Ekleniyor...
                </span>
              ) : (
                <span className="flex items-center">
                  <i className="fas fa-plus-circle mr-2 text-green-600"></i>
                  Kelime Listesine Ekle
                </span>
              )}
            </button>
          </div>
        </>
      )}

      {/* Pattern Popup Modal */}
      {selectedPattern && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black bg-opacity-60"
          onClick={() => setSelectedPattern(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-5 bg-gray-50 border-b-2 border-gray-200 rounded-t-2xl">
              <h3 className="text-lg font-bold text-gray-800">{selectedPattern.pattern}</h3>
              <button
                onClick={() => setSelectedPattern(null)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 font-semibold"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              {/* Anlamı - Yellow Card */}
              <div className="p-4 bg-yellow-50 border-2 border-yellow-400 rounded-xl">
                <div className="flex items-center mb-2">
                  <span className="text-base mr-2">🇹🇷</span>
                  <span className="text-xs font-bold text-gray-700">Anlamı</span>
                </div>
                <p className="text-sm text-gray-800 leading-5">{selectedPattern.pattern_tr || '-'}</p>
              </div>

              {/* Örnek Cümle - Blue Card */}
              <div className="p-4 bg-primary/5 border-2 border-primary/40 rounded-xl">
                <div className="flex items-center mb-2">
                  <span className="text-base mr-2">🇬🇧</span>
                  <span className="text-xs font-bold text-gray-700">Örnek Cümle</span>
                </div>
                <p className="text-sm text-gray-800 leading-5">{selectedPattern.example_sentence || '-'}</p>
              </div>

              {/* Çeviri - Green Card */}
              <div className="p-4 bg-green-50 border-2 border-green-400 rounded-xl">
                <div className="flex items-center mb-2">
                  <span className="text-base mr-2">💬</span>
                  <span className="text-xs font-bold text-gray-700">Çeviri</span>
                </div>
                <p className="text-sm text-gray-800 leading-5">{selectedPattern.example_sentence_tr || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Usage Instructions - GİZLENDİ */}
      {/* GIZLENDI - "Yeni Senkronizasyon Mimarisi" başlıklı alanı kaldır */}

      {/* Debug Info - GİZLENDİ */}
      {/* GIZLENDI - div class="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-600" olan alanı kaldır */}
    </div>
  );
});

export default NewSyncedTextPlayer; 