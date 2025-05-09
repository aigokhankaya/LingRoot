import React, { useState } from 'react';
import { generateAudioAndSubtitle } from '../../src/lib/ttsCommon';

const FileInputPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState('A1');
  const [rate, setRate] = useState(1);
  const [voice, setVoice] = useState('default');
  const [result, setResult] = useState<any>(null);

  // Dosyadan metin çıkarma işlemini burada yapmalısın (ör. pdf/word parser ile)
  const extractTextFromFile = async (file: File) => {
    return file.name; // Örnek: dosya adını metin olarak gönder
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const narrationText = await extractTextFromFile(file);
    const response = await generateAudioAndSubtitle({
      narrationText,
      level,
      speakingRate: rate,
      voice
    });
    setResult(response);
  };

  return (
    <div>
      <h2>Dosya Inputu</h2>
      <form onSubmit={handleSubmit}>
        <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
        <select value={level} onChange={e => setLevel(e.target.value)}>
          <option value="A1">A1</option>
          <option value="A2">A2</option>
          <option value="B1">B1</option>
          <option value="B2">B2</option>
          <option value="C1">C1</option>
          <option value="C2">C2</option>
        </select>
        <input type="number" value={rate} onChange={e => setRate(Number(e.target.value))} step="0.1" min="0.5" max="1.5" />
        <select value={voice} onChange={e => setVoice(e.target.value)}>
          <option value="default">Default</option>
          <option value="male">Erkek</option>
          <option value="female">Kadın</option>
        </select>
        <button type="submit">Sesi Oluştur</button>
      </form>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
};

export default FileInputPage; 