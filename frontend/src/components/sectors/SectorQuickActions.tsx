'use client';

/**
 * Sector Quick Actions
 *
 * Sektor ile ilgili hizli aksiyonlara erisim saglayan
 * kompakt buton grubu.
 */

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    BookOpen,
    MessageSquare,
    Mic,
    Target,
    Sparkles,
    Clock
} from 'lucide-react';

interface QuickAction {
    id: string;
    label: string;
    description: string;
    icon: React.ReactNode;
    href: string;
    color: string;
    bgColor: string;
    badge?: string;
}

interface SectorQuickActionsProps {
    sectorId: number;
    reviewDueCount?: number;
    className?: string;
}

export function SectorQuickActions({
    sectorId,
    reviewDueCount = 0,
    className = ''
}: SectorQuickActionsProps) {
    const actions: QuickAction[] = [
        {
            id: 'vocabulary',
            label: 'Kelime Calis',
            description: 'Terminoloji',
            icon: <Target className="w-5 h-5" />,
            href: `/sectors/${sectorId}?tab=vocabulary`,
            color: 'text-purple-600 dark:text-purple-400',
            bgColor: 'bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50',
            badge: reviewDueCount > 0 ? `${reviewDueCount}` : undefined
        },
        {
            id: 'content',
            label: 'Icerik Dinle',
            description: 'Makale & Podcast',
            icon: <BookOpen className="w-5 h-5" />,
            href: `/sectors/${sectorId}?tab=content`,
            color: 'text-blue-600 dark:text-blue-400',
            bgColor: 'bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50'
        },
        {
            id: 'roleplay',
            label: 'Roleplay',
            description: 'Is Diyalogu',
            icon: <MessageSquare className="w-5 h-5" />,
            href: `/sectors/${sectorId}?tab=roleplay`,
            color: 'text-teal-600 dark:text-teal-400',
            bgColor: 'bg-teal-100 dark:bg-teal-900/30 hover:bg-teal-200 dark:hover:bg-teal-900/50'
        },
        {
            id: 'podcast',
            label: 'Podcast',
            description: 'Sektor Haberi',
            icon: <Mic className="w-5 h-5" />,
            href: `/sectors/${sectorId}?tab=podcast`,
            color: 'text-orange-600 dark:text-orange-400',
            bgColor: 'bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/50'
        }
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 ${className}`}
        >
            {/* Header */}
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-500" />
                Hizli Erisim
            </h3>

            {/* Actions Grid */}
            <div className="grid grid-cols-2 gap-3">
                {actions.map((action) => (
                    <Link
                        key={action.id}
                        href={action.href}
                        className={`relative flex flex-col items-center p-4 rounded-xl transition-all ${action.bgColor}`}
                    >
                        {/* Badge */}
                        {action.badge && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                {action.badge}
                            </span>
                        )}

                        {/* Icon */}
                        <div className={`mb-2 ${action.color}`}>
                            {action.icon}
                        </div>

                        {/* Label */}
                        <span className={`text-sm font-medium ${action.color}`}>
                            {action.label}
                        </span>

                        {/* Description */}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {action.description}
                        </span>
                    </Link>
                ))}
            </div>

            {/* Review Reminder */}
            {reviewDueCount > 0 && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span className="text-sm text-amber-700 dark:text-amber-400">
                            <strong>{reviewDueCount}</strong> kelime bugün tekrar edilmeli
                        </span>
                    </div>
                </div>
            )}
        </motion.div>
    );
}

export default SectorQuickActions;
