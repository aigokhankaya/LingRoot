'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ContentRecommendationCardProps {
    recommendation: {
        type: string;
        trigger: string;
        format: string;
        topic?: string;
        text: string;
        cta: string;
        dismissText: string;
        suggestedFormats?: string[];
        showTopicList?: boolean;
    };
    onAccept: (format?: string) => void;
    onDismiss: () => void;
    conversationTopics?: string[];
}

const formatIcons: Record<string, string> = {
    podcast: '🎙️',
    metin: '📝',
    diyalog: '💬'
};

const formatLabels: Record<string, string> = {
    podcast: 'Podcast',
    metin: 'Metin',
    diyalog: 'Diyalog'
};

export const ContentRecommendationCard: React.FC<ContentRecommendationCardProps> = ({
    recommendation,
    onAccept,
    onDismiss,
    conversationTopics = []
}) => {
    const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
    const [showFormats, setShowFormats] = useState(false);

    const handleAccept = () => {
        if (recommendation.suggestedFormats && recommendation.suggestedFormats.length > 0) {
            setShowFormats(true);
        } else {
            onAccept();
        }
    };

    const handleFormatSelect = (format: string) => {
        setSelectedFormat(format);
        onAccept(format);
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="my-4 mx-2"
            >
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 via-cyan-500 to-teal-600 p-[2px] shadow-lg shadow-teal-500/20">
                    <div className="rounded-2xl bg-slate-900/95 backdrop-blur-sm p-4">
                        {/* Sparkle decoration */}
                        <div className="absolute top-3 right-3 text-xl opacity-60">✨</div>

                        {/* Main text */}
                        <p className="text-slate-100 text-sm leading-relaxed pr-8">
                            {recommendation.text}
                        </p>

                        {/* Topic list (for session end) */}
                        {recommendation.showTopicList && conversationTopics.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {conversationTopics.slice(0, 4).map((topic, i) => (
                                    <button
                                        key={i}
                                        onClick={() => onAccept()}
                                        className="px-3 py-1.5 text-xs rounded-full bg-teal-500/20 text-teal-300
                                                 border border-teal-500/30 hover:bg-teal-500/30 transition-colors"
                                    >
                                        {topic}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Format selection */}
                        <AnimatePresence>
                            {showFormats && recommendation.suggestedFormats && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-4 pt-4 border-t border-slate-700/50"
                                >
                                    <p className="text-slate-400 text-xs mb-3">Format seç:</p>
                                    <div className="flex gap-2">
                                        {recommendation.suggestedFormats.map((format) => (
                                            <button
                                                key={format}
                                                onClick={() => handleFormatSelect(format)}
                                                className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl
                                                          border transition-all duration-200
                                                          ${selectedFormat === format
                                                        ? 'bg-teal-500/30 border-teal-400 text-teal-300'
                                                        : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                                                    }`}
                                            >
                                                <span className="text-2xl">{formatIcons[format] || '📄'}</span>
                                                <span className="text-xs font-medium">{formatLabels[format] || format}</span>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Action buttons */}
                        {!showFormats && (
                            <div className="mt-4 flex gap-2">
                                <button
                                    onClick={handleAccept}
                                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500
                                             text-white text-sm font-medium shadow-lg shadow-teal-500/25
                                             hover:from-teal-400 hover:to-cyan-400 transition-all duration-200
                                             active:scale-[0.98]"
                                >
                                    {recommendation.cta}
                                </button>
                                <button
                                    onClick={onDismiss}
                                    className="py-2.5 px-4 rounded-xl bg-slate-800/80 text-slate-400 text-sm
                                             hover:bg-slate-700 hover:text-slate-300 transition-colors"
                                >
                                    {recommendation.dismissText}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ContentRecommendationCard;
