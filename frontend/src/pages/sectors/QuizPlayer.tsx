/**
 * 🎮 Quiz Player Component
 * 
 * Ana quiz container bileşeni.
 * Farklı soru tiplerini render eder, zamanlama ve ilerleme takibi yapar.
 * 
 * Desteklenen Soru Tipleri:
 * - multiple_choice: Çoktan seçmeli
 * - cloze: Boşluk doldurma
 * - matching: Eşleştirme
 * - ordering: Kelime sıralama
 * - true_false: Doğru/Yanlış
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';

// API
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

// ============================================
// TYPES
// ============================================

export interface QuizQuestion {
    id: number;
    type: 'multiple_choice' | 'cloze' | 'matching' | 'ordering' | 'true_false' | 'error_correction';
    question: string;
    word?: string;
    options?: string[];
    pairs?: { left: string; right: string }[];
    words?: string[];
    correct?: number | string | number[];
    points?: number;
    difficulty?: number;
    explanation?: {
        tr?: string;
        en?: string;
    };
}

export interface QuizResult {
    questionId: number;
    userAnswer: any;
    isCorrect: boolean;
    responseTime: number;
}

export interface QuizPlayerProps {
    quizId?: string;
    contentId?: string;
    questions?: QuizQuestion[];
    title?: string;
    timeLimit?: number; // saniye
    onComplete?: (result: any) => void;
    onClose?: () => void;
    showTimer?: boolean;
    showProgress?: boolean;
}

// ============================================
// MAIN COMPONENT
// ============================================

const QuizPlayer: React.FC<QuizPlayerProps> = ({
    quizId,
    contentId,
    questions: propQuestions,
    title = 'Quiz',
    timeLimit,
    onComplete,
    onClose,
    showTimer = true,
    showProgress = true
}) => {
    const router = useRouter();

    // State
    const [questions, setQuestions] = useState<QuizQuestion[]>(propQuestions || []);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<QuizResult[]>([]);
    const [currentAnswer, setCurrentAnswer] = useState<any>(null);
    const [loading, setLoading] = useState(!propQuestions);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [timeRemaining, setTimeRemaining] = useState<number | null>(timeLimit || null);
    const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
    const [showFeedback, setShowFeedback] = useState(false);
    const [lastFeedback, setLastFeedback] = useState<any>(null);

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // ============================================
    // QUIZ YÜKLEME
    // ============================================

    useEffect(() => {
        if (quizId && !propQuestions) {
            loadQuiz();
        }
    }, [quizId]);

    const loadQuiz = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('lingroot_token');

            const response = await fetch(`${API_BASE}/api/quizzes/${quizId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();

            if (data.success && data.data) {
                setQuestions(data.data.questions || []);
                if (data.data.time_limit_seconds) {
                    setTimeRemaining(data.data.time_limit_seconds);
                }
            } else {
                setError(data.error || 'Quiz yüklenemedi');
            }
        } catch (err: any) {
            setError(err.message || 'Bağlantı hatası');
        } finally {
            setLoading(false);
        }
    };

    // ============================================
    // ZAMANLAYICI
    // ============================================

    useEffect(() => {
        if (timeRemaining !== null && timeRemaining > 0 && !showResult) {
            timerRef.current = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev === null || prev <= 1) {
                        // Süre doldu - otomatik gönder
                        handleSubmitQuiz();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [timeRemaining, showResult]);

    // ============================================
    // CEVAP İŞLEME
    // ============================================

    const handleAnswerChange = useCallback((answer: any) => {
        setCurrentAnswer(answer);
    }, []);

    const handleNextQuestion = useCallback(() => {
        if (currentAnswer === null || currentAnswer === undefined) return;

        const responseTime = Date.now() - questionStartTime;
        const currentQuestion = questions[currentIndex];

        // Cevabı kaydet
        const newAnswer: QuizResult = {
            questionId: currentQuestion.id,
            userAnswer: currentAnswer,
            isCorrect: false, // Backend'de hesaplanacak
            responseTime
        };

        const newAnswers = [...answers, newAnswer];
        setAnswers(newAnswers);

        // Sonraki soruya geç veya quiz'i bitir
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setCurrentAnswer(null);
            setQuestionStartTime(Date.now());
            setShowFeedback(false);
        } else {
            // Quiz tamamlandı
            submitQuiz(newAnswers);
        }
    }, [currentAnswer, currentIndex, questions, answers, questionStartTime]);

    // ============================================
    // QUIZ GÖNDERME
    // ============================================

    const handleSubmitQuiz = useCallback(() => {
        // Mevcut cevabı da ekle
        const allAnswers = [...answers];
        if (currentAnswer !== null && currentAnswer !== undefined) {
            allAnswers.push({
                questionId: questions[currentIndex].id,
                userAnswer: currentAnswer,
                isCorrect: false,
                responseTime: Date.now() - questionStartTime
            });
        }
        submitQuiz(allAnswers);
    }, [answers, currentAnswer, currentIndex, questions, questionStartTime]);

    const submitQuiz = async (finalAnswers: QuizResult[]) => {
        try {
            setSubmitting(true);
            const token = localStorage.getItem('lingroot_token');

            // Cevapları API formatına dönüştür
            const formattedAnswers = finalAnswers.map(a => ({
                question_id: a.questionId,
                selected: a.userAnswer,
                answer: a.userAnswer,
                response_time: a.responseTime
            }));

            const response = await fetch(`${API_BASE}/api/quizzes/${quizId}/submit`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    answers: formattedAnswers,
                    time_taken_seconds: timeLimit
                        ? timeLimit - (timeRemaining || 0)
                        : Math.floor(finalAnswers.reduce((sum, a) => sum + a.responseTime, 0) / 1000)
                })
            });

            const data = await response.json();

            if (data.success) {
                setResult(data.data);
                setShowResult(true);
                onComplete?.(data.data);
            } else {
                setError(data.error || 'Quiz gönderilemedi');
            }
        } catch (err: any) {
            setError(err.message || 'Gönderim hatası');
        } finally {
            setSubmitting(false);
        }
    };

    // ============================================
    // FORMAT HELPERS
    // ============================================

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // ============================================
    // LOADING STATE
    // ============================================

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4" />
                    <p className="text-slate-600">Quiz yükleniyor...</p>
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
                        className="px-6 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200"
                    >
                        Kapat
                    </button>
                </div>
            </div>
        );
    }

    // ============================================
    // RESULT STATE
    // ============================================

    if (showResult && result) {
        return <QuizResultScreen result={result} onClose={onClose} />;
    }

    // ============================================
    // QUIZ STATE
    // ============================================

    const currentQuestion = questions[currentIndex];
    const progress = ((currentIndex + 1) / questions.length) * 100;

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-slate-900 to-slate-800 z-50 overflow-y-auto">
            <div className="min-h-screen flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 transition-colors"
                        >
                            ✕
                        </button>
                        <h1 className="text-lg font-bold text-white">{title}</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Timer */}
                        {showTimer && timeRemaining !== null && (
                            <div className={`px-4 py-2 rounded-full font-mono font-bold ${timeRemaining < 60 ? 'bg-red-500 text-white animate-pulse' : 'bg-white/10 text-white'
                                }`}>
                                ⏱️ {formatTime(timeRemaining)}
                            </div>
                        )}

                        {/* Progress */}
                        {showProgress && (
                            <div className="text-white/70 text-sm font-medium">
                                {currentIndex + 1} / {questions.length}
                            </div>
                        )}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="h-1 bg-white/10">
                    <div
                        className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Question Area */}
                <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
                    <div className="w-full max-w-2xl">
                        {/* Question Type Badge */}
                        <div className="flex items-center gap-2 mb-6">
                            <span className="px-3 py-1 bg-white/10 text-white/70 text-xs font-medium rounded-full">
                                {getQuestionTypeLabel(currentQuestion.type)}
                            </span>
                            {currentQuestion.difficulty && (
                                <span className="px-3 py-1 bg-white/10 text-white/70 text-xs font-medium rounded-full">
                                    {'⭐'.repeat(currentQuestion.difficulty)}
                                </span>
                            )}
                        </div>

                        {/* Render Question Component */}
                        <QuestionRenderer
                            question={currentQuestion}
                            value={currentAnswer}
                            onChange={handleAnswerChange}
                            showFeedback={showFeedback}
                            feedback={lastFeedback}
                        />

                        {/* Action Buttons */}
                        <div className="mt-8 flex justify-end gap-4">
                            <button
                                onClick={handleNextQuestion}
                                disabled={currentAnswer === null || currentAnswer === undefined || submitting}
                                className={`px-8 py-4 rounded-2xl font-bold text-lg transition-all ${currentAnswer !== null && currentAnswer !== undefined
                                    ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/30 hover:scale-105'
                                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                                    }`}
                            >
                                {submitting
                                    ? 'Gönderiliyor...'
                                    : currentIndex < questions.length - 1
                                        ? 'İleri →'
                                        : 'Bitir ✓'
                                }
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============================================
// QUESTION RENDERER
// ============================================

