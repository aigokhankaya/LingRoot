'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';

export default function Header() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  return (
    <header className="w-full fixed top-0 left-0 z-30 bg-white/80 backdrop-blur border-b border-gray-100 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-row justify-between items-center py-3">
          {/* Logo ve Slogan */}
          <nav className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-3 group">
              {/* Desktop: Tam logo + slogan */}
              <div className="relative h-12 w-36 hidden sm:block">
                <Image
                  src="/LingRoot_MainLogo.png"
                  alt="LingRoot Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <div className="relative h-10 w-10 sm:hidden">
                <Image
                  src="/LingRoot_IconOnly.png"
                  alt="LingRoot Icon Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              {/* Slogan sadece desktop'ta */}
              <span className="hidden sm:block text-xs font-medium text-gray-500 ml-2 mt-2 tracking-wide">
                Your routines turn into English
              </span>
            </Link>
          </nav>

          {/* Menü Elemanları */}
          <div className="flex items-center space-x-6">
            <Link 
              href="/dashboard" 
              className="text-gray-700 hover:text-blue-700 font-medium transition-colors"
            >
              {t('dashboard')}
            </Link>
            <Link 
              href="/how-it-works" 
              className="text-gray-700 hover:text-blue-700 font-medium transition-colors"
            >
              {t('how_it_works')}
            </Link>
            <Link 
              href="/login" 
              className="text-gray-700 hover:text-blue-700 font-medium transition-colors"
            >
              {user ? t('logout') : t('login')}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
