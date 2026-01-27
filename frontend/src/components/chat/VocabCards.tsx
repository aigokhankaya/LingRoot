'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';

interface VocabWord {
    word: string;
    pronunciation: string;
    partOfSpeech: string;
    turkishMeaning: string;
    exampleSentence: string;
    exampleTranslation: string;
    tip?: string;
}

interface VocabCardsProps {
    data: {
        words: VocabWord[];
        topic?: string;
        level?: string;
        xpReward: number;
    };
    onComplete: (result: { xpEarned: number }) => void;
}

export const VocabCards: React.FC<VocabCardsProps> = ({ data, onComplete }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [learnedCount, setLearnedCount] = useState(0);
    const [direction, setDirection] = useState<'left' | 'right' | null>(null);

    const words = data.words || [];
    const currentWord = words[currentIndex];
    const isLastCard = currentIndex === words.length - 1;

    const handleFlip = () => {
        setIsFlipped(!isFlipped);
    };

    const handleSwipe = (info: PanInfo) => {
        const threshold = 100;
        if (Math.abs(info.offset.x) > threshold) {
            if (info.offset.x > 0) {
                // Swipe right - learned
                setDirection('right');
                setLearnedCount(prev => prev + 1);
            } else {
                // Swipe left - skip
                setDirection('left');
            }
            goToNext();
        }
    };

    const handleKnow = () => {
        setDirection('right');
        setLearnedCount(prev => prev + 1);
        goToNext();
    };

    const handleSkip = () => {
        setDirection('left');
        goToNext();
    };

    const goToNext = () => {
        setTimeout(() => {
            if (isLastCard) {
                // Complete activity
                const xpEarned = Math.round(data.xpReward * (learnedCount / words.length));
                onComplete({ xpEarned: Math.max(xpEarned, Math.floor(data.xpReward / 2)) });
            } else {
                setCurrentIndex(prev => prev + 1);
                setIsFlipped(false);
                setDirection(null);
            }
        }, 200);
    };

    if (!currentWord) {
        return <div className="text-slate-400 text-center p-4">Kelime bulunamadı</div>;
    }

    return (
        <div className="rounded-2xl bg-slate-800/80 border border-slate-700/50 overflow-hidden">
            {/* Progress bar */}
            <div className="h-1 bg-slate-700">
                <motion.div
                    className="h-full bg-gradient-to-r from-teal-500 to-cyan-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
                />
            </div>

            {/* Card count */}
            <div className="px-4 pt-3 flex justify-between items-center">
                <span className="text-xs text-slate-400">
                    {currentIndex + 1} / {words.length}
                </span>
                <span className="text-xs text-emerald-400">
                    ✓ {learnedCount} öğrenildi
                </span>
            </div>

            {/* Card container */}
            <div className="p-4 perspective-1000">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, x: direction === 'left' ? -100 : direction === 'right' ? 100 : 0 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{
                            opacity: 0,
                            x: direction === 'left' ? -200 : direction === 'right' ? 200 : 0,
                            transition: { duration: 0.2 }
                        }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        onDragEnd={(_, info) => handleSwipe(info)}
                        onClick={handleFlip}
                        className="cursor-pointer"
                        style={{ perspective: 1000 }}
                    >
                        <motion.div
                            animate={{ rotateY: isFlipped ? 180 : 0 }}
                            transition={{ duration: 0.4 }}
                            style={{ transformStyle: 'preserve-3d' }}
                            className="relative min-h-[200px]"
                        >
                            {/* Front of card */}
                            <div
                                className={`absolute inset-0 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800
                                          border border-slate-600 p-6 flex flex-col items-center justify-center
                                          ${isFlipped ? 'invisible' : ''}`}
                                style={{ backfaceVisibility: 'hidden' }}
                            >
                                <span className="text-3xl font-bold text-white mb-2">
                                    {currentWord.word}
                                </span>
                                <span className="text-slate-400 text-sm mb-1">
                                    {currentWord.pronunciation}
                                </span>
                                <span className="text-teal-400 text-xs px-2 py-1 rounded-full bg-teal-500/20">
                                    {currentWord.partOfSpeech}
                                </span>
                                <p className="text-slate-500 text-xs mt-4">
                                    Çevirmek için dokun
                                </p>
                            </div>

                            {/* Back of card */}
                            <div
                                className={`absolute inset-0 rounded-xl bg-gradient-to-br from-teal-900/50 to-slate-800
                                          border border-teal-600/30 p-5 flex flex-col
                                          ${!isFlipped ? 'invisible' : ''}`}
                                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                            >
                                <div className="text-center mb-4">
                                    <span className="text-xl font-semibold text-teal-300">
                                        {currentWord.turkishMeaning}
                                    </span>
                                </div>

                                <div className="bg-slate-800/50 rounded-lg p-3 mb-3">
                                    <p className="text-slate-200 text-sm italic">
                                        "{currentWord.exampleSentence}"
                                    </p>
                                    <p className="text-slate-400 text-xs mt-1">
                                        {currentWord.exampleTranslation}
                                    </p>
                                </div>

                                {currentWord.tip && (
                                    <div className="mt-auto flex items-start gap-2 text-xs">
                                        <span className="text-amber-400">💡</span>
                                        <span className="text-slate-400">{currentWord.tip}</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Action buttons */}
            <div className="px-4 pb-4 flex gap-3">
                <button
                    onClick={handleSkip}
                    className="flex-1 py-3 rounded-xl bg-slate-700/50 text-slate-300 text-sm
                             hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                >
                    <span>←</span>
                    <span>Bilmiyorum</span>
                </button>
                <button
                    onClick={handleKnow}
                    className="flex-1 py-3 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm
                             hover:bg-emerald-500/30 transition-colors flex items-center justify-center gap-2"
                >
                    <span>Biliyorum</span>
                    <span>→</span>
                </button>
            </div>
        </div>
    );
};

export default VocabCards;
