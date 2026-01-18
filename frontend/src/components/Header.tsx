'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';

export default function Header() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  return (
    <header className="w-full bg-white/90 border-b border-border backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-20">
        {/* Logo */}
        <Link href="/welcome" className="flex items-center select-none space-x-3">
          <Image
            src="/lingroot-logo.svg"
            alt="LingRoot Logo"
            width={160}
            height={40}
            className="hidden sm:block h-10 w-auto"
          />
          <Image
            src="/LingRoot_IconOnly.png"
            alt="LingRoot Icon"
            width={40}
            height={40}
            className="block sm:hidden h-10 w-10"
          />
        </Link>
        {/* Menü */}
        <nav className="flex items-center gap-8 text-sm md:text-base font-medium text-foreground/80">
          <Link href="#neden" className="hover:text-primary transition-colors">{t('header_why_lingroot')}</Link>
          <Link href="#nasil" className="hover:text-primary transition-colors">{t('header_how_it_works')}</Link>
          <Link href="#yorumlar" className="hover:text-primary transition-colors">{t('header_testimonials')}</Link>
          <Link href="/pattern-lab" className="hover:text-primary transition-colors text-indigo-600 font-bold">Dil Laboratuvarı</Link>
        </nav>
        {/* Hemen Başla Butonu */}
        <Link href="/login" className="ml-4">
          <Button className="px-6 py-2 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md">
            {t('header_start_now')}
          </Button>
        </Link>
      </div>
    </header>
  );
}
