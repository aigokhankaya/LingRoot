import React, { useState, useCallback } from 'react';
import { useWordSync } from '../hooks/useWordSync';
import { addWordWithTranslation } from '../lib/api';

interface Timepoint {
  timeSeconds: number;
  endTimeSeconds?: number;
  word?: string;
  markName?: string;
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

export default function NewSyncedTextPlayer({
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
  
  // DEBUG: Log what NewSyncedTextPlayer receives
  console.log('🎭 [NEW SYNCED PLAYER DEBUG] Component initialized with:', {
    audioUrl,
    wordsLength: words?.length || 0,
    timepointsLength: timepoints?.length || 0,
    hasOriginalText: !!originalText,
    originalTextLength: originalText?.length || 0,
    showControls,
    words: words?.slice(0, 5) || 'NO_WORDS',
    timepoints: timepoints?.slice(0, 3) || 'NO_TIMEPOINTS'
  });
  // Yeni useWordSync hook'unu kullan
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
  
  // Text processing
  const textWords = originalText.split(/\s+/).filter(word => word.length > 0);
  const [contextMenu, setContextMenu] = useState<ContextMenu>({ 
    show: false, x: 0, y: 0, word: '', wordIndex: -1 
  });
  const [isAddingWord, setIsAddingWord] = useState(false);

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
    if (timestamp) {
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
                  if (timestamp) handleWordClick(index);
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
                    ? 'bg-blue-200 text-blue-900 px-3 py-2 rounded-lg shadow-lg border-2 border-blue-400' 
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

  // Render words with highlighting (endtime bilgileri kaldırıldı)
  const renderWords = () => {
    
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
        {textWords.map((word, index) => {
          const isCurrentWord = index === activeWordIndex;
          const timestamp = wordTimestamps[index];
          
          return (
            <span
              key={index}
              className={`inline-block cursor-pointer transition-all duration-75 hover:text-blue-600 font-normal ${
                isCurrentWord 
                  ? 'bg-yellow-300 text-yellow-900 rounded-md shadow-md scale-105' 
                  : 'text-gray-800'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (timestamp) handleWordClick(index);
              }}
              onContextMenu={(e) => handleWordRightClick(e, word, index)}
              title={timestamp ? 
                `Kelime ${index + 1}: ${timestamp.startTime.toFixed(2)}s` : 
                'Timing bilgisi yok'
              }
              style={{
                // Fixed dimensions to prevent layout shifts
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
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
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
              className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium"
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
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={0.5}>0.5x</option>
              <option value={0.75}>0.75x</option>
              <option value={1.0}>1.0x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={2.0}>2.0x</option>
            </select>
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
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500 mr-2"></div>
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

      {/* Usage Instructions - GİZLENDİ */}
      {/* GIZLENDI - "Yeni Senkronizasyon Mimarisi" başlıklı alanı kaldır */}

      {/* Debug Info - GİZLENDİ */}
      {/* GIZLENDI - div class="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-600" olan alanı kaldır */}
    </div>
  );
} 