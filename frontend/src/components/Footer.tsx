'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from '@/lib/i18n';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-white border-t-4 border-blue-600 pt-8 pb-4">
      <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Image src="/logo.svg" alt="LingRoot Logo" width={40} height={40} />
          <span className="font-bold text-xl text-blue-700">LingRoot</span>
        </div>
        <div className="text-gray-500 text-sm text-center md:text-right">
          İngilizceyi akıcı konuşmak için yapay zeka destekli kişiselleştirilmiş içerikler.
        </div>
      </div>
      <div className="mt-6 text-center text-xs text-gray-400">
        &copy; {new Date().getFullYear()} LingRoot. Tüm hakları saklıdır.
      </div>
    </footer>
  );
} 