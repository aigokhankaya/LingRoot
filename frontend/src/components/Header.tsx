'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';

export default function Header() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  return (
    <header className="w-full bg-white shadow-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-20">
        {/* Logo */}
        <Link href="/" className="flex items-center select-none">
          <span className="font-extrabold text-3xl">
            <span className="text-blue-600">Ling</span>
            <span className="text-yellow-400">Root</span>
          </span>
        </Link>
        {/* Menü */}
        <nav className="flex items-center gap-8 text-lg font-medium text-gray-700">
          <Link href="#neden" className="hover:text-blue-600 transition-colors">Neden LingRoot?</Link>
          <Link href="#nasil" className="hover:text-blue-600 transition-colors">Nasıl Çalışır?</Link>
          <Link href="#yorumlar" className="hover:text-blue-600 transition-colors">Yorumlar</Link>
        </nav>
        {/* Hemen Başla Butonu */}
        <Link href="/login" className="ml-4 px-6 py-2 bg-yellow-400 hover:bg-yellow-500 text-white font-bold rounded-xl shadow transition-all text-lg">
          Hemen Başla
        </Link>
      </div>
    </header>
  );
} 