'use client';

/**
 * Vocabulary Game Hub
 *
 * Tüm kelime oyunlarını gösteren ve yönlendiren ana hub.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Layers,
    Shuffle,
    FileText,
    X,
    Trophy,
    Target,
    Sparkles,
    ChevronRight,
    Clock,
    Zap
} from 'lucide-react';
import SectorFlashcardGame from './SectorFlashcardGame';
import WordMatchingGame from './WordMatchingGame';
import FillInBlankGame from './FillInBlankGame';

interface VocabularyGameHubProps {
    sectorId: number;
    sectorName: string;
    sectorIcon?: string;
    sectorColor?: string;
    onClose?: () => void;
}

type GameType = 'flashcard' | 'matching' | 'fillblank' | null;

interface GameInfo {
    id: GameType;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    difficulty: string;
    estimatedTime: string;
    xpRange: string;
}

const GAMES: GameInfo[] = [
    {
        id: 'flashcard',
        title: 'Flashcard',
        description: 'Klasik kart cevirme ile kelime tekrari',
        icon: <Layers className="w-8 h-8" />,
        color: 'text-teal-600',
        bgColor: 'bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border-teal-200 dark:border-teal-800',
        difficulty: 'Kolay',
        estimatedTime: '5-10 dk',
        xpRange: '50-150'
    },
    {
        id: 'matching',
        title: 'Eslestirme',
        description: 'Ingilizce-Turkce kelime eslestir',
        icon: <Shuffle className="w-8 h-8" />,
        color: 'text-purple-600',
        bgColor: 'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800',
        difficulty: 'Orta',
        estimatedTime: '5-8 dk',
        xpRange: '75-200'
    },
    {
        id: 'fillblank',
        title: 'Bosluk Doldur',
        description: 'Cumle icinde dogru kelimeyi sec',
        icon: <FileText className="w-8 h-8" />,
        color: 'text-indigo-600',
        bgColor: 'bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border-indigo-200 dark:border-indigo-800',
        difficulty: 'Zor',
        estimatedTime: '8-12 dk',
        xpRange: '100-250'
    }
];

export function VocabularyGameHub({
    sectorId,
    sectorName,
    sectorIcon = '💼',
    sectorColor = '#14B8A6',
    onClose
}: VocabularyGameHubProps) {
    const [activeGame, setActiveGame] = useState<GameType>(null);
    const [totalXpEarned, setTotalXpEarned] = useState(0);
    const [gamesCompleted, setGamesCompleted] = useState(0);

    const handleGameComplete = (stats: any) => {
        setTotalXpEarned(prev => prev + (stats.xpEarned || 0));
        setGamesCompleted(prev => prev + 1);
    };

    const handleCloseGame = () => {
        setActiveGame(null);
    };

    // Render active game
    if (activeGame) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                {activeGame === 'flashcard' && (
                    <SectorFlashcardGame
                        sectorId={sectorId}
                        sectorName={sectorName}
                        onComplete={handleGameComplete}
                        onClose={handleCloseGame}
                    />
                )}
                {activeGame === 'matching' && (
                    <WordMatchingGame
                        sectorId={sectorId}
                        sectorName={sectorName}
                        onComplete={handleGameComplete}
                        onClose={handleCloseGame}
                    />
                )}
                {activeGame === 'fillblank' && (
                    <FillInBlankGame
                        sectorId={sectorId}
                        sectorName={sectorName}
                        onComplete={handleGameComplete}
                        onClose={handleCloseGame}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
            {/* Header */}
            <div className="max-w-4xl mx-auto mb-8">
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6 text-gray-500" />
                    </button>

                    {/* Session Stats */}
                    {(totalXpEarned > 0 || gamesCompleted > 0) && (
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                                <Sparkles className="w-4 h-4 text-amber-500" />
                                <span className="text-sm font-bold text-amber-600">+{totalXpEarned} XP</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 rounded-full">
                                <Trophy className="w-4 h-4 text-green-500" />
                                <span className="text-sm font-bold text-green-600">{gamesCompleted} oyun</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Title */}
                <div className="text-center mb-8">
                    <div
                        className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center text-4xl"
                        style={{ backgroundColor: `${sectorColor}20` }}
                    >
                        {sectorIcon}
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Kelime Oyunlari
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        {sectorName} terminolojisini eglenerek ogren
                    </p>
                </div>
            </div>

            {/* Games Grid */}
            <div className="max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {GAMES.map((game, index) => (
                        <motion.button
                            key={game.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            onClick={() => setActiveGame(game.id)}
                            className={`relative p-6 rounded-2xl border-2 text-left transition-all hover:shadow-lg hover:scale-[1.02] ${game.bgColor}`}
                        >
                            {/* Icon */}
                            <div className={`mb-4 ${game.color}`}>
                                {game.icon}
                            </div>

                            {/* Title & Description */}
                            <h3 className={`text-xl font-bold mb-2 ${game.color}`}>
                                {game.title}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                                {game.description}
                            </p>

                            {/* Meta */}
                            <div className="flex flex-wrap gap-2 mb-4">
                                <span className="px-2 py-1 bg-white/50 dark:bg-gray-800/50 rounded-full text-xs font-medium text-gray-600 dark:text-gray-400">
                                    {game.difficulty}
                                </span>
                                <span className="flex items-center gap-1 px-2 py-1 bg-white/50 dark:bg-gray-800/50 rounded-full text-xs font-medium text-gray-600 dark:text-gray-400">
                                    <Clock className="w-3 h-3" />
                                    {game.estimatedTime}
                                </span>
                                <span className="flex items-center gap-1 px-2 py-1 bg-amber-100/50 dark:bg-amber-900/30 rounded-full text-xs font-medium text-amber-600">
                                    <Zap className="w-3 h-3" />
                                    {game.xpRange} XP
                                </span>
                            </div>

                            {/* Play Button */}
                            <div className={`flex items-center justify-between ${game.color}`}>
                                <span className="font-medium">Oyna</span>
                                <ChevronRight className="w-5 h-5" />
                            </div>
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Daily Challenge Banner */}
            <div className="max-w-4xl mx-auto mt-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                            <Target className="w-8 h-8" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-lg mb-1">Gunluk Hedef</h3>
                            <p className="text-white/80 text-sm">
                                Bugün 3 oyun tamamla ve bonus XP kazan!
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-3xl font-bold">{gamesCompleted}/3</p>
                            <p className="text-xs text-white/70">tamamlandi</p>
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="mt-4 h-2 bg-white/30 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((gamesCompleted / 3) * 100, 100)}%` }}
                            className="h-full bg-white rounded-full"
                        />
                    </div>
                </motion.div>
            </div>

            {/* Tips */}
            <div className="max-w-4xl mx-auto mt-8">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                    <h4 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-500" />
                        Ipuclari
                    </h4>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <li className="flex items-start gap-2">
                            <span className="text-teal-500">•</span>
                            Flashcard ile baslayarak kelimeleri tani
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-purple-500">•</span>
                            Eslestirme oyunu hiz ve dogrulugu test eder
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-indigo-500">•</span>
                            Bosluk doldurma ile cumle icinde kullanimi ogren
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-amber-500">•</span>
                            Seri yaparak bonus XP kazan!
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default VocabularyGameHub;
