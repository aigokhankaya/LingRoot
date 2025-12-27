/**
 * 📚 Vocabulary Page
 * 
 * Main dashboard for vocabulary learning:
 * - Daily Review (Flashcard Deck)
 * - My Collection
 * - Stats Overview
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import FlashcardDeck from '../src/components/vocabulary/FlashcardDeck';
import AdaptivePlacementTest from '../src/components/vocabulary/AdaptivePlacementTest';
import AppHeader from '@/components/AppHeader';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

interface VocabStats {
  totalWords: number;
  mastered: number;
  learning: number;
  dueToday: number;
  streak: number;
}

export default function VocabularyPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'review' | 'assessment' | 'collection' | 'stats'>('review');
  const [stats, setStats] = useState<VocabStats>({
    totalWords: 0,
    mastered: 0,
    learning: 0,
    dueToday: 0,
    streak: 0
  });
  const [words, setWords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLevel, setUserLevel] = useState<string | null>(null);
  const [collectionFilter, setCollectionFilter] = useState<'all' | 'learning' | 'mastered'>('all');
  const [initialMode, setInitialMode] = useState<'due' | 'random' | 'all'>('due');

  const filteredWords = words.filter(w => {
    if (collectionFilter === 'all') return true;
    if (collectionFilter === 'mastered') return w.status === 'mastered';
    return w.status === 'learning' || w.status === 'new';
  });

  // Read mode from URL query
  useEffect(() => {
    const mode = router.query.mode as string;
    if (mode === 'random' || mode === 'due' || mode === 'all') {
      setInitialMode(mode);
    }
  }, [router.query.mode]);

  useEffect(() => {
    fetchVocabularyData();
  }, []);

  const fetchVocabularyData = async () => {
    try {
      const token = localStorage.getItem('lingroot_token');

      // Fetch stats from dedicated stats endpoint
      const statsRes = await fetch(`${API_BASE}/api/vocabulary/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statsData = await statsRes.json();

      if (statsData.success && statsData.data) {
        setStats(statsData.data);
      }

      // Fetch all words for collection view (using collection endpoint, not due)
      const wordsRes = await fetch(`${API_BASE}/api/vocabulary/collection?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const wordsData = await wordsRes.json();

      if (wordsData.success && wordsData.data) {
        setWords(wordsData.data);
      } else {
        setWords([]);
      }

    } catch (error) {
      console.error('Fetch vocabulary data error:', error);
      setWords([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Kelime Kartları | LingRoot</title>
        <meta name="description" content="Akıllı tekrar sistemi ile kelime öğren" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
        {/* Header */}
        <AppHeader />

        {/* Stats Bar */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-teal-600">{stats.dueToday}</p>
                <p className="text-xs text-slate-500">Bugün</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.totalWords}</p>
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
                ? 'bg-white text-teal-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              🎴 Tekrar
            </button>
            <button
              onClick={() => setActiveTab('assessment')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'assessment'
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              🎯 Seviye Testi
            </button>
            <button
              onClick={() => setActiveTab('collection')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'collection'
                ? 'bg-white text-teal-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              📖 Koleksiyon
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'stats'
                ? 'bg-white text-teal-600 shadow-sm'
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
              initialMode={initialMode}
              onSessionComplete={(sessionStats) => {
                console.log('Session complete:', sessionStats);
              }}
            />
          )}

          {activeTab === 'assessment' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
              {userLevel ? (
                <div className="text-center">
                  <div className="text-6xl mb-4">🎓</div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Kelime Seviyen</h3>
                  <div className="inline-block bg-gradient-to-br from-purple-600 to-indigo-600 text-white px-8 py-4 rounded-xl text-3xl font-bold mb-6">
                    {userLevel}
                  </div>
                  <p className="text-slate-500 mb-6">Seviyeni güncellemek için testi tekrar yap</p>
                  <button
                    onClick={() => setUserLevel(null)}
                    className="px-6 py-3 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-xl font-medium transition-colors"
                  >
                    🎯 Testi Tekrarla
                  </button>
                </div>
              ) : (
                <AdaptivePlacementTest
                  onComplete={(result) => {
                    setUserLevel(result.level);
                    console.log('Assessment complete:', result);
                  }}
                  onCancel={() => setActiveTab('review')}
                />
              )}
            </div>
          )}

          {activeTab === 'collection' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">Tüm Kelimeler</h2>
              </div>
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setCollectionFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${collectionFilter === 'all' ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >Tümü</button>
                <button
                  onClick={() => setCollectionFilter('learning')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${collectionFilter === 'learning' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >Öğreniliyor</button>
                <button
                  onClick={() => setCollectionFilter('mastered')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${collectionFilter === 'mastered' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >Ustalaşıldı</button>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
                </div>
              ) : filteredWords.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p>{collectionFilter === 'all' ? 'Henüz kelime eklenmemiş.' : 'Bu kategoride kelime yok.'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredWords.map((word, idx) => (
                    <div
                      key={word.id || idx}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${word.status === 'mastered' ? 'bg-emerald-100' :
                          word.status === 'learning' ? 'bg-amber-100' : 'bg-slate-200'
                          }`}>
                          {word.status === 'mastered' ? '⭐' : word.status === 'learning' ? '📝' : '🆕'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{word.word}</p>
                          <p className="text-xs text-slate-500">
                            {word.level || '-'} • {word.definition ? word.definition.substring(0, 30) : '-'}
                          </p>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-6">
              {/* Weekly Activity */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Haftalık Aktivite</h3>
                <div className="flex justify-between items-end h-32">
                  {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day, idx) => {
                    const height = [60, 80, 45, 90, 100, 30, 0][idx];
                    return (
                      <div key={day} className="flex flex-col items-center gap-2">
                        <div
                          className={`w-8 rounded-t-lg transition-all ${height > 0 ? 'bg-gradient-to-t from-teal-500 to-emerald-400' : 'bg-slate-200'}`}
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
                        stroke="url(#retentionGradient)"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray="200 251"
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="retentionGradient">
                          <stop offset="0%" stopColor="#14b8a6" />
                          <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-slate-800">79%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-600">
                      Öğrendiğin kelimelerin <strong>%79</strong>'unu doğru hatırlıyorsun.
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

export const VocabularyTabContent: React.FC<{ user?: any }> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'review' | 'collection'>('review');
  const [words, setWords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'learning' | 'mastered'>('all');

  const filteredWords = words.filter(w => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'mastered') return w.status === 'mastered';
    return w.status === 'learning' || w.status === 'new';
  });

  useEffect(() => {
    if (activeTab === 'collection') {
      fetchWords();
    }
  }, [activeTab]);

  const fetchWords = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('lingroot_token');
      // Use /collection endpoint to get all user's words (not just due words)
      const res = await fetch(`${API_BASE}/api/vocabulary/collection?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setWords(data.data);
      } else {
        setWords([]);
      }
    } catch (error) {
      console.error('Fetch words error:', error);
      setWords([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl max-w-md">
        <button
          onClick={() => setActiveTab('review')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'review'
            ? 'bg-white text-teal-600 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          🎴 Tekrar
        </button>
        <button
          onClick={() => setActiveTab('collection')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'collection'
            ? 'bg-white text-teal-600 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          📖 Koleksiyon
        </button>
      </div>

      {/* Content */}
      {activeTab === 'review' && (
        <FlashcardDeck
          onSessionComplete={(sessionStats) => {
            console.log('Session complete:', sessionStats);
          }}
        />
      )}

      {activeTab === 'collection' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800">Tüm Kelimeler</h2>
          </div>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterStatus === 'all' ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >Tümü</button>
            <button
              onClick={() => setFilterStatus('learning')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterStatus === 'learning' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >Öğreniliyor</button>
            <button
              onClick={() => setFilterStatus('mastered')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterStatus === 'mastered' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >Ustalaşıldı</button>
          </div>

          {/* Word List */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
            </div>
          ) : filteredWords.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>{filterStatus === 'all' ? 'Henüz kelime eklenmemiş.' : 'Bu kategoride kelime yok.'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredWords.map((word, idx) => (
                <div
                  key={word.id || idx}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${word.status === 'mastered' ? 'bg-emerald-100' :
                      word.status === 'learning' ? 'bg-amber-100' : 'bg-slate-200'
                      }`}>
                      {word.status === 'mastered' ? '⭐' : word.status === 'learning' ? '📝' : '🆕'}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{word.word}</p>
                      <p className="text-xs text-slate-500">
                        {word.level || '-'} • {word.definition ? word.definition.substring(0, 30) : '-'}
                      </p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
