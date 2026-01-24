
import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';
import BrandWordmark from '@/components/BrandWordmark';
import NotificationBell from '@/components/NotificationBell';
import { ProfileDropdownMenu } from '@/components/shared/ProfileDropdownMenu';
import { LevelProgressBar } from '@/components/gamification';
import { useGamification } from '@/hooks/useGamification';

export const AppHeader: React.FC = () => {
    const { t } = useTranslation();
    const { isAuthenticated, user } = useAuth();
    const { checkIn } = useGamification();
    const hasCheckedIn = useRef(false);

    // Otomatik streak check-in (günde bir kez)
    useEffect(() => {
        if (isAuthenticated && !hasCheckedIn.current) {
            const today = new Date().toISOString().split('T')[0];
            const lastCheckIn = localStorage.getItem('lingroot_lastCheckIn');

            if (lastCheckIn !== today) {
                hasCheckedIn.current = true;
                checkIn().then(() => {
                    localStorage.setItem('lingroot_lastCheckIn', today);
                    console.log('[Gamification] Auto check-in completed');
                }).catch(console.error);
            }
        }
    }, [isAuthenticated, checkIn]);

    return (
        <div className="bg-white shadow-sm border-b sticky top-0 z-50">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center space-x-6">
                        {/* Logo + Brand */}
                        <Link href="/welcome">
                            <div className="flex items-center space-x-3 flex-shrink-0 cursor-pointer">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src="/lingroot-icon.svg"
                                    alt="LingRoot Logo"
                                    className="w-10 h-10 md:w-12 md:h-12"
                                />
                                <BrandWordmark className="hidden sm:inline-block text-lg sm:text-xl md:text-2xl" />
                            </div>
                        </Link>

                        {/* Navigation Links */}
                        <div className="flex items-center space-x-2">
                            <Link href="/welcome">
                                <Button variant="ghost" className="!rounded-button whitespace-nowrap cursor-pointer">
                                    <i className="fas fa-home mr-2"></i>
                                    {t('welcome_nav_home')}
                                </Button>
                            </Link>
                            <Link href="/dashboard?tab=reading-history">
                                <Button variant="ghost" className="!rounded-button whitespace-nowrap cursor-pointer">
                                    <i className="fas fa-history mr-2"></i>
                                    {t('welcome_nav_reading_history')}
                                </Button>
                            </Link>
                            <Link href="/progress">
                                <Button variant="ghost" className="!rounded-button whitespace-nowrap cursor-pointer">
                                    <span className="mr-2">🏆</span>
                                    {t('welcome_nav_progress')}
                                </Button>
                            </Link>
                            {/* Admin Only: Pattern Lab */}
                            {user?.role === 'admin' && (
                                <Link href="/pattern-lab">
                                    <Button variant="ghost" className="!rounded-button whitespace-nowrap cursor-pointer text-purple-600 hover:text-purple-700 hover:bg-purple-50">
                                        <span className="mr-2">🧪</span>
                                        Pattern Lab
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        {/* Compact Level Progress in Header */}
                        <div className="hidden md:block">
                            <LevelProgressBar compact={true} />
                        </div>
                        <NotificationBell />
                        {isAuthenticated && (
                            <ProfileDropdownMenu
                                align="end"
                                side="bottom"
                                avatarSize="md"
                                showUserInfo={true}
                                showChevron={true}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AppHeader;
