'use client';

import { useState } from 'react';

export default function DeleteAccountPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch('https://lingloops-backend.onrender.com/api/delete-account-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setSuccess(true);
        setEmail('');
      } else {
        throw new Error('Request failed');
      }
    } catch (err) {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">🗑️ Hesap Silme</h1>
          <p className="text-gray-600">
            LingRoot hesabınızı kalıcı olarak silmek için aşağıdaki formu doldurun.
          </p>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded">
          <p className="text-sm text-yellow-800">
            <strong>⚠️ Uyarı:</strong> Bu işlem geri alınamaz. Tüm verileriniz kalıcı olarak silinecektir.
          </p>
        </div>

        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Adresiniz
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@email.com"
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'İşleniyor...' : 'Hesabımı Sil'}
            </button>
          </form>
        ) : (
          <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
            <p className="text-green-800">
              ✅ Hesap silme talebiniz alındı. En kısa sürede işleme alınacaktır.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded mt-4">
            <p className="text-red-800">❌ {error}</p>
          </div>
        )}

        <div className="mt-6 text-center">
          <a href="/" className="text-purple-600 hover:text-purple-800 text-sm font-medium">
            ← Ana Sayfaya Dön
          </a>
        </div>
      </div>
    </div>
  );
}
