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
}

const FlashcardDeck: React.FC<FlashcardDeckProps> = ({ onSessionComplete }) => {
    const [cards, setCards] = useState<Word[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ reviewed: 0, correct: 0 });
    const [sessionComplete, setSessionComplete] = useState(false);

    // Fetch due words
    useEffect(() => {
        fetchDueWords();
    }, []);

    const fetchDueWords = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/vocabulary/due?limit=20`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            console.log('[FlashcardDeck] API Response:', { status: res.status, data });

            if (data.success && data.data && data.data.length > 0) {
                setCards(data.data);
            } else {
                console.log('[FlashcardDeck] No cards returned from API');
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
        // Rating: left = 1 (Hard), right = 2 (Good)
        const rating = direction === 'right' ? 2 : 1;

        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_BASE}/api/vocabulary/review`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ wordId, rating })
            });
        } catch (error) {
            console.error('Review submit error:', error);
        }

        // Update stats
        setStats(prev => ({
            reviewed: prev.reviewed + 1,
            correct: direction === 'right' ? prev.correct + 1 : prev.correct
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
                <div className="grid grid-cols-2 gap-6 mb-8">
                    <div className="bg-slate-100 rounded-2xl p-6">
                        <p className="text-4xl font-bold text-teal-600">{stats.reviewed}</p>
                        <p className="text-sm text-slate-500">Kelime</p>
                    </div>
                    <div className="bg-slate-100 rounded-2xl p-6">
                        <p className="text-4xl font-bold text-emerald-600">{accuracy}%</p>
                        <p className="text-sm text-slate-500">Doğruluk</p>
                    </div>
                </div>

                <button
                    onClick={() => { setCurrentIndex(0); setStats({ reviewed: 0, correct: 0 }); setSessionComplete(false); fetchDueWords(); }}
                    className="px-8 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                    Tekrar Başla
                </button>
            </motion.div>
        );
    }

    if (cards.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[500px] text-center p-8">
                <div className="text-6xl mb-4">📚</div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Henüz Kelime Yok</h3>
                <p className="text-slate-500 mb-6">
                    İçerik okurken kelimelere tıklayarak listeye ekleyebilirsin.
                </p>
                <button
                    onClick={() => window.location.href = '/welcome'}
                    className="px-6 py-3 bg-teal-500 text-white rounded-xl font-semibold hover:bg-teal-600 transition-colors"
                >
                    İçerik Keşfet
                </button>
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
