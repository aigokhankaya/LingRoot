import React, { useState } from 'react';
// import { synthesizeChunkWithTimepoints } from '../../src/lib/ttsDevUtils';

// Örnek stub fonksiyon (gerçek API ile değiştirin)
async function synthesizeChunkWithTimepoints(text: string, voice: string, rate: number) {
  // Gerçek TTS API çağrısı burada olmalı
  return { audioUrl: 'https://dummy-audio-url.com/audio.mp3', timepoints: [0, 1, 2] };
}

const API_URL = '/api/tts/synthesizeChunk';

const SynthesizeChunkPage = () => {
  const [input, setInput] = useState('');
  const [voice, setVoice] = useState('default');
  const [rate, setRate] = useState(1);
  const [output, setOutput] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSynthesize = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input, voice, rate }),
      });
      if (!res.ok) throw new Error('API hatası');
      const data = await res.json();
      setOutput(data);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <h2>TTS ile Ses Oluştur</h2>
      <textarea value={input} onChange={e => setInput(e.target.value)} />
      <select value={voice} onChange={e => setVoice(e.target.value)}>
        <option value="default">Default</option>
        <option value="male">Erkek</option>
        <option value="female">Kadın</option>
      </select>
      <input type="number" value={rate} onChange={e => setRate(Number(e.target.value))} step="0.1" min="0.5" max="1.5" />
      <button onClick={handleSynthesize} disabled={loading}>Ses Oluştur</button>
      {error && <div style={{color:'red'}}>{error}</div>}
      <pre>{JSON.stringify(output, null, 2)}</pre>
    </div>
  );
};

export default SynthesizeChunkPage; 