'use client';

import React, { useState, useEffect } from 'react';

interface UsageStats {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost: string;
    processingTimeMs: number;
    model: string;
    batches?: number;
}

interface GeneratedPattern {
    text: string;
    translation: string;
    explanation: string;
    level?: string;
    example_text?: string;
    example_translation?: string;
}

const PATTERN_TYPES = [
    { value: 'idiom', label: 'Idiom (Deyim)', icon: '🗣️' },
    { value: 'pattern', label: 'Sentence Pattern (Cümle Kalıbı)', icon: '📝' },
    { value: 'phrasal_verb', label: 'Phrasal Verb (Fiil Öbeği)', icon: '🔗' },
    { value: 'proverb', label: 'Proverb (Atasözü)', icon: '📜' },
];

export default function LLMPatternGenerator() {
    const [selectedType, setSelectedType] = useState('idiom');
    const [countInput, setCountInput] = useState('10');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [generatedPatterns, setGeneratedPatterns] = useState<GeneratedPattern[]>([]);
    const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
    const [insertedCount, setInsertedCount] = useState(0);
    const [duplicateCount, setDuplicateCount] = useState(0);
    const [totalGenerated, setTotalGenerated] = useState(0);
    const [requestedCount, setRequestedCount] = useState(0);

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

    const handleGenerate = async () => {
        const count = parseInt(countInput) || 0;
        if (!selectedType || count < 1) {
            setError('Lütfen geçerli bir adet girin (en az 1)');
            return;
        }

        setLoading(true);
        setError('');
        setGeneratedPatterns([]);
        setUsageStats(null);

        try {
            const token = localStorage.getItem('lingroot_token') || localStorage.getItem('auth_token');

            const response = await fetch(`${API_BASE}/api/patterns/llm/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    type: selectedType,
                    count: count
                })
            });

            const data = await response.json();

            if (data.success) {
                setGeneratedPatterns(data.patterns || []);
                setUsageStats(data.usage);
                setInsertedCount(data.inserted || 0);
                setDuplicateCount(data.duplicates || 0);
                setTotalGenerated(data.generated || 0);
                setRequestedCount(data.requested || count);
            } else {
                setError(data.message || 'Üretim sırasında hata oluştu');
            }
        } catch (err: any) {
            setError(err.message || 'Bağlantı hatası');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 sm:p-10 shadow-2xl shadow-purple-900/10">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full mb-4">
                    <span className="text-xl">🤖</span>
                    <span className="text-purple-400 font-medium text-sm">GPT-4o-mini</span>
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">LLM ile Pattern Üretimi</h2>
                <p className="text-sm text-gray-500">
                    OpenAI GPT-4o-mini kullanarak otomatik pattern üretin ve veritabanına kaydedin.
                </p>
            </div>

            {/* Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Type Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                        Tip Seçimi
                    </label>
                    <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-purple-500 focus:outline-none transition-colors"
                    >
                        {PATTERN_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                                {type.icon} {type.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Count Input */}
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                        Adet
                    </label>
                    <input
                        type="text"
                        value={countInput}
                        onChange={(e) => setCountInput(e.target.value)}
                        placeholder="Örn: 100, 500, 1000"
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-purple-500 focus:outline-none transition-colors"
                    />
                </div>
            </div>

            {/* Generate Button */}
            <div className="flex justify-center mb-6">
                <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                >
                    {loading ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                            <span>Üretiliyor... (Batch işleniyor)</span>
                        </>
                    ) : (
                        <>
                            <span className="text-xl">✨</span>
                            <span>Pattern Üret</span>
                        </>
                    )}
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
                    <p className="text-red-400 text-center">{error}</p>
                </div>
            )}

            {/* Usage Stats */}
            {usageStats && (
                <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-6 mb-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <span>📊</span> İşlem İstatistikleri
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-indigo-400">{usageStats.inputTokens.toLocaleString()}</div>
                            <div className="text-xs text-gray-500 mt-1">Input Tokens</div>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-purple-400">{usageStats.outputTokens.toLocaleString()}</div>
                            <div className="text-xs text-gray-500 mt-1">Output Tokens</div>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-pink-400">{usageStats.totalTokens.toLocaleString()}</div>
                            <div className="text-xs text-gray-500 mt-1">Toplam Tokens</div>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                            <div className="text-2xl font-bold text-green-400">${usageStats.estimatedCost}</div>
                            <div className="text-xs text-gray-500 mt-1">Tahmini Maliyet</div>
                        </div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-4 md:gap-8 mt-4 text-sm text-gray-400">
                        <span>⏱️ {(usageStats.processingTimeMs / 1000).toFixed(1)}s</span>
                        <span>🤖 {usageStats.model}</span>
                        {usageStats.batches && <span>📦 {usageStats.batches} batch</span>}
                        <span>🎯 {totalGenerated}/{requestedCount} üretildi</span>
                        <span>✅ {insertedCount} eklendi</span>
                        <span>⏭️ {duplicateCount} duplicate</span>
                    </div>
                </div>
            )}

            {/* Generated Patterns */}
            {generatedPatterns.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <span>📚</span> Üretilen Patternler ({generatedPatterns.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2">
                        {generatedPatterns.map((pattern, index) => (
                            <div
                                key={index}
                                className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 hover:border-purple-500/50 transition-colors"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="text-white font-medium">{pattern.text}</div>
                                    {pattern.level && (
                                        <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-lg">
                                            {pattern.level}
                                        </span>
                                    )}
                                </div>
                                <div className="text-sm text-indigo-400 mb-2">{pattern.translation}</div>
                                <div className="text-xs text-gray-500 mb-3">{pattern.explanation}</div>
                                {pattern.example_text && (
                                    <div className="text-xs bg-gray-900/50 rounded-lg p-3">
                                        <div className="text-gray-300 mb-1">📝 {pattern.example_text}</div>
                                        <div className="text-gray-500">{pattern.example_translation}</div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
