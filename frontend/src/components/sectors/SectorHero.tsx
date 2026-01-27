'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sector, SECTOR_ICONS, SECTOR_COLORS, DEFAULT_COLOR } from './SectorCard';
import { BookOpen, GraduationCap, Clock, BarChart3, ArrowLeft, Briefcase, LucideIcon, Sparkles, Plus } from 'lucide-react';

interface SectorHeroProps {
    sector: Sector;
    onBack?: () => void;
    onCreateContent?: () => void;  // YENİ
    stats?: {
        totalContent: number;
        totalVocabulary: number;
        estimatedMinutes: number;
        userProgress: number;
    };
}

export default function SectorHero({ sector, onBack, onCreateContent, stats }: SectorHeroProps) {
    const IconComponent = (SECTOR_ICONS[sector.code] || Briefcase) as LucideIcon;
    const colors = SECTOR_COLORS[sector.code] || DEFAULT_COLOR;

    const displayName = sector.name_tr || sector.name || 'Sektör';
    const displayDescription = sector.description_tr || sector.description || '';

    const defaultStats = {
        totalContent: stats?.totalContent ?? sector.content_count ?? 0,
        totalVocabulary: stats?.totalVocabulary ?? sector.vocabulary_count ?? 0,
        estimatedMinutes: stats?.estimatedMinutes ?? 120,
        userProgress: stats?.userProgress ?? sector.user_progress ?? 0,
    };

    return (
        <div className="relative overflow-hidden">
            {/* Background gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-5 dark:opacity-10`} />

            {/* Decorative circles */}
            <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gradient-to-br from-teal-400/20 to-transparent blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-gradient-to-tr from-orange-400/20 to-transparent blur-3xl" />

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
                {/* Back button */}
                {onBack && (
                    <motion.button
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={onBack}
                        className="group flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 mb-6 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-medium">Tüm Sektörler</span>
                    </motion.button>
                )}

                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                    {/* Left: Info */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex-1"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            {/* Icon */}
                            <div className={`
                                w-16 h-16 lg:w-20 lg:h-20 rounded-2xl 
                                bg-gradient-to-br ${colors.gradient}
                                flex items-center justify-center
                                shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50
                            `}>
                                <IconComponent className="w-8 h-8 lg:w-10 lg:h-10 text-white" strokeWidth={1.5} />
                            </div>

                            {/* Title */}
                            <div>
                                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
                                    {displayName}
                                </h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Sektörel İngilizce Eğitimi
                                </p>
                            </div>
                        </div>

                        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mb-4">
                            {displayDescription}
                        </p>

                        {/* Create Content Button */}
                        {onCreateContent && (
                            <motion.button
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={onCreateContent}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-semibold shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 transition-all"
                            >
                                <Plus className="w-5 h-5" />
                                <span>İçerik Oluştur</span>
                                <Sparkles className="w-4 h-4 ml-1" />
                            </motion.button>
                        )}
                    </motion.div>

                    {/* Right: Stats Grid */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
                    >
                        {/* Content Count */}
                        <div className="bg-white dark:bg-gray-800/80 rounded-xl p-4 shadow-lg border border-gray-100 dark:border-gray-700/50 backdrop-blur-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                                    <BookOpen className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{defaultStats.totalContent}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">İçerik</p>
                                </div>
                            </div>
                        </div>

                        {/* Vocabulary Count */}
                        <div className="bg-white dark:bg-gray-800/80 rounded-xl p-4 shadow-lg border border-gray-100 dark:border-gray-700/50 backdrop-blur-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
                                    <GraduationCap className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{defaultStats.totalVocabulary}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Terim</p>
                                </div>
                            </div>
                        </div>

                        {/* Duration */}
                        <div className="bg-white dark:bg-gray-800/80 rounded-xl p-4 shadow-lg border border-gray-100 dark:border-gray-700/50 backdrop-blur-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                                    <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">~{defaultStats.estimatedMinutes}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Dakika</p>
                                </div>
                            </div>
                        </div>

                        {/* Progress */}
                        <div className="bg-white dark:bg-gray-800/80 rounded-xl p-4 shadow-lg border border-gray-100 dark:border-gray-700/50 backdrop-blur-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                                    <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{defaultStats.userProgress}%</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">İlerleme</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
