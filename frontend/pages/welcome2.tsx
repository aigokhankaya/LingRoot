'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../src/lib/auth';
import { useRouter } from 'next/router';
import AudioPlayer from '../src/components/AudioPlayer';
import TtsProviderSettings from '../src/components/admin/TtsProviderSettings';

interface WordTiming {
  word: string;
  timeSeconds: number;
  endTimeSeconds: number;
}

interface TtsResponse {
  success: boolean;
  message: string;
  mp3_url: string;
  vtt_url?: string;
  words?: string[];
  timepoints?: WordTiming[];
  provider?: string;
  timingMethod?: string;
  speaking_rate?: number;
}

const Welcome2: React.FC = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  const [text, setText] = useState<string>('Hello world! This is a test of Text-to-Speech with word highlighting.');
  const [level, setLevel] = useState<string>('B1');
  const [speakingRate, setSpeakingRate] = useState<number>(1.0);
  const [voice, setVoice] = useState<string>('Joanna'); // Default to Polly voice
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [audioResult, setAudioResult] = useState<TtsResponse | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [currentProvider, setCurrentProvider] = useState<string>('polly'); // Default to polly
  const [providerLoading, setProviderLoading] = useState<boolean>(true); // Track provider loading

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch current TTS provider
  useEffect(() => {
    fetchCurrentProvider();
  }, []);

  const fetchCurrentProvider = async () => {
    try {
      setProviderLoading(true);
      const token = localStorage.getItem('lingroot_token');
      if (!token) {
        console.warn('No token found, using default provider');
        setProviderLoading(false);
        return;
      }

      const response = await fetch('/api/admin/settings/tts_provider', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const provider = data.value || 'polly';
        console.log('🔍 Fetched provider from API:', provider); // Debug log
        setCurrentProvider(provider);
        
        // Set default voice based on provider
        if (provider === 'polly') {
          setVoice('Joanna'); // Amazon Polly default
          console.log('✅ Set voice to Joanna for Polly');
        } else if (provider === 'azure') {
          setVoice('en-US-JennyNeural'); // Azure default
          console.log('✅ Set voice to JennyNeural for Azure');
        } else {
          setVoice('en-US-Neural2-C'); // Google default
          console.log('✅ Set voice to Neural2-C for Google');
        }
      }
    } catch (error) {
      console.error('Failed to fetch TTS provider:', error);
    } finally {
      setProviderLoading(false);
    }
  };

  const handleGenerateAudio = async () => {
    if (!text.trim()) {
      setError('Lütfen bir metin girin');
      return;
    }

    const token = localStorage.getItem('lingroot_token');
    if (!token) {
      setError('Oturum açmanız gerekiyor');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAudioResult(null);

    try {
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:5001/api/tts/process'
        : '/api/tts/process';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: 'text',
          input: text,
          level: level,
          speakingRate: speakingRate,
          voice: voice
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ses oluşturulamadı');
      }

      const data: TtsResponse = await response.json();
      
      console.log('🎯 TTS Response:', data);
      console.log('🎯 Words:', data.words?.length);
      console.log('🎯 Timepoints:', data.timepoints?.length);
      
      setAudioResult(data);
    } catch (err: any) {
      console.error('TTS Error:', err);
      setError(err.message || 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const convertToPlayableUrl = (url: string): string => {
    if (!url) return '';
    
    if (url.startsWith('/api/')) {
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        return `http://localhost:5001${url}`;
      }
      if (typeof window !== 'undefined' && window.location.hostname.includes('lingroot.com')) {
        return `https://lingloops-backend.onrender.com${url}`;
      }
    }
    
    return url;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">TTS Demo - Multi Provider</h1>
              <p className="text-sm text-gray-600 mt-1">
                Kelime vurgulama özelliği ile Text-to-Speech testi (Google, Azure, Amazon Polly)
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Provider: <span className="font-semibold text-primary">{currentProvider}</span>
              </div>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                {showSettings ? 'Gizle' : 'Ayarlar'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Input & Settings */}
          <div className="lg:col-span-1 space-y-6">
            {/* TTS Provider Settings */}
            {showSettings && (
              <TtsProviderSettings onProviderChange={(provider) => {
                console.log('🔄 Provider changed to:', provider);
                setCurrentProvider(provider);
                
                // Update voice when provider changes
                if (provider === 'polly') {
                  setVoice('Joanna');
                } else if (provider === 'azure') {
                  setVoice('en-US-JennyNeural');
                } else {
                  setVoice('en-US-Neural2-C');
                }
                
                setShowSettings(false);
              }} />
            )}

            {/* Input Section */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Metin Girişi</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Metin
                  </label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="İngilizce metin girin..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seviye
                  </label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  >
                    <option value="A1">A1 - Başlangıç</option>
                    <option value="A2">A2 - Temel</option>
                    <option value="B1">B1 - Orta</option>
                    <option value="B2">B2 - Orta Üstü</option>
                    <option value="C1">C1 - İleri</option>
                    <option value="C2">C2 - Uzman</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Konuşma Hızı: {speakingRate}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={speakingRate}
                    onChange={(e) => setSpeakingRate(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ses
                  </label>
                  <select
                    value={voice}
                    onChange={(e) => setVoice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  >
                    {currentProvider === 'polly' && (
                      <>
                        <optgroup label="Amazon Polly - US English">
                          <option value="Joanna">Joanna (Female)</option>
                          <option value="Matthew">Matthew (Male)</option>
                          <option value="Ivy">Ivy (Female)</option>
                          <option value="Kevin">Kevin (Male)</option>
                          <option value="Kimberly">Kimberly (Female)</option>
                          <option value="Salli">Salli (Female)</option>
                          <option value="Joey">Joey (Male)</option>
                          <option value="Justin">Justin (Male)</option>
                          <option value="Kendra">Kendra (Female)</option>
                        </optgroup>
                        <optgroup label="Amazon Polly - UK English">
                          <option value="Amy">Amy (Female)</option>
                          <option value="Emma">Emma (Female)</option>
                          <option value="Brian">Brian (Male)</option>
                          <option value="Arthur">Arthur (Male)</option>
                        </optgroup>
                        <optgroup label="Amazon Polly - Other">
                          <option value="Olivia">Olivia (Australian Female)</option>
                          <option value="Kajal">Kajal (Indian Female)</option>
                        </optgroup>
                      </>
                    )}
                    {currentProvider === 'azure' && (
                      <optgroup label="Azure Neural Voices (WordBoundary Events)">
                        <option value="en-US-JennyNeural">Jenny (US Female)</option>
                        <option value="en-US-GuyNeural">Guy (US Male)</option>
                        <option value="en-US-AriaNeural">Aria (US Female)</option>
                        <option value="en-GB-SoniaNeural">Sonia (UK Female)</option>
                        <option value="en-GB-RyanNeural">Ryan (UK Male)</option>
                        <option value="en-GB-LibbyNeural">Libby (UK Female)</option>
                      </optgroup>
                    )}
                    {currentProvider === 'google' && (
                      <optgroup label="Google Neural Voices">
                        <option value="en-US-Neural2-C">US Female (Neural2-C)</option>
                        <option value="en-US-Neural2-D">US Male (Neural2-D)</option>
                        <option value="en-US-Wavenet-F">US Female (Wavenet-F)</option>
                        <option value="en-GB-Neural2-C">UK Female (Neural2-C)</option>
                        <option value="en-GB-Neural2-D">UK Male (Neural2-D)</option>
                      </optgroup>
                    )}
                  </select>
                </div>

                <button
                  onClick={handleGenerateAudio}
                  disabled={isLoading || !text.trim()}
                  className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Ses Oluşturuluyor...
                    </span>
                  ) : (
                    'Ses Oluştur'
                  )}
                </button>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">
                ✨ {currentProvider === 'polly' ? 'Amazon Polly' : currentProvider === 'azure' ? 'Azure TTS' : 'Google TTS'} Aktif
              </h3>
              <ul className="text-sm text-green-800 space-y-1">
                {currentProvider === 'polly' && (
                  <>
                    <li>✓ Speech Marks ile hassas timing</li>
                    <li>✓ Gerçek zamanlı kelime vurgulama</li>
                    <li>✓ Sıfır drift - mükemmel senkronizasyon</li>
                    <li>✓ Neural sesler ile doğal konuşma</li>
                  </>
                )}
                {currentProvider === 'azure' && (
                  <>
                    <li>✓ WordBoundary events ile hassas timing</li>
                    <li>✓ Gerçek zamanlı kelime vurgulama</li>
                    <li>✓ Sıfır drift - mükemmel senkronizasyon</li>
                    <li>✓ Neural sesler ile doğal konuşma</li>
                  </>
                )}
                {currentProvider === 'google' && (
                  <>
                    <li>✓ SSML marks ile hassas timing</li>
                    <li>✓ Gerçek zamanlı kelime vurgulama</li>
                    <li>✓ Optimize edilmiş senkronizasyon</li>
                    <li>✓ Neural sesler ile doğal konuşma</li>
                  </>
                )}
              </ul>
              <div className="mt-3 pt-3 border-t border-green-300">
                <p className="text-xs text-green-700">
                  <strong>Provider:</strong> {currentProvider === 'polly' ? 'Amazon Polly (Speech Marks)' : currentProvider === 'azure' ? 'Azure Cognitive Services (WordBoundary Events)' : 'Google Cloud TTS (SSML Marks)'}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Audio Player & Results */}
          <div className="lg:col-span-2 space-y-6">
            {audioResult && (
              <>
                {/* Audio Player with Word Highlighting */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Ses Oynatıcı</h2>
                    {audioResult.timingMethod && (
                      <span className="text-sm px-3 py-1 bg-green-100 text-green-800 rounded-full">
                        {audioResult.timingMethod}
                      </span>
                    )}
                  </div>
                  
                  <AudioPlayer
                    audioUrl={convertToPlayableUrl(audioResult.mp3_url)}
                    captionsUrl={audioResult.vtt_url ? convertToPlayableUrl(audioResult.vtt_url) : undefined}
                    words={audioResult.words}
                    timepoints={audioResult.timepoints}
                    text={audioResult.message}
                    showWordHighlight={true}
                  />
                </div>

                {/* Debug Info */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-lg font-semibold mb-4">Debug Bilgileri</h2>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium text-gray-600">Provider:</span>
                      <span className="text-gray-900">{currentProvider}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium text-gray-600">Timing Method:</span>
                      <span className="text-gray-900">{audioResult.timingMethod || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium text-gray-600">Kelime Sayısı:</span>
                      <span className="text-gray-900">{audioResult.words?.length || 0}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium text-gray-600">Timepoint Sayısı:</span>
                      <span className="text-gray-900">{audioResult.timepoints?.length || 0}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium text-gray-600">Konuşma Hızı:</span>
                      <span className="text-gray-900">{audioResult.speaking_rate || speakingRate}x</span>
                    </div>
                  </div>

                  {/* Sample Timepoints */}
                  {audioResult.timepoints && audioResult.timepoints.length > 0 && (
                    <div className="mt-4">
                      <h3 className="font-medium text-gray-700 mb-2">İlk 5 Timepoint:</h3>
                      <div className="bg-gray-50 rounded p-3 overflow-x-auto">
                        <pre className="text-xs text-gray-700">
                          {JSON.stringify(audioResult.timepoints.slice(0, 5), null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {!audioResult && !isLoading && (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Henüz ses oluşturulmadı
                </h3>
                <p className="text-gray-600">
                  Sol taraftan metin girin ve "Ses Oluştur" butonuna tıklayın
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Welcome2;
