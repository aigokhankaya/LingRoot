/**
 * 📊 Mastery Progress Card Component
 * 
 * Konu bazlı ilerleme ve ustalık görselleştirmesi
 */

import React from 'react';
import { motion } from 'framer-motion';

interface MasteryProgressCardProps {
    topicName: string;
    masteryScore: number;
    status: 'not_started' | 'in_progress' | 'completed' | 'mastered';
    contentCompleted: number;
    contentTotal: number;
    listeningMinutes: number;
    onClick?: () => void;
}

const statusConfig = {
    not_started: {
        label: 'Başlanmadı',
        badgeClass: 'bg-slate-200 text-slate-700',
        progressClass: 'from-slate-400 to-slate-500',
        icon: '📚',
        bgGradient: 'from-slate-100 to-slate-50',
        ringColor: '#64748b'
    },
    in_progress: {
        label: 'Devam Ediyor',
        badgeClass: 'bg-blue-200 text-blue-700',
        progressClass: 'from-blue-400 to-blue-500',
        icon: '🔄',
        bgGradient: 'from-blue-100 to-blue-50',
        ringColor: '#3b82f6'
    },
    completed: {
        label: 'Tamamlandı',
        badgeClass: 'bg-emerald-200 text-emerald-700',
        progressClass: 'from-emerald-400 to-emerald-500',
        icon: '✅',
        bgGradient: 'from-emerald-100 to-emerald-50',
        ringColor: '#10b981'
    },
    mastered: {
        label: 'Ustalaştı',
        badgeClass: 'bg-amber-200 text-amber-700',
        progressClass: 'from-amber-400 to-amber-500',
        icon: '🏆',
        bgGradient: 'from-amber-100 to-yellow-50',
        ringColor: '#f59e0b'
    }
};

const MasteryProgressCard: React.FC<MasteryProgressCardProps> = ({
    topicName,
    masteryScore,
    status,
    contentCompleted,
    contentTotal,
    listeningMinutes,
    onClick
}) => {
    const config = statusConfig[status] || statusConfig.not_started;
    const progressPercent = contentTotal > 0 ? (contentCompleted / contentTotal) * 100 : 0;

    return (
        <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${config.bgGradient} p-5 cursor-pointer shadow-sm hover:shadow-md transition-shadow`}
        >
            {/* Status Badge */}
            <div className="flex items-center justify-between mb-4">
                <span className="text-2xl">{config.icon}</span>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${config.badgeClass}`}>
                    {config.label}
                </span>
            </div>

            {/* Topic Name */}
            <h3 className="text-lg font-bold text-slate-800 mb-3 line-clamp-2">
                {topicName}
            </h3>

            {/* Mastery Score Ring */}
            <div className="flex items-center gap-4 mb-4">
                <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 -rotate-90">
                        <circle
                            cx="32" cy="32" r="28"
                            stroke="#e2e8f0"
                            strokeWidth="6"
                            fill="none"
                        />
                        <circle
                            cx="32" cy="32" r="28"
                            stroke={config.ringColor}
                            strokeWidth="6"
                            fill="none"
                            strokeDasharray={`${masteryScore * 1.76} 176`}
                            strokeLinecap="round"
                            className="transition-all duration-1000"
                        />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-slate-700">
                        {masteryScore}
                    </span>
                </div>

                <div className="flex-1">
                    <div className="text-xs text-slate-500 mb-1">İçerik İlerlemesi</div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className={`h-full bg-gradient-to-r ${config.progressClass}`}
                        />
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                        {contentCompleted}/{contentTotal} içerik
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                    <span>🎧</span>
                    <span>{listeningMinutes} dk dinlendi</span>
                </div>
            </div>

            {/* Decorative gradient overlay */}
            {status === 'mastered' && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-yellow-200/50 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
            )}
        </motion.div>
    );
};

export default MasteryProgressCard;
