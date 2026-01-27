'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import VocabCards from './VocabCards';
import QuickQuiz from './QuickQuiz';
import RoleplayDialogue from './RoleplayDialogue';
import PhrasePractice from './PhrasePractice';

export type ActivityType = 'quick_vocab' | 'mini_roleplay' | 'instant_quiz' | 'phrase_practice';

interface MiniActivityProps {
    activity: {
        type: ActivityType;
        xpReward: number;
        estimatedTime: string;
        [key: string]: unknown;
    };
    onComplete: (result: ActivityResult) => void;
    onSkip: () => void;
}

export interface ActivityResult {
    type: ActivityType;
    completed: boolean;
    score?: number;
    totalQuestions?: number;
    xpEarned: number;
    timeSpent?: number;
}

export const MiniActivity: React.FC<MiniActivityProps> = ({
    activity,
    onComplete,
    onSkip
}) => {
    const [isStarted, setIsStarted] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [result, setResult] = useState<ActivityResult | null>(null);

    const handleStart = () => {
        setIsStarted(true);
    };

    const handleActivityComplete = (activityResult: Partial<ActivityResult>) => {
        const finalResult: ActivityResult = {
            type: activity.type,
            completed: true,
            xpEarned: activityResult.xpEarned || activity.xpReward,
            ...activityResult
        };
        setResult(finalResult);
        setIsCompleted(true);

        // Delay to show completion state
        setTimeout(() => {
            onComplete(finalResult);
        }, 2000);
    };

    const getActivityTitle = () => {
        switch (activity.type) {
            case 'quick_vocab': return 'Hızlı Kelime';
            case 'mini_roleplay': return 'Mini Roleplay';
            case 'instant_quiz': return 'Anlık Quiz';
            case 'phrase_practice': return 'İfade Pratiği';
            default: return 'Aktivite';
        }
    };

    const getActivityIcon = () => {
        switch (activity.type) {
            case 'quick_vocab': return '📚';
            case 'mini_roleplay': return '💬';
            case 'instant_quiz': return '❓';
            case 'phrase_practice': return '📝';
            default: return '🎯';
        }
    };

    const renderActivity = () => {
        switch (activity.type) {
            case 'quick_vocab':
                return <VocabCards data={activity} onComplete={handleActivityComplete} />;
            case 'instant_quiz':
                return <QuickQuiz data={activity} onComplete={handleActivityComplete} />;
            case 'mini_roleplay':
                return <RoleplayDialogue data={activity} onComplete={handleActivityComplete} />;
            case 'phrase_practice':
                return <PhrasePractice data={activity} onComplete={handleActivityComplete} />;
            default:
                return <div className="text-slate-400">Bilinmeyen aktivite tipi</div>;
        }
    };

    // Completion state
    if (isCompleted && result) {
        return (
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="my-4 mx-2"
            >
                <div className="rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 p-6 text-center">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring' }}
                        className="text-5xl mb-3"
                    >
                        🎉
                    </motion.div>
                    <h3 className="text-lg font-semibold text-emerald-400 mb-2">
                        Tebrikler!
                    </h3>
                    <p className="text-slate-300 text-sm mb-3">
                        {activity.type === 'instant_quiz' && result.score !== undefined
                            ? `${result.score}/${result.totalQuestions} doğru cevap!`
                            : 'Aktiviteyi tamamladın!'
                        }
                    </p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 text-amber-400">
                        <span className="text-lg">⭐</span>
                        <span className="font-bold">+{result.xpEarned} XP</span>
                    </div>
                </div>
            </motion.div>
        );
    }

    // Started state - show activity content
    if (isStarted) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="my-4 mx-2"
            >
                {renderActivity()}
            </motion.div>
        );
    }

    // Initial state - show preview
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="my-4 mx-2"
        >
            <div className="rounded-2xl bg-slate-800/80 border border-slate-700/50 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-teal-500/20 to-cyan-500/20 px-4 py-3 border-b border-slate-700/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">{getActivityIcon()}</span>
                            <div>
                                <h3 className="text-sm font-semibold text-slate-100">
                                    {getActivityTitle()}
                                </h3>
                                <p className="text-xs text-slate-400">
                                    {activity.estimatedTime} • {activity.xpReward} XP
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20">
                            <span className="text-amber-400 text-xs">⭐ {activity.xpReward}</span>
                        </div>
                    </div>
                </div>

                {/* Preview content */}
                <div className="p-4">
                    <p className="text-slate-300 text-sm mb-4">
                        {activity.type === 'quick_vocab' && `${(activity as { words?: unknown[] }).words?.length || 3} kelime öğren`}
                        {activity.type === 'instant_quiz' && `${(activity as { questions?: unknown[] }).questions?.length || 3} soruluk hızlı quiz`}
                        {activity.type === 'mini_roleplay' && 'Kısa bir diyalog pratiği yap'}
                        {activity.type === 'phrase_practice' && 'Faydalı ifade varyasyonları öğren'}
                    </p>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleStart}
                            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500
                                     text-white text-sm font-medium shadow-lg shadow-teal-500/25
                                     hover:from-teal-400 hover:to-cyan-400 transition-all duration-200
                                     active:scale-[0.98]"
                        >
                            Başla
                        </button>
                        <button
                            onClick={onSkip}
                            className="py-2.5 px-4 rounded-xl bg-slate-700/50 text-slate-400 text-sm
                                     hover:bg-slate-700 hover:text-slate-300 transition-colors"
                        >
                            Geç
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default MiniActivity;
