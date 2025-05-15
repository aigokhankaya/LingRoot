import React, { useEffect, useState } from 'react';
import axios from 'axios';

const TtsProviderSelector: React.FC = () => {
  const [provider, setProvider] = useState<'amazon' | 'google'>('amazon');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setLoading(true);
    axios.get('/api/admin/settings/tts-provider')
      .then(res => {
        setProvider(res.data.tts_provider || 'amazon');
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        setError('Ayarlar yüklenemedi');
      });
  }, []);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = e.target.value as 'amazon' | 'google';
    setProvider(newProvider);
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      await axios.post('/api/admin/settings/tts-provider', { tts_provider: newProvider });
      setSuccess(true);
    } catch (err) {
      setError('Güncelleme başarısız');
    }
    setSaving(false);
  };

  if (loading) return <div className="mb-4">TTS ayarları yükleniyor...</div>;

  return (
    <div className="mb-6 p-4 bg-white rounded shadow flex items-center gap-4">
      <label className="font-semibold">TTS Sağlayıcı:
        <select
          value={provider}
          onChange={handleChange}
          className="ml-2 border rounded px-2 py-1"
          disabled={saving}
        >
          <option value="amazon">Amazon Polly</option>
          <option value="google">Google TTS</option>
        </select>
      </label>
      {saving && <span className="text-gray-500 ml-2">Kaydediliyor...</span>}
      {success && <span className="text-green-600 ml-2">Kaydedildi!</span>}
      {error && <span className="text-red-500 ml-2">{error}</span>}
    </div>
  );
};

export default TtsProviderSelector; 