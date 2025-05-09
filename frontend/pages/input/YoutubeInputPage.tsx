import React, { useState } from 'react';
import { generateAudioAndSubtitle } from '../../src/lib/ttsCommon';

const YoutubeInputPage = () => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [level, setLevel] = useState('A1');
  const [rate, setRate] = useState(1);
  const [voice, setVoice] = useState('default');
  const [result, setResult] = useState<any>(null);

  // Youtube transcript çekme işlemini burada yapmalısın
  const fetchTranscriptFromYoutube = async (url: string) => {
    return url; // Örnek: linki metin olarak gönder
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const narrationText = await fetchTranscriptFromYoutube(youtubeUrl);
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
      <h2>Youtube Inputu</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="Youtube linki" />
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

export default YoutubeInputPage; 