import React, { useState } from 'react';
import NewSyncedTextPlayer from './NewSyncedTextPlayer';
import { markTopicAudioListened } from '../lib/api';

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
  topic?: string;
}

interface OutputSectionProps {
  audioResult: TtsResponseData;
  isLoggedIn: boolean;
}


export default function OutputSection({ audioResult, isLoggedIn }: OutputSectionProps) {
  const [showTranslation, setShowTranslation] = useState(false);

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
      : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001');  // Local development URL

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

  return (
    <div className="w-full max-w-6xl mx-auto mt-8 bg-white rounded-lg shadow-lg p-6">
      {/* Header with Topic Info and Toggle */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Konu: <span className="font-medium text-gray-800">{audioResult.topic || 'Günlük Yaşam'}</span></span>
          <span className="text-sm text-gray-600">Seviye: <span className="font-medium text-primary">{audioResult.level || 'A1'}</span></span>
        </div>
        
        {/* Show Original Language Toggle */}
        {(audioResult.translated_text || audioResult.translatedText) && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowTranslation(!showTranslation)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: showTranslation
                  ? 'hsl(var(--primary))'
                  : 'hsl(var(--muted))',
                color: showTranslation
                  ? 'hsl(var(--primary-foreground))'
                  : 'hsl(var(--muted-foreground))'
              }}
            >
              <span>Show Original Language</span>
              <div 
                className="relative inline-block w-10 h-5 rounded-full transition-colors"
                style={{
                  backgroundColor: showTranslation
                    ? 'hsl(var(--primary-foreground) / 0.35)'
                    : 'hsl(var(--primary) / 0.2)'
                }}
              >
                <div 
                  className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform"
                  style={{ transform: showTranslation ? 'translateX(20px)' : 'translateX(0)' }}
                />
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Podcast Dialogue View (if message is dialogue-style transcript) */}
      {audioResult.message && /Speaker\s+[AB]:/i.test(audioResult.message) && (
        <div className="mb-6 space-y-3">
          {audioResult.message
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map((line, index) => {
              const match = line.match(/^(Speaker\s+[AB]):\s*(.*)$/i);
              const speakerLabel = match ? match[1] : '';
              const text = match ? match[2] : line;
              const isSpeakerA = /Speaker\s+A/i.test(speakerLabel);

              return (
                <div
                  key={index}
                  className={`flex ${isSpeakerA ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-3xl rounded-2xl px-4 py-2 text-sm shadow-sm border ${
                      isSpeakerA
                        ? 'bg-blue-50 border-blue-100 text-gray-800'
                        : 'bg-green-50 border-green-100 text-gray-800'
                    }`}
                  >
                    {speakerLabel && (
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                        {speakerLabel}
                      </div>
                    )}
                    <div className="leading-relaxed whitespace-pre-wrap">
                      {text}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Text Content Area */}
      {(audioResult.adapted_text || audioResult.adaptedText) && (
        <div className="mb-6">
          <div className={`grid gap-4 ${showTranslation && (audioResult.translated_text || audioResult.translatedText) ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {/* English Column */}
            <div className="bg-gray-50 rounded-lg p-6 relative">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">ENGLISH</h3>
                <button className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                  </svg>
                </button>
              </div>
              <div className="text-gray-800 leading-relaxed" style={{ fontSize: '15px', lineHeight: '1.8' }}>
                {audioResult.adapted_text || audioResult.adaptedText}
              </div>
            </div>

            {/* Turkish Column - Only shown when toggle is active */}
            {showTranslation && (audioResult.translated_text || audioResult.translatedText) && (
              <div className="bg-gray-50 rounded-lg p-6 relative">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">TURKISH</h3>
                  <button className="text-gray-400 hover:text-gray-600 transition-colors">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                    </svg>
                  </button>
                </div>
                <div className="text-gray-800 leading-relaxed" style={{ fontSize: '15px', lineHeight: '1.8' }}>
                  {audioResult.translated_text || audioResult.translatedText}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Audio Player - Moved to bottom */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <NewSyncedTextPlayer
          audioUrl={playableAudioUrl}
          words={audioResult.words || []}
          timepoints={audioResult.timepoints || []}
          originalText={audioResult.message}
          className=""
          showControls={true}
          level={audioResult.level}
          originalTurkish={audioResult.original_turkish}
          topic={audioResult.topic}
          downloadUrls={{
            mp3: playableAudioUrl,
            vtt: playableVttUrl
          }}
          stats={{
            wordsCount: audioResult.words?.length,
            timepointsCount: audioResult.timepoints?.length
          }}
          onPlay={async () => {
            if (!audioResult.mp3_url) return;
            try {
              await markTopicAudioListened(audioResult.mp3_url);
            } catch (e) {
              console.error('markTopicAudioListened error:', e);
            }
          }}
        />
      </div>

      {/* Architecture Comparison - GİZLENDİ */}
      {/* GIZLENDI - Yeni Senkronizasyon Mimarisi başlıklı alanı kaldır */}
    </div>
  );
} 