'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Volume2,
    BookOpen,
    Star,
    Bookmark,
    BookmarkCheck,
    RotateCcw,
    Check,
    ChevronLeft,
    ChevronRight,
    Lightbulb
} from 'lucide-react';

export interface VocabularyItem {
    id: string | number;
    word: string;
    pronunciation?: string;
    definition_en: string;
    definition_tr: string;
    example_sentence?: string;
    example_sentence_tr?: string;
    category?: string;
    cefr_level?: string;
    collocations?: string[];
    related_words?: string[];
    usage_notes?: string;
    is_learned?: boolean;
    is_bookmarked?: boolean;
}

interface VocabularyCardProps {
    vocabulary: VocabularyItem;
    onLearn?: (id: string | number) => void;
    onBookmark?: (id: string | number) => void;
    onSpeak?: (word: string) => void;
    index?: number;
    variant?: 'list' | 'flashcard';
}

// List variant card
function VocabularyListCard({ vocabulary, onLearn, onBookmark, onSpeak, index = 0 }: VocabularyCardProps) {
    const [expanded, setExpanded] = useState(false);

    const levelColors: Record<string, string> = {
        'A1': 'bg-green-100 text-green-700',
        'A2': 'bg-lime-100 text-lime-700',
        'B1': 'bg-yellow-100 text-yellow-700',
        'B2': 'bg-orange-100 text-orange-700',
        'C1': 'bg-red-100 text-red-700',
        'C2': 'bg-rose-100 text-rose-700',
    };

    const level = vocabulary.cefr_level || 'B1';
    const levelColor = levelColors[level] || levelColors['B1'];

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className={`
                bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700
                shadow-sm hover:shadow-md transition-all duration-300
                ${vocabulary.is_learned ? 'ring-2 ring-emerald-200 dark:ring-emerald-800' : ''}
            `}
        >
            <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                {vocabulary.word}
                            </h3>
                            {vocabulary.pronunciation && (
                                <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                                    /{vocabulary.pronunciation}/
                                </span>
                            )}
                            <button
                                onClick={() => onSpeak?.(vocabulary.word)}
                                className="p-1.5 rounded-full hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors"
                            >
                                <Volume2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                            {vocabulary.definition_tr}
                        </p>
                    </div>

                    {/* Badges & Actions */}
                    <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${levelColor}`}>
                            {level}
                        </span>
                        {vocabulary.category && (
                            <span className="px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                {vocabulary.category}
                            </span>
                        )}
                        <button
                            onClick={() => onBookmark?.(vocabulary.id)}
                            className="p-1.5 rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors"
                        >
                            {vocabulary.is_bookmarked ? (
                                <BookmarkCheck className="w-4 h-4 text-orange-500" />
                            ) : (
                                <Bookmark className="w-4 h-4 text-gray-400 hover:text-orange-500" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Example sentence */}
                {vocabulary.example_sentence && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <p className="text-sm text-gray-800 dark:text-gray-200 italic">
                            "{vocabulary.example_sentence}"
                        </p>
                        {vocabulary.example_sentence_tr && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                → {vocabulary.example_sentence_tr}
                            </p>
                        )}
                    </div>
                )}

                {/* Expandable section */}
                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-3">
                                {/* English definition */}
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">English Definition</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">{vocabulary.definition_en}</p>
                                </div>

                                {/* Collocations */}
                                {vocabulary.collocations && vocabulary.collocations.length > 0 && (
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Yaygın Kullanımlar</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {vocabulary.collocations.map((col, i) => (
                                                <span key={i} className="px-2 py-0.5 text-xs bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 rounded">
                                                    {col}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Related words */}
                                {vocabulary.related_words && vocabulary.related_words.length > 0 && (
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">İlişkili Kelimeler</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {vocabulary.related_words.map((rw, i) => (
                                                <span key={i} className="px-2 py-0.5 text-xs bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 rounded">
                                                    {rw}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Usage notes */}
                                {vocabulary.usage_notes && (
                                    <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                        <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-amber-800 dark:text-amber-200">{vocabulary.usage_notes}</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer actions */}
                <div className="mt-3 flex items-center justify-between">
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="text-sm text-teal-600 dark:text-teal-400 hover:text-teal-700 font-medium"
                    >
                        {expanded ? 'Daha az göster' : 'Daha fazla göster'}
                    </button>

                    <button
                        onClick={() => onLearn?.(vocabulary.id)}
                        className={`
                            flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                            transition-colors
                            ${vocabulary.is_learned
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                : 'bg-teal-500 text-white hover:bg-teal-600'}
                        `}
                    >
                        {vocabulary.is_learned ? (
                            <>
                                <Check className="w-4 h-4" />
                                Öğrenildi
                            </>
                        ) : (
                            <>
                                <Star className="w-4 h-4" />
                                Öğrendim
                            </>
                        )}
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// Flashcard variant
function VocabularyFlashcard({ vocabulary, onLearn, onSpeak, index = 0 }: VocabularyCardProps) {
    const [flipped, setFlipped] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="perspective-1000"
        >
            <div
                onClick={() => setFlipped(!flipped)}
                className={`
                    relative w-full h-64 cursor-pointer transition-transform duration-500
                    ${flipped ? 'rotate-y-180' : ''}
                `}
                style={{ transformStyle: 'preserve-3d' }}
            >
                {/* Front side */}
                <div
                    className={`
                        absolute inset-0 rounded-2xl p-6 
                        bg-gradient-to-br from-teal-500 to-cyan-600
                        text-white flex flex-col items-center justify-center
                        shadow-xl backface-hidden
                    `}
                >
                    <button
                        onClick={(e) => { e.stopPropagation(); onSpeak?.(vocabulary.word); }}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30"
                    >
                        <Volume2 className="w-5 h-5" />
                    </button>
                    <h2 className="text-3xl font-bold mb-2">{vocabulary.word}</h2>
                    {vocabulary.pronunciation && (
                        <p className="text-lg opacity-80 font-mono">/{vocabulary.pronunciation}/</p>
                    )}
                    <p className="mt-4 text-sm opacity-70">Çevirmek için tıkla</p>
                </div>

                {/* Back side */}
                <div
                    className={`
                        absolute inset-0 rounded-2xl p-6 
                        bg-white dark:bg-gray-800
                        shadow-xl backface-hidden rotate-y-180
                        flex flex-col items-center justify-center text-center
                    `}
                >
                    <p className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        {vocabulary.definition_tr}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        {vocabulary.definition_en}
                    </p>
                    {vocabulary.example_sentence && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                            "{vocabulary.example_sentence}"
                        </p>
                    )}

                    <div className="absolute bottom-4 flex gap-3">
                        <button
                            onClick={(e) => { e.stopPropagation(); setFlipped(false); }}
                            className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                            <RotateCcw className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onLearn?.(vocabulary.id); }}
                            className="px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium flex items-center gap-2"
                        >
                            <Check className="w-4 h-4" />
                            Öğrendim
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

export default function VocabularyCard(props: VocabularyCardProps) {
    if (props.variant === 'flashcard') {
        return <VocabularyFlashcard {...props} />;
    }
    return <VocabularyListCard {...props} />;
}

// Flashcard carousel component
interface FlashcardCarouselProps {
    vocabularyList: VocabularyItem[];
    onLearn?: (id: string | number) => void;
    onSpeak?: (word: string) => void;
}

export function FlashcardCarousel({ vocabularyList, onLearn, onSpeak }: FlashcardCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    const goNext = () => setCurrentIndex((prev) => (prev + 1) % vocabularyList.length);
    const goPrev = () => setCurrentIndex((prev) => (prev - 1 + vocabularyList.length) % vocabularyList.length);

    if (vocabularyList.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                Henüz kelime bulunmuyor.
            </div>
        );
    }

    return (
        <div className="relative max-w-lg mx-auto">
            {/* Progress indicator */}
            <div className="text-center mb-4">
                <span className="text-sm text-gray-500">
                    {currentIndex + 1} / {vocabularyList.length}
                </span>
            </div>

            {/* Card */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                >
                    <VocabularyFlashcard
                        vocabulary={vocabularyList[currentIndex]}
                        onLearn={onLearn}
                        onSpeak={onSpeak}
                    />
                </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex justify-center gap-4 mt-6">
                <button
                    onClick={goPrev}
                    className="p-3 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                </button>
                <button
                    onClick={goNext}
                    className="p-3 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                    <ChevronRight className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                </button>
            </div>

            {/* Progress dots */}
            <div className="flex justify-center gap-1.5 mt-4">
                {vocabularyList.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setCurrentIndex(i)}
                        className={`
                            w-2 h-2 rounded-full transition-all
                            ${i === currentIndex
                                ? 'bg-teal-500 w-4'
                                : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'}
                        `}
                    />
                ))}
            </div>
        </div>
    );
}
