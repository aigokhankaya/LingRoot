import React, { useState } from 'react';
// import { adaptToCEFR } from '../../src/lib/ttsDevUtils';

// Örnek stub fonksiyon (gerçek API ile değiştirin)
async function adaptToCEFR(text: string, level: string) {
  return { text: `[${level}] ${text}` };
}

const API_URL = '/api/tts/adaptToCEFR';

const AdaptToCEFRPage = () => {
  const [input, setInput] = useState('');
  const [level, setLevel] = useState('A1');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAdapt = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input, level }),
      });
      if (!res.ok) throw new Error('API hatası');
      const data = await res.json();
      setOutput(data.text);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <h2>CEFR Seviyesine Dönüştür</h2>
      <textarea value={input} onChange={e => setInput(e.target.value)} />
      <select value={level} onChange={e => setLevel(e.target.value)}>
        <option value="A1">A1</option>
        <option value="A2">A2</option>
        <option value="B1">B1</option>
        <option value="B2">B2</option>
        <option value="C1">C1</option>
        <option value="C2">C2</option>
      </select>
      <button onClick={handleAdapt} disabled={loading}>Dönüştür</button>
      {error && <div style={{color:'red'}}>{error}</div>}
      <pre>{output}</pre>
    </div>
  );
};

export default AdaptToCEFRPage; 