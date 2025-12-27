/**
 * 🎯 Adaptive Placement Test Component
 * 
 * Professional CEFR vocabulary assessment with:
 * - Adaptive difficulty (CAT algorithm)
 * - Multiple choice questions
 * - Progress tracking
 * - Animated transitions
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

interface Question {
    id: number;
    word: string;
    level: string;
    options: string[];
    correctIndex: number;
}

interface FinalResult {
    level: string;
    accuracy: number;
    breakdown: Record<string, { correct: number; total: number }>;
}

interface AdaptivePlacementTestProps {
    onComplete: (result: FinalResult) => void;
    onCancel?: () => void;
}

const AdaptivePlacementTest: React.FC<AdaptivePlacementTestProps> = ({ onComplete, onCancel }) => {
    const [loading, setLoading] = useState(false);
    const [started, setStarted] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
    const [progress, setProgress] = useState(0);
    const [totalQuestions, setTotalQuestions] = useState(20);
    const [finalResult, setFinalResult] = useState<FinalResult | null>(null);

    const startTest = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('lingroot_token');
            const res = await fetch(`${API_BASE}/api/assessment/start`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await res.json();

            if (data.success) {
                setCurrentQuestion(data.data.question);
                setProgress(data.data.progress);
                setTotalQuestions(data.data.totalQuestions);
                setStarted(true);
            }
        } catch (error) {
            console.error('Start test error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const submitAnswer = useCallback(async (selectedIndex: number) => {
        if (!currentQuestion) return;

        setSelectedAnswer(selectedIndex);
        setShowResult(true);

        try {
            const token = localStorage.getItem('lingroot_token');
            const res = await fetch(`${API_BASE}/api/assessment/answer`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    questionId: currentQuestion.id,
                    selectedIndex,
                    selectedAnswer: currentQuestion.options[selectedIndex] // Send actual text
                })
            });
            const data = await res.json();

            if (data.success) {
                setLastAnswerCorrect(data.data.answerResult.isCorrect);

                if (data.data.isComplete) {
                    setFinalResult(data.data.finalResult);
                    setTimeout(() => {
                        onComplete(data.data.finalResult);
                    }, 2000);
                } else {
                    // Move to next question after 1.5s
                    setTimeout(() => {
                        setCurrentQuestion(data.data.nextQuestion);
                        setProgress(data.data.progress);
                        setSelectedAnswer(null);
                        setShowResult(false);
                        setLastAnswerCorrect(null);
                    }, 1500);
                }
            }
        } catch (error) {
            console.error('Submit answer error:', error);
        }
    }, [currentQuestion, onComplete]);

    // Start screen
    if (!started) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center p-8"
            >
                <div className="text-6xl mb-6">🎯</div>
                <h2 className="text-2xl font-bold text-slate-800 mb-4">Kelime Seviye Testi</h2>
                <p className="text-slate-500 mb-2">Bu test, İngilizce kelime bilginizi ölçer.</p>
                <p className="text-slate-500 mb-8">
                    <strong>20 soru</strong> • Çoktan seçmeli • ~5 dakika
                </p>

                <div className="bg-slate-50 rounded-xl p-6 mb-8 text-left max-w-md mx-auto">
                    <h4 className="font-semibold text-slate-700 mb-3">📋 Test Hakkında:</h4>
                    <ul className="space-y-2 text-sm text-slate-600">
                        <li>• Sorular performansınıza göre zorlaşır/kolaylaşır</li>
                        <li>• Her kelime için 4 şıktan doğru anlamı seçin</li>
                        <li>• Sonunda CEFR seviyeniz (A1-C2) belirlenir</li>
                    </ul>
                </div>

                <button
                    onClick={startTest}
                    disabled={loading}
                    className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50"
                >
                    {loading ? (
                        <span className="flex items-center gap-2">
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Hazırlanıyor...
                        </span>
                    ) : (
                        '🚀 Teste Başla'
                    )}
                </button>

                {onCancel && (
                    <button
                        onClick={onCancel}
                        className="block mx-auto mt-4 text-slate-400 hover:text-slate-600 text-sm"
                    >
                        İptal
                    </button>
                )}
            </motion.div>
        );
    }

    // Complete screen
    if (finalResult) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center p-8"
            >
                <div className="text-7xl mb-6">🎉</div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Test Tamamlandı!</h2>
                <p className="text-slate-500 mb-8">%{finalResult.accuracy} doğruluk oranı</p>

                <div className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white px-12 py-8 rounded-2xl shadow-xl mb-8 inline-block">
                    <p className="text-sm opacity-80 mb-1">Kelime Seviyen</p>
                    <p className="text-5xl font-bold">{finalResult.level}</p>
                </div>

                {/* Level breakdown */}
                <div className="grid grid-cols-6 gap-2 max-w-lg mx-auto mb-8">
                    {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(level => {
                        const data = finalResult.breakdown[level];
                        const pct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
                        const isCurrentLevel = level === finalResult.level;
                        return (
                            <div
                                key={level}
                                className={`p-2 rounded-lg text-center ${isCurrentLevel ? 'bg-purple-100 ring-2 ring-purple-500' : 'bg-slate-100'
                                    }`}
                            >
                                <p className={`text-xs font-bold ${isCurrentLevel ? 'text-purple-700' : 'text-slate-500'}`}>
                                    {level}
                                </p>
                                <p className={`text-lg font-bold ${isCurrentLevel ? 'text-purple-600' : 'text-slate-700'}`}>
                                    {data.total > 0 ? `${pct}%` : '-'}
                                </p>
                            </div>
                        );
                    })}
                </div>

                <p className="text-sm text-slate-400">Sonuç kaydedildi. Yönlendiriliyorsunuz...</p>
            </motion.div>
        );
    }

    // Question screen
    if (!currentQuestion) return null;

    return (
        <div className="max-w-lg mx-auto">
            {/* Progress bar */}
            <div className="mb-6">
                <div className="flex justify-between text-sm text-slate-500 mb-2">
                    <span>Adaptif Seviye Testi</span>
                    <span>{Math.round(progress * 100)}%</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress * 100}%` }}
                    />
                </div>
            </div>

            {/* Question card */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentQuestion.id}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8"
                >
                    {/* Level indicator */}
                    <div className="flex justify-between items-center mb-6">
                        <span className="px-3 py-1 bg-slate-100 text-slate-500 text-xs font-medium rounded-full">
                            {currentQuestion.level} Seviyesi
                        </span>
                        {lastAnswerCorrect !== null && (
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${lastAnswerCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                {lastAnswerCorrect ? '✓ Doğru!' : '✗ Yanlış'}
                            </span>
                        )}
                    </div>

                    {/* Word */}
                    <h2 className="text-4xl font-bold text-slate-800 text-center mb-8">
                        {currentQuestion.word}
                    </h2>

                    {/* Question */}
                    <p className="text-slate-500 text-center mb-6">Bu kelimenin Türkçe anlamı nedir?</p>

                    {/* Options */}
                    <div className="space-y-3">
                        {currentQuestion.options.map((option, idx) => {
                            const isSelected = selectedAnswer === idx;
                            const isCorrect = showResult && idx === currentQuestion.correctIndex;
                            const isWrong = showResult && isSelected && !isCorrect;

                            return (
                                <button
                                    key={idx}
                                    onClick={() => !showResult && submitAnswer(idx)}
                                    disabled={showResult}
                                    className={`w-full p-4 rounded-xl text-left font-medium transition-all ${isCorrect
                                        ? 'bg-green-100 border-2 border-green-500 text-green-700'
                                        : isWrong
                                            ? 'bg-red-100 border-2 border-red-500 text-red-700'
                                            : isSelected
                                                ? 'bg-purple-100 border-2 border-purple-500 text-purple-700'
                                                : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100 text-slate-700'
                                        }`}
                                >
                                    <span className="inline-block w-6 h-6 rounded-full bg-white text-center text-sm mr-3 border">
                                        {String.fromCharCode(65 + idx)}
                                    </span>
                                    {option}
                                </button>
                            );
                        })}
                    </div>
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

export default AdaptivePlacementTest;
