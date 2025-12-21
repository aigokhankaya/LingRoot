import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import MembershipBadge from '../src/components/user/MembershipBadge';
import { useAuth } from '../src/lib/auth';
import { useRouter } from 'next/router';
import { getUserStats, UserStats, getTopicTree, Topic, getUserBookHistory, BookHistoryItem, FavoriteBookItem, getUserBookFavoritesDetails, DocumentRecord, DocumentSection, getUserDocuments, getDocumentSections, getContentHistory } from '../src/lib/api';
import { Badge } from '../src/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../src/components/ui/card';
import { Button } from '../src/components/ui/button';
import { Progress } from '../src/components/ui/progress';
import { ScrollArea } from '../src/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../src/components/ui/tabs';
import PackageInfo from '../src/components/PackageInfo';
import { VocabularyTabContent } from './vocabulary';
import TopicHierarchySection from '../src/components/TopicHierarchy/TopicHierarchySection';
import BrandWordmark from '../src/components/BrandWordmark';
import InterestManager from '../src/components/InterestManager';
import OutputSection from '../src/components/OutputSection';
import { ProfileDropdownMenu } from '../src/components/shared/ProfileDropdownMenu';
import { useTranslation } from '../src/lib/i18n';
import BookTab from '../src/components/BookTab/BookTab';

interface ContentHistoryItem {
  id: string;
  input: string;
  input_type: string;
  level: string;
  mp3_url: string;
  created_at: string;
  translated_text?: string;
  adapted_text?: string;
  words?: string[];
  timepoints?: Array<{
    timeSeconds: number;
    endTimeSeconds?: number;
    word?: string;
  }>;
  detected_mood?: string;
}

