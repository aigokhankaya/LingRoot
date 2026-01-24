'use client';

/**
 * 📝 Quiz Detail Page
 * 
 * Tekil quiz sayfası - QuizPlayer bileşenini kullanır.
 * URL: /quizzes/[quizId]
 */

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';

// QuizPlayer'ı dynamic import ile yükle (SSR devre dışı)
const QuizPlayer = dynamic(
    () => import('@/pages/sectors/QuizPlayer'),
    { ssr: false }
);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

interface QuizInfo {
    id: string;
    title: string;
    title_tr?: string;
    description?: string;
    quiz_type: string;
    cefr_level?: string;
    difficulty?: string;
    time_limit_seconds?: number;
    passing_score?: number;
    total_questions: number;
    sector_name?: string;
    sector_code?: string;
}

export default function QuizPage() {
    const router = useRouter();
    const params = useParams();
    const quizId = params?.quizId as string;

    const [quizInfo, setQuizInfo] = useState<QuizInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [started, setStarted] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [result, setResult] = useState<any>(null);

    // ============================================
    // QUIZ BİLGİSİ YÜKLE
    // ============================================

    useEffect(() => {
        if (quizId) {
            loadQuizInfo();
        }
    }, [quizId]);

    const loadQuizInfo = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('lingroot_token');

            const response = await fetch(`${API_BASE}/api/quizzes/${quizId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();

            if (data.success && data.data) {
                setQuizInfo(data.data);
            } else {
                setError(data.error || 'Quiz bulunamadı');
            }
        } catch (err: any) {
            setError(err.message || 'Bağlantı hatası');
        } finally {
            setLoading(false);
        }
    };

    // ============================================
    // HANDLERS
    // ============================================

    const handleStart = () => {
        setStarted(true);
    };

    const handleComplete = (resultData: any) => {
        setResult(resultData);
        setCompleted(true);
        setStarted(false);
    };

    const handleClose = () => {
        if (quizInfo?.sector_code) {
            router.push(`/sectors/${quizInfo.sector_code}`);
        } else {
            router.push('/dashboard');
        }
    };

    const handleRetry = () => {
        setCompleted(false);
        setResult(null);
        setStarted(true);
    };

    // ============================================
    // LOADING STATE
    // ============================================

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4" />
                    <p className="text-slate-600">Quiz yükleniyor...</p>
                </div>
            </div>
        );
    }

    // ============================================
    // ERROR STATE
    // ============================================

    if (error || !quizInfo) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="text-6xl mb-4">😕</div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Quiz Bulunamadı</h1>
                    <p className="text-slate-600 mb-6">{error || 'Bu quiz mevcut değil veya erişiminiz yok.'}</p>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                    >
                        Dashboard'a Dön
                    </button>
                </div>
            </div>
        );
    }

    // ============================================
    // QUIZ PLAYER STATE
    // ============================================

    if (started) {
        return (
            <QuizPlayer
                quizId={quizId}
                title={quizInfo.title_tr || quizInfo.title}
                timeLimit={quizInfo.time_limit_seconds}
                onComplete={handleComplete}
                onClose={handleClose}
            />
        );
    }

    // ============================================
    // PRE-START / COMPLETED STATE
    // ============================================

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
                    <button
                        onClick={handleClose}
                        className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                        ←
                    </button>
                    {quizInfo.sector_name && (
                        <span className="px-3 py-1 bg-teal-50 text-teal-600 text-sm font-medium rounded-full">
                            {quizInfo.sector_name}
                        </span>
                    )}
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-4 py-12">
                {completed && result ? (
                    // Completed View
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                        {/* Result Header */}
                        <div className={`p-8 text-center ${result.result?.isPassed
                                ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                                : 'bg-gradient-to-br from-amber-500 to-orange-600'
                            }`}>
                            <div className="text-6xl mb-4">
                                {result.result?.isPassed ? '🎉' : '💪'}
                            </div>
                            <h1 className="text-3xl font-bold text-white mb-2">
                                {result.result?.isPassed ? 'Başarılı!' : 'Tekrar Deneyin'}
                            </h1>
                            <div className="text-6xl font-black text-white/90">
                                %{result.result?.scorePercentage || 0}
                            </div>
                        </div>

                        {/* Result Details */}
                        <div className="p-8">
                            <div className="grid grid-cols-3 gap-4 mb-8">
                                <div className="bg-slate-50 rounded-xl p-4 text-center">
                                    <div className="text-3xl font-bold text-emerald-500">
                                        {result.result?.correctCount || 0}
                                    </div>
                                    <div className="text-sm text-slate-500">Doğru</div>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-4 text-center">
                                    <div className="text-3xl font-bold text-red-500">
                                        {result.result?.wrongCount || 0}
                                    </div>
                                    <div className="text-sm text-slate-500">Yanlış</div>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-4 text-center">
                                    <div className="text-3xl font-bold text-amber-500">
                                        +{result.xp?.earned || 0}
                                    </div>
                                    <div className="text-sm text-slate-500">XP</div>
                                </div>
                            </div>

                            {/* Words to Review */}
                            {result.srsSync?.wordsToReview?.length > 0 && (
                                <div className="bg-slate-50 rounded-xl p-6 mb-8">
                                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                                        <span>📌</span>
                                        Tekrar listesine eklenen kelimeler
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {result.srsSync.wordsToReview.map((word: string, i: number) => (
                                            <span
                                                key={i}
                                                className="px-4 py-2 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-700"
                                            >
                                                {word}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-4">
                                <button
                                    onClick={handleRetry}
                                    className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                                >
                                    🔄 Tekrar Dene
                                </button>
                                {result.srsSync?.wordsToReview?.length > 0 && (
                                    <button
                                        onClick={() => router.push('/vocabulary?mode=due')}
                                        className="flex-1 py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                                    >
                                        📚 Kelimeleri Çalış
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    // Pre-Start View
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                        {/* Quiz Header */}
                        <div className="bg-gradient-to-br from-violet-600 to-purple-700 p-8 text-white">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="px-3 py-1 bg-white/20 text-white text-xs font-medium rounded-full">
                                    {getQuizTypeLabel(quizInfo.quiz_type)}
                                </span>
                                {quizInfo.cefr_level && (
                                    <span className="px-3 py-1 bg-white/20 text-white text-xs font-medium rounded-full">
                                        {quizInfo.cefr_level}
                                    </span>
                                )}
                                {quizInfo.difficulty && (
                                    <span className="px-3 py-1 bg-white/20 text-white text-xs font-medium rounded-full">
                                        {getDifficultyLabel(quizInfo.difficulty)}
                                    </span>
                                )}
                            </div>
                            <h1 className="text-3xl font-bold mb-2">
                                {quizInfo.title_tr || quizInfo.title}
                            </h1>
                            {quizInfo.description && (
                                <p className="text-white/80">{quizInfo.description}</p>
                            )}
                        </div>

                        {/* Quiz Info */}
                        <div className="p-8">
                            <div className="grid grid-cols-3 gap-4 mb-8">
                                <div className="bg-slate-50 rounded-xl p-4 text-center">
                                    <div className="text-3xl font-bold text-slate-800">
                                        {quizInfo.total_questions}
                                    </div>
                                    <div className="text-sm text-slate-500">Soru</div>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-4 text-center">
                                    <div className="text-3xl font-bold text-slate-800">
                                        {quizInfo.time_limit_seconds
                                            ? `${Math.floor(quizInfo.time_limit_seconds / 60)}dk`
                                            : '∞'
                                        }
                                    </div>
                                    <div className="text-sm text-slate-500">Süre</div>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-4 text-center">
                                    <div className="text-3xl font-bold text-slate-800">
                                        %{quizInfo.passing_score || 70}
                                    </div>
                                    <div className="text-sm text-slate-500">Geçme Notu</div>
                                </div>
                            </div>

                            {/* Instructions */}
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
                                <h3 className="font-bold text-amber-800 mb-2">📋 Talimatlar</h3>
                                <ul className="text-sm text-amber-700 space-y-1">
                                    <li>• Her soruyu dikkatle okuyun</li>
                                    <li>• Yanlış cevapladığınız kelimeler otomatik olarak tekrar listenize eklenecek</li>
                                    {quizInfo.time_limit_seconds && (
                                        <li>• Süre bittiğinde quiz otomatik olarak gönderilir</li>
                                    )}
                                </ul>
                            </div>

                            {/* Start Button */}
                            <button
                                onClick={handleStart}
                                className="w-full py-5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-2xl font-bold text-xl shadow-lg shadow-violet-500/30 hover:scale-[1.02] transition-all"
                            >
                                🚀 Quiz'e Başla
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

// ============================================
// HELPERS
// ============================================

function getQuizTypeLabel(type: string): string {
    const labels: Record<string, string> = {
        vocabulary: '📚 Kelime',
        comprehension: '📖 Anlama',
        mixed: '🎯 Karma',
        fill_blank: '✏️ Boşluk Doldurma',
        matching: '🔗 Eşleştirme'
    };
    return labels[type] || type;
}

function getDifficultyLabel(difficulty: string): string {
    const labels: Record<string, string> = {
        easy: '🟢 Kolay',
        medium: '🟡 Orta',
        hard: '🔴 Zor'
    };
    return labels[difficulty] || difficulty;
}
