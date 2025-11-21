'use client';
import React, { useState, ChangeEvent } from 'react';
import { cleanTranscriptWithPrompt } from '../services/cleanTranscriptService';
import { getTtsAudio } from '../services/ttsService';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
type Level = typeof LEVELS[number];

function extractVideoId(url: string): string {
  const match = url.match(/[?&]v=([\w-]+)/);
  return match ? match[1] : '';
}

export default function ProcessInput(): React.ReactElement {
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [rawTranscript, setRawTranscript] = useState<string>('');
  const [cleanedTranscript, setCleanedTranscript] = useState<string>('');
  const [input, setInput] = useState<string>('');
  const [level, setLevel] = useState<Level>('A1');
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 1. YouTube transcript al
  const getTranscript = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    setRawTranscript('');
    setCleanedTranscript('');
    setAudioUrl('');
    try {
      const response = await fetch('http://localhost:8000/scrape-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl })
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Transcript alınamadı');
      }
      const data = await response.json();
      setRawTranscript(data.transcript);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // 2. Transcript temizle (Cümle ve karakter promptu)
  const cleanTranscript = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    setCleanedTranscript('');
    setAudioUrl('');
    try {
      const cleaned = await cleanTranscriptWithPrompt(rawTranscript);
      setCleanedTranscript(cleaned);
      setInput(cleaned);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // 3. Temiz metni TTS'ye gönder
  const getAudio = async (): Promise<void> => {
    if (!(cleanedTranscript || input).trim()) {
      setError('Ses oluşturmak için geçerli bir metin girin veya transcript alın.');
      return;
    }
    setLoading(true);
    setError(null);
    setAudioUrl('');
    try {
      const audio = await getTtsAudio(cleanedTranscript || input, level);
      setAudioUrl(audio);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 space-y-6">
      {/* YouTube Linki ve Transcript */}
      <div>
        <label className="block text-sm font-semibold mb-1">YouTube Linki</label>
        <div className="flex gap-2">
          <input
            type="url"
            className="input-field flex-1 border rounded p-2"
            placeholder="https://www.youtube.com/watch?v=..."
            value={youtubeUrl}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setYoutubeUrl(e.target.value)}
          />
          <button type="button" onClick={getTranscript} className="btn-primary px-4 py-2" disabled={loading}>
            Transcript Al
          </button>
        </div>
        {rawTranscript && (
          <div className="mt-2 p-2 bg-gray-50 border rounded text-xs max-h-32 overflow-auto">
            <b>Ham Transcript:</b> <br />{rawTranscript}
            <button type="button" onClick={cleanTranscript} className="ml-4 btn-secondary px-2 py-1 text-xs">Cümle ve karakter ile Temizle</button>
          </div>
        )}
      </div>
      {/* Temizlenmiş transcript ve TTS */}
      {cleanedTranscript && (
        <div className="mt-2 p-2 bg-primary/5 border border-primary/20 rounded text-sm">
          <b>Temizlenmiş Metin:</b> <br />{cleanedTranscript}
        </div>
      )}
      {/* Manuel metin girişi */}
      <div>
        <label className="block text-sm font-semibold mb-1">Metin veya Link</label>
        <textarea
          className="input-field w-full h-24 resize-y border rounded p-2"
          placeholder="Metin girin veya YouTube/Spotify/Web linki yapıştırın..."
          value={input}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
          required
        />
      </div>
      {/* Seviye seçici */}
      <div>
        <label className="block text-sm font-semibold mb-1">Seviye</label>
        <div className="flex gap-2 flex-wrap">
          {LEVELS.map(l => (
            <button
              type="button"
              key={l}
              className={`px-4 py-2 rounded-lg font-medium border transition-all duration-200 ${level === l ? 'bg-primary/10 text-primary border-primary/40' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}
              onClick={() => setLevel(l)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      {/* Gönder butonu */}
      <div className="flex justify-end">
        <button type="button" onClick={getAudio} disabled={loading} className="btn-primary px-6 py-2 text-base">
          {loading ? 'İşleniyor...' : 'Sese Dönüştür'}
        </button>
      </div>
      {/* Sonuçlar */}
      {error && <div className="mt-4 text-red-600">{error}</div>}
      {audioUrl && (
        <div className="mt-6 space-y-4">
          <audio src={audioUrl} controls className="w-full" />
          <a href={audioUrl} download className="btn-secondary mt-2 inline-block">Sesi İndir</a>
        </div>
      )}
    </div>
  );
} 