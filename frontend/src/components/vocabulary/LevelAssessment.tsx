/**
 * 🎯 Level Assessment Component
 * 
 * Adaptive vocabulary level test.
 * Uses stratified sampling from A1-C2 words to determine user's level.
 * Optimum: ~20 words for accurate assessment.
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Stratified word bank - 5 words per level
const ASSESSMENT_WORDS = {
    A1: [
        { word: 'Apple', definition: 'Elma' },
        { word: 'House', definition: 'Ev' },
        { word: 'Water', definition: 'Su' },
        { word: 'Hello', definition: 'Merhaba' },
        { word: 'Book', definition: 'Kitap' },
    ],
    A2: [
        { word: 'Expensive', definition: 'Pahalı' },
        { word: 'Journey', definition: 'Yolculuk' },
        { word: 'Furniture', definition: 'Mobilya' },
        { word: 'Weather', definition: 'Hava durumu' },
        { word: 'Customer', definition: 'Müşteri' },
    ],
    B1: [
        { word: 'Achievement', definition: 'Başarı' },
        { word: 'Opportunity', definition: 'Fırsat' },
        { word: 'Environment', definition: 'Çevre' },
        { word: 'Reasonable', definition: 'Makul' },
        { word: 'Experience', definition: 'Deneyim' },
    ],
    B2: [
        { word: 'Comprehensive', definition: 'Kapsamlı' },
        { word: 'Acknowledge', definition: 'Kabul etmek' },
        { word: 'Consequence', definition: 'Sonuç' },
        { word: 'Inevitable', definition: 'Kaçınılmaz' },
        { word: 'Sophisticated', definition: 'Sofistike' },
    ],
    C1: [
        { word: 'Ambiguous', definition: 'Belirsiz' },
        { word: 'Corroborate', definition: 'Doğrulamak' },
        { word: 'Intricacy', definition: 'Karmaşıklık' },
        { word: 'Pragmatic', definition: 'Pragmatik' },
        { word: 'Ubiquitous', definition: 'Her yerde bulunan' },
    ],
    C2: [
        { word: 'Ineffable', definition: 'Tarif edilemez' },
        { word: 'Obfuscate', definition: 'Karmaşıklaştırmak' },
        { word: 'Perspicacious', definition: 'Keskin zekalı' },
        { word: 'Sesquipedalian', definition: 'Uzun kelimeler kullanan' },
        { word: 'Verisimilitude', definition: 'Gerçeğe benzerlik' },
    ],
};

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
type CEFRLevel = typeof LEVELS[number];

interface LevelAssessmentProps {
    onComplete: (level: CEFRLevel, stats: { correct: number; total: number }) => void;
    onCancel?: () => void;
}

const LevelAssessment: React.FC<LevelAssessmentProps> = ({ onComplete, onCancel }) => {
    // Create shuffled assessment queue (3 words per level = 18 total)
    const [queue] = useState(() => {
        const words: Array<{ word: string; definition: string; level: CEFRLevel }> = [];
        LEVELS.forEach(level => {
            const levelWords = ASSESSMENT_WORDS[level]
                .sort(() => Math.random() - 0.5)
                .slice(0, 3)
                .map(w => ({ ...w, level }));
            words.push(...levelWords);
        });
        // Shuffle but keep some level ordering (easier first)
        return words.sort((a, b) => {
            const levelDiff = LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level);
            return levelDiff + (Math.random() - 0.5) * 2;
        });
    });

    const [currentIndex, setCurrentIndex] = useState(0);
    const [results, setResults] = useState<Record<CEFRLevel, { known: number; total: number }>>({
        A1: { known: 0, total: 0 },
        A2: { known: 0, total: 0 },
        B1: { known: 0, total: 0 },
        B2: { known: 0, total: 0 },
        C1: { known: 0, total: 0 },
        C2: { known: 0, total: 0 },
    });
    const [isComplete, setIsComplete] = useState(false);
    const [finalLevel, setFinalLevel] = useState<CEFRLevel | null>(null);

    const currentWord = queue[currentIndex];
    const progress = ((currentIndex + 1) / queue.length) * 100;

    const handleAnswer = useCallback((known: boolean) => {
        if (!currentWord) return;

        // Update results
        setResults(prev => ({
            ...prev,
            [currentWord.level]: {
                known: prev[currentWord.level].known + (known ? 1 : 0),
                total: prev[currentWord.level].total + 1,
            },
        }));

        // Next word or complete
        if (currentIndex < queue.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            // Calculate final level
            const newResults = {
                ...results,
                [currentWord.level]: {
                    known: results[currentWord.level].known + (known ? 1 : 0),
                    total: results[currentWord.level].total + 1,
                },
            };

            // Find highest level with >50% correct
            let determinedLevel: CEFRLevel = 'A1';
            let totalCorrect = 0;
            let totalQuestions = 0;

            for (const level of LEVELS) {
                const { known, total } = newResults[level];
                totalCorrect += known;
                totalQuestions += total;
                if (total > 0 && known / total >= 0.5) {
                    determinedLevel = level;
                }
            }

            setFinalLevel(determinedLevel);
            setIsComplete(true);
            onComplete(determinedLevel, { correct: totalCorrect, total: totalQuestions });
        }
    }, [currentWord, currentIndex, queue.length, results, onComplete]);

    if (isComplete && finalLevel) {
        const totalCorrect = Object.values(results).reduce((sum, r) => sum + r.known, 0);
        const totalQuestions = Object.values(results).reduce((sum, r) => sum + r.total, 0);

        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center p-8 text-center"
            >
                <div className="text-7xl mb-6">🎉</div>
                <h2 className="text-3xl font-bold text-slate-800 mb-2">Seviye Tespiti Tamamlandı!</h2>
                <p className="text-lg text-slate-500 mb-8">
                    {totalCorrect}/{totalQuestions} doğru cevap
                </p>

                <div className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white px-12 py-6 rounded-2xl shadow-xl mb-8">
                    <p className="text-sm opacity-80 mb-1">Tahmini Seviyen</p>
                    <p className="text-5xl font-bold">{finalLevel}</p>
                </div>

                {/* Level breakdown */}
                <div className="grid grid-cols-6 gap-2 mb-8 w-full max-w-md">
                    {LEVELS.map(level => {
                        const { known, total } = results[level];
                        const percentage = total > 0 ? Math.round((known / total) * 100) : 0;
                        const isCurrentLevel = level === finalLevel;
                        return (
                            <div
                                key={level}
                                className={`p-2 rounded-lg text-center ${isCurrentLevel ? 'bg-teal-100 ring-2 ring-teal-500' : 'bg-slate-100'
                                    }`}
                            >
                                <p className={`text-xs font-bold ${isCurrentLevel ? 'text-teal-700' : 'text-slate-500'}`}>
                                    {level}
                                </p>
                                <p className={`text-lg font-bold ${isCurrentLevel ? 'text-teal-600' : 'text-slate-700'}`}>
                                    {percentage}%
                                </p>
                            </div>
                        );
                    })}
                </div>

                <button
                    onClick={onCancel}
                    className="px-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
                >
                    Kapat
                </button>
            </motion.div>
        );
    }

    if (!currentWord) return null;

    return (
        <div className="w-full max-w-md mx-auto">
            {/* Progress */}
            <div className="mb-6">
                <div className="flex justify-between text-sm text-slate-500 mb-2">
                    <span>Seviye Testi</span>
                    <span>{currentIndex + 1} / {queue.length}</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-teal-500 to-emerald-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Card */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 text-center"
                >
                    {/* Level indicator (subtle) */}
                    <span className="inline-block px-3 py-1 bg-slate-100 text-slate-500 text-xs font-medium rounded-full mb-6">
                        {currentWord.level} Seviyesi
                    </span>

                    {/* Word */}
                    <h2 className="text-4xl font-bold text-slate-800 mb-8">
                        {currentWord.word}
                    </h2>

                    {/* Question */}
                    <p className="text-slate-500 mb-8">Bu kelimenin anlamını biliyor musun?</p>

                    {/* Buttons */}
                    <div className="flex gap-4">
                        <button
                            onClick={() => handleAnswer(false)}
                            className="flex-1 py-4 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            <span>❌</span> Bilmiyorum
                        </button>
                        <button
                            onClick={() => handleAnswer(true)}
                            className="flex-1 py-4 bg-green-50 hover:bg-green-100 text-green-600 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            <span>✓</span> Biliyorum
                        </button>
                    </div>

                    {/* Definition hint (shown after clicking) */}
                    <p className="mt-6 text-sm text-slate-400">
                        Cevap: <span className="blur-sm hover:blur-none transition-all cursor-pointer">{currentWord.definition}</span>
                    </p>
                </motion.div>
            </AnimatePresence>

            {/* Cancel button */}
            {onCancel && (
                <button
                    onClick={onCancel}
                    className="mt-6 w-full py-3 text-slate-400 hover:text-slate-600 text-sm transition-colors"
                >
                    Testi Bitir
                </button>
            )}
        </div>
    );
};

export default LevelAssessment;
