import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  return (
    <header className="flex items-center justify-between py-4 px-6 bg-white shadow-md">
      <Link href="/">
        <div className="flex items-center space-x-2">
          <Image src="/logo.svg" alt="LingRoot Logo" width={40} height={40} />
          <span className="font-bold text-xl text-blue-700">LingRoot</span>
        </div>
      </Link>
      <nav className="flex items-center space-x-6">
        <Link href="/" className="hover:text-blue-600 font-medium">
          {t('dashboard')}
        </Link>
        <Link href="/about" className="hover:text-blue-600 font-medium">
          {t('about')}
        </Link>
        <Link href="/contact" className="hover:text-blue-600 font-medium">
          {t('contact')}
        </Link>
        {user ? (
          <>
            <span className="text-gray-700 font-medium">{user.email}</span>
            <button onClick={logout} className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all">
              {t('logout')}
            </button>
          </>
        ) : (
          <Link href="/login" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all">
            {t('login')}
          </Link>
        )}
      </nav>
    </header>
  );
};

export default Header; 