import React, { useState } from 'react';
import { GetStaticProps } from 'next';
import Link from 'next/link';
import SyncedTextPlayer from '../src/components/SyncedTextPlayer';
import NewSyncedTextPlayer from '../src/components/NewSyncedTextPlayer';

// Test data
const MOCK_AUDIO_RESULT = {
  success: true,
  message: "Hello everyone. Welcome to our English learning platform. Today we are going to practice pronunciation and vocabulary. Please listen carefully and repeat after me. This is a wonderful opportunity to improve your English skills.",
  audio_url: "https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Sevish_-__nbsp_.mp3", // Public test audio
  words: [
    "Hello", "everyone.", "Welcome", "to", "our", "English", "learning", "platform.",
    "Today", "we", "are", "going", "to", "practice", "pronunciation", "and", "vocabulary.",
    "Please", "listen", "carefully", "and", "repeat", "after", "me.",
    "This", "is", "a", "wonderful", "opportunity", "to", "improve", "your", "English", "skills."
  ],
  timepoints: [
    { timeSeconds: 0.0, endTimeSeconds: 0.5, word: "Hello" },
    { timeSeconds: 0.5, endTimeSeconds: 1.2, word: "everyone." },
    { timeSeconds: 1.2, endTimeSeconds: 1.8, word: "Welcome" },
    { timeSeconds: 1.8, endTimeSeconds: 2.0, word: "to" },
    { timeSeconds: 2.0, endTimeSeconds: 2.3, word: "our" },
    { timeSeconds: 2.3, endTimeSeconds: 2.9, word: "English" },
    { timeSeconds: 2.9, endTimeSeconds: 3.5, word: "learning" },
    { timeSeconds: 3.5, endTimeSeconds: 4.2, word: "platform." },
    { timeSeconds: 4.2, endTimeSeconds: 4.7, word: "Today" },
    { timeSeconds: 4.7, endTimeSeconds: 4.9, word: "we" },
    { timeSeconds: 4.9, endTimeSeconds: 5.1, word: "are" },
    { timeSeconds: 5.1, endTimeSeconds: 5.4, word: "going" },
    { timeSeconds: 5.4, endTimeSeconds: 5.6, word: "to" },
    { timeSeconds: 5.6, endTimeSeconds: 6.2, word: "practice" },
    { timeSeconds: 6.2, endTimeSeconds: 7.0, word: "pronunciation" },
    { timeSeconds: 7.0, endTimeSeconds: 7.2, word: "and" },
    { timeSeconds: 7.2, endTimeSeconds: 8.0, word: "vocabulary." },
    { timeSeconds: 8.0, endTimeSeconds: 8.5, word: "Please" },
    { timeSeconds: 8.5, endTimeSeconds: 9.0, word: "listen" },
    { timeSeconds: 9.0, endTimeSeconds: 9.7, word: "carefully" },
    { timeSeconds: 9.7, endTimeSeconds: 9.9, word: "and" },
    { timeSeconds: 9.9, endTimeSeconds: 10.4, word: "repeat" },
    { timeSeconds: 10.4, endTimeSeconds: 10.7, word: "after" },
    { timeSeconds: 10.7, endTimeSeconds: 11.0, word: "me." },
    { timeSeconds: 11.0, endTimeSeconds: 11.3, word: "This" },
    { timeSeconds: 11.3, endTimeSeconds: 11.5, word: "is" },
    { timeSeconds: 11.5, endTimeSeconds: 11.6, word: "a" },
    { timeSeconds: 11.6, endTimeSeconds: 12.3, word: "wonderful" },
    { timeSeconds: 12.3, endTimeSeconds: 13.0, word: "opportunity" },
    { timeSeconds: 13.0, endTimeSeconds: 13.2, word: "to" },
    { timeSeconds: 13.2, endTimeSeconds: 13.8, word: "improve" },
    { timeSeconds: 13.8, endTimeSeconds: 14.0, word: "your" },
    { timeSeconds: 14.0, endTimeSeconds: 14.5, word: "English" },
    { timeSeconds: 14.5, endTimeSeconds: 15.0, word: "skills." }
  ],
  speaking_rate: 1.0,
  level: "B1",
  processing_duration: 2.34,
  estimated_cost: 0.0045,
  voice: "en-US-Standard-J"
};

