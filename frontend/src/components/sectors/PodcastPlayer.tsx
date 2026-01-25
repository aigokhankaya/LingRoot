'use client';

/**
 * Podcast Player
 *
 * Gelişmiş podcast dinleme deneyimi.
 * İnteraktif transkript, vocabulary highlighting, anlama soruları.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Volume2,
    VolumeX,
    Rewind,
    FastForward,
    BookOpen,
    MessageSquare,
    Check,
    X,
    Sparkles,
    Trophy,
    Zap,
    Clock,
    ChevronRight,
    HelpCircle,
    Star,
    Bookmark,
    BookmarkCheck
} from 'lucide-react';

interface TranscriptSegment {
    id: number;
    start_time: number;
    end_time: number;
    text: string;
    translation?: string;
    vocabulary?: VocabularyItem[];
}

interface VocabularyItem {
    term: string;
    definition: string;
    phonetic?: string;
    example?: string;
}

interface ComprehensionQuestion {
    id: number;
    question: string;
    options: string[];
    correct_index: number;
    explanation?: string;
}

interface PodcastPlayerProps {
    contentId: number;
    title: string;
    sectorName: string;
    sectorColor?: string;
    audioUrl: string;
    duration: number;
    transcript: TranscriptSegment[];
    vocabulary?: VocabularyItem[];
    comprehensionQuestions?: ComprehensionQuestion[];
    onComplete?: (stats: PodcastStats) => void;
    onClose?: () => void;
    onXPEarned?: (xp: number) => void;
}

interface PodcastStats {
    listenedPercentage: number;
    vocabularyLearned: string[];
    questionsCorrect: number;
    questionsTotal: number;
    xpEarned: number;
    listenTime: number;
}

export function PodcastPlayer({
    contentId,
    title,
    sectorName,
    sectorColor = '#8B5CF6',
    audioUrl,
    duration,
    transcript,
    vocabulary = [],
    comprehensionQuestions = [],
    onComplete,
    onClose,
    onXPEarned
}: PodcastPlayerProps) {
    // Audio state
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);

    // UI state
    const [showTranslation, setShowTranslation] = useState(true);
    const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
    const [vocabularyLearned, setVocabularyLearned] = useState<Set<string>>(new Set());
    const [selectedVocab, setSelectedVocab] = useState<VocabularyItem | null>(null);
    const [bookmarkedSegments, setBookmarkedSegments] = useState<Set<number>>(new Set());

    // Quiz state
    const [showQuiz, setShowQuiz] = useState(false);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [answeredQuestions, setAnsweredQuestions] = useState<Map<number, boolean>>(new Map());
    const [showExplanation, setShowExplanation] = useState(false);

    // Completion state
    const [isCompleted, setIsCompleted] = useState(false);
    const [earnedXP, setEarnedXP] = useState(0);
    const [listenStartTime] = useState(Date.now());

    // Refs
    const audioRef = useRef<HTMLAudioElement>(null);
    const transcriptRef = useRef<HTMLDivElement>(null);

    const progress = (currentTime / duration) * 100;
    const currentQuestion = comprehensionQuestions[currentQuestionIndex];

    // Audio time update
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => {
            setCurrentTime(audio.currentTime);

            // Find active segment
            const segmentIndex = transcript.findIndex(
                (seg) => audio.currentTime >= seg.start_time && audio.currentTime < seg.end_time
            );
            if (segmentIndex !== -1 && segmentIndex !== activeSegmentIndex) {
                setActiveSegmentIndex(segmentIndex);

                // Auto-scroll to active segment
                const activeElement = document.getElementById(`segment-${segmentIndex}`);
                if (activeElement && transcriptRef.current) {
                    activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        };

        const handleEnded = () => {
            setIsPlaying(false);
            handleComplete();
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleEnded);
        };
    }, [transcript, activeSegmentIndex, duration]);

    // Playback rate change
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackRate;
        }
    }, [playbackRate]);

    // Volume change
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = isMuted ? 0 : volume;
        }
    }, [volume, isMuted]);

    const handlePlayPause = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            audio.play();
        }
        setIsPlaying(!isPlaying);
    }, [isPlaying]);

    const handleSeek = useCallback((time: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = Math.max(0, Math.min(time, duration));
        }
    }, [duration]);

    const handleSegmentClick = useCallback((segment: TranscriptSegment) => {
        handleSeek(segment.start_time);
    }, [handleSeek]);

    const handleVocabClick = (vocab: VocabularyItem) => {
        setSelectedVocab(vocab);
        setVocabularyLearned(prev => new Set([...Array.from(prev), vocab.term]));

        // XP for learning vocabulary
        if (!vocabularyLearned.has(vocab.term)) {
            setEarnedXP(prev => prev + 5);
        }
    };

    const toggleBookmark = (segmentId: number) => {
        setBookmarkedSegments(prev => {
            const newSet = new Set(prev);
            if (newSet.has(segmentId)) {
                newSet.delete(segmentId);
            } else {
                newSet.add(segmentId);
            }
            return newSet;
        });
    };

    const handleAnswerSelect = (index: number) => {
        if (answeredQuestions.has(currentQuestionIndex)) return;

        setSelectedAnswer(index);
        const isCorrect = index === currentQuestion.correct_index;
        setAnsweredQuestions(prev => new Map(prev.set(currentQuestionIndex, isCorrect)));
        setShowExplanation(true);

        // XP for correct answer
        if (isCorrect) {
            setEarnedXP(prev => prev + 20);
        }
    };

    const handleNextQuestion = () => {
        setShowExplanation(false);
        setSelectedAnswer(null);

        if (currentQuestionIndex < comprehensionQuestions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            // Quiz complete
            setShowQuiz(false);
            handleComplete();
        }
    };

    const handleComplete = useCallback(() => {
        const listenedPercentage = (currentTime / duration) * 100;
        const correctAnswers = Array.from(answeredQuestions.values()).filter(Boolean).length;

        // Calculate final XP
        const listeningXP = Math.floor(listenedPercentage * 0.5); // 50 XP for 100%
        const completionBonus = listenedPercentage >= 90 ? 50 : 0;
        const totalXP = earnedXP + listeningXP + completionBonus;

        setEarnedXP(totalXP);
        setIsCompleted(true);

        onXPEarned?.(totalXP);

        const stats: PodcastStats = {
            listenedPercentage,
            vocabularyLearned: Array.from(vocabularyLearned),
            questionsCorrect: correctAnswers,
            questionsTotal: comprehensionQuestions.length,
            xpEarned: totalXP,
            listenTime: Math.floor((Date.now() - listenStartTime) / 1000)
        };

        onComplete?.(stats);
    }, [currentTime, duration, answeredQuestions, earnedXP, vocabularyLearned, comprehensionQuestions.length, listenStartTime, onComplete, onXPEarned]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Completion Screen
    if (isCompleted) {
        const correctAnswers = Array.from(answeredQuestions.values()).filter(Boolean).length;

        return (
            <div className="fixed inset-0 z-50 bg-gray-900/95 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-3xl overflow-hidden"
                >
                    {/* Success Header */}
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-8 text-center text-white">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', delay: 0.2 }}
                            className="w-24 h-24 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-4"
                        >
                            <Trophy className="w-12 h-12" />
                        </motion.div>
                        <h2 className="text-2xl font-bold mb-2">Podcast Tamamlandı!</h2>
                        <p className="text-white/80">{title}</p>
                    </div>

                    {/* Stats */}
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                                <Zap className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                                <p className="text-2xl font-bold text-amber-600">+{earnedXP}</p>
                                <p className="text-xs text-gray-500">XP</p>
                            </div>
                            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                                <Clock className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                                <p className="text-2xl font-bold text-purple-600">{Math.round(progress)}%</p>
                                <p className="text-xs text-gray-500">Dinlendi</p>
                            </div>
                            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                                <Check className="w-6 h-6 mx-auto mb-2 text-green-500" />
                                <p className="text-2xl font-bold text-green-600">
                                    {correctAnswers}/{comprehensionQuestions.length}
                                </p>
                                <p className="text-xs text-gray-500">Doğru</p>
                            </div>
                        </div>

                        {/* Vocabulary */}
                        {vocabularyLearned.size > 0 && (
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                    <BookOpen className="w-4 h-4" />
                                    Öğrenilen Kelimeler
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {Array.from(vocabularyLearned).map((term, i) => (
                                        <span
                                            key={i}
                                            className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-sm"
                                        >
                                            {term}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => {
                                    setIsCompleted(false);
                                    setCurrentTime(0);
                                    if (audioRef.current) audioRef.current.currentTime = 0;
                                }}
                                className="flex-1 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium"
                            >
                                Tekrar Dinle
                            </button>
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold"
                            >
                                Tamam
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Quiz Modal
    if (showQuiz && currentQuestion) {
        return (
            <div className="fixed inset-0 z-50 bg-gray-900/95 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-3xl overflow-hidden"
                >
                    {/* Quiz Header */}
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-4 text-white">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <HelpCircle className="w-5 h-5" />
                                <span className="font-semibold">Anlama Sorusu</span>
                            </div>
                            <span className="text-sm bg-white/20 px-2 py-0.5 rounded-full">
                                {currentQuestionIndex + 1}/{comprehensionQuestions.length}
                            </span>
                        </div>
                    </div>

                    {/* Question */}
                    <div className="p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            {currentQuestion.question}
                        </h3>

                        <div className="space-y-3">
                            {currentQuestion.options.map((option, index) => {
                                const isSelected = selectedAnswer === index;
                                const isCorrect = index === currentQuestion.correct_index;
                                const isAnswered = answeredQuestions.has(currentQuestionIndex);

                                let bgColor = 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700';
                                if (isAnswered) {
                                    if (isCorrect) {
                                        bgColor = 'bg-green-100 dark:bg-green-900/30 border-green-500';
                                    } else if (isSelected) {
                                        bgColor = 'bg-red-100 dark:bg-red-900/30 border-red-500';
                                    }
                                } else if (isSelected) {
                                    bgColor = 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-500';
                                }

                                return (
                                    <button
                                        key={index}
                                        onClick={() => handleAnswerSelect(index)}
                                        disabled={isAnswered}
                                        className={`w-full p-4 rounded-xl border-2 text-left transition-all ${bgColor} ${
                                            isAnswered ? '' : 'border-transparent'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                                isAnswered && isCorrect
                                                    ? 'bg-green-500 text-white'
                                                    : isAnswered && isSelected && !isCorrect
                                                    ? 'bg-red-500 text-white'
                                                    : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                                            }`}>
                                                {String.fromCharCode(65 + index)}
                                            </div>
                                            <span className="text-gray-900 dark:text-white">{option}</span>
                                            {isAnswered && isCorrect && (
                                                <Check className="w-5 h-5 text-green-500 ml-auto" />
                                            )}
                                            {isAnswered && isSelected && !isCorrect && (
                                                <X className="w-5 h-5 text-red-500 ml-auto" />
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Explanation */}
                        <AnimatePresence>
                            {showExplanation && currentQuestion.explanation && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl"
                                >
                                    <p className="text-sm text-blue-700 dark:text-blue-300">
                                        <strong>Açıklama:</strong> {currentQuestion.explanation}
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Next Button */}
                        {showExplanation && (
                            <button
                                onClick={handleNextQuestion}
                                className="w-full mt-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
                            >
                                {currentQuestionIndex < comprehensionQuestions.length - 1 ? (
                                    <>
                                        Sonraki Soru
                                        <ChevronRight className="w-5 h-5" />
                                    </>
                                ) : (
                                    <>
                                        Tamamla
                                        <Check className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-900 flex flex-col">
            {/* Audio Element */}
            <audio ref={audioRef} src={audioUrl} preload="metadata" />

            {/* Header */}
            <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>

                    <div className="text-center">
                        <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
                            {title}
                        </h2>
                        <p className="text-xs text-gray-500">{sectorName}</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-full text-xs font-bold">
                            +{earnedXP} XP
                        </span>
                    </div>
                </div>
            </div>

            {/* Transcript */}
            <div ref={transcriptRef} className="flex-1 overflow-y-auto p-4">
                <div className="max-w-2xl mx-auto space-y-4">
                    {transcript.map((segment, index) => {
                        const isActive = index === activeSegmentIndex;
                        const isBookmarked = bookmarkedSegments.has(segment.id);

                        return (
                            <motion.div
                                id={`segment-${index}`}
                                key={segment.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className={`relative p-4 rounded-xl cursor-pointer transition-all ${
                                    isActive
                                        ? 'bg-purple-100 dark:bg-purple-900/30 ring-2 ring-purple-500'
                                        : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                }`}
                                onClick={() => handleSegmentClick(segment)}
                            >
                                {/* Timestamp */}
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-gray-400 font-mono">
                                        {formatTime(segment.start_time)}
                                    </span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleBookmark(segment.id);
                                        }}
                                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                    >
                                        {isBookmarked ? (
                                            <BookmarkCheck className="w-4 h-4 text-purple-500" />
                                        ) : (
                                            <Bookmark className="w-4 h-4 text-gray-400" />
                                        )}
                                    </button>
                                </div>

                                {/* Text */}
                                <p className={`text-gray-900 dark:text-white ${isActive ? 'font-medium' : ''}`}>
                                    {segment.text}
                                </p>

                                {/* Translation */}
                                {showTranslation && segment.translation && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 italic">
                                        {segment.translation}
                                    </p>
                                )}

                                {/* Vocabulary */}
                                {segment.vocabulary && segment.vocabulary.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-3">
                                        {segment.vocabulary.map((vocab, vi) => (
                                            <button
                                                key={vi}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleVocabClick(vocab);
                                                }}
                                                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                                                    vocabularyLearned.has(vocab.term)
                                                        ? 'bg-purple-500 text-white'
                                                        : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200'
                                                }`}
                                            >
                                                {vocab.term}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Vocabulary Popup */}
            <AnimatePresence>
                {selectedVocab && (
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        className="fixed bottom-32 left-4 right-4 max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 border border-gray-200 dark:border-gray-700"
                    >
                        <div className="flex items-start justify-between mb-2">
                            <div>
                                <h4 className="font-bold text-purple-600 dark:text-purple-400">
                                    {selectedVocab.term}
                                </h4>
                                {selectedVocab.phonetic && (
                                    <p className="text-xs text-gray-400">{selectedVocab.phonetic}</p>
                                )}
                                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                                    {selectedVocab.definition}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedVocab(null)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            >
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>
                        {selectedVocab.example && (
                            <p className="text-xs text-gray-500 italic">
                                "{selectedVocab.example}"
                            </p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Player Controls */}
            <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-4">
                <div className="max-w-4xl mx-auto">
                    {/* Progress Bar */}
                    <div className="mb-4">
                        <input
                            type="range"
                            min={0}
                            max={duration}
                            value={currentTime}
                            onChange={(e) => handleSeek(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />
                        <div className="flex justify-between mt-1 text-xs text-gray-500">
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>

                    {/* Main Controls */}
                    <div className="flex items-center justify-center gap-4">
                        {/* Rewind 10s */}
                        <button
                            onClick={() => handleSeek(currentTime - 10)}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <Rewind className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </button>

                        {/* Skip Back */}
                        <button
                            onClick={() => {
                                const prevIndex = Math.max(0, activeSegmentIndex - 1);
                                handleSeek(transcript[prevIndex]?.start_time || 0);
                            }}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <SkipBack className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                        </button>

                        {/* Play/Pause */}
                        <button
                            onClick={handlePlayPause}
                            className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg"
                        >
                            {isPlaying ? (
                                <Pause className="w-7 h-7 text-white" />
                            ) : (
                                <Play className="w-7 h-7 text-white ml-1" />
                            )}
                        </button>

                        {/* Skip Forward */}
                        <button
                            onClick={() => {
                                const nextIndex = Math.min(transcript.length - 1, activeSegmentIndex + 1);
                                handleSeek(transcript[nextIndex]?.start_time || 0);
                            }}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <SkipForward className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                        </button>

                        {/* Fast Forward 10s */}
                        <button
                            onClick={() => handleSeek(currentTime + 10)}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <FastForward className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </button>
                    </div>

                    {/* Secondary Controls */}
                    <div className="flex items-center justify-center gap-4 mt-4">
                        {/* Playback Rate */}
                        <button
                            onClick={() => {
                                const rates = [0.5, 0.75, 1, 1.25, 1.5];
                                const currentIndex = rates.indexOf(playbackRate);
                                const nextIndex = (currentIndex + 1) % rates.length;
                                setPlaybackRate(rates[nextIndex]);
                            }}
                            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            {playbackRate}x
                        </button>

                        {/* Translation Toggle */}
                        <button
                            onClick={() => setShowTranslation(!showTranslation)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                showTranslation
                                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700'
                                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            <BookOpen className="w-4 h-4" />
                            <span>Çeviri</span>
                        </button>

                        {/* Quiz Button */}
                        {comprehensionQuestions.length > 0 && (
                            <button
                                onClick={() => setShowQuiz(true)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm"
                            >
                                <HelpCircle className="w-4 h-4" />
                                <span>Sorular ({answeredQuestions.size}/{comprehensionQuestions.length})</span>
                            </button>
                        )}

                        {/* Volume */}
                        <button
                            onClick={() => setIsMuted(!isMuted)}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            {isMuted ? (
                                <VolumeX className="w-5 h-5 text-gray-400" />
                            ) : (
                                <Volume2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PodcastPlayer;
