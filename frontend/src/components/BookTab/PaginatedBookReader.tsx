import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { lookupVocabularyWord, addWordWithTranslation } from '@/lib/api';

interface Timepoint {
  timeSeconds: number;
  endTimeSeconds?: number;
  word?: string;
  markName?: string;
}

interface PaginatedBookReaderProps {
  adaptedText: string;
  translatedText?: string;
  mp3Url: string;
  vttUrl?: string;
  timepoints?: Timepoint[];
  words?: string[];
  level?: string;
  chapterTitle?: string;
  wordsPerPage?: number;
}

export default function PaginatedBookReader({
  adaptedText,
  translatedText,
  mp3Url,
  vttUrl,
  timepoints = [],
  words: providedWords,
  level = 'A2',
  chapterTitle,
  wordsPerPage = 120
}: PaginatedBookReaderProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showTranslation, setShowTranslation] = useState(false);
  const [fontSize, setFontSize] = useState(18);

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

  // Parse text into words
  const allWords = useMemo(() => {
    return adaptedText.split(/\s+/).filter(w => w.length > 0);
  }, [adaptedText]);

  // Parse Turkish text into sentences for page-level sync
  const turkishSentences = useMemo(() => {
    if (!translatedText) return [];
    return translatedText
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }, [translatedText]);

  // Split words into pages
  const pages = useMemo(() => {
    const result: string[][] = [];
    for (let i = 0; i < allWords.length; i += wordsPerPage) {
      result.push(allWords.slice(i, i + wordsPerPage));
    }
    return result;
  }, [allWords, wordsPerPage]);

  const totalPages = pages.length;

  // Calculate which page a word index belongs to
  const getPageForWordIndex = useCallback((wordIndex: number) => {
    return Math.floor(wordIndex / wordsPerPage);
  }, [wordsPerPage]);

  // Get word index range for a page
  const getWordRangeForPage = useCallback((pageIndex: number) => {
    const start = pageIndex * wordsPerPage;
    const end = Math.min(start + wordsPerPage, allWords.length);
    return { start, end };
  }, [wordsPerPage, allWords.length]);

  // Find current word based on audio time
  useEffect(() => {
    if (!isPlaying || timepoints.length === 0) return;

    let wordIndex = -1;
    for (let i = 0; i < timepoints.length; i++) {
      const tp = timepoints[i];
      const endTime = tp.endTimeSeconds || (timepoints[i + 1]?.timeSeconds || tp.timeSeconds + 0.5);
      if (currentTime >= tp.timeSeconds && currentTime < endTime) {
        wordIndex = i;
        break;
      }
    }

    if (wordIndex >= 0 && wordIndex !== activeWordIndex) {
      setActiveWordIndex(wordIndex);

      // Auto-navigate to the page containing this word
      const targetPage = getPageForWordIndex(wordIndex);
      if (targetPage !== currentPage) {
        setCurrentPage(targetPage);
      }
    }
  }, [currentTime, timepoints, isPlaying, activeWordIndex, currentPage, getPageForWordIndex]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration || 0);
    const handleEnded = () => {
      setIsPlaying(false);
      setActiveWordIndex(-1);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  // Update playback rate
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  const handleSeek = (value: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value;
      setCurrentTime(value);
    }
  };

  const skipTime = (seconds: number) => {
    if (audioRef.current) {
      const newTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const goToPage = (pageIndex: number) => {
    if (pageIndex >= 0 && pageIndex < totalPages) {
      setCurrentPage(pageIndex);

      // If we have timepoints, seek audio to the start of this page
      if (timepoints.length > 0) {
        const { start } = getWordRangeForPage(pageIndex);
        if (start < timepoints.length) {
          const targetTime = timepoints[start]?.timeSeconds || 0;
          handleSeek(targetTime);
        }
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get Turkish text for current page (approximate by sentence count)
  const getTurkishForPage = (pageIndex: number) => {
    if (!translatedText || turkishSentences.length === 0) return '';

    const sentencesPerPage = Math.ceil(turkishSentences.length / totalPages);
    const start = pageIndex * sentencesPerPage;
    const end = Math.min(start + sentencesPerPage, turkishSentences.length);
    return turkishSentences.slice(start, end).join(' ');
  };

  // Handle word click (tıklama veya sağ tıklama)
  const handleWordClick = async (rawWord: string) => {
    const cleanWord = (rawWord || '').replace(/[.,!?;:]/g, '').trim();
    if (!cleanWord) return;

    console.log('📚 [BOOK WORD CLICK] Word:', cleanWord);

    let result: any = null;
    try {
      result = await lookupVocabularyWord(cleanWord);
    } catch (err) {
      console.error('Error during vocabulary lookup (PaginatedBookReader):', err);
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
      let context = '';
      let originalSentence = '';

      if (adaptedText) {
        const lower = adaptedText.toLowerCase();
        const pos = lower.indexOf(cleanWord.toLowerCase());
        if (pos >= 0) {
          const start = Math.max(0, pos - 50);
          const end = Math.min(adaptedText.length, pos + 50);
          context = adaptedText.substring(start, end).trim();
        }

        const sentences = adaptedText
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

  const currentPageWords = pages[currentPage] || [];
  const { start: pageStartIndex } = getWordRangeForPage(currentPage);

  // Progress percentage for visual indicator
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Hidden audio element */}
      <audio ref={audioRef} src={mp3Url} preload="metadata" />

      {/* E-Reader Container */}
      <div className="relative bg-gradient-to-b from-amber-50 to-orange-50 rounded-2xl shadow-2xl overflow-hidden border border-amber-200/50">

        {/* Book Spine Effect (left edge) */}
        <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-amber-300/40 to-transparent z-10" />

        {/* Top Bar - Minimal e-reader style */}
        <div className="flex items-center justify-between px-6 py-3 bg-gradient-to-b from-amber-100/80 to-transparent">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-amber-800/70 uppercase tracking-wider">
              {chapterTitle || 'Chapter'}
            </span>
            <span className="w-1 h-1 rounded-full bg-amber-400" />
            <span className="text-xs text-amber-700/60">
              Seviye {level}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Font Size Controls */}
            <div className="flex items-center gap-1 bg-white/50 rounded-lg px-2 py-1">
              <button
                onClick={() => setFontSize(Math.max(14, fontSize - 2))}
                className="w-6 h-6 flex items-center justify-center text-amber-700 hover:bg-amber-200/50 rounded transition-colors text-xs font-bold"
              >
                A-
              </button>
              <span className="text-xs text-amber-600 w-8 text-center">{fontSize}</span>
              <button
                onClick={() => setFontSize(Math.min(28, fontSize + 2))}
                className="w-6 h-6 flex items-center justify-center text-amber-700 hover:bg-amber-200/50 rounded transition-colors text-sm font-bold"
              >
                A+
              </button>
            </div>

            {/* Translation Toggle - Always clickable */}
            <button
              onClick={() => setShowTranslation(!showTranslation)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${showTranslation
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-white/60 text-amber-700 hover:bg-white/80'
                }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
              <span>Show Original Language</span>
            </button>
          </div>
        </div>

        {/* Book Pages Container */}
        <div className={`grid ${showTranslation ? 'grid-cols-2 divide-x divide-amber-200/50' : 'grid-cols-1'}`}>

          {/* Left Page - English */}
          <div className="relative">
            {/* Page curl effect */}
            <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-amber-200/30 to-transparent rounded-bl-2xl" />

            <div className="px-10 py-8 min-h-[500px] flex flex-col">
              {/* Page Header */}
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-amber-200/40">
                <span className="text-[10px] uppercase tracking-[0.2em] text-amber-600/50 font-medium">
                  English
                </span>
                <span className="text-[10px] text-amber-500/50">
                  {currentPage + 1} / {totalPages}
                </span>
              </div>

              {/* Text Content */}
              <div
                className="flex-1 text-stone-800 leading-[1.9] font-serif"
                style={{ fontSize: `${fontSize}px`, wordBreak: 'break-word' }}
              >
                {currentPageWords.map((word, idx) => {
                  const globalIndex = pageStartIndex + idx;
                  const isCurrentWord = globalIndex === activeWordIndex && activeWordIndex >= 0;
                  return (
                    <span
                      key={idx}
                      className={`transition-all duration-200 cursor-pointer ${isCurrentWord
                        ? 'bg-amber-300 text-amber-900 px-1 py-0.5 rounded-sm shadow-sm font-medium'
                        : 'hover:bg-amber-200/70 rounded-sm'
                        }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleWordClick(word);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleWordClick(word);
                      }}
                      title="Kelimeye tıklayarak bilgi alın veya ekleyin"
                    >
                      {word}{' '}
                    </span>
                  );
                })}
              </div>

              {/* Page Footer */}
              <div className="mt-6 pt-3 border-t border-amber-200/40 flex justify-center">
                <span className="text-xs text-amber-400 italic">— {currentPage + 1} —</span>
              </div>
            </div>
          </div>

          {/* Right Page - Turkish or blank page (only when toggle is on) */}
          {showTranslation && (
            <div className="relative bg-gradient-to-b from-amber-50/50 to-orange-50/50">
              {/* Page curl effect */}
              <div className="absolute top-0 left-0 w-8 h-8 bg-gradient-to-br from-amber-200/30 to-transparent rounded-br-2xl" />

              <div className="px-10 py-8 min-h-[500px] flex flex-col">
                {/* Page Header */}
                <div className="flex items-center justify-between mb-6 pb-3 border-b border-amber-200/40">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-amber-600/50 font-medium">
                    {translatedText ? 'TÜRKÇE' : 'ORIGINAL LANGUAGE'}
                  </span>
                </div>

                {/* Text Content */}
                <div
                  className="flex-1 text-stone-700 leading-[1.9] font-serif"
                  style={{ fontSize: `${fontSize}px`, wordBreak: 'break-word' }}
                >
                  {translatedText ? (
                    getTurkishForPage(currentPage)
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-amber-500">
                      Çeviri bulunamadı. Karşı sayfa boş bırakıldı.
                    </div>
                  )}
                </div>

                {/* Page Footer */}
                <div className="mt-6 pt-3 border-t border-amber-200/40 flex justify-center">
                  <span className="text-xs text-amber-400 italic">— {currentPage + 1} —</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Page Navigation - Book style */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-t from-amber-100/80 to-transparent">
          {/* Previous Page */}
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 0}
            className="flex items-center gap-2 px-4 py-2 text-amber-700 hover:text-amber-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all group"
          >
            <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Önceki</span>
          </button>

          {/* Page Dots */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: Math.min(totalPages, 9) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 9) {
                pageNum = i;
              } else if (currentPage < 4) {
                pageNum = i;
              } else if (currentPage > totalPages - 5) {
                pageNum = totalPages - 9 + i;
              } else {
                pageNum = currentPage - 4 + i;
              }

              const isActive = pageNum === currentPage;

              return (
                <button
                  key={i}
                  onClick={() => goToPage(pageNum)}
                  className={`transition-all duration-200 ${isActive
                    ? 'w-8 h-2 bg-amber-600 rounded-full'
                    : 'w-2 h-2 bg-amber-300 rounded-full hover:bg-amber-400'
                    }`}
                  title={`Sayfa ${pageNum + 1}`}
                />
              );
            })}
          </div>

          {/* Next Page */}
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages - 1}
            className="flex items-center gap-2 px-4 py-2 text-amber-700 hover:text-amber-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all group"
          >
            <span className="text-sm font-medium">Sonraki</span>
            <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Audio Player - Floating bottom bar */}
      <div className="mt-4 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Progress Bar - Thin line at top */}
        <div className="h-1 bg-gray-100 relative">
          <div
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="px-6 py-4">
          {/* Time & Seek */}
          <div className="flex items-center gap-4 mb-4">
            <span className="text-xs font-mono text-gray-400 w-14">{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => handleSeek(Number(e.target.value))}
              className="flex-1 h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer hover:[&::-webkit-slider-thumb]:bg-amber-600 transition-all"
            />
            <span className="text-xs font-mono text-gray-400 w-14 text-right">{formatTime(duration)}</span>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-8">
            {/* Speed */}
            <div className="flex items-center gap-2">
              <select
                value={playbackRate}
                onChange={(e) => setPlaybackRate(Number(e.target.value))}
                className="bg-gray-50 text-sm px-3 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 cursor-pointer"
              >
                <option value={0.5}>0.5x</option>
                <option value={0.75}>0.75x</option>
                <option value={1}>1.0x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2.0x</option>
              </select>
            </div>

            {/* Skip Back */}
            <button
              onClick={() => skipTime(-15)}
              className="w-11 h-11 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all border border-gray-200"
              title="-15s"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
              </svg>
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:scale-105 transition-all"
            >
              {isPlaying ? (
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-7 h-7 ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Skip Forward */}
            <button
              onClick={() => skipTime(30)}
              className="w-11 h-11 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all border border-gray-200"
              title="+30s"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
              </svg>
            </button>

            {/* Word Counter */}
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="font-mono">
                {activeWordIndex >= 0 ? activeWordIndex + 1 : 0}/{allWords.length}
              </span>
            </div>
          </div>
        </div>
      </div>

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
    </div>
  );
}
