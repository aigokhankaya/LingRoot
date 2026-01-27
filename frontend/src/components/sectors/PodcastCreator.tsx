'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Podcast,
    Mic,
    Play,
    Pause,
    Volume2,
    Sparkles,
    Loader2,
    Download,
    Radio,
    Newspaper,
    MessageCircle,
    BookOpen
} from 'lucide-react';

// Podcast türleri
const PODCAST_TYPES = [
    { id: 'news', name: 'Sektör Haberleri', icon: Newspaper, description: 'Güncel gelişmeler ve trendler' },
    { id: 'interview', name: 'Uzman Röportajı', icon: MessageCircle, description: 'Sektör profesyonelleri ile' },
    { id: 'analysis', name: 'Derinlemesine Analiz', icon: BookOpen, description: 'Konu bazlı detaylı inceleme' },
    { id: 'tutorial', name: 'Pratik Rehber', icon: Radio, description: 'Nasıl yapılır içerikleri' },
];

// Ses seçenekleri
const VOICE_OPTIONS = [
    { id: 'nova', name: 'Nova', description: 'Enerjik kadın sesi' },
    { id: 'shimmer', name: 'Shimmer', description: 'Zarif kadın sesi' },
    { id: 'onyx', name: 'Onyx', description: 'Derin erkek sesi' },
    { id: 'echo', name: 'Echo', description: 'Samimi erkek sesi' },
    { id: 'alloy', name: 'Alloy', description: 'Doğal nötr ses' },
    { id: 'fable', name: 'Fable', description: 'Hikaye anlatıcı' },
];

// Uzunluk seçenekleri
const LENGTH_OPTIONS = [
    { id: 'short', name: 'Kısa', duration: '2-3 dk', icon: '⚡' },
    { id: 'medium', name: 'Orta', duration: '4-6 dk', icon: '📻' },
    { id: 'long', name: 'Uzun', duration: '8-12 dk', icon: '🎙️' },
];

interface PodcastCreatorProps {
    sectorId: number;
    sectorName: string;
    sectorCode: string;
    onClose?: () => void;
    onContentCreated?: (content: any) => void;
}

