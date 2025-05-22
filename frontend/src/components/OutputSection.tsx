import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/auth';
import { getContentHistory, getApiUrl, API_BASE_URL } from '../lib/api';

interface Timepoint {
  timeSeconds: number;
}

interface AudioResult {
  message: string;
  mp3_url: string;
  vtt_url: string;
  level: string;
  timepoints?: Timepoint[];
  words?: string[];
  original_turkish?: string;
}

interface ContentHistoryItem {
  id: string;
  input: string;
  level: string;
  created_at: string;
}

interface OutputSectionProps {
  audioResult?: AudioResult | null;
  isLoggedIn: boolean;
  contentHistory?: ContentHistoryItem[];
}

interface SyncedTextPlayerProps {
  audioUrl: string;
  words: string[];
  timepoints: Timepoint[];
}

function SyncedTextPlayer({ audioUrl, words, timepoints }: SyncedTextPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentWord, setCurrentWord] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !timepoints) return;
    const onTimeUpdate = () => {
      const t = audio.currentTime;
      let idx = 0;
      for (let i = 0; i < timepoints.length; i++) {
        if (t >= timepoints[i].timeSeconds) idx = i;
      }
      setCurrentWord(idx);
    };
    audio.addEventListener('timeupdate', onTimeUpdate);
    return () => audio.removeEventListener('timeupdate', onTimeUpdate);
  }, [timepoints]);

  return (
    <div className="mb-4">
      <audio ref={audioRef} src={audioUrl} controls className="w-full" crossOrigin="anonymous" />
      <p className="text-xs text-gray-500 mt-1">Audio URL: {audioUrl}</p>
      <div className="mt-4 text-lg flex flex-wrap gap-1">
        {words.map((word, i) => (
          <span
            key={i}
            style={{ background: i === currentWord ? '#fde68a' : 'transparent', transition: 'background 0.2s', borderRadius: 4, padding: '0 2px' }}
          >
            {word}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function OutputSection({ audioResult, isLoggedIn, contentHistory: propContentHistory }: OutputSectionProps) {
  const { user } = useAuth();
  const [contentHistory, setContentHistory] = useState<ContentHistoryItem[]>(propContentHistory || []);
  const { message, mp3_url, vtt_url, level } = audioResult || {};
  
  console.log("audioResult:", audioResult);
  
  // Convert URL to playable format
  const convertToPlayableUrl = (url: string): string => {
    if (!url) return '';
    
    console.log("Converting URL:", url);
    
    try {
      // API yolu kontrolü
      if (url.startsWith('/api/')) {
        // Development ortamında getApiUrl() fonksiyonunu kullan
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
          // Make sure we don't end up with double slashes in the URL
          const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
          const apiPath = url; // Don't modify the path - keep it as /api/...
          const finalUrl = `${baseUrl}${apiPath}`;
          console.log("Local development URL:", finalUrl);
          return finalUrl;
        }
        
        // Production ortamında (lingroot.com) için
        if (typeof window !== 'undefined' && window.location.hostname.includes('lingroot.com')) {
          // lingloops-backend.onrender.com adresini kullan
          const baseUrl = 'https://lingloops-backend.onrender.com';
          const finalUrl = `${baseUrl}${url}`;
          console.log("Production URL:", finalUrl);
          return finalUrl;
        }
        
        // Diğer ortamlarda göreceli yolu kullan (Next.js API Route)
        console.log("Using relative path:", url);
        return url;
      }
      
      // Tam URL kontrolü (https://)
      if (url.startsWith('https://')) {
        return url;
      }
      
      // Onrender linki direkt içeriyorsa
      if (url.includes('lingloops-backend.onrender.com')) {
        return url;
      }
      
      // Google Drive URL kontrolü
      const gdrive = url.match(/\/file\/d\/([a-zA-Z0-9_-]{25,})/);
      if (gdrive && gdrive[1]) {
        return `https://docs.google.com/uc?export=download&id=${gdrive[1]}`;
      }
      
      // Lokal dosya yollarını direkt kullan
      // Windows'ta dosya yolları formatını düzelt
      if (url.includes(':\\') || url.startsWith('/tmp/') || url.includes('\\Users\\')) {
        return url;
      }
      
      return url;
    } catch (error) {
      console.error("URL dönüştürme hatası:", url, error);
      return url;
    }
  };
  
  // Use prop contentHistory if provided, otherwise fetch from API
  useEffect(() => {
    if (propContentHistory) {
      setContentHistory(propContentHistory);
    } else if (isLoggedIn && !propContentHistory) {
      const fetchHistory = async () => {
        try {
          const response = await getContentHistory();
          if (response.success) {
            setContentHistory(response.data);
          }
        } catch (error) {
          console.error('Error fetching content history:', error);
        }
      };
      
      fetchHistory();
    }
  }, [isLoggedIn, propContentHistory]);

  // If no audio result, show empty state
  if (!audioResult || !mp3_url) {
    return (
      <div className="w-full max-w-3xl mx-auto bg-gray-50 rounded-lg p-8 text-center">
        <div className="text-gray-400 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-700 mb-2">No audio generated yet</h3>
        <p className="text-gray-500">Enter your text and select a level to generate audio</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Audio Player - Render SyncedTextPlayer if possible, else basic audio */}
      {audioResult && Array.isArray(audioResult.timepoints) && audioResult.timepoints.length > 0 &&
       Array.isArray(audioResult.words) && audioResult.words.length > 0 ? (
        <div className="mb-4"> {/* Wrapper for SyncedTextPlayer */}
           <SyncedTextPlayer audioUrl={convertToPlayableUrl(mp3_url)} words={audioResult.words} timepoints={audioResult.timepoints} />
        </div>
      ) : (
         mp3_url && 
         <div className="mb-4">
           <audio 
             src={convertToPlayableUrl(mp3_url)} 
             controls 
             className="w-full" 
             controlsList="nodownload" 
             crossOrigin="anonymous"
             onError={(e) => console.error("Audio yükleme hatası:", e)}
             onLoadStart={() => console.log("Audio yükleniyor...")}
             onCanPlay={() => console.log("Audio çalınmaya hazır")}
             autoPlay={false}
           />
           <p className="text-xs text-gray-500 mt-1">Orijinal URL: {mp3_url}</p>
           <p className="text-xs text-gray-500">Dönüştürülen URL: {convertToPlayableUrl(mp3_url)}</p>
         </div>
      )}
      {/* Altyazı kutusunda highlightlı İngilizce metin */}
      <div className={`w-full rounded-lg p-4 border bg-blue-50 border-blue-200 mb-4`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className={`text-sm font-medium text-blue-800`}>
            English Level: {level || 'Not specified'}
          </h3>
        </div>
        {/* Eğer varsa Türkçe anlatım metni */}
        {audioResult.original_turkish && (
          <div className="mb-4 p-3 rounded bg-yellow-50 border border-yellow-200 text-gray-900 whitespace-pre-line">
            <div className="font-semibold text-yellow-800 mb-1">Türkçe Anlatım:</div>
            {audioResult.original_turkish}
          </div>
        )}
        {/* Çevrilmiş İngilizce metin */}
        <div className="text-base text-gray-800 whitespace-pre-line font-semibold">
          {audioResult.message}
        </div>
      </div>
      {/* History Section (only for logged in users) */}
      {isLoggedIn && contentHistory && contentHistory.length > 0 && (
        <div className="mt-8 border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Recent History</h3>
          <div className="space-y-3">
            {contentHistory.slice(0, 5).map((item) => (
              <div key={item.id} className="p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow cursor-pointer">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-800 font-medium truncate">{item.input}</p>
                    <p className="text-xs text-gray-500 mt-1">Level: {item.level}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {contentHistory.length > 5 && (
            <button className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium">
              View all history
            </button>
          )}
        </div>
      )}
    </div>
  );
} 