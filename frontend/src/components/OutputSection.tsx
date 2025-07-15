import React from 'react';
import NewSyncedTextPlayer from './NewSyncedTextPlayer';

interface TtsResponseData {
  success?: boolean;
  message: string;
  mp3_url?: string;
  vtt_url?: string;
  adapted_text?: string;
  words?: string[];
  timepoints?: Array<{
    timeSeconds: number;
    endTimeSeconds?: number;
    word?: string;
    markName?: string;
  }>;
  speaking_rate?: number;
  level?: string;
  original_turkish?: string;
  translated_text?: string;
  translatedText?: string;
  adaptedText?: string;
  processing_duration?: number;
  estimated_cost?: number;
  voice?: string;
}

interface OutputSectionProps {
  audioResult: TtsResponseData;
  isLoggedIn: boolean;
}

export default function OutputSection({ audioResult, isLoggedIn }: OutputSectionProps) {
  // DEBUG: Log what OutputSection receives
  console.log('🔧 [OUTPUT SECTION DEBUG] Received audioResult:', {
    hasAudioResult: !!audioResult,
    audioResultType: typeof audioResult,
    hasMp3Url: !!audioResult?.mp3_url,
    mp3UrlValue: audioResult?.mp3_url,
    firstValidationResult: !!(audioResult && audioResult.mp3_url),
    secondValidationResult: !!audioResult?.mp3_url,
    allKeys: audioResult ? Object.keys(audioResult) : 'NO_OBJECT'
  });
  
  // URL conversion for different environments
  const convertToPlayableUrl = (url: string): string => {
    if (!url) return '';
    
    // Already a full URL (http/https)
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // Backend relative path - convert to full URL
    const backendBaseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://lingroot-backend.onrender.com'  // Production backend URL
      : 'http://localhost:3001';  // Local development URL
    
    // Remove leading slash if exists to avoid double slashes
    const cleanPath = url.startsWith('/') ? url.slice(1) : url;
    
    return `${backendBaseUrl}/${cleanPath}`;
  };

  if (!audioResult || !audioResult.mp3_url) {
    return (
      <div className="text-center p-8">
        <div className="text-red-600">
          <i className="fas fa-exclamation-triangle text-2xl mb-2"></i>
          <p>Audio oluşturulamadı. Lütfen tekrar deneyin.</p>
          {audioResult?.message && (
            <p className="text-sm mt-2 text-gray-600">{audioResult.message}</p>
          )}
        </div>
      </div>
    );
  }

  if (!audioResult.mp3_url) {
    return (
      <div className="text-center p-8">
        <div className="text-yellow-600">
          <i className="fas fa-clock text-2xl mb-2"></i>
          <p>Audio henüz hazır değil. Lütfen bekleyin...</p>
        </div>
      </div>
    );
  }

  const playableAudioUrl = convertToPlayableUrl(audioResult.mp3_url);
  const playableVttUrl = audioResult.vtt_url ? convertToPlayableUrl(audioResult.vtt_url) : undefined;

  console.log('🎯 [RENDER DEBUG] About to render OutputSection main content:', {
    playableAudioUrl,
    playableVttUrl,
    hasMessage: !!audioResult.message,
    hasWords: !!audioResult.words,
    wordsLength: audioResult.words?.length
  });

  return (
    <div className="w-full max-w-6xl mx-auto mt-8">
      {/* Processing Info - GİZLENDİ */}
      {/* GIZLENDI - Audio başarıyla oluşturuldu yazısı ve altındaki Ses Varsayılan yazısı kaldırılacak. Hız ve Seviye bilgisi kalacak */}

      {/* NEW Synchronized Text Player - Using the new architecture */}
      <div className="mb-6">
        {/* GIZLENDI - Hassas Senkronizasyon ve Web Audio API + Binary Search yazısı kaldırılacak */}
        
        {(() => {
          const playerProps = {
            audioUrl: playableAudioUrl,
            words: audioResult.words || [],
            timepoints: audioResult.timepoints || [],
            originalText: audioResult.message,
            className: "",
            showControls: true,
            level: audioResult.level,
            originalTurkish: audioResult.original_turkish,
            downloadUrls: {
            mp3: playableAudioUrl,
            vtt: playableVttUrl
            },
            stats: {
            wordsCount: audioResult.words?.length,
            timepointsCount: audioResult.timepoints?.length
            }
          };
          
          console.log('🎵 [PLAYER DEBUG] About to render NewSyncedTextPlayer with:', {
            audioUrl: playerProps.audioUrl,
            wordsLength: playerProps.words.length,
            timepointsLength: playerProps.timepoints.length,
            hasOriginalText: !!playerProps.originalText,
            originalTextLength: playerProps.originalText?.length || 0,
            showControls: playerProps.showControls
          });
          
          return (
            <NewSyncedTextPlayer
              audioUrl={playerProps.audioUrl}
              words={playerProps.words}
              timepoints={playerProps.timepoints}
              originalText={playerProps.originalText}
              className={playerProps.className}
              showControls={playerProps.showControls}
              level={playerProps.level}
              originalTurkish={playerProps.originalTurkish}
              downloadUrls={playerProps.downloadUrls}
              stats={playerProps.stats}
        />
          );
        })()}
      </div>

      {/* Text Processing Results */}
      {(audioResult.adapted_text || audioResult.adaptedText || audioResult.translated_text || audioResult.translatedText) && (
        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
            📝 Metin İşleme Sonuçları
          </h3>
          
          {/* Adapted Text */}
          {(audioResult.adapted_text || audioResult.adaptedText) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2 flex items-center">
                <i className="fas fa-adjust mr-2"></i>
                Seviyeye Uyarlanmış Metin ({audioResult.level || 'Auto'})
              </h4>
              <div className="text-blue-700 leading-relaxed">
                {audioResult.adapted_text || audioResult.adaptedText}
              </div>
            </div>
          )}

          {/* Translated Text */}
          {(audioResult.translated_text || audioResult.translatedText) && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2 flex items-center">
                <i className="fas fa-language mr-2"></i>
                İngilizce Çeviri
              </h4>
              <div className="text-green-700 leading-relaxed">
                {audioResult.translated_text || audioResult.translatedText}
              </div>
            </div>
          )}

          {/* Original Turkish */}
          {audioResult.original_turkish && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-2 flex items-center">
                <i className="fas fa-file-text mr-2"></i>
                Orijinal Türkçe Metin
              </h4>
              <div className="text-gray-700 leading-relaxed">
                {audioResult.original_turkish}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Architecture Comparison - GİZLENDİ */}
      {/* GIZLENDI - Yeni Senkronizasyon Mimarisi başlıklı alanı kaldır */}
    </div>
  );
} 