export default function PodcastCreator({
    sectorId,
    sectorName,
    sectorCode,
    onClose,
    onContentCreated
}: PodcastCreatorProps) {
    // Form durumu
    const [podcastType, setPodcastType] = useState<string>('news');
    const [topic, setTopic] = useState<string>('');
    const [keyPoints, setKeyPoints] = useState<string[]>(['', '', '']);
    const [selectedLevel, setSelectedLevel] = useState<string>('B1');
    const [selectedLength, setSelectedLength] = useState<string>('medium');
    const [hostVoice, setHostVoice] = useState<string>('nova');

    // Sonuç
    const [generatedContent, setGeneratedContent] = useState<any>(null);
    const [transcript, setTranscript] = useState<string>('');

    // Yükleme durumları
    const [loading, setLoading] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
    const [audioDuration, setAudioDuration] = useState<number>(0);

    const updateKeyPoint = (index: number, value: string) => {
        const newPoints = [...keyPoints];
        newPoints[index] = value;
        setKeyPoints(newPoints);
    };

    const addKeyPoint = () => {
        if (keyPoints.length < 5) {
            setKeyPoints([...keyPoints, '']);
        }
    };

    const removeKeyPoint = (index: number) => {
        if (keyPoints.length > 1) {
            setKeyPoints(keyPoints.filter((_, i) => i !== index));
        }
    };

    const handleGenerate = async () => {
        const validPoints = keyPoints.filter(p => p.trim() !== '');
        if (!topic || validPoints.length === 0) {
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('lingroot_token');
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/sectors/podcast/create`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        sector_id: sectorId,
                        podcast_type: podcastType,
                        cefr_level: selectedLevel,
                        length: selectedLength,
                        topic,
                        key_points: validPoints,
                        host_voice: hostVoice
                    })
                }
            );

            const data = await response.json();

            if (data.success) {
                setGeneratedContent(data.content);
                setTranscript(data.script?.transcript || data.content?.original_text || '');
                if (data.audio?.audioUrl) {
                    setAudioUrl(data.audio.audioUrl);
                    setAudioDuration(data.audio.duration || 0);
                    const audio = new Audio(data.audio.audioUrl);
                    setAudioRef(audio);
                }
                onContentCreated?.(data.content);
            } else {
                throw new Error(data.error || 'Podcast oluşturulamadı');
            }
        } catch (error: any) {
            console.error('Failed to generate podcast:', error);
            alert(`Podcast oluşturulurken bir hata oluştu: ${error.message || 'Bilinmeyen hata'}`);
        } finally {
            setLoading(false);
        }
    };

    const toggleAudio = () => {
        if (!audioRef) return;

        if (isPlaying) {
            audioRef.pause();
        } else {
            audioRef.play();
        }
        setIsPlaying(!isPlaying);
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const canGenerate = topic.trim() !== '' && keyPoints.some(p => p.trim() !== '');

    if (generatedContent) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative w-full max-w-xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden"
                >
                    {/* Success Header */}
                    <div className="relative h-40 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center">
                        <div className="absolute inset-0 bg-black/20" />
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", delay: 0.2 }}
                            className="relative z-10"
                        >
                            <div className="w-24 h-24 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center">
                                <Podcast className="w-12 h-12 text-white" />
                            </div>
                        </motion.div>

                        {/* Audio wave animation */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-end gap-1">
                            {[...Array(12)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ height: 4 }}
                                    animate={{ height: isPlaying ? [4, 20, 4] : 4 }}
                                    transition={{
                                        duration: 0.5,
                                        repeat: isPlaying ? Infinity : 0,
                                        delay: i * 0.05
                                    }}
                                    className="w-1 bg-white/60 rounded-full"
                                />
                            ))}
                        </div>
                    </div>

                    <div className="p-6">
                        {/* Title */}
                        <div className="text-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                {topic}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {sectorName} • {PODCAST_TYPES.find(t => t.id === podcastType)?.name}
                            </p>
                        </div>

                        {/* Audio Player */}
                        {audioUrl && (
                            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl p-5 mb-6">
                                <div className="flex items-center gap-4">
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={toggleAudio}
                                        className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-purple-500/30"
                                    >
                                        {isPlaying ? (
                                            <Pause className="w-7 h-7" />
                                        ) : (
                                            <Play className="w-7 h-7 ml-1" />
                                        )}
                                    </motion.button>

                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                Podcast
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {formatDuration(audioDuration)}
                                            </span>
                                        </div>
                                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <motion.div
                                                animate={{ width: isPlaying ? '100%' : '0%' }}
                                                transition={{ duration: audioDuration }}
                                                className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                                            />
                                        </div>
                                    </div>

                                    <a
                                        href={audioUrl}
                                        download
                                        className="p-2 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                                    >
                                        <Download className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* Transcript Preview */}
                        <div className="mb-6">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Transkript
                            </h4>
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 max-h-32 overflow-y-auto">
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                    {transcript.substring(0, 500)}{transcript.length > 500 ? '...' : ''}
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setGeneratedContent(null);
                                    setTranscript('');
                                    setAudioUrl(null);
                                }}
                                className="flex-1 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                                Yeni Podcast
                            </button>
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold"
                            >
                                Tamam
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-white dark:bg-gray-900 rounded-3xl shadow-2xl"
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-purple-500/5 to-pink-500/5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Podcast className="w-5 h-5 text-purple-500" />
                                Sektör Podcast Oluştur
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {sectorName} için özel podcast
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                        >
                            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] space-y-6">
                    {/* Podcast Türü */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Podcast Türü
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {PODCAST_TYPES.map((type) => {
                                const Icon = type.icon;
                                return (
                                    <motion.button
                                        key={type.id}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setPodcastType(type.id)}
                                        className={`
                                            p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3
                                            ${podcastType === type.id
                                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                                            }
                                        `}
                                    >
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${podcastType === type.id
                                            ? 'bg-purple-500 text-white'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                                            }`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                                                {type.name}
                                            </span>
                                            <span className="block text-xs text-gray-500 dark:text-gray-400">
                                                {type.description}
                                            </span>
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Konu */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Podcast Konusu *
                        </label>
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="Örn: 2026 Yılında Tedarik Zinciri Trendleri"
                            className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                        />
                    </div>

                    {/* Anahtar Noktalar */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Bahsedilecek Konular *
                        </label>
                        <div className="space-y-2">
                            {keyPoints.map((point, index) => (
                                <div key={index} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={point}
                                        onChange={(e) => updateKeyPoint(index, e.target.value)}
                                        placeholder={`Konu ${index + 1}`}
                                        className="flex-1 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    />
                                    {keyPoints.length > 1 && (
                                        <button
                                            onClick={() => removeKeyPoint(index)}
                                            className="px-3 text-gray-400 hover:text-red-500"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        {keyPoints.length < 5 && (
                            <button
                                onClick={addKeyPoint}
                                className="mt-2 text-sm text-purple-600 dark:text-purple-400 hover:underline"
                            >
                                + Konu Ekle
                            </button>
                        )}
                    </div>

                    {/* Ayarlar */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Seviye */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                CEFR Seviyesi
                            </label>
                            <div className="flex gap-1 flex-wrap">
                                {['A2', 'B1', 'B2', 'C1'].map((level) => (
                                    <button
                                        key={level}
                                        onClick={() => setSelectedLevel(level)}
                                        className={`
                                            px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                                            ${selectedLevel === level
                                                ? 'bg-purple-600 text-white'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                            }
                                        `}
                                    >
                                        {level}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Uzunluk */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Uzunluk
                            </label>
                            <div className="flex gap-1">
                                {LENGTH_OPTIONS.map((len) => (
                                    <button
                                        key={len.id}
                                        onClick={() => setSelectedLength(len.id)}
                                        className={`
                                            flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all text-center
                                            ${selectedLength === len.id
                                                ? 'bg-purple-600 text-white'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                            }
                                        `}
                                    >
                                        <span className="block">{len.icon}</span>
                                        <span>{len.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Ses Seçimi */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                            <Volume2 className="w-4 h-4" />
                            Sunucu Sesi
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {VOICE_OPTIONS.map((voice) => (
                                <button
                                    key={voice.id}
                                    onClick={() => setHostVoice(voice.id)}
                                    className={`
                                        p-2 rounded-lg border-2 text-center transition-all
                                        ${hostVoice === voice.id
                                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                                            : 'border-gray-200 dark:border-gray-700'
                                        }
                                    `}
                                >
                                    <span className="block text-sm font-medium text-gray-900 dark:text-white">
                                        {voice.name}
                                    </span>
                                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                                        {voice.description}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleGenerate}
                        disabled={loading || !canGenerate}
                        className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold disabled:opacity-50 shadow-lg shadow-purple-500/30"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Oluşturuluyor...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5" />
                                Podcast Oluştur
                            </>
                        )}
                    </motion.button>
                </div>
            </motion.div>
        </div>
    );
}
