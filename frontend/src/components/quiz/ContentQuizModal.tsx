/**
 * 📝 Content Quiz Modal
 * 
 * Post-listening quiz component to test vocabulary retention.
 * Displays questions based on words from the listened content.
 * 
 * ENHANCED VERSION:
 * - Multiple question types (MC, Cloze, Matching)
 * - SRS sync for wrong answers
 * - Rich feedback with explanations
 * - Smart next action suggestions
 */

import React, { useState, useEffect } from 'react';
import { submitContentQuiz, generateContentQuiz } from '@/lib/api';

interface QuizQuestion {
    id: number;
    type?: 'multiple_choice' | 'cloze' | 'matching';
    word: string;
    question?: string;
    options?: string[];
    correct?: number | string;
    correctAnswer?: string;
    pairs?: { id: number; left: string; right: string }[];
    sentence_template?: string;
    points?: number;
    difficulty?: number;
}

interface QuizResult {
    score: number;
    correctCount: number;
    wrongCount: number;
    totalQuestions: number;
    passed: boolean;
    xpEarned: number;
    srsSync?: {
        synced: number;
        wordsToReview: string[];
    };
    levelProgress?: {
        currentLevel: number;
        xpInLevel: number;
        xpForNextLevel: number;
        leveledUp: boolean;
    };
    nextActions?: Array<{
        type: string;
        title: string;
        description: string;
        route?: string;
        priority: number;
    }>;
    detailedAnswers?: Array<{
        word: string;
        isCorrect: boolean;
        explanation?: { tr?: string; en?: string };
    }>;
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
    const [answers, setAnswers] = useState<Array<{ questionId: number; word: string; selectedAnswer: any; type: string }>>([]);
    const [selectedOption, setSelectedOption] = useState<any>(null);
    const [showResult, setShowResult] = useState(false);
    const [result, setResult] = useState<QuizResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [clozeInput, setClozeInput] = useState('');
    const [matchingPairs, setMatchingPairs] = useState<{ leftIndex: number; rightIndex: number }[]>([]);
    const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
    const [metadata, setMetadata] = useState<any>(null);

    useEffect(() => {
        loadQuiz();
    }, [contentId]);

