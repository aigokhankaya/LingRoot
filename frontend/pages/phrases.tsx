/**
 * 💬 Phrases Page
 * 
 * Cümle kalıpları ve deyimler için SRS kartları.
 * Vocabulary sayfası ile aynı mantıkta çalışır.
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import FlashcardDeck from '../src/components/vocabulary/FlashcardDeck';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

interface PhraseStats {
    totalPhrases: number;
    mastered: number;
    learning: number;
    dueToday: number;
    streak: number;
}

export default function PhrasesPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'review' | 'collection' | 'stats'>('review');
    const [stats, setStats] = useState<PhraseStats>({
        totalPhrases: 0,
        mastered: 0,
        learning: 0,
        dueToday: 0,
        streak: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPhraseData();
    }, []);

    const fetchPhraseData = async () => {
        try {
            const token = localStorage.getItem('token');

            // Fetch stats for phrases
            const statsRes = await fetch(`${API_BASE}/api/vocabulary/stats?type=phrase`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Use mock data for now
            setStats({
                totalPhrases: 12,
                mastered: 3,
                learning: 9,
                dueToday: 5,
                streak: 2
            });

        } catch (error) {
            console.error('Fetch phrase data error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Head>
                <title>Cümle Kalıpları | LingRoot</title>
                <meta name="description" content="Deyimler ve kalıplarla İngilizceni geliştir" />
            </Head>

            <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
                {/* Header */}
                <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-50">
                    <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                        <Link href="/welcome" className="flex items-center gap-2 text-slate-600 hover:text-slate-800">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <span>Geri</span>
                        </Link>

                        <h1 className="text-lg font-bold text-slate-800">💬 Cümle Kalıpları</h1>

                        <div className="w-16" /> {/* Spacer for centering */}
                    </div>
                </header>

                {/* Stats Bar */}
                <div className="bg-white border-b border-slate-200">
                    <div className="max-w-4xl mx-auto px-4 py-4">
                        <div className="grid grid-cols-4 gap-4 text-center">
                            <div>
                                <p className="text-2xl font-bold text-purple-600">{stats.dueToday}</p>
                                <p className="text-xs text-slate-500">Bugün</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-800">{stats.totalPhrases}</p>
                                <p className="text-xs text-slate-500">Toplam</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-emerald-600">{stats.mastered}</p>
                                <p className="text-xs text-slate-500">Öğrenildi</p>
                            </div>
                            <div className="flex flex-col items-center">
                                <div className="flex items-center gap-1">
                                    <span className="text-lg">🔥</span>
                                    <p className="text-2xl font-bold text-orange-500">{stats.streak}</p>
                                </div>
                                <p className="text-xs text-slate-500">Seri</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="max-w-4xl mx-auto px-4 pt-4">
                    <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab('review')}
                            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'review'
                                ? 'bg-white text-purple-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            🎴 Tekrar
                        </button>
                        <button
                            onClick={() => setActiveTab('collection')}
                            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'collection'
                                ? 'bg-white text-purple-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            📖 Koleksiyon
                        </button>
                        <button
                            onClick={() => setActiveTab('stats')}
                            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'stats'
                                ? 'bg-white text-purple-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            📊 İstatistik
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-4xl mx-auto px-4 py-8">
                    {activeTab === 'review' && (
                        <FlashcardDeck
                            onSessionComplete={(sessionStats) => {
                                console.log('Session complete:', sessionStats);
                            }}
                        />
                    )}

                    {activeTab === 'collection' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-slate-800">Tüm Kalıplar</h2>
                                <select className="px-3 py-2 bg-slate-100 rounded-lg text-sm border-0">
                                    <option>Tümü</option>
                                    <option>Deyimler</option>
                                    <option>Kalıplar</option>
                                    <option>Öğreniliyor</option>
                                    <option>Ustalaşıldı</option>
                                </select>
                            </div>

                            {/* Phrase List */}
                            <div className="space-y-3">
                                {[
                                    { phrase: 'Break the ice', meaning: 'İlk adımı atmak, buzları kırmak', category: 'idiom', status: 'learning', streak: 2 },
                                    { phrase: 'As a matter of fact', meaning: 'Aslında, işin aslı', category: 'phrase', status: 'mastered', streak: 5 },
                                    { phrase: 'It goes without saying', meaning: 'Söylemeye gerek yok', category: 'phrase', status: 'learning', streak: 1 },
                                    { phrase: 'Under the weather', meaning: 'Keyifsiz, hasta gibi olmak', category: 'idiom', status: 'new', streak: 0 },
                                ].map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${item.status === 'mastered' ? 'bg-emerald-100' :
                                                item.status === 'learning' ? 'bg-amber-100' : 'bg-slate-200'
                                                }`}>
                                                {item.category === 'idiom' ? '🎭' : '💬'}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-800">{item.phrase}</p>
                                                <p className="text-sm text-slate-500">{item.meaning}</p>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    {item.category === 'idiom' ? 'Deyim' : 'Kalıp'} • {item.streak > 0 ? `${item.streak}🔥` : 'Yeni'}
                                                </p>
                                            </div>
                                        </div>
                                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'stats' && (
                        <div className="space-y-6">
                            {/* Weekly Activity */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                                <h3 className="text-lg font-bold text-slate-800 mb-4">Haftalık Aktivite</h3>
                                <div className="flex justify-between items-end h-32">
                                    {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day, idx) => {
                                        const height = [40, 60, 30, 80, 100, 20, 0][idx];
                                        return (
                                            <div key={day} className="flex flex-col items-center gap-2">
                                                <div
                                                    className={`w-8 rounded-t-lg transition-all ${height > 0 ? 'bg-gradient-to-t from-purple-500 to-violet-400' : 'bg-slate-200'}`}
                                                    style={{ height: `${height}%` }}
                                                />
                                                <span className="text-xs text-slate-500">{day}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Retention Rate */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                                <h3 className="text-lg font-bold text-slate-800 mb-4">Hatırlama Oranı</h3>
                                <div className="flex items-center gap-6">
                                    <div className="relative w-24 h-24">
                                        <svg className="w-24 h-24 -rotate-90">
                                            <circle cx="48" cy="48" r="40" stroke="#e2e8f0" strokeWidth="8" fill="none" />
                                            <circle
                                                cx="48" cy="48" r="40"
                                                stroke="url(#phraseRetentionGradient)"
                                                strokeWidth="8"
                                                fill="none"
                                                strokeDasharray="180 251"
                                                strokeLinecap="round"
                                            />
                                            <defs>
                                                <linearGradient id="phraseRetentionGradient">
                                                    <stop offset="0%" stopColor="#8b5cf6" />
                                                    <stop offset="100%" stopColor="#a855f7" />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-2xl font-bold text-slate-800">72%</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-slate-600">
                                            Öğrendiğin kalıpların <strong>%72</strong>'sını doğru hatırlıyorsun.
                                        </p>
                                        <p className="text-sm text-slate-400 mt-1">*Son 7 gün</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
