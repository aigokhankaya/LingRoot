import React, { useState } from 'react';
import SyncedTextPlayer from '../src/components/SyncedTextPlayer';

// Test verileri
const testData = {
  audioUrl: "https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3",
  originalText: "This is a sample English text for testing purposes with multiple words to demonstrate the word-level highlighting feature during audio playback.",
  words: ["This", "is", "a", "sample", "English", "text", "for", "testing", "purposes", "with", "multiple", "words", "to", "demonstrate", "the", "word-level", "highlighting", "feature", "during", "audio", "playback."],
  timepoints: [
    { timeSeconds: 0.0 },
    { timeSeconds: 0.5 },
    { timeSeconds: 1.0 },
    { timeSeconds: 1.5 },
    { timeSeconds: 2.0 },
    { timeSeconds: 2.5 },
    { timeSeconds: 3.0 },
    { timeSeconds: 3.5 },
    { timeSeconds: 4.0 },
    { timeSeconds: 4.5 },
    { timeSeconds: 5.0 },
    { timeSeconds: 5.5 },
    { timeSeconds: 6.0 },
    { timeSeconds: 6.5 },
    { timeSeconds: 7.0 },
    { timeSeconds: 7.5 },
    { timeSeconds: 8.0 },
    { timeSeconds: 8.5 },
    { timeSeconds: 9.0 },
    { timeSeconds: 9.5 },
    { timeSeconds: 10.0 }
  ]
};

export default function TestSyncedPlayer() {
  const [selectedRate, setSelectedRate] = useState(1.0);
  const [showControls, setShowControls] = useState(true);
  const [autoHighlight, setAutoHighlight] = useState(true);

  const rateOptions = [
    { value: 0.7, label: '0.7x (Yavaş)' },
    { value: 0.8, label: '0.8x (Biraz Yavaş)' },
    { value: 1.0, label: '1x (Normal)' },
    { value: 1.2, label: '1.2x (Hızlı)' },
    { value: 1.5, label: '1.5x (Çok Hızlı)' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            🎵 Reusable SyncedTextPlayer Test
          </h1>
          <p className="text-gray-600 leading-relaxed">
            Bu sayfa, yeni oluşturulan reusable <code className="bg-gray-200 px-2 py-1 rounded">SyncedTextPlayer</code> component'ini test etmek için oluşturulmuştur. 
            Farklı konuşma hızları ve ayarlarla test edebilirsiniz.
          </p>
        </div>

        {/* Configuration Panel */}
        <div className="bg-white rounded-lg shadow-lg border p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            ⚙️ Test Ayarları
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Speaking Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Konuşma Hızı
              </label>
              <select
                value={selectedRate}
                onChange={(e) => setSelectedRate(parseFloat(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              >
                {rateOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Show Controls */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kontroller
              </label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showControls"
                  checked={showControls}
                  onChange={(e) => setShowControls(e.target.checked)}
                  className="mr-2 rounded"
                />
                <label htmlFor="showControls" className="text-sm text-gray-600">
                  Audio kontrollerini göster
                </label>
              </div>
            </div>

            {/* Auto Highlight */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Otomatik Vurgulama
              </label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoHighlight"
                  checked={autoHighlight}
                  onChange={(e) => setAutoHighlight(e.target.checked)}
                  className="mr-2 rounded"
                />
                <label htmlFor="autoHighlight" className="text-sm text-gray-600">
                  Kelime vurgulamayı aç
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Test Data Info */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-primary mb-2">
            📊 Test Verileri
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-primary/80">Toplam Kelime:</span>
              <span className="ml-2 text-primary">{testData.words.length}</span>
            </div>
            <div>
              <span className="font-medium text-primary/80">Timing Points:</span>
              <span className="ml-2 text-primary">{testData.timepoints.length}</span>
            </div>
            <div>
              <span className="font-medium text-primary/80">Audio Süresi:</span>
              <span className="ml-2 text-primary">~10 saniye</span>
            </div>
          </div>
        </div>

        {/* SyncedTextPlayer Component */}
        <div className="bg-white rounded-lg shadow-lg border p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            🎵 SyncedTextPlayer Component
          </h2>
          
          <SyncedTextPlayer
            audioUrl={testData.audioUrl}
            vttUrl={undefined} // VTT test etmek için URL eklenebilir
            words={testData.words}
            timepoints={testData.timepoints}
            originalText={testData.originalText}
            speakingRate={selectedRate}
            className="border rounded-lg p-4 bg-gray-50"
            showControls={showControls}
            autoHighlight={autoHighlight}
          />
        </div>

        {/* Component Usage Info */}
        <div className="mt-8 bg-gray-100 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            💻 Component Kullanımı
          </h3>
          <pre className="bg-gray-800 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
{`import SyncedTextPlayer from '../src/components/SyncedTextPlayer';

<SyncedTextPlayer
  audioUrl="https://example.com/audio.mp3"
  vttUrl="https://example.com/subtitles.vtt" // Opsiyonel
  words={["kelime", "listesi"]}
  timepoints={[{timeSeconds: 0.0}, {timeSeconds: 1.0}]}
  originalText="Orijinal metin içeriği"
  speakingRate={${selectedRate}} // Konuşma hızı
  className="custom-class" // Opsiyonel CSS sınıfı
  showControls={${showControls}} // Audio kontrollerini göster/gizle
  autoHighlight={${autoHighlight}} // Otomatik kelime vurgulamayı aç/kapat
/>`}
          </pre>
        </div>

        {/* Features List */}
        <div className="mt-8 bg-white rounded-lg shadow border p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            ✨ Component Özellikleri
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                Gerçek zamanlı kelime vurgulama
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                Farklı konuşma hızları desteği
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                VTT subtitle dosyası desteği
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                Backend timing points entegrasyonu
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                Adaptive learning sistemi
              </li>
            </ul>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center">
                <span className="w-2 h-2 bg-primary rounded-full mr-3"></span>
                Kelimeye tıklayarak atlama
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-primary rounded-full mr-3"></span>
                Audio seek ve kontrol desteği
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-primary rounded-full mr-3"></span>
                Çoklu timing metodu (VTT/Backend/Adaptive/Linear)
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-primary rounded-full mr-3"></span>
                Development debug bilgileri
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-primary rounded-full mr-3"></span>
                Tamamen reusable ve customizable
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 