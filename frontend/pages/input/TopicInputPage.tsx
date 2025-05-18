import React, { useState } from 'react';
import { generateAudioAndSubtitle } from '../../src/lib/ttsCommon';

const TopicInputPage = () => {
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('A1');
  const [rate, setRate] = useState(1);
  const [voice, setVoice] = useState('default');
  const [result, setResult] = useState<any>(null);

  // Konudan anlatım metni oluşturma işlemini burada yapmalısın
  const generateNarrationFromTopic = async (topic: string) => {
    return topic; // Örnek: konuyu metin olarak gönder
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const narrationText = await generateNarrationFromTopic(topic);
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
      <h2>Konu Inputu</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Konu girin" />
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

export default TopicInputPage; 