import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../lib/auth';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Package, Settings, History, Heart, Globe, HelpCircle, LogOut, Home } from 'lucide-react';
import { useTranslation } from '../../lib/i18n';

interface ProfileDropdownMenuProps {
  /** Menünün hangi taraftan açılacağı */
  align?: 'start' | 'center' | 'end';
  /** Menünün hangi yönde açılacağı */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** "Ana Sayfa" linkini göster */
  showHomeLink?: boolean;
  /** Avatar ve kullanıcı bilgisi gösterimi için özel trigger */
  triggerClassName?: string;
  /** Avatar boyutu */
  avatarSize?: 'sm' | 'md' | 'lg';
  /** Kullanıcı bilgisini trigger'da göster */
  showUserInfo?: boolean;
  /** Chevron ikonunu göster */
  showChevron?: boolean;
}

/**
 * Tüm sayfalarda kullanılabilecek birleşik profil dropdown menüsü.
 * Bu bileşen, kullanıcı profil menüsü için tek bir kaynak sağlar.
 */
export const ProfileDropdownMenu: React.FC<ProfileDropdownMenuProps> = ({
  align = 'end',
  side = 'bottom',
  showHomeLink = false,
  triggerClassName = '',
  avatarSize = 'md',
  showUserInfo = true,
  showChevron = true,
}) => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) return null;

  const displayName = (user as any)?.name || user?.email || t('profile_menu_user_default');
  const avatarUrl = (user as any)?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}`;
  const initials = displayName.charAt(0).toUpperCase();

  const avatarSizeClass = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  }[avatarSize];

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Menü öğeleri - tek bir yerden yönetiliyor
  const menuItems = [
    ...(showHomeLink ? [{
      href: '/',
      icon: <Home className="h-4 w-4" />,
      label: t('profile_menu_home'),
      iconClass: 'fas fa-home',
    }] : []),
    {
      href: '/profile',
      icon: <User className="h-4 w-4" />,
      label: t('profile_menu_profile'),
      iconClass: 'fas fa-user-circle',
    },
    {
      href: '/dashboard?tab=paket-bilgilerim',
      icon: <Package className="h-4 w-4" />,
      label: t('profile_menu_package'),
      iconClass: 'fas fa-box',
    },
    {
      href: '/settings',
      icon: <Settings className="h-4 w-4" />,
      label: t('profile_menu_settings'),
      iconClass: 'fas fa-cog',
    },
    {
      href: '/dashboard?tab=reading-history',
      icon: <History className="h-4 w-4" />,
      label: t('profile_menu_reading_history'),
      iconClass: 'fas fa-history',
    },
    {
      href: '/dashboard?tab=favorilerim',
      icon: <Heart className="h-4 w-4" />,
      label: t('profile_menu_favorites'),
      iconClass: 'fas fa-heart',
    },
    {
      href: '/settings?section=language',
      icon: <Globe className="h-4 w-4" />,
      label: t('profile_menu_language'),
      iconClass: 'fas fa-globe',
    },
    {
      href: '/help',
      icon: <HelpCircle className="h-4 w-4" />,
      label: t('profile_menu_help'),
      iconClass: 'fas fa-question-circle',
    },
  ];

  // Konumlandırma: Her zaman tetikleyicinin sağ kenarına hizala,
  // sadece "side" değerine göre yukarı/aşağı aç.
  const horizontalClass = 'right-0';
  const verticalClass = side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';

  return (
    <div className="relative" ref={containerRef}>
      <button
        className={`flex items-center gap-2 cursor-pointer focus:outline-none ${triggerClassName}`}
        aria-label={t('profile_menu_aria_label')}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Avatar className={avatarSizeClass}>
          <AvatarImage src={avatarUrl} alt={displayName} />
          <AvatarFallback className="bg-primary text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        {showUserInfo && (
          <div className="text-sm text-left hidden md:block">
            <div className="font-medium text-gray-900">{displayName}</div>
          </div>
        )}
        {showChevron && (
          <i className="fas fa-chevron-down text-gray-400 text-xs ml-1"></i>
        )}
      </button>

      {open && (
        <div
          className={`absolute ${horizontalClass} ${verticalClass} w-56 bg-white border border-gray-200 text-gray-700 shadow-lg rounded-lg z-50`}
        >
          {/* Menü öğeleri */}
          <div className="py-1">
            {menuItems.map((item, index) => (
              <Link
                key={index}
                href={item.href}
                className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                onClick={() => setOpen(false)}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Çıkış butonu */}
          <div className="border-t border-gray-100 mt-2 pt-2">
            <button
              onClick={() => {
                setOpen(false);
                handleLogout();
              }}
              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer flex items-center gap-3"
            >
              <LogOut className="h-4 w-4" />
              <span>{t('profile_menu_logout')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdownMenu;
