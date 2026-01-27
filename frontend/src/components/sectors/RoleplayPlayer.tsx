'use client';

/**
 * Roleplay Player
 *
 * İnteraktif roleplay pratik komponenti.
 * Adım adım diyalog pratiği, ses kaydı, XP kazanımı.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Play,
    Pause,
    SkipForward,
    SkipBack,
    Mic,
    MicOff,
    Volume2,
    VolumeX,
    Check,
    X,
    RefreshCw,
    ChevronRight,
    Sparkles,
    Trophy,
    Target,
    BookOpen,
    MessageSquare,
    Zap,
    Star,
    Clock,
    Users
} from 'lucide-react';

interface DialogueTurn {
    role_id: string;
    speaker: string;
    english: string;
    turkish: string;
    audio_url?: string;
    key_phrase?: boolean;
    vocabulary?: VocabularyItem[];
}

interface VocabularyItem {
    term: string;
    definition: string;
    example?: string;
}

interface RoleplayPlayerProps {
    contentId: number;
    title: string;
    sectorName: string;
    sectorColor?: string;
    roles: { id: string; title: string; title_en: string; voice: string }[];
    dialogueTurns: DialogueTurn[];
    audioUrl?: string;
    userRole?: string; // Kullanıcının oynayacağı rol
    onComplete?: (stats: RoleplayStats) => void;
    onClose?: () => void;
    onXPEarned?: (xp: number) => void;
}

interface RoleplayStats {
    completedTurns: number;
    totalTurns: number;
    xpEarned: number;
    practiceTime: number;
    vocabularyLearned: string[];
    accuracy?: number;
}

type PlayMode = 'listen' | 'practice' | 'shadow';

const PLAY_MODES = [
    { id: 'listen' as PlayMode, name: 'Dinle', icon: Volume2, description: 'Sadece dinle ve takip et' },
    { id: 'practice' as PlayMode, name: 'Pratik', icon: Mic, description: 'Sırayla konuş' },
    { id: 'shadow' as PlayMode, name: 'Shadow', icon: Users, description: 'Aynı anda tekrar et' }
];

export function RoleplayPlayer({
    contentId,
    title,
    sectorName,
    sectorColor = '#14B8A6',
    roles,
    dialogueTurns,
    audioUrl,
    userRole = 'role_2',
    onComplete,
    onClose,
    onXPEarned
}: RoleplayPlayerProps) {
    // State
    const [playMode, setPlayMode] = useState<PlayMode>('listen');
    const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [showTranslation, setShowTranslation] = useState(true);
    const [completedTurns, setCompletedTurns] = useState<Set<number>>(new Set());
    const [practiceStartTime, setPracticeStartTime] = useState<number | null>(null);
    const [vocabularyLearned, setVocabularyLearned] = useState<Set<string>>(new Set());
    const [selectedVocab, setSelectedVocab] = useState<VocabularyItem | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [earnedXP, setEarnedXP] = useState(0);

    // Refs
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const currentTurn = dialogueTurns[currentTurnIndex];
    const isUserTurn = currentTurn?.role_id === userRole;
    const progress = (completedTurns.size / dialogueTurns.length) * 100;

    // Start timer when practice begins
    useEffect(() => {
        if (!practiceStartTime && (isPlaying || completedTurns.size > 0)) {
            setPracticeStartTime(Date.now());
        }
    }, [isPlaying, completedTurns.size, practiceStartTime]);

    // Auto-scroll to current turn
    useEffect(() => {
        const currentElement = document.getElementById(`turn-${currentTurnIndex}`);
        if (currentElement) {
            currentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [currentTurnIndex]);

    const handlePlayPause = useCallback(() => {
        if (isPlaying) {
            setIsPaused(true);
            setIsPlaying(false);
            audioRef.current?.pause();
        } else {
            setIsPaused(false);
            setIsPlaying(true);
            // In practice mode, play current turn audio if available
            if (currentTurn?.audio_url) {
                const audio = new Audio(currentTurn.audio_url);
                audioRef.current = audio;
                audio.play();
                audio.onended = () => handleNextTurn();
            }
        }
    }, [isPlaying, currentTurn]);

    const handleNextTurn = useCallback(() => {
        // Mark current turn as completed
        setCompletedTurns(prev => new Set([...Array.from(prev), currentTurnIndex]));

        // Calculate XP for this turn
        const turnXP = currentTurn?.key_phrase ? 15 : 10;
        setEarnedXP(prev => prev + turnXP);

        // Move to next turn
        if (currentTurnIndex < dialogueTurns.length - 1) {
            setCurrentTurnIndex(prev => prev + 1);
        } else {
            // Roleplay complete!
            handleComplete();
        }
    }, [currentTurnIndex, dialogueTurns.length, currentTurn]);

    const handlePrevTurn = useCallback(() => {
        if (currentTurnIndex > 0) {
            setCurrentTurnIndex(prev => prev - 1);
        }
    }, [currentTurnIndex]);

    const handleComplete = useCallback(() => {
        setIsCompleted(true);
        setIsPlaying(false);

        const practiceTime = practiceStartTime
            ? Math.floor((Date.now() - practiceStartTime) / 1000)
            : 0;

        // Bonus XP for completion
        const completionBonus = 50;
        const totalXP = earnedXP + completionBonus;
        setEarnedXP(totalXP);
        onXPEarned?.(totalXP);

        const stats: RoleplayStats = {
            completedTurns: completedTurns.size + 1,
            totalTurns: dialogueTurns.length,
            xpEarned: totalXP,
            practiceTime,
            vocabularyLearned: Array.from(vocabularyLearned)
        };

        onComplete?.(stats);
    }, [practiceStartTime, earnedXP, completedTurns.size, dialogueTurns.length, vocabularyLearned, onComplete, onXPEarned]);

    const handleVocabClick = (vocab: VocabularyItem) => {
        setSelectedVocab(vocab);
        setVocabularyLearned(prev => new Set([...Array.from(prev), vocab.term]));
    };

    const handleRestart = () => {
        setCurrentTurnIndex(0);
        setCompletedTurns(new Set());
        setIsCompleted(false);
        setEarnedXP(0);
        setPracticeStartTime(null);
    };

    const toggleRecording = () => {
        setIsRecording(!isRecording);
        // Recording logic would go here
    };

    // Completion Screen
    if (isCompleted) {
        return (
            <div className="fixed inset-0 z-50 bg-gray-900/95 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-3xl overflow-hidden"
                >
                    {/* Success Header */}
                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-8 text-center text-white">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', delay: 0.2 }}
                            className="w-24 h-24 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-4"
                        >
                            <Trophy className="w-12 h-12" />
                        </motion.div>
                        <h2 className="text-2xl font-bold mb-2">Roleplay Tamamlandı!</h2>
                        <p className="text-white/80">{title}</p>
                    </div>

                    {/* Stats */}
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                                <Zap className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                                <p className="text-2xl font-bold text-amber-600">+{earnedXP}</p>
                                <p className="text-xs text-gray-500">XP Kazanıldı</p>
                            </div>
                            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                                <Check className="w-6 h-6 mx-auto mb-2 text-green-500" />
                                <p className="text-2xl font-bold text-green-600">{dialogueTurns.length}</p>
                                <p className="text-xs text-gray-500">Diyalog</p>
                            </div>
                            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                                <BookOpen className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                                <p className="text-2xl font-bold text-blue-600">{vocabularyLearned.size}</p>
                                <p className="text-xs text-gray-500">Kelime</p>
                            </div>
                        </div>

                        {/* Learned Vocabulary */}
                        {vocabularyLearned.size > 0 && (
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Öğrenilen Kelimeler
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {Array.from(vocabularyLearned).map((term, i) => (
                                        <span
                                            key={i}
                                            className="px-2 py-1 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-lg text-sm"
                                        >
                                            {term}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={handleRestart}
                                className="flex-1 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium flex items-center justify-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Tekrar Et
                            </button>
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-semibold"
                            >
                                Tamam
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-900 flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>

                    <div className="text-center">
                        <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
                            {title}
                        </h2>
                        <p className="text-xs text-gray-500">{sectorName}</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-full text-xs font-bold">
                            +{earnedXP} XP
                        </span>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="max-w-4xl mx-auto mt-3">
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full"
                        />
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-gray-500">
                        <span>{completedTurns.size}/{dialogueTurns.length}</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                </div>
            </div>

            {/* Play Mode Selector */}
            <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-2">
                <div className="max-w-4xl mx-auto flex gap-2">
                    {PLAY_MODES.map((mode) => {
                        const Icon = mode.icon;
                        return (
                            <button
                                key={mode.id}
                                onClick={() => setPlayMode(mode.id)}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                                    playMode === mode.id
                                        ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
                                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                <span>{mode.name}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Dialogue Area */}
            <div ref={containerRef} className="flex-1 overflow-y-auto p-4">
                <div className="max-w-2xl mx-auto space-y-4">
                    {dialogueTurns.map((turn, index) => {
                        const isRole1 = turn.role_id === 'role_1';
                        const isCurrent = index === currentTurnIndex;
                        const isComplete = completedTurns.has(index);
                        const isUserLine = turn.role_id === userRole;

                        return (
                            <motion.div
                                id={`turn-${index}`}
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`flex ${isRole1 ? 'justify-start' : 'justify-end'} ${
                                    index > currentTurnIndex && playMode === 'practice' ? 'opacity-30' : ''
                                }`}
                            >
                                <div
                                    className={`
                                        relative max-w-[85%] p-4 rounded-2xl transition-all cursor-pointer
                                        ${isRole1
                                            ? 'bg-blue-100 dark:bg-blue-900/40 rounded-tl-sm'
                                            : 'bg-purple-100 dark:bg-purple-900/40 rounded-tr-sm'
                                        }
                                        ${isCurrent ? 'ring-2 ring-teal-500 ring-offset-2 dark:ring-offset-gray-900' : ''}
                                        ${isComplete ? 'opacity-60' : ''}
                                    `}
                                    onClick={() => setCurrentTurnIndex(index)}
                                >
                                    {/* Completed badge */}
                                    {isComplete && (
                                        <div className="absolute -top-2 -right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                            <Check className="w-3 h-3 text-white" />
                                        </div>
                                    )}

                                    {/* Key phrase badge */}
                                    {turn.key_phrase && (
                                        <div className="absolute -top-2 -left-2 px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center gap-1">
                                            <Star className="w-3 h-3" />
                                            KEY
                                        </div>
                                    )}

                                    {/* Speaker */}
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium flex items-center gap-1">
                                        {isUserLine && <Mic className="w-3 h-3" />}
                                        {turn.speaker}
                                    </p>

                                    {/* English text */}
                                    <p className="text-gray-900 dark:text-white font-medium">
                                        {turn.english}
                                    </p>

                                    {/* Turkish translation */}
                                    {showTranslation && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 italic">
                                            {turn.turkish}
                                        </p>
                                    )}

                                    {/* Vocabulary highlights */}
                                    {turn.vocabulary && turn.vocabulary.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {turn.vocabulary.map((vocab, vi) => (
                                                <button
                                                    key={vi}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleVocabClick(vocab);
                                                    }}
                                                    className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                                                        vocabularyLearned.has(vocab.term)
                                                            ? 'bg-teal-500 text-white'
                                                            : 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 hover:bg-teal-200'
                                                    }`}
                                                >
                                                    {vocab.term}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Vocabulary Popup */}
            <AnimatePresence>
                {selectedVocab && (
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        className="fixed bottom-24 left-4 right-4 max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 border border-gray-200 dark:border-gray-700"
                    >
                        <div className="flex items-start justify-between mb-2">
                            <div>
                                <h4 className="font-bold text-teal-600 dark:text-teal-400">
                                    {selectedVocab.term}
                                </h4>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    {selectedVocab.definition}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedVocab(null)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            >
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>
                        {selectedVocab.example && (
                            <p className="text-xs text-gray-500 italic">
                                "{selectedVocab.example}"
                            </p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Controls */}
            <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-4">
                <div className="max-w-4xl mx-auto">
                    {/* Current turn indicator */}
                    <div className="text-center mb-3">
                        <span className="text-sm text-gray-500">
                            {currentTurn?.speaker}: <span className="font-medium text-gray-700 dark:text-gray-300">{currentTurn?.english?.substring(0, 40)}...</span>
                        </span>
                    </div>

                    <div className="flex items-center justify-center gap-4">
                        {/* Prev */}
                        <button
                            onClick={handlePrevTurn}
                            disabled={currentTurnIndex === 0}
                            className="p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
                        >
                            <SkipBack className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                        </button>

                        {/* Play/Pause or Record */}
                        {playMode === 'practice' && isUserTurn ? (
                            <button
                                onClick={toggleRecording}
                                className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all ${
                                    isRecording
                                        ? 'bg-red-500 animate-pulse'
                                        : 'bg-gradient-to-r from-teal-500 to-cyan-500'
                                }`}
                            >
                                {isRecording ? (
                                    <MicOff className="w-7 h-7 text-white" />
                                ) : (
                                    <Mic className="w-7 h-7 text-white" />
                                )}
                            </button>
                        ) : (
                            <button
                                onClick={handlePlayPause}
                                className="w-16 h-16 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg"
                            >
                                {isPlaying ? (
                                    <Pause className="w-7 h-7 text-white" />
                                ) : (
                                    <Play className="w-7 h-7 text-white ml-1" />
                                )}
                            </button>
                        )}

                        {/* Next / Complete */}
                        <button
                            onClick={handleNextTurn}
                            className="p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            {currentTurnIndex === dialogueTurns.length - 1 ? (
                                <Check className="w-6 h-6 text-green-500" />
                            ) : (
                                <SkipForward className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                            )}
                        </button>
                    </div>

                    {/* Settings */}
                    <div className="flex items-center justify-center gap-4 mt-4">
                        <button
                            onClick={() => setShowTranslation(!showTranslation)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                showTranslation
                                    ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700'
                                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            <BookOpen className="w-4 h-4" />
                            <span>Çeviri</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RoleplayPlayer;
