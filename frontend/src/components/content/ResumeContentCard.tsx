/**
 * 🔄 Resume Content Card
 * 
 * Shows in-progress content items for quick resume.
 * Displayed on welcome page.
 */

import React, { useState, useEffect } from 'react';
import { getInProgressContent } from '@/lib/api';

interface InProgressItem {
    id: string;
    input: string;
    input_type: string;
    level: string;
    mp3_url: string;
    last_position: number;
    duration: number;
    updated_at: string;
}

interface ResumeContentCardProps {
    onResumePlay: (item: InProgressItem) => void;
}

const ResumeContentCard: React.FC<ResumeContentCardProps> = ({ onResumePlay }) => {
    const [items, setItems] = useState<InProgressItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadInProgress();
    }, []);

    const loadInProgress = async () => {
        try {
            const response = await getInProgressContent();
            if (response.success && response.data) {
                setItems(response.data);
            }
        } catch (err) {
            console.error('In-progress content yüklenemedi:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'podcast': return '🎙️';
            case 'text': return '📝';
            case 'book': return '📖';
            default: return '🎧';
        }
    };

    const getProgress = (position: number, duration: number) => {
        if (!duration) return 0;
        return Math.min(100, Math.round((position / duration) * 100));
    };

    if (loading) {
        return null;
    }

    if (items.length === 0) {
        return null;
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🔄</span>
                <h2 className="text-xl font-bold text-slate-800">Devam Et</h2>
            </div>

            <div className="space-y-3">
                {items.slice(0, 3).map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onResumePlay(item)}
                        className="w-full flex items-center gap-4 p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-left group"
                    >
                        {/* Icon */}
                        <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center text-2xl shrink-0">
                            {getTypeIcon(item.input_type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-800 truncate">
                                {item.input?.substring(0, 40) || 'İçerik'}...
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-slate-500">
                                    {formatTime(item.last_position)} / {formatTime(item.duration || 0)}
                                </span>
                                <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden max-w-[100px]">
                                    <div
                                        className="h-full bg-teal-500 rounded-full"
                                        style={{ width: `${getProgress(item.last_position, item.duration)}%` }}
                                    />
                                </div>
                                <span className="text-xs font-medium text-teal-600">
                                    %{getProgress(item.last_position, item.duration)}
                                </span>
                            </div>
                        </div>

                        {/* Play Button */}
                        <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default ResumeContentCard;
