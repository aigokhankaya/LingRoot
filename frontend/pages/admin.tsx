import React, { useState } from 'react';
import { useAuth } from '../src/lib/auth';
import UserTable from '../src/components/admin/UserTable';
import { useRouter } from 'next/router';

export default function AdminPage() {
  const { user, login, logout } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await login(form.email, form.password);
    if (!res.success) setError(res.message || 'Giriş başarısız');
    setLoading(false);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
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

  if (user.role !== 'admin') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded shadow w-full max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">Yetkisiz Erişim</h1>
          <p>Bu sayfaya erişim için admin olmalısınız.</p>
          <button onClick={handleLogout} className="mt-4 px-4 py-2 bg-red-500 text-white rounded">Çıkış Yap</button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <button onClick={handleLogout} className="px-4 py-2 bg-red-500 text-white rounded">Çıkış Yap</button>
        </div>
        <UserTable />
      </div>
    </main>
  );
} 