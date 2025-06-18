import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/auth';
import { API_BASE_URL } from '../lib/api';
import SyncedTextPlayer from './SyncedTextPlayer';

interface Timepoint {
  timeSeconds: number;
  endTimeSeconds?: number;
  word?: string;
}

interface AudioResult {
  message: string;
  mp3_url: string;
  vtt_url: string;
  level: string;
  timepoints?: Timepoint[];
  words?: string[];
  original_turkish?: string;
  speaking_rate?: number; // Konuşma hızı bilgisi eklendi
}

interface OutputSectionProps {
  audioResult?: AudioResult | null;
  isLoggedIn: boolean;
}

export default function OutputSection({ audioResult, isLoggedIn }: OutputSectionProps) {
  const { user } = useAuth();
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string>('');

  const convertToPlayableUrl = (url: string): string => {
    if (!url) return '';
    
    console.log("🔄 Converting URL:", url);
    
    try {
      // TTS audio URL'leri için /api prefix'i ekle
      if (url.startsWith('/tts/')) {
        url = `/api${url}`;
        console.log("✅ Added /api prefix to TTS URL:", url);
      }
      
      // API yolu kontrolü
      if (url.startsWith('/api/')) {
        // Development ortamında
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
          const finalUrl = `http://localhost:5001${url}`;
          console.log("🏠 Local development URL:", finalUrl);
          return finalUrl;
        }
        
        // Production ortamında
        if (typeof window !== 'undefined' && window.location.hostname.includes('lingroot.com')) {
          const finalUrl = `https://lingloops-backend.onrender.com${url}`;
          console.log("🌐 Production URL:", finalUrl);
          return finalUrl;
        }
        
        console.log("📍 Using relative path:", url);
        return url;
      }
      
      // Tam URL kontrolü
      if (url.startsWith('https://')) {
        console.log("🔗 Full HTTPS URL:", url);
        return url;
      }
      
      console.log("❓ Unknown URL format:", url);
      return url;
    } catch (error) {
      console.error("❌ URL dönüştürme hatası:", url, error);
      return url;
    }
  };

  // Audio URL'ini güncelle
  useEffect(() => {
    if (audioResult?.mp3_url) {
      const playableUrl = convertToPlayableUrl(audioResult.mp3_url);
      setCurrentAudioUrl(playableUrl);
    }
  }, [audioResult?.mp3_url]);

  if (!audioResult) {
    return null;
  }

  const playableAudioUrl = currentAudioUrl;
  const playableVttUrl = audioResult.vtt_url ? convertToPlayableUrl(audioResult.vtt_url) : undefined;

  return (
    <div className="w-full max-w-6xl mx-auto mt-8">
      {/* Synchronized Text Player - Tek alan */}
      <SyncedTextPlayer
        audioUrl={playableAudioUrl}
        vttUrl={playableVttUrl}
        words={audioResult.words || []}
        timepoints={audioResult.timepoints || []}
        originalText={audioResult.message}
        speakingRate={audioResult.speaking_rate || 1.0}
        className=""
        showControls={true}
        autoHighlight={true}
        level={audioResult.level}
        originalTurkish={audioResult.original_turkish}
        downloadUrls={{
          mp3: playableAudioUrl,
          vtt: playableVttUrl
        }}
        stats={{
          wordsCount: audioResult.words?.length,
          timepointsCount: audioResult.timepoints?.length
        }}
      />
    </div>
  );
} 