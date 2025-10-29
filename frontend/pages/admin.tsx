import React, { useState, useEffect } from 'react';
import { useAuth } from '../src/lib/auth';
import { useRouter } from 'next/router';

export default function AdminPage() {
  const { user, login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect authenticated admin users to dashboard
  useEffect(() => {
    if (user && user.role === 'admin') {
      router.push('/admin/dashboard');
    }
  }, [user, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await login(form.email, form.password);
    if (!res.success) {
      setError(res.message || 'Giriş başarısız');
      setLoading(false);
    }
    // If successful, useEffect will handle redirect
  };

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow w-full max-w-sm space-y-4">
          <h1 className="text-2xl font-bold mb-4 text-center">Admin Girişi</h1>
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <input name="email" type="email" placeholder="E-posta" value={form.email} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
          <input name="password" type="password" placeholder="Şifre" value={form.password} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition" disabled={loading}>
            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </main>
    );
  }

  // Show login form for non-authenticated users
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-gray-600">Yükleniyor...</div>
    </main>
  );
} 