'use client';

/**
 * Fill in the Blank Game
 *
 * Cümle içinde boşluk doldurma oyunu.
 * Örnek cümlelerde doğru kelimeyi seçme.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Lightbulb,
    Volume2,
    ChevronLeft,
    Check,
    X,
    Sparkles,
    Trophy,
    RotateCcw,
    HelpCircle,
    Zap
} from 'lucide-react';
import { getVocabularyRecommendations, VocabularyWord } from '@/lib/api';

interface FillInBlankGameProps {
    sectorId: number;
    sectorName?: string;
    onComplete?: (stats: GameStats) => void;
    onClose?: () => void;
}

interface GameStats {
    total: number;
    correct: number;
    incorrect: number;
    xpEarned: number;
    accuracy: number;
    hintsUsed: number;
}

interface Question {
    word: VocabularyWord;
    sentence: string;
    blankSentence: string;
    options: string[];
    correctAnswer: string;
}

export function FillInBlankGame({
    sectorId,
    sectorName,
    onComplete,
    onClose
}: FillInBlankGameProps) {
    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [stats, setStats] = useState<GameStats>({
        total: 0,
        correct: 0,
        incorrect: 0,
        xpEarned: 0,
        accuracy: 0,
        hintsUsed: 0
    });
    const [gameComplete, setGameComplete] = useState(false);
    const [streak, setStreak] = useState(0);

    useEffect(() => {
        loadQuestions();
    }, [sectorId]);

    const loadQuestions = async () => {
        try {
            setLoading(true);
            const response = await getVocabularyRecommendations(sectorId, 20, 'mixed');

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

                // Filter words that have example sentences
                const wordsWithSentences = wordList.filter(w => w.example_sentence);

                // Create questions
                const gameQuestions = wordsWithSentences.slice(0, 10).map(word => {
                    const sentence = word.example_sentence || `The ${word.term} is important in this field.`;
                    const blankSentence = sentence.replace(
                        new RegExp(`\\b${word.term}\\b`, 'gi'),
                        '_____'
                    );

                    // Generate wrong options from other words
                    const otherWords = wordList
                        .filter(w => w.id !== word.id)
                        .map(w => w.term)
                        .sort(() => Math.random() - 0.5)
                        .slice(0, 3);

                    const options = [...otherWords, word.term].sort(() => Math.random() - 0.5);

                    return {
                        word,
                        sentence,
                        blankSentence,
                        options,
                        correctAnswer: word.term
                    };
                });

                setQuestions(gameQuestions);
                setStats(prev => ({ ...prev, total: gameQuestions.length }));
            }
        } catch (error) {
            console.error('Error loading questions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = useCallback((answer: string) => {
        if (showResult) return;

        setSelectedAnswer(answer);
        setShowResult(true);

        const isCorrect = answer === questions[currentIndex].correctAnswer;

        if (isCorrect) {
            const newStreak = streak + 1;
            setStreak(newStreak);
            const xpGain = 20 + (newStreak * 5) - (showHint ? 10 : 0);

            setStats(prev => ({
                ...prev,
                correct: prev.correct + 1,
                xpEarned: prev.xpEarned + Math.max(xpGain, 5),
                accuracy: Math.round(((prev.correct + 1) / (prev.correct + prev.incorrect + 1)) * 100)
            }));
        } else {
            setStreak(0);
            setStats(prev => ({
                ...prev,
                incorrect: prev.incorrect + 1,
                xpEarned: prev.xpEarned + 2,
                accuracy: Math.round((prev.correct / (prev.correct + prev.incorrect + 1)) * 100)
            }));
        }
    }, [showResult, questions, currentIndex, streak, showHint]);

    const handleNext = () => {
        setShowResult(false);
        setSelectedAnswer(null);
        setShowHint(false);

        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            setGameComplete(true);
            onComplete?.(stats);
        }
    };

    const handleHint = () => {
        if (!showHint) {
            setShowHint(true);
            setStats(prev => ({ ...prev, hintsUsed: prev.hintsUsed + 1 }));
        }
    };

    const speakSentence = (text: string) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            speechSynthesis.speak(utterance);
        }
    };

    const currentQuestion = questions[currentIndex];
    const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px]">
                <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                <p className="mt-4 text-gray-500">Sorular hazirlaniyor...</p>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-8">
                <HelpCircle className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">Ornek Cumle Bulunamadi</h3>
                <p className="text-gray-500 mb-6">
                    Bu sektordeki kelimelerde yeterli ornek cumle yok.
                </p>
                <button
                    onClick={onClose}
                    className="px-6 py-3 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 transition-colors"
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
                <Trophy className="w-20 h-20 text-amber-500 mb-4" />
                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                    {stats.accuracy >= 80 ? 'Harika!' : stats.accuracy >= 60 ? 'Iyi!' : 'Devam Et!'}
                </h2>
                <p className="text-gray-500 mb-8">
                    Bosluk doldurma oyununu tamamladin.
                </p>

                {/* Stats */}
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
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-4 text-center">
                        <Lightbulb className="w-6 h-6 text-purple-500 mx-auto mb-1" />
                        <p className="text-2xl font-bold text-purple-600">{stats.hintsUsed}</p>
                        <p className="text-xs text-gray-500">Ipucu</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 text-center">
                        <Sparkles className="w-6 h-6 text-amber-500 mx-auto mb-1" />
                        <p className="text-2xl font-bold text-amber-600">+{stats.xpEarned}</p>
                        <p className="text-xs text-gray-500">XP</p>
                    </div>
                </div>

                {/* Accuracy */}
                <div className="mb-8">
                    <div className="relative w-32 h-32 mx-auto">
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
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={() => {
                            setCurrentIndex(0);
                            setGameComplete(false);
                            setStreak(0);
                            setStats({
                                total: questions.length,
                                correct: 0,
                                incorrect: 0,
                                xpEarned: 0,
                                accuracy: 0,
                                hintsUsed: 0
                            });
                            loadQuestions();
                        }}
                        className="px-6 py-3 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 transition-colors flex items-center gap-2"
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
        <div className="w-full max-w-2xl mx-auto p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    <ChevronLeft className="w-6 h-6 text-gray-500" />
                </button>

                <div className="flex-1 mx-4">
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">{currentIndex + 1} / {questions.length}</span>
                        <span className="text-indigo-600 font-medium">+{stats.xpEarned} XP</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full"
                        />
                    </div>
                </div>

                {streak > 1 && (
                    <div className="flex items-center gap-1 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                        <Zap className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-bold text-orange-600">x{streak}</span>
                    </div>
                )}
            </div>

            {/* Question Card */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-8 mb-6"
                >
                    {/* Sentence */}
                    <div className="flex items-start gap-3 mb-6">
                        <button
                            onClick={() => speakSentence(currentQuestion.sentence)}
                            className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full hover:bg-indigo-200 transition-colors"
                        >
                            <Volume2 className="w-5 h-5 text-indigo-600" />
                        </button>
                        <p className="text-xl text-gray-800 dark:text-gray-200 leading-relaxed">
                            {currentQuestion.blankSentence.split('_____').map((part, i, arr) => (
                                <React.Fragment key={i}>
                                    {part}
                                    {i < arr.length - 1 && (
                                        <span className={`inline-block min-w-[100px] px-3 py-1 mx-1 rounded-lg font-bold ${
                                            showResult
                                                ? selectedAnswer === currentQuestion.correctAnswer
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-red-100 text-red-700'
                                                : 'bg-indigo-100 text-indigo-600'
                                        }`}>
                                            {showResult ? currentQuestion.correctAnswer : '?'}
                                        </span>
                                    )}
                                </React.Fragment>
                            ))}
                        </p>
                    </div>

                    {/* Hint */}
                    {showHint && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl"
                        >
                            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                                <Lightbulb className="w-5 h-5" />
                                <span className="font-medium">Ipucu:</span>
                            </div>
                            <p className="mt-1 text-amber-600 dark:text-amber-300">
                                {currentQuestion.word.definition}
                            </p>
                        </motion.div>
                    )}

                    {/* Options */}
                    <div className="grid grid-cols-2 gap-3">
                        {currentQuestion.options.map((option, index) => {
                            const isSelected = selectedAnswer === option;
                            const isCorrect = option === currentQuestion.correctAnswer;
                            const showCorrect = showResult && isCorrect;
                            const showWrong = showResult && isSelected && !isCorrect;

                            return (
                                <motion.button
                                    key={index}
                                    onClick={() => handleAnswer(option)}
                                    disabled={showResult}
                                    whileHover={!showResult ? { scale: 1.02 } : {}}
                                    whileTap={!showResult ? { scale: 0.98 } : {}}
                                    className={`p-4 rounded-xl text-left font-medium transition-all ${
                                        showCorrect
                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 border-2 border-green-400'
                                            : showWrong
                                                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 border-2 border-red-400'
                                                : isSelected
                                                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 border-2 border-indigo-400'
                                                    : 'bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-2 border-gray-200 dark:border-gray-600 hover:border-indigo-300'
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        {option}
                                        {showCorrect && <Check className="w-5 h-5 text-green-500 ml-auto" />}
                                        {showWrong && <X className="w-5 h-5 text-red-500 ml-auto" />}
                                    </span>
                                </motion.button>
                            );
                        })}
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Actions */}
            <div className="flex justify-between">
                {!showResult ? (
                    <button
                        onClick={handleHint}
                        disabled={showHint}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                            showHint
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        }`}
                    >
                        <Lightbulb className="w-5 h-5" />
                        Ipucu
                    </button>
                ) : (
                    <div />
                )}

                {showResult && (
                    <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={handleNext}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 transition-colors"
                    >
                        {currentIndex < questions.length - 1 ? 'Devam' : 'Bitir'}
                        <ChevronLeft className="w-5 h-5 rotate-180" />
                    </motion.button>
                )}
            </div>
        </div>
    );
}

export default FillInBlankGame;
