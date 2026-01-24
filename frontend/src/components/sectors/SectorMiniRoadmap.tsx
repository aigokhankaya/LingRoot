'use client';

/**
 * Sector Mini Roadmap
 *
 * Kullanicinin sektor ogrenme yolculugunu gosteren
 * kompakt roadmap komponenti.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    BookOpen,
    MessageSquare,
    Mic,
    FileText,
    CheckCircle,
    Lock,
    Play,
    ChevronRight,
    Sparkles
} from 'lucide-react';

interface RoadmapNode {
    id: number;
    title: string;
    type: 'vocabulary' | 'article' | 'dialogue' | 'podcast' | 'quiz';
    status: 'locked' | 'available' | 'in_progress' | 'completed';
    xp_reward: number;
    order_index: number;
}

interface SectorMiniRoadmapProps {
    sectorId: number;
    sectorName?: string;
    nodes?: RoadmapNode[];
    maxNodes?: number;
    className?: string;
}

// Content type icons
const TYPE_ICONS: Record<string, React.ReactNode> = {
    vocabulary: <BookOpen className="w-4 h-4" />,
    article: <FileText className="w-4 h-4" />,
    dialogue: <MessageSquare className="w-4 h-4" />,
    podcast: <Mic className="w-4 h-4" />,
    quiz: <Sparkles className="w-4 h-4" />,
};

// Status colors
const STATUS_COLORS = {
    locked: 'bg-gray-200 dark:bg-gray-700 text-gray-400',
    available: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 ring-2 ring-teal-500',
    in_progress: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 ring-2 ring-yellow-500',
    completed: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
};

// Mock data for demo
const MOCK_NODES: RoadmapNode[] = [
    { id: 1, title: 'Temel Terminoloji', type: 'vocabulary', status: 'completed', xp_reward: 50, order_index: 1 },
    { id: 2, title: 'Is Iletisimi', type: 'article', status: 'completed', xp_reward: 75, order_index: 2 },
    { id: 3, title: 'Toplanti Diyalogu', type: 'dialogue', status: 'in_progress', xp_reward: 100, order_index: 3 },
    { id: 4, title: 'Sektor Haberleri', type: 'podcast', status: 'available', xp_reward: 80, order_index: 4 },
    { id: 5, title: 'Degerlendirme', type: 'quiz', status: 'locked', xp_reward: 150, order_index: 5 },
];

export function SectorMiniRoadmap({
    sectorId,
    sectorName,
    nodes: propNodes,
    maxNodes = 5,
    className = ''
}: SectorMiniRoadmapProps) {
    const [nodes, setNodes] = useState<RoadmapNode[]>(propNodes || MOCK_NODES);
    const [loading, setLoading] = useState(!propNodes);

    useEffect(() => {
        if (!propNodes) {
            loadRoadmap();
        }
    }, [sectorId, propNodes]);

    const loadRoadmap = async () => {
        try {
            setLoading(true);
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
            const token = typeof window !== 'undefined' ? localStorage.getItem('lingroot_token') : null;

            const response = await fetch(`${API_BASE}/api/sectors/${sectorId}/content?limit=${maxNodes}&sort=order`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });

            const data = await response.json();

            if (data.success && Array.isArray(data.data)) {
                // Map content to roadmap nodes
                const mappedNodes: RoadmapNode[] = data.data.map((item: any, index: number) => ({
                    id: item.id,
                    title: item.title,
                    type: mapContentType(item.content_type),
                    status: item.user_progress?.status || (index === 0 ? 'available' : 'locked'),
                    xp_reward: item.xp_reward || 50,
                    order_index: item.order_index || index + 1
                }));
                setNodes(mappedNodes);
            }
        } catch (error) {
            console.error('Error loading roadmap:', error);
            // Keep mock data on error
        } finally {
            setLoading(false);
        }
    };

    const mapContentType = (type: string): RoadmapNode['type'] => {
        const typeMap: Record<string, RoadmapNode['type']> = {
            'sector_article': 'article',
            'business_roleplay': 'dialogue',
            'sector_podcast': 'podcast',
            'quiz': 'quiz',
            'vocabulary_focus': 'vocabulary'
        };
        return typeMap[type] || 'article';
    };

    const getNodeLink = (node: RoadmapNode): string => {
        if (node.status === 'locked') return '#';
        return `/sectors/content/${node.id}`;
    };

    const completedCount = nodes.filter(n => n.status === 'completed').length;
    const progressPercent = nodes.length > 0 ? Math.round((completedCount / nodes.length) * 100) : 0;

    if (loading) {
        return (
            <div className={`bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 ${className}`}>
                <div className="animate-pulse">
                    <div className="h-5 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                                <div className="flex-1 h-4 bg-gray-200 rounded"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 ${className}`}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-teal-500" />
                    Ogrenme Yolu
                </h3>
                <span className="text-xs font-medium text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-2 py-1 rounded-full">
                    %{progressPercent} Tamamlandi
                </span>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full mb-5 overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full"
                />
            </div>

            {/* Roadmap Nodes */}
            <div className="space-y-1">
                {nodes.slice(0, maxNodes).map((node, index) => {
                    const isLast = index === nodes.slice(0, maxNodes).length - 1;
                    const isClickable = node.status !== 'locked';

                    return (
                        <div key={node.id} className="relative">
                            {/* Connector Line */}
                            {!isLast && (
                                <div className="absolute left-5 top-10 w-0.5 h-6 bg-gray-200 dark:bg-gray-700">
                                    {node.status === 'completed' && (
                                        <div className="w-full h-full bg-green-400" />
                                    )}
                                </div>
                            )}

                            {/* Node */}
                            <Link
                                href={getNodeLink(node)}
                                className={`flex items-center gap-3 p-2 rounded-xl transition-all ${
                                    isClickable
                                        ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer'
                                        : 'cursor-not-allowed opacity-60'
                                }`}
                                onClick={e => !isClickable && e.preventDefault()}
                            >
                                {/* Status Circle */}
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${STATUS_COLORS[node.status]}`}>
                                    {node.status === 'completed' ? (
                                        <CheckCircle className="w-5 h-5" />
                                    ) : node.status === 'locked' ? (
                                        <Lock className="w-4 h-4" />
                                    ) : node.status === 'in_progress' ? (
                                        <Play className="w-4 h-4" />
                                    ) : (
                                        TYPE_ICONS[node.type] || <BookOpen className="w-4 h-4" />
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <h4 className={`text-sm font-medium truncate ${
                                        node.status === 'completed'
                                            ? 'text-gray-500 dark:text-gray-400 line-through'
                                            : node.status === 'locked'
                                                ? 'text-gray-400 dark:text-gray-500'
                                                : 'text-gray-800 dark:text-gray-200'
                                    }`}>
                                        {node.title}
                                    </h4>
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                        <span className="capitalize">{node.type}</span>
                                        <span>|</span>
                                        <span>+{node.xp_reward} XP</span>
                                    </div>
                                </div>

                                {/* Action */}
                                {isClickable && node.status !== 'completed' && (
                                    <ChevronRight className="w-4 h-4 text-gray-400" />
                                )}
                            </Link>
                        </div>
                    );
                })}
            </div>

            {/* View All Link */}
            <Link
                href={`/sectors/${sectorId}`}
                className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
            >
                Tum Icerikleri Gor
                <ChevronRight className="w-4 h-4" />
            </Link>
        </motion.div>
    );
}

export default SectorMiniRoadmap;
