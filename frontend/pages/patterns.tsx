import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { getApiUrl } from '../src/lib/api';

interface Pattern {
  pattern: string;
  pattern_tr: string;
  example_sentence: string;
  example_sentence_tr: string;
  level?: string;
  found_in_topic?: string;
  found_at?: string;
}

export default function PatternsPage() {
  const router = useRouter();
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPattern, setSelectedPattern] = useState<Pattern | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPatterns();
  }, []);

  const fetchPatterns = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('lingroot_token') || localStorage.getItem('auth_token');
      
      if (!token) {
        router.push('/login');
        return;
      }

      const apiUrl = getApiUrl('patterns/history');
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setPatterns(data.patterns || []);
      } else {
        setError(data.message || 'Failed to load patterns');
      }
    } catch (err) {
      console.error('Error fetching patterns:', err);
      setError('Failed to load patterns');
    } finally {
      setLoading(false);
    }
  };

  const filteredPatterns = patterns.filter(p =>
    p.pattern.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.pattern_tr?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedByLevel = filteredPatterns.reduce((acc, pattern) => {
    const level = pattern.level || 'Unknown';
    if (!acc[level]) acc[level] = [];
    acc[level].push(pattern);
    return acc;
  }, {} as Record<string, Pattern[]>);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Kalıplar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Günlük Kullanım Kalıpları - LingRoot</title>
      </Head>

      <div className="min-h-screen bg-muted py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold text-gray-800 mb-2">
                  ✨ Günlük Kullanım Kalıpları
                </h1>
                <p className="text-gray-600">
                  İçeriklerinizde geçen {patterns.length} kalıp
                </p>
              </div>
              <button
                onClick={() => router.push('/welcome')}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
              >
                ← Geri Dön
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Kalıp ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none"
              />
              <i className="fas fa-search absolute left-4 top-4 text-gray-400"></i>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Patterns by Level */}
          {Object.keys(groupedByLevel).length === 0 ? (
            <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                Henüz kalıp bulunamadı
              </h3>
              <p className="text-gray-600 mb-6">
                İçerik oluşturmaya başladığınızda kalıplar burada görünecek
              </p>
              <button
                onClick={() => router.push('/welcome')}
                className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors"
              >
                İçerik Oluştur
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedByLevel).map(([level, levelPatterns]) => (
                <div key={level} className="bg-white rounded-2xl shadow-xl p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
                    <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-lg mr-3">
                      {level}
                    </span>
                    <span className="text-gray-500 text-lg">
                      {levelPatterns.length} kalıp
                    </span>
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {levelPatterns.map((pattern, index) => (
                      <div
                        key={index}
                        onClick={() => setSelectedPattern(pattern)}
                        className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all hover:scale-105"
                      >
                        <div className="font-bold text-gray-800 mb-2 text-lg">
                          {pattern.pattern}
                        </div>
                        <div className="text-sm text-gray-600 mb-3">
                          {pattern.pattern_tr}
                        </div>
                        {pattern.found_in_topic && (
                          <div className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded inline-block">
                            📝 {pattern.found_in_topic}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pattern Detail Modal */}
      {selectedPattern && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black bg-opacity-60"
          onClick={() => setSelectedPattern(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-5 bg-gray-50 border-b-2 border-gray-200 rounded-t-2xl">
              <h3 className="text-lg font-bold text-gray-800">
                {selectedPattern.pattern}
              </h3>
              <button
                onClick={() => setSelectedPattern(null)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 font-semibold"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              {/* Anlamı - Yellow Card */}
              <div className="p-4 bg-yellow-50 border-2 border-yellow-400 rounded-xl">
                <div className="flex items-center mb-2">
                  <span className="text-base mr-2">🇹🇷</span>
                  <span className="text-xs font-bold text-gray-700">Anlamı</span>
                </div>
                <p className="text-sm text-gray-800 leading-5">
                  {selectedPattern.pattern_tr || '-'}
                </p>
              </div>

              {/* Örnek Cümle - Blue Card */}
              <div className="p-4 bg-primary/5 border-2 border-primary/30 rounded-xl">
                <div className="flex items-center mb-2">
                  <span className="text-base mr-2">🇬🇧</span>
                  <span className="text-xs font-bold text-gray-700">Örnek Cümle</span>
                </div>
                <p className="text-sm text-gray-800 leading-5">
                  {selectedPattern.example_sentence || '-'}
                </p>
              </div>

              {/* Çeviri - Green Card */}
              <div className="p-4 bg-green-50 border-2 border-green-400 rounded-xl">
                <div className="flex items-center mb-2">
                  <span className="text-base mr-2">💬</span>
                  <span className="text-xs font-bold text-gray-700">Çeviri</span>
                </div>
                <p className="text-sm text-gray-800 leading-5">
                  {selectedPattern.example_sentence_tr || '-'}
                </p>
              </div>

              {/* Metadata */}
              {selectedPattern.found_in_topic && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="text-xs text-purple-600 font-semibold mb-1">
                    Bulunduğu Konu
                  </div>
                  <div className="text-sm text-gray-700">
                    {selectedPattern.found_in_topic}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
