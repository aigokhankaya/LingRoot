'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PhraseVariation {
    english: string;
    turkish: string;
    register: string;
    when: string;
}

interface CommonMistake {
    wrong: string;
    correct: string;
    explanation: string;
}

interface PracticeContext {
    context: string;
    example: string;
    translation: string;
}

interface PhrasePracticeProps {
    data: {
        basePhrase?: {
            english: string;
            turkish: string;
            pronunciation: string;
            register: string;
        };
        variations?: PhraseVariation[];
        commonMistakes?: CommonMistake[];
        practiceContexts?: PracticeContext[];
        xpReward: number;
        [key: string]: unknown;
    };
    onComplete: (result: { xpEarned: number }) => void;
}

type TabType = 'variations' | 'mistakes' | 'contexts';

export const PhrasePractice: React.FC<PhrasePracticeProps> = ({ data, onComplete }) => {
    const basePhrase = data.basePhrase || { english: 'Hello', turkish: 'Merhaba', pronunciation: '/həˈloʊ/', register: 'neutral' };
    const variations = data.variations || [];
    const commonMistakes = data.commonMistakes || [];
    const practiceContexts = data.practiceContexts || [];

    const [activeTab, setActiveTab] = useState<TabType>('variations');
    const [seenTabs, setSeenTabs] = useState<Set<TabType>>(new Set<TabType>(['variations']));

    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        setSeenTabs(prev => new Set(Array.from(prev).concat(tab)));
    };

    const handleComplete = () => {
        // Bonus XP for viewing all tabs
        const bonusMultiplier = seenTabs.size >= 3 ? 1.2 : 1;
        onComplete({
            xpEarned: Math.round(data.xpReward * bonusMultiplier)
        });
    };

    const allTabsSeen = seenTabs.size >= 3;

    const getRegisterBadge = (register: string) => {
        switch (register) {
            case 'formal':
                return { bg: 'bg-blue-500/20', text: 'text-blue-400', label: '🎩 Resmi' };
            case 'informal':
                return { bg: 'bg-orange-500/20', text: 'text-orange-400', label: '👋 Günlük' };
            case 'casual':
                return { bg: 'bg-pink-500/20', text: 'text-pink-400', label: '😎 Arkadaşça' };
            default:
                return { bg: 'bg-slate-500/20', text: 'text-slate-400', label: '📝 Nötr' };
        }
    };

    return (
        <div className="rounded-2xl bg-slate-800/80 border border-slate-700/50 overflow-hidden">
            {/* Base phrase header */}
            <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 p-4 border-b border-slate-700/50">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-xl font-semibold text-white mb-1">
                            "{basePhrase.english}"
                        </h3>
                        <p className="text-sm text-slate-300 mb-2">
                            {basePhrase.turkish}
                        </p>
                        <p className="text-xs text-slate-400 font-mono">
                            {basePhrase.pronunciation}
                        </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${getRegisterBadge(basePhrase.register).bg} ${getRegisterBadge(basePhrase.register).text}`}>
                        {getRegisterBadge(basePhrase.register).label}
                    </span>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-700/50">
                {[
                    { id: 'variations' as TabType, label: 'Varyasyonlar', icon: '🔄' },
                    { id: 'mistakes' as TabType, label: 'Hatalar', icon: '⚠️' },
                    { id: 'contexts' as TabType, label: 'Kullanım', icon: '💡' }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`flex-1 py-3 text-xs font-medium transition-colors relative
                                  ${activeTab === tab.id
                                ? 'text-teal-400 bg-teal-500/10'
                                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/30'}`}
                    >
                        <span className="mr-1">{tab.icon}</span>
                        {tab.label}
                        {seenTabs.has(tab.id) && (
                            <span className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        )}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div className="p-4 min-h-[200px]">
                <AnimatePresence mode="wait">
                    {activeTab === 'variations' && (
                        <motion.div
                            key="variations"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="space-y-3"
                        >
                            {variations.map((variation, i) => {
                                const badge = getRegisterBadge(variation.register);
                                return (
                                    <div
                                        key={i}
                                        className="p-3 rounded-xl bg-slate-700/30 border border-slate-600/50"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <span className="text-teal-300 font-medium">
                                                "{variation.english}"
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs ${badge.bg} ${badge.text}`}>
                                                {badge.label}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-400 mb-1">{variation.turkish}</p>
                                        <p className="text-xs text-slate-500">📌 {variation.when}</p>
                                    </div>
                                );
                            })}
                        </motion.div>
                    )}

                    {activeTab === 'mistakes' && (
                        <motion.div
                            key="mistakes"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="space-y-3"
                        >
                            {commonMistakes.map((mistake, i) => (
                                <div
                                    key={i}
                                    className="p-3 rounded-xl bg-slate-700/30 border border-slate-600/50"
                                >
                                    <div className="flex gap-4 mb-2">
                                        <div className="flex-1">
                                            <span className="text-xs text-red-400 mb-1 block">❌ Yanlış</span>
                                            <span className="text-red-300 line-through">{mistake.wrong}</span>
                                        </div>
                                        <div className="flex-1">
                                            <span className="text-xs text-emerald-400 mb-1 block">✓ Doğru</span>
                                            <span className="text-emerald-300">{mistake.correct}</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-400 pt-2 border-t border-slate-600/30">
                                        💡 {mistake.explanation}
                                    </p>
                                </div>
                            ))}
                        </motion.div>
                    )}

                    {activeTab === 'contexts' && (
                        <motion.div
                            key="contexts"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="space-y-3"
                        >
                            {practiceContexts.map((ctx, i) => (
                                <div
                                    key={i}
                                    className="p-3 rounded-xl bg-slate-700/30 border border-slate-600/50"
                                >
                                    <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-400 mb-2">
                                        📍 {ctx.context}
                                    </span>
                                    <p className="text-teal-300 mb-1">"{ctx.example}"</p>
                                    <p className="text-sm text-slate-400">{ctx.translation}</p>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Complete button */}
            <div className="p-4 border-t border-slate-700/50">
                <button
                    onClick={handleComplete}
                    className={`w-full py-3 rounded-xl text-sm font-medium transition-all
                              ${allTabsSeen
                            ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/25 hover:from-teal-400 hover:to-cyan-400'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                >
                    {allTabsSeen ? 'Tamamla (+%20 bonus XP) 🎉' : 'Tamamla'}
                </button>
                {!allTabsSeen && (
                    <p className="text-xs text-slate-500 text-center mt-2">
                        Tüm sekmeleri gör → +%20 bonus XP
                    </p>
                )}
            </div>
        </div>
    );
};

export default PhrasePractice;