interface QuestionRendererProps {
    question: QuizQuestion;
    value: any;
    onChange: (value: any) => void;
    showFeedback?: boolean;
    feedback?: any;
}

const QuestionRenderer: React.FC<QuestionRendererProps> = ({
    question,
    value,
    onChange,
    showFeedback,
    feedback
}) => {
    switch (question.type) {
        case 'multiple_choice':
            return (
                <MultipleChoiceQuestion
                    question={question}
                    selected={value}
                    onSelect={onChange}
                />
            );

        case 'cloze':
            return (
                <ClozeQuestion
                    question={question}
                    value={value || ''}
                    onChange={onChange}
                />
            );

        case 'matching':
            return (
                <MatchingQuestion
                    question={question}
                    matches={value || []}
                    onChange={onChange}
                />
            );

        case 'ordering':
            return (
                <OrderingQuestion
                    question={question}
                    order={value}
                    onChange={onChange}
                />
            );

        case 'true_false':
            return (
                <TrueFalseQuestion
                    question={question}
                    selected={value}
                    onSelect={onChange}
                />
            );

        default:
            return (
                <MultipleChoiceQuestion
                    question={question}
                    selected={value}
                    onSelect={onChange}
                />
            );
    }
};

// ============================================
// MULTIPLE CHOICE QUESTION
// ============================================

