'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { getUserById } from '@/services/userService';
import type { User } from '@/types/user';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
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

  const isActive = (href: string) => pathname === href;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top frame */}
      <header className="bg-white border-b">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded border bg-white hover:bg-gray-50 text-gray-700">
              <span className="text-lg">←</span>
              <span>Geri dön</span>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                {user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : 'LR'}
              </div>
              <div>
                <div className="font-semibold text-gray-900">{user?.name || user?.email || 'Kullanıcı'}</div>
                <div className="text-sm text-gray-500">{user?.email || (loading ? 'Yükleniyor...' : error ? 'Hata' : '')}</div>
              </div>
            </div>
            {user?.role && (
              <div className="text-xs px-2 py-1 bg-gray-100 rounded border text-gray-700">Rol: {user.role}</div>
            )}
          </div>
        </div>
      </header>

      {/* Body with left menu and right content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left menu */}
        <aside className="md:col-span-2 lg:col-span-1">
          <nav className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <MenuItem href={`/admin/users/${userId}`} label="Kullanıcı Bilgileri" active={isActive(`/admin/users/${userId}`)} />
            <MenuItem href={`/admin/users/${userId}/audio`} label="Ses Kayıtları" active={isActive(`/admin/users/${userId}/audio`)} />
            <MenuItem href={`/admin/users/${userId}/package`} label="Kullanım Bilgileri" active={isActive(`/admin/users/${userId}/package`)} />
            <MenuItem href={`/admin/users/${userId}/logins`} label="Login Bilgileri" active={isActive(`/admin/users/${userId}/logins`)} />
          </nav>
        </aside>

        {/* Right content */}
        <main className="md:col-span-10 lg:col-span-11">
          <div className="bg-white rounded-lg border shadow-sm p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function MenuItem({ href, label, active }: { href: string; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`block px-4 py-3 text-sm border-b last:border-b-0 transition ${active ? 'bg-indigo-50 text-indigo-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
    >
      {label}
    </Link>
  );
}
