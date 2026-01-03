import React, { useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { ContentRatingButtons, FeedbackModal } from '@/components/content';

interface ContentCardProps {
    contentId: string;
    contentType: string;
    title: string;
    text: string;
    audioUrl?: string;
}

export function ContentCard({ contentId, contentType, title, text, audioUrl }: ContentCardProps) {
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {/* Content */}
            <h3 className="text-lg font-semibold text-gray-900 mb-3">{title}</h3>
            <p className="text-gray-700 mb-4 line-clamp-3">{text}</p>

            {/* Audio player (eğer varsa) */}
            {audioUrl && (
                <audio controls className="w-full mb-4">
                    <source src={audioUrl} type="audio/mpeg" />
                </audio>
            )}

            {/* Rating & Feedback */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <ContentRatingButtons
                    contentId={contentId}
                    contentType={contentType}
                />

                <button
                    onClick={() => setShowFeedbackModal(true)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-primary-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                    <MessageSquarePlus size={18} />
                    <span>Geri Bildirim</span>
                </button>
            </div>

            {/* Feedback Modal */}
            <FeedbackModal
                contentId={contentId}
                contentType={contentType}
                isOpen={showFeedbackModal}
                onClose={() => setShowFeedbackModal(false)}
            />
        </div>
    );
}
