'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Play,
    Pause,
    Volume2,
    VolumeX,
    SkipBack,
    SkipForward,
    Clock,
    BookOpen,
    GraduationCap,
    MessageSquare,
    Check,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    AlertCircle,
    Bookmark,
    Share2,
    Eye,
    EyeOff,
    Loader2,
    Sparkles
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { SECTOR_COLORS, DEFAULT_COLOR } from '@/components/sectors/SectorCard';
import { CONTENT_TYPE_CONFIG, LEVEL_COLORS } from '@/components/sectors/ContentCard';

interface ContentData {
    id: string | number;
    title: string;
    content_type?: string;
    type?: string;
    cefr_level?: string;
    level?: string;
    original_text?: string;
    text_content?: string;
    english_text?: string;
    adapted_text?: string;
    translated_text?: string;
    translation?: string;
    turkish_text?: string;
    dialogue_data?: {
        // Old format (for backward compatibility)
        lines?: Array<{
            speaker: string;
            english: string;
            turkish: string;
        }>;
        // New roleplay format
        dialogue_turns?: Array<{
            role_id: string;
            speaker: string;
            english: string;
            turkish: string;
            key_phrase?: boolean;
        }>;
        // Other roleplay metadata
        roles?: Array<{
            id: string;
            title: string;
            title_en?: string;
        }>;
        setting?: string;
        situation?: string;
    };
    key_vocabulary?: string[];
    comprehension_questions?: Array<{
        question: string;
        options: string[];
        correct: number;
    }>;
    audio_url?: string;
    estimated_minutes?: number;
    sector_id?: number;
    sector_code?: string;
}


