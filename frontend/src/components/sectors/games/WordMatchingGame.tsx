'use client';

/**
 * Word Matching Game
 *
 * Kelime-anlam eşleştirme oyunu.
 * Kullanıcı İngilizce kelimeleri Türkçe anlamlarıyla eşleştirir.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shuffle,
    Clock,
    Trophy,
    Sparkles,
    RotateCcw,
    ChevronLeft,
    Check,
    X,
    Zap
} from 'lucide-react';
import { getVocabularyRecommendations, VocabularyWord } from '@/lib/api';

interface WordMatchingGameProps {
    sectorId: number;
    sectorName?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    onComplete?: (stats: GameStats) => void;
    onClose?: () => void;
}

interface GameStats {
    matches: number;
    attempts: number;
    timeSeconds: number;
    xpEarned: number;
    accuracy: number;
    perfectRounds: number;
}

interface MatchCard {
    id: string;
    text: string;
    type: 'term' | 'definition';
    wordId: number;
    isMatched: boolean;
    isSelected: boolean;
    isWrong: boolean;
}

const DIFFICULTY_CONFIG = {
    easy: { pairs: 4, timeBonus: 30 },
    medium: { pairs: 6, timeBonus: 20 },
    hard: { pairs: 8, timeBonus: 15 }
};

export function WordMatchingGame({
    sectorId,
    sectorName,
    difficulty = 'medium',
    onComplete,
    onClose
}: WordMatchingGameProps) {
    const [loading, setLoading] = useState(true);
    const [cards, setCards] = useState<MatchCard[]>([]);
    const [selectedCard, setSelectedCard] = useState<MatchCard | null>(null);
    const [stats, setStats] = useState<GameStats>({
        matches: 0,
        attempts: 0,
        timeSeconds: 0,
        xpEarned: 0,
        accuracy: 0,
        perfectRounds: 0
    });
    const [gameComplete, setGameComplete] = useState(false);
    const [round, setRound] = useState(1);
    const [roundPerfect, setRoundPerfect] = useState(true);
    const [timer, setTimer] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [combo, setCombo] = useState(0);

    const config = DIFFICULTY_CONFIG[difficulty];

    useEffect(() => {
        loadWords();
    }, [sectorId, difficulty]);

    // Timer
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isTimerRunning && !gameComplete) {
            interval = setInterval(() => {
                setTimer(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, gameComplete]);

    const loadWords = async () => {
        try {
            setLoading(true);
            const response = await getVocabularyRecommendations(sectorId, config.pairs * 2, 'mixed');

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

                // Take required number of words
                wordList = wordList.slice(0, config.pairs);
                setupRound(wordList);
            }
        } catch (error) {
            console.error('Error loading words:', error);
        } finally {
            setLoading(false);
            setIsTimerRunning(true);
        }
    };

    const setupRound = (words: VocabularyWord[]) => {
        // Create cards for terms and definitions
        const termCards: MatchCard[] = words.map(w => ({
            id: `term-${w.id}`,
            text: w.term,
            type: 'term',
            wordId: w.id,
            isMatched: false,
            isSelected: false,
            isWrong: false
        }));

        const defCards: MatchCard[] = words.map(w => ({
            id: `def-${w.id}`,
            text: w.definition,
            type: 'definition',
            wordId: w.id,
            isMatched: false,
            isSelected: false,
            isWrong: false
        }));

        // Shuffle both arrays separately
        const shuffledTerms = [...termCards].sort(() => Math.random() - 0.5);
        const shuffledDefs = [...defCards].sort(() => Math.random() - 0.5);

        setCards([...shuffledTerms, ...shuffledDefs]);
        setSelectedCard(null);
        setRoundPerfect(true);
    };

    const handleCardClick = useCallback((card: MatchCard) => {
        if (card.isMatched || card.isWrong) return;

        if (!selectedCard) {
            // First selection
            setCards(prev => prev.map(c =>
                c.id === card.id ? { ...c, isSelected: true } : c
            ));
            setSelectedCard(card);
        } else if (selectedCard.id === card.id) {
            // Deselect
            setCards(prev => prev.map(c =>
                c.id === card.id ? { ...c, isSelected: false } : c
            ));
            setSelectedCard(null);
        } else if (selectedCard.type === card.type) {
            // Same type - switch selection
            setCards(prev => prev.map(c => ({
                ...c,
                isSelected: c.id === card.id
            })));
            setSelectedCard(card);
        } else {
            // Different type - check match
            const isMatch = selectedCard.wordId === card.wordId;

            setStats(prev => ({
                ...prev,
                attempts: prev.attempts + 1
            }));

            if (isMatch) {
                // Correct match!
                setCards(prev => prev.map(c =>
                    c.wordId === card.wordId
                        ? { ...c, isMatched: true, isSelected: false }
                        : c
                ));

                const newCombo = combo + 1;
                setCombo(newCombo);

                const xpGain = 15 + (newCombo * 5);
                setStats(prev => ({
                    ...prev,
                    matches: prev.matches + 1,
                    xpEarned: prev.xpEarned + xpGain
                }));

                // Check if round complete
                const remainingCards = cards.filter(c => !c.isMatched && c.wordId !== card.wordId);
                if (remainingCards.length === 0) {
                    handleRoundComplete();
                }
            } else {
                // Wrong match
                setRoundPerfect(false);
                setCombo(0);

                setCards(prev => prev.map(c =>
                    c.id === selectedCard.id || c.id === card.id
                        ? { ...c, isWrong: true, isSelected: false }
                        : c
                ));

                // Reset wrong state after delay
                setTimeout(() => {
                    setCards(prev => prev.map(c =>
                        c.id === selectedCard.id || c.id === card.id
                            ? { ...c, isWrong: false }
                            : c
                    ));
                }, 500);
            }

            setSelectedCard(null);
        }
    }, [selectedCard, cards, combo]);

    const handleRoundComplete = () => {
        const timeBonus = Math.max(0, config.timeBonus - Math.floor(timer / 10)) * 5;

        setStats(prev => ({
            ...prev,
            perfectRounds: roundPerfect ? prev.perfectRounds + 1 : prev.perfectRounds,
            xpEarned: prev.xpEarned + timeBonus,
            timeSeconds: timer,
            accuracy: prev.attempts > 0 ? Math.round((prev.matches / prev.attempts) * 100) : 100
        }));

        if (round < 3) {
            // More rounds
            setTimeout(() => {
                setRound(prev => prev + 1);
                loadWords();
            }, 1000);
        } else {
            // Game complete
            setGameComplete(true);
            setIsTimerRunning(false);
            onComplete?.(stats);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const termCards = cards.filter(c => c.type === 'term');
    const defCards = cards.filter(c => c.type === 'definition');

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px]">
                <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                <p className="mt-4 text-gray-500">Oyun hazirlaniyor...</p>
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
                <Trophy className="w-20 h-20 text-amber-500 mb-4" />
                <h2 className="text-3xl font-bold text-gray-800 mb-2">Tebrikler!</h2>
                <p className="text-gray-500 mb-8">
                    Eslestirme oyununu tamamladin.
                </p>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 w-full max-w-lg">
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-4 text-center">
                        <Check className="w-6 h-6 text-purple-500 mx-auto mb-1" />
                        <p className="text-2xl font-bold text-purple-600">{stats.matches}</p>
                        <p className="text-xs text-gray-500">Eslesme</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 text-center">
                        <Clock className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                        <p className="text-2xl font-bold text-blue-600">{formatTime(stats.timeSeconds)}</p>
                        <p className="text-xs text-gray-500">Sure</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4 text-center">
                        <Zap className="w-6 h-6 text-green-500 mx-auto mb-1" />
                        <p className="text-2xl font-bold text-green-600">%{stats.accuracy}</p>
                        <p className="text-xs text-gray-500">Dogruluk</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 text-center">
                        <Sparkles className="w-6 h-6 text-amber-500 mx-auto mb-1" />
                        <p className="text-2xl font-bold text-amber-600">+{stats.xpEarned}</p>
                        <p className="text-xs text-gray-500">XP</p>
                    </div>
                </div>

                {stats.perfectRounds > 0 && (
                    <div className="mb-6 px-4 py-2 bg-gradient-to-r from-amber-100 to-orange-100 rounded-full">
                        <span className="text-amber-700 font-medium">
                            {stats.perfectRounds} Mukemmel Tur!
                        </span>
                    </div>
                )}

                <div className="flex gap-4">
                    <button
                        onClick={() => {
                            setRound(1);
                            setTimer(0);
                            setGameComplete(false);
                            setStats({
                                matches: 0,
                                attempts: 0,
                                timeSeconds: 0,
                                xpEarned: 0,
                                accuracy: 0,
                                perfectRounds: 0
                            });
                            loadWords();
                        }}
                        className="px-6 py-3 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-colors flex items-center gap-2"
                    >
                        <RotateCcw className="w-5 h-5" />
                        Tekrar Oyna
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
        <div className="w-full max-w-4xl mx-auto p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    <ChevronLeft className="w-6 h-6 text-gray-500" />
                </button>

                <div className="flex items-center gap-4">
                    {/* Round */}
                    <div className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                        <span className="text-sm font-medium text-purple-600">Tur {round}/3</span>
                    </div>

                    {/* Timer */}
                    <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-mono text-gray-600">{formatTime(timer)}</span>
                    </div>

                    {/* Combo */}
                    {combo > 1 && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex items-center gap-1 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 rounded-full"
                        >
                            <Zap className="w-4 h-4 text-orange-500" />
                            <span className="text-sm font-bold text-orange-600">x{combo}</span>
                        </motion.div>
                    )}
                </div>

                <div className="text-right">
                    <span className="text-sm text-gray-500">XP</span>
                    <p className="text-lg font-bold text-amber-500">+{stats.xpEarned}</p>
                </div>
            </div>

            {/* Game Board */}
            <div className="grid grid-cols-2 gap-8">
                {/* Terms Column */}
                <div className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-500 mb-2 text-center">Ingilizce</h3>
                    {termCards.map(card => (
                        <motion.button
                            key={card.id}
                            onClick={() => handleCardClick(card)}
                            disabled={card.isMatched}
                            whileHover={!card.isMatched ? { scale: 1.02 } : {}}
                            whileTap={!card.isMatched ? { scale: 0.98 } : {}}
                            className={`w-full p-4 rounded-xl text-left font-medium transition-all ${
                                card.isMatched
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 border-2 border-green-300'
                                    : card.isSelected
                                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 border-2 border-purple-400 shadow-lg'
                                        : card.isWrong
                                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 border-2 border-red-300 animate-shake'
                                            : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-2 border-gray-200 dark:border-gray-700 hover:border-purple-300'
                            }`}
                        >
                            {card.text}
                            {card.isMatched && (
                                <Check className="inline w-5 h-5 ml-2 text-green-500" />
                            )}
                        </motion.button>
                    ))}
                </div>

                {/* Definitions Column */}
                <div className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-500 mb-2 text-center">Turkce</h3>
                    {defCards.map(card => (
                        <motion.button
                            key={card.id}
                            onClick={() => handleCardClick(card)}
                            disabled={card.isMatched}
                            whileHover={!card.isMatched ? { scale: 1.02 } : {}}
                            whileTap={!card.isMatched ? { scale: 0.98 } : {}}
                            className={`w-full p-4 rounded-xl text-left font-medium transition-all ${
                                card.isMatched
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 border-2 border-green-300'
                                    : card.isSelected
                                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 border-2 border-purple-400 shadow-lg'
                                        : card.isWrong
                                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 border-2 border-red-300 animate-shake'
                                            : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-2 border-gray-200 dark:border-gray-700 hover:border-purple-300'
                            }`}
                        >
                            {card.text}
                            {card.isMatched && (
                                <Check className="inline w-5 h-5 ml-2 text-green-500" />
                            )}
                        </motion.button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default WordMatchingGame;
