import React from 'react';

interface PatternDetailModalProps {
    pattern: {
        pattern: string;
        type: string;
        translation: string;
        example_text: string;
        example_translation: string;
    } | null;
    onClose: () => void;
}

/**
 * PatternDetailModal - Modern popup for pattern details
 * Design inspired by TTSOverlay from newDesign
 */
const PatternDetailModal: React.FC<PatternDetailModalProps> = ({ pattern, onClose }) => {
    if (!pattern) return null;

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header with gradient - Only pattern text */}
                <div className="relative bg-gradient-to-r from-orange-400 to-amber-500 px-6 py-6">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <div className="flex items-start gap-3 pr-10">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-1">
                            <span className="text-white text-lg">📚</span>
                        </div>
                        <h2 className="text-white text-xl font-bold leading-snug">
                            {pattern.pattern}
                        </h2>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* Type Badge */}
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold uppercase tracking-wide">
                            {pattern.type || 'Pattern'}
                        </span>
                    </div>

                    {/* Translation */}
                    <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">🇹🇷</span>
                            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Çeviri</span>
                        </div>
                        <p className="text-slate-800 font-medium">
                            {pattern.translation || 'Çeviri mevcut değil'}
                        </p>
                    </div>

                    {/* Example Sentence */}
                    {pattern.example_text && (
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">🇬🇧</span>
                                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Örnek Cümle</span>
                            </div>
                            <p className="text-slate-800 italic">
                                "{pattern.example_text}"
                            </p>
                        </div>
                    )}

                    {/* Example Translation */}
                    {pattern.example_translation && (
                        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">💬</span>
                                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Örnek Çevirisi</span>
                            </div>
                            <p className="text-slate-800">
                                "{pattern.example_translation}"
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 pb-6">
                    <button
                        onClick={onClose}
                        className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
                    >
                        Kapat
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PatternDetailModal;
