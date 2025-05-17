import React, { useState } from 'react';
// import { chunkText } from '../../src/lib/ttsDevUtils';

// Örnek stub fonksiyon (gerçek fonksiyonla değiştirin)
function chunkText(text: string) {
  // Her 20 karakterde bir parça
  const chunks = [];
  for (let i = 0; i < text.length; i += 20) {
    chunks.push(text.slice(i, i + 20));
  }
  return chunks;
}

const API_URL = '/api/tts/chunkText';

const ChunkTextPage = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChunk = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input }),
      });
      if (!res.ok) throw new Error('API hatası');
      const data = await res.json();
      setOutput(data.chunks);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <h2>Metni Parçala</h2>
      <textarea value={input} onChange={e => setInput(e.target.value)} />
      <button onClick={handleChunk} disabled={loading}>Parçala</button>
      {error && <div style={{color:'red'}}>{error}</div>}
      <pre>{JSON.stringify(output, null, 2)}</pre>
    </div>
  );
};

export default ChunkTextPage; 