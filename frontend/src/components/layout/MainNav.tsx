import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../lib/auth';
import { Button } from "../ui/button";
import { ArrowLeft } from 'lucide-react';

interface MainNavProps {
  showBackButton?: boolean;
  backUrl?: string;
}

export const MainNav: React.FC<MainNavProps> = ({ 
  showBackButton = false, 
  backUrl = '/welcome' 
}) => {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const displayName = (user as any)?.name || user?.email || 'Kullanıcı';
  const avatar = (user as any)?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}`;

  return (
    <div className="sticky top-0 z-50 bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Left Side: Logo + Back Button */}
          <div className="flex items-center space-x-4">
            {showBackButton && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => router.push(backUrl)}
                className="!rounded-button"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            
            <Link href="/welcome" className="flex items-center space-x-3 cursor-pointer">
              <img 
                src="/lingroot-icon.svg" 
                alt="LingRoot Logo" 
                className="w-10 h-10 md:w-12 md:h-12" 
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/LingRoot_IconOnly.png';
                }}
              />
              <span className="text-xl md:text-2xl font-extrabold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 bg-clip-text text-transparent tracking-tight">
                LingRoot
              </span>
            </Link>
          </div>

          {/* Right Side: Profile Dropdown */}
          <div className="flex items-center space-x-4">
            {isAuthenticated && user && (
              <div className="relative">
                <div
                  className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors"
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                >
                  <img
                    src={avatar}
                    alt={displayName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="hidden md:block text-sm">
                    <div className="font-medium text-gray-900">{displayName}</div>
                    <div className="text-gray-500 text-xs">{user?.email}</div>
                  </div>
                  <i className={`fas fa-chevron-${profileMenuOpen ? 'up' : 'down'} ml-2 text-gray-500 transition-transform duration-200`}></i>
                </div>

                {/* Dropdown Menu */}
                {profileMenuOpen && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setProfileMenuOpen(false)}
                    />
                    
                    {/* Menu */}
                    <div className="absolute right-0 w-48 mt-2 bg-white rounded-lg shadow-lg py-2 z-50 border border-gray-200">
                      <Link 
                        href="/profile" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                        onClick={() => setProfileMenuOpen(false)}
                      >
                        <i className="fas fa-user-circle mr-2"></i>
                        Profil Bilgilerim
                      </Link>
                      <Link 
                        href="/settings" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                        onClick={() => setProfileMenuOpen(false)}
                      >
                        <i className="fas fa-cog mr-2"></i>
                        Hesap Ayarları
                      </Link>
                      <Link 
                        href="/dashboard" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                        onClick={() => setProfileMenuOpen(false)}
                      >
                        <i className="fas fa-history mr-2"></i>
                        Okuma Geçmişim
                      </Link>
                      <div className="border-t border-gray-100 mt-2 pt-2">
                        <button
                          onClick={() => {
                            logout();
                            router.push('/');
                            setProfileMenuOpen(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 cursor-pointer"
                        >
                          <i className="fas fa-sign-out-alt mr-2"></i>
                          Çıkış Yap
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
