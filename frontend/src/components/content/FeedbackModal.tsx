import React, { useState } from 'react';
import { X, Send } from 'lucide-react';

interface FeedbackModalProps {
    contentId: string;
    contentType: string;
    isOpen: boolean;
    onClose: () => void;
}

const feedbackTypes = [
    { value: 'too_easy', label: 'Çok kolaydı', emoji: '😴' },
    { value: 'too_hard', label: 'Çok zordu', emoji: '😵' },
    { value: 'boring', label: 'Sıkıcıydı', emoji: '😐' },
    { value: 'factual_error', label: 'Yanlış bilgi var', emoji: '⚠️' },
    { value: 'too_long', label: 'Çok uzundu', emoji: '📏' },
    { value: 'too_short', label: 'Çok kısaydı', emoji: '⏱️' },
    { value: 'other', label: 'Diğer', emoji: '💭' },
];

export function FeedbackModal({ contentId, contentType, isOpen, onClose }: FeedbackModalProps) {
    const [feedbackType, setFeedbackType] = useState('');
    const [feedbackText, setFeedbackText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!feedbackType) {
            alert('Lütfen bir geri bildirim türü seçin');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch('/api/content/feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('lingroot_token')}`
                },
                body: JSON.stringify({
                    content_id: contentId,
                    content_type: contentType,
                    feedback_type: feedbackType,
                    feedback_text: feedbackText
                })
            });

            if (!response.ok) {
                throw new Error('Failed to submit feedback');
            }

            setShowSuccess(true);
            setTimeout(() => {
                onClose();
                setShowSuccess(false);
                setFeedbackType('');
                setFeedbackText('');
            }, 2000);
        } catch (error) {
            console.error('Feedback submission error:', error);
            alert('Geri bildirim gönderilirken bir hata oluştu');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 animate-in fade-in duration-200">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Kapat"
                >
                    <X size={20} />
                </button>

                {showSuccess ? (
                    <div className="text-center py-8">
                        <div className="text-6xl mb-4">✅</div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            Teşekkürler!
                        </h3>
                        <p className="text-gray-600">
                            Geri bildiriminiz kaydedildi
                        </p>
                    </div>
                ) : (
                    <>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            Geri Bildirim
                        </h3>
                        <p className="text-sm text-gray-600 mb-6">
                            Bu içerik hakkında neler düşünüyorsun?
                        </p>

                        {/* Feedback type selection */}
                        <div className="space-y-2 mb-6">
                            {feedbackTypes.map((type) => (
                                <button
                                    key={type.value}
                                    onClick={() => setFeedbackType(type.value)}
                                    className={`
                                        w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 
                                        transition-all duration-200
                                        ${feedbackType === type.value
                                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                                        }
                                    `}
                                >
                                    <span className="text-2xl">{type.emoji}</span>
                                    <span className="font-medium">{type.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Optional text feedback */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Detay ekle (opsiyonel)
                            </label>
                            <textarea
                                value={feedbackText}
                                onChange={(e) => setFeedbackText(e.target.value)}
                                placeholder="Daha fazla bilgi vermek ister misin?"
                                rows={3}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                            />
                        </div>

                        {/* Submit button */}
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !feedbackType}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Gönderiliyor...
                                </>
                            ) : (
                                <>
                                    <Send size={18} />
                                    Gönder
                                </>
                            )}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
