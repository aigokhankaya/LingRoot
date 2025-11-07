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
    <div className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-14">
          {/* Left Side: Back Button (if needed) */}
          <div className="flex items-center">
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
          </div>

          {/* Center: Page Title (optional) */}
          <div className="flex-1 text-center">
            <h1 className="text-lg font-semibold text-gray-800">
              {/* Sayfa başlığı buraya eklenebilir */}
            </h1>
          </div>

          {/* Right Side: Empty (profile sidebar'da) */}
          <div className="w-10">
            {/* Boş alan - simetri için */}
          </div>
        </div>
      </div>
    </div>
  );
};
