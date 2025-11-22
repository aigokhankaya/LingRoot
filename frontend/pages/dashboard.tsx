import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import MembershipBadge from '../src/components/user/MembershipBadge';
import { useAuth } from '../src/lib/auth';
import { useRouter } from 'next/router';
import { getUserStats, UserStats, getTopicTree, Topic, getUserBookHistory, BookHistoryItem } from '../src/lib/api';
import { Badge } from '../src/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../src/components/ui/card';
import { Button } from '../src/components/ui/button';
import { Progress } from '../src/components/ui/progress';
import { ScrollArea } from '../src/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../src/components/ui/tabs';
import PackageInfo from '../src/components/PackageInfo';
import { VocabularyTabContent } from './vocabulary';
import TopicTree from '../src/components/TopicHierarchy/TopicTree';



const Dashboard = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = React.useState<string>('dashboard');
  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicsError, setTopicsError] = useState<string | null>(null);
  const [bookHistory, setBookHistory] = useState<BookHistoryItem[]>([]);
  const [bookHistoryLoading, setBookHistoryLoading] = useState(false);
  const [bookHistoryError, setBookHistoryError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Grace period right after login to allow auth state to hydrate
      let withinGrace = false;
      try {
        const ts = typeof window !== 'undefined' ? Number(localStorage.getItem('justLoggedIn') || '0') : 0;
        withinGrace = ts > 0 && Date.now() - ts < 8000; // 8s
      } catch {}
      if (withinGrace) {
        try { console.log('[DASHBOARD] within grace period after login, skip redirect'); } catch {}
        return;
      }
      const path = typeof window !== 'undefined' ? window.location.pathname : '/dashboard';
      const search = typeof window !== 'undefined' ? window.location.search : '';
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      const next = `${path}${search}${hash}`;
      try { console.log('[DASHBOARD] redirecting unauthenticated to /login with next=', next, { isLoading, isAuthenticated }); } catch {}
      if (typeof window !== 'undefined') {
        try { sessionStorage.setItem('postLoginNext', next); } catch {}
      }
      router.push(`/login?next=${encodeURIComponent(next)}`);
    } else {
      try { console.log('[DASHBOARD] auth state', { isLoading, isAuthenticated }); } catch {}
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

  const loadTopicTree = async () => {
    try {
      setTopicsLoading(true);
      setTopicsError(null);
      const response = await getTopicTree();
      if (response.success && response.data) {
        setTopics(response.data.topics);
      } else if (!response.success) {
        setTopicsError(response.message || 'Konular yüklenirken hata oluştu');
      }
    } catch (error: any) {
      console.error('[DASHBOARD] Konu ağacı yükleme hatası:', error);
      setTopicsError(error?.message || 'Konular yüklenirken hata oluştu');
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
        setBookHistoryError(response.message || 'Kitap dinleme geçmişi yüklenirken hata oluştu');
      }
    } catch (error: any) {
      console.error('[DASHBOARD] Kitap geçmişi yükleme hatası:', error);
      setBookHistoryError(error?.message || 'Kitap dinleme geçmişi yüklenirken hata oluştu');
    } finally {
      setBookHistoryLoading(false);
    }
  };

  // Initialize tab from query (?tab=...) then hash, and keep in sync
  useEffect(() => {
    const applyLocation = () => {
      if (typeof window === 'undefined') return;
      const url = new URL(window.location.href);
      const qp = url.searchParams.get('tab');
      if (qp) {
        setTab(qp);
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
    if (tab === 'reading-history' && isAuthenticated) {
      loadTopicTree();
      loadBookHistory();
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

  if (isLoading) {
    return <div className="p-8 text-center text-lg">Yükleniyor...</div>;
  }
  if (!isAuthenticated) {
    return <div className="p-8 text-center text-lg">Yönlendiriliyor...</div>;
  }
  if (!user) {
    return <div className="p-8 text-center text-lg">Kullanıcı bilgileri yükleniyor...</div>;
  }

  const displayName = (user as any).name || user.email;
  const avatar = (user as any).avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}`;
  const membershipStatus = user.membershipStatus || 'free';
  const profileImageUrl = avatar;
  const backgroundImageUrl = 'https://readdy.ai/api/search-image?query=Abstract%2520professional%2520background%2520with%2520soft%2520teal%2520and%2520slate%2520tones%252C%2520subtle%2520geometric%2520patterns%252C%2520clean%2520modern%2520design%252C%2520perfect%2520for%2520profile%2520page%2520header%252C%2520minimalist%2520aesthetic%252C%2520high%2520quality%2520digital%2520art&width=1440&height=300&seq=bg1&orientation=landscape';

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Left: Logo & Navigation */}
            <div className="flex items-center space-x-6">
              <Link href="/welcome" className="flex items-center space-x-2">
                <img src="/LingRoot_MainLogo.png" alt="LingRoot" className="h-8" />
              </Link>
              <Link href="/welcome">
                <button className="text-gray-700 hover:text-primary transition-colors text-sm font-medium">
                  <i className="fas fa-home mr-2"></i>
                  Ana Sayfa
                </button>
              </Link>
            </div>

            {/* Right: Profile Menu */}
            <div className="flex items-center space-x-4">
              {isAuthenticated && (
                <div className="relative">
                  <div
                    className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors"
                    onClick={() => {
                      const menu = document.getElementById('dashboard-profile-menu');
                      if (menu) menu.classList.toggle('hidden');
                    }}
                  >
                    <img
                      src={profileImageUrl}
                      alt={displayName}
                      className="w-9 h-9 rounded-full object-cover border-2 border-gray-200"
                    />
                    <div className="text-sm hidden md:block">
                      <div className="font-medium text-gray-900">{displayName}</div>
                      <div className="text-gray-500 text-xs">{user.email}</div>
                    </div>
                    <i className="fas fa-chevron-down text-gray-400 text-xs"></i>
                  </div>
                  
                  {/* Dropdown Menu */}
                  <div
                    id="dashboard-profile-menu"
                    className="hidden absolute right-0 w-56 mt-2 bg-white rounded-lg shadow-lg py-2 border border-gray-100 z-50"
                  >
                    <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                      <i className="fas fa-user-circle mr-2 w-4 text-center"></i>
                      Profil Bilgilerim
                    </Link>
                    <Link href="/dashboard?tab=paket-bilgilerim" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                      <i className="fas fa-box mr-2 w-4 text-center"></i>
                      Paket Bilgilerim
                    </Link>
                    <Link href="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                      <i className="fas fa-cog mr-2 w-4 text-center"></i>
                      Hesap Ayarları
                    </Link>
                    <Link href="/dashboard?tab=reading-history" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                      <i className="fas fa-history mr-2 w-4 text-center"></i>
                      Okuma Geçmişim
                    </Link>
                    <div className="border-t border-gray-100 mt-2 pt-2">
                      <button
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            localStorage.removeItem('lingroot_token');
                            window.location.href = '/';
                          }
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
                      >
                        <i className="fas fa-sign-out-alt mr-2 w-4 text-center"></i>
                        Çıkış Yap
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Header */}
      <div className="relative w-full h-[220px] md:h-[250px] overflow-hidden mb-8">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${backgroundImageUrl})` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-slate-900/40 to-slate-900/10"></div>
        <div className="container mx-auto px-6 relative h-full flex items-end pb-6">
          <div className="flex items-end">
            <div className="relative mr-6">
              <img src={profileImageUrl} alt={displayName} className="w-28 h-28 md:w-32 md:h-32 border-4 border-white shadow-lg rounded-full object-cover" />
            </div>
            <div className="mb-4 text-white">
              <h1 className="text-3xl font-bold">{displayName}</h1>
              <p className="text-slate-200">{user.email}</p>
              <div className="flex mt-2 gap-2">
                <MembershipBadge status={membershipStatus} />
                <Badge className="bg-primary text-primary-foreground">B1 İngilizce</Badge>
                <Badge className="bg-green-500">2 Dil</Badge>
          </div>
        </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
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
          <TabsList className="flex justify-start mb-6 bg-white p-1 rounded-lg shadow-sm border overflow-x-auto">
            <TabsTrigger value="dashboard" className="!rounded-button whitespace-nowrap cursor-pointer">
              <i className="fas fa-chart-line mr-2"></i>
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="reading-history" className="!rounded-button whitespace-nowrap cursor-pointer">
              <i className="fas fa-history mr-2"></i>
              Okuma Geçmişim
            </TabsTrigger>
            <TabsTrigger value="courses" className="!rounded-button whitespace-nowrap cursor-pointer">
              <i className="fas fa-book mr-2"></i>
              Kitaplarım
            </TabsTrigger>
            <TabsTrigger value="content" className="!rounded-button whitespace-nowrap cursor-pointer">
              <i className="fas fa-file-alt mr-2"></i>
              İçerik Yönetimi
            </TabsTrigger>
            <TabsTrigger value="vocabulary" className="!rounded-button whitespace-nowrap cursor-pointer">
              <i className="fas fa-language mr-2"></i>
              Kelimelerim
            </TabsTrigger>
            <TabsTrigger value="achievements" className="!rounded-button whitespace-nowrap cursor-pointer">
              <i className="fas fa-sitemap mr-2"></i>
              Konularım
            </TabsTrigger>
            <TabsTrigger value="ai-features" className="!rounded-button whitespace-nowrap cursor-pointer">
              <i className="fas fa-robot mr-2"></i>
              AI Özellikleri
            </TabsTrigger>
            <TabsTrigger value="paket-bilgilerim" className="!rounded-button whitespace-nowrap cursor-pointer">
              <i className="fas fa-box mr-2"></i>
              Paket Bilgilerim
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Quick Stats */}
              <div className="col-span-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-none shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Günlük Hedef</p>
                        <h3 className="text-2xl font-bold text-primary">{statsLoading ? '...' : `${stats?.activity.dailyGoalProgress || 0}%`}</h3>
                        <p className="text-xs text-gray-500 mt-1">Hedef: 30 dakika</p>
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
                        <p className="text-sm text-gray-500">Mevcut Seri</p>
                        <h3 className="text-2xl font-bold text-green-600">{statsLoading ? '...' : `${stats?.activity.currentStreak || 0} gün`}</h3>
                        <p className="text-xs text-gray-500 mt-1">En uzun: {stats?.activity.longestStreak || 0} gün</p>
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
                        <p className="text-sm text-gray-500">Toplam Öğrenme</p>
                        <h3 className="text-2xl font-bold text-purple-600">{statsLoading ? '...' : `${stats?.vocabulary.total || 0} kelime`}</h3>
                        <p className="text-xs text-gray-500 mt-1">Öğrenildi: {stats?.vocabulary.learned || 0}</p>
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
                        <p className="text-sm text-gray-500">Ses Oluşturma</p>
                        <h3 className="text-2xl font-bold text-amber-600">{statsLoading ? '...' : `${stats?.subscription.audioCreationCount || 0}`}</h3>
                        <p className="text-xs text-gray-500 mt-1">Plan: {stats?.subscription.plan || 'Free Trial'}</p>
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
              <Card className="border-none shadow-md col-span-3 md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-bold text-gray-800">Haftalık Aktivite</CardTitle>
                  <CardDescription>Son 7 günde öğrenme süreniz</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <i className="fas fa-chart-bar text-4xl text-gray-300 mb-2"></i>
                      <p className="text-gray-500">Haftalık aktivite grafiği burada görünecek</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Today's Tasks */}
              <Card className="border-none shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-bold text-gray-800">Bugünkü Görevler</CardTitle>
                  <CardDescription>6 Haziran 2025, Cuma</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-4">
                      <div className="flex items-center p-3 bg-green-50 rounded-lg border border-green-100">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 mr-3 flex-shrink-0">
                          <i className="fas fa-headphones"></i>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800">Günlük Dinleme Pratiği</h4>
                          <p className="text-sm text-gray-600">10 dakika podcast dinle</p>
                        </div>
                        <Badge className="bg-green-500 ml-2">Tamamlandı</Badge>
                      </div>

                      <div className="flex items-center p-3 bg-primary/5 rounded-lg border border-primary/10">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-3 flex-shrink-0">
                          <i className="fas fa-book-open"></i>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800">Okuma Alıştırması</h4>
                          <p className="text-sm text-gray-600">B1 seviyesinde bir makale oku</p>
                        </div>
                        <Button size="sm" variant="outline" className="ml-2">
                          Başla
                        </Button>
                      </div>

                      <div className="flex items-center p-3 bg-purple-50 rounded-lg border border-purple-100">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mr-3 flex-shrink-0">
                          <i className="fas fa-comment"></i>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800">Konuşma Pratiği</h4>
                          <p className="text-sm text-gray-600">AI asistan ile 5 dakika konuş</p>
                        </div>
                        <Button size="sm" variant="outline" className="ml-2">
                          Başla
                        </Button>
                      </div>

                      <div className="flex items-center p-3 bg-amber-50 rounded-lg border border-amber-100">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mr-3 flex-shrink-0">
                          <i className="fas fa-pen"></i>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800">Yazma Alıştırması</h4>
                          <p className="text-sm text-gray-600">Günlük rutininiz hakkında kısa bir paragraf yazın</p>
                        </div>
                        <Button size="sm" variant="outline" className="ml-2">
                          Başla
                        </Button>
                      </div>

                      <div className="flex items-center p-3 bg-red-50 rounded-lg border border-red-100">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 mr-3 flex-shrink-0">
                          <i className="fas fa-brain"></i>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800">Kelime Tekrarı</h4>
                          <p className="text-sm text-gray-600">Bugün için 15 kelime tekrarı yapın</p>
                        </div>
                        <Button size="sm" variant="outline" className="ml-2">
                          Başla
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
              <Card className="border-none shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-bold text-gray-800">Kelime Gelişimi</CardTitle>
                  <CardDescription>Öğrenilen kelime sayısı</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <i className="fas fa-chart-line text-4xl text-gray-300 mb-2"></i>
                      <p className="text-gray-500">Kelime gelişimi grafiği burada görünecek</p>
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

          {/* Reading History Tab (Topics + Books) */}
          <TabsContent value="reading-history" className="mt-0">
            <Card className="border-none shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-bold text-gray-800">Okuma Geçmişim</CardTitle>
                <CardDescription>Konu ağacınız ve kitap dinleme geçmişiniz burada.</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="topics" className="w-full">
                  <TabsList className="mb-4 bg-gray-50 p-1 rounded-lg inline-flex">
                    <TabsTrigger value="topics" className="!rounded-button whitespace-nowrap cursor-pointer">
                      <i className="fas fa-sitemap mr-2"></i>
                      Konularım
                    </TabsTrigger>
                    <TabsTrigger value="books" className="!rounded-button whitespace-nowrap cursor-pointer">
                      <i className="fas fa-book mr-2"></i>
                      Kitaplarım
                    </TabsTrigger>
                  </TabsList>

                  {/* Konularım sekmesi */}
                  <TabsContent value="topics" className="mt-0">
                    {topicsLoading && (
                      <div className="text-center py-6 text-gray-500">
                        <i className="fas fa-spinner fa-spin text-xl mr-2"></i>
                        Konular yükleniyor...
                      </div>
                    )}

                    {topicsError && !topicsLoading && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        {topicsError}
                      </div>
                    )}

                    {!topicsLoading && !topicsError && topics.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <i className="fas fa-folder-open text-4xl mb-3"></i>
                        <p>Henüz konu oluşturmadınız.</p>
                        <p className="text-sm text-gray-400 mt-1">
                          İlk konunuzu{' '}
                          <Link href="/welcome" className="text-primary underline">
                            Ana Sayfa
                          </Link>
                          {' '}üzerindeki Konu Ağacı bölümünden oluşturabilirsiniz.
                        </p>
                      </div>
                    )}

                    {!topicsLoading && !topicsError && topics.length > 0 && (
                      <div className="mt-4">
                        <TopicTree
                          topics={topics}
                          onRefresh={loadTopicTree}
                          level="A1"
                        />
                      </div>
                    )}
                  </TabsContent>

                  {/* Kitaplarım sekmesi */}
                  <TabsContent value="books" className="mt-0">
                    {bookHistoryLoading && (
                      <div className="text-center py-6 text-gray-500">
                        <i className="fas fa-spinner fa-spin text-xl mr-2"></i>
                        Kitap dinleme geçmişi yükleniyor...
                      </div>
                    )}

                    {bookHistoryError && !bookHistoryLoading && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        {bookHistoryError}
                      </div>
                    )}

                    {!bookHistoryLoading && !bookHistoryError && bookHistory.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <i className="fas fa-book-open text-4xl mb-3"></i>
                        <p>Henüz kitap bölümü dinlemediniz.</p>
                        <p className="text-sm text-gray-400 mt-1">
                          İlk kitabınızı{' '}
                          <Link href="/welcome" className="text-primary underline">
                            Ana Sayfa
                          </Link>
                          {' '}üzerindeki Kitap sekmesinden seçebilirsiniz.
                        </p>
                      </div>
                    )}

                    {!bookHistoryLoading && !bookHistoryError && bookHistory.length > 0 && (
                      <div className="space-y-8">
                        {/* Son dinlenen kitaplar - kart grid */}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 mb-3">Son Dinlenen Kitaplar</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.values(
                              bookHistory.reduce((acc: Record<string, any>, item) => {
                                const key = String(item.book_id || item.book_title);
                                if (!acc[key]) {
                                  acc[key] = {
                                    book_id: item.book_id,
                                    book_title: item.book_title,
                                    book_authors: item.book_authors,
                                    cover_url: item.cover_url,
                                    subjects: item.subjects,
                                    lastChapter: item,
                                    chapterCount: 1,
                                  };
                                } else {
                                  acc[key].chapterCount += 1;
                                  if (new Date(item.created_at).getTime() > new Date(acc[key].lastChapter.created_at).getTime()) {
                                    acc[key].lastChapter = item;
                                  }
                                }
                                return acc;
                              }, {})
                            ).map((book: any, index: number) => (
                              <div
                                key={`${book.book_id || book.book_title}-${index}`}
                                className="bg-white rounded-lg shadow-sm hover:shadow-md border border-gray-100 overflow-hidden flex flex-col"
                              >
                                <div className="relative w-full h-40 bg-gray-100">
                                  {book.cover_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={book.cover_url}
                                      alt={book.book_title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                                      <i className="fas fa-book-open text-3xl text-primary/60"></i>
                                    </div>
                                  )}
                                </div>
                                <div className="p-4 flex-1 flex flex-col">
                                  <h4 className="font-semibold text-gray-900 line-clamp-2 mb-1">{book.book_title}</h4>
                                  <p className="text-sm text-gray-600 mb-2 line-clamp-1">{book.book_authors}</p>
                                  {book.subjects && (
                                    <p className="text-xs text-gray-500 mb-2 line-clamp-1">{book.subjects}</p>
                                  )}
                                  <div className="flex items-center justify-between mt-auto pt-2">
                                    <span className="text-xs text-gray-500">
                                      {book.chapterCount} bölüm dinlendi
                                    </span>
                                    <Link
                                      href="/welcome?contentType=book"
                                      className="text-xs font-medium text-primary hover:underline flex items-center"
                                    >
                                      Devam Et
                                      <i className="fas fa-arrow-right ml-1"></i>
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Son dinlenen bölümler listesi */}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 mb-3">Son Dinlediğiniz Bölümler</h3>
                          <div className="space-y-3">
                            {bookHistory.slice(0, 15).map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-14 bg-white rounded-md border border-gray-200 flex items-center justify-center">
                                    <i className="fas fa-book text-primary"></i>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900 line-clamp-1">
                                      {item.book_title}
                                    </p>
                                    <p className="text-xs text-gray-600 line-clamp-1">
                                      Bölüm {item.chapter_index}: {item.chapter_title}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      Seviye: {item.level.toUpperCase()} • {Math.round(item.duration)} sn • {new Date(item.created_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <Link
                                  href="/welcome?contentType=book"
                                  className="text-xs font-medium text-primary hover:underline flex items-center"
                                >
                                  Dinle
                                  <i className="fas fa-play ml-1"></i>
                                </Link>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Other Tab Contents - Placeholder */}
          <TabsContent value="courses" className="mt-0">
            {/* Kitaplarım: Kullanıcının dinlediği kitap geçmişi */}
            {bookHistoryLoading && (
              <div className="text-center py-6 text-gray-500">
                <i className="fas fa-spinner fa-spin text-xl mr-2"></i>
                Kitap dinleme geçmişi yükleniyor...
              </div>
            )}

            {bookHistoryError && !bookHistoryLoading && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {bookHistoryError}
              </div>
            )}

            {!bookHistoryLoading && !bookHistoryError && bookHistory.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <i className="fas fa-book-open text-4xl mb-3"></i>
                <p>Henüz kitap bölümü dinlemediniz.</p>
                <p className="text-sm text-gray-400 mt-1">
                  İlk kitabınızı{' '}
                  <Link href="/welcome" className="text-primary underline">
                    Ana Sayfa
                  </Link>
                  {' '}üzerindeki Kitap sekmesinden seçebilirsiniz.
                </p>
              </div>
            )}

            {!bookHistoryLoading && !bookHistoryError && bookHistory.length > 0 && (
              <div className="space-y-8">
                {/* Son dinlenen kitaplar - kart grid */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Son Dinlenen Kitaplar</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.values(
                      bookHistory.reduce((acc: Record<string, any>, item) => {
                        const key = String(item.book_id || item.book_title);
                        if (!acc[key]) {
                          acc[key] = {
                            book_id: item.book_id,
                            book_title: item.book_title,
                            book_authors: item.book_authors,
                            cover_url: item.cover_url,
                            subjects: item.subjects,
                            lastChapter: item,
                            chapterCount: 1,
                          };
                        } else {
                          acc[key].chapterCount += 1;
                          if (new Date(item.created_at).getTime() > new Date(acc[key].lastChapter.created_at).getTime()) {
                            acc[key].lastChapter = item;
                          }
                        }
                        return acc;
                      }, {})
                    ).map((book: any, index: number) => (
                      <div
                        key={`${book.book_id || book.book_title}-${index}`}
                        className="bg-white rounded-lg shadow-sm hover:shadow-md border border-gray-100 overflow-hidden flex flex-col"
                      >
                        <div className="relative w-full h-40 bg-gray-100">
                          {book.cover_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={book.cover_url}
                              alt={book.book_title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                              <i className="fas fa-book-open text-3xl text-primary/60"></i>
                            </div>
                          )}
                        </div>
                        <div className="p-4 flex-1 flex flex-col">
                          <h4 className="font-semibold text-gray-900 line-clamp-2 mb-1">{book.book_title}</h4>
                          <p className="text-sm text-gray-600 mb-2 line-clamp-1">{book.book_authors}</p>
                          {book.subjects && (
                            <p className="text-xs text-gray-500 mb-2 line-clamp-1">{book.subjects}</p>
                          )}
                          <div className="flex items-center justify-between mt-auto pt-2">
                            <span className="text-xs text-gray-500">
                              {book.chapterCount} bölüm dinlendi
                            </span>
                            <Link
                              href="/welcome?contentType=book"
                              className="text-xs font-medium text-primary hover:underline flex items-center"
                            >
                              Devam Et
                              <i className="fas fa-arrow-right ml-1"></i>
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Son dinlenen bölümler listesi */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Son Dinlediğiniz Bölümler</h3>
                  <div className="space-y-3">
                    {bookHistory.slice(0, 15).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-14 bg-white rounded-md border border-gray-200 flex items-center justify-center">
                            <i className="fas fa-book text-primary"></i>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 line-clamp-1">
                              {item.book_title}
                            </p>
                            <p className="text-xs text-gray-600 line-clamp-1">
                              Bölüm {item.chapter_index}: {item.chapter_title}
                            </p>
                            <p className="text-xs text-gray-400">
                              Seviye: {item.level.toUpperCase()} • {Math.round(item.duration)} sn • {new Date(item.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Link
                          href="/welcome?contentType=book"
                          className="text-xs font-medium text-primary hover:underline flex items-center"
                        >
                          Dinle
                          <i className="fas fa-play ml-1"></i>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="content" className="mt-0">
            <div className="text-center py-8">
              <i className="fas fa-file-alt text-4xl text-gray-300 mb-2"></i>
              <h3 className="text-lg font-medium text-gray-700">İçerik Yönetimi</h3>
              <p className="text-sm text-gray-500">İçerik yönetimi burada görünecek</p>
            </div>
          </TabsContent>

          <TabsContent value="vocabulary" className="mt-0">
            <VocabularyTabContent user={user} />
          </TabsContent>

          <TabsContent value="achievements" className="mt-0">
            {/* Konularım: Konu ağacı görünümü */}
            {topicsLoading && (
              <div className="text-center py-6 text-gray-500">
                <i className="fas fa-spinner fa-spin text-xl mr-2"></i>
                Konular yükleniyor...
              </div>
            )}

            {topicsError && !topicsLoading && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {topicsError}
              </div>
            )}

            {!topicsLoading && !topicsError && topics.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <i className="fas fa-folder-open text-4xl mb-3"></i>
                <p>Henüz konu oluşturmadınız.</p>
                <p className="text-sm text-gray-400 mt-1">
                  İlk konunuzu{' '}
                  <Link href="/welcome" className="text-primary underline">
                    Ana Sayfa
                  </Link>
                  {' '}üzerindeki Konu Ağacı bölümünden oluşturabilirsiniz.
                </p>
              </div>
            )}

            {!topicsLoading && !topicsError && topics.length > 0 && (
              <div className="mt-4">
                <TopicTree
                  topics={topics}
                  onRefresh={loadTopicTree}
                  level="A1"
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="ai-features" className="mt-0">
            <div className="text-center py-8">
              <i className="fas fa-robot text-4xl text-gray-300 mb-2"></i>
              <h3 className="text-lg font-medium text-gray-700">AI Özellikleri</h3>
              <p className="text-sm text-gray-500">AI özellikleri burada görünecek</p>
          </div>
          </TabsContent>

          <TabsContent value="paket-bilgilerim" className="mt-0">
            <PackageInfo />
          </TabsContent>
        </Tabs>
          </div>
        </div>
  );
};

export default Dashboard; 