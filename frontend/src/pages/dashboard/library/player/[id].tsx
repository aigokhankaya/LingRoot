
import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { AudioPlayer } from '@/components/library/Player/AudioPlayer';
import {
  getLibraryItemDetails,
  processTts,
  ChapterInfo,
  LibraryItemDetails
} from '@/lib/api';
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Play,
  Check,
  Loader2,
  Volume2,
  ChevronRight,
  Settings
} from 'lucide-react';

type ChapterStatus = 'idle' | 'generating' | 'ready' | 'error';

interface ChapterState {
  status: ChapterStatus;
  audioUrl?: string;
  error?: string;
}

export default function PlayerPage() {
  const router = useRouter();
  const { id, type } = router.query;
  const { user, isLoading: authLoading } = useAuth();

  const [itemDetails, setItemDetails] = useState<LibraryItemDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeChapterIndex, setActiveChapterIndex] = useState(1);
  const [chapterStates, setChapterStates] = useState<Record<number, ChapterState>>({});
  const [level, setLevel] = useState('A2');
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioNotification, setAudioNotification] = useState<{
    chapterId: number;
    chapterIndex: number;
  } | null>(null);

  // Auth check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch item details
  const fetchDetails = useCallback(async () => {
    try {
      setLoading(true);
      const contentType = type as 'book' | 'document';
      const response = await getLibraryItemDetails(Number(id), contentType);

      if (response.success && response.data) {
        setItemDetails(response.data);
        setActiveChapterIndex(response.data.progress.current_chapter_index || 1);
      }
    } catch (error) {
      console.error('Failed to fetch item details:', error);
    } finally {
      setLoading(false);
    }
  }, [id, type]);

  useEffect(() => {
    if (id && type && user) {
      fetchDetails();
    }
  }, [id, type, user, fetchDetails]);

  // Generate audio for a chapter
  const generateChapterAudio = useCallback(async (chapter: ChapterInfo) => {
    const chapterId = chapter.id;

    setChapterStates(prev => ({
      ...prev,
      [chapterId]: { status: 'generating' }
    }));

    try {
      const response = await processTts({
        type: 'book',
        input: chapter.content,
        level,
        chapter_id: String(chapterId)
      });

      if (response.mp3_url) {
        setChapterStates(prev => ({
          ...prev,
          [chapterId]: { status: 'ready', audioUrl: response.mp3_url }
        }));
        return response.mp3_url;
      } else {
        throw new Error('No audio URL returned');
      }
    } catch (error: any) {
      console.error('TTS generation failed:', error);
      setChapterStates(prev => ({
        ...prev,
        [chapterId]: { status: 'error', error: error.message }
      }));
      return null;
    }
  }, [level]);

  // Play chapter
  const handlePlayChapter = async (chapter: ChapterInfo) => {
    const currentState = chapterStates[chapter.id];

    // If audio already generated, just play
    if (currentState?.status === 'ready' && currentState.audioUrl) {
      setActiveChapterIndex(chapter.index);
      setIsPlaying(true);
      return;
    }

    // Generate audio first - don't auto-play, show notification
    const audioUrl = await generateChapterAudio(chapter);
    if (audioUrl) {
      // Show notification instead of auto-playing
      setAudioNotification({
        chapterId: chapter.id,
        chapterIndex: chapter.index
      });
      // Auto-hide after 5 seconds
      setTimeout(() => {
        setAudioNotification(null);
      }, 5000);
    }
  };

  // Handle notification click
  const handleNotificationClick = () => {
    if (audioNotification) {
      setActiveChapterIndex(audioNotification.chapterIndex);
      setIsPlaying(true);
      setAudioNotification(null);
    }
  };

  // Handle chapter end - auto-play next
  const handleChapterEnded = () => {
    setIsPlaying(false);

    if (!itemDetails) return;

    const currentIdx = itemDetails.chapters.findIndex(c => c.index === activeChapterIndex);
    if (currentIdx < itemDetails.chapters.length - 1) {
      const nextChapter = itemDetails.chapters[currentIdx + 1];
      handlePlayChapter(nextChapter);
    }
  };

  // Get current chapter
  const currentChapter = itemDetails?.chapters.find(c => c.index === activeChapterIndex);
  const currentChapterState = currentChapter ? chapterStates[currentChapter.id] : null;
  const currentAudioUrl = currentChapterState?.audioUrl || '';

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-[#0f1115]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!itemDetails) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-[#0f1115]">
        <BookOpen size={48} className="text-gray-400 mb-4" />
        <p className="text-gray-500">İçerik bulunamadı</p>
        <Link href="/dashboard/library" className="mt-4 text-blue-500 hover:underline">
          Kütüphaneye Dön
        </Link>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{itemDetails.item.title} | LingRoot Player</title>
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-[#0f1115] pb-32">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#0f1115]/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/library"
                className="p-2 -ml-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1">
                  {itemDetails.item.title}
                </h1>
                <p className="text-sm text-gray-500">{itemDetails.item.author}</p>
              </div>
            </div>

            {/* Level Selector */}
            <div className="flex items-center gap-2">
              <Settings size={16} className="text-gray-400" />
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="bg-gray-100 dark:bg-gray-800 text-sm px-3 py-1.5 rounded-lg border-none outline-none focus:ring-2 focus:ring-blue-500"
              >
                {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Audio Generation Notification */}
          {audioNotification && (
            <div
              onClick={handleNotificationClick}
              className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center justify-between cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center">
                  <Check size={20} />
                </div>
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">Seslendirme tamamlandı</p>
                  <p className="text-sm text-green-600 dark:text-green-400">Dinlemek için tıklayın</p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setAudioNotification(null);
                }}
                className="w-8 h-8 rounded-full hover:bg-green-200 dark:hover:bg-green-800 flex items-center justify-center text-green-600 dark:text-green-400"
              >
                ✕
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Chapter List - Left Sidebar */}
            <div className="lg:col-span-1 order-2 lg:order-1">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                  <h2 className="font-bold text-gray-900 dark:text-white">
                    {type === 'book' ? 'Bölümler' : 'Bölümler'}
                  </h2>
                  <p className="text-sm text-gray-500">{itemDetails.chapters.length} bölüm</p>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[60vh] overflow-y-auto">
                  {itemDetails.chapters.map((chapter) => {
                    const state = chapterStates[chapter.id];
                    const isActive = chapter.index === activeChapterIndex;

                    return (
                      <button
                        key={chapter.id}
                        onClick={() => handlePlayChapter(chapter)}
                        disabled={state?.status === 'generating'}
                        className={`w-full p-4 text-left flex items-center gap-3 transition-colors ${isActive
                          ? 'bg-blue-50 dark:bg-blue-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                          } `}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${state?.status === 'ready'
                          ? 'bg-green-100 text-green-600 dark:bg-green-900/30'
                          : state?.status === 'generating'
                            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-700'
                          } `}>
                          {state?.status === 'generating' ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : state?.status === 'ready' ? (
                            <Check size={16} />
                          ) : (
                            <Play size={14} className="ml-0.5" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                            } `}>
                            {chapter.title}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {chapter.content.split(' ').length} kelime
                          </p>
                        </div>

                        {isActive && isPlaying && (
                          <Volume2 size={16} className="text-blue-500 animate-pulse" />
                        )}

                        <ChevronRight size={16} className="text-gray-400" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Content Area - Main */}
            <div className="lg:col-span-2 order-1 lg:order-2">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                {currentChapter ? (
                  <>
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                        {type === 'book' ? <BookOpen size={20} className="text-blue-600" /> : <FileText size={20} className="text-blue-600" />}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                          {currentChapter.title}
                        </h2>
                        <p className="text-sm text-gray-500">
                          Bölüm {currentChapter.index} / {itemDetails.chapters.length}
                        </p>
                      </div>
                    </div>

                    {/* Chapter Content */}
                    <div className="prose prose-gray dark:prose-invert max-w-none">
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {currentChapter.content}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500">Bir bölüm seçin</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Audio Player */}
        {currentAudioUrl && (
          <AudioPlayer
            src={currentAudioUrl}
            contentType={type as 'book' | 'document'}
            contentId={Number(id)}
            chapterIndex={activeChapterIndex}
            onEnded={handleChapterEnded}
            autoPlay={isPlaying}
          />
        )}
      </div>
    </>
  );
}
