import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import {
  searchBooks,
  getBookChapters,
  getUserBookFavorites,
  getUserBookFavoritesDetails,
  saveBookFavorites,
  getChapterAudio,
  getUserBookHistory,
  processTts,
  BookSearchResult,
  BookChapter,
  BookHistoryItem,
  FavoriteBookItem
} from '@/lib/api';
import PaginatedBookReader from './PaginatedBookReader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

type ViewMode = 'search' | 'chapters' | 'player';

interface ChapterAudioState {
  status: 'idle' | 'generating' | 'ready' | 'error';
  mp3_url?: string;
  vtt_url?: string;
  adapted_text?: string;
  translated_text?: string;
  timepoints?: Array<{ timeSeconds: number; endTimeSeconds?: number; word?: string; markName?: string }>;
  words?: string[];
  level?: string;
  error?: string;
}

export default function BookTab() {
  const { user } = useAuth();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BookSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Selected book & chapters
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null);
  const [chapters, setChapters] = useState<BookChapter[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<BookChapter | null>(null);

  // Audio player state
  const [chapterAudioStates, setChapterAudioStates] = useState<Record<number, ChapterAudioState>>({});
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Favorites
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [favoriteBooks, setFavoriteBooks] = useState<FavoriteBookItem[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);

  // History
  const [bookHistory, setBookHistory] = useState<BookHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Settings
  const [level, setLevel] = useState('A2');
  const [viewMode, setViewMode] = useState<ViewMode>('search');

  // Expanded chapters (accordion)
  const [expandedChapterId, setExpandedChapterId] = useState<number | null>(null);

  // Notification for completed audio generation
  const [audioNotification, setAudioNotification] = useState<{
    chapterId: number;
    message: string;
  } | null>(null);

  // Try to fetch existing audio for a chapter (cached on backend)
  const ensureChapterAudio = useCallback(async (chapter: BookChapter) => {
    if (!selectedBook) return;
    const current = chapterAudioStates[chapter.id];
    if (current?.mp3_url) return; // already have audio
    try {
      // Use defaults: Joanna, rate 1x, current level
      const cached = await getChapterAudio(selectedBook.id, chapter.id, 'Joanna', 1, level);
      if (cached?.mp3_url) {
        setChapterAudioStates(prev => ({
          ...prev,
          [chapter.id]: { status: 'ready', mp3_url: cached.mp3_url }
        }));
      }
    } catch (err) {
      console.warn('[BookTab] getChapterAudio failed:', err);
    }
  }, [chapterAudioStates, level, selectedBook]);

  // Load favorites on mount
  useEffect(() => {
    if (user) {
      loadFavorites();
      loadHistory();
    }
  }, [user]);

  // When chapters load, try to pull cached audio (if already generated on backend)
  useEffect(() => {
    if (selectedBook && chapters.length > 0) {
      chapters.forEach(ch => {
        ensureChapterAudio(ch);
      });
    }
  }, [chapters, ensureChapterAudio, selectedBook]);

  const loadFavorites = async () => {
    try {
      setFavoritesLoading(true);
      // Load both IDs and full details
      const [idsResponse, detailsResponse] = await Promise.all([
        getUserBookFavorites(),
        getUserBookFavoritesDetails()
      ]);
      if (idsResponse.success && idsResponse.data) {
        setFavoriteIds(idsResponse.data);
      }
      if (detailsResponse.success && detailsResponse.data) {
        setFavoriteBooks(detailsResponse.data);
      }
    } catch (error) {
      console.error('Failed to load favorites:', error);
    } finally {
      setFavoritesLoading(false);
    }
  };

  const loadHistory = async () => {
    if (!user) return;
    try {
      setHistoryLoading(true);
      const response = await getUserBookHistory(user.id, 1, 50);
      if (response.success && response.data) {
        setBookHistory(response.data);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Search books
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setSearchLoading(true);
      setSearchError(null);
      const result = await searchBooks(searchQuery.trim(), 1, 20);
      setSearchResults(result.books);
      setViewMode('search');
    } catch (error: any) {
      setSearchError(error.message || 'Arama başarısız');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Select book and load chapters
  const handleSelectBook = async (book: BookSearchResult) => {
    setSelectedBook(book);
    setSelectedChapter(null);
    setCurrentAudioUrl(null);
    setViewMode('chapters');

    try {
      setChaptersLoading(true);
      const bookChapters = await getBookChapters(book.id);
      setChapters(bookChapters);
    } catch (error) {
      console.error('Failed to load chapters:', error);
      setChapters([]);
    } finally {
      setChaptersLoading(false);
    }
  };

  // Toggle favorite
  const toggleFavorite = async (bookId: number, bookData?: BookSearchResult | FavoriteBookItem) => {
    const isFavorite = favoriteIds.includes(bookId);
    const newFavorites = isFavorite
      ? favoriteIds.filter(id => id !== bookId)
      : [...favoriteIds, bookId];

    // Update IDs
    setFavoriteIds(newFavorites);

    // Update favoriteBooks list
    if (isFavorite) {
      setFavoriteBooks(prev => prev.filter(b => b.id !== bookId));
    } else if (bookData) {
      const newFavoriteBook: FavoriteBookItem = {
        id: bookData.id,
        title: bookData.title,
        authors: bookData.authors,
        cover_url: bookData.cover_url || undefined,
        language: 'language' in bookData ? bookData.language : undefined,
        subjects: 'subjects' in bookData ? bookData.subjects : undefined
      };
      setFavoriteBooks(prev => [...prev, newFavoriteBook]);
    }

    try {
      await saveBookFavorites(newFavorites);
    } catch (error) {
      console.error('Failed to save favorites:', error);
      // Revert on error - reload favorites
      loadFavorites();
    }
  };

  // Generate chapter audio
  const generateChapterAudio = async (chapter: BookChapter) => {
    if (!selectedBook) return;

    console.log('[BookTab] Starting TTS for chapter:', chapter.id, chapter.chapter_title);

    setChapterAudioStates(prev => ({
      ...prev,
      [chapter.id]: { status: 'generating' }
    }));

    try {
      const response = await processTts({
        type: 'chapter',  // Use 'chapter' type for Director Mode analysis & caching
        input: chapter.chapter_text, // Full text for analysis if needed (though backend can pull from DB)
        level,
        chapter_id: String(chapter.id)
      });

      console.log('[BookTab] TTS response:', response);

      if (response.mp3_url) {
        console.log('[BookTab] TTS success, mp3_url:', response.mp3_url);
        setChapterAudioStates(prev => ({
          ...prev,
          [chapter.id]: {
            status: 'ready',
            mp3_url: response.mp3_url,
            vtt_url: response.vtt_url,
            adapted_text: response.adapted_text || (response as any).adaptedText,
            translated_text: response.translated_text || (response as any).translatedText,
            timepoints: response.timepoints,
            words: response.words,
            level: response.level || level
          }
        }));
        return response.mp3_url;
      } else {
        console.error('[BookTab] No mp3_url in response:', response);
        throw new Error('Ses URL alınamadı');
      }
    } catch (error: any) {
      console.error('[BookTab] TTS generation failed:', error);
      setChapterAudioStates(prev => ({
        ...prev,
        [chapter.id]: { status: 'error', error: error.message }
      }));
      return null;
    }
  };

  // Play chapter
  const handlePlayChapter = async (chapter: BookChapter) => {
    setSelectedChapter(chapter);

    const state = chapterAudioStates[chapter.id];

    // Her durumda chapter'ı genişlet (kitap görünümü ve player alanını aç)
    setExpandedChapterId(chapter.id);

    if (state?.status === 'ready' && state.mp3_url) {
      // Audio already exists - toggle play/pause
      if (selectedChapter?.id === chapter.id && isPlaying) {
        // Aynı chapter çalıyorsa durdur
        setIsPlaying(false);
      } else {
        // Farklı chapter veya durmuşsa oynat
        setCurrentAudioUrl(state.mp3_url);
        setIsPlaying(true);
      }
    } else {
      // Generate new audio - chapter is already expanded, start generation
      const audioUrl = await generateChapterAudio(chapter);
      if (audioUrl) {
        // After generation completes, set audio url but don't auto-play
        setCurrentAudioUrl(audioUrl);
        // Show notification
        setAudioNotification({
          chapterId: chapter.id,
          message: 'Seslendirme tamamlandı'
        });
        // Auto-hide notification after 5 seconds
        setTimeout(() => {
          setAudioNotification(null);
        }, 5000);
      }
    }
  };

  // Handle notification click - open the chapter
  const handleNotificationClick = (chapterId: number) => {
    setExpandedChapterId(chapterId);
    setAudioNotification(null);
  };

  // Audio controls
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setAudioProgress(audio.currentTime);
    const handleDurationChange = () => setAudioDuration(audio.duration || 0);
    const handleEnded = () => {
      setIsPlaying(false);
      // Auto-play next chapter
      if (selectedChapter && chapters.length > 0) {
        const currentIndex = chapters.findIndex(c => c.id === selectedChapter.id);
        if (currentIndex < chapters.length - 1) {
          handlePlayChapter(chapters[currentIndex + 1]);
        }
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [selectedChapter, chapters]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentAudioUrl) return;

    audio.src = currentAudioUrl;
    if (isPlaying) {
      audio.play().catch(console.error);
    }
  }, [currentAudioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch(console.error);
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setAudioProgress(time);
    }
  };

  // Resume from history
  const handleResumeFromHistory = (item: BookHistoryItem) => {
    if (item.book_id) {
      // Find book and chapter, then play
      const book: BookSearchResult = {
        id: item.book_id,
        gutendex_id: 0,
        title: item.book_title,
        authors: item.book_authors,
        cover_url: item.cover_url || undefined,
        download_count: 0,
        language: 'en',
        copyright: false,
        subjects: item.subjects || undefined,
        created_at: item.created_at
      };
      handleSelectBook(book);
    }
  };

  // Go back to search/chapters
  const goBack = () => {
    if (viewMode === 'player') {
      setViewMode('chapters');
      setIsPlaying(false);
    } else if (viewMode === 'chapters') {
      setViewMode('search');
      setSelectedBook(null);
      setChapters([]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden audio element */}
      <audio ref={audioRef} className="hidden" />

      {/* Kütüphanem Banner */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-100 dark:border-blue-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
            <i className="fas fa-book-reader text-white"></i>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Kütüphanem</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Kitaplarınızı ve dokümanlarınızı tek bir yerden yönetin</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <i className="fas fa-heart text-red-400"></i>
          <span>{favoriteBooks.length} favori</span>
          <span className="mx-1">•</span>
          <i className="fas fa-history text-blue-400"></i>
          <span>{bookHistory.length} geçmiş</span>
        </div>
      </div>

      {/* Search Section */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <i className="fas fa-search text-primary"></i>
              Kitap Ara
            </CardTitle>
            {viewMode !== 'search' && (
              <Button variant="ghost" size="sm" onClick={goBack}>
                <i className="fas fa-arrow-left mr-2"></i>
                Geri
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Kitap adı veya yazar ara..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <Button onClick={handleSearch} disabled={searchLoading || !searchQuery.trim()}>
              {searchLoading ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <>
                  <i className="fas fa-search mr-2"></i>
                  Ara
                </>
              )}
            </Button>
          </div>

          {/* Level selector */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <i className="fas fa-layer-group text-gray-400"></i>
                Seviye Seçimi:
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'A1', label: 'Başlangıç', color: 'from-green-500 to-emerald-500' },
                  { id: 'A2', label: 'Temel', color: 'from-emerald-500 to-teal-500' },
                  { id: 'B1', label: 'Orta', color: 'from-teal-500 to-blue-500' },
                  { id: 'B2', label: 'İyi', color: 'from-blue-500 to-indigo-500' },
                  { id: 'C1', label: 'İleri', color: 'from-indigo-500 to-purple-500' },
                  { id: 'C2', label: 'Uzman', color: 'from-purple-500 to-pink-500' },
                ].map((l) => {
                  const isSelected = level === l.id;
                  return (
                    <button
                      key={l.id}
                      onClick={() => setLevel(l.id)}
                      className={`relative px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 border overflow-hidden group ${isSelected
                        ? 'text-white border-transparent shadow-md transform scale-105'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      {isSelected && (
                        <div className={`absolute inset-0 bg-gradient-to-r ${l.color}`}></div>
                      )}
                      <div className="relative flex flex-col items-center z-10">
                        <span className="text-lg leading-none mb-1">{l.id}</span>
                        <span className={`text-[9px] uppercase tracking-wider ${isSelected ? 'text-white/90' : 'text-gray-400 group-hover:text-gray-500'}`}>
                          {l.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Mode Content */}
      {viewMode === 'search' && (
        <>
          {/* Search Error */}
          {searchError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {searchError}
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold text-gray-800">
                  Arama Sonuçları ({searchResults.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchResults.map(book => (
                    <div
                      key={book.id}
                      className="bg-white rounded-lg shadow-sm hover:shadow-md border border-gray-100 overflow-hidden flex flex-col cursor-pointer transition-shadow"
                      onClick={() => handleSelectBook(book)}
                    >
                      <div className="relative w-full h-40 bg-gray-100">
                        {book.cover_url ? (
                          <img
                            src={book.cover_url}
                            alt={book.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                            <i className="fas fa-book-open text-3xl text-primary/60"></i>
                          </div>
                        )}
                        {/* Favorite button - Clean heart design like Instagram/Netflix */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(book.id, book);
                          }}
                          className="absolute top-3 right-3 z-10 transition-all duration-300 transform hover:scale-125 active:scale-95"
                        >
                          <i className={`text-2xl drop-shadow-lg transition-all duration-300 ${favoriteIds.includes(book.id)
                            ? 'fas fa-heart text-red-500'
                            : 'far fa-heart text-white hover:text-red-400'
                            }`} style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}></i>
                        </button>
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                        <h4 className="font-semibold text-gray-900 line-clamp-2 mb-1">{book.title}</h4>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-1">{book.authors}</p>
                        <div className="mt-auto flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">{book.language}</Badge>
                          <span className="text-xs text-primary font-medium flex items-center">
                            Bölümleri Gör <i className="fas fa-chevron-right ml-1"></i>
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Favorites Section */}
          {favoriteBooks.length > 0 && searchResults.length === 0 && (
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <i className="fas fa-heart text-red-500"></i>
                  Favori Kitaplarım ({favoriteBooks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {favoriteBooks.map(book => (
                    <div
                      key={book.id}
                      className="bg-white rounded-lg shadow-sm hover:shadow-md border border-gray-100 overflow-hidden flex flex-col cursor-pointer transition-shadow"
                      onClick={() => {
                        const bookResult: BookSearchResult = {
                          id: book.id,
                          gutendex_id: 0,
                          title: book.title,
                          authors: book.authors,
                          cover_url: book.cover_url || undefined,
                          download_count: 0,
                          language: book.language || 'en',
                          copyright: false,
                          subjects: book.subjects || undefined,
                          created_at: ''
                        };
                        handleSelectBook(bookResult);
                      }}
                    >
                      <div className="relative w-full h-40 bg-gray-100">
                        {book.cover_url ? (
                          <img
                            src={book.cover_url}
                            alt={book.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                            <i className="fas fa-book-open text-3xl text-primary/60"></i>
                          </div>
                        )}
                        {/* Favorite button - Clean heart design like Instagram/Netflix */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(book.id, book);
                          }}
                          className="absolute top-3 right-3 z-10 transition-all duration-300 transform hover:scale-125 active:scale-95"
                        >
                          <i className="fas fa-heart text-2xl text-red-500 drop-shadow-lg" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}></i>
                        </button>
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                        <h4 className="font-semibold text-gray-900 line-clamp-2 mb-1">{book.title}</h4>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-1">{book.authors}</p>
                        <div className="mt-auto flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">{book.language || 'en'}</Badge>
                          <span className="text-xs text-primary font-medium flex items-center">
                            Bölümleri Gör <i className="fas fa-chevron-right ml-1"></i>
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* History Section */}
          {bookHistory.length > 0 && (
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <i className="fas fa-history text-primary"></i>
                  Dinleme Geçmişim
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {bookHistory.slice(0, 10).map(item => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 cursor-pointer transition-colors"
                        onClick={() => handleResumeFromHistory(item)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-14 bg-white rounded-md border border-gray-200 flex items-center justify-center overflow-hidden">
                            {item.cover_url ? (
                              <img src={item.cover_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <i className="fas fa-book text-primary"></i>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.book_title}</p>
                            <p className="text-xs text-gray-600">
                              Bölüm {item.chapter_index}: {item.chapter_title}
                            </p>
                            <p className="text-xs text-gray-400">
                              {item.level.toUpperCase()} • {new Date(item.created_at).toLocaleDateString('tr-TR')}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="text-primary">
                          <i className="fas fa-play mr-1"></i>
                          Devam Et
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Empty state */}
          {searchResults.length === 0 && bookHistory.length === 0 && !searchLoading && (
            <div className="text-center py-12">
              <i className="fas fa-book-open text-5xl text-gray-300 mb-4"></i>
              <h3 className="text-lg font-medium text-gray-700 mb-2">Kitap Aramaya Başlayın</h3>
              <p className="text-sm text-gray-500">
                Yukarıdaki arama kutusunu kullanarak binlerce kitap arasından seçim yapın
              </p>
            </div>
          )}
        </>
      )}

      {/* Chapters View */}
      {viewMode === 'chapters' && selectedBook && (
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-start gap-4">
              <div className="w-20 h-28 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                {selectedBook.cover_url ? (
                  <img src={selectedBook.cover_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                    <i className="fas fa-book-open text-2xl text-primary/60"></i>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-800">{selectedBook.title}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{selectedBook.authors}</p>
                  </div>
                  <button
                    onClick={() => toggleFavorite(selectedBook.id)}
                    className="p-2 transition-all duration-300 transform hover:scale-125 active:scale-95"
                  >
                    <i className={`text-2xl transition-all duration-300 ${favoriteIds.includes(selectedBook.id)
                        ? 'fas fa-heart text-red-500'
                        : 'far fa-heart text-gray-400 hover:text-red-500'
                      }`}></i>
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="outline">{selectedBook.language}</Badge>
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                    {level}
                  </Badge>
                  <span className="text-xs text-gray-500">{chapters.length} bölüm</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {/* Audio Generation Notification */}
            {audioNotification && (
              <div
                onClick={() => handleNotificationClick(audioNotification.chapterId)}
                className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between cursor-pointer hover:bg-green-100 transition-colors animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center">
                    <i className="fas fa-check"></i>
                  </div>
                  <div>
                    <p className="font-medium text-green-800">{audioNotification.message}</p>
                    <p className="text-sm text-green-600">Dinlemek için tıklayın</p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setAudioNotification(null);
                  }}
                  className="w-8 h-8 rounded-full hover:bg-green-200 flex items-center justify-center text-green-600"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            )}

            {chaptersLoading ? (
              <div className="text-center py-8">
                <i className="fas fa-spinner fa-spin text-2xl text-primary mb-2"></i>
                <p className="text-sm text-gray-500">Bölümler yükleniyor...</p>
              </div>
            ) : chapters.length > 0 ? (
              <div className="space-y-2">
                {chapters.map(chapter => {
                  const state = chapterAudioStates[chapter.id];
                  const isGenerating = state?.status === 'generating';
                  const isReady = state?.status === 'ready';
                  const isCurrentlyPlaying = selectedChapter?.id === chapter.id && !!currentAudioUrl;
                  const isExpanded = expandedChapterId === chapter.id;

                  return (
                    <div
                      key={chapter.id}
                      className={`rounded-lg border transition-all ${isExpanded
                        ? 'bg-primary/5 border-primary/30'
                        : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
                        }`}
                    >
                      {/* Chapter Header - Clickable */}
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer"
                        onClick={() => setExpandedChapterId(isExpanded ? null : chapter.id)}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isReady
                            ? 'bg-green-100 text-green-600'
                            : isGenerating
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-gray-100 text-gray-500'
                            }`}>
                            {isGenerating ? (
                              <i className="fas fa-spinner fa-spin"></i>
                            ) : isReady ? (
                              <i className="fas fa-check"></i>
                            ) : (
                              <span className="font-semibold text-sm">{chapter.chapter_index}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 truncate">{chapter.chapter_title}</p>
                            <p className="text-xs text-gray-500">
                              {chapter.chapter_text.split(' ').length} kelime
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {state?.status === 'error' && (
                            <span className="text-xs text-red-500">Hata!</span>
                          )}
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayChapter(chapter);
                            }}
                            disabled={isGenerating}
                            size="sm"
                            className={isCurrentlyPlaying ? 'bg-primary' : ''}
                          >
                            {isGenerating ? (
                              <>
                                <i className="fas fa-spinner fa-spin mr-2"></i>
                                Ses oluşturuluyor
                              </>
                            ) : isCurrentlyPlaying ? (
                              <>
                                <i className="fas fa-headphones mr-1"></i>
                                Dinle
                              </>
                            ) : isReady ? (
                              <>
                                <i className="fas fa-play mr-1"></i>
                                Dinle
                              </>
                            ) : (
                              <>
                                <i className="fas fa-volume-up mr-1"></i>
                                Seslendir
                              </>
                            )}
                          </Button>
                          <i className={`fas fa-chevron-down text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}></i>
                        </div>
                      </div>

                      {/* Chapter Content - Expandable */}
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-gray-200">
                          {/* Paginated Book Reader - Page by page display synced with audio */}
                          {isReady && state.mp3_url && (
                            <div className="mt-4">
                              <PaginatedBookReader
                                adaptedText={state.adapted_text || chapter.chapter_text}
                                translatedText={state.translated_text}
                                mp3Url={state.mp3_url}
                                vttUrl={state.vtt_url}
                                timepoints={state.timepoints}
                                words={state.words}
                                level={state.level || level}
                                chapterTitle={chapter.chapter_title}
                                wordsPerPage={150}
                              />
                            </div>
                          )}

                          {/* Show original text only if no audio yet */}
                          {!isReady && (
                            <div className="mt-4">
                              <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                <i className="fas fa-file-alt text-primary"></i>
                                Orijinal Metin
                              </h4>
                              <ScrollArea className="h-[250px] rounded-lg border bg-white p-4">
                                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">
                                  {chapter.chapter_text}
                                </p>
                              </ScrollArea>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <i className="fas fa-exclamation-circle text-2xl text-gray-400 mb-2"></i>
                <p className="text-sm text-gray-500">Bu kitap için bölüm bulunamadı</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Player View */}
      {viewMode === 'player' && selectedBook && selectedChapter && (
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{selectedBook.title}</p>
                <CardTitle className="text-lg font-bold text-gray-800">
                  {selectedChapter.chapter_title}
                </CardTitle>
              </div>
              <Badge variant="outline" className="bg-primary/5 text-primary">
                Bölüm {selectedChapter.chapter_index}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {/* Audio Player Controls */}
            {currentAudioUrl && (
              <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-6">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <button
                    onClick={() => audioRef.current && (audioRef.current.currentTime -= 15)}
                    className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-600 hover:bg-gray-50"
                  >
                    <i className="fas fa-undo"></i>
                  </button>
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-16 h-16 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
                  >
                    <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-xl ${!isPlaying ? 'ml-1' : ''}`}></i>
                  </button>
                  <button
                    onClick={() => audioRef.current && (audioRef.current.currentTime += 30)}
                    className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-600 hover:bg-gray-50"
                  >
                    <i className="fas fa-redo"></i>
                  </button>
                </div>

                {/* Progress bar */}
                <div className="space-y-2">
                  <input
                    type="range"
                    min={0}
                    max={audioDuration || 0}
                    value={audioProgress}
                    onChange={handleSeek}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{formatTime(audioProgress)}</span>
                    <span>{formatTime(audioDuration)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Chapter Text */}
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Metin İçeriği</h4>
              <ScrollArea className="h-[300px] rounded-lg border bg-gray-50 p-4">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {selectedChapter.chapter_text}
                </p>
              </ScrollArea>
            </div>

            {/* Chapter navigation */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  const currentIdx = chapters.findIndex(c => c.id === selectedChapter.id);
                  if (currentIdx > 0) {
                    handlePlayChapter(chapters[currentIdx - 1]);
                  }
                }}
                disabled={chapters.findIndex(c => c.id === selectedChapter.id) === 0}
              >
                <i className="fas fa-chevron-left mr-2"></i>
                Önceki Bölüm
              </Button>
              <Button
                onClick={() => {
                  const currentIdx = chapters.findIndex(c => c.id === selectedChapter.id);
                  if (currentIdx < chapters.length - 1) {
                    handlePlayChapter(chapters[currentIdx + 1]);
                  }
                }}
                disabled={chapters.findIndex(c => c.id === selectedChapter.id) === chapters.length - 1}
              >
                Sonraki Bölüm
                <i className="fas fa-chevron-right ml-2"></i>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
