import React, { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { api } from '../../lib/api';

interface ContentRatingButtonsProps {
    contentId: string;
    contentType: string;
    onRatingChange?: (rating: number) => void;
    tooltipPosition?: 'top' | 'bottom';
}

export function ContentRatingButtons({ contentId, contentType, onRatingChange, tooltipPosition = 'top' }: ContentRatingButtonsProps) {
    const [rating, setRating] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // İlk render'da mevcut rating'i fetch et
    useEffect(() => {
        const fetchCurrentRating = async () => {
            const token = localStorage.getItem('lingroot_token');
            console.log('🔍 [ContentRating] Fetching rating...', {
                contentId,
                hasToken: !!token,
                tokenStart: token ? token.substring(0, 10) : 'null'
            });

            try {
                const response = await api.get('/api/content/rating', {
                    params: {
                        content_id: contentId,
                        content_type: contentType
                    }
                });

                if (response.data.rating !== undefined) {
                    setRating(response.data.rating);
                }
            } catch (error) {
                console.error('Failed to fetch rating:', error);
            }
        };

        fetchCurrentRating();
    }, [contentId, contentType]);

    const handleRate = async (value: number) => {
        // Aynı butona tıklanırsa rating'i kaldır
        const newRating = rating === value ? null : value;

        setIsLoading(true);
        setRating(newRating);

        try {
            if (newRating === null) {
                // Rating kaldırma (şimdilik desteklenmiyor, ancak UI'da gösterebiliriz)
                return;
            }

            await api.post('/api/content/rate', {
                content_id: contentId,
                content_type: contentType,
                rating: newRating
            });

            onRatingChange?.(newRating);
        } catch (error) {
            console.error('Rating error:', error);
            // Hata durumunda eski değere dön
            setRating(rating);
        } finally {
            setIsLoading(false);
        }
    };

    const tooltipClasses = tooltipPosition === 'top'
        ? "absolute -top-10 left-1/2 -translate-x-1/2"
        : "absolute top-full mt-2 left-1/2 -translate-x-1/2";

    return (
        <div className="flex items-center gap-2 py-2">
            <button
                onClick={() => handleRate(1)}
                disabled={isLoading}
                className={`
                    group relative inline-flex items-center justify-center
                    p-2.5 rounded-lg transition-all duration-200
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${rating === 1
                        ? 'bg-green-50 text-green-600 ring-2 ring-green-500/20'
                        : 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-600'
                    }
                `}
                aria-label="Beğendim"
            >
                <ThumbsUp
                    size={20}
                    className={rating === 1 ? 'fill-current' : ''}
                />
                {/* Tooltip */}
                <span className={`${tooltipClasses} px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none`}>
                    Beğendim
                </span>
            </button>

            <button
                onClick={() => handleRate(-1)}
                disabled={isLoading}
                className={`
                    group relative inline-flex items-center justify-center
                    p-2.5 rounded-lg transition-all duration-200
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${rating === -1
                        ? 'bg-red-50 text-red-600 ring-2 ring-red-500/20'
                        : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600'
                    }
                `}
                aria-label="Beğenmedim"
            >
                <ThumbsDown
                    size={20}
                    className={rating === -1 ? 'fill-current' : ''}
                />
                {/* Tooltip */}
                <span className={`${tooltipClasses} px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none`}>
                    Beğenmedim
                </span>
            </button>
        </div>
    );
}

