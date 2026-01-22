'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
    MessageSquare,
    FileText,
    Users,
    Mail,
    Headphones,
    BookOpen,
    Play,
    Clock,
    CheckCircle2,
    ChevronRight
} from 'lucide-react';

// İçerik tipleri ve renkleri
const CONTENT_TYPE_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string; bgColor: string }> = {
    'dialogue': { icon: MessageSquare, label: 'Diyalog', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/40' },
    'scenario': { icon: Users, label: 'Senaryo', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/40' },
    'article': { icon: FileText, label: 'Makale', color: 'text-emerald-600', bgColor: 'bg-emerald-100 dark:bg-emerald-900/40' },
    'email': { icon: Mail, label: 'E-posta', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/40' },
    'listening': { icon: Headphones, label: 'Dinleme', color: 'text-pink-600', bgColor: 'bg-pink-100 dark:bg-pink-900/40' },
    'reading': { icon: BookOpen, label: 'Okuma', color: 'text-teal-600', bgColor: 'bg-teal-100 dark:bg-teal-900/40' },
};

// CEFR seviyeleri ve renkleri
const LEVEL_COLORS: Record<string, { text: string; bg: string; border: string }> = {
    'A1': { text: 'text-green-700', bg: 'bg-green-100', border: 'border-green-200' },
    'A2': { text: 'text-lime-700', bg: 'bg-lime-100', border: 'border-lime-200' },
    'B1': { text: 'text-yellow-700', bg: 'bg-yellow-100', border: 'border-yellow-200' },
    'B2': { text: 'text-orange-700', bg: 'bg-orange-100', border: 'border-orange-200' },
    'C1': { text: 'text-red-700', bg: 'bg-red-100', border: 'border-red-200' },
    'C2': { text: 'text-rose-700', bg: 'bg-rose-100', border: 'border-rose-200' },
};

export interface ContentItem {
    id: string | number;
    title: string;
    content_type?: string;
    type?: string;
    cefr_level?: string;
    level?: string;
    estimated_minutes?: number;
    duration_minutes?: number;
    word_count?: number;
    key_vocabulary?: string[];
    is_completed?: boolean;
    progress_percentage?: number;
    audio_url?: string;
    description?: string;
}

interface ContentCardProps {
    content: ContentItem;
    onClick?: () => void;
    index?: number;
}

export default function ContentCard({ content, onClick, index = 0 }: ContentCardProps) {
    const contentType = content.content_type || content.type || 'article';
    const typeConfig = CONTENT_TYPE_CONFIG[contentType] || CONTENT_TYPE_CONFIG['article'];
    const IconComponent = typeConfig.icon;

    const level = content.cefr_level || content.level || 'B1';
    const levelColors = LEVEL_COLORS[level] || LEVEL_COLORS['B1'];

    const duration = content.estimated_minutes || content.duration_minutes || 5;
    const isCompleted = content.is_completed || false;
    const hasAudio = !!content.audio_url;
    const progress = content.progress_percentage || 0;

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.99 }}
            onClick={onClick}
            className="group cursor-pointer"
        >
            <div className={`
                relative overflow-hidden rounded-xl
                bg-white dark:bg-gray-800/80
                border border-gray-100 dark:border-gray-700/50
                shadow-sm hover:shadow-lg
                transition-all duration-300
                ${isCompleted ? 'ring-2 ring-emerald-200 dark:ring-emerald-800' : ''}
            `}>
                {/* Progress bar at top if in progress */}
                {progress > 0 && progress < 100 && (
                    <div className="h-1 bg-gray-100 dark:bg-gray-700">
                        <div
                            className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}

                <div className="p-4 lg:p-5 flex items-center gap-4">
                    {/* Type Icon */}
                    <div className={`
                        flex-shrink-0 w-12 h-12 rounded-xl ${typeConfig.bgColor}
                        flex items-center justify-center
                        group-hover:scale-110 transition-transform duration-300
                    `}>
                        <IconComponent className={`w-6 h-6 ${typeConfig.color}`} />
                    </div>

                    {/* Content Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                                {content.title}
                            </h3>
                            {isCompleted && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            )}
                        </div>

                        {/* Tags row */}
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Type badge */}
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${typeConfig.bgColor} ${typeConfig.color}`}>
                                {typeConfig.label}
                            </span>

                            {/* Level badge */}
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${levelColors.bg} ${levelColors.text} border ${levelColors.border}`}>
                                {level}
                            </span>

                            {/* Duration */}
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                <Clock className="w-3.5 h-3.5" />
                                {duration} dk
                            </span>

                            {/* Audio indicator */}
                            {hasAudio && (
                                <span className="inline-flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400">
                                    <Headphones className="w-3.5 h-3.5" />
                                    Sesli
                                </span>
                            )}
                        </div>

                        {/* Key vocabulary preview */}
                        {content.key_vocabulary && content.key_vocabulary.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                                {content.key_vocabulary.slice(0, 3).map((word, i) => (
                                    <span
                                        key={i}
                                        className="inline-block px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
                                    >
                                        {word}
                                    </span>
                                ))}
                                {content.key_vocabulary.length > 3 && (
                                    <span className="text-xs text-gray-400">+{content.key_vocabulary.length - 3}</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Arrow */}
                    <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center group-hover:bg-teal-500 transition-colors">
                            {hasAudio ? (
                                <Play className="w-4 h-4 text-gray-400 group-hover:text-white" />
                            ) : (
                                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-white" />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

export { CONTENT_TYPE_CONFIG, LEVEL_COLORS };
