import React from 'react';
import { useAudioPlayerSafe } from '../../context/AudioPlayerContext';
import OutputSection from '../OutputSection';
import { ContentRatingButtons } from '../content/ContentRatingButtons';

const ExpandedPlayerModal: React.FC = () => {
    const player = useAudioPlayerSafe();

    // Don't render if no player context, no active track, or minimized
    if (!player || !player.activeTrack || player.isMinimized) {
        return null;
    }

    const { activeTrack, minimize, close, currentTime, duration } = player;

    // Calculate progress percentage
    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    // Handle backdrop click - minimize instead of close
    const handleBackdropClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        console.log('📦 [EXPANDED MODAL] Backdrop clicked - minimizing');
        minimize();
    };

    // Prepare audioResult format expected by OutputSection
    // OutputSection expects both snake_case and camelCase versions of some fields
    const audioResult = {
        mp3_url: activeTrack.url,
        vtt_url: activeTrack.url ? activeTrack.url.replace('.mp3', '.vtt') : '',
        words: activeTrack.words || [],
        timepoints: activeTrack.timepoints || [],
        // Both snake_case and camelCase for compatibility
        adapted_text: activeTrack.originalText || '',
        adaptedText: activeTrack.originalText || '',
        translated_text: activeTrack.translatedText || '',
        translatedText: activeTrack.translatedText || '',
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
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-800">
                            {activeTrack.title || 'Ses Oynatıcı'}
                        </h3>
                        {/* Progress Badge */}
                        {duration > 0 && (
                            <div className="flex items-center gap-2">
                                <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary rounded-full transition-all duration-300"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${progressPercent >= 90 ? 'bg-green-100 text-green-700' :
                                        progressPercent > 0 ? 'bg-amber-100 text-amber-700' :
                                            'bg-gray-100 text-gray-600'
                                    }`}>
                                    {Math.round(progressPercent)}%
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Rating Buttons */}
                        {activeTrack.id && (
                            <ContentRatingButtons
                                contentId={activeTrack.id}
                                contentType="topic"
                                tooltipPosition="bottom"
                            />
                        )}
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
                    audioRef={player.audioRef} // NEW
                />
            </div>
        </div>
    );
};

export default ExpandedPlayerModal;

