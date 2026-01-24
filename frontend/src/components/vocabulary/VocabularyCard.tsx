/**
 * 🎴 Vocabulary Card Component
 * 
 * Tinder-style swipeable flashcard with flip animation.
 * Front: Word + Audio button
 * Back: Definition, Example, Context Hook
 * 
 * NEW: Sector-based meanings support
 * Words can have multiple meanings across sectors (General, Medical, Tech, etc.)
 */

import React, { useState, useMemo } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';

// Sector meaning structure
interface SectorMeaning {
    sector?: string;
    definition?: string;
    definition_en?: string;
    definition_tr?: string;
    example?: string;
    example_sentence?: string;
    example_tr?: string;
    cefr_level?: string;
    level?: string;
    part_of_speech?: string;
}

interface VocabularyCardProps {
    word: {
        id: number;
        word: string;
        definition?: string;
        example_sentence?: string;
        level?: string;
        source_context?: string; // "From Podcast: Business English"
        ipa?: string;
        meanings?: SectorMeaning[] | string; // JSON array of sector meanings
    };
    onSwipe: (direction: 'left' | 'right', wordId: number) => void;
    isActive: boolean;
}

const VocabularyCard: React.FC<VocabularyCardProps> = ({ word, onSwipe, isActive }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const [exitX, setExitX] = useState(0);
    const [showExample, setShowExample] = useState(false);
    const [activeSectorIndex, setActiveSectorIndex] = useState(0);

    // Parse meanings - handle both JSON string and array
    const parsedMeanings = useMemo<SectorMeaning[]>(() => {
        if (!word.meanings) return [];

        try {
            if (typeof word.meanings === 'string') {
                const parsed = JSON.parse(word.meanings);
                return Array.isArray(parsed) ? parsed : [];
            }
            return Array.isArray(word.meanings) ? word.meanings : [];
        } catch {
            return [];
        }
    }, [word.meanings]);

    // Get unique sectors from meanings
    const sectors = useMemo(() => {
        if (parsedMeanings.length === 0) return [];

        const sectorSet = new Set<string>();
        parsedMeanings.forEach(m => {
            sectorSet.add(m.sector || 'Genel');
        });
        return Array.from(sectorSet);
    }, [parsedMeanings]);

    // Get current active meaning based on selected sector
    const activeMeaning = useMemo<SectorMeaning | null>(() => {
        if (parsedMeanings.length === 0) return null;

        const targetSector = sectors[activeSectorIndex] || 'Genel';
        return parsedMeanings.find(m => (m.sector || 'Genel') === targetSector) || parsedMeanings[0];
    }, [parsedMeanings, sectors, activeSectorIndex]);

    // Determine what to display (prioritize sector meaning, fallback to legacy)
    const displayDefinition = activeMeaning?.definition || activeMeaning?.definition_tr || activeMeaning?.definition_en || word.definition;
    const displayExample = activeMeaning?.example || activeMeaning?.example_sentence || word.example_sentence;
    const displayExampleTranslation = activeMeaning?.example_tr;
    const displayLevel = activeMeaning?.cefr_level || activeMeaning?.level || word.level;

    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-25, 25]);
    const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

    // Swipe indicator colors
    const leftIndicatorOpacity = useTransform(x, [-100, 0], [1, 0]);
    const rightIndicatorOpacity = useTransform(x, [0, 100], [0, 1]);

    const handleDragEnd = (_: any, info: { offset: { x: number }; velocity: { x: number } }) => {
        if (info.offset.x > 100 || info.velocity.x > 500) {
            setExitX(300);
            onSwipe('right', word.id);
        } else if (info.offset.x < -100 || info.velocity.x < -500) {
            setExitX(-300);
            onSwipe('left', word.id);
        }
    };

    const playAudio = (e: React.MouseEvent) => {
        e.stopPropagation();
        // TTS API call would go here
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(word.word);
            utterance.lang = 'en-US';
            utterance.rate = 0.8;
            speechSynthesis.speak(utterance);
        }
    };

    const getLevelColor = (level?: string) => {
        const colors: Record<string, string> = {
            'A1': 'bg-green-100 text-green-700',
            'A2': 'bg-emerald-100 text-emerald-700',
            'B1': 'bg-teal-100 text-teal-700',
            'B2': 'bg-cyan-100 text-cyan-700',
            'C1': 'bg-blue-100 text-blue-700',
            'C2': 'bg-purple-100 text-purple-700',
        };
        return colors[level || 'B1'] || 'bg-slate-100 text-slate-700';
    };

    const getSectorIcon = (sector: string) => {
        const icons: Record<string, string> = {
            'Genel': '📚',
            'General': '📚',
            'Tıp': '🏥',
            'Medical': '🏥',
            'Teknoloji': '💻',
            'Technology': '💻',
            'Tech': '💻',
            'Hukuk': '⚖️',
            'Legal': '⚖️',
            'Finans': '💰',
            'Finance': '💰',
            'Bilim': '🔬',
            'Science': '🔬',
            'Sanat': '🎨',
            'Art': '🎨',
            'Spor': '⚽',
            'Sports': '⚽',
            'İş': '💼',
            'Business': '💼',
        };
        return icons[sector] || '📖';
    };

    if (!isActive) return null;

    return (
        <motion.div
            className="absolute w-full"
            style={{ x, rotate, opacity }}
            drag={!isFlipped ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            animate={{ x: exitX }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
            {/* Swipe Indicators */}
            <motion.div
                className="absolute -left-4 top-1/2 -translate-y-1/2 bg-red-500 text-white px-4 py-2 rounded-full font-bold shadow-lg z-10"
                style={{ opacity: leftIndicatorOpacity }}
            >
                ❌ Tekrar
            </motion.div>
            <motion.div
                className="absolute -right-4 top-1/2 -translate-y-1/2 bg-green-500 text-white px-4 py-2 rounded-full font-bold shadow-lg z-10"
                style={{ opacity: rightIndicatorOpacity }}
            >
                ✓ Biliyorum
            </motion.div>

            {/* Card Container */}
            <div
                className="relative w-full h-[420px] cursor-grab active:cursor-grabbing perspective-1000"
                onClick={() => setIsFlipped(!isFlipped)}
            >
                <motion.div
                    className="w-full h-full relative preserve-3d"
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.6, type: 'spring' }}
                    style={{ transformStyle: 'preserve-3d' }}
                >
                    {/* FRONT */}
                    <motion.div
                        className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white to-slate-50 shadow-2xl border border-slate-200 p-8 flex flex-col items-center justify-center"
                        style={{ backfaceVisibility: 'hidden' }}
                    >
                        {/* Level Badge */}
                        <span className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold ${getLevelColor(displayLevel)}`}>
                            {displayLevel || 'B1'}
                        </span>

                        {/* Sector Tabs - Only show if multiple sectors exist */}
                        {sectors.length > 1 && (
                            <div className="absolute top-4 left-4 flex gap-1">
                                {sectors.map((sector, idx) => (
                                    <button
                                        key={sector}
                                        onClick={(e) => { e.stopPropagation(); setActiveSectorIndex(idx); }}
                                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${idx === activeSectorIndex
                                            ? 'bg-teal-500 text-white shadow-md'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                    >
                                        {getSectorIcon(sector)} {sector}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Word */}
                        <h2 className="text-5xl font-bold text-slate-800 mb-4 tracking-tight">
                            {word.word}
                        </h2>

                        {/* IPA Pronunciation */}
                        {word.ipa && (
                            <p className="text-lg text-slate-400 italic mb-6">/{word.ipa}/</p>
                        )}

                        {/* Audio Button */}
                        <button
                            onClick={playAudio}
                            className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                        >
                            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                            </svg>
                        </button>

                        {/* Example Sentence Toggle */}
                        <div className="mt-6 min-h-[60px] flex flex-col items-center justify-center">
                            {!showExample ? (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowExample(true); }}
                                    className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1.5 px-4 py-2 rounded-full hover:bg-teal-50 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Örnek cümle göster
                                </button>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-center px-4"
                                >
                                    <p className="text-slate-600 italic text-sm leading-relaxed">
                                        "{displayExample || 'Example sentence not available.'}"
                                    </p>
                                    {displayExampleTranslation && (
                                        <p className="text-slate-400 text-xs mt-1">
                                            ({displayExampleTranslation})
                                        </p>
                                    )}
                                </motion.div>
                            )}
                        </div>

                        {/* Tap to flip hint */}
                        <p className="absolute bottom-6 text-slate-400 text-sm">
                            Kartı çevirmek için dokun 👆
                        </p>
                    </motion.div>

                    {/* BACK */}
                    <motion.div
                        className="absolute inset-0 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl p-6 flex flex-col text-white overflow-y-auto"
                        style={{ backfaceVisibility: 'hidden', rotateY: 180 }}
                    >
                        {/* Sector Tabs on Back - if multiple sectors */}
                        {sectors.length > 1 && (
                            <div className="flex gap-1 mb-4 flex-wrap">
                                {sectors.map((sector, idx) => (
                                    <button
                                        key={sector}
                                        onClick={(e) => { e.stopPropagation(); setActiveSectorIndex(idx); }}
                                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${idx === activeSectorIndex
                                                ? 'bg-teal-500 text-white shadow-md'
                                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                            }`}
                                    >
                                        {getSectorIcon(sector)} {sector}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Active Sector Indicator */}
                        {sectors.length > 0 && (
                            <div className="bg-teal-500/20 rounded-xl px-4 py-2 mb-4 text-teal-300 text-sm flex items-center gap-2">
                                <span>{getSectorIcon(sectors[activeSectorIndex] || 'Genel')}</span>
                                <span className="font-medium">{sectors[activeSectorIndex] || 'Genel'}</span>
                                {activeMeaning?.part_of_speech && (
                                    <span className="text-slate-400 ml-auto text-xs">({activeMeaning.part_of_speech})</span>
                                )}
                            </div>
                        )}

                        {/* Context Hook - if no sectors but has source */}
                        {sectors.length === 0 && word.source_context && (
                            <div className="bg-teal-500/20 rounded-xl px-4 py-2 mb-4 text-teal-300 text-sm flex items-center gap-2">
                                <span>📍</span>
                                <span>{word.source_context}</span>
                            </div>
                        )}

                        {/* Definition */}
                        <div className="mb-4">
                            <h4 className="text-xs uppercase tracking-wider text-slate-400 mb-2">Anlam</h4>
                            <p className="text-xl font-medium">
                                {displayDefinition || 'Tanım henüz eklenmedi.'}
                            </p>
                        </div>

                        {/* Example Sentence */}
                        <div className="flex-1">
                            <h4 className="text-xs uppercase tracking-wider text-slate-400 mb-2">Örnek Cümle</h4>
                            <p className="text-lg text-slate-300 italic leading-relaxed">
                                "{displayExample || 'Örnek cümle henüz eklenmedi.'}"
                            </p>
                            {displayExampleTranslation && (
                                <p className="text-slate-400 text-sm mt-2">
                                    ({displayExampleTranslation})
                                </p>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4 mt-auto pt-4">
                            <button
                                onClick={(e) => { e.stopPropagation(); onSwipe('left', word.id); }}
                                className="flex-1 py-3 rounded-xl bg-red-500/20 text-red-400 font-semibold hover:bg-red-500/30 transition-colors"
                            >
                                Tekrar Et
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onSwipe('right', word.id); }}
                                className="flex-1 py-3 rounded-xl bg-green-500/20 text-green-400 font-semibold hover:bg-green-500/30 transition-colors"
                            >
                                Öğrendim ✓
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default VocabularyCard;
