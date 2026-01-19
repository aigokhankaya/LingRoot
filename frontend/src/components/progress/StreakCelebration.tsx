/**
 * 🔥 Streak Celebration Component
 * 
 * Streak milestone'larında gösterilecek kutlama animasyonu
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StreakCelebrationProps {
    streak: number;
    isVisible: boolean;
    onComplete?: () => void;
}

const milestoneMessages: Record<number, { emoji: string; title: string; subtitle: string }> = {
    3: { emoji: '🔥', title: '3 Gün Serisi!', subtitle: 'Harika bir başlangıç!' },
    7: { emoji: '⚡', title: 'Bir Hafta!', subtitle: 'Tutarlılık anahtardır.' },
    14: { emoji: '💪', title: '2 Hafta Seri!', subtitle: 'Durdurulamıyorsun!' },
    30: { emoji: '🏆', title: 'Bir Ay!', subtitle: 'Efsane oldun!' },
    60: { emoji: '👑', title: '60 Gün!', subtitle: 'Gerçek bir şampiyon!' },
    90: { emoji: '🌟', title: '90 Gün Serisi!', subtitle: 'İnanılmaz disiplin!' },
    100: { emoji: '💯', title: '100 GÜN!', subtitle: 'MUTLAK EFSANE!' },
    365: { emoji: '🎆', title: 'BİR YIL!', subtitle: 'Tarihe geçtin!' }
};

const StreakCelebration: React.FC<StreakCelebrationProps> = ({ streak, isVisible, onComplete }) => {
    const [particles, setParticles] = useState<number[]>([]);

    // Find milestone message
    const milestone = milestoneMessages[streak] || null;

    useEffect(() => {
        if (isVisible && milestone) {
            // Generate confetti particles
            setParticles(Array.from({ length: 50 }, (_, i) => i));

            // Auto dismiss after 3 seconds
            const timer = setTimeout(() => {
                onComplete?.();
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [isVisible, milestone, onComplete]);

    if (!milestone) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={onComplete}
                >
                    {/* Confetti Particles */}
                    {particles.map((i) => (
                        <motion.div
                            key={i}
                            initial={{
                                x: Math.random() * window.innerWidth,
                                y: -20,
                                rotate: 0,
                                scale: Math.random() * 0.5 + 0.5
                            }}
                            animate={{
                                y: window.innerHeight + 20,
                                rotate: Math.random() * 720 - 360,
                                x: Math.random() * window.innerWidth
                            }}
                            transition={{
                                duration: Math.random() * 2 + 2,
                                ease: 'linear'
                            }}
                            className="absolute w-3 h-3 rounded-sm"
                            style={{
                                backgroundColor: ['#f59e0b', '#ef4444', '#22c55e', '#3b82f6', '#a855f7'][Math.floor(Math.random() * 5)]
                            }}
                        />
                    ))}

                    {/* Celebration Card */}
                    <motion.div
                        initial={{ scale: 0.5, y: 50 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.5, y: 50 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        className="relative bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-8 text-center shadow-2xl"
                    >
                        {/* Glow Effect */}
                        <div className="absolute inset-0 rounded-3xl bg-amber-400 blur-xl opacity-50 -z-10" />

                        {/* Emoji */}
                        <motion.div
                            animate={{
                                scale: [1, 1.2, 1],
                                rotate: [0, -10, 10, 0]
                            }}
                            transition={{
                                duration: 0.5,
                                repeat: Infinity,
                                repeatDelay: 1
                            }}
                            className="text-7xl mb-4"
                        >
                            {milestone.emoji}
                        </motion.div>

                        {/* Streak Number */}
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: 'spring' }}
                            className="text-6xl font-black text-white mb-2"
                        >
                            {streak}
                        </motion.div>

                        {/* Title */}
                        <h2 className="text-2xl font-bold text-white mb-1">
                            {milestone.title}
                        </h2>

                        {/* Subtitle */}
                        <p className="text-amber-100 text-sm">
                            {milestone.subtitle}
                        </p>

                        {/* Tap to dismiss hint */}
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.7 }}
                            transition={{ delay: 1 }}
                            className="mt-6 text-xs text-amber-100"
                        >
                            Devam etmek için dokun
                        </motion.p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default StreakCelebration;