export default function SectorContentPage() {
    const params = useParams();
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const { id, contentId } = params as { id: string; contentId: string };

    // Content state
    const [content, setContent] = useState<ContentData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Completion state
    const [isCompleting, setIsCompleting] = useState(false);
    const [completionResult, setCompletionResult] = useState<{ xpAdded?: number; leveledUp?: boolean } | null>(null);

    // UI states
    const [showTranslation, setShowTranslation] = useState(false);
    const [showVocabulary, setShowVocabulary] = useState(true);
    const [showQuiz, setShowQuiz] = useState(false);
    const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
    const [quizSubmitted, setQuizSubmitted] = useState(false);

    // Audio states
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);

    // TTS states
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [audioError, setAudioError] = useState<string | null>(null);

    // Fetch content
    useEffect(() => {
        if (!contentId) return;

        const fetchContent = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await fetch(api.getApiUrl(`sectors/content/${contentId}`));
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data) {
                        setContent(data.data);
                    } else {
                        setContent(getMockContent(contentId));
                    }
                } else {
                    setContent(getMockContent(contentId));
                }
            } catch (e) {
                console.error(e);
                setError('İçerik yüklenirken bir hata oluştu.');
                setContent(getMockContent(contentId));
            } finally {
                setLoading(false);
            }
        };

        fetchContent();
    }, [contentId]);

    // Audio controls
    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const toggleMute = () => {
        if (audioRef.current) {
            audioRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const skip = (seconds: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + seconds));
        }
    };

    const formatTime = (time: number) => {
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Quiz handling
    const handleQuizAnswer = (questionIndex: number, answerIndex: number) => {
        if (quizSubmitted) return;
        setQuizAnswers(prev => ({ ...prev, [questionIndex]: answerIndex }));
    };

    const submitQuiz = () => {
        setQuizSubmitted(true);
    };

    const resetQuiz = () => {
        setQuizAnswers({});
        setQuizSubmitted(false);
    };

    // Speak word
    const speakWord = (text: string) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 0.85;
            speechSynthesis.speak(utterance);
        }
    };

    // Generate Audio handler
    const handleGenerateAudio = async () => {
        try {
            setIsGeneratingAudio(true);
            setAudioError(null);

            const response = await fetch(api.getApiUrl(`sectors/content/${contentId}/audio`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    voice: 'nova',
                    speed: 0.9
                })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data?.audioUrl) {
                    setAudioUrl(result.data.audioUrl);
                    // Start playing automatically
                    setTimeout(() => {
                        if (audioRef.current) {
                            audioRef.current.play().catch(console.error);
                            setIsPlaying(true);
                        }
                    }, 500);
                } else {
                    setAudioError('Ses oluşturulamadı.');
                }
            } else {
                setAudioError('Ses servisine erişilemedi.');
            }
        } catch (e) {
            console.error('Audio generation error:', e);
            setAudioError('Ses oluşturulurken bir hata oluştu.');
        } finally {
            setIsGeneratingAudio(false);
        }
    };

    // Complete content handler
    const handleCompleteContent = async () => {
        // If not authenticated, just go back
        if (!isAuthenticated) {
            router.back();
            return;
        }

        try {
            setIsCompleting(true);

            const token = localStorage.getItem('lingroot_token');
            const response = await fetch(api.getApiUrl(`sectors/content/${contentId}/complete`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data?.xp) {
                    // If already completed, don't show XP animation
                    if (result.data.alreadyCompleted) {
                        router.back();
                        return;
                    }
                    setCompletionResult({
                        xpAdded: result.data.xp.xpAdded || 50,
                        leveledUp: result.data.xp.leveledUp || false
                    });
                    // Show success animation briefly, then go back
                    setTimeout(() => {
                        router.back();
                    }, 2000);
                    return;
                }
            }
            // If API fails, just go back
            router.back();
        } catch (e) {
            console.error('Completion error:', e);
            router.back();
        } finally {
            setIsCompleting(false);
        }
    };

    // Get mock content for demo
    function getMockContent(id: string): ContentData {
        return {
            id,
            title: 'Sprint Planning Meeting',
            content_type: 'dialogue',
            cefr_level: 'B2',
            original_text: `Project Manager: Good morning everyone. Let's get started with our sprint planning. Sarah, can you give us an update on the current backlog?

Sarah: Sure. We have 15 story points remaining from the last sprint. The main blockers were the API integration issues.

Project Manager: I see. What's the priority for this sprint?

Developer: We need to focus on the authentication module. The deadline is next Friday.

Sarah: I agree. We should also allocate some time for code review and testing.

Project Manager: Let's estimate the tasks. I'm thinking 8 points for auth, 5 for testing. Any objections?`,
            translated_text: `Proje Yöneticisi: Herkese günaydın. Sprint planlamasına başlayalım. Sarah, mevcut backlog hakkında bize bilgi verebilir misin?

Sarah: Tabii. Geçen sprintten 15 story point kaldı. Ana engeller API entegrasyon sorunlarıydı.

Proje Yöneticisi: Anlıyorum. Bu sprint için öncelik nedir?

Geliştirici: Kimlik doğrulama modülüne odaklanmamız gerekiyor. Teslim tarihi önümüzdeki Cuma.

Sarah: Katılıyorum. Kod inceleme ve test için de zaman ayırmalıyız.

Proje Yöneticisi: Görevleri tahmin edelim. Auth için 8, test için 5 puan düşünüyorum. İtirazı olan var mı?`,
            dialogue_data: {
                lines: [
                    { speaker: 'Project Manager', english: "Good morning everyone. Let's get started with our sprint planning.", turkish: 'Herkese günaydın. Sprint planlamasına başlayalım.' },
                    { speaker: 'Sarah', english: 'We have 15 story points remaining from the last sprint.', turkish: 'Geçen sprintten 15 story point kaldı.' },
                    { speaker: 'Developer', english: 'We need to focus on the authentication module.', turkish: 'Kimlik doğrulama modülüne odaklanmamız gerekiyor.' },
                ]
            },
            key_vocabulary: ['sprint planning', 'backlog', 'story points', 'blockers', 'authentication', 'code review', 'estimate'],
            comprehension_questions: [
                {
                    question: 'How many story points remain from the last sprint?',
                    options: ['10', '15', '20', '8'],
                    correct: 1
                },
                {
                    question: 'What was the main issue in the previous sprint?',
                    options: ['Budget problems', 'Team conflicts', 'API integration issues', 'Design changes'],
                    correct: 2
                },
                {
                    question: 'When is the deadline for the authentication module?',
                    options: ['This Wednesday', 'Next Monday', 'Next Friday', 'In two weeks'],
                    correct: 2
                }
            ],
            estimated_minutes: 8,
        };
    }

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">İçerik yükleniyor...</p>
                </div>
            </div>
        );
    }

    if (!content) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
                <div className="text-center">
                    <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">İçerik bulunamadı</h2>
                    <button
                        onClick={() => router.back()}
                        className="mt-4 px-6 py-3 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600"
                    >
                        Geri Dön
                    </button>
                </div>
            </div>
        );
    }

    const contentType = content.content_type || content.type || 'article';
    const typeConfig = CONTENT_TYPE_CONFIG[contentType] || CONTENT_TYPE_CONFIG['article'];
    const level = content.cefr_level || content.level || 'B1';
    const levelColors = LEVEL_COLORS[level] || LEVEL_COLORS['B1'];
    const englishText = content.original_text || content.text_content || content.english_text || content.adapted_text || '';
    const turkishText = content.translated_text || content.translation || content.turkish_text || '';


    // Normalize dialogue data - support both old (lines) and new (dialogue_turns) formats
    type DialogueLine = {
        speaker: string;
        english: string;
        turkish: string;
        role_id?: string;
        key_phrase?: boolean;
    };
    const dialogueLines: DialogueLine[] = (content.dialogue_data?.lines || content.dialogue_data?.dialogue_turns || []) as DialogueLine[];
    const hasDialogue = dialogueLines.length > 0;
    const hasQuiz = !!content.comprehension_questions?.length;



    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span className="hidden sm:inline">Geri</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${typeConfig.bgColor} ${typeConfig.color}`}>
                            <typeConfig.icon className="w-3.5 h-3.5" />
                            {typeConfig.label}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${levelColors.bg} ${levelColors.text}`}>
                            {level}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
                            <Bookmark className="w-5 h-5" />
                        </button>
                        <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
                            <Share2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Title */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        {content.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            ~{content.estimated_minutes || 5} dakika
                        </span>
                        {content.key_vocabulary && (
                            <span className="flex items-center gap-1.5">
                                <GraduationCap className="w-4 h-4" />
                                {content.key_vocabulary.length} anahtar terim
                            </span>
                        )}
                        {hasQuiz && (
                            <span className="flex items-center gap-1.5">
                                <BookOpen className="w-4 h-4" />
                                {content.comprehension_questions?.length} soru
                            </span>
                        )}
                    </div>
                </motion.div>

                {/* Audio Player or Generate Button */}
                {(content.audio_url || audioUrl) ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mb-8 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-2xl p-6 text-white shadow-lg"
                    >
                        <audio
                            ref={audioRef}
                            src={audioUrl || content.audio_url}
                            onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
                            onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
                            onEnded={() => {
                                setIsPlaying(false);
                                // Track listening minutes when audio completes
                                if (isAuthenticated && duration > 0) {
                                    const minutes = Math.floor(duration / 60);
                                    if (minutes > 0) {
                                        const token = localStorage.getItem('lingroot_token');
                                        fetch(api.getApiUrl(`sectors/content/${contentId}/progress`), {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${token}`
                                            },
                                            body: JSON.stringify({
                                                status: 'in_progress',
                                                progress_percentage: 100,
                                                last_position_seconds: duration
                                            })
                                        }).catch(console.error);
                                    }
                                }
                            }}
                        />

                        <div className="flex items-center gap-4">
                            <button onClick={() => skip(-10)} className="p-2 hover:bg-white/20 rounded-full">
                                <SkipBack className="w-5 h-5" />
                            </button>

                            <button
                                onClick={togglePlay}
                                className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform bg-opacity-100 text-teal-600"
                            >
                                {isPlaying ? (
                                    <Pause className="w-6 h-6 text-teal-600" />
                                ) : (
                                    <Play className="w-6 h-6 text-teal-600 ml-1" />
                                )}
                            </button>

                            <button onClick={() => skip(10)} className="p-2 hover:bg-white/20 rounded-full">
                                <SkipForward className="w-5 h-5" />
                            </button>

                            <div className="flex-1 mx-4">
                                <input
                                    type="range"
                                    min={0}
                                    max={duration || 100}
                                    value={currentTime}
                                    onChange={handleSeek}
                                    className="w-full h-2 bg-white/30 rounded-full appearance-none cursor-pointer accent-white"
                                />
                                <div className="flex justify-between text-sm mt-1 opacity-80">
                                    <span>{formatTime(currentTime)}</span>
                                    <span>{formatTime(duration)}</span>
                                </div>
                            </div>

                            <button onClick={toggleMute} className="p-2 hover:bg-white/20 rounded-full">
                                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mb-8 bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center">
                                <Volume2 className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">Sesli Dinle</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {audioError ? (
                                        <span className="text-red-500">{audioError}</span>
                                    ) : (
                                        "Bu içerik için yapay zeka ile ses oluşturabilirsiniz."
                                    )}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={handleGenerateAudio}
                            disabled={isGeneratingAudio}
                            className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all ${isGeneratingAudio
                                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                : 'bg-teal-500 hover:bg-teal-600 text-white shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 hover:-translate-y-0.5'
                                }`}
                        >
                            {isGeneratingAudio ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    <span>Oluşturuluyor...</span>
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4 fill-current" />
                                    <span>Ses Oluştur</span>
                                </>
                            )}
                        </button>
                    </motion.div>
                )}

                {/* Key Vocabulary */}
                {content.key_vocabulary && content.key_vocabulary.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="mb-8"
                    >
                        <button
                            onClick={() => setShowVocabulary(!showVocabulary)}
                            className="flex items-center justify-between w-full p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-800/50 flex items-center justify-center">
                                    <GraduationCap className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-semibold text-gray-900 dark:text-white">Anahtar Terimler</h3>
                                    <p className="text-sm text-gray-500">{content.key_vocabulary.length} terim</p>
                                </div>
                            </div>
                            {showVocabulary ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                        </button>

                        <AnimatePresence>
                            {showVocabulary && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="flex flex-wrap gap-2 mt-4">
                                        {content.key_vocabulary.map((word, i) => (
                                            <button
                                                key={i}
                                                onClick={() => speakWord(word)}
                                                className="group flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-teal-300 dark:hover:border-teal-600 hover:shadow-md transition-all"
                                            >
                                                <span className="font-medium text-gray-900 dark:text-white">{word}</span>
                                                <Volume2 className="w-4 h-4 text-gray-400 group-hover:text-teal-500 transition-colors" />
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}

                {/* Main Text Content */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-8"
                >
                    {/* Toggle translation button */}
                    <div className="flex justify-end mb-4">
                        <button
                            onClick={() => setShowTranslation(!showTranslation)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${showTranslation
                                ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                        >
                            {showTranslation ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            {showTranslation ? 'Çeviriyi Gizle' : 'Çeviriyi Göster'}
                        </button>
                    </div>

                    {/* Dialogue format */}
                    {hasDialogue ? (
                        <div className="space-y-4">
                            {dialogueLines.map((line, i) => {
                                // Role-based color coding
                                const isRole1 = 'role_id' in line ? line.role_id === 'role_1' : i % 2 === 0;
                                const isKeyPhrase = 'key_phrase' in line && line.key_phrase;

                                return (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: isRole1 ? -20 : 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3 + i * 0.05 }}
                                        className={`bg-white dark:bg-gray-800 rounded-xl p-4 border ${isKeyPhrase
                                            ? 'border-amber-300 dark:border-amber-600 ring-1 ring-amber-200 dark:ring-amber-700'
                                            : 'border-gray-100 dark:border-gray-700'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${isRole1
                                                ? 'bg-gradient-to-br from-blue-500 to-indigo-500'
                                                : 'bg-gradient-to-br from-purple-500 to-pink-500'
                                                }`}>
                                                {line.speaker.charAt(0)}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{line.speaker}</p>
                                                    {isKeyPhrase && (
                                                        <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium rounded">
                                                            Anahtar İfade
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-gray-900 dark:text-white leading-relaxed">{line.english}</p>
                                                {showTranslation && (
                                                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 italic">{line.turkish}</p>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => speakWord(line.english)}
                                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-teal-500"
                                            >
                                                <Volume2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>

                    ) : (
                        /* Regular text format */
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 lg:p-8 border border-gray-100 dark:border-gray-700 shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-2 h-2 rounded-full bg-teal-500" />
                                    <h3 className="text-sm font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider">English</h3>
                                </div>
                                <div className="prose dark:prose-invert max-w-none">
                                    <p className="text-lg text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                                        {englishText}
                                    </p>
                                </div>
                            </div>

                            <AnimatePresence>
                                {showTranslation && turkishText && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="bg-gray-100 dark:bg-gray-800/50 rounded-2xl p-6 lg:p-8 border border-gray-200 dark:border-gray-700"
                                    >
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-2 h-2 rounded-full bg-gray-400" />
                                            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Türkçe Çeviri</h3>
                                        </div>
                                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                            {turkishText}
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </motion.div>

                {/* Comprehension Quiz */}
                {hasQuiz && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mb-8"
                    >
                        <button
                            onClick={() => setShowQuiz(!showQuiz)}
                            className="flex items-center justify-between w-full p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-800/50 flex items-center justify-center">
                                    <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-semibold text-gray-900 dark:text-white">Anlama Testi</h3>
                                    <p className="text-sm text-gray-500">{content.comprehension_questions?.length} soru</p>
                                </div>
                            </div>
                            {showQuiz ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                        </button>

                        <AnimatePresence>
                            {showQuiz && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="mt-4 space-y-6">
                                        {content.comprehension_questions?.map((q, qIndex) => (
                                            <div key={qIndex} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
                                                <p className="font-medium text-gray-900 dark:text-white mb-4">
                                                    {qIndex + 1}. {q.question}
                                                </p>
                                                <div className="space-y-2">
                                                    {q.options.map((option, oIndex) => {
                                                        const isSelected = quizAnswers[qIndex] === oIndex;
                                                        const isCorrect = oIndex === q.correct;
                                                        const showResult = quizSubmitted;

                                                        let bgClass = 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700';
                                                        if (isSelected && !showResult) {
                                                            bgClass = 'bg-teal-100 dark:bg-teal-900/40 border-teal-300 dark:border-teal-700';
                                                        } else if (showResult && isCorrect) {
                                                            bgClass = 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700';
                                                        } else if (showResult && isSelected && !isCorrect) {
                                                            bgClass = 'bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700';
                                                        }

                                                        return (
                                                            <button
                                                                key={oIndex}
                                                                onClick={() => handleQuizAnswer(qIndex, oIndex)}
                                                                disabled={quizSubmitted}
                                                                className={`w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-600 transition-colors ${bgClass}`}
                                                            >
                                                                <span className="flex items-center gap-3">
                                                                    <span className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold">
                                                                        {String.fromCharCode(65 + oIndex)}
                                                                    </span>
                                                                    <span className="text-gray-800 dark:text-gray-200">{option}</span>
                                                                    {showResult && isCorrect && <Check className="w-5 h-5 text-emerald-500 ml-auto" />}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}

                                        <div className="flex justify-center gap-4">
                                            {!quizSubmitted ? (
                                                <button
                                                    onClick={submitQuiz}
                                                    disabled={Object.keys(quizAnswers).length !== content.comprehension_questions?.length}
                                                    className="px-6 py-3 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    Cevapları Kontrol Et
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={resetQuiz}
                                                    className="flex items-center gap-2 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                                >
                                                    <RefreshCw className="w-4 h-4" />
                                                    Tekrar Dene
                                                </button>
                                            )}
                                        </div>

                                        {quizSubmitted && (
                                            <div className="text-center p-4 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-xl">
                                                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                    Sonuç: {Object.entries(quizAnswers).filter(([qIdx, ans]) =>
                                                        content.comprehension_questions?.[parseInt(qIdx)]?.correct === ans
                                                    ).length} / {content.comprehension_questions?.length}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}

                {/* Completion button */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-col items-center gap-4"
                >
                    {completionResult ? (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-center p-6 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/30 dark:to-cyan-900/30 rounded-2xl border border-teal-200 dark:border-teal-700"
                        >
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <Sparkles className="w-6 h-6 text-amber-500" />
                                <span className="text-2xl font-bold text-teal-600 dark:text-teal-400">+{completionResult.xpAdded} XP</span>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300">
                                {completionResult.leveledUp ? 'Level atladın!' : 'İçerik tamamlandı!'}
                            </p>
                        </motion.div>
                    ) : (
                        <button
                            onClick={handleCompleteContent}
                            disabled={isCompleting}
                            className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-2xl font-semibold shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isCompleting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Kaydediliyor...
                                </>
                            ) : (
                                <>
                                    <Check className="w-5 h-5" />
                                    İçeriği Tamamladım
                                </>
                            )}
                        </button>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
