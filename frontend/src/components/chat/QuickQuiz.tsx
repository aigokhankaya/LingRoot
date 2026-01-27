'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface QuizOption {
    id: string;
    text: string;
    isCorrect: boolean;
}

interface QuizQuestion {
    id: number;
    type: string;
    question: string;
    questionTurkish?: string;
    options: QuizOption[];
    explanation: string;
    explanationTurkish?: string;
}

interface QuickQuizProps {
    data: {
        quiz?: {
            title: string;
            titleTurkish?: string;
            topic: string;
            level: string;
        };
        questions: QuizQuestion[];
        xpReward: number;
    };
    onComplete: (result: { score: number; totalQuestions: number; xpEarned: number }) => void;
}

export const QuickQuiz: React.FC<QuickQuizProps> = ({ data, onComplete }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [score, setScore] = useState(0);
    const [answers, setAnswers] = useState<boolean[]>([]);

    const questions = data.questions || [];
    const currentQuestion = questions[currentIndex];
    const isLastQuestion = currentIndex === questions.length - 1;
    const correctOption = currentQuestion?.options.find(o => o.isCorrect);

    const handleOptionSelect = (optionId: string) => {
        if (showResult) return;

        setSelectedOption(optionId);
        const isCorrect = currentQuestion.options.find(o => o.id === optionId)?.isCorrect || false;

        if (isCorrect) {
            setScore(prev => prev + 1);
        }

        setAnswers(prev => [...prev, isCorrect]);
        setShowResult(true);
    };

    const handleNext = () => {
        if (isLastQuestion) {
            // Calculate final XP
            const finalScore = score + (selectedOption && currentQuestion.options.find(o => o.id === selectedOption)?.isCorrect ? 1 : 0);
            const percentage = finalScore / questions.length;
            const bonusMultiplier = percentage >= 1 ? 1.5 : percentage >= 0.66 ? 1.2 : 1;
            const xpEarned = Math.round(data.xpReward * bonusMultiplier);

            onComplete({
                score: finalScore,
                totalQuestions: questions.length,
                xpEarned
            });
        } else {
            setCurrentIndex(prev => prev + 1);
            setSelectedOption(null);
            setShowResult(false);
        }
    };

    if (!currentQuestion) {
        return <div className="text-slate-400 text-center p-4">Soru bulunamadı</div>;
    }

    return (
        <div className="rounded-2xl bg-slate-800/80 border border-slate-700/50 overflow-hidden">
            {/* Progress bar */}
            <div className="h-1 bg-slate-700">
                <motion.div
                    className="h-full bg-gradient-to-r from-teal-500 to-cyan-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                />
            </div>

            {/* Header */}
            <div className="px-4 pt-3 flex justify-between items-center">
                <span className="text-xs text-slate-400">
                    Soru {currentIndex + 1} / {questions.length}
                </span>
                <div className="flex items-center gap-2">
                    {answers.map((correct, i) => (
                        <span key={i} className={`w-2 h-2 rounded-full ${correct ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    ))}
                </div>
            </div>

            {/* Question */}
            <div className="p-4">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                    >
                        {/* Question type badge */}
                        <span className="inline-block text-xs px-2 py-1 rounded-full bg-slate-700 text-slate-400 mb-3">
                            {currentQuestion.type === 'vocabulary' ? '📚 Kelime' :
                                currentQuestion.type === 'grammar' ? '📝 Gramer' : '🎯 Anlama'}
                        </span>

                        {/* Question text */}
                        <h3 className="text-lg font-medium text-slate-100 mb-1">
                            {currentQuestion.question}
                        </h3>
                        {currentQuestion.questionTurkish && (
                            <p className="text-sm text-slate-400 mb-4">
                                {currentQuestion.questionTurkish}
                            </p>
                        )}

                        {/* Options */}
                        <div className="space-y-2 mt-4">
                            {currentQuestion.options.map((option) => {
                                const isSelected = selectedOption === option.id;
                                const isCorrectOption = option.isCorrect;

                                let optionStyle = 'bg-slate-700/50 border-slate-600 hover:bg-slate-700';
                                if (showResult) {
                                    if (isCorrectOption) {
                                        optionStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-300';
                                    } else if (isSelected && !isCorrectOption) {
                                        optionStyle = 'bg-red-500/20 border-red-500 text-red-300';
                                    } else {
                                        optionStyle = 'bg-slate-700/30 border-slate-700 text-slate-500';
                                    }
                                }

                                return (
                                    <motion.button
                                        key={option.id}
                                        onClick={() => handleOptionSelect(option.id)}
                                        disabled={showResult}
                                        whileTap={!showResult ? { scale: 0.98 } : {}}
                                        className={`w-full text-left p-3 rounded-xl border transition-all duration-200
                                                  ${optionStyle} ${!showResult ? 'cursor-pointer' : 'cursor-default'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="w-6 h-6 flex items-center justify-center rounded-full
                                                          bg-slate-600/50 text-xs font-medium text-slate-300">
                                                {option.id.toUpperCase()}
                                            </span>
                                            <span className="text-sm">{option.text}</span>
                                            {showResult && isCorrectOption && (
                                                <span className="ml-auto text-emerald-400">✓</span>
                                            )}
                                            {showResult && isSelected && !isCorrectOption && (
                                                <span className="ml-auto text-red-400">✗</span>
                                            )}
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </div>

                        {/* Explanation */}
                        <AnimatePresence>
                            {showResult && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="mt-4 p-3 rounded-xl bg-slate-700/30 border border-slate-600/50"
                                >
                                    <p className="text-sm text-slate-300">
                                        <span className="text-teal-400 font-medium">Açıklama: </span>
                                        {currentQuestion.explanation}
                                    </p>
                                    {currentQuestion.explanationTurkish && (
                                        <p className="text-xs text-slate-400 mt-1">
                                            {currentQuestion.explanationTurkish}
                                        </p>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Next button */}
            {showResult && (
                <div className="px-4 pb-4">
                    <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={handleNext}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500
                                 text-white text-sm font-medium shadow-lg shadow-teal-500/25
                                 hover:from-teal-400 hover:to-cyan-400 transition-all duration-200"
                    >
                        {isLastQuestion ? 'Bitir' : 'Sonraki Soru'}
                    </motion.button>
                </div>
            )}
        </div>
    );
};

export default QuickQuiz;
