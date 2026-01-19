/**
 * 📝 Content Quiz Modal
 * 
 * Post-listening quiz component to test vocabulary retention.
 * Displays questions based on words from the listened content.
 */

import React, { useState, useEffect } from 'react';
import { submitContentQuiz, generateContentQuiz } from '@/lib/api';

interface QuizQuestion {
    id: number;
    word: string;
    options: string[];
    correctAnswer: string;
}

interface ContentQuizModalProps {
    contentId: string;
    onClose: () => void;
    onComplete: (score: number, xpEarned: number) => void;
}

const ContentQuizModal: React.FC<ContentQuizModalProps> = ({
    contentId,
    onClose,
    onComplete
}) => {
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Array<{ word: string; selectedAnswer: string }>>([]);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [result, setResult] = useState<{
        score: number;
        correctCount: number;
        totalQuestions: number;
        passed: boolean;
        xpEarned: number;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadQuiz();
    }, [contentId]);

    const loadQuiz = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await generateContentQuiz(contentId);
            if (response.success && response.data) {
                setQuestions(response.data.questions);
            } else {
                setError('Quiz yüklenemedi');
            }
        } catch (err: any) {
            setError(err.message || 'Quiz yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectOption = (option: string) => {
        setSelectedOption(option);
    };

    const handleNextQuestion = () => {
        if (!selectedOption) return;

        const currentQuestion = questions[currentIndex];
        const newAnswers = [...answers, {
            word: currentQuestion.word,
            selectedAnswer: selectedOption
        }];
        setAnswers(newAnswers);

        if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setSelectedOption(null);
        } else {
            // Submit quiz
            submitQuiz(newAnswers);
        }
    };

    const submitQuiz = async (finalAnswers: Array<{ word: string; selectedAnswer: string }>) => {
        try {
            setLoading(true);
            const response = await submitContentQuiz(contentId, finalAnswers);
            if (response.success && response.data) {
                setResult(response.data);
                setShowResult(true);
                onComplete(response.data.score, response.data.xpEarned);
            }
        } catch (err: any) {
            setError(err.message || 'Quiz gönderilemedi');
        } finally {
            setLoading(false);
        }
    };

    const currentQuestion = questions[currentIndex];

    if (loading && questions.length === 0) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4" />
                    <p className="text-slate-600">Quiz hazırlanıyor...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center">
                    <div className="text-5xl mb-4">😕</div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Bir sorun oluştu</h3>
                    <p className="text-slate-600 mb-6">{error}</p>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                    >
                        Kapat
                    </button>
                </div>
            </div>
        );
    }

    if (showResult && result) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center">
                    <div className="text-6xl mb-4">
                        {result.passed ? '🎉' : '💪'}
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">
                        {result.passed ? 'Başarılı!' : 'Tekrar Dene'}
                    </h3>
                    <div className="text-4xl font-bold text-teal-600 mb-2">
                        %{result.score}
                    </div>
                    <p className="text-slate-600 mb-4">
                        {result.correctCount} / {result.totalQuestions} doğru
                    </p>
                    {result.xpEarned > 0 && (
                        <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-full mb-6">
                            <span className="text-xl">⚡</span>
                            <span className="font-bold">+{result.xpEarned} XP</span>
                        </div>
                    )}
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                        >
                            Ana Menü
                        </button>
                        <button
                            onClick={() => window.location.href = '/vocabulary?mode=due'}
                            className="px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center gap-2 group"
                        >
                            <span>📚</span>
                            <span>Kelimeleri Çalış</span>
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
                {/* Progress */}
                <div className="flex items-center justify-between mb-6">
                    <span className="text-sm text-slate-500">
                        Soru {currentIndex + 1} / {questions.length}
                    </span>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-slate-100 rounded-full mb-6 overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-300"
                        style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                    />
                </div>

                {/* Question */}
                <div className="text-center mb-6">
                    <p className="text-sm text-slate-500 mb-2">Bu kelimenin anlamı nedir?</p>
                    <h2 className="text-3xl font-bold text-slate-800">{currentQuestion?.word}</h2>
                </div>

                {/* Options */}
                <div className="space-y-3 mb-6">
                    {currentQuestion?.options.map((option, index) => (
                        <button
                            key={index}
                            onClick={() => handleSelectOption(option)}
                            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${selectedOption === option
                                ? 'border-teal-500 bg-teal-50 text-teal-700'
                                : 'border-slate-200 hover:border-slate-300 text-slate-700'
                                }`}
                        >
                            <span className="font-medium">{option}</span>
                        </button>
                    ))}
                </div>

                {/* Next Button */}
                <button
                    onClick={handleNextQuestion}
                    disabled={!selectedOption || loading}
                    className={`w-full py-3 rounded-xl font-semibold transition-all ${selectedOption
                        ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:shadow-lg'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                >
                    {loading ? 'Gönderiliyor...' : currentIndex < questions.length - 1 ? 'Sonraki' : 'Bitir'}
                </button>
            </div>
        </div>
    );
};

export default ContentQuizModal;
