'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Podcast,
    FileText,
    MessageSquare,
    Video,
    Sparkles,
    ArrowRight,
    X
} from 'lucide-react';
import RoleplayCreator from './RoleplayCreator';
import PodcastCreator from './PodcastCreator';

// İçerik türleri
const CONTENT_TYPES = [
    {
        id: 'roleplay',
        name: 'İş Senaryosu',
        description: 'Rol tabanlı iş diyalogları oluştur',
        icon: Users,
        gradient: 'from-teal-500 to-cyan-500',
        bgGradient: 'from-teal-500/10 to-cyan-500/10',
        features: ['Özelleştirilebilir roller', 'Her role farklı ses', 'Gerçekçi iş senaryoları']
    },
    {
        id: 'podcast',
        name: 'Sektör Podcast',
        description: 'AI ile sektör haberleri ve analizler',
        icon: Podcast,
        gradient: 'from-purple-500 to-pink-500',
        bgGradient: 'from-purple-500/10 to-pink-500/10',
        features: ['Güncel sektör bilgisi', 'Haber ve analiz formatı', 'Profesyonel sunum']
    },
    {
        id: 'article',
        name: 'Makale',
        description: 'Sektörel blog ve makaleler',
        icon: FileText,
        gradient: 'from-blue-500 to-indigo-500',
        bgGradient: 'from-blue-500/10 to-indigo-500/10',
        features: ['Okuma pratiği', 'Kelime öğrenimi', 'Anlama soruları'],
        comingSoon: true
    },
    {
        id: 'meeting',
        name: 'Toplantı Simülasyonu',
        description: 'İş toplantısı senaryoları',
        icon: Video,
        gradient: 'from-orange-500 to-amber-500',
        bgGradient: 'from-orange-500/10 to-amber-500/10',
        features: ['Çok katılımcılı', 'Sunum pratiği', 'Tartışma becerileri'],
        comingSoon: true
    }
];

interface SectorContentCreatorProps {
    sectorId: number;
    sectorName: string;
    sectorCode: string;
    isOpen: boolean;
    onClose: () => void;
    onContentCreated?: (content: any) => void;
}

export default function SectorContentCreator({
    sectorId,
    sectorName,
    sectorCode,
    isOpen,
    onClose,
    onContentCreated
}: SectorContentCreatorProps) {
    const [selectedType, setSelectedType] = useState<string | null>(null);

    const handleContentCreated = (content: any) => {
        onContentCreated?.(content);
    };

    const handleBack = () => {
        setSelectedType(null);
    };

    if (!isOpen) return null;

    // Eğer bir tür seçildiyse, ilgili creator'ı göster
    if (selectedType === 'roleplay') {
        return (
            <RoleplayCreator
                sectorId={sectorId}
                sectorName={sectorName}
                sectorCode={sectorCode}
                onClose={() => {
                    setSelectedType(null);
                    onClose();
                }}
                onContentCreated={handleContentCreated}
            />
        );
    }

    if (selectedType === 'podcast') {
        return (
            <PodcastCreator
                sectorId={sectorId}
                sectorName={sectorName}
                sectorCode={sectorCode}
                onClose={() => {
                    setSelectedType(null);
                    onClose();
                }}
                onContentCreated={handleContentCreated}
            />
        );
    }

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ type: "spring", damping: 25 }}
                    className="relative w-full max-w-3xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="relative px-8 pt-8 pb-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-b border-gray-100 dark:border-gray-800">
                        {/* Background decoration */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-teal-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-gradient-to-tr from-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

                        <div className="relative z-10 flex items-start justify-between">
                            <div>
                                <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border border-teal-200 dark:border-teal-800 rounded-full">
                                    <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                    <span className="text-xs font-semibold text-teal-700 dark:text-teal-300">
                                        AI Destekli İçerik
                                    </span>
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    Yeni İçerik Oluştur
                                </h2>
                                <p className="text-gray-600 dark:text-gray-400 mt-1">
                                    <span className="font-medium text-teal-600 dark:text-teal-400">{sectorName}</span> sektörü için özelleştirilmiş içerik
                                </p>
                            </div>

                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                    </div>

                    {/* Content Types Grid */}
                    <div className="p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {CONTENT_TYPES.map((type, index) => {
                                const Icon = type.icon;
                                return (
                                    <motion.button
                                        key={type.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        whileHover={{ scale: type.comingSoon ? 1 : 1.02, y: type.comingSoon ? 0 : -4 }}
                                        whileTap={{ scale: type.comingSoon ? 1 : 0.98 }}
                                        onClick={() => !type.comingSoon && setSelectedType(type.id)}
                                        disabled={type.comingSoon}
                                        className={`
                                            group relative p-5 rounded-2xl border-2 text-left transition-all overflow-hidden
                                            ${type.comingSoon
                                                ? 'border-gray-200 dark:border-gray-700 opacity-60 cursor-not-allowed'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-transparent hover:shadow-xl'
                                            }
                                        `}
                                    >
                                        {/* Background gradient on hover */}
                                        {!type.comingSoon && (
                                            <div className={`
                                                absolute inset-0 opacity-0 group-hover:opacity-100 
                                                bg-gradient-to-br ${type.bgGradient}
                                                transition-opacity duration-300
                                            `} />
                                        )}

                                        {/* Coming soon badge */}
                                        {type.comingSoon && (
                                            <div className="absolute top-3 right-3 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                                    Yakında
                                                </span>
                                            </div>
                                        )}

                                        <div className="relative z-10">
                                            {/* Icon */}
                                            <div className={`
                                                w-12 h-12 rounded-xl flex items-center justify-center mb-4
                                                bg-gradient-to-br ${type.gradient}
                                                shadow-lg
                                            `}>
                                                <Icon className="w-6 h-6 text-white" />
                                            </div>

                                            {/* Title & Description */}
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                                                {type.name}
                                            </h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                                {type.description}
                                            </p>

                                            {/* Features */}
                                            <div className="flex flex-wrap gap-1.5">
                                                {type.features.map((feature, i) => (
                                                    <span
                                                        key={i}
                                                        className="inline-flex items-center px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-[10px] font-medium text-gray-600 dark:text-gray-400"
                                                    >
                                                        {feature}
                                                    </span>
                                                ))}
                                            </div>

                                            {/* Arrow indicator */}
                                            {!type.comingSoon && (
                                                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ArrowRight className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                                                </div>
                                            )}
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
                        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                            AI ile oluşturulan içerikler sektörünüze özel terminoloji ve senaryolar içerir
                        </p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
