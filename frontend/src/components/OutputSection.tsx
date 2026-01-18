import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import NewSyncedTextPlayer from './NewSyncedTextPlayer';
import PatternDetailModal from './PatternDetailModal';
import { markTopicAudioListened, addWordWithTranslation, lookupVocabularyWord, getApiUrl, createHeaders } from '../lib/api';
import { useGamification } from '../hooks/useGamification';
import { LevelUpModal, AchievementModal } from './gamification';

interface TtsResponseData {
  success?: boolean;
  message: string;
  mp3_url?: string;
  vtt_url?: string;
  adapted_text?: string;
  dialogue?: string;
  dialogue_segments?: Array<{
    lineIndex: number;
    speaker?: string;
    startTimeSeconds: number;
    endTimeSeconds: number;
    startWordIndex?: number;
    endWordIndex?: number;
  }>;
  words?: string[];
  timepoints?: Array<{
    timeSeconds: number;
    endTimeSeconds?: number;
    word?: string;
    markName?: string;
  }>;
  speaking_rate?: number;
  level?: string;
  original_turkish?: string;
  translated_text?: string;
  translatedText?: string;
  adaptedText?: string;
  input_type?: string;
  processing_duration?: number;
  estimated_cost?: number;
  voice?: string;
  topic?: string;
}

interface OutputSectionProps {
  audioResult: TtsResponseData;
  isLoggedIn: boolean;
  onAudioComplete?: () => void;
  disableSticky?: boolean; // Yeni prop: Sticky davranışı devre dışı bırakmak için
  audioRef?: React.RefObject<HTMLAudioElement | null>; // NEW
}

