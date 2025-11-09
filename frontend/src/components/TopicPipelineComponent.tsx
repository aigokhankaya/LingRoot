import React, { useState } from 'react';

/**
 * Topic Pipeline Component
 * 
 * Demonstrates the complete Topic → Leveled English Text flow:
 * 1. User enters a topic
 * 2. Click "Konu'yu Detaylandır" to get 5 subtopic suggestions
 * 3. Select a subtopic
 * 4. Generate leveled English text (narration → translation → CEFR adaptation)
 */

interface Suggestion {
  text: string;
  selected: boolean;
}

interface PipelineResult {
  topic: string;
  level: string;
  selected_subtopic: string;
  suggestions: string[];
  narration_tr: string;
  translation_en: string;
  adapted_text: string;
  semanticAudit?: {
    semanticScore: number;
    needsRegeneration: boolean;
    recommendation: string;
  };
  usage: {
    suggestions: any;
    narration: any;
    translation: any;
    adaptation: any;
  };
}

export default function TopicPipelineComponent() {
  const [topicInput, setTopicInput] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'>('B1');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSubtopic, setSelectedSubtopic] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [error, setError] = useState('');

  // Get user token from your auth system
  const getUserToken = () => {
    // Replace with your actual auth logic
    return localStorage.getItem('userToken') || '';
  };

  /**
   * Step 1: Get topic suggestions
   */
  const handleTopicSuggestions = async () => {
    if (!topicInput.trim()) {
      setError('Lütfen bir konu girin.');
      return;
    }

    setLoading(true);
    setLoadingStage('Konu önerileri oluşturuluyor...');
    setError('');
    setSuggestions([]);
    setSelectedSubtopic('');
    setResult(null);

    try {
      const response = await fetch('http://localhost:5001/api/topic-pipeline/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getUserToken()}`,
        },
        body: JSON.stringify({
          topic: topicInput,
          level: selectedLevel,
        }),
      });

      const data = await response.json();

      if (data.success && data.data?.suggestions) {
        setSuggestions(data.data.suggestions);
      } else {
        setError(data.message || 'Konu önerileri alınamadı.');
      }
    } catch (err: any) {
      setError(`Hata: ${err.message}`);
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  };

  /**
   * Step 2-5: Complete pipeline (narration → translation → CEFR → post-processing)
   */
  const handleGenerateText = async () => {
    if (!selectedSubtopic && suggestions.length === 0) {
      setError('Lütfen önce konu önerilerini alın.');
      return;
    }

    setLoading(true);
    setLoadingStage('Metin üretiliyor... (Bu 30-60 saniye sürebilir)');
    setError('');
    setResult(null);

    try {
      const response = await fetch('http://localhost:5001/api/topic-pipeline/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getUserToken()}`,
        },
        body: JSON.stringify({
          topic: topicInput,
          level: selectedLevel,
          selected_subtopic: selectedSubtopic || suggestions[0],
        }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        setResult(data.data);
      } else {
        setError(data.message || 'Metin üretilemedi.');
      }
    } catch (err: any) {
      setError(`Hata: ${err.message}`);
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">🎯 Konu → Seviyeli İngilizce Metin</h1>
        <p className="text-gray-600">
          Bir konu girin, alt başlıkları görün, ve CEFR seviyesine uygun İngilizce metin üretin.
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Input Section */}
      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Konu Başlığı
          </label>
          <input
            type="text"
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            placeholder="Örn: Yapay Zeka, Sağlıklı Yaşam, Tarih..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            CEFR Seviyesi
          </label>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value as any)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          >
            <option value="A1">A1 (Beginner)</option>
            <option value="A2">A2 (Elementary)</option>
            <option value="B1">B1 (Intermediate)</option>
            <option value="B2">B2 (Upper Intermediate)</option>
            <option value="C1">C1 (Advanced)</option>
            <option value="C2">C2 (Proficient)</option>
          </select>
        </div>

        <button
          onClick={handleTopicSuggestions}
          disabled={loading || !topicInput.trim()}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {loading && loadingStage.includes('öneri') ? '⏳ Yükleniyor...' : '📝 Konu\'yu Detaylandır'}
        </button>
      </div>

      {/* Suggestions Display */}
      {suggestions.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-bold">Alt Konu Önerileri</h2>
          <p className="text-sm text-gray-600">Bir alt konu seçin ve metin üretimine başlayın:</p>
          
          <div className="grid grid-cols-1 gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => setSelectedSubtopic(suggestion)}
                className={`text-left p-4 rounded-lg border-2 transition-all ${
                  selectedSubtopic === suggestion
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="font-medium">{index + 1}. {suggestion}</div>
              </button>
            ))}
          </div>

          <button
            onClick={handleGenerateText}
            disabled={loading || !selectedSubtopic}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors mt-4"
          >
            {loading && loadingStage.includes('üretiliyor') ? '⏳ ' + loadingStage : '✨ İngilizce Metin Üret'}
          </button>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
          <div className="flex items-center space-x-2">
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{loadingStage}</span>
          </div>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="space-y-4">
          {/* Semantic Audit Warning (A1-A2 only) */}
          {result.semanticAudit && result.semanticAudit.needsRegeneration && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
              <div className="font-semibold">⚠️ Semantik Koruma Uyarısı</div>
              <div className="text-sm mt-1">{result.semanticAudit.recommendation}</div>
              <div className="text-xs mt-2">Skor: {result.semanticAudit.semanticScore}%</div>
            </div>
          )}

          {/* Turkish Narration */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-bold mb-2">📖 Türkçe Anlatım</h3>
            <div className="text-sm text-gray-600 mb-3">
              {result.narration_tr.length} karakter
            </div>
            <div className="prose max-w-none whitespace-pre-wrap">
              {result.narration_tr}
            </div>
          </div>

          {/* English Translation */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-bold mb-2">🌐 İngilizce Çeviri</h3>
            <div className="text-sm text-gray-600 mb-3">
              {result.translation_en.length} karakter
            </div>
            <div className="prose max-w-none whitespace-pre-wrap">
              {result.translation_en}
            </div>
          </div>

          {/* CEFR Adapted Text (Final) */}
          <div className="bg-green-50 border-2 border-green-300 shadow rounded-lg p-6">
            <h3 className="text-lg font-bold mb-2">✨ Seviye {result.level} Metni (Final)</h3>
            <div className="text-sm text-gray-600 mb-3">
              {result.adapted_text.length} karakter
            </div>
            <div className="prose max-w-none whitespace-pre-wrap text-lg leading-relaxed">
              {result.adapted_text}
            </div>
          </div>

          {/* Token Usage Stats */}
          <div className="bg-gray-50 shadow rounded-lg p-6">
            <h3 className="text-lg font-bold mb-3">📊 Token Kullanımı</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {result.usage.narration && (
                <div>
                  <div className="font-semibold text-gray-600">Anlatım</div>
                  <div className="text-2xl font-bold">{result.usage.narration.total_tokens}</div>
                </div>
              )}
              {result.usage.translation && (
                <div>
                  <div className="font-semibold text-gray-600">Çeviri</div>
                  <div className="text-2xl font-bold">{result.usage.translation.total_tokens}</div>
                </div>
              )}
              {result.usage.adaptation && (
                <div>
                  <div className="font-semibold text-gray-600">Adaptasyon</div>
                  <div className="text-2xl font-bold">{result.usage.adaptation.total_tokens}</div>
                </div>
              )}
              <div>
                <div className="font-semibold text-gray-600">Toplam</div>
                <div className="text-2xl font-bold text-blue-600">
                  {(result.usage.narration?.total_tokens || 0) +
                   (result.usage.translation?.total_tokens || 0) +
                   (result.usage.adaptation?.total_tokens || 0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
