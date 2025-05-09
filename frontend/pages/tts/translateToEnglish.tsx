import React, { useState } from 'react';
// Burada gerçek fonksiyonun yolunu kendi projenize göre ayarlayın
// import { translateToEnglishWithOpenAI } from '../../src/lib/ttsDevUtils';

// Örnek stub fonksiyon (gerçek API ile değiştirin)
async function translateToEnglishWithOpenAI(text: string) {
  // Burada gerçek API çağrısı yapılmalı
  return { text: `[EN] ${text}` };
}

const API_URL = '/api/tts/translateToEnglish';

const TranslateToEnglishPage = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTranslate = async () => {
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
      setOutput(data.text);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <h2>Metni İngilizceye Çevir</h2>
      <textarea value={input} onChange={e => setInput(e.target.value)} />
      <button onClick={handleTranslate} disabled={loading}>Çevir</button>
      {error && <div style={{color:'red'}}>{error}</div>}
      <pre>{output}</pre>
    </div>
  );
};

export default TranslateToEnglishPage; 