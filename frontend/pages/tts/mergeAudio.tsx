import React, { useState } from 'react';
// import { mergeAudioSegments, uploadToSupabase } from '../../src/lib/ttsDevUtils';

// Örnek stub fonksiyon (gerçek API ile değiştirin)
async function mergeAudioSegments(files: string[]) {
  // Gerçek birleştirme işlemi burada olmalı
  return { mergedUrl: 'https://dummy-audio-url.com/merged.mp3' };
}

const API_URL = '/api/tts/mergeAudio';

const MergeAudioPage = () => {
  const [files, setFiles] = useState('');
  const [output, setOutput] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleMerge = async () => {
    setLoading(true);
    setError('');
    try {
      const fileList = files.split(',').map(f => f.trim());
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: fileList }),
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
      <h2>Ses Dosyalarını Birleştir ve Yükle</h2>
      <input type="text" value={files} onChange={e => setFiles(e.target.value)} placeholder="Dosya adlarını virgülle ayırın" />
      <button onClick={handleMerge} disabled={loading}>Birleştir</button>
      {error && <div style={{color:'red'}}>{error}</div>}
      <pre>{JSON.stringify(output, null, 2)}</pre>
    </div>
  );
};

export default MergeAudioPage; 