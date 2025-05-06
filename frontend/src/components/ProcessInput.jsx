'use client';
import React, { useState } from 'react';
import { fetchYoutubeTranscript } from '../services/transcriptService';
import { cleanTranscriptWithPrompt } from '../services/cleanTranscriptService';
import { getTtsAudio } from '../services/ttsService';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function extractVideoId(url) {
  const match = url.match(/[?&]v=([\w-]+)/);
  return match ? match[1] : '';
}

export default function ProcessInput() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [rawTranscript, setRawTranscript] = useState('');
  const [cleanedTranscript, setCleanedTranscript] = useState('');
  const [input, setInput] = useState('');
  const [level, setLevel] = useState('A1');
  const [audioUrl, setAudioUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 1. YouTube transcript al
  const getTranscript = async () => {
    setLoading(true);
    setError(null);
    setRawTranscript('');
    setCleanedTranscript('');
    setAudioUrl('');
    try {
      const transcript = await fetchYoutubeTranscript(youtubeUrl);
      setRawTranscript(transcript);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Transcript temizle (Cümle ve karakter promptu)
  const cleanTranscript = async () => {
    setLoading(true);
    setError(null);
    setCleanedTranscript('');
    setAudioUrl('');
    try {
      const cleaned = await cleanTranscriptWithPrompt(rawTranscript);
      setCleanedTranscript(cleaned);
      setInput(cleaned);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Temiz metni TTS'ye gönder
  const getAudio = async () => {
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
      setError(err.message);
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
            onChange={e => setYoutubeUrl(e.target.value)}
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
        <div className="mt-2 p-2 bg-blue-50 border rounded text-sm">
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
          onChange={e => setInput(e.target.value)}
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
              className={`px-4 py-2 rounded-lg font-medium border transition-all duration-200 ${level === l ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}
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