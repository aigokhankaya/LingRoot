'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SuggestedResponse {
    text: string;
    translation: string;
    difficulty: 'easy' | 'medium' | 'hard';
}

interface HelpfulPhrase {
    phrase: string;
    meaning: string;
    usage: string;
}

interface DialogueMessage {
    speaker: 'user' | 'ai';
    text: string;
    translation?: string;
}

interface RoleplayDialogueProps {
    data: {
        scenario: {
            title: string;
            titleTurkish?: string;
            setting: string;
            userRole: string;
            aiRole: string;
        };
        starterLine: {
            speaker: string;
            text: string;
            translation?: string;
        };
        suggestedResponses: SuggestedResponse[];
        helpfulPhrases: HelpfulPhrase[];
        expectedTurns: number;
        xpReward: number;
    };
    onComplete: (result: { xpEarned: number; turnsCompleted: number }) => void;
}

export const RoleplayDialogue: React.FC<RoleplayDialogueProps> = ({ data, onComplete }) => {
    const [messages, setMessages] = useState<DialogueMessage[]>([
        { speaker: 'ai', text: data.starterLine.text, translation: data.starterLine.translation }
    ]);
    const [currentTurn, setCurrentTurn] = useState(0);
    const [showPhrases, setShowPhrases] = useState(false);
    const [userInput, setUserInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const isComplete = currentTurn >= data.expectedTurns;

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSuggestedResponse = (response: SuggestedResponse) => {
        sendUserMessage(response.text);
    };

    const handleCustomResponse = () => {
        if (userInput.trim()) {
            sendUserMessage(userInput.trim());
            setUserInput('');
        }
    };

    const sendUserMessage = (text: string) => {
        // Add user message
        setMessages(prev => [...prev, { speaker: 'user', text }]);
        setCurrentTurn(prev => prev + 1);

        // Simulate AI response
        setIsTyping(true);
        setTimeout(() => {
            setIsTyping(false);
            const aiResponse = generateAIResponse(currentTurn + 1);
            if (aiResponse) {
                setMessages(prev => [...prev, aiResponse]);
            }
        }, 1000 + Math.random() * 1000);
    };

    const generateAIResponse = (turn: number): DialogueMessage | null => {
        // Simple AI responses based on turn count
        const responses = [
            { text: "That sounds great! Would you like anything else?", translation: "Harika görünüyor! Başka bir şey ister misiniz?" },
            { text: "Of course! Is there anything specific you're looking for?", translation: "Tabii ki! Özel olarak aradığınız bir şey var mı?" },
            { text: "Perfect, I'll get that ready for you right away.", translation: "Mükemmel, hemen sizin için hazırlayacağım." },
            { text: "Thank you so much! Have a wonderful day!", translation: "Çok teşekkür ederim! İyi günler dilerim!" }
        ];

        if (turn < responses.length) {
            return { speaker: 'ai', ...responses[turn] };
        }
        return null;
    };

    const handleComplete = () => {
        const bonusMultiplier = currentTurn >= data.expectedTurns ? 1 : 0.7;
        onComplete({
            xpEarned: Math.round(data.xpReward * bonusMultiplier),
            turnsCompleted: currentTurn
        });
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'easy': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            case 'medium': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
            case 'hard': return 'bg-red-500/20 text-red-400 border-red-500/30';
            default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
        }
    };

    return (
        <div className="rounded-2xl bg-slate-800/80 border border-slate-700/50 overflow-hidden">
            {/* Scenario header */}
            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-4 py-3 border-b border-slate-700/50">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">💬</span>
                    <h3 className="text-sm font-semibold text-slate-100">{data.scenario.title}</h3>
                </div>
                <p className="text-xs text-slate-400">
                    📍 {data.scenario.setting}
                </p>
                <div className="flex gap-3 mt-2 text-xs">
                    <span className="text-teal-400">Sen: {data.scenario.userRole}</span>
                    <span className="text-slate-500">|</span>
                    <span className="text-purple-400">AI: {data.scenario.aiRole}</span>
                </div>
            </div>

            {/* Progress */}
            <div className="px-4 py-2 flex justify-between items-center border-b border-slate-700/30">
                <span className="text-xs text-slate-400">
                    Tur: {currentTurn} / {data.expectedTurns}
                </span>
                <div className="flex gap-1">
                    {Array.from({ length: data.expectedTurns }).map((_, i) => (
                        <div
                            key={i}
                            className={`w-2 h-2 rounded-full ${i < currentTurn ? 'bg-teal-500' : 'bg-slate-600'}`}
                        />
                    ))}
                </div>
            </div>

            {/* Messages */}
            <div className="p-4 max-h-[250px] overflow-y-auto">
                <AnimatePresence>
                    {messages.map((msg, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`mb-3 ${msg.speaker === 'user' ? 'text-right' : 'text-left'}`}
                        >
                            <div className={`inline-block max-w-[80%] p-3 rounded-2xl ${msg.speaker === 'user'
                                    ? 'bg-teal-500/20 text-teal-100 rounded-br-md'
                                    : 'bg-slate-700/50 text-slate-200 rounded-bl-md'
                                }`}>
                                <p className="text-sm">{msg.text}</p>
                                {msg.translation && (
                                    <p className="text-xs text-slate-400 mt-1 border-t border-slate-600/30 pt-1">
                                        {msg.translation}
                                    </p>
                                )}
                            </div>
                        </motion.div>
                    ))}

                    {isTyping && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-left mb-3"
                        >
                            <div className="inline-block bg-slate-700/50 p-3 rounded-2xl rounded-bl-md">
                                <div className="flex gap-1">
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            {!isComplete && !isTyping && (
                <div className="p-4 border-t border-slate-700/50">
                    {/* Suggested responses */}
                    <div className="mb-3">
                        <p className="text-xs text-slate-400 mb-2">Önerilen cevaplar:</p>
                        <div className="flex flex-wrap gap-2">
                            {data.suggestedResponses.map((response, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSuggestedResponse(response)}
                                    className={`text-xs px-3 py-2 rounded-lg border transition-colors
                                              ${getDifficultyColor(response.difficulty)}
                                              hover:opacity-80`}
                                >
                                    {response.text}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom input */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCustomResponse()}
                            placeholder="Kendi cevabını yaz..."
                            className="flex-1 bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2
                                     text-sm text-slate-200 placeholder-slate-500
                                     focus:outline-none focus:border-teal-500/50"
                        />
                        <button
                            onClick={handleCustomResponse}
                            disabled={!userInput.trim()}
                            className="px-4 py-2 rounded-xl bg-teal-500 text-white text-sm
                                     disabled:opacity-50 disabled:cursor-not-allowed
                                     hover:bg-teal-400 transition-colors"
                        >
                            Gönder
                        </button>
                    </div>

                    {/* Helpful phrases toggle */}
                    <button
                        onClick={() => setShowPhrases(!showPhrases)}
                        className="mt-3 text-xs text-teal-400 hover:text-teal-300"
                    >
                        {showPhrases ? '▲ Yardımcı ifadeleri gizle' : '▼ Yardımcı ifadeler'}
                    </button>

                    <AnimatePresence>
                        {showPhrases && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-2 p-3 rounded-lg bg-slate-700/30 border border-slate-600/50"
                            >
                                {data.helpfulPhrases.map((phrase, i) => (
                                    <div key={i} className="mb-2 last:mb-0">
                                        <span className="text-teal-300 text-sm">"{phrase.phrase}"</span>
                                        <span className="text-slate-400 text-xs ml-2">- {phrase.meaning}</span>
                                        <p className="text-slate-500 text-xs">{phrase.usage}</p>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Complete button */}
            {isComplete && (
                <div className="p-4 border-t border-slate-700/50">
                    <button
                        onClick={handleComplete}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500
                                 text-white text-sm font-medium shadow-lg shadow-emerald-500/25
                                 hover:from-emerald-400 hover:to-teal-400 transition-all"
                    >
                        Diyaloğu Tamamla 🎉
                    </button>
                </div>
            )}
        </div>
    );
};

export default RoleplayDialogue;