const Dashboard = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const [tab, setTab] = React.useState<string>('dashboard');
  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicsError, setTopicsError] = useState<string | null>(null);
  const [bookHistory, setBookHistory] = useState<BookHistoryItem[]>([]);
  const [bookHistoryLoading, setBookHistoryLoading] = useState(false);
  const [bookHistoryError, setBookHistoryError] = useState<string | null>(null);
  const [favoriteBooks, setFavoriteBooks] = useState<FavoriteBookItem[]>([]);
  const [favoriteBooksLoading, setFavoriteBooksLoading] = useState(false);
  const [favoriteBooksError, setFavoriteBooksError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<DocumentRecord | null>(null);
  const [documentSections, setDocumentSections] = useState<DocumentSection[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [sectionsError, setSectionsError] = useState<string | null>(null);
  const [contentHistory, setContentHistory] = useState<ContentHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [showAllHistory, setShowAllHistory] = useState<boolean>(false);
  const [expandedHistoryItem, setExpandedHistoryItem] = useState<string | null>(null);
  const [activeHistoryTypes, setActiveHistoryTypes] = useState<string[]>([
    'topic',
    'book',
    'document',
    'podcast',
    'youtube',
    'weblink',
    'text',
    'subject',
  ]);
  const [activeMoodFilter, setActiveMoodFilter] = useState<string>('All');

  const historyTypeOptions = React.useMemo(
    () => [
      { id: 'topic', label: t('content_type_topic_tree') },
      { id: 'book', label: t('book') },
      { id: 'document', label: t('document') },
      { id: 'podcast', label: t('podcast') },
      { id: 'youtube', label: t('youtube') },
      { id: 'weblink', label: t('web_link') },
      { id: 'text', label: t('text') },
      { id: 'subject', label: t('subject') },
    ],
    [t]
  );

  const getHistoryTypeLabel = (inputType: string): string => {
    const key = (inputType || '').toLowerCase();
    const labels: Record<string, string> = {
      text: t('text'),
      subject: t('subject'),
      topic: t('content_type_topic_tree'),
      book: t('book'),
      podcast: t('podcast'),
      youtube: t('youtube'),
      file: t('upload_file'),
      document: t('document'),
      weblink: t('web_link'),
    };
    return labels[key] || (inputType ? inputType.toUpperCase() : t('history_type_other'));
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Grace period right after login to allow auth state to hydrate
      let withinGrace = false;
      try {
        const ts = typeof window !== 'undefined' ? Number(localStorage.getItem('justLoggedIn') || '0') : 0;
        withinGrace = ts > 0 && Date.now() - ts < 8000; // 8s
      } catch { }
      if (withinGrace) {
        try { console.log('[DASHBOARD] within grace period after login, skip redirect'); } catch { }
        return;
      }
      const path = typeof window !== 'undefined' ? window.location.pathname : '/dashboard';
      const search = typeof window !== 'undefined' ? window.location.search : '';
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      const next = `${path}${search}${hash}`;
      try { console.log('[DASHBOARD] redirecting unauthenticated to /login with next=', next, { isLoading, isAuthenticated }); } catch { }
      if (typeof window !== 'undefined') {
        try { sessionStorage.setItem('postLoginNext', next); } catch { }
      }
      router.push(`/login?next=${encodeURIComponent(next)}`);
    } else {
      try { console.log('[DASHBOARD] auth state', { isLoading, isAuthenticated }); } catch { }
    }
  }, [isAuthenticated, isLoading, router]);

  // Fetch user stats when authenticated
  useEffect(() => {
    const fetchStats = async () => {
      if (isAuthenticated && user) {
        setStatsLoading(true);
        try {
          const data = await getUserStats();
          setStats(data);
        } catch (error) {
          console.error('Error fetching stats:', error);
        } finally {
          setStatsLoading(false);
        }
      }
    };

    fetchStats();
  }, [isAuthenticated, user]);

  const loadDocuments = async () => {
    try {
      setDocumentsLoading(true);
      setDocumentsError(null);
      const response = await getUserDocuments();
      if (response.success && response.data) {
        setDocuments(response.data);
        if (!selectedDocument && response.data.length > 0) {
          const first = response.data[0];
          setSelectedDocument(first);
          await loadDocumentSections(first.id);
        }
      } else if (!response.success) {
        setDocumentsError(response.message || t('dashboard_error_documents_load'));
      }
    } catch (error: any) {
      console.error('[DASHBOARD] Dokümanlar yüklenirken hata oluştu:', error);
      setDocumentsError(error?.message || t('dashboard_error_documents_load'));
    } finally {
      setDocumentsLoading(false);
    }
  };

  const loadDocumentSections = async (documentId: number) => {
    try {
      setSectionsLoading(true);
      setSectionsError(null);
      const response = await getDocumentSections(documentId);
      if (response.success && response.data) {
        setDocumentSections(response.data);
      } else if (!response.success) {
        setSectionsError(response.message || t('dashboard_error_document_sections_load'));
      }
    } catch (error: any) {
      console.error('[DASHBOARD] Doküman bölümleri yüklenirken hata oluştu:', error);
      setSectionsError(error?.message || t('dashboard_error_document_sections_load'));
    } finally {
      setSectionsLoading(false);
    }
  };

  const loadTopicTree = async () => {
    try {
      setTopicsLoading(true);
      setTopicsError(null);
      const response = await getTopicTree();
      if (response.success && response.data) {
        setTopics(response.data.topics);
      } else if (!response.success) {
        setTopicsError(response.message || t('dashboard_error_topics_load'));
      }
    } catch (error: any) {
      console.error('[DASHBOARD] Konu ağacı yükleme hatası:', error);
      setTopicsError(error?.message || t('dashboard_error_topics_load'));
    } finally {
      setTopicsLoading(false);
    }
  };

  const loadBookHistory = async () => {
    if (!user) return;
    try {
      setBookHistoryLoading(true);
      setBookHistoryError(null);
      const response = await getUserBookHistory(user.id, 1, 50);
      if (response.success && response.data) {
        setBookHistory(response.data);
      } else if (!response.success) {
        setBookHistoryError(response.message || t('dashboard_error_book_history_load'));
      }
    } catch (error: any) {
      console.error('[DASHBOARD] Kitap geçmişi yükleme hatası:', error);
      setBookHistoryError(error?.message || t('dashboard_error_book_history_load'));
    } finally {
      setBookHistoryLoading(false);
    }
  };

  const loadFavoriteBooks = async () => {
    try {
      setFavoriteBooksLoading(true);
      setFavoriteBooksError(null);
      const response = await getUserBookFavoritesDetails();
      if (response.success && response.data) {
        setFavoriteBooks(response.data);
      } else if (!response.success) {
        setFavoriteBooksError(response.message || t('dashboard_error_favorite_books_load'));
      }
    } catch (error: any) {
      console.error('[DASHBOARD] Favori kitaplar yüklenirken hata oluştu:', error);
      setFavoriteBooksError(error?.message || t('dashboard_error_favorite_books_load'));
    } finally {
      setFavoriteBooksLoading(false);
    }
  };
  const fetchContentHistory = async () => {
    setLoadingHistory(true);
    try {
      console.log('[DASHBOARD] fetchContentHistory başlatılıyor...');
      const response = await getContentHistory();
      console.log('[DASHBOARD] getContentHistory response:', response);

      if (response.success && response.data) {
        if (Array.isArray(response.data)) {
          setContentHistory(response.data);
        } else {
          setContentHistory([]);
        }
      } else {
        setContentHistory([]);
      }
    } catch (error) {
      console.error('[DASHBOARD] Content history yüklenirken hata oluştu:', error);
      setContentHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Initialize tab from query (?tab=...) then hash, and keep in sync
  useEffect(() => {
    const applyLocation = () => {
      if (typeof window === 'undefined') return;
      const url = new URL(window.location.href);
      const qp = url.searchParams.get('tab');
      if (qp) {
        // Eski URL'lerle geriye dönük uyumluluk için 'courses' -> 'book' eşlemesi
        if (qp === 'courses') {
          setTab('book');
        } else {
          setTab(qp);
        }
      } else {
        const h = url.hash.replace('#', '');
        if (h) setTab(h);
      }
    };
    applyLocation();
    window.addEventListener('hashchange', applyLocation);
    window.addEventListener('popstate', applyLocation);
    return () => {
      window.removeEventListener('hashchange', applyLocation);
      window.removeEventListener('popstate', applyLocation);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    if (tab === 'reading-history' || tab === 'achievements') {
      loadTopicTree();
    }

    if (tab === 'reading-history' || tab === 'book') {
      loadBookHistory();
    }

    if (tab === 'reading-history' || tab === 'podcasts') {
      fetchContentHistory();
    }

    if (tab === 'book') {
      loadFavoriteBooks();
    }

    if (tab === 'pdf') {
      loadDocuments();
    }
  }, [tab, isAuthenticated]);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const menu = document.getElementById('dashboard-profile-menu');
      const target = event.target as HTMLElement;
      if (menu && !menu.contains(target) && !target.closest('.cursor-pointer')) {
        menu.classList.add('hidden');
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Her giriş tipine göre toplam ses sayısını hesapla (örn. topic, book, podcast)
  const historyCountsByType = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of contentHistory) {
      const typeKey = (item.input_type || '').toLowerCase();
      if (!typeKey) continue;
      counts[typeKey] = (counts[typeKey] || 0) + 1;
    }
    return counts;
  }, [contentHistory]);

  if (isLoading) {
    return <div className="p-8 text-center text-lg">{t('loading')}</div>;
  }
  if (!isAuthenticated) {
    return <div className="p-8 text-center text-lg">{t('dashboard_redirecting')}</div>;
  }
  if (!user) {
    return <div className="p-8 text-center text-lg">{t('dashboard_loading_user')}</div>;
  }

  const getDisplayName = () => {
    try {
      const firstName =
        typeof window !== 'undefined'
          ? localStorage.getItem('lingroot_firstName') || ''
          : '';
      const lastName =
        typeof window !== 'undefined'
          ? localStorage.getItem('lingroot_lastName') || ''
          : '';
      const fullName = `${firstName} ${lastName}`.trim();
      if (fullName) return fullName;
      if ((user as any).name) return (user as any).name as string;
      if (user.email) return user.email.split('@')[0];
      return t('user_default');
    } catch {
      return (
        ((user as any).name as string) ||
        (user.email ? user.email.split('@')[0] : t('user_default'))
      );
    }
  };

  const displayName = getDisplayName();
  const avatar = (user as any).avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}`;
  const membershipStatus = user.membershipStatus || 'free';
  const profileImageUrl = avatar;
  const backgroundImageUrl = 'https://readdy.ai/api/search-image?query=Abstract%2520professional%2520background%2520with%2520soft%2520teal%2520and%2520slate%2520tones%252C%2520subtle%2520geometric%2520patterns%252C%2520clean%2520modern%2520design%252C%2520perfect%2520for%2520profile%2520page%2520header%252C%2520minimalist%2520aesthetic%252C%2520high%2520quality%2520digital%2520art&width=1440&height=300&seq=bg1&orientation=landscape';

  const filteredHistory = contentHistory.filter((item) => {
    const typeKey = (item.input_type || '').toLowerCase();

    // Type Filter
    const typeMatch = (!activeHistoryTypes || activeHistoryTypes.length === 0) || (!typeKey) || activeHistoryTypes.includes(typeKey);

    // Mood Filter
    const moodMatch = activeMoodFilter === 'All' || item.detected_mood === activeMoodFilter;

    return typeMatch && moodMatch;
  });
  const historyToRender = showAllHistory ? filteredHistory : filteredHistory.slice(0, 5);

  const convertToPlayableUrl = (url: string): string => {
    if (!url) return '';

    try {
      if (url.startsWith('/tts/')) {
        url = `/api${url}`;
      }

      if (url.startsWith('/api/')) {
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
          return `http://localhost:5001${url}`;
        }

        if (typeof window !== 'undefined' && window.location.hostname.includes('lingroot.com')) {
          return `https://lingloops-backend.onrender.com${url}`;
        }

        return url;
      }

      if (url.startsWith('https://')) {
        return url;
      }

      return url;
    } catch {
      return url;
    }
  };

  return (
    <div className="min-h-screen bg-background fadeIn">
      {/* Top Navigation Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="w-full px-4">
          <div className="flex justify-between items-center h-16">
            {/* Left: Logo & Navigation */}
            <div className="flex items-center space-x-6">
              <Link href="/">
                <div className="flex items-center space-x-3 flex-shrink-0">
                  <img
                    src="/lingroot-icon.svg"
                    alt="LingRoot Logo"
                    className="w-10 h-10 md:w-12 md:h-12"
                  />
                  <BrandWordmark className="hidden sm:inline-block text-lg sm:text-xl md:text-2xl" />
                </div>
              </Link>
              <Link href="/welcome">
                <button className="text-gray-700 hover:text-primary transition-colors text-sm font-medium">
                  <i className="fas fa-home mr-2"></i>
                  {t('dashboard_nav_home')}
                </button>
              </Link>
              <Link href="/welcome">
                <button className="text-gray-700 hover:text-primary transition-colors text-sm font-medium">
                  <i className="fas fa-headphones mr-2"></i>
                  {t('dashboard_nav_listen')}
                </button>
              </Link>
            </div>

            {/* Right: Profile Menu */}
            <div className="flex items-center space-x-4">
              {isAuthenticated && (
                <ProfileDropdownMenu
                  align="end"
                  side="bottom"
                  avatarSize="md"
                  showUserInfo={true}
                  showChevron={true}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Header */}
      <div className="relative w-full h-[160px] md:h-[190px] overflow-hidden mb-8 slideUp">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${backgroundImageUrl})` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-slate-900/40 to-slate-900/10"></div>
        <div className="w-full px-4 relative h-full flex items-end pb-6">
          <div className="flex items-end">
            <div className="relative mr-6">
              <img src={profileImageUrl} alt={displayName} className="w-20 h-20 md:w-24 md:h-24 border-4 border-white shadow-lg rounded-full object-cover" />
            </div>
            <div className="mb-4 text-white">
              <h1 className="text-3xl font-bold">{displayName}</h1>
              <div className="flex mt-2 gap-2">
                <MembershipBadge status={membershipStatus} />
                <Badge className="bg-primary text-primary-foreground">{t('dashboard_badge_primary')}</Badge>
                <Badge className="bg-green-500">{t('dashboard_badge_languages')}</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-4 py-8 flex justify-center">
        <div className="w-[90%]">
          <Tabs value={tab} onValueChange={(v) => {
            setTab(v);
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href);
              url.searchParams.set('tab', v);
              // keep hash too for backward-compat
              url.hash = v;
              window.history.replaceState({}, '', url.toString());
            }
          }} className="w-full">
            {/* Sekmeler: tek satır, eşit genişlik */}
            <TabsList className="flex flex-nowrap justify-between gap-2 mb-6 bg-white px-4 py-3 rounded-xl shadow-sm border w-full">
              {/* 1. Dashboard */}
              <TabsTrigger value="dashboard" className="flex-1 !rounded-button whitespace-nowrap cursor-pointer text-center">
                <i className="fas fa-chart-line mr-2"></i>
                {t('dashboard')}
              </TabsTrigger>
              {/* 2. Okuma Geçmişim */}
              <TabsTrigger value="reading-history" className="flex-1 !rounded-button whitespace-nowrap cursor-pointer text-center">
                <i className="fas fa-history mr-2"></i>
                {t('tab_reading_history')}
              </TabsTrigger>
              {/* 3. Konularım */}
              <TabsTrigger value="achievements" className="flex-1 !rounded-button whitespace-nowrap cursor-pointer text-center">
                <i className="fas fa-sitemap mr-2"></i>
                {t('tab_my_topics')}
              </TabsTrigger>
              {/* 4. Kitaplarım */}
              <TabsTrigger value="book" className="flex-1 !rounded-button whitespace-nowrap cursor-pointer text-center">
                <i className="fas fa-book mr-2"></i>
                {t('tab_my_books')}
              </TabsTrigger>
              <TabsTrigger value="hobbies" className="flex-1 !rounded-button whitespace-nowrap cursor-pointer text-center">
                <i className="fas fa-heart mr-2"></i>
                {t('tab_my_hobbies')}
              </TabsTrigger>
              {/* 5. Podcastlerim (şimdilik placeholder) */}
              <TabsTrigger value="podcasts" className="flex-1 !rounded-button whitespace-nowrap cursor-pointer text-center">
                <i className="fas fa-podcast mr-2"></i>
                {t('tab_my_podcasts')}
              </TabsTrigger>
              {/* 6. Dokümanlar */}
              <TabsTrigger value="pdf" className="flex-1 !rounded-button whitespace-nowrap cursor-pointer text-center">
                <i className="fas fa-file-alt mr-2"></i>
                {t('tab_my_documents')}
              </TabsTrigger>
              <TabsTrigger value="vocabulary" className="flex-1 !rounded-button whitespace-nowrap cursor-pointer text-center">
                <i className="fas fa-language mr-2"></i>
                {t('tab_my_vocabulary')}
              </TabsTrigger>
              <TabsTrigger value="paket-bilgilerim" className="flex-1 !rounded-button whitespace-nowrap cursor-pointer text-center">
                <i className="fas fa-box mr-2"></i>
                {t('tab_my_plan_info')}
              </TabsTrigger>
            </TabsList>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Quick Stats */}
                <div className="col-span-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="border-none shadow-md hover-lift slideUp">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">{t('dashboard_daily_goal_title')}</p>
                          <h3 className="text-2xl font-bold text-primary">{statsLoading ? '...' : `${stats?.activity.dailyGoalProgress || 0}%`}</h3>
                          <p className="text-xs text-gray-500 mt-1">{t('dashboard_daily_goal_subtitle')}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <i className="fas fa-bullseye text-xl"></i>
                        </div>
                      </div>
                      <Progress value={stats?.activity.dailyGoalProgress || 0} className="h-2 mt-4" />
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-md">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">{t('dashboard_current_streak_title')}</p>
                          <h3 className="text-2xl font-bold text-green-600">{statsLoading ? '...' : `${stats?.activity.currentStreak || 0} ${t('dashboard_current_streak_days_suffix')}`}</h3>
                          <p className="text-xs text-gray-500 mt-1">{t('dashboard_longest_streak_prefix')} {stats?.activity.longestStreak || 0} {t('dashboard_current_streak_days_suffix')}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                          <i className="fas fa-fire text-xl"></i>
                        </div>
                      </div>
                      <div className="flex space-x-1 mt-4">
                        {(stats?.activity.weeklyActivity || Array(7).fill({ active: false })).map((day, index) => (
                          <div
                            key={index}
                            className={`h-2 flex-1 rounded-full ${day.active ? 'bg-green-500' : 'bg-gray-200'}`}
                          ></div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-md">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">{t('dashboard_total_learning_title')}</p>
                          <h3 className="text-2xl font-bold text-purple-600">{statsLoading ? '...' : `${stats?.vocabulary.total || 0} ${t('dashboard_total_learning_words_suffix')}`}</h3>
                          <p className="text-xs text-gray-500 mt-1">{t('dashboard_learned_words_prefix')} {stats?.vocabulary.learned || 0}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                          <i className="fas fa-book text-xl"></i>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-7 gap-1">
                        {Array.from({ length: 7 }).map((_, index) => {
                          const height = [3, 5, 2, 6, 4, 7, 5][index];
                          return (
                            <div key={index} className="flex flex-col items-center">
                              <div
                                className={`w-full bg-purple-500 rounded-t-sm`}
                                style={{ height: `${height * 4}px` }}
                              ></div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-md">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">{t('dashboard_audio_creation_title')}</p>
                          <h3 className="text-2xl font-bold text-amber-600">{statsLoading ? '...' : `${stats?.subscription.audioCreationCount || 0}`}</h3>
                          <p className="text-xs text-gray-500 mt-1">{t('dashboard_plan_prefix')} {stats?.subscription.plan || 'Free Trial'}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                          <i className="fas fa-graduation-cap text-xl"></i>
                        </div>
                      </div>
                      <Progress value={40} className="h-2 mt-4" />
                    </CardContent>
                  </Card>
                </div>

                {/* Weekly Activity Chart */}
                <Card className="border-none shadow-md col-span-3 md:col-span-2 hover-lift slideUp">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl font-bold text-gray-800">{t('dashboard_weekly_activity_title')}</CardTitle>
                    <CardDescription>{t('dashboard_weekly_activity_subtitle')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <i className="fas fa-chart-bar text-4xl text-gray-300 mb-2"></i>
                        <p className="text-gray-500">{t('dashboard_weekly_activity_placeholder')}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Today's Tasks */}
                <Card className="border-none shadow-md hover-lift slideUp">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl font-bold text-gray-800">{t('dashboard_today_tasks_title')}</CardTitle>
                    <CardDescription>{t('dashboard_today_tasks_date_example')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px] pr-4">
                      <div className="space-y-4">
                        <div className="flex items-center p-3 bg-green-50 rounded-lg border border-green-100">
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 mr-3 flex-shrink-0">
                            <i className="fas fa-headphones"></i>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-800">{t('dashboard_task_listen_title')}</h4>
                            <p className="text-sm text-gray-600">{t('dashboard_task_listen_desc')}</p>
                          </div>
                          <Badge className="bg-green-500 ml-2">{t('dashboard_task_listen_done_badge')}</Badge>
                        </div>

                        <div className="flex items-center p-3 bg-primary/5 rounded-lg border border-primary/10">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-3 flex-shrink-0">
                            <i className="fas fa-book-open"></i>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-800">{t('dashboard_task_read_title')}</h4>
                            <p className="text-sm text-gray-600">{t('dashboard_task_read_desc')}</p>
                          </div>
                          <Button size="sm" variant="outline" className="ml-2">
                            {t('dashboard_task_start_button')}
                          </Button>
                        </div>

                        <div className="flex items-center p-3 bg-purple-50 rounded-lg border border-purple-100">
                          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mr-3 flex-shrink-0">
                            <i className="fas fa-comment"></i>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-800">{t('dashboard_task_speak_title')}</h4>
                            <p className="text-sm text-gray-600">{t('dashboard_task_speak_desc')}</p>
                          </div>
                          <Button size="sm" variant="outline" className="ml-2">
                            {t('dashboard_task_start_button')}
                          </Button>
                        </div>

                        <div className="flex items-center p-3 bg-amber-50 rounded-lg border border-amber-100">
                          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mr-3 flex-shrink-0">
                            <i className="fas fa-pen"></i>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-800">{t('dashboard_task_write_title')}</h4>
                            <p className="text-sm text-gray-600">{t('dashboard_task_write_desc')}</p>
                          </div>
                          <Button size="sm" variant="outline" className="ml-2">
                            {t('dashboard_task_start_button')}
                          </Button>
                        </div>

                        <div className="flex items-center p-3 bg-red-50 rounded-lg border border-red-100">
                          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 mr-3 flex-shrink-0">
                            <i className="fas fa-brain"></i>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-800">{t('dashboard_task_vocab_title')}</h4>
                            <p className="text-sm text-gray-600">{t('dashboard_task_vocab_desc')}</p>
                          </div>
                          <Button size="sm" variant="outline" className="ml-2">
                            {t('dashboard_task_start_button')}
                          </Button>
                        </div>
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Skills Progress */}
                {/* <Card className="border-none shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-bold text-gray-800">Beceri İlerlemesi</CardTitle>
                  <CardDescription>Dil becerilerinizin gelişimi</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <i className="fas fa-chart-pie text-4xl text-gray-300 mb-2"></i>
                      <p className="text-gray-500">Beceri radar grafiği burada görünecek</p>
                    </div>
                  </div>
                </CardContent>
              </Card> */}

                {/* Vocabulary Growth */}
                <Card className="border-none shadow-md hover-lift slideUp">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl font-bold text-gray-800">{t('dashboard_vocab_growth_title')}</CardTitle>
                    <CardDescription>{t('dashboard_vocab_growth_subtitle')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <i className="fas fa-chart-line text-4xl text-gray-300 mb-2"></i>
                        <p className="text-gray-500">{t('dashboard_vocab_growth_placeholder')}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Upcoming Events */}
                {/* <Card className="border-none shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-bold text-gray-800">Yaklaşan Etkinlikler</CardTitle>
                  <CardDescription>Katılabileceğiniz öğrenme etkinlikleri</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-4">
                      <div className="flex p-3 bg-primary/5 rounded-lg border border-primary/10">
                        <div className="w-12 text-center mr-3">
                          <div className="bg-white rounded-md p-1 border border-primary/30">
                            <div className="text-xs font-bold text-primary">HAZ</div>
                            <div className="text-lg font-bold">10</div>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-800">Konuşma Kulübü</h4>
                          <p className="text-sm text-gray-600">Pazartesi, 19:00 - 20:30</p>
                          <p className="text-xs text-gray-500 mt-1">Günlük konular hakkında İngilizce pratik yapın</p>
                          <div className="mt-2">
                            <Button size="sm" variant="outline" className="text-primary border-primary">
                              Katıl
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="flex p-3 bg-purple-50 rounded-lg border border-purple-100">
                        <div className="w-12 text-center mr-3">
                          <div className="bg-white rounded-md p-1 border border-purple-200">
                            <div className="text-xs font-bold text-purple-600">HAZ</div>
                            <div className="text-lg font-bold">15</div>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-800">İngilizce Film Kulübü</h4>
                          <p className="text-sm text-gray-600">Cumartesi, 16:00 - 18:30</p>
                          <p className="text-xs text-gray-500 mt-1">İngilizce film izleyip tartışma</p>
                          <div className="mt-2">
                            <Button size="sm" variant="outline" className="text-purple-600 border-purple-600">
                              Katıl
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="flex p-3 bg-green-50 rounded-lg border border-green-100">
                        <div className="w-12 text-center mr-3">
                          <div className="bg-white rounded-md p-1 border border-green-200">
                            <div className="text-xs font-bold text-green-600">HAZ</div>
                            <div className="text-lg font-bold">22</div>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-800">İş İngilizcesi Webinarı</h4>
                          <p className="text-sm text-gray-600">Perşembe, 20:00 - 21:00</p>
                          <p className="text-xs text-gray-500 mt-1">İş görüşmelerinde İngilizce ipuçları</p>
                          <div className="mt-2">
                            <Button size="sm" variant="outline" className="text-green-600 border-green-600">
                              Katıl
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card> */}
              </div>
            </TabsContent>

            {/* Reading History Tab - Ses geçmişi listesi */}
            <TabsContent value="reading-history" className="mt-0">
              <Card className="border border-border shadow-lg rounded-2xl bg-white">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4 mb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold mr-4 shadow-sm">
                          <i className="fas fa-history"></i>
                        </div>
                        <h2 className="text-2xl font-bold text-primary tracking-tight">{t('reading_history_title')}</h2>
                      </div>
                      <Button
                        onClick={fetchContentHistory}
                        variant="outline"
                        className="!rounded-button whitespace-nowrap cursor-pointer"
                        disabled={loadingHistory}
                      >
                        {loadingHistory ? (
                          <>
                            <i className="fas fa-circle-notch fa-spin mr-2"></i>
                            {t('reading_history_refresh_loading')}
                          </>
                        ) : (
                          <>
                            <i className="fas fa-refresh mr-2"></i>
                            {t('reading_history_refresh_button')}
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 justify-between">
                      <div className="flex flex-wrap gap-2 items-center">
                        <select
                          value={activeMoodFilter}
                          onChange={(e) => setActiveMoodFilter(e.target.value)}
                          className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white focus:ring-primary focus:border-primary cursor-pointer"
                        >
                          <option value="All">{t('filter_mood_all') || 'All Moods'}</option>
                          <option value="Neutral">Neutral</option>
                          <option value="Educational">Educational</option>
                          <option value="Cheerful">Cheerful</option>
                          <option value="Melancholic">Melancholic</option>
                          <option value="Suspenseful">Suspenseful</option>
                          <option value="Inspiring">Inspiring</option>
                          <option value="Calm">Calm</option>
                          <option value="Urgent">Urgent</option>
                        </select>
                        <div className="h-6 w-px bg-gray-300 mx-1 hidden sm:block"></div>
                        <div className="flex flex-wrap gap-2">
                          {historyTypeOptions.map((option) => {
                            const isActive = activeHistoryTypes.includes(option.id);
                            const count = historyCountsByType[option.id] || 0;
                            const labelWithCount = count > 0 ? `${option.label} (${count})` : option.label;
                            return (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => {
                                  setActiveHistoryTypes((prev) => {
                                    const exists = prev.includes(option.id);
                                    if (exists) {
                                      const next = prev.filter((t) => t !== option.id);
                                      return next.length === 0 ? prev : next;
                                    }
                                    return [...prev, option.id];
                                  });
                                }}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${isActive
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                  }`}
                              >
                                {labelWithCount}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 whitespace-nowrap">
                        {filteredHistory.length} {t('reading_history_count_suffix')}
                      </div>
                    </div>
                  </div>

                  {loadingHistory ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                    </div>
                  ) : filteredHistory.length > 0 ? (
                    <div className="space-y-4">
                      {historyToRender.map((item) => (
                        <div
                          key={item.id}
                          className="bg-white rounded-xl border border-gray-200 hover:border-primary/40 hover:shadow-md transition-all duration-200 overflow-hidden"
                        >
                          <div
                            className="p-3 md:p-3 cursor-pointer hover:bg-primary/5 transition-colors"
                            onClick={() => {
                              setExpandedHistoryItem(expandedHistoryItem === item.id ? null : item.id);
                            }}
                          >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1 text-xs">
                                  <Badge variant="outline" className="text-xs">
                                    {getHistoryTypeLabel(item.input_type)}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                                    {item.level || 'N/A'}
                                  </Badge>
                                  <span className="text-xs text-gray-500">
                                    {new Date(item.created_at).toLocaleDateString()}
                                  </span>
                                  {item.detected_mood && item.detected_mood !== 'Neutral' && (
                                    <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                      <i className="fas fa-theater-masks mr-1"></i>
                                      {item.detected_mood}
                                    </Badge>
                                  )}
                                </div>
                                <div className="mb-2">
                                  <h4 className="font-semibold text-gray-900 mb-1 text-sm md:text-base">{t('reading_history_adapted_title')}</h4>
                                  <p className="text-sm text-gray-700 line-clamp-2">
                                    {item.adapted_text || item.input}
                                  </p>
                                  {item.adapted_text && (
                                    <details className="mt-2">
                                      <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                                        {t('reading_history_show_original')}
                                      </summary>
                                      <p className="text-xs text-gray-500 mt-1 p-2 bg-gray-100 rounded">
                                        {item.input}
                                      </p>
                                    </details>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-xs text-gray-500">
                                  {expandedHistoryItem === item.id ? t('reading_history_collapse') : t('reading_history_open_player')}
                                </div>
                                <i className={`fas ${expandedHistoryItem === item.id ? 'fa-chevron-up' : 'fa-chevron-down'} text-gray-400`}></i>
                              </div>
                            </div>
                          </div>

                          {expandedHistoryItem === item.id && (
                            <div className="border-t border-gray-200 bg-white p-4 md:p-5">
                              {(() => {
                                const audioResult = {
                                  message: item.adapted_text || item.input,
                                  mp3_url: item.mp3_url,
                                  vtt_url: item.mp3_url.replace('.mp3', '.vtt'),
                                  level: item.level,
                                  adapted_text: item.adapted_text || item.input,
                                  translated_text: item.input, // Original Turkish text
                                  topic: getHistoryTypeLabel(item.input_type),
                                  timepoints: Array.isArray(item.timepoints)
                                    ? item.timepoints
                                    : item.timepoints
                                      ? JSON.parse(item.timepoints as any)
                                      : [],
                                  words: Array.isArray(item.words)
                                    ? item.words
                                    : item.words
                                      ? JSON.parse(item.words as any)
                                      : (item.adapted_text || item.input).split(/\s+/).filter((word) => word.length > 0),
                                  original_turkish: item.input,
                                  speaking_rate: 1.0,
                                } as any;

                                return (
                                  <OutputSection
                                    audioResult={audioResult}
                                    isLoggedIn={isAuthenticated}
                                  />
                                );
                              })()}

                              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="!rounded-button whitespace-nowrap cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(convertToPlayableUrl(item.mp3_url), '_blank');
                                  }}
                                >
                                  <i className="fas fa-external-link-alt mr-2"></i>
                                  {t('reading_history_open_new_tab')}
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="!rounded-button whitespace-nowrap cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedHistoryItem(null);
                                  }}
                                >
                                  <i className="fas fa-times mr-2"></i>
                                  {t('reading_history_close')}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {contentHistory.length > 5 && (
                        <div className="text-center pt-4">
                          <Button
                            variant="outline"
                            className="!rounded-button whitespace-nowrap cursor-pointer"
                            onClick={() => setShowAllHistory(!showAllHistory)}
                          >
                            <i className={`fas ${showAllHistory ? 'fa-chevron-up' : 'fa-chevron-down'} mr-2`}></i>
                            {showAllHistory ? t('reading_history_show_less') : t('reading_history_show_more')}
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-gray-400 mb-4">
                        <i className="fas fa-microphone-slash text-4xl"></i>
                      </div>
                      <h3 className="text-lg font-medium text-gray-500 mb-2">{t('reading_history_empty_title')}</h3>
                      <p className="text-gray-400">{t('reading_history_empty_desc')}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="achievements" className="mt-0">
              {/* Konularım: Welcome sayfasındaki ile aynı konu ağacı deneyimi */}
              <Card className="border-none shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-bold text-gray-800 flex items-center">
                    <i className="fas fa-sitemap mr-2 text-primary"></i>
                    {t('topics_tree_title')}
                  </CardTitle>
                  <CardDescription>
                    {t('topics_tree_description')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TopicHierarchySection
                    userId={user.id}
                    level={"A1"}
                    topicsFirst
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="hobbies" className="mt-0">
              <Card className="border-none shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-bold text-gray-800">{t('hobbies_title')}</CardTitle>
                  <CardDescription>{t('hobbies_description')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-w-xl">
                    <InterestManager showTitle={false} isEditing />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Kitaplarım Tab - Kapsamlı Kitap Arama, Bölümler, Seslendirme */}
            <TabsContent value="book" className="mt-0">
              <BookTab />
            </TabsContent>

            <TabsContent value="podcasts" className="mt-0">
              <Card className="border border-border shadow-lg rounded-2xl bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold mr-4 shadow-sm">
                        <i className="fas fa-podcast"></i>
                      </div>
                      <h2 className="text-2xl font-bold text-primary tracking-tight">{t('podcasts_title')}</h2>
                    </div>
                    <Button
                      onClick={fetchContentHistory}
                      variant="outline"
                      className="!rounded-button whitespace-nowrap cursor-pointer"
                      disabled={loadingHistory}
                    >
                      {loadingHistory ? (
                        <>
                          <i className="fas fa-circle-notch fa-spin mr-2"></i>
                          {t('reading_history_refresh_loading')}
                        </>
                      ) : (
                        <>
                          <i className="fas fa-refresh mr-2"></i>
                          {t('reading_history_refresh_button')}
                        </>
                      )}
                    </Button>
                  </div>

                  {loadingHistory ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                    </div>
                  ) : (() => {
                    const podcastItems = contentHistory.filter(item => (item.input_type || '').toLowerCase() === 'podcast');
                    return podcastItems.length > 0 ? (
                      <div className="space-y-4">
                        {podcastItems.map((item) => (
                          <div
                            key={item.id}
                            className="bg-white rounded-xl border border-gray-200 hover:border-primary/40 hover:shadow-md transition-all duration-200 overflow-hidden"
                          >
                            <div className="p-4">
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2 text-xs">
                                    <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                      <i className="fas fa-podcast mr-1"></i>
                                      Podcast
                                    </Badge>
                                    <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                                      {item.level || 'N/A'}
                                    </Badge>
                                    <span className="text-xs text-gray-500">
                                      {new Date(item.created_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <h4 className="font-semibold text-gray-900 mb-1 text-base">
                                    {item.input || t('podcasts_untitled')}
                                  </h4>
                                  <p className="text-sm text-gray-600 line-clamp-2">
                                    {item.adapted_text ? item.adapted_text.substring(0, 200) + (item.adapted_text.length > 200 ? '...' : '') : t('podcasts_no_transcript')}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {item.mp3_url && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="!rounded-button whitespace-nowrap cursor-pointer"
                                      onClick={() => {
                                        const playableUrl = convertToPlayableUrl(item.mp3_url);
                                        window.open(playableUrl, '_blank');
                                      }}
                                    >
                                      <i className="fas fa-play mr-2"></i>
                                      {t('podcasts_play_button') || 'Dinle'}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-gray-400 mb-4">
                          <i className="fas fa-podcast text-4xl"></i>
                        </div>
                        <h3 className="text-lg font-medium text-gray-500 mb-2">{t('podcasts_empty_title') || 'Henüz podcast yok'}</h3>
                        <p className="text-gray-400">{t('podcasts_empty_desc') || 'Podcast dinleme geçmişiniz burada görünecek.'}</p>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pdf" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="border-none shadow-md lg:col-span-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-bold text-gray-800 flex items-center justify-between">
                      <span>{t('docs_title')}</span>
                      <i className="fas fa-file-alt text-primary"></i>
                    </CardTitle>
                    <CardDescription>
                      {t('docs_description')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {documentsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : documentsError ? (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        {documentsError}
                      </div>
                    ) : documents.length === 0 ? (
                      <div className="text-center py-6 text-sm text-gray-500">
                        {t('docs_empty_left')}
                      </div>
                    ) : (
                      <ScrollArea className="h-[320px] pr-3">
                        <div className="space-y-2">
                          {documents.map((doc) => {
                            const isActive = selectedDocument && selectedDocument.id === doc.id;
                            return (
                              <button
                                key={doc.id}
                                type="button"
                                onClick={() => {
                                  setSelectedDocument(doc);
                                  loadDocumentSections(doc.id);
                                }}
                                className={`w-full text-left p-3 rounded-lg border text-sm transition-colors cursor-pointer ${isActive ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 hover:bg-gray-50'
                                  }`}
                              >
                                <div className="font-medium truncate">{doc.title}</div>
                                <div className="text-xs text-gray-500 mt-1 flex items-center justify-between">
                                  <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                                  {doc.page_count != null && (
                                    <span className="ml-2">{doc.page_count} {t('docs_page_suffix')}</span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-none shadow-md lg:col-span-2">
                  <CardHeader className="pb-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg font-bold text-gray-800">
                        {selectedDocument ? selectedDocument.title : t('docs_select_prompt')}
                      </CardTitle>
                      <CardDescription>
                        {t('docs_sections_description')}
                      </CardDescription>
                    </div>
                    {selectedDocument && (
                      <Badge className="bg-primary/10 text-primary border border-primary/30">
                        <i className="fas fa-layer-group mr-1"></i>
                        {documentSections.length} {t('docs_section_count_suffix')}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent>
                    {!selectedDocument ? (
                      <div className="h-[320px] flex items-center justify-center text-sm text-gray-500">
                        {t('docs_select_prompt')}
                      </div>
                    ) : sectionsLoading ? (
                      <div className="h-[320px] flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : sectionsError ? (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        {sectionsError}
                      </div>
                    ) : documentSections.length === 0 ? (
                      <div className="h-[320px] flex items-center justify-center text-sm text-gray-500">
                        {t('docs_no_sections')}
                      </div>
                    ) : (
                      <ScrollArea className="h-[320px] pr-3">
                        <div className="space-y-2">
                          {documentSections.map((section) => (
                            <div
                              key={section.id}
                              className="p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="text-sm font-semibold text-gray-800 truncate mr-2">
                                  {section.section_index}. {section.section_title || t('docs_section_fallback_title')}
                                </div>
                                <span className="text-xs text-gray-500 whitespace-nowrap">
                                  {section.word_count || 0} {t('docs_words_suffix')}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 line-clamp-2 whitespace-pre-line">
                                {section.section_text}
                              </p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="vocabulary" className="mt-0">
              <div className="mt-4">
                <VocabularyTabContent user={user} />
              </div>
            </TabsContent>

            <TabsContent value="paket-bilgilerim" className="mt-0">
              <section className="mt-4">
                <PackageInfo />
              </section>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div >
  );
};

export default Dashboard;