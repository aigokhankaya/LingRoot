'use client';

import React, { useEffect, useState } from 'react';

interface Voice {
  name: string;
  displayName?: string;
  gender?: string;
  languageCode?: string;
  ssmlSupport?: boolean;
}

export default function AdminTtsTestPage() {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [text, setText] = useState<string>('This is a test sentence for Google TTS.');
  const [rate, setRate] = useState<number>(1.0);
  const [level, setLevel] = useState<string>('B1');
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<{ time: string; voice: string; message: string }[]>([]);
  const [resultUrl, setResultUrl] = useState<string>('');

  useEffect(() => {
    const loadVoices = async () => {
      try {
        const res = await fetch('/api/tts/voices');
        const data = await res.json();
        const vs: Voice[] = data?.voices || data?.data?.voices || [];
        setVoices(vs);
        if (vs.length > 0) setSelectedVoice(vs[0].name);
      } catch (e) {
        setErrors((prev) => [...prev, { time: new Date().toISOString(), voice: '-', message: 'Voices could not be loaded' }]);
      }
    };
    loadVoices();
  }, []);

  const runTest = async () => {
    setLoading(true);
    setErrors([]);
    setResultUrl('');
    try {
      // 1) Diagnostic: chunk-level synth to surface errors/fallbacks
      try {
        const diagRes = await fetch('/api/tts/synthesizeChunk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice: selectedVoice, rate })
        });
        if (!diagRes.ok) {
          let errMsg = `HTTP ${diagRes.status}`;
          try {
            const errJson = await diagRes.json();
            errMsg += errJson?.error ? `: ${errJson.error}` : '';
          } catch {
            const errText = await diagRes.text();
            errMsg += `: ${errText}`;
          }
          setErrors(prev => [...prev, { time: new Date().toISOString(), voice: selectedVoice, message: errMsg }]);
        } else {
          const diagData = await diagRes.json();
          if (diagData?.fallbackUsed) {
            setErrors(prev => [...prev, { time: new Date().toISOString(), voice: selectedVoice, message: 'SSML not supported or incompatible. Fallback (plain text) used.' }]);
          }
          if (diagData?.timingQuality && typeof diagData.timingQuality.markAccuracy === 'number') {
            const acc = Number(diagData.timingQuality.markAccuracy).toFixed(1);
            if (Number(acc) < 100) {
              setErrors(prev => [...prev, { time: new Date().toISOString(), voice: selectedVoice, message: `Timing accuracy ${acc}% (marks ${diagData.timingQuality.totalMarks}/${diagData.timingQuality.totalWords}).` }]);
            }
          }
        }
      } catch (e: any) {
        setErrors(prev => [...prev, { time: new Date().toISOString(), voice: selectedVoice, message: e?.message || 'Diagnostic synth failed' }]);
      }

      // 2) Full pipeline for playable audio
      const body = {
        type: 'text',
        input: text,
        level,
        speakingRate: rate,
        voice: selectedVoice,
      };
      const res = await fetch('/api/tts/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const j = await res.json();
          msg += j?.message ? `: ${j.message}` : (j?.error ? `: ${j.error}` : '');
        } catch {
          const errText = await res.text();
          msg += `: ${errText}`;
        }
        setErrors((prev) => [...prev, { time: new Date().toISOString(), voice: selectedVoice, message: msg }]);
        return;
      }
      const data = await res.json();
      if (!data?.success || !data?.mp3_url) {
        setErrors((prev) => [...prev, { time: new Date().toISOString(), voice: selectedVoice, message: data?.message || 'Unknown error' }]);
        return;
      }
      setResultUrl(data.mp3_url);
    } catch (e: any) {
      setErrors((prev) => [...prev, { time: new Date().toISOString(), voice: selectedVoice, message: e?.message || 'Unexpected error' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Google TTS Test</h1>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Ses Modeli</label>
        <select
          className="w-full border rounded p-2"
          value={selectedVoice}
          onChange={(e) => setSelectedVoice(e.target.value)}
        >
          {voices.map((v) => (
            <option key={v.name} value={v.name}>
              {v.name} {v.displayName ? `- ${v.displayName}` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Metin</label>
        <textarea
          className="w-full border rounded p-2 min-h-[120px]"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Konuşma Hızı</label>
          <input
            className="w-full border rounded p-2"
            type="number"
            step="0.1"
            min="0.5"
            max="2.0"
            value={rate}
            onChange={(e) => setRate(parseFloat(e.target.value || '1.0'))}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Seviye (CEFR)</label>
          <select className="w-full border rounded p-2" value={level} onChange={(e) => setLevel(e.target.value)}>
            {['A1','A2','B1','B2','C1','C2'].map((lv) => (
              <option key={lv} value={lv}>{lv}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={runTest}
        disabled={loading}
        className={`px-4 py-2 rounded text-white ${loading ? 'bg-gray-400' : 'bg-primary hover:bg-primary/90'}`}
      >
        {loading ? 'Çalışıyor...' : 'Testi Çalıştır'}
      </button>

      {resultUrl && (
        <div className="mt-6">
          <h2 className="font-semibold mb-2">Sonuç</h2>
          <audio controls src={resultUrl} className="w-full" />
          <div className="text-sm text-gray-600 break-all mt-2">{resultUrl}</div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="mt-6">
          <h2 className="font-semibold mb-2">Hatalar</h2>
          <ul className="space-y-2 text-sm text-red-600">
            {errors.map((e, idx) => (
              <li key={idx} className="border rounded p-2">
                <div><strong>Zaman:</strong> {e.time}</div>
                <div><strong>Model:</strong> {e.voice}</div>
                <div><strong>Hata:</strong> {e.message}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}