export default function OutputSection({ audioResult, isLoggedIn, onAudioComplete, disableSticky = false, audioRef }: OutputSectionProps) {
  const [showTranslation, setShowTranslation] = useState(false);
  const [activeDialogueIndex, setActiveDialogueIndex] = useState<number | null>(null);
  const [activeWordIndex, setActiveWordIndex] = useState<number>(-1);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [hasPinnedControls, setHasPinnedControls] = useState(false);

  // Gamification hook
  const {
    addXP,
    showLevelUp,
    levelUpData,
    closeLevelUp,
    showAchievement,
    newAchievement,
    closeAchievement,
    fireCelebration
  } = useGamification();


  const [patterns, setPatterns] = useState<Array<{
    pattern: string;
    type: string;
    translation: string;
    example_text: string;
    example_translation: string;
  }>>([]);
  const [selectedPattern, setSelectedPattern] = useState<typeof patterns[0] | null>(null);

  // Word popup state for vocabulary features
  const [wordPopup, setWordPopup] = useState<{
    mode: 'info' | 'confirm';
    word: string;
    data?: {
      original_word?: string;
      word?: string;
      definition?: string;
      example_sentence?: string;
      example_sentence_turkish?: string;
      level?: string;
    } | null;
  } | null>(null);
  const [isAddingWord, setIsAddingWord] = useState(false);

  const activeWordRef = useRef<HTMLSpanElement | null>(null);
  const dialogueLineRefs = useRef<Array<HTMLDivElement | null>>([]);
  const lastAutoScrollAtRef = useRef<number>(0);
  const lastAutoScrollBucketRef = useRef<number>(-1);

  const handleWordChange = (wordIndex: number, playing: boolean) => {
    setActiveWordIndex(wordIndex);
    setIsAudioPlaying(playing);
    // Sticky davranış disabled ise hasPinnedControls'u asla true yapma
    if (playing && !disableSticky) {
      setHasPinnedControls(true);
    }
  };

  const adaptedText = audioResult.adapted_text || audioResult.adaptedText || '';
  const adaptedTextWords = adaptedText.split(/\s+/).filter((word: string) => word.length > 0);

  const translatedText = audioResult.translated_text || audioResult.translatedText || '';

  // Fetch patterns from pattern_library when text is available
  useEffect(() => {
    const fetchPatterns = async () => {
      if (!adaptedText || adaptedText.length < 10) return;

      try {
        const url = getApiUrl('/patterns/find');
        const headers = createHeaders('application/json');
        const response = await fetch(url, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            text: adaptedText,
            level: audioResult.level || null
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.patterns) {
            console.log(`✨ [OutputSection] Loaded ${data.patterns.length} patterns`);
            setPatterns(data.patterns);
          }
        }
      } catch (error) {
        console.error('[OutputSection] Error fetching patterns:', error);
      }
    };

    fetchPatterns();
  }, [adaptedText, audioResult.level]);

  // Calculate pattern ranges (startIndex, endIndex) for highlighting
  const patternRanges = useMemo(() => {
    if (patterns.length === 0) return [];

    const ranges: Array<{ startIndex: number; endIndex: number; pattern: typeof patterns[0] }> = [];

    // Helper to clean a word for comparison (remove all punctuation, normalize quotes)
    const cleanWord = (w: string) => w
      .toLowerCase()
      .replace(/[''`]/g, "'")     // Normalize apostrophes first
      .replace(/[""„]/g, '"')     // Normalize double quotes
      .replace(/[.,!?;:'"«»()\[\]{}]/g, '')  // Remove punctuation
      .trim();

    for (const p of patterns) {
      const phraseWords = p.pattern.toLowerCase().split(/\s+/).map(w => cleanWord(w));
      const phraseLength = phraseWords.length;

      // Scan through words to find matches
      for (let startIdx = 0; startIdx <= adaptedTextWords.length - phraseLength; startIdx++) {
        const candidateWords = adaptedTextWords.slice(startIdx, startIdx + phraseLength);
        const candidatePhrase = candidateWords.map(w => cleanWord(w)).join(' ');
        const targetPhrase = phraseWords.join(' ');

        if (candidatePhrase === targetPhrase) {
          ranges.push({
            startIndex: startIdx,
            endIndex: startIdx + phraseLength - 1,
            pattern: p
          });
          console.log(`✨ [OutputSection] Pattern match found: "${p.pattern}" at indices ${startIdx}-${startIdx + phraseLength - 1}`);
        }
      }
    }

    // Filter overlapping patterns - keep only the longest one
    // Sort by length (descending) so longer patterns take precedence
    const sortedRanges = [...ranges].sort((a, b) => {
      const lenA = a.endIndex - a.startIndex;
      const lenB = b.endIndex - b.startIndex;
      return lenB - lenA; // Longer first
    });

    // Filter out patterns that overlap with a longer one
    const filteredRanges = sortedRanges.filter((range, idx, arr) => {
      // Check if this range overlaps with any longer range (that comes before in sorted array)
      for (let i = 0; i < idx; i++) {
        const longer = arr[i];
        // Check overlap: ranges overlap if one starts before the other ends
        const overlaps = range.startIndex <= longer.endIndex && range.endIndex >= longer.startIndex;
        if (overlaps) {
          console.log(`🔄 [OutputSection] Filtering out "${range.pattern.pattern}" - overlaps with longer "${longer.pattern.pattern}"`);
          return false; // Filter out this shorter/equal range
        }
      }
      return true;
    });

    console.log(`📋 [OutputSection] Total pattern ranges: ${ranges.length}, after filtering: ${filteredRanges.length}`);
    return filteredRanges;
  }, [patterns, adaptedTextWords]);

  // Check if word at index is part of a pattern
  const getPatternForWord = useCallback((wordIndex: number) => {
    return patternRanges.find(r => wordIndex >= r.startIndex && wordIndex <= r.endIndex)?.pattern || null;
  }, [patternRanges]);

  // Check if word is first in a pattern (for border rendering)
  const isFirstInPattern = useCallback((wordIndex: number) => {
    return patternRanges.some(r => r.startIndex === wordIndex);
  }, [patternRanges]);

  // Check if word is last in a pattern
  const isLastInPattern = useCallback((wordIndex: number) => {
    return patternRanges.some(r => r.endIndex === wordIndex);
  }, [patternRanges]);

  const splitIntoSentences = (text: string): string[] => {
    return text
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  };

  const englishSentences = splitIntoSentences(adaptedText);
  const turkishSentences = splitIntoSentences(translatedText);

  const getActiveSentenceIndex = (wordIndex: number): number => {
    if (wordIndex < 0) return -1;

    let wordCount = 0;
    for (let i = 0; i < englishSentences.length; i++) {
      const sentenceWords = englishSentences[i].split(/\s+/).filter(w => w.length > 0);
      wordCount += sentenceWords.length;
      if (wordIndex < wordCount) {
        return i;
      }
    }
    return -1;
  };

  const activeSentenceIndex = isAudioPlaying ? getActiveSentenceIndex(activeWordIndex) : -1;

  // Handle English word click (tıklama veya sağ tıklama)
  const handleEnglishWordClick = async (rawWord: string, wordIndex: number) => {
    const cleanWord = (rawWord || '').replace(/[.,!?;:]/g, '').trim();
    if (!cleanWord) return;

    console.log('📚 [ENGLISH WORD CLICK] Word:', cleanWord, 'index:', wordIndex);

    let result: any = null;
    try {
      result = await lookupVocabularyWord(cleanWord);
    } catch (err) {
      console.error('Error during vocabulary lookup (OutputSection):', err);
    }

    // Eğer kelime zaten kullanıcının listesinde varsa bilgi popup'ı göster
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

    // Kelime listede yoksa ekleme onay popup'ı göster
    setWordPopup({
      mode: 'confirm',
      word: cleanWord,
      data: result?.data || null,
    });
  };

  // Add word to vocabulary from popup
  const handleAddWordFromPopup = async () => {
    if (!wordPopup?.word || isAddingWord) return;

    setIsAddingWord(true);
    try {
      const cleanWord = wordPopup.word;
      const originalText = adaptedText || audioResult.message || '';
      let context = '';
      let originalSentence = '';

      if (originalText) {
        const lower = originalText.toLowerCase();
        const pos = lower.indexOf(cleanWord.toLowerCase());
        if (pos >= 0) {
          const start = Math.max(0, pos - 50);
          const end = Math.min(originalText.length, pos + 50);
          context = originalText.substring(start, end).trim();
        }

        const sentences = originalText
          .split(/[.!?;]+/)
          .map(s => s.trim())
          .filter(s => s.length > 5);
        originalSentence =
          sentences.find(s => s.toLowerCase().includes(cleanWord.toLowerCase())) || context;
      }

      if (!context) {
        context = `The word "${cleanWord}" appears in an English text.`;
      }

      const result = await addWordWithTranslation(cleanWord, context, '', originalSentence);

      if (result.isExisting) {
        // Zaten var, bilgi popup'ına dönüştür
        setWordPopup({
          mode: 'info',
          word: cleanWord,
          data: {
            original_word: result.data?.original_word || result.data?.word,
            word: result.data?.word,
            definition: result.data?.definition || 'Belirtilmemiş',
            example_sentence: result.data?.example_sentence || 'Belirtilmemiş',
            example_sentence_turkish: result.data?.example_sentence_turkish,
            level: result.data?.level,
          },
        });
      } else {
        // Başarıyla eklendi, bilgi popup'ı göster
        setWordPopup({
          mode: 'info',
          word: cleanWord,
          data: {
            original_word: result.data?.original_word || result.data?.word,
            word: result.data?.word,
            definition: result.data?.definition,
            example_sentence: result.data?.example_sentence,
            example_sentence_turkish: result.data?.example_sentence_turkish,
            level: result.data?.level,
          },
        });
      }
    } catch (error: any) {
      console.error('Word add error:', error);
      alert(`Kelime eklenirken hata oluştu: ${error?.message || 'Bilinmeyen hata'}`);
      setWordPopup(null);
    } finally {
      setIsAddingWord(false);
    }
  };

  const handleDialogueWordRightClick = async (e: React.MouseEvent, rawWord: string) => {
    e.preventDefault();
    e.stopPropagation();

    const cleanWord = rawWord.replace(/[.,!?;:]/g, '').trim();
    if (!cleanWord) return;

    const ok = window.confirm(`"${cleanWord}" kelimesini kelime listenize eklemek istiyor musunuz?`);
    if (!ok) return;

    try {
      const originalText = audioResult.message || '';
      let context = '';
      let originalSentence = '';

      if (originalText) {
        const lower = originalText.toLowerCase();
        const pos = lower.indexOf(cleanWord.toLowerCase());
        if (pos >= 0) {
          const start = Math.max(0, pos - 50);
          const end = Math.min(originalText.length, pos + 50);
          context = originalText.substring(start, end).trim();
        }

        const sentences = originalText
          .split(/[.!?;]+/)
          .map(s => s.trim())
          .filter(s => s.length > 5);
        originalSentence =
          sentences.find(s => s.toLowerCase().includes(cleanWord.toLowerCase())) || context;
      }

      if (!context) {
        context = `The word "${cleanWord}" appears in an English text.`;
      }

      const result = await addWordWithTranslation(cleanWord, context, '', originalSentence);

      if (result.isExisting) {
        alert(
          `"${cleanWord}" kelimesi zaten kelime listenizdedir:\n\nAnlam: ${result.data?.definition || 'Belirtilmemiş'
          }\nÖrnek: ${result.data?.example_sentence || 'Belirtilmemiş'}`
        );
      } else if (result.translationError) {
        alert(
          `"${cleanWord}" kelimesi eklendi ancak çeviri yapılamadı. Anlamı manuel olarak ekleyebilirsiniz.`
        );
      } else {
        alert(
          `"${cleanWord}" kelimesi başarıyla eklendi!\n\nAnlam: ${result.data?.definition
          }\nÖrnek Cümle: ${result.data?.example_sentence}\nSeviye: ${result.data?.level}`
        );
      }
    } catch (error: any) {
      console.error('Dialogue word add error:', error);
      alert(`Kelime eklenirken hata oluştu: ${error?.message || 'Bilinmeyen hata'}`);
    }
  };

  const dialogueSourceText = (audioResult.dialogue && audioResult.dialogue.length > 0)
    ? audioResult.dialogue
    : (audioResult.message || '');

  const hasDialogueTranscript =
    !!dialogueSourceText && /^(Speaker\s+[AB]|Host|Guest):/im.test(dialogueSourceText);

  const isPodcast = (audioResult as any)?.input_type === 'podcast';
  const shouldShowPlainTextArea = !(isPodcast && hasDialogueTranscript);

  useEffect(() => {
    if (!isAudioPlaying) return;

    const now = Date.now();
    if (now - lastAutoScrollAtRef.current < 600) return;

    const el =
      (typeof activeDialogueIndex === 'number' && activeDialogueIndex >= 0)
        ? dialogueLineRefs.current[activeDialogueIndex] || null
        : activeWordRef.current;

    if (!el) return;

    const rect = el.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const bottomThreshold = viewportHeight * 0.85;

    const bucket = (typeof activeDialogueIndex === 'number' && activeDialogueIndex >= 0)
      ? Math.floor(activeDialogueIndex / 8)
      : (activeWordIndex >= 0 ? Math.floor(activeWordIndex / 45) : -1);

    if (bucket < 0) return;
    if (bucket === lastAutoScrollBucketRef.current) return;

    if (rect.bottom > bottomThreshold) {
      lastAutoScrollAtRef.current = now;
      lastAutoScrollBucketRef.current = bucket;
      const step = Math.max(160, Math.floor(viewportHeight * 0.45));
      window.scrollBy({ top: step, behavior: 'smooth' });
    }
  }, [activeDialogueIndex, activeWordIndex, isAudioPlaying]);

  const convertToPlayableUrl = (url: string): string => {
    if (!url) return '';

    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    const backendBaseUrl = process.env.NODE_ENV === 'production'
      ? 'https://lingroot-backend.onrender.com'
      : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001');

    const cleanPath = url.startsWith('/') ? url.slice(1) : url;

    return `${backendBaseUrl}/${cleanPath}`;
  };

  if (!audioResult || !audioResult.mp3_url) {
    return (
      <div className="text-center p-8">
        <div className="text-red-600">
          <i className="fas fa-exclamation-triangle text-2xl mb-2"></i>
          <p>Audio oluşturulamadı. Lütfen tekrar deneyin.</p>
          {audioResult?.message && (
            <p className="text-sm mt-2 text-gray-600">{audioResult.message}</p>
          )}
        </div>
      </div>
    );
  }

  if (!audioResult.mp3_url) {
    return (
      <div className="text-center p-8">
        <div className="text-yellow-600">
          <i className="fas fa-clock text-2xl mb-2"></i>
          <p>Audio henüz hazır değil. Lütfen bekleyin...</p>
        </div>
      </div>
    );
  }

  const playableAudioUrl = convertToPlayableUrl(audioResult.mp3_url);
  const playableVttUrl = audioResult.vtt_url ? convertToPlayableUrl(audioResult.vtt_url) : undefined;

  return (
    <div className={`w-full max-w-6xl mx-auto mt-8 bg-white rounded-lg shadow-lg p-6 ${hasPinnedControls ? 'pt-32' : ''}`}>
      {/* Header with Topic Info and Toggle */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Konu: <span className="font-medium text-gray-800">{audioResult.topic || 'Günlük Yaşam'}</span></span>
          <span className="text-sm text-gray-600">Seviye: <span className="font-medium text-primary">{audioResult.level || 'A1'}</span></span>
        </div>

        {/* Show Original Language Toggle */}
        {shouldShowPlainTextArea && (audioResult.translated_text || audioResult.translatedText) && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowTranslation(!showTranslation)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: showTranslation
                  ? 'hsl(var(--primary))'
                  : 'hsl(var(--muted))',
                color: showTranslation
                  ? 'hsl(var(--primary-foreground))'
                  : 'hsl(var(--muted-foreground))'
              }}
            >
              <span>Show Original Language</span>
              <div
                className="relative inline-block w-10 h-5 rounded-full transition-colors"
                style={{
                  backgroundColor: showTranslation
                    ? 'hsl(var(--primary-foreground) / 0.35)'
                    : 'hsl(var(--primary) / 0.2)'
                }}
              >
                <div
                  className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform"
                  style={{ transform: showTranslation ? 'translateX(20px)' : 'translateX(0)' }}
                />
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Audio Player - Moved to bottom */}
      <div
        className={
          hasPinnedControls && !disableSticky
            ? 'fixed top-0 left-0 right-0 z-50 bg-transparent pointer-events-none'
            : 'mt-6 pt-6 border-t border-gray-200'
        }
      >
        <div className={hasPinnedControls && !disableSticky ? 'w-full max-w-6xl mx-auto px-6 py-3' : ''}>
          <div className={`relative ${hasPinnedControls && !disableSticky ? 'bg-white rounded-lg shadow-lg border border-gray-200 px-4 py-3 pointer-events-auto' : ''}`}>
            {hasPinnedControls && !disableSticky && (
              <button
                onClick={() => setHasPinnedControls(false)}
                className="absolute -top-3 -right-3 z-50 bg-white text-gray-400 hover:text-gray-600 rounded-full p-1 shadow-md border border-gray-200 transition-colors"
                title="Küçült"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
            <NewSyncedTextPlayer
              audioUrl={playableAudioUrl}
              words={audioResult.words || []}
              timepoints={audioResult.timepoints || []}
              dialogueSegments={audioResult.dialogue_segments || undefined}
              originalText={audioResult.dialogue && audioResult.dialogue.length > 0 ? audioResult.dialogue : (adaptedText || audioResult.message)}
              className=""
              showControls={true}
              externalAudioRef={audioRef} // NEW
              level={audioResult.level}
              originalTurkish={audioResult.original_turkish}
              topic={audioResult.topic}
              uiVariant={hasPinnedControls ? 'bare' : 'card'}
              downloadUrls={{
                mp3: playableAudioUrl,
                vtt: playableVttUrl
              }}
              stats={{
                wordsCount: audioResult.words?.length,
                timepointsCount: audioResult.timepoints?.length
              }}
              onPlay={() => { }}
              onActiveSegmentChange={(hasDialogueTranscript || (audioResult.dialogue_segments && audioResult.dialogue_segments.length > 0)) ? setActiveDialogueIndex : undefined}
              onWordChange={handleWordChange}
              onComplete={async () => {
                // Dinleme tamamlandığında işaretle
                if (audioResult.mp3_url) {
                  try {
                    await markTopicAudioListened(audioResult.mp3_url);
                    console.log('✅ Topic audio marked as listened');
                  } catch (e) {
                    console.error('markTopicAudioListened error:', e);
                  }
                }

                // 🎮 Gamification: İçerik tamamlandığında XP ver
                try {
                  const contentId = (audioResult as any).id || audioResult.mp3_url;
                  const result = await addXP(100, 'content', contentId);
                  if (result) {
                    console.log(`🎮 +${result.xpAdded} XP kazanıldı! Level: ${result.currentLevel}`);
                    fireCelebration('levelUp');
                  }
                } catch (e) {
                  console.error('addXP error:', e);
                }

                // Parent callback'i de çağır
                onAudioComplete?.();
              }}
              hideText={true}
            />
          </div>
        </div>
      </div>

      {/* Podcast Dialogue View (if message is dialogue-style transcript) */}
      {hasDialogueTranscript && (
        <div className="mb-6 space-y-3">
          {dialogueSourceText
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map((line, index) => {
              const match = line.match(/^((Speaker\s+[AB])|Host|Guest):\s*(.*)$/i);
              const speakerLabel = match ? match[1] : '';
              const text = match ? match[3] : line;
              const isSpeakerA = /Speaker\s+A/i.test(speakerLabel) || /^Host$/i.test(speakerLabel);
              const isActive = activeDialogueIndex === index;

              return (
                <div
                  key={index}
                  className={`flex ${isSpeakerA ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    ref={(el) => { dialogueLineRefs.current[index] = el; }}
                    className={`max-w-3xl rounded-2xl px-4 py-2 text-sm shadow-sm border transition-transform ${isSpeakerA
                      ? 'bg-blue-50 border-blue-100 text-gray-800'
                      : 'bg-green-50 border-green-100 text-gray-800'
                      } ${isActive ? 'ring-2 ring-primary shadow-md scale-[1.01]' : ''}`}
                  >
                    {speakerLabel && (
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                        {speakerLabel}
                      </div>
                    )}
                    <div className="leading-relaxed whitespace-pre-wrap">
                      {text
                        .split(/\s+/)
                        .filter(word => word.length > 0)
                        .map((word, wordIndex, arr) => (
                          <span
                            key={wordIndex}
                            className="cursor-text"
                            onContextMenu={e => handleDialogueWordRightClick(e, word)}
                          >
                            {word}
                            {wordIndex < arr.length - 1 ? ' ' : ''}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Text Content Area */}
      {shouldShowPlainTextArea && (audioResult.adapted_text || audioResult.adaptedText) && (
        <div className="mb-6">
          <div className={`grid gap-4 ${showTranslation && (audioResult.translated_text || audioResult.translatedText) ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {/* English Column with Word Highlighting */}
            <div className="bg-gray-50 rounded-lg p-6 relative">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">ENGLISH</h3>
                <button className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                  </svg>
                </button>
              </div>
              <div className="text-gray-800 leading-relaxed" style={{ fontSize: '15px', lineHeight: '1.8' }}>
                {adaptedTextWords.map((word: string, index: number) => {
                  const isCurrentWord = index === activeWordIndex && activeWordIndex >= 0;
                  const patternForWord = getPatternForWord(index);
                  const isInPattern = !!patternForWord;
                  const isPatternStart = isFirstInPattern(index);
                  const isPatternEnd = isLastInPattern(index);

                  // Build border classes for pattern highlighting
                  let patternClasses = '';
                  if (isInPattern) {
                    patternClasses = 'border-orange-400 border-y-2 cursor-pointer';
                    if (isPatternStart) patternClasses += ' border-l-2 rounded-l-md pl-1';
                    if (isPatternEnd) patternClasses += ' border-r-2 rounded-r-md pr-1';
                  }

                  return (
                    <span
                      key={index}
                      ref={isCurrentWord ? activeWordRef : undefined}
                      className={`transition-all duration-100 ${isInPattern ? patternClasses : 'cursor-pointer hover:bg-gray-200 rounded px-0.5'} ${isCurrentWord
                        ? 'bg-yellow-300 text-yellow-900 font-semibold px-1 py-0.5 rounded shadow-sm'
                        : ''
                        }`}
                      style={{ display: 'inline' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        // If word is part of a pattern, show pattern popup
                        if (patternForWord) {
                          setSelectedPattern(patternForWord);
                        } else {
                          handleEnglishWordClick(word, index);
                        }
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleEnglishWordClick(word, index);
                      }}
                      title={isInPattern ? `📚 ${patternForWord?.pattern} - Tıklayarak detay görün` : `Kelimeye tıklayarak bilgi alın veya ekleyin`}
                    >
                      {word}{' '}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Turkish Column - Only shown when toggle is active */}
            {showTranslation && (audioResult.translated_text || audioResult.translatedText) && (
              <div className="bg-gray-50 rounded-lg p-6 relative">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">TURKISH</h3>
                  <button className="text-gray-400 hover:text-gray-600 transition-colors">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                    </svg>
                  </button>
                </div>
                <div className="text-gray-800 leading-relaxed" style={{ fontSize: '15px', lineHeight: '1.8' }}>
                  {turkishSentences.map((sentence: string, index: number) => {
                    const isActiveSentence = activeSentenceIndex === index;
                    return (
                      <span
                        key={index}
                        className={`transition-all duration-200 ${isActiveSentence
                          ? 'bg-yellow-200 text-yellow-900 px-1 py-0.5 rounded'
                          : ''
                          }`}
                        style={{ display: 'inline' }}
                      >
                        {sentence}{' '}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Word Popup Modal */}
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
              &quot;{wordPopup.data?.original_word || wordPopup.data?.word || wordPopup.word}&quot;
            </div>

            {wordPopup.mode === 'info' ? (
              <div className="space-y-3 text-sm text-gray-800">
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
                  &quot;{wordPopup.word}&quot; kelimesini kelime listenize eklemek istiyor musunuz?
                </p>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setWordPopup(null)}
                    className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleAddWordFromPopup}
                    disabled={isAddingWord}
                    className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-60"
                  >
                    {isAddingWord ? 'Ekleniyor...' : 'Kelimeyi Ekle'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Architecture Comparison - GİZLENDİ */}
      {/* GIZLENDI - Yeni Senkronizasyon Mimarisi başlıklı alanı kaldır */}

      {/* Pattern Detail Modal */}
      <PatternDetailModal
        pattern={selectedPattern}
        onClose={() => setSelectedPattern(null)}
      />

      {/* Gamification Modals */}
      {showLevelUp && levelUpData && (
        <LevelUpModal
          isOpen={showLevelUp}
          onClose={closeLevelUp}
          oldLevel={levelUpData.oldLevel}
          newLevel={levelUpData.newLevel}
        />
      )}

      {showAchievement && newAchievement && (
        <AchievementModal
          isOpen={showAchievement}
          onClose={closeAchievement}
          achievement={newAchievement}
        />
      )}
    </div>
  );
}