interface MCQuestionProps {
    question: QuizQuestion;
    selected: number | null;
    onSelect: (index: number) => void;
}

const MultipleChoiceQuestion: React.FC<MCQuestionProps> = ({ question, selected, onSelect }) => {
    return (
        <div>
            {/* Question Text */}
            <div className="mb-8">
                {question.word && (
                    <div className="text-center mb-4">
                        <span className="px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-2xl font-bold rounded-2xl inline-block shadow-lg">
                            {question.word}
                        </span>
                    </div>
                )}
                <p className="text-xl sm:text-2xl text-white font-medium text-center leading-relaxed">
                    {question.question}
                </p>
            </div>

            {/* Options */}
            <div className="grid gap-3">
                {question.options?.map((option, index) => (
                    <button
                        key={index}
                        onClick={() => onSelect(index)}
                        className={`w-full p-5 rounded-2xl text-left transition-all duration-200 border-2 ${selected === index
                            ? 'border-teal-400 bg-teal-500/20 text-white shadow-lg shadow-teal-500/20'
                            : 'border-white/10 bg-white/5 text-white/90 hover:border-white/30 hover:bg-white/10'
                            }`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${selected === index
                                ? 'bg-teal-500 text-white'
                                : 'bg-white/10 text-white/70'
                                }`}>
                                {String.fromCharCode(65 + index)}
                            </div>
                            <span className="flex-1 text-lg">{option}</span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

// ============================================
// CLOZE (FILL-IN-THE-BLANK) QUESTION
// ============================================

interface ClozeQuestionProps {
    question: QuizQuestion;
    value: string;
    onChange: (value: string) => void;
}

const ClozeQuestion: React.FC<ClozeQuestionProps> = ({ question, value, onChange }) => {
    return (
        <div>
            {/* Question Text with Blank */}
            <div className="text-xl sm:text-2xl text-white font-medium text-center leading-relaxed mb-8">
                {question.question.split('_____').map((part, index, array) => (
                    <React.Fragment key={index}>
                        <span>{part}</span>
                        {index < array.length - 1 && (
                            <span className="inline-block min-w-[100px] mx-2 border-b-2 border-teal-400 text-teal-400 font-bold">
                                {value || ''}
                            </span>
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Input */}
            <div className="max-w-md mx-auto">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Cevabınızı yazın..."
                    className="w-full px-6 py-4 bg-white/10 border-2 border-white/20 rounded-2xl text-white text-xl text-center placeholder:text-white/40 focus:outline-none focus:border-teal-400 transition-colors"
                    autoComplete="off"
                    autoFocus
                />
            </div>

            {/* Hint */}
            {question.word && (
                <p className="text-center text-white/50 text-sm mt-4">
                    💡 İpucu: Bu kelime "{question.word}" ile ilgili.
                </p>
            )}
        </div>
    );
};

// ============================================
// MATCHING QUESTION
// ============================================

interface MatchingQuestionProps {
    question: QuizQuestion;
    matches: { leftIndex: number; rightIndex: number }[];
    onChange: (matches: { leftIndex: number; rightIndex: number }[]) => void;
}

const MatchingQuestion: React.FC<MatchingQuestionProps> = ({ question, matches, onChange }) => {
    const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
    const pairs = question.pairs || [];

    const handleLeftClick = (index: number) => {
        setSelectedLeft(index);
    };

    const handleRightClick = (rightIndex: number) => {
        if (selectedLeft === null) return;

        // Mevcut eşleşmeleri güncelle
        const newMatches = matches.filter(m => m.leftIndex !== selectedLeft);
        newMatches.push({ leftIndex: selectedLeft, rightIndex });
        onChange(newMatches);
        setSelectedLeft(null);
    };

    const getMatchedRight = (leftIndex: number) => {
        const match = matches.find(m => m.leftIndex === leftIndex);
        return match ? match.rightIndex : null;
    };

    const isRightMatched = (rightIndex: number) => {
        return matches.some(m => m.rightIndex === rightIndex);
    };

    // Right tarafı karıştır
    const shuffledRight = React.useMemo(() => {
        const rightItems = pairs.map((p, i) => ({ text: p.right, originalIndex: i }));
        return rightItems.sort(() => Math.random() - 0.5);
    }, [pairs]);

    return (
        <div>
            <p className="text-xl text-white font-medium text-center mb-8">
                {question.question || 'Eşleştirmeleri yapın:'}
            </p>

            <div className="grid grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-3">
                    {pairs.map((pair, index) => {
                        const matchedRight = getMatchedRight(index);
                        return (
                            <button
                                key={index}
                                onClick={() => handleLeftClick(index)}
                                className={`w-full p-4 rounded-xl text-left transition-all ${selectedLeft === index
                                    ? 'bg-amber-500 text-white ring-2 ring-amber-300'
                                    : matchedRight !== null
                                        ? 'bg-teal-500/20 border-2 border-teal-400 text-teal-300'
                                        : 'bg-white/10 text-white hover:bg-white/20'
                                    }`}
                            >
                                <span className="font-medium">{pair.left}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Right Column */}
                <div className="space-y-3">
                    {shuffledRight.map((item, displayIndex) => {
                        const isMatched = isRightMatched(item.originalIndex);
                        return (
                            <button
                                key={displayIndex}
                                onClick={() => handleRightClick(item.originalIndex)}
                                disabled={isMatched && selectedLeft === null}
                                className={`w-full p-4 rounded-xl text-left transition-all ${isMatched
                                    ? 'bg-teal-500/20 border-2 border-teal-400 text-teal-300 opacity-50'
                                    : selectedLeft !== null
                                        ? 'bg-white/10 text-white hover:bg-white/20 cursor-pointer ring-2 ring-amber-300/50'
                                        : 'bg-white/10 text-white/70'
                                    }`}
                            >
                                <span className="font-medium">{item.text}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <p className="text-center text-white/50 text-sm mt-6">
                {selectedLeft !== null
                    ? '👆 Şimdi sağ taraftan eşleşeni seçin'
                    : `${matches.length}/${pairs.length} eşleştirme yapıldı`
                }
            </p>
        </div>
    );
};

// ============================================
// ORDERING QUESTION
// ============================================

interface OrderingQuestionProps {
    question: QuizQuestion;
    order: number[] | null;
    onChange: (order: number[]) => void;
}

const OrderingQuestion: React.FC<OrderingQuestionProps> = ({ question, order, onChange }) => {
    const words = question.words || question.options || [];

    // İlk render'da karıştırılmış sıra
    const [items, setItems] = useState<{ word: string; originalIndex: number }[]>(() => {
        const shuffled = words.map((w, i) => ({ word: w, originalIndex: i }));
        return shuffled.sort(() => Math.random() - 0.5);
    });

    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    useEffect(() => {
        // Order'ı parent'a bildir
        onChange(items.map(item => item.originalIndex));
    }, [items]);

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const newItems = [...items];
        const draggedItem = newItems[draggedIndex];
        newItems.splice(draggedIndex, 1);
        newItems.splice(index, 0, draggedItem);
        setItems(newItems);
        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const moveItem = (from: number, direction: 'up' | 'down') => {
        const to = direction === 'up' ? from - 1 : from + 1;
        if (to < 0 || to >= items.length) return;

        const newItems = [...items];
        [newItems[from], newItems[to]] = [newItems[to], newItems[from]];
        setItems(newItems);
    };

    return (
        <div>
            <p className="text-xl text-white font-medium text-center mb-8">
                {question.question || 'Kelimeleri doğru sıraya dizin:'}
            </p>

            <div className="max-w-lg mx-auto space-y-2">
                {items.map((item, index) => (
                    <div
                        key={item.originalIndex}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center gap-3 p-4 bg-white/10 rounded-xl cursor-grab active:cursor-grabbing transition-all ${draggedIndex === index ? 'opacity-50 scale-95' : ''
                            }`}
                    >
                        <span className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-lg text-white/50 font-bold text-sm">
                            {index + 1}
                        </span>
                        <span className="flex-1 text-white font-medium">{item.word}</span>
                        <div className="flex gap-1">
                            <button
                                onClick={() => moveItem(index, 'up')}
                                disabled={index === 0}
                                className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-lg text-white/70 hover:bg-white/20 disabled:opacity-30"
                            >
                                ↑
                            </button>
                            <button
                                onClick={() => moveItem(index, 'down')}
                                disabled={index === items.length - 1}
                                className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-lg text-white/70 hover:bg-white/20 disabled:opacity-30"
                            >
                                ↓
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <p className="text-center text-white/50 text-sm mt-6">
                📌 Sürükleyerek veya okları kullanarak sıralayın
            </p>
        </div>
    );
};

// ============================================
// TRUE/FALSE QUESTION
// ============================================

interface TrueFalseQuestionProps {
    question: QuizQuestion;
    selected: boolean | null;
    onSelect: (value: boolean) => void;
}

const TrueFalseQuestion: React.FC<TrueFalseQuestionProps> = ({ question, selected, onSelect }) => {
    return (
        <div>
            <p className="text-xl sm:text-2xl text-white font-medium text-center leading-relaxed mb-8">
                {question.question}
            </p>

            <div className="flex justify-center gap-6">
                <button
                    onClick={() => onSelect(true)}
                    className={`w-40 h-40 rounded-3xl flex flex-col items-center justify-center gap-2 transition-all ${selected === true
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105'
                        : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                >
                    <span className="text-5xl">✓</span>
                    <span className="font-bold text-xl">DOĞRU</span>
                </button>

                <button
                    onClick={() => onSelect(false)}
                    className={`w-40 h-40 rounded-3xl flex flex-col items-center justify-center gap-2 transition-all ${selected === false
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-105'
                        : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                >
                    <span className="text-5xl">✕</span>
                    <span className="font-bold text-xl">YANLIŞ</span>
                </button>
            </div>
        </div>
    );
};

// ============================================
// RESULT SCREEN
// ============================================

interface QuizResultScreenProps {
    result: any;
    onClose?: () => void;
}

const QuizResultScreen: React.FC<QuizResultScreenProps> = ({ result, onClose }) => {
    const router = useRouter();
    const isPassed = result?.result?.isPassed;
    const score = result?.result?.scorePercentage || 0;
    const xpEarned = result?.xp?.earned || 0;
    const wordsToReview = result?.srsSync?.wordsToReview || [];

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-slate-900 to-slate-800 z-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center">
                {/* Icon */}
                <div className="text-7xl mb-6">
                    {isPassed ? '🎉' : score >= 50 ? '💪' : '📚'}
                </div>

                {/* Title */}
                <h2 className="text-3xl font-bold text-slate-800 mb-2">
                    {isPassed ? 'Tebrikler!' : 'Devam Et!'}
                </h2>

                {/* Score */}
                <div className={`text-6xl font-black mb-4 ${isPassed ? 'text-emerald-500' : 'text-amber-500'
                    }`}>
                    %{score}
                </div>

                {/* Stats */}
                <div className="flex justify-center gap-6 mb-6">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-emerald-500">
                            {result?.result?.correctCount || 0}
                        </div>
                        <div className="text-sm text-slate-500">Doğru</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-red-500">
                            {result?.result?.wrongCount || 0}
                        </div>
                        <div className="text-sm text-slate-500">Yanlış</div>
                    </div>
                </div>

                {/* XP Earned */}
                {xpEarned > 0 && (
                    <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 px-5 py-2 rounded-full mb-6">
                        <span className="text-xl">⚡</span>
                        <span className="font-bold text-lg">+{xpEarned} XP</span>
                    </div>
                )}

                {/* SRS Prompt */}
                {wordsToReview.length > 0 && (
                    <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left">
                        <p className="text-sm font-medium text-slate-700 mb-2">
                            📌 Bu kelimeler tekrar listenize eklendi:
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {wordsToReview.slice(0, 5).map((word: string, i: number) => (
                                <span key={i} className="px-3 py-1 bg-white border border-slate-200 rounded-full text-sm text-slate-600">
                                    {word}
                                </span>
                            ))}
                            {wordsToReview.length > 5 && (
                                <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-sm text-slate-400">
                                    +{wordsToReview.length - 5} daha
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-3">
                    {wordsToReview.length > 0 && (
                        <button
                            onClick={() => router.push('/vocabulary?mode=due')}
                            className="w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                        >
                            📚 Kelimeleri Çalış
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                    >
                        Tamam
                    </button>
                </div>
            </div>
        </div>
    );
};

// ============================================
// HELPERS
// ============================================

function getQuestionTypeLabel(type: string): string {
    const labels: Record<string, string> = {
        multiple_choice: '🎯 Çoktan Seçmeli',
        cloze: '✏️ Boşluk Doldurma',
        matching: '🔗 Eşleştirme',
        ordering: '📋 Sıralama',
        true_false: '✓/✕ Doğru/Yanlış',
        error_correction: '🔍 Hata Düzeltme',
        dictation: '🎧 Dikte'
    };
    return labels[type] || type;
}

export default QuizPlayer;