    const loadQuiz = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await generateContentQuiz(contentId);
            if (response.success && response.data) {
                const quizData = response.data.data || response.data;
                setQuestions(quizData.questions || []);
                setMetadata(quizData.metadata || null);
            } else {
                setError('Quiz yüklenemedi');
            }
        } catch (err: any) {
            setError(err.message || 'Quiz yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectOption = (option: any) => {
        setSelectedOption(option);
    };

    const handleClozeInput = (value: string) => {
        setClozeInput(value);
        setSelectedOption(value);
    };

    const handleMatchingSelect = (leftIdx: number, rightIdx: number) => {
        const newPairs = matchingPairs.filter(p => p.leftIndex !== leftIdx);
        newPairs.push({ leftIndex: leftIdx, rightIndex: rightIdx });
        setMatchingPairs(newPairs);
        setSelectedOption(newPairs);
    };

    const handleNextQuestion = () => {
        const currentQuestion = questions[currentIndex];
        const questionType = currentQuestion.type || 'multiple_choice';

        let answer: any = selectedOption;
        if (questionType === 'cloze') {
            answer = clozeInput;
        } else if (questionType === 'matching') {
            answer = matchingPairs;
        }

        if (answer === null || answer === undefined || (typeof answer === 'string' && !answer.trim())) {
            return;
        }

        const newAnswers = [...answers, {
            questionId: currentQuestion.id,
            word: currentQuestion.word,
            selectedAnswer: answer,
            type: questionType,
            correctAnswer: currentQuestion.correctAnswer || currentQuestion.correct
        }];
        setAnswers(newAnswers);

        if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setSelectedOption(null);
            setClozeInput('');
            setMatchingPairs([]);
            setSelectedLeft(null);
        } else {
            // Submit quiz
            submitQuiz(newAnswers);
        }
    };

    const submitQuiz = async (finalAnswers: Array<{ questionId: number; word: string; selectedAnswer: any; type: string }>) => {
        try {
            setLoading(true);
            const response = await submitContentQuiz(contentId, finalAnswers, questions);
            if (response.success) {
                const resultData = response.data?.data || response.data || response;
                setResult({
                    score: resultData.score,
                    correctCount: resultData.correctCount,
                    wrongCount: resultData.wrongCount,
                    totalQuestions: resultData.totalQuestions,
                    passed: resultData.passed,
                    xpEarned: resultData.xpEarned,
                    srsSync: resultData.srsSync,
                    levelProgress: resultData.levelProgress,
                    nextActions: resultData.nextActions,
                    detailedAnswers: resultData.detailedAnswers
                });
                setShowResult(true);
                onComplete(resultData.score, resultData.xpEarned);
            }
        } catch (err: any) {
            setError(err.message || 'Quiz gönderilemedi');
        } finally {
            setLoading(false);
        }
    };

    const currentQuestion = questions[currentIndex];
    const questionType = currentQuestion?.type || 'multiple_choice';

    if (loading && questions.length === 0) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4" />
                    <p className="text-slate-600">Quiz hazırlanıyor...</p>
                    {metadata?.srsWordsIncluded > 0 && (
                        <p className="text-xs text-teal-600 mt-2">
                            🔄 Tekrar kelimeleriniz ekleniyor...
                        </p>
                    )}
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
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                <div className="bg-white rounded-2xl p-6 md:p-8 max-w-lg w-full mx-auto text-center">
                    {/* Result Icon */}
                    <div className="text-6xl mb-4">
                        {result.passed ? '🎉' : result.score >= 50 ? '💪' : '📚'}
                    </div>

                    {/* Title */}
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">
                        {result.passed ? 'Başarılı!' : 'Devam Et!'}
                    </h3>

                    {/* Score */}
                    <div className={`text-5xl font-black mb-2 ${result.passed ? 'text-emerald-500' : 'text-amber-500'}`}>
                        %{result.score}
                    </div>

                    {/* Stats */}
                    <div className="flex justify-center gap-6 mb-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-emerald-500">{result.correctCount}</div>
                            <div className="text-sm text-slate-500">Doğru</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-red-500">{result.wrongCount}</div>
                            <div className="text-sm text-slate-500">Yanlış</div>
                        </div>
                    </div>

                    {/* XP Earned */}
                    {result.xpEarned > 0 && (
                        <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 px-5 py-2 rounded-full mb-4">
                            <span className="text-xl">⚡</span>
                            <span className="font-bold text-lg">+{result.xpEarned} XP</span>
                        </div>
                    )}

                    {/* Level Up Alert */}
                    {result.levelProgress?.leveledUp && (
                        <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-4 py-3 rounded-xl mb-4 animate-pulse">
                            🎊 Level {result.levelProgress.currentLevel} Oldun!
                        </div>
                    )}

                    {/* SRS Sync Info */}
                    {result.srsSync && result.srsSync.synced > 0 && (
                        <div className="bg-slate-50 rounded-xl p-4 mb-4 text-left">
                            <p className="text-sm font-medium text-slate-700 mb-2">
                                📌 {result.srsSync.synced} kelime tekrar listenize eklendi:
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {result.srsSync.wordsToReview.slice(0, 5).map((word, i) => (
                                    <span key={i} className="px-3 py-1 bg-white border border-slate-200 rounded-full text-sm text-slate-600">
                                        {word}
                                    </span>
                                ))}
                                {result.srsSync.wordsToReview.length > 5 && (
                                    <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-sm text-slate-400">
                                        +{result.srsSync.wordsToReview.length - 5} daha
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Next Actions */}
                    <div className="flex flex-col gap-3">
                        {result.srsSync && result.srsSync.synced > 0 && (
                            <button
                                onClick={() => window.location.href = '/vocabulary?mode=due'}
                                className="w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                <span>📚</span>
                                <span>Kelimeleri Çalış</span>
                                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{result.srsSync.synced}</span>
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                        >
                            Tamam
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 md:p-8 max-w-lg w-full mx-auto">
                {/* Progress Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500">
                            Soru {currentIndex + 1} / {questions.length}
                        </span>
                        {currentQuestion?.difficulty && (
                            <span className="text-xs px-2 py-0.5 bg-slate-100 rounded-full">
                                {'⭐'.repeat(currentQuestion.difficulty)}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-2"
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

                {/* Question Type Badge */}
                <div className="mb-4">
                    <span className="text-xs px-3 py-1 bg-teal-50 text-teal-700 rounded-full font-medium">
                        {questionType === 'cloze' ? '✏️ Boşluk Doldurma' :
                            questionType === 'matching' ? '🔗 Eşleştirme' :
                                '🎯 Çoktan Seçmeli'}
                    </span>
                </div>

                {/* Question Content Based on Type */}
                {questionType === 'cloze' ? (
                    <>
                        <div className="text-center mb-6">
                            <p className="text-lg text-slate-700 mb-4 leading-relaxed">
                                {currentQuestion?.question || currentQuestion?.sentence_template}
                            </p>
                        </div>
                        <input
                            type="text"
                            value={clozeInput}
                            onChange={(e) => handleClozeInput(e.target.value)}
                            placeholder="Cevabınızı yazın..."
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-center text-lg font-medium focus:border-teal-500 focus:outline-none transition-colors"
                            autoFocus
                        />
                    </>
                ) : questionType === 'matching' ? (
                    <>
                        <p className="text-center text-slate-700 mb-4">{currentQuestion?.question}</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                {currentQuestion?.pairs?.map((pair, idx) => (
                                    <button
                                        key={`left-${idx}`}
                                        onClick={() => setSelectedLeft(idx)}
                                        className={`w-full p-3 rounded-xl text-sm text-left transition-all ${selectedLeft === idx
                                                ? 'bg-amber-100 border-2 border-amber-400'
                                                : matchingPairs.some(m => m.leftIndex === idx)
                                                    ? 'bg-teal-50 border-2 border-teal-400'
                                                    : 'bg-slate-50 border-2 border-slate-200 hover:border-slate-300'
                                            }`}
                                    >
                                        {pair.left}
                                    </button>
                                ))}
                            </div>
                            <div className="space-y-2">
                                {currentQuestion?.pairs?.map((pair, idx) => (
                                    <button
                                        key={`right-${idx}`}
                                        onClick={() => selectedLeft !== null && handleMatchingSelect(selectedLeft, idx)}
                                        disabled={selectedLeft === null}
                                        className={`w-full p-3 rounded-xl text-sm text-left transition-all ${matchingPairs.some(m => m.rightIndex === idx)
                                                ? 'bg-teal-50 border-2 border-teal-400 opacity-50'
                                                : selectedLeft !== null
                                                    ? 'bg-slate-50 border-2 border-amber-200 hover:border-amber-400 cursor-pointer'
                                                    : 'bg-slate-50 border-2 border-slate-200 cursor-not-allowed opacity-70'
                                            }`}
                                    >
                                        {pair.right}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <p className="text-center text-xs text-slate-500 mt-3">
                            {selectedLeft !== null
                                ? '👆 Sağ taraftan eşleşeni seçin'
                                : `${matchingPairs.length}/${currentQuestion?.pairs?.length || 0} eşleştirme`}
                        </p>
                    </>
                ) : (
                    <>
                        {/* Multiple Choice */}
                        <div className="text-center mb-6">
                            <p className="text-sm text-slate-500 mb-2">
                                {currentQuestion?.question || 'Bu kelimenin anlamı nedir?'}
                            </p>
                            <h2 className="text-3xl font-bold text-slate-800">{currentQuestion?.word}</h2>
                        </div>

                        <div className="space-y-3 mb-6">
                            {currentQuestion?.options?.map((option, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleSelectOption(index)}
                                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${selectedOption === index
                                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${selectedOption === index ? 'bg-teal-500 text-white' : 'bg-slate-100'
                                            }`}>
                                            {String.fromCharCode(65 + index)}
                                        </span>
                                        <span className="font-medium">{option}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {/* Next Button */}
                <button
                    onClick={handleNextQuestion}
                    disabled={
                        (questionType === 'cloze' && !clozeInput.trim()) ||
                        (questionType === 'matching' && matchingPairs.length < (currentQuestion?.pairs?.length || 1)) ||
                        (questionType === 'multiple_choice' && selectedOption === null) ||
                        loading
                    }
                    className={`w-full py-3 rounded-xl font-semibold transition-all mt-4 ${(questionType === 'cloze' && clozeInput.trim()) ||
                            (questionType === 'matching' && matchingPairs.length >= (currentQuestion?.pairs?.length || 1)) ||
                            (questionType === 'multiple_choice' && selectedOption !== null)
                            ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:shadow-lg'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                >
                    {loading ? 'Gönderiliyor...' : currentIndex < questions.length - 1 ? 'Sonraki →' : 'Bitir ✓'}
                </button>
            </div>
        </div>
    );
};

export default ContentQuizModal;

