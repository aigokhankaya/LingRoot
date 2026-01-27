'use client';

/**
 * Sector Flashcard Game
 *
 * Sektör terminolojisi için flashcard oyunu.
 * Swipe mekanizması, XP kazanımı ve ilerleme takibi.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import {
    Volume2,
    RotateCcw,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    Trophy,
    Target,
    Flame,
    X,
    Check
} from 'lucide-react';
import { getVocabularyRecommendations, VocabularyWord } from '@/lib/api';

interface SectorFlashcardGameProps {
    sectorId: number;
    sectorName?: string;
    mode?: 'review' | 'new' | 'mixed';
    onComplete?: (stats: GameStats) => void;
    onClose?: () => void;
}

interface GameStats {
    total: number;
    correct: number;
    incorrect: number;
    xpEarned: number;
    accuracy: number;
    streak: number;
    bestStreak: number;
}

const SWIPE_THRESHOLD = 100;

export function SectorFlashcardGame({
    sectorId,
    sectorName,
    mode = 'mixed',
    onComplete,
    onClose
}: SectorFlashcardGameProps) {
    const [loading, setLoading] = useState(true);
    const [words, setWords] = useState<VocabularyWord[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [stats, setStats] = useState<GameStats>({
        total: 0,
        correct: 0,
        incorrect: 0,
        xpEarned: 0,
        accuracy: 0,
        streak: 0,
        bestStreak: 0
    });
    const [gameComplete, setGameComplete] = useState(false);
    const [showFeedback, setShowFeedback] = useState<'correct' | 'incorrect' | null>(null);

    // Motion values for swipe
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-15, 15]);
    const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);

    useEffect(() => {
        loadWords();
    }, [sectorId, mode]);

    const loadWords = async () => {
        try {
            setLoading(true);
            const response = await getVocabularyRecommendations(sectorId, 15, mode);

            if (response.success && response.data) {
                let wordList: VocabularyWord[] = [];

                if (response.data.type === 'mixed') {
                    wordList = [
                        ...(response.data.review_words || []),
                        ...(response.data.new_words || [])
                    ];
                } else {
                    wordList = response.data.words || [];
                }

                // Shuffle words
                wordList = wordList.sort(() => Math.random() - 0.5);
                setWords(wordList);
                setStats(prev => ({ ...prev, total: wordList.length }));
            }
        } catch (error) {
            console.error('Error loading words:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = useCallback((isCorrect: boolean) => {
        setShowFeedback(isCorrect ? 'correct' : 'incorrect');

        // Update stats
        setStats(prev => {
            const newStreak = isCorrect ? prev.streak + 1 : 0;
            const xpGain = isCorrect ? (10 + Math.min(newStreak * 2, 10)) : 2;

            return {
                ...prev,
                correct: isCorrect ? prev.correct + 1 : prev.correct,
                incorrect: !isCorrect ? prev.incorrect + 1 : prev.incorrect,
                xpEarned: prev.xpEarned + xpGain,
                streak: newStreak,
                bestStreak: Math.max(prev.bestStreak, newStreak),
                accuracy: Math.round(((isCorrect ? prev.correct + 1 : prev.correct) / (prev.correct + prev.incorrect + 1)) * 100)
            };
        });

        // Move to next card after delay
        setTimeout(() => {
            setShowFeedback(null);
            setIsFlipped(false);
            x.set(0);

            if (currentIndex < words.length - 1) {
                setCurrentIndex(prev => prev + 1);
            } else {
                setGameComplete(true);
                onComplete?.(stats);
            }
        }, 500);
    }, [currentIndex, words.length, stats, onComplete, x]);

    const handleDragEnd = useCallback((event: any, info: PanInfo) => {
        if (Math.abs(info.offset.x) > SWIPE_THRESHOLD) {
            const isCorrect = info.offset.x > 0;
            handleAnswer(isCorrect);
        } else {
            x.set(0);
        }
    }, [handleAnswer, x]);

    const flipCard = () => {
        setIsFlipped(!isFlipped);
    };

    const speakWord = (word: string) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = 'en-US';
            speechSynthesis.speak(utterance);
        }
    };

    const currentWord = words[currentIndex];
    const progress = words.length > 0 ? ((currentIndex + 1) / words.length) * 100 : 0;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px]">
                <div className="w-16 h-16 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
                <p className="mt-4 text-gray-500">Kelimeler hazirlaniyor...</p>
            </div>
        );
    }

    if (words.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-8">
                <Target className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">Kelime Bulunamadi</h3>
                <p className="text-gray-500 mb-6">
                    Bu sektorde henuz calismaya hazir kelime yok.
                </p>
                <button
                    onClick={onClose}
                    className="px-6 py-3 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition-colors"
                >
                    Geri Don
                </button>
            </div>
        );
    }

    if (gameComplete) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center min-h-[500px] text-center p-8"
            >
                <div className="text-7xl mb-6">
                    {stats.accuracy >= 80 ? '🏆' : stats.accuracy >= 60 ? '🎉' : '💪'}
                </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                    {stats.accuracy >= 80 ? 'Mukemmel!' : stats.accuracy >= 60 ? 'Harika!' : 'Iyi Calisma!'}
                </h2>
                <p className="text-gray-500 mb-8">
                    {sectorName} kelime calismasini tamamladin.
                </p>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 w-full max-w-lg">
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4 text-center">
                        <Check className="w-6 h-6 text-green-500 mx-auto mb-1" />
                        <p className="text-2xl font-bold text-green-600">{stats.correct}</p>
                        <p className="text-xs text-gray-500">Dogru</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 text-center">
                        <X className="w-6 h-6 text-red-500 mx-auto mb-1" />
                        <p className="text-2xl font-bold text-red-600">{stats.incorrect}</p>
                        <p className="text-xs text-gray-500">Yanlis</p>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-4 text-center">
                        <Flame className="w-6 h-6 text-orange-500 mx-auto mb-1" />
                        <p className="text-2xl font-bold text-orange-600">{stats.bestStreak}</p>
                        <p className="text-xs text-gray-500">En Iyi Seri</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 text-center">
                        <Sparkles className="w-6 h-6 text-amber-500 mx-auto mb-1" />
                        <p className="text-2xl font-bold text-amber-600">+{stats.xpEarned}</p>
                        <p className="text-xs text-gray-500">XP</p>
                    </div>
                </div>

                {/* Accuracy Ring */}
                <div className="relative w-32 h-32 mb-8">
                    <svg className="w-32 h-32 -rotate-90">
                        <circle cx="64" cy="64" r="56" stroke="#e5e7eb" strokeWidth="12" fill="none" />
                        <circle
                            cx="64" cy="64" r="56"
                            stroke={stats.accuracy >= 80 ? '#10b981' : stats.accuracy >= 60 ? '#f59e0b' : '#ef4444'}
                            strokeWidth="12"
                            fill="none"
                            strokeDasharray={`${stats.accuracy * 3.52} 352`}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-gray-800">%{stats.accuracy}</span>
                        <span className="text-xs text-gray-500">Dogruluk</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                    <button
                        onClick={() => {
                            setCurrentIndex(0);
                            setGameComplete(false);
                            setStats({
                                total: words.length,
                                correct: 0,
                                incorrect: 0,
                                xpEarned: 0,
                                accuracy: 0,
                                streak: 0,
                                bestStreak: 0
                            });
                            loadWords();
                        }}
                        className="px-6 py-3 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition-colors flex items-center gap-2"
                    >
                        <RotateCcw className="w-5 h-5" />
                        Tekrar Calis
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                        Bitir
                    </button>
                </div>
            </motion.div>
        );
    }

    return (
        <div className="w-full max-w-md mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 px-4">
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    <ChevronLeft className="w-6 h-6 text-gray-500" />
                </button>

                {/* Progress */}
                <div className="flex-1 mx-4">
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">{currentIndex + 1} / {words.length}</span>
                        <span className="text-teal-600 font-medium">+{stats.xpEarned} XP</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full"
                        />
                    </div>
                </div>

                {/* Streak */}
                {stats.streak > 0 && (
                    <div className="flex items-center gap-1 bg-orange-100 dark:bg-orange-900/30 px-3 py-1.5 rounded-full">
                        <Flame className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-bold text-orange-600">{stats.streak}</span>
                    </div>
                )}
            </div>

            {/* Card Container */}
            <div className="relative h-[400px] flex items-center justify-center perspective-1000">
                <AnimatePresence>
                    {currentWord && (
                        <motion.div
                            key={currentWord.id}
                            style={{ x, rotate, opacity }}
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            onDragEnd={handleDragEnd}
                            onClick={flipCard}
                            className="absolute w-full max-w-sm cursor-grab active:cursor-grabbing"
                        >
                            {/* Card */}
                            <div
                                className={`relative w-full h-[350px] rounded-3xl shadow-xl transition-transform duration-500 transform-style-preserve-3d ${
                                    isFlipped ? 'rotate-y-180' : ''
                                }`}
                                style={{ transformStyle: 'preserve-3d' }}
                            >
                                {/* Front */}
                                <div
                                    className="absolute inset-0 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-3xl p-8 flex flex-col items-center justify-center backface-hidden"
                                    style={{ backfaceVisibility: 'hidden' }}
                                >
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            speakWord(currentWord.term);
                                        }}
                                        className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                                    >
                                        <Volume2 className="w-5 h-5 text-white" />
                                    </button>

                                    <span className="text-4xl font-bold text-white mb-4">
                                        {currentWord.term}
                                    </span>

                                    <span className="px-3 py-1 bg-white/20 text-white text-sm rounded-full">
                                        {currentWord.cefr_level}
                                    </span>

                                    <p className="mt-8 text-white/70 text-sm text-center">
                                        Cevirmek icin tikla
                                    </p>
                                </div>

                                {/* Back */}
                                <div
                                    className="absolute inset-0 bg-white dark:bg-gray-800 rounded-3xl p-8 flex flex-col items-center justify-center rotate-y-180 backface-hidden border-2 border-gray-100 dark:border-gray-700"
                                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                                >
                                    <span className="text-2xl font-bold text-gray-800 dark:text-white mb-4 text-center">
                                        {currentWord.definition}
                                    </span>

                                    {currentWord.example_sentence && (
                                        <p className="text-gray-500 dark:text-gray-400 text-sm text-center italic mt-4">
                                            "{currentWord.example_sentence}"
                                        </p>
                                    )}

                                    <p className="mt-8 text-gray-400 text-sm text-center">
                                        Saga cek: Biliyorum | Sola cek: Tekrar
                                    </p>
                                </div>
                            </div>

                            {/* Swipe Indicators */}
                            <motion.div
                                style={{ opacity: useTransform(x, [0, 100], [0, 1]) }}
                                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                            >
                                <div className="bg-green-500 text-white px-6 py-3 rounded-full font-bold text-lg">
                                    BILIYORUM
                                </div>
                            </motion.div>

                            <motion.div
                                style={{ opacity: useTransform(x, [-100, 0], [1, 0]) }}
                                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                            >
                                <div className="bg-red-500 text-white px-6 py-3 rounded-full font-bold text-lg">
                                    TEKRAR
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Feedback Overlay */}
                <AnimatePresence>
                    {showFeedback && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            className={`absolute inset-0 flex items-center justify-center pointer-events-none ${
                                showFeedback === 'correct' ? 'text-green-500' : 'text-red-500'
                            }`}
                        >
                            <div className={`w-24 h-24 rounded-full flex items-center justify-center ${
                                showFeedback === 'correct' ? 'bg-green-100' : 'bg-red-100'
                            }`}>
                                {showFeedback === 'correct' ? (
                                    <Check className="w-12 h-12" />
                                ) : (
                                    <X className="w-12 h-12" />
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Button Controls (Alternative to swipe) */}
            <div className="flex justify-center gap-8 mt-8">
                <button
                    onClick={() => handleAnswer(false)}
                    className="w-16 h-16 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded-full flex items-center justify-center transition-colors"
                >
                    <X className="w-8 h-8 text-red-500" />
                </button>
                <button
                    onClick={flipCard}
                    className="w-16 h-16 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors"
                >
                    <RotateCcw className="w-8 h-8 text-gray-500" />
                </button>
                <button
                    onClick={() => handleAnswer(true)}
                    className="w-16 h-16 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 rounded-full flex items-center justify-center transition-colors"
                >
                    <Check className="w-8 h-8 text-green-500" />
                </button>
            </div>
        </div>
    );
}

export default SectorFlashcardGame;
