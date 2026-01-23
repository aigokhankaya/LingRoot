import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <header className="flex items-center justify-between py-4 px-6 bg-white/90 border-b border-border backdrop-blur-sm">
      <Link href="/welcome">
        <div className="flex items-center space-x-3">
          <Image
            src="/lingroot-logo.svg"
            alt="LingRoot Logo"
            width={140}
            height={36}
            className="hidden sm:block h-9 w-auto"
          />
          <Image
            src="/LingRoot_IconOnly.png"
            alt="LingRoot Icon"
            width={36}
            height={36}
            className="block sm:hidden h-9 w-9"
          />
        </div>
      </Link>
      <nav className="flex items-center space-x-6 text-sm md:text-base font-medium text-foreground/80">
        <Link href="/welcome" className="hover:text-primary transition-colors">
          {t('dashboard')}
        </Link>
        <Link href="/about" className="hover:text-primary transition-colors">
          {t('about')}
        </Link>
        <Link href="/contact" className="hover:text-primary transition-colors">
          {t('contact')}
        </Link>
        {user ? (
          <>
            <span className="hidden sm:inline text-xs md:text-sm text-muted-foreground max-w-[180px] truncate">
              {user.email}
            </span>
            <Link href="/profile">
              <Button variant="outline" className="ml-2 text-xs md:text-sm">
                Profil
              </Button>
            </Link>
            <Button
              onClick={() => {
                logout();
                router.push('/welcome');
              }}
              className="ml-2 text-xs md:text-sm"
            >
              {t('logout')}
            </Button>
          </>
        ) : (
          <Link href="/login">
            <Button className="text-xs md:text-sm">
              {t('login')}
            </Button>
          </Link>
        )}
      </nav>
    </header>
  );
}
  ;

export default Header; 