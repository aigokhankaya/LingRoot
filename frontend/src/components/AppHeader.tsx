
import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';
import BrandWordmark from '@/components/BrandWordmark';
import NotificationBell from '@/components/NotificationBell';
import { ProfileDropdownMenu } from '@/components/shared/ProfileDropdownMenu';
import { LevelProgressBar } from '@/components/gamification';

export const AppHeader: React.FC = () => {
    const { t } = useTranslation();
    const { isAuthenticated } = useAuth();

    return (
        <div className="bg-white shadow-sm border-b sticky top-0 z-50">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center space-x-6">
                        {/* Logo + Brand */}
                        <Link href="/">
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
