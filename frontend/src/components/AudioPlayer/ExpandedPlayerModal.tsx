import React from 'react';
import { useAudioPlayerSafe } from '../../context/AudioPlayerContext';
import OutputSection from '../OutputSection';

const ExpandedPlayerModal: React.FC = () => {
    const player = useAudioPlayerSafe();

    // Don't render if no player context, no active track, or minimized
    if (!player || !player.activeTrack || player.isMinimized) {
        return null;
    }

    const { activeTrack, minimize, close } = player;

    // Handle backdrop click - minimize instead of close
    const handleBackdropClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        console.log('📦 [EXPANDED MODAL] Backdrop clicked - minimizing');
        minimize();
    };

    // Prepare audioResult format expected by OutputSection
    const audioResult = {
        mp3_url: activeTrack.url,
        words: activeTrack.words || [],
        timepoints: activeTrack.timepoints || [],
        adapted_text: activeTrack.originalText,
        translated_text: activeTrack.translatedText,
        dialogue_segments: activeTrack.dialogueSegments,
        level: activeTrack.level,
        topic: activeTrack.topic || activeTrack.title,
        message: activeTrack.originalText || '',
    };

    return (
        <div
            className="fixed inset-0 z-[9998] flex items-center justify-center bg-black bg-opacity-60"
            onClick={handleBackdropClick}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-4"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">
                        {activeTrack.title || 'Ses Oynatıcı'}
                    </h3>
                    <div className="flex items-center gap-2">
                        {/* Minimize button */}
                        <button
                            onClick={minimize}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
                            title="Küçült"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                        </button>
                        {/* Close button */}
                        <button
                            onClick={close}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-red-100 text-gray-700 hover:text-red-600 transition-colors"
                            title="Kapat"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Audio Player Content */}
                <OutputSection
                    audioResult={audioResult as any}
                    isLoggedIn={true}
                    disableSticky={true}
                />
            </div>
        </div>
    );
};

export default ExpandedPlayerModal;
