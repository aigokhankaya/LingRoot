'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
    Code,
    DollarSign,
    Plane,
    Truck,
    Heart,
    Stethoscope,
    Scale,
    Car,
    Megaphone,
    Wrench,
    ShoppingCart,
    GraduationCap,
    Users,
    Building2,
    PlaneTakeoff,
    Factory,
    Briefcase,
    LucideIcon
} from 'lucide-react';

// Sektör ikonları mapping
const SECTOR_ICONS: Record<string, LucideIcon> = {
    'it_software': Code,
    'finance': DollarSign,
    'tourism': Plane,
    'logistics': Truck,
    'healthcare': Heart,
    'medical_tourism': Stethoscope,
    'legal': Scale,
    'automotive': Car,
    'marketing': Megaphone,
    'engineering': Wrench,
    'retail': ShoppingCart,
    'education': GraduationCap,
    'hr': Users,
    'real_estate': Building2,
    'aviation': PlaneTakeoff,
    'manufacturing': Factory,
};

// Sektör renkleri
const SECTOR_COLORS: Record<string, { bg: string; text: string; gradient: string; border: string }> = {
    'it_software': { bg: 'bg-indigo-500/10', text: 'text-indigo-600', gradient: 'from-indigo-500 to-purple-500', border: 'border-indigo-200' },
    'finance': { bg: 'bg-emerald-500/10', text: 'text-emerald-600', gradient: 'from-emerald-500 to-teal-500', border: 'border-emerald-200' },
    'tourism': { bg: 'bg-amber-500/10', text: 'text-amber-600', gradient: 'from-amber-500 to-orange-500', border: 'border-amber-200' },
    'logistics': { bg: 'bg-blue-500/10', text: 'text-blue-600', gradient: 'from-blue-500 to-cyan-500', border: 'border-blue-200' },
    'healthcare': { bg: 'bg-red-500/10', text: 'text-red-600', gradient: 'from-red-500 to-rose-500', border: 'border-red-200' },
    'medical_tourism': { bg: 'bg-pink-500/10', text: 'text-pink-600', gradient: 'from-pink-500 to-rose-500', border: 'border-pink-200' },
    'legal': { bg: 'bg-violet-500/10', text: 'text-violet-600', gradient: 'from-violet-500 to-purple-500', border: 'border-violet-200' },
    'automotive': { bg: 'bg-slate-500/10', text: 'text-slate-600', gradient: 'from-slate-500 to-gray-500', border: 'border-slate-200' },
    'marketing': { bg: 'bg-orange-500/10', text: 'text-orange-600', gradient: 'from-orange-500 to-amber-500', border: 'border-orange-200' },
    'engineering': { bg: 'bg-cyan-500/10', text: 'text-cyan-600', gradient: 'from-cyan-500 to-teal-500', border: 'border-cyan-200' },
    'retail': { bg: 'bg-lime-500/10', text: 'text-lime-600', gradient: 'from-lime-500 to-green-500', border: 'border-lime-200' },
    'education': { bg: 'bg-purple-500/10', text: 'text-purple-600', gradient: 'from-purple-500 to-violet-500', border: 'border-purple-200' },
    'hr': { bg: 'bg-teal-500/10', text: 'text-teal-600', gradient: 'from-teal-500 to-cyan-500', border: 'border-teal-200' },
    'real_estate': { bg: 'bg-stone-500/10', text: 'text-stone-600', gradient: 'from-stone-500 to-amber-500', border: 'border-stone-200' },
    'aviation': { bg: 'bg-sky-500/10', text: 'text-sky-600', gradient: 'from-sky-500 to-blue-500', border: 'border-sky-200' },
    'manufacturing': { bg: 'bg-yellow-500/10', text: 'text-yellow-600', gradient: 'from-yellow-500 to-orange-500', border: 'border-yellow-200' },
};

const DEFAULT_COLOR = { bg: 'bg-teal-500/10', text: 'text-teal-600', gradient: 'from-teal-500 to-cyan-500', border: 'border-teal-200' };

