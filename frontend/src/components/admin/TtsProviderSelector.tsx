import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { supabase } from '@/lib/supabaseClient';

const TtsProviderSelector: React.FC = () => {
  const [provider, setProvider] = useState<'amazon' | 'google' | 'azure'>('amazon');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchProvider = async () => {
      setLoading(true);
      // Use localStorage JWT token instead of Supabase token
      const token = typeof window !== 'undefined' ? localStorage.getItem('lingroot_token') : null;
      try {
        const res = await axios.get('/api/admin/settings/tts-provider', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        setProvider(res.data.tts_provider || 'amazon');
      } catch {
        setError('Ayarlar yüklenemedi');
      }
      setLoading(false);
    };
    fetchProvider();
  }, []);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = e.target.value as 'amazon' | 'google' | 'azure';
    setProvider(newProvider);
    setSaving(true);
    setError('');
    setSuccess(false);
    // Use localStorage JWT token instead of Supabase token
    const token = typeof window !== 'undefined' ? localStorage.getItem('lingroot_token') : null;
    try {
      await axios.post('/api/admin/settings/tts-provider', { tts_provider: newProvider }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setSuccess(true);
    } catch (err) {
      setError('Güncelleme başarısız');
    }
    setSaving(false);
  };

  if (loading) return <div className="mb-4">TTS ayarları yükleniyor...</div>;

  return (
    <div className="mb-6 p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center gap-4">
        <label className="font-semibold text-gray-700">TTS Sağlayıcı:
          <select
            value={provider}
            onChange={handleChange}
            className="ml-3 border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none transition"
            disabled={saving}
          >
            <option value="amazon">🔊 Amazon Polly</option>
            <option value="google">🌐 Google TTS</option>
            <option value="azure">☁️ Microsoft Azure TTS</option>
          </select>
        </label>
        {saving && <span className="text-gray-500 ml-2 animate-pulse">⏳ Kaydediliyor...</span>}
        {success && <span className="text-green-600 ml-2 font-semibold">✅ Kaydedildi!</span>}
        {error && <span className="text-red-500 ml-2 font-semibold">❌ {error}</span>}
      </div>
      <p className="mt-3 text-sm text-gray-600">
        Seçilen TTS sağlayıcı tüm sistem genelinde kullanılacaktır.
      </p>
    </div>
  );
};

export default TtsProviderSelector; 