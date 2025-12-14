'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft, BookOpen, User, FileText,
    Headphones, Play, Pause, Loader2, Wand2, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface AudioLevels {
    [key: string]: boolean;
}

interface Chapter {
    id: number;
    chapter_index: number;
    chapter_title: string;
    text_length: number;
    preview: string;
    audio_levels: AudioLevels;
    director_analysis?: {
        mood: string;
        narrator_tone: string;
        key_characters: string[];
        summary: string;
    };
    created_at: string;
}

interface BookDetails {
    id: number;
    title: string;
    authors: string | string[];
    cover_url: string;
    language: string;
    created_at: string;
    chapters: Chapter[];
}

const ALL_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export default function BookDetailsPage() {
    const router = useRouter();
    const params = useParams();
    const bookId = typeof params?.bookId === 'string' ? params.bookId : null;

    const [book, setBook] = useState<BookDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // UI States
    const [expandedTexts, setExpandedTexts] = useState<{ [key: number]: string }>({});
    const [loadingText, setLoadingText] = useState<number | null>(null);

    // Audio Player States
    const audioRef = useRef<HTMLAudioElement>(null);
    const [generatingAudio, setGeneratingAudio] = useState<{ chapterId: number, level: string } | null>(null);
    const [playingState, setPlayingState] = useState<{ chapterId: number, level: string } | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        if (!bookId) {
            setError('Book ID not found');
            setLoading(false);
            return;
        }

        fetchBookDetails();
    }, [bookId]);

    // Audio Event Listeners
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);
        const onEnded = () => {
            setIsPlaying(false);
            setPlayingState(null);
        };

        audio.addEventListener('play', onPlay);
        audio.addEventListener('pause', onPause);
        audio.addEventListener('ended', onEnded);

        return () => {
            audio.removeEventListener('play', onPlay);
            audio.removeEventListener('pause', onPause);
            audio.removeEventListener('ended', onEnded);
        };
    }, []);

    const fetchBookDetails = async () => {
        if (!bookId) return;
        try {
            setLoading(true);
            const token = localStorage.getItem('lingroot_token');
            const res = await fetch(`/api/books/admin/${bookId}/details`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();

            if (res.ok && json.success) {
                setBook(json.data);
            } else {
                throw new Error(json.error || 'Kitap detayları yüklenemedi');
            }
        } catch (err: any) {
            console.error('Fetch error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAudioClick = async (chapterId: number, level: string, hasAudio: boolean) => {
        // 1. If Audio Exists -> Play/Pause
        if (hasAudio) {
            // Toggle Pause if same audio
            if (playingState?.chapterId === chapterId && playingState?.level === level) {
                if (audioRef.current) {
                    if (isPlaying) audioRef.current.pause();
                    else audioRef.current.play();
                }
                return;
            }

            // Play new audio
            try {
                const token = localStorage.getItem('lingroot_token');
                // Use backend defaults
                const res = await fetch(`/api/books/${bookId}/chapters/${chapterId}/audio?level=${level}&voice_model=Joanna&speaking_rate=1`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.status === 404) {
                    alert('Ses dosyası veritabanında bulunamadı.');
                    return;
                }

                const data = await res.json();

                if (data.mp3_url && audioRef.current) {
                    audioRef.current.src = data.mp3_url;
                    await audioRef.current.play();
                    setPlayingState({ chapterId, level });
                } else {
                    alert('Ses URL alınamadı.');
                }

            } catch (e) {
                console.error(e);
                alert('Ses çalınırken hata oluştu.');
            }
            return;
        }

        // 2. If Audio Does NOT Exist -> Generate It
        if (!confirm(`${level} seviyesi için ses oluşturulsun mu?\nBu işlem birkaç dakika sürebilir.`)) {
            return;
        }

        try {
            setGeneratingAudio({ chapterId, level });
            const token = localStorage.getItem('lingroot_token');

            // Trigger TTS Generation
            const res = await fetch('/api/tts/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    type: 'chapter',
                    chapter_id: chapterId,
                    level: level,
                    input: 'placeholder', // Required by validator but overriden by backend
                    targetDurationMinutes: 5 // Optional limit
                })
            });

            const data = await res.json();

            if (!data.success) {
                throw new Error(data.message || 'Ses oluşturma başarısız oldu.');
            }

            // Success! Update UI
            if (data.mp3_url) {
                // Update local book state to mark this level as existing (green)
                setBook(prevBook => {
                    if (!prevBook) return null;
                    const newChapters = prevBook.chapters.map(ch => {
                        if (ch.id === chapterId) {
                            return {
                                ...ch,
                                audio_levels: {
                                    ...ch.audio_levels,
                                    [level]: true
                                }
                            };
                        }
                        return ch;
                    });
                    return { ...prevBook, chapters: newChapters };
                });

                // Auto-play
                if (audioRef.current) {
                    audioRef.current.src = data.mp3_url;
                    await audioRef.current.play();
                    setPlayingState({ chapterId, level });
                }

                alert('Ses başarıyla oluşturuldu!');
            } else {
                alert('Ses oluşturuldu ancak URL dönmedi. Lütfen sayfayı yenileyin.');
            }

        } catch (e: any) {
            console.error('Generation error:', e);
            alert(`Hata: ${e.message}`);
        } finally {
            setGeneratingAudio(null);
        }
    };

    const toggleText = async (chapterId: number) => {
        // Collapse if open
        if (expandedTexts[chapterId]) {
            const newTexts = { ...expandedTexts };
            delete newTexts[chapterId];
            setExpandedTexts(newTexts);
            return;
        }

        // Expand
        try {
            setLoadingText(chapterId);
            const token = localStorage.getItem('lingroot_token');
            const res = await fetch(`/api/books/${bookId}/chapters/${chapterId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.chapter_text) {
                setExpandedTexts(prev => ({ ...prev, [chapterId]: data.chapter_text }));
            } else {
                alert('Metin içeriği alınamadı');
            }
        } catch (e) {
            console.error(e);
            alert('Metin yüklenirken bir hata oluştu');
        } finally {
            setLoadingText(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (error || !book) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                <Card className="max-w-md w-full border-red-200 bg-red-50">
                    <CardContent className="p-6 text-center text-red-700">
                        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                        <h2 className="text-lg font-bold mb-2">Hata Oluştu</h2>
                        <p>{error || 'Kitap bulunamadı.'}</p>
                        <Button variant="outline" className="mt-4 bg-white hover:bg-red-50" onClick={() => router.push('/admin/books')}>
                            Listeye Dön
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10">
            <audio ref={audioRef} className="hidden" />

            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="sm" onClick={() => router.push('/admin/books')} className="text-slate-600 hover:text-slate-900">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Kitap Listesi
                    </Button>
                </div>

                {/* Book Info Card */}
                <Card className="border-0 shadow-lg overflow-hidden bg-white">
                    <div className="flex flex-col md:flex-row">
                        {/* Cover Image Side */}
                        <div className="w-full md:w-64 h-64 md:h-auto bg-slate-100 flex-shrink-0 relative">
                            {book.cover_url ? (
                                <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                    <BookOpen className="w-20 h-20" />
                                </div>
                            )}
                            <div className="absolute top-4 right-4">
                                <Badge className="bg-white/90 text-slate-900 backdrop-blur shadow-sm text-sm px-3 py-1">
                                    {book.language?.toUpperCase() || 'EN'}
                                </Badge>
                            </div>
                        </div>

                        {/* Details Side */}
                        <div className="flex-1 p-6 md:p-8 flex flex-col justify-between">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">{book.title}</h1>
                                <div className="flex items-center gap-2 text-lg text-slate-600 mb-6">
                                    <User className="w-5 h-5" />
                                    <span>{Array.isArray(book.authors) ? book.authors.join(', ') : (book.authors || 'Unknown')}</span>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                    <div className="p-3 bg-slate-50 rounded-lg">
                                        <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Toplam Bölüm</p>
                                        <p className="text-xl font-bold text-slate-800">{book.chapters.length}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-lg">
                                        <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Eklendi</p>
                                        <p className="text-slate-800 font-medium">{new Date(book.created_at).toLocaleDateString('tr-TR')}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-lg col-span-2">
                                        <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Ses Durumu</p>
                                        <div className="flex gap-1 mt-1">
                                            {ALL_LEVELS.map(level => {
                                                const hasAll = book.chapters.every(c => c.audio_levels[level]);
                                                const hasSome = book.chapters.some(c => c.audio_levels[level]);
                                                let color = "bg-gray-200 text-gray-400";
                                                if (hasAll) color = "bg-green-100 text-green-700 font-bold border-green-200 border";
                                                else if (hasSome) color = "bg-yellow-100 text-yellow-700 border-yellow-200 border";

                                                return <div key={level} className={`text-[10px] w-6 h-6 rounded flex items-center justify-center ${color}`}>{level}</div>
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Chapters List */}
                <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <FileText className="w-6 h-6 text-indigo-600" />
                        Bölümler ve İçerik
                    </h2>

                    <div className="grid gap-4">
                        {book.chapters.map((chapter) => {
                            const isTextExpanded = !!expandedTexts[chapter.id];
                            const isLoadingThisText = loadingText === chapter.id;

                            return (
                                <Card key={chapter.id} className="hover:border-indigo-200 transition-colors">
                                    <CardContent className="p-5">
                                        <div className="flex flex-col md:flex-row gap-6">

                                            {/* Chapter Info */}
                                            <div className="flex-1 space-y-3">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <Badge variant="outline" className="mb-2">Bölüm {chapter.chapter_index}</Badge>
                                                        <h3 className="font-bold text-lg text-slate-800">{chapter.chapter_title}</h3>
                                                    </div>
                                                    {chapter.director_analysis && (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger>
                                                                    <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200 flex items-center gap-1 cursor-help">
                                                                        <Wand2 className="w-3 h-3" /> Analiz Var
                                                                    </Badge>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="max-w-xs bg-slate-900 text-slate-50 border-slate-800">
                                                                    <div className="space-y-2 text-xs">
                                                                        <p><strong>Mood:</strong> {chapter.director_analysis.mood}</p>
                                                                        <p><strong>Tone:</strong> {chapter.director_analysis.narrator_tone}</p>
                                                                        <p><strong>Summary:</strong> {chapter.director_analysis.summary?.substring(0, 100)}...</p>
                                                                    </div>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                </div>

                                                {/* Text Content Area */}
                                                <div className="mt-3">
                                                    {!isTextExpanded ? (
                                                        <div
                                                            className="text-sm text-slate-500 line-clamp-2 italic border-l-2 border-slate-200 pl-3 cursor-pointer hover:text-slate-800 transition-colors"
                                                            onClick={() => toggleText(chapter.id)}
                                                        >
                                                            {chapter.preview || 'Önizleme yok...'}
                                                        </div>
                                                    ) : (
                                                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm text-slate-800 font-serif leading-relaxed h-[300px] overflow-y-auto">
                                                            {expandedTexts[chapter.id]}
                                                        </div>
                                                    )}

                                                    <Button variant="ghost" size="sm" onClick={() => toggleText(chapter.id)} className="mt-2 text-indigo-600 hover:text-indigo-800 h-8 text-xs p-0 hover:bg-transparent">
                                                        {isLoadingThisText ? (
                                                            <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Yükleniyor...</>
                                                        ) : isTextExpanded ? (
                                                            <><ChevronUp className="w-3 h-3 mr-1" /> Metni Gizle</>
                                                        ) : (
                                                            <><ChevronDown className="w-3 h-3 mr-1" /> Tam Metni Göster ({chapter.text_length} karakter)</>
                                                        )}
                                                    </Button>
                                                </div>

                                            </div>

                                            {/* Audio Controls */}
                                            <div className="w-full md:w-auto flex flex-col gap-2 min-w-[200px]">
                                                <p className="text-xs font-semibold text-slate-500 uppercase mb-1 flex items-center gap-1">
                                                    <Headphones className="w-3 h-3" /> Ses Dosyaları
                                                </p>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {ALL_LEVELS.map(level => {
                                                        const hasAudio = chapter.audio_levels[level];
                                                        const isThisPlaying = playingState?.chapterId === chapter.id && playingState?.level === level && isPlaying;
                                                        const isGenerating = generatingAudio?.chapterId === chapter.id && generatingAudio?.level === level;

                                                        return (
                                                            <Button
                                                                key={level}
                                                                variant={hasAudio ? "default" : "outline"}
                                                                size="sm"
                                                                disabled={isGenerating}
                                                                className={`h-8 text-xs transition-all ${hasAudio
                                                                        ? (isThisPlaying ? 'bg-indigo-600 hover:bg-indigo-700 animate-pulse' : 'bg-green-600 hover:bg-green-700')
                                                                        : 'text-slate-500 border-slate-200 bg-slate-50'
                                                                    }`}
                                                                onClick={() => handleAudioClick(chapter.id, level, hasAudio)}
                                                            >
                                                                {isGenerating ? (
                                                                    <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
                                                                ) : isThisPlaying ? (
                                                                    <Pause className="w-3 h-3 mr-1" />
                                                                ) : (hasAudio ? (
                                                                    <Play className="w-3 h-3 mr-1" />
                                                                ) : (
                                                                    <PlusSmall className="w-3 h-3 mr-1" />
                                                                ))}
                                                                {level}
                                                            </Button>
                                                        )
                                                    })}
                                                </div>
                                            </div>

                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
}

function PlusSmall({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M5 12h14" />
            <path d="M12 5v14" />
        </svg>
    )
}
