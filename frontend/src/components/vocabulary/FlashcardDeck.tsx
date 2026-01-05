/**
 * 🎴 Flashcard Deck Component
 * 
 * Manages the stack of vocabulary cards and handles swipe logic.
 * Shows progress ring and daily stats.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import VocabularyCard from './VocabularyCard';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

interface Word {
    id: number;
    word: string;
    definition?: string;
    example_sentence?: string;
    level?: string;
    source_context?: string;
    ipa?: string;
}

interface FlashcardDeckProps {
    onSessionComplete?: (stats: { reviewed: number; correct: number }) => void;
    initialMode?: 'due' | 'random' | 'all';
}

const FlashcardDeck: React.FC<FlashcardDeckProps> = ({ onSessionComplete, initialMode }) => {
    const [cards, setCards] = useState<Word[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ reviewed: 0, correct: 0, earnedXP: 0 });
    const [sessionComplete, setSessionComplete] = useState(false);
    const [wordSource, setWordSource] = useState<'due' | 'random' | 'all'>(initialMode || 'due');

    // Fetch due words
    useEffect(() => {
        fetchDueWords();
    }, [wordSource]); // Refetch when source mode changes

    const fetchDueWords = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('lingroot_token');
            // Yeni SRS endpoint'i
            let endpoint = '/api/srs/due?limit=20';

            // TODO: random ve all modları için SRS servisine ek metod gerekebilir
            // Şimdilik sadece due çalışıyor
            if (wordSource !== 'due') {
                console.warn('[FlashcardDeck] Only due mode is supported in new SRS currently');
                // Fallback to due
            }

            const res = await fetch(`${API_BASE}${endpoint}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success && data.words && data.words.length > 0) {
                // Map backend response to frontend Word interface
                const mappedWords = data.words.map((w: any) => ({
                    id: w.id,
                    word: w.word,
                    definition: w.word_translation,
                    example_sentence: w.context_sentence,
                    level: 'A2' // Default
                }));
                setCards(mappedWords);
                setCurrentIndex(0);
            } else {
                setCards([]);
            }
        } catch (error) {
            console.error('Fetch due words error:', error);
            setCards([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSwipe = useCallback(async (direction: 'left' | 'right', wordId: number) => {
        // Find current word
        const currentCard = cards.find(c => c.id === wordId);
        if (!currentCard) return;
        // Rating: left (I forgot) = 1, right (I know) = 4
        // SM-2 scale: 0-5. 
        // Sol (unuttum/zor) -> 1 (Hard)
        // Sağ (biliyorum/kolay) -> 4 (Good)
        const quality = direction === 'right' ? 4 : 1;

        try {
            const token = localStorage.getItem('lingroot_token');
            const res = await fetch(`${API_BASE}/api/srs/review`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    word: currentCard.word,
                    wordTranslation: currentCard.definition,
                    quality
                })
            });

            // Log result
            const data = await res.json();
            console.log('[SRS] Review submitted:', data);

        } catch (error) {
            console.error('Review submit error:', error);
        }

        // Update stats
        setStats(prev => ({
            reviewed: prev.reviewed + 1,
            correct: direction === 'right' ? prev.correct + 1 : prev.correct,
            earnedXP: prev.earnedXP + (direction === 'right' ? 5 : 1) // XP logic basitleştirildi
        }));

        // Move to next card
        setTimeout(() => {
            if (currentIndex < cards.length - 1) {
                setCurrentIndex(prev => prev + 1);
            } else {
                setSessionComplete(true);
                onSessionComplete?.(stats);
            }
        }, 300);
    }, [currentIndex, cards.length, stats, onSessionComplete]);

    // Progress percentage
    const progress = cards.length > 0 ? ((currentIndex + 1) / cards.length) * 100 : 0;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[500px]">
                <div className="w-16 h-16 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
                <p className="mt-4 text-slate-500">Kartlar hazırlanıyor...</p>
            </div>
        );
    }

    if (sessionComplete) {
        const accuracy = stats.reviewed > 0 ? Math.round((stats.correct / stats.reviewed) * 100) : 0;

        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center h-[500px] text-center p-8"
            >
                <div className="text-7xl mb-6">🎉</div>
                <h2 className="text-3xl font-bold text-slate-800 mb-2">Harika İş!</h2>
                <p className="text-lg text-slate-500 mb-8">
                    Bugünkü tekrarını tamamladın.
                </p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-8 w-full max-w-sm">
                    <div className="bg-slate-100 rounded-2xl p-4">
                        <p className="text-3xl font-bold text-teal-600">{stats.reviewed}</p>
                        <p className="text-xs text-slate-500">Kelime</p>
                    </div>
                    <div className="bg-slate-100 rounded-2xl p-4">
                        <p className="text-3xl font-bold text-emerald-600">{accuracy}%</p>
                        <p className="text-xs text-slate-500">Doğruluk</p>
                    </div>
                    {/* Estimated XP Display */}
                    <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                        <p className="text-3xl font-bold text-amber-500">+{stats.earnedXP}</p>
                        <p className="text-xs text-amber-600/70">XP Kazanıldı</p>
                    </div>
                </div>

                <div className="flex flex-col gap-3 w-full max-w-xs">
                    {/* Smart Flow: Direct to Content Creation if session was good */}
                    <div className="text-sm text-slate-500 mb-1">Sıradaki Önerilen Görev:</div>
                    <button
                        onClick={() => window.location.href = '/welcome'}
                        className="w-full px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:shadow-xl transition-all flex items-center justify-center gap-2 group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        <span className="text-xl">🎙️</span>
                        <div className="flex flex-col items-start leading-tight">
                            <span>Yeni İçerik Oluştur</span>
                            <span className="text-[10px] opacity-80 font-medium">Öğrendiklerini pekiştir</span>
                        </div>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto">→</span>
                    </button>

                    <div className="flex gap-3">
                        <button
                            onClick={async () => {
                                setSessionComplete(false);
                                setCurrentIndex(0);
                                await fetchDueWords();
                            }}
                            className="flex-1 px-4 py-3 bg-white border-2 border-slate-100 text-slate-600 rounded-xl font-semibold hover:border-slate-200 hover:bg-slate-50 transition-all"
                        >
                            📚 Çalışmaya Devam
                        </button>

                        <button
                            onClick={() => {
                                setCurrentIndex(0);
                                setStats({ reviewed: 0, correct: 0, earnedXP: 0 });
                                setSessionComplete(false);
                                fetchDueWords();
                            }}
                            className="flex-1 px-4 py-3 bg-white border-2 border-slate-100 text-slate-600 rounded-xl font-semibold hover:border-slate-200 hover:bg-slate-50 transition-all"
                        >
                            🔄 Tekrar Et
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    }

    if (cards.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[500px] text-center p-8">
                {/* Word Source Selector */}
                <div className="mb-8 flex gap-2">
                    {[
                        { key: 'due', label: '📅 Tekrar Bekleyen', desc: 'SRS' },
                        { key: 'random', label: '🎲 Rastgele', desc: 'Karışık' },
                        { key: 'all', label: '📚 Tüm Kelimeler', desc: 'Koleksiyon' }
                    ].map((opt) => (
                        <button
                            key={opt.key}
                            onClick={() => { setWordSource(opt.key as any); }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${wordSource === opt.key
                                ? 'bg-teal-500 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
                <div className="text-6xl mb-4">📚</div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">
                    {wordSource === 'due' ? 'Bugün Tekrar Yok' : 'Henüz Kelime Yok'}
                </h3>
                <p className="text-slate-500 mb-6">
                    {wordSource === 'due'
                        ? 'Tekrar bekleyen kelimen yok. Farklı bir mod dene!'
                        : 'İçerik okurken kelimelere tıklayarak listeye ekleyebilirsin.'}
                </p>
                <div className="flex gap-3">
                    {wordSource === 'due' && (
                        <button
                            onClick={() => setWordSource('random')}
                            className="px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                        >
                            🎲 Rastgele Çalış
                        </button>
                    )}
                    {wordSource !== 'due' ? (
                        <button
                            onClick={() => fetchDueWords()}
                            className="px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                        >
                            🔄 Yenile
                        </button>
                    ) : null}
                    <button
                        onClick={() => window.location.href = '/welcome'}
                        className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                    >
                        İçerik Keşfet
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full max-w-md mx-auto">
            {/* Progress Ring */}
            <div className="flex items-center justify-between mb-6 px-4">
                <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12">
                        <svg className="w-12 h-12 -rotate-90">
                            <circle
                                cx="24" cy="24" r="20"
                                stroke="#e2e8f0"
                                strokeWidth="4"
                                fill="none"
                            />
                            <circle
                                cx="24" cy="24" r="20"
                                stroke="url(#progressGradient)"
                                strokeWidth="4"
                                fill="none"
                                strokeDasharray={`${progress * 1.26} 126`}
                                strokeLinecap="round"
                            />
                            <defs>
                                <linearGradient id="progressGradient">
                                    <stop offset="0%" stopColor="#14b8a6" />
                                    <stop offset="100%" stopColor="#10b981" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-700">
                            {currentIndex + 1}/{cards.length}
                        </span>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-800">Günlük Tekrar</p>
                        <p className="text-xs text-slate-500">{stats.correct} doğru</p>
                    </div>
                </div>

                {/* Streak indicator */}
                <div className="flex items-center gap-2 bg-orange-100 px-3 py-1.5 rounded-full">
                    <span className="text-lg">🔥</span>
                    <span className="text-sm font-semibold text-orange-600">{stats.correct}</span>
                </div>
            </div>

            {/* Card Stack */}
            <div className="relative h-[420px] flex items-center justify-center">
                <AnimatePresence>
                    {cards.map((card, index) => (
                        <VocabularyCard
                            key={card.id}
                            word={card}
                            onSwipe={handleSwipe}
                            isActive={index === currentIndex}
                        />
                    ))}
                </AnimatePresence>
            </div>

            {/* Swipe Hints */}
            <div className="flex justify-between mt-6 px-8 text-sm text-slate-400">
                <span>← Sola çek: Tekrar et</span>
                <span>Sağa çek: Biliyorum →</span>
            </div>
        </div>
    );
};

export default FlashcardDeck;