export interface Sector {
    id: number;
    code: string;
    name_tr: string;
    name_en?: string;
    name?: string; // Uyumluluk için
    description_tr?: string;
    description_en?: string;
    description?: string; // Uyumluluk için
    icon?: string;
    color?: string;
    content_count?: number;
    vocabulary_count?: number;
    is_active?: boolean;
    sort_order?: number;
    user_progress?: number; // Kullanıcı ilerlemesi (0-100)
}

interface SectorCardProps {
    sector: Sector;
    onClick?: () => void;
    index?: number;
}

export default function SectorCard({ sector, onClick, index = 0 }: SectorCardProps) {
    const IconComponent = SECTOR_ICONS[sector.code] || Briefcase;
    const colors = SECTOR_COLORS[sector.code] || DEFAULT_COLOR;

    // Adı belirle (name_tr veya name)
    const displayName = sector.name_tr || sector.name || 'Sektör';
    const displayDescription = sector.description_tr || sector.description || '';

    // İçerik sayısı
    const contentCount = sector.content_count || 0;
    const vocabCount = sector.vocabulary_count || 0;

    // İlerleme yüzdesi
    const progress = sector.user_progress || 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
                duration: 0.4,
                delay: index * 0.05,
                ease: [0.25, 0.46, 0.45, 0.94]
            }}
            whileHover={{
                y: -8,
                scale: 1.02,
                transition: { duration: 0.2 }
            }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className="group cursor-pointer"
        >
            <div className={`
                relative overflow-hidden rounded-2xl
                bg-white dark:bg-gray-800/90
                border ${colors.border} dark:border-gray-700
                shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50
                backdrop-blur-xl
                transition-all duration-300
                hover:shadow-2xl hover:shadow-gray-300/60 dark:hover:shadow-gray-900/60
                hover:border-transparent
            `}>
                {/* Gradient top bar */}
                <div className={`h-1.5 w-full bg-gradient-to-r ${colors.gradient}`} />

                {/* Background glow effect on hover */}
                <div className={`
                    absolute inset-0 opacity-0 group-hover:opacity-100
                    bg-gradient-to-br ${colors.gradient}
                    transition-opacity duration-500
                    blur-3xl -z-10 scale-150
                `} style={{ opacity: 0.05 }} />

                <div className="p-6">
                    {/* Header: Icon + Stats */}
                    <div className="flex items-start justify-between mb-4">
                        {/* Icon */}
                        <div className={`
                            w-14 h-14 rounded-xl ${colors.bg}
                            flex items-center justify-center
                            group-hover:scale-110 transition-transform duration-300
                            shadow-inner
                        `}>
                            <IconComponent className={`w-7 h-7 ${colors.text}`} strokeWidth={1.5} />
                        </div>

                        {/* Stats badges */}
                        <div className="flex flex-col gap-1.5 items-end">
                            {contentCount > 0 && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    {contentCount}
                                </span>
                            )}
                            {vocabCount > 0 && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                    </svg>
                                    {vocabCount}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                        {displayName}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4 min-h-[40px]">
                        {displayDescription}
                    </p>

                    {/* Progress bar (if user has progress) */}
                    {progress > 0 && (
                        <div className="mb-4">
                            <div className="flex justify-between items-center mb-1.5">
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">İlerleme</span>
                                <span className="text-xs font-bold text-teal-600 dark:text-teal-400">{progress}%</span>
                            </div>
                            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 0.8, delay: index * 0.1 + 0.3 }}
                                    className={`h-full bg-gradient-to-r ${colors.gradient} rounded-full`}
                                />
                            </div>
                        </div>
                    )}

                    {/* Footer: CTA */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700/50">
                        <span className={`text-sm font-semibold ${colors.text} group-hover:translate-x-1 transition-transform`}>
                            Keşfet
                        </span>
                        <motion.div
                            className={`w-8 h-8 rounded-full ${colors.bg} flex items-center justify-center group-hover:bg-gradient-to-r ${colors.gradient} transition-all duration-300`}
                            whileHover={{ scale: 1.1 }}
                        >
                            <svg
                                className={`w-4 h-4 ${colors.text} group-hover:text-white transition-colors`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                            </svg>
                        </motion.div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// Named export for the color/icon utilities
export { SECTOR_ICONS, SECTOR_COLORS, DEFAULT_COLOR };
