'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { getUserById } from '@/services/userService';
import type { User } from '@/types/user';

export default function AdminUserGeneralPage() {
  const params = useParams<{ id: string }>();
  const userId = useMemo(() => (Array.isArray(params?.id) ? params.id[0] : params?.id), [params]);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        setLoading(true);
        const u = await getUserById(userId);
        setUser(u);
      } catch (e: any) {
        setError(e?.message || 'Kullanıcı bilgileri alınamadı');
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  if (loading) return <div>Yükleniyor...</div>;
  if (error) return <div className="text-red-600">Hata: {error}</div>;
  if (!user) return <div>Kullanıcı bulunamadı.</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Kullanıcı Bilgileri</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Info label="Ad Soyad" value={user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || '-'} />
        <Info label="E-posta" value={user.email} />
        <Info label="Rol" value={user.role} />
        <Info label="Durum" value={user.isActive ? 'Aktif' : 'Pasif'} />
        <Info label="Kayıt Tarihi" value={String(user.createdAt || '-')} />
        <Info label="Son Giriş" value={String(user.lastLogin || '-')} />
        {user.phoneNumber && <Info label="Telefon" value={user.phoneNumber} />}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded border bg-gray-50">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm font-medium text-gray-900 break-all">{value}</div>
    </div>
  );
}