export default function SyncComparisonPage() {
  const [selectedSystem, setSelectedSystem] = useState<'old' | 'new' | 'both'>('both');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                🎯 Senkronizasyon Mimarisi Karşılaştırması
              </h1>
              <p className="mt-2 text-gray-600">
                Eski timeupdate tabanlı sistem vs. Yeni Web Audio API mimarisi
              </p>
            </div>

            {/* System Selector */}
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Gösterim:</label>
              <select
                value={selectedSystem}
                onChange={(e) => setSelectedSystem(e.target.value as 'old' | 'new' | 'both')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              >
                <option value="both">Her İkisi de</option>
                <option value="old">Sadece Eski Sistem</option>
                <option value="new">Sadece Yeni Sistem</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Architecture Comparison */}
        <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Old System Info */}
          {(selectedSystem === 'old' || selectedSystem === 'both') && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-800 mb-4 flex items-center">
                <i className="fas fa-exclamation-triangle mr-2"></i>
                Eski Sistem (Problemli)
              </h3>
              <ul className="space-y-2 text-sm text-red-700">
                <li>• <strong>timeupdate olayı:</strong> 4-66Hz değişken frekans</li>
                <li>• <strong>Tolerance tabanlı:</strong> 200ms esneklik gerekir</li>
                <li>• <strong>Lineer arama:</strong> O(n) karmaşıklık</li>
                <li>• <strong>Layout shift:</strong> Vurgulama sırasında kayma</li>
                <li>• <strong>Erişilebilirlik:</strong> ARIA desteği eksik</li>
              </ul>
            </div>
          )}

          {/* New System Info */}
          {(selectedSystem === 'new' || selectedSystem === 'both') && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
                <i className="fas fa-check-circle mr-2"></i>
                Yeni Sistem (Çözüm)
              </h3>
              <ul className="space-y-2 text-sm text-green-700">
                <li>• <strong>Web Audio API:</strong> Hassas donanım saati</li>
                <li>• <strong>requestAnimationFrame:</strong> 60+ FPS render</li>
                <li>• <strong>Binary search:</strong> O(log n) verimlilik</li>
                <li>• <strong>Sabit boyutlar:</strong> Layout shift önlendi</li>
                <li>• <strong>ARIA Live Regions:</strong> Tam erişilebilirlik</li>
              </ul>
            </div>
          )}
        </div>

        {/* Performance Metrics */}
        <div className="mb-8 bg-primary/5 border border-primary/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">📊 Performans Metrikleri</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">4-66Hz</div>
              <div className="text-sm text-primary/80">Eski Sistem Frekansı</div>
              <div className="text-xs text-gray-600 mt-1">(Değişken)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">60+ Hz</div>
              <div className="text-sm text-green-700">Yeni Sistem Frekansı</div>
              <div className="text-xs text-gray-600 mt-1">(Sabit)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">O(log n)</div>
              <div className="text-sm text-purple-700">Arama Karmaşıklığı</div>
              <div className="text-xs text-gray-600 mt-1">(vs O(n))</div>
            </div>
          </div>
        </div>

        {/* Test Players */}
        <div className="space-y-8">
          {/* Old System */}
          {(selectedSystem === 'old' || selectedSystem === 'both') && (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-red-600 text-white px-6 py-4">
                <h2 className="text-xl font-semibold flex items-center">
                  <i className="fas fa-clock mr-3"></i>
                  Eski Sistem - timeupdate + Tolerance
                </h2>
                <p className="text-red-100 text-sm mt-1">
                  Gecikme ve titreme sorunu yaşayabilir
                </p>
              </div>
              <div className="p-6">
                <SyncedTextPlayer
                  audioUrl={MOCK_AUDIO_RESULT.audio_url}
                  words={MOCK_AUDIO_RESULT.words}
                  timepoints={MOCK_AUDIO_RESULT.timepoints}
                  originalText={MOCK_AUDIO_RESULT.message}
                  speakingRate={MOCK_AUDIO_RESULT.speaking_rate}
                  className=""
                  showControls={true}
                  autoHighlight={true}
                  level={MOCK_AUDIO_RESULT.level}
                  stats={{
                    wordsCount: MOCK_AUDIO_RESULT.words.length,
                    timepointsCount: MOCK_AUDIO_RESULT.timepoints.length
                  }}
                />
              </div>
            </div>
          )}

          {/* New System */}
          {(selectedSystem === 'new' || selectedSystem === 'both') && (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-green-600 text-white px-6 py-4">
                <h2 className="text-xl font-semibold flex items-center">
                  <i className="fas fa-magic mr-3"></i>
                  Yeni Sistem - Web Audio API + Binary Search
                </h2>
                <p className="text-green-100 text-sm mt-1">
                  Hassas senkronizasyon ve erişilebilirlik
                </p>
              </div>
              <div className="p-6">
                <NewSyncedTextPlayer
                  audioUrl={MOCK_AUDIO_RESULT.audio_url}
                  words={MOCK_AUDIO_RESULT.words}
                  timepoints={MOCK_AUDIO_RESULT.timepoints}
                  originalText={MOCK_AUDIO_RESULT.message}
                  className=""
                  showControls={true}
                  level={MOCK_AUDIO_RESULT.level}
                  stats={{
                    wordsCount: MOCK_AUDIO_RESULT.words.length,
                    timepointsCount: MOCK_AUDIO_RESULT.timepoints.length
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center">
            <i className="fas fa-lightbulb mr-2"></i>
            Test Talimatları
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-yellow-700">
            <div>
              <h4 className="font-medium mb-2">🔍 Gözlemlenecek Farklar:</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>Kelime vurgulama hassasiyeti</li>
                <li>Seekbar kullanımında gecikmeler</li>
                <li>Layout shift davranışı</li>
                <li>Playback hızı değişimlerinde performans</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">🎯 Test Senaryoları:</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>Normal oynatma (1.0x hız)</li>
                <li>Hızlı oynatma (1.5x-2.0x)</li>
                <li>Yavaş oynatma (0.5x-0.75x)</li>
                <li>Seekbar ile atlama</li>
                <li>Kelime tıklama</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link
            href="/welcome"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    </div>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {}
  };
}; 