// The exported code uses Tailwind CSS. Install Tailwind CSS in your dev environment to ensure all styles work.

"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTheme } from "next-themes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import * as echarts from 'echarts';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { deleteUser as deleteUserApi, deleteUsersBulk as deleteUsersBulkApi } from '@/services/userService';
// Paket Bilgilerim kullanıcı dashboard'ına taşındı
import AdminChatInterface from '@/components/AdminChatInterface';
import TtsProviderSelector from '@/components/admin/TtsProviderSelector';
import EnvironmentSelector from '@/components/admin/EnvironmentSelector';
import PaymentEnvironmentSelector from '@/components/admin/PaymentEnvironmentSelector';
import ApiCostDashboard from '@/components/admin/ApiCostDashboard';

const App: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("kullanici-yonetimi");

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedTab = localStorage.getItem('admin_active_tab');
    if (savedTab) {
      setActiveTab(savedTab);
    }
  }, []);

  const handleChangeActiveTab = (tab: string) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_active_tab', tab);
    }
  };

  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setToken(localStorage.getItem('lingroot_token'));
    }
  }, []);

  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("tümü");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const router = useRouter();
  const [plans, setPlans] = useState<any[]>([]);
  const [plansLoading, setPlansLoading] = useState<boolean>(false);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement | null>(null);
  // Destek konuşmaları için durum çoktan seçmeli (boş liste = tüm durumlar)
  const [conversationFilter, setConversationFilter] = useState<{ status: string[]; priority: string }>({ status: [], priority: 'all' });

  const statusFilterOptions = [
    { value: 'open', label: 'Açık' },
    { value: 'in_progress', label: 'İşlemde' },
    { value: 'waiting', label: 'Beklemede' },
    { value: 'resolved', label: 'Çözüldü' },
    { value: 'closed', label: 'Kapatıldı' },
  ];

  const isStatusSelected = (value: string) => conversationFilter.status.includes(value);

  const toggleStatusFilter = (value: string) => {
    setConversationFilter((prev) => {
      const exists = prev.status.includes(value);
      const nextStatus = exists
        ? prev.status.filter((s) => s !== value)
        : [...prev.status, value];
      return { ...prev, status: nextStatus };
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!statusDropdownRef.current) return;
      if (!(event.target instanceof Node)) return;
      if (!statusDropdownRef.current.contains(event.target)) {
        setIsStatusDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const clearStatusFilter = () => {
    setConversationFilter((prev) => ({ ...prev, status: [] }));
  };
  const statusButtonLabel = conversationFilter.status.length === 0
    ? 'Tüm Durumlar'
    : conversationFilter.status.length === 1
      ? (statusFilterOptions.find((opt) => opt.value === conversationFilter.status[0])?.label || 'Seçili 1 durum')
      : `Seçili ${conversationFilter.status.length} durum`;
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [planForm, setPlanForm] = useState<any>({
    name: '',
    description: '',
    price: '',
    interval: 'monthly',
    features: '',
    is_active: true,
    is_trial: false,
    trial_days: 7,
    apple_product_id: '',
    google_product_id: '',
  });

  // Cost dashboard state
  const [costOverview, setCostOverview] = useState<any | null>(null);
  const [costByUser, setCostByUser] = useState<any[]>([]);
  const [costByProvider, setCostByProvider] = useState<any[]>([]);
  const [costBySource, setCostBySource] = useState<any[]>([]);
  const [costItems, setCostItems] = useState<any[]>([]);
  const [costItemsLoading, setCostItemsLoading] = useState(false);
  const [costLoading, setCostLoading] = useState(false);
  const [costError, setCostError] = useState<string | null>(null);
  const [expandedCostRows, setExpandedCostRows] = useState<Set<string>>(new Set());

  const toggleCostRowExpansion = (itemId: string) => {
    setExpandedCostRows(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const formatMinutesToMinSec = (minutes: number | null | undefined) => {
    if (minutes == null || isNaN(Number(minutes))) return '-';
    const totalSeconds = Math.round(Number(minutes) * 60);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  const resetPlanForm = () => setPlanForm({
    name: '', description: '', price: '', interval: 'monthly', features: '', is_active: true, is_trial: false, trial_days: 7, apple_product_id: '', google_product_id: ''
  });

  // Fiyata göre açıklama ve özellikleri hesapla
  const generatePlanDetails = (price: number, name: string) => {
    // TTS maliyeti: ~$0.000016 per karakter (Google TTS)
    // OpenAI maliyeti: ~$0.002 per 1K token
    // Ortalama: 1 dakika video = ~150 kelime = ~200 token = ~1000 karakter
    // Toplam maliyet/dakika: ~$0.016 (TTS) + ~$0.0004 (OpenAI) ≈ $0.0165
    // 1 sayfa = ~500 kelime = ~3.3 dakika

    const priceInUSD = price / 35; // ₺ to $ (yaklaşık kur)
    const costPerMinute = 0.0165;
    const minutesPerPage = 3.3;

    const estimatedMinutes = Math.floor((priceInUSD * 0.7) / costPerMinute); // %70'ini içerik üretimine ayır
    const estimatedPages = Math.floor(estimatedMinutes / minutesPerPage);

    let description = '';
    let features = '';

    const nameLower = name.toLowerCase();

    if (nameLower.includes('trial') || nameLower.includes('ücretsiz') || nameLower.includes('free')) {
      description = 'TR: Ücretsiz deneme paketi | EN: Free trial package';
      features = 'TR: 3 ses oluşturma hakkı, EN: 3 audio creation credits, TR: Her ses maksimum 10 dakika, EN: Each audio up to 10 minutes, TR: Tüm CEFR seviyeleri, EN: All CEFR levels';
    } else if (nameLower.includes('gold')) {
      description = 'TR: Aylık premium paket - Sınırsız içerik üretimi | EN: Monthly premium package - Unlimited content creation';
      features = `TR: Aylık ~${estimatedMinutes} dakika ses oluşturma, EN: Monthly ~${estimatedMinutes} minutes audio creation, TR: Yaklaşık ${estimatedPages} sayfa metin işleme, EN: Approximately ${estimatedPages} pages text processing, TR: Tüm CEFR seviyeleri, EN: All CEFR levels, TR: Sınırsız kelime ekleme, EN: Unlimited vocabulary`;
    } else if (nameLower.includes('platinum') || nameLower.includes('platin')) {
      description = 'TR: Aylık premium+ paket - Öncelikli destek | EN: Monthly premium+ package - Priority support';
      features = `TR: Aylık ~${estimatedMinutes} dakika ses oluşturma, EN: Monthly ~${estimatedMinutes} minutes audio creation, TR: Yaklaşık ${estimatedPages} sayfa metin işleme, EN: Approximately ${estimatedPages} pages text processing, TR: Tüm CEFR seviyeleri, EN: All CEFR levels, TR: Sınırsız kelime ekleme, EN: Unlimited vocabulary, TR: Öncelikli destek, EN: Priority support`;
    } else {
      description = 'TR: Aylık paket | EN: Monthly package';
      features = `TR: Aylık ~${estimatedMinutes} dakika ses oluşturma, EN: Monthly ~${estimatedMinutes} minutes audio creation, TR: Yaklaşık ${estimatedPages} sayfa metin işleme, EN: Approximately ${estimatedPages} pages text processing, TR: Tüm CEFR seviyeleri, EN: All CEFR levels`;
    }

    return {
      description,
      features,
      estimates: {
        video_minutes: estimatedMinutes,
        text_pages: estimatedPages
      }
    };
  };

  const fetchCostDashboard = async () => {
    try {
      setCostLoading(true);
      setCostError(null);
      const token = typeof window !== 'undefined' ? localStorage.getItem('lingroot_token') : null;
      const res = await fetch('/api/admin/cost-dashboard', {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json',
        },
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Maliyet verileri getirilemedi');
      }
      const data = json.data || {};
      setCostOverview(data.overview || null);
      setCostByUser(Array.isArray(data.by_user) ? data.by_user.slice(0, 20) : []);
      setCostByProvider(Array.isArray(data.by_provider_category) ? data.by_provider_category : []);
      setCostBySource(Array.isArray(data.by_entry_source) ? data.by_entry_source : []);
      setCostItems(Array.isArray(data.items) ? data.items : []);
    } catch (e: any) {
      console.error('Cost dashboard fetch error:', e);
      setCostError(e?.message || 'Maliyet verileri yüklenemedi');
    } finally {
      setCostLoading(false);
    }
  };

  const fetchCostItems = async () => {
    try {
      setCostItemsLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('lingroot_token') : null;
      const res = await fetch('/api/admin/cost-dashboard', {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json',
        },
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Maliyet verileri getirilemedi');
      }
      const data = json.data || {};
      setCostItems(Array.isArray(data.items) ? data.items : []);
    } catch (e: any) {
      console.error('Cost items fetch error:', e);
      setCostError(e?.message || 'Maliyet verileri yüklenemedi');
    } finally {
      setCostItemsLoading(false);
    }
  };
  const openCreatePlan = () => { setEditingPlan(null); resetPlanForm(); setShowPackageForm(true); };
  const openEditPlan = (p: any) => {
    setEditingPlan(p);
    setPlanForm({
      name: p.name || '',
      description: p.description || '',
      price: p.price ?? '',
      interval: p.interval || 'monthly',
      features: Array.isArray(p.features) ? p.features.join(', ') : (p.features || ''),
      is_active: p.is_active ?? true,
      is_trial: p.is_trial ?? false,
      trial_days: p.trial_days ?? 7,
      apple_product_id: p.apple_product_id || '',
      google_product_id: p.google_product_id || '',
    });
    setShowPackageForm(true);
  };
  const savePlan = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('lingroot_token') : null;
    const body: any = {
      name: planForm.name,
      description: planForm.description,
      price: planForm.price !== '' ? Number(planForm.price) : undefined,
      interval: planForm.interval,
      features: planForm.features ? planForm.features.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      is_active: !!planForm.is_active,
      is_trial: !!planForm.is_trial,
      trial_days: Number(planForm.trial_days) || 7,
      apple_product_id: planForm.apple_product_id?.trim() || null,
      google_product_id: planForm.google_product_id?.trim() || null,
    };
    const url = editingPlan ? `/api/admin/plans/${editingPlan.id}` : '/api/admin/plans';
    const method = editingPlan ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Authorization': `Bearer ${token || ''}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = await res.json();
    if (!res.ok || !json?.success) throw new Error(json?.message || 'Plan kaydedilemedi');
    setShowPackageForm(false);
    setEditingPlan(null);
    resetPlanForm();
    await fetchPlans();
  };

  const fetchPlans = async () => {
    try {
      setPlansLoading(true);
      setPlansError(null);
      const token = typeof window !== 'undefined' ? localStorage.getItem('lingroot_token') : null;
      const res = await fetch('/api/admin/plans', {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json'
        }
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Planlar getirilemedi');
      }
      setPlans(Array.isArray(json.data) ? json.data : []);
    } catch (e: any) {
      console.error('Plan fetch error:', e);
      setPlansError(e?.message || 'Planlar yüklenemedi');
    } finally {
      setPlansLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && activeTab === 'paket-yonetimi') {
      fetchPlans();
    }
  }, [loading, activeTab]);

  useEffect(() => {
    if (!loading && activeTab === 'maliyet-takibi') {
      fetchCostDashboard();
    }
  }, [loading, activeTab]);

  useEffect(() => {
    const checkAuth = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('lingroot_token') : null;

      if (!token) {
        router.push('/admin/login');
        return;
      }

      try {
        // Verify token and get user info
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();

        if (response.ok && data.success && data.user) {
          if (data.user.role === 'admin') {
            setUserEmail(data.user.email || 'N/A');
            // Fetch users after successful auth
            fetchUsers();
          } else {
            setError('Access denied: Admin privileges required.');
            localStorage.removeItem('lingroot_token');
            router.push('/admin/login');
          }
        } else {
          localStorage.removeItem('lingroot_token');
          router.push('/admin/login');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        localStorage.removeItem('lingroot_token');
        router.push('/admin/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const token = localStorage.getItem('lingroot_token');
      console.log('[FETCH USERS] Starting fetch with token:', token ? 'present' : 'missing');

      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('[FETCH USERS] Response status:', response.status);

      const data = await response.json();
      console.log('[FETCH USERS] Response data:', data);

      if (response.ok && data.success) {
        // Backend'den gelen data formatını kullan (zaten transform edilmiş)
        setUsers(data.users || []);
        setSelectedUserIds(new Set());
        console.log('[FETCH USERS] Users set successfully:', data.users?.length || 0);
      } else {
        console.error('[FETCH USERS] Failed to fetch users:', data);
        console.error('[FETCH USERS] Response status:', response.status);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setUsersLoading(false);
    }
  };

  const allSelected = useMemo(() => users.length > 0 && selectedUserIds.size === users.length, [users, selectedUserIds]);
  const hasSelection = selectedUserIds.size > 0;

  const toggleSelectAll = (checked: boolean | string) => {
    if (checked === true) {
      setSelectedUserIds(new Set(users.map((u) => u.id)));
    } else {
      setSelectedUserIds(new Set());
    }
  };

  const toggleSelectOne = (userId: string, checked: boolean | string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (checked === true) next.add(userId); else next.delete(userId);
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    if (!hasSelection) return;
    const ids = Array.from(selectedUserIds);
    if (!confirm(`Seçili ${ids.length} kullanıcıyı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;
    try {
      const { deletedAudioCount } = await deleteUsersBulkApi(ids);
      setUsers((prev) => prev.filter((u) => !selectedUserIds.has(u.id)));
      setSelectedUserIds(new Set());
      alert(`Seçili kullanıcılar silindi. Silinen ses kaydı: ${deletedAudioCount ?? 0}`);
    } catch (e: any) {
      console.error('Bulk delete error:', e);
      alert(`Kullanıcılar silinemedi: ${e?.message || 'Bilinmeyen hata'}`);
    }
  };

  const handleDeleteOne = async (userId: string, userEmail?: string) => {
    if (!confirm(`Kullanıcıyı silmek istediğinize emin misiniz? (${userEmail || userId})`)) return;
    try {
      const { deletedAudioCount } = await deleteUserApi(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setSelectedUserIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      alert(`Kullanıcı silindi. Silinen ses kaydı: ${deletedAudioCount ?? 0}`);
    } catch (e: any) {
      console.error('Delete user error:', e);
      alert(`Kullanıcı silinemedi: ${e?.message || 'Bilinmeyen hata'}`);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      // Remove JWT token
      localStorage.removeItem('lingroot_token');
      router.push('/admin/login');
    } catch (error) {
      console.error('Error signing out:', error);
      setError('Failed to sign out.');
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (loading || activeTab !== "analitik" || typeof window === 'undefined') return;

    // DOM elementlerinin var olup olmadığını kontrol et
    const packageElement = document.getElementById('package-distribution-chart');
    const usageElement = document.getElementById('usage-duration-chart');
    const levelElement = document.getElementById('level-preference-chart');

    if (!packageElement || !usageElement || !levelElement) {
      return;
    }

    // Kullanıcı dağılımı pasta grafiği
    const packageDistributionChart = echarts.init(packageElement);
    const packageDistributionOption = {
      animation: false,
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        left: 10,
        data: ['Ücretsiz', 'Premium', 'Pro', 'Kurumsal']
      },
      series: [
        {
          name: 'Paket Dağılımı',
          type: 'pie',
          radius: ['50%', '70%'],
          avoidLabelOverlap: false,
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: '18',
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data: [
            { value: 1548, name: 'Ücretsiz' },
            { value: 735, name: 'Premium' },
            { value: 580, name: 'Pro' },
            { value: 300, name: 'Kurumsal' }
          ]
        }
      ]
    };
    packageDistributionChart.setOption(packageDistributionOption);

    // Ortalama kullanım süresi çubuk grafiği
    const usageDurationChart = echarts.init(usageElement);
    const usageDurationOption = {
      animation: false,
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: [
        {
          type: 'category',
          data: ['Ücretsiz', 'Premium', 'Pro', 'Kurumsal'],
          axisTick: {
            alignWithLabel: true
          }
        }
      ],
      yAxis: [
        {
          type: 'value',
          name: 'Ay',
          nameLocation: 'end'
        }
      ],
      series: [
        {
          name: 'Ortalama Kullanım Süresi (Ay)',
          type: 'bar',
          barWidth: '60%',
          data: [1.2, 4.5, 8.3, 12.7]
        }
      ]
    };
    usageDurationChart.setOption(usageDurationOption);

    // Seviye tercih dağılımı ısı haritası
    const levelPreferenceChart = echarts.init(levelElement);
    const levelPreferenceOption = {
      animation: false,
      tooltip: {
        position: 'top'
      },
      grid: {
        height: '50%',
        top: '10%'
      },
      xAxis: {
        type: 'category',
        data: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
        splitArea: {
          show: true
        }
      },
      yAxis: {
        type: 'category',
        data: ['Ücretsiz', 'Premium', 'Pro', 'Kurumsal'],
        splitArea: {
          show: true
        }
      },
      visualMap: {
        min: 0,
        max: 100,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '15%'
      },
      series: [{
        name: 'Seviye Tercihi (%)',
        type: 'heatmap',
        data: [
          [0, 0, 85], [1, 0, 75], [2, 0, 10], [3, 0, 5], [4, 0, 0], [5, 0, 0],
          [0, 1, 30], [1, 1, 40], [2, 1, 60], [3, 1, 40], [4, 1, 15], [5, 1, 5],
          [0, 2, 15], [1, 2, 25], [2, 2, 35], [3, 2, 45], [4, 2, 50], [5, 2, 40],
          [0, 3, 10], [1, 3, 15], [2, 3, 25], [3, 3, 35], [4, 3, 45], [5, 3, 60]
        ],
        label: {
          show: true
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }]
    };
    levelPreferenceChart.setOption(levelPreferenceOption);

    // Resize grafikleri
    const handleResize = () => {
      packageDistributionChart.resize();
      usageDurationChart.resize();
      levelPreferenceChart.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      packageDistributionChart.dispose();
      usageDurationChart.dispose();
      levelPreferenceChart.dispose();
    };
  }, [loading, activeTab]);

  const coupons = [
    { id: '1', code: 'YAZ2025', discount: '%25', validUntil: '31.08.2025', usageCount: 145, maxUsage: 500, status: 'aktif' },
    { id: '2', code: 'HOŞGELDIN', discount: '%50 ilk ay', validUntil: '31.12.2025', usageCount: 278, maxUsage: 1000, status: 'aktif' },
    { id: '3', code: 'BLACKFRIDAY', discount: '%40', validUntil: '30.11.2025', usageCount: 0, maxUsage: 2000, status: 'pasif' },
  ];

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'tümü' || user.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('admin_support_conversation_filter');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.status) && typeof parsed.priority === 'string') {
        setConversationFilter({ status: parsed.status, priority: parsed.priority });
      }
    } catch (e) {
      console.error('Failed to load support conversation filter', e);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        'admin_support_conversation_filter',
        JSON.stringify(conversationFilter)
      );
    } catch (e) {
      console.error('Failed to save support conversation filter', e);
    }
  }, [conversationFilter]);

  const handleUserClick = (userId: string) => {
    router.push(`/admin/users/${userId}`);
  };

  if (loading) {
    return <div className="p-4 text-center">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 py-0.5 md:px-4 md:py-1 flex flex-wrap items-center gap-2 md:gap-3">
          <div className="flex items-center space-x-2 md:space-x-3 min-w-0">
            <Image
              src="/lingroot-icon.svg"
              alt="LingRoot Logo"
              width={40}
              height={40}
              className="w-6 h-6 md:w-8 md:h-8"
            />
            <span className="text-xs sm:text-sm md:text-base lg:text-lg font-medium text-gray-800 truncate leading-tight">Admin</span>
          </div>
          <div className="flex items-center space-x-2 md:space-x-4 ml-auto mr-2 md:mr-4">
            <Link href="/welcome">
              <Button
                variant="outline"
                size="sm"
                className="!rounded-full border-indigo-500 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 shadow-sm flex items-center gap-2"
              >
                <i className="fas fa-door-open text-indigo-500"></i>
                <span className="hidden xl:inline">Welcome Sayfası</span>
                <span className="sr-only">Welcome</span>
              </Button>
            </Link>
            <div className="relative">
              <i className="fas fa-bell text-gray-500 cursor-pointer"></i>
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">3</span>
            </div>
            <div className="flex items-center space-x-2">
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarImage src="https://readdy.ai/api/search-image?query=professional%20portrait%20of%20a%20Turkish%20admin%20person%20with%20short%20dark%20hair%20wearing%20business%20casual%20attire%2C%20neutral%20expression%2C%20studio%20lighting%2C%20high%20quality%2C%20photorealistic&width=100&height=100&seq=avatar1&orientation=squarish" />
                <AvatarFallback>AD</AvatarFallback>
              </Avatar>
              <span className="hidden xl:inline text-sm font-medium text-gray-700">Enes Yüzak</span>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                <i className="fas fa-sign-out-alt xl:hidden"></i>
                <span className="hidden xl:inline">Çıkış</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 h-full flex-shrink-0">
          <nav className="p-4">
            <div className="space-y-2">
              <Button variant="ghost" className="w-full justify-start text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 !rounded-button whitespace-nowrap h-12 text-base" onClick={() => handleChangeActiveTab("kullanici-yonetimi")}>
                <i className="fas fa-users mr-3 text-lg"></i>
                <span>Kullanıcı Yönetimi</span>
              </Button>
              <Button variant="ghost" className="w-full justify-start text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 !rounded-button whitespace-nowrap h-12 text-base" onClick={() => handleChangeActiveTab("paket-yonetimi")}>
                <i className="fas fa-box mr-3 text-lg"></i>
                <span>Paket Yönetimi</span>
              </Button>
              <Button variant="ghost" className="w-full justify-start text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 !rounded-button whitespace-nowrap h-12 text-base" onClick={() => router.push('/admin/packages')}>
                <i className="fas fa-cogs mr-3 text-lg"></i>
                <span>Paket Özellikleri</span>
              </Button>
              {/* Paket Bilgilerim sekmesi kaldırıldı */}
              <Button variant="ghost" className="w-full justify-start text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 !rounded-button whitespace-nowrap h-12 text-base" onClick={() => router.push('/admin/external-services')}>
                <i className="fas fa-plug mr-3 text-lg"></i>
                <span>Dış Servisler</span>
              </Button>
              <Button variant="ghost" className="w-full justify-start text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 !rounded-button whitespace-nowrap h-12 text-base" onClick={() => handleChangeActiveTab("icerik-yonetimi")}>
                <i className="fas fa-file-alt mr-3 text-lg"></i>
                <span>İçerik Yönetimi</span>
              </Button>
              <Button variant="ghost" className="w-full justify-start text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 !rounded-button whitespace-nowrap h-12 text-base" onClick={() => router.push('/admin/vocabulary')}>
                <i className="fas fa-language mr-3 text-lg"></i>
                <span>Kelime Yönetimi</span>
              </Button>
              <Button variant="ghost" className="w-full justify-start text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 !rounded-button whitespace-nowrap h-12 text-base" onClick={() => handleChangeActiveTab("analitik")}>
                <i className="fas fa-chart-line mr-3 text-lg"></i>
                <span>Analitik</span>
              </Button>
              <Button variant="ghost" className="w-full justify-start text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 !rounded-button whitespace-nowrap h-12 text-base" onClick={() => handleChangeActiveTab("maliyet-takibi")}>
                <i className="fas fa-coins mr-3 text-lg"></i>
                <span>Maliyet Takibi</span>
              </Button>
              <Button variant="ghost" className="w-full justify-start text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 !rounded-button whitespace-nowrap h-12 text-base" onClick={() => router.push('/admin/payment-providers')}>
                <i className="fas fa-credit-card mr-3 text-lg"></i>
                <span>Ödeme Sağlayıcıları</span>
              </Button>
              <Button variant="ghost" className="w-full justify-start text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 !rounded-button whitespace-nowrap h-12 text-base" onClick={() => router.push('/admin/books')}>
                <i className="fas fa-book mr-3 text-lg"></i>
                <span>Kitap Yönetimi</span>
              </Button>
              <Button variant="ghost" className="w-full justify-start text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 !rounded-button whitespace-nowrap h-12 text-base" onClick={() => router.push('/admin/card-transactions')}>
                <i className="fas fa-receipt mr-3 text-lg"></i>
                <span>Kredi Kartı İşlemleri</span>
              </Button>
              <Button variant="ghost" className="w-full justify-start text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 !rounded-button whitespace-nowrap h-12 text-base" onClick={() => router.push('/admin/notifications')}>
                <i className="fas fa-bell mr-3 text-lg"></i>
                <span>Bildirim Yönetimi</span>
              </Button>
              <Button variant="ghost" className="w-full justify-start text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 !rounded-button whitespace-nowrap h-12 text-base" onClick={() => handleChangeActiveTab("kampanya-yonetimi")}>
                <i className="fas fa-percentage mr-3 text-lg"></i>
                <span>Kampanya Yönetimi</span>
              </Button>
              <Button variant="ghost" className="w-full justify-start text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 !rounded-button whitespace-nowrap h-12 text-base" onClick={() => handleChangeActiveTab("destek")}>
                <i className="fas fa-headset mr-3 text-lg"></i>
                <span>Destek</span>
              </Button>
              <Button variant="ghost" className="w-full justify-start text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 !rounded-button whitespace-nowrap h-12 text-base" onClick={() => handleChangeActiveTab("test-ayarlari")}>
                <i className="fas fa-microphone-alt mr-3 text-lg"></i>
                <span>Test Ayarları</span>
              </Button>
              <Button variant="ghost" className="w-full justify-start text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 !rounded-button whitespace-nowrap h-12 text-base" onClick={() => handleChangeActiveTab("ayarlar")}>
                <i className="fas fa-cog mr-3 text-lg"></i>
                <span>Ayarlar</span>
              </Button>
              <Button variant="ghost" className="w-full justify-start text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 !rounded-button whitespace-nowrap h-12 text-base" onClick={() => router.push('/admin/tts-test')}>
                <i className="fas fa-volume-up mr-3 text-lg"></i>
                <span>TTS Test</span>
              </Button>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {activeTab === "kullanici-yonetimi" && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Kullanıcı Yönetimi</h2>
                <Button className="bg-indigo-600 hover:bg-indigo-700 !rounded-button whitespace-nowrap">
                  <i className="fas fa-plus mr-2"></i>
                  Yeni Kullanıcı Ekle
                </Button>
              </div>

              <div className="bg-white rounded-lg shadow-sm mb-6">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex flex-wrap gap-4 items-center">
                    <div className="relative flex-grow max-w-md">
                      <Input
                        type="text"
                        placeholder="Kullanıcı ara..."
                        className="pl-10 pr-4 py-2"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                    </div>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="px-3 py-2 pr-10 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-w-[140px] appearance-none"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0.75rem center',
                        backgroundSize: '1.25em 1.25em',
                        backgroundRepeat: 'no-repeat'
                      }}
                    >
                      <option value="tümü">Tüm Durumlar</option>
                      <option value="aktif">Aktif</option>
                      <option value="pasif">Pasif</option>
                      <option value="dondurulmuş">Dondurulmuş</option>
                    </select>
                    <Button variant="outline" className="!rounded-button whitespace-nowrap">
                      <i className="fas fa-filter mr-2"></i>
                      Gelişmiş Filtre
                    </Button>
                    <Button variant="outline" className="!rounded-button whitespace-nowrap">
                      <i className="fas fa-download mr-2"></i>
                      Dışa Aktar
                    </Button>
                    <Button
                      variant={hasSelection ? "destructive" : "outline"}
                      className={`!rounded-button whitespace-nowrap ${hasSelection ? '' : 'opacity-60 cursor-not-allowed'}`}
                      disabled={!hasSelection}
                      onClick={handleDeleteSelected}
                    >
                      <i className="fas fa-trash-alt mr-2"></i>
                      Seçileni Sil
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">
                          <Checkbox id="select-all" checked={allSelected} onChange={(e) => toggleSelectAll(e.currentTarget.checked)} />
                        </TableHead>
                        <TableHead>Kullanıcı</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead>Paket</TableHead>
                        <TableHead>Kayıt Tarihi</TableHead>
                        <TableHead>Son Giriş</TableHead>
                        <TableHead className="text-right">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <div className="flex items-center justify-center space-x-2">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                              <span>Kullanıcılar yükleniyor...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            Kullanıcı bulunamadı
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((user) => (
                          <TableRow key={user.id} className="hover:bg-gray-50">
                            <TableCell>
                              <Checkbox
                                id={`select-${user.id}`}
                                checked={selectedUserIds.has(user.id)}
                                onChange={(e) => toggleSelectOne(user.id, e.currentTarget.checked)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </TableCell>
                            <TableCell onClick={() => handleUserClick(user.id)} className="cursor-pointer">
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={`https://readdy.ai/api/search-image?query=professional%20portrait%20of%20a%20Turkish%20person%20with%20neutral%20expression%2C%20studio%20lighting%2C%20high%20quality%2C%20photorealistic&width=100&height=100&seq=${user.id}&orientation=squarish`} />
                                  <AvatarFallback>{user.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{user.name}</div>
                                  <div className="text-sm text-gray-500">{user.email}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                user.status === 'aktif' ? 'bg-green-100 text-green-800 hover:bg-green-100' :
                                  user.status === 'pasif' ? 'bg-gray-100 text-gray-800 hover:bg-gray-100' :
                                    'bg-amber-100 text-amber-800 hover:bg-amber-100'
                              }>
                                {user.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                user.package === 'Ücretsiz' ? 'bg-primary/10 text-primary hover:bg-primary/10' :
                                  user.package === 'Premium' ? 'bg-purple-100 text-purple-800 hover:bg-purple-100' :
                                    user.package === 'Pro' ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100' :
                                      'bg-teal-100 text-teal-800 hover:bg-teal-100'
                              }>
                                {user.package}
                              </Badge>
                            </TableCell>
                            <TableCell>{user.registrationDate}</TableCell>
                            <TableCell>{user.lastLogin}</TableCell>
                            <TableCell className="text-right">
                              <div className="inline-flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 !rounded-button"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteOne(user.id, user.email); }}
                                  title="Sil"
                                >
                                  <i className="fas fa-trash-alt text-red-600"></i>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Toplam 8 kullanıcıdan 1-8 arası gösteriliyor
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" disabled className="!rounded-button whitespace-nowrap">
                      <i className="fas fa-chevron-left mr-1"></i>
                      Önceki
                    </Button>
                    <Button variant="outline" size="sm" disabled className="!rounded-button whitespace-nowrap">
                      Sonraki
                      <i className="fas fa-chevron-right ml-1"></i>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "maliyet-takibi" && (
            <div className="p-6">
              <ApiCostDashboard token={token} />
            </div>
          )}

          {activeTab === "analitik" && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Analitik Dashboard</h2>
                <div className="flex items-center space-x-2">
                  <select defaultValue="son30gun" className="px-3 py-2 pr-10 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-w-[120px] appearance-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.75rem center',
                      backgroundSize: '1.25em 1.25em',
                      backgroundRepeat: 'no-repeat'
                    }}
                  >
                    <option value="bugun">Bugün</option>
                    <option value="buhafta">Bu Hafta</option>
                    <option value="son30gun">Son 30 Gün</option>
                    <option value="bu3ay">Bu 3 Ay</option>
                    <option value="buyil">Bu Yıl</option>
                    <option value="tumzamanlar">Tüm Zamanlar</option>
                  </select>
                  <Button variant="outline" className="!rounded-button whitespace-nowrap">
                    <i className="fas fa-download mr-2"></i>
                    Rapor İndir
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Toplam Kullanıcı</p>
                        <h3 className="text-3xl font-bold mt-1">3,163</h3>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <i className="fas fa-users text-primary"></i>
                      </div>
                    </div>
                    <div className="flex items-center mt-4 text-sm">
                      <span className="text-green-600 flex items-center">
                        <i className="fas fa-arrow-up mr-1"></i>
                        12.5%
                      </span>
                      <span className="text-gray-500 ml-2">geçen aya göre</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Aylık Gelir</p>
                        <h3 className="text-3xl font-bold mt-1">₺246,580</h3>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <i className="fas fa-chart-line text-green-600"></i>
                      </div>
                    </div>
                    <div className="flex items-center mt-4 text-sm">
                      <span className="text-green-600 flex items-center">
                        <i className="fas fa-arrow-up mr-1"></i>
                        8.2%
                      </span>
                      <span className="text-gray-500 ml-2">geçen aya göre</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Ortalama Kullanım</p>
                        <h3 className="text-3xl font-bold mt-1">24.5 dk</h3>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <i className="fas fa-clock text-purple-600"></i>
                      </div>
                    </div>
                    <div className="flex items-center mt-4 text-sm">
                      <span className="text-green-600 flex items-center">
                        <i className="fas fa-arrow-up mr-1"></i>
                        3.1%
                      </span>
                      <span className="text-gray-500 ml-2">geçen aya göre</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-500">İçerik Tamamlama</p>
                        <h3 className="text-3xl font-bold mt-1">76.8%</h3>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <i className="fas fa-check-circle text-amber-600"></i>
                      </div>
                    </div>
                    <div className="flex items-center mt-4 text-sm">
                      <span className="text-red-600 flex items-center">
                        <i className="fas fa-arrow-down mr-1"></i>
                        1.8%
                      </span>
                      <span className="text-gray-500 ml-2">geçen aya göre</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Paket Dağılımı</CardTitle>
                    <CardDescription>Kullanıcıların paket tercihlerinin dağılımı</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div id="package-distribution-chart" className="h-80"></div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Ortalama Kullanım Süresi</CardTitle>
                    <CardDescription>Paket bazlı ortalama kullanım süresi (ay)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div id="usage-duration-chart" className="h-80"></div>
                  </CardContent>
                </Card>
              </div>

              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Seviye Tercih Dağılımı</CardTitle>
                  <CardDescription>Paket bazlı seviye tercihleri ısı haritası</CardDescription>
                </CardHeader>
                <CardContent>
                  <div id="level-preference-chart" className="h-80"></div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "paket-yonetimi" && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Paket Yönetimi</h2>
                <Button className="bg-indigo-600 hover:bg-indigo-700 !rounded-button whitespace-nowrap" onClick={openCreatePlan}>
                  <i className="fas fa-plus mr-2"></i>
                  Yeni Paket Oluştur
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {plansLoading && (
                  <div className="col-span-full text-center py-8 text-gray-500">Planlar yükleniyor...</div>
                )}
                {plansError && (
                  <div className="col-span-full text-center py-8 text-red-500">{plansError}</div>
                )}
                {!plansLoading && !plansError && plans?.length === 0 && (
                  <div className="col-span-full text-center py-8 text-gray-500">Plan bulunamadı</div>
                )}
                {plans?.map((pkg) => (
                  <Card key={pkg.id} className="overflow-hidden">
                    <CardHeader className={
                      (pkg.name === 'Ücretsiz' || pkg.is_trial) ? 'bg-primary/5 border-b border-primary/20' :
                        (pkg.name || '').toLowerCase().includes('premium') ? 'bg-purple-50 border-b border-purple-100' :
                          (pkg.name || '').toLowerCase().includes('pro') ? 'bg-indigo-50 border-b border-indigo-100' :
                            'bg-teal-50 border-b border-teal-100'
                    }>
                      <div className="flex items-center justify-between mb-2">
                        <CardTitle className={
                          (pkg.name === 'Ücretsiz' || pkg.is_trial) ? 'text-primary' :
                            (pkg.name || '').toLowerCase().includes('premium') ? 'text-purple-700' :
                              (pkg.name || '').toLowerCase().includes('pro') ? 'text-indigo-700' :
                                'text-teal-700'
                        }>{pkg.name}</CardTitle>
                        <div className="flex items-center gap-2">
                          {pkg.apple_product_id && (
                            <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                              <i className="fab fa-apple mr-1"></i>
                              iOS
                            </Badge>
                          )}
                          <Badge className={pkg.is_active ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-gray-100 text-gray-800 hover:bg-gray-100'}>
                            {pkg.is_active ? 'Aktif' : 'Pasif'}
                          </Badge>
                        </div>
                      </div>
                      <CardDescription>{pkg.description || '—'}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold mb-4">
                        {typeof pkg.price === 'number' ? `₺${pkg.price}` : (pkg.price || '—')}
                        <span className="text-sm font-normal text-gray-500 ml-1">{pkg.interval === 'yearly' ? '/yıl' : '/ay'}</span>
                      </div>
                      <div className="space-y-2">
                        {Array.isArray(pkg.features) && pkg.features.length > 0 ? (
                          pkg.features.map((feature: string, index: number) => (
                            <div key={index} className="flex items-start">
                              <i className="fas fa-check text-green-500 mt-1 mr-2"></i>
                              <span>{feature}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-gray-500">Özellik bilgisi yok</div>
                        )}
                      </div>
                      <div className="mt-6 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-500">Aktif Kullanıcılar</span>
                          <span className="font-medium">—</span>
                        </div>
                        <Progress value={0} className="h-2" />
                        {pkg.estimates && (
                          <div className="mt-3 text-xs text-gray-600">
                            <div>Bu paketle tahmini video: <span className="font-medium">{pkg.estimates.video_minutes ?? '—'}</span> dk</div>
                            <div>Bu paketle tahmini metin: <span className="font-medium">{pkg.estimates.text_pages ?? '—'}</span> sayfa</div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t border-gray-100 pt-4">
                      <Button variant="outline" className="!rounded-button whitespace-nowrap" onClick={() => openEditPlan(pkg)}>
                        <i className="fas fa-edit mr-2"></i>
                        Düzenle
                      </Button>
                      <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50 !rounded-button whitespace-nowrap" onClick={async () => {
                        if (!confirm('Planı pasif hale getirmek istiyor musunuz?')) return;
                        try {
                          const token = typeof window !== 'undefined' ? localStorage.getItem('lingroot_token') : null;
                          const res = await fetch(`/api/admin/plans/${pkg.id}/deactivate`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token || ''}`, 'Content-Type': 'application/json' }
                          });
                          const json = await res.json();
                          if (!res.ok || !json?.success) throw new Error(json?.message || 'Plan pasif edilemedi');
                          fetchPlans();
                        } catch (e: any) {
                          alert(e?.message || 'Plan pasif edilemedi');
                        }
                      }}>
                        <i className="fas fa-trash-alt mr-2"></i>
                        Sil
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>

              <div className="bg-white rounded-lg shadow-sm mb-6">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium">Kampanya Yönetimi</h3>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kupon Kodu</TableHead>
                        <TableHead>İndirim</TableHead>
                        <TableHead>Geçerlilik</TableHead>
                        <TableHead>Kullanım</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead className="text-right">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {coupons.map((coupon) => (
                        <TableRow key={coupon.id}>
                          <TableCell className="font-medium">{coupon.code}</TableCell>
                          <TableCell>{coupon.discount}</TableCell>
                          <TableCell>{coupon.validUntil}</TableCell>
                          <TableCell>{coupon.usageCount} / {coupon.maxUsage}</TableCell>
                          <TableCell>
                            <Badge className={coupon.status === 'aktif' ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-gray-100 text-gray-800 hover:bg-gray-100'}>
                              {coupon.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 !rounded-button">
                              <i className="fas fa-ellipsis-v text-gray-500"></i>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="p-4 border-t border-gray-200">
                  <Button className="!rounded-button whitespace-nowrap">
                    <i className="fas fa-plus mr-2"></i>
                    Yeni Kupon Oluştur
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Paket Bilgilerim içerik alanı kaldırıldı */}

          {activeTab === "icerik-yonetimi" && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">İçerik Yönetimi</h2>
                <div className="flex space-x-2">
                  <Button variant="outline" className="!rounded-button whitespace-nowrap">
                    <i className="fas fa-filter mr-2"></i>
                    Filtrele
                  </Button>
                  <Button className="bg-indigo-600 hover:bg-indigo-700 !rounded-button whitespace-nowrap">
                    <i className="fas fa-plus mr-2"></i>
                    Yeni İçerik
                  </Button>
                </div>
              </div>

              <Tabs defaultValue="tum-icerikler">
                <TabsList className="mb-6">
                  <TabsTrigger value="tum-icerikler">Tüm İçerikler</TabsTrigger>
                  <TabsTrigger value="podcast">Podcast</TabsTrigger>
                  <TabsTrigger value="video">Video</TabsTrigger>
                  <TabsTrigger value="makale">Makale</TabsTrigger>
                  <TabsTrigger value="quiz">Quiz</TabsTrigger>
                </TabsList>

                <TabsContent value="tum-icerikler">
                  <div className="bg-white rounded-lg shadow-sm">
                    <div className="p-4 border-b border-gray-200">
                      <div className="relative max-w-md">
                        <Input
                          type="text"
                          placeholder="İçerik ara..."
                          className="pl-10 pr-4 py-2"
                        />
                        <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">
                              <Checkbox id="select-all-content" />
                            </TableHead>
                            <TableHead>İçerik Adı</TableHead>
                            <TableHead>Tür</TableHead>
                            <TableHead>Seviye</TableHead>
                            <TableHead>Paket Erişimi</TableHead>
                            <TableHead>Görüntülenme</TableHead>
                            <TableHead>Durum</TableHead>
                            <TableHead className="text-right">İşlemler</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell>
                              <Checkbox id="select-content-1" />
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">Günlük Konuşma Kalıpları</div>
                              <div className="text-sm text-gray-500">Oluşturulma: 15.05.2025</div>
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-primary/10 text-primary hover:bg-primary/10">Podcast</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">A1</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-primary/10 text-primary hover:bg-primary/10">Ücretsiz</Badge>
                            </TableCell>
                            <TableCell>1,245</TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Yayında</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 !rounded-button">
                                <i className="fas fa-ellipsis-v text-gray-500"></i>
                              </Button>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>
                              <Checkbox id="select-content-2" />
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">İş Görüşmesi Teknikleri</div>
                              <div className="text-sm text-gray-500">Oluşturulma: 02.06.2025</div>
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Video</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">B2</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100">Premium</Badge>
                            </TableCell>
                            <TableCell>876</TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Yayında</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 !rounded-button">
                                <i className="fas fa-ellipsis-v text-gray-500"></i>
                              </Button>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>
                              <Checkbox id="select-content-3" />
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">Akademik Yazı Teknikleri</div>
                              <div className="text-sm text-gray-500">Oluşturulma: 28.05.2025</div>
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-100">Makale</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-red-100 text-red-800 hover:bg-red-100">C1</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Pro</Badge>
                            </TableCell>
                            <TableCell>542</TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Yayında</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 !rounded-button">
                                <i className="fas fa-ellipsis-v text-gray-500"></i>
                              </Button>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>
                              <Checkbox id="select-content-4" />
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">Deyimler ve Atasözleri</div>
                              <div className="text-sm text-gray-500">Oluşturulma: 10.05.2025</div>
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Quiz</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">B1</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100">Premium</Badge>
                            </TableCell>
                            <TableCell>1,128</TableCell>
                            <TableCell>
                              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Taslak</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 !rounded-button">
                                <i className="fas fa-ellipsis-v text-gray-500"></i>
                              </Button>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        Toplam 120 içerikten 1-4 arası gösteriliyor
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" disabled className="!rounded-button whitespace-nowrap">
                          <i className="fas fa-chevron-left mr-1"></i>
                          Önceki
                        </Button>
                        <Button variant="outline" size="sm" className="!rounded-button whitespace-nowrap">
                          Sonraki
                          <i className="fas fa-chevron-right ml-1"></i>
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="podcast">
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-medium mb-4">Podcast İçerikleri</h3>
                    <p className="text-gray-500">Bu bölümde podcast içeriklerini yönetebilirsiniz.</p>
                  </div>
                </TabsContent>

                <TabsContent value="video">
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-medium mb-4">Video İçerikleri</h3>
                    <p className="text-gray-500">Bu bölümde video içeriklerini yönetebilirsiniz.</p>
                  </div>
                </TabsContent>

                <TabsContent value="makale">
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-medium mb-4">Makale İçerikleri</h3>
                    <p className="text-gray-500">Bu bölümde makale içeriklerini yönetebilirsiniz.</p>
                  </div>
                </TabsContent>

                <TabsContent value="quiz">
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-lg font-medium mb-4">Quiz İçerikleri</h3>
                    <p className="text-gray-500">Bu bölümde quiz içeriklerini yönetebilirsiniz.</p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {activeTab === "kampanya-yonetimi" && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Kampanya Yönetimi</h2>
                <Button className="bg-indigo-600 hover:bg-indigo-700 !rounded-button whitespace-nowrap">
                  <i className="fas fa-plus mr-2"></i>
                  Yeni Kampanya
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Aktif Kampanyalar</CardTitle>
                      <CardDescription>Şu anda aktif olan tüm kampanyalar</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Kampanya Adı</TableHead>
                            <TableHead>İndirim</TableHead>
                            <TableHead>Başlangıç</TableHead>
                            <TableHead>Bitiş</TableHead>
                            <TableHead>Durum</TableHead>
                            <TableHead className="text-right">İşlemler</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">Yaz Kampanyası</TableCell>
                            <TableCell>%25</TableCell>
                            <TableCell>01.06.2025</TableCell>
                            <TableCell>31.08.2025</TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Aktif</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 !rounded-button">
                                <i className="fas fa-ellipsis-v text-gray-500"></i>
                              </Button>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Hoş Geldin İndirimi</TableCell>
                            <TableCell>%50 ilk ay</TableCell>
                            <TableCell>01.01.2025</TableCell>
                            <TableCell>31.12.2025</TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Aktif</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 !rounded-button">
                                <i className="fas fa-ellipsis-v text-gray-500"></i>
                              </Button>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Black Friday</TableCell>
                            <TableCell>%40</TableCell>
                            <TableCell>25.11.2025</TableCell>
                            <TableCell>30.11.2025</TableCell>
                            <TableCell>
                              <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Planlandı</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 !rounded-button">
                                <i className="fas fa-ellipsis-v text-gray-500"></i>
                              </Button>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Hızlı Kupon Oluştur</CardTitle>
                      <CardDescription>Tek seferlik kupon kodu oluştur</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="coupon-code">Kupon Kodu</Label>
                          <Input id="coupon-code" placeholder="Örn: YAZ2025" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="discount-type">İndirim Türü</Label>
                          <select id="discount-type" className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none" defaultValue="percentage"
                            style={{
                              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                              backgroundPosition: 'right 0.75rem center',
                              backgroundSize: '1.25em 1.25em',
                              backgroundRepeat: 'no-repeat'
                            }}
                          >
                            <option value="percentage">Yüzde İndirim (%)</option>
                            <option value="fixed">Sabit İndirim (TL)</option>
                            <option value="free-month">Ücretsiz Ay</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="discount-amount">İndirim Miktarı</Label>
                          <Input id="discount-amount" type="number" placeholder="25" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="expiry-date">Son Kullanma Tarihi</Label>
                          <div className="border rounded-md p-3">
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={setSelectedDate}
                              className="rounded-md border"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="max-usage">Maksimum Kullanım</Label>
                          <Input id="max-usage" type="number" placeholder="1000" />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch id="active-status" />
                          <Label htmlFor="active-status">Aktif</Label>
                        </div>
                        <Button className="w-full !rounded-button whitespace-nowrap">Kupon Oluştur</Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {activeTab === "destek" && (
            <div className="p-6">
              <div className="bg-white rounded-lg shadow-sm mb-4 p-4 border border-gray-200">
                <div className="flex flex-wrap gap-4 items-center">
                  <div ref={statusDropdownRef} className="relative flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Durum:</span>
                    <button
                      type="button"
                      onClick={() => setIsStatusDropdownOpen((prev) => !prev)}
                      className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 min-w-[180px]"
                    >
                      <span>{statusButtonLabel}</span>
                      <i className="fas fa-chevron-down text-xs text-gray-500"></i>
                    </button>
                    {isStatusDropdownOpen && (
                      <div className="absolute left-0 top-full mt-1 w-60 rounded-md border bg-white shadow-lg z-50">
                        <div className="px-3 py-2 text-xs font-semibold text-gray-500">
                          Durum filtresi
                        </div>
                        <button
                          type="button"
                          onClick={() => clearStatusFilter()}
                          className="flex w-full items-center px-3 py-1.5 text-sm text-left hover:bg-gray-50"
                        >
                          <span className="mr-2 inline-flex h-3.5 w-3.5 items-center justify-center">
                            {conversationFilter.status.length === 0 && (
                              <span className="h-3 w-3 rounded-sm bg-indigo-500 text-white text-[10px] flex items-center justify-center">
                                ✓
                              </span>
                            )}
                          </span>
                          Tümü
                        </button>
                        <div className="my-1 border-t border-gray-200" />
                        {statusFilterOptions.map((opt) => {
                          const selected = isStatusSelected(opt.value);
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => toggleStatusFilter(opt.value)}
                              className="flex w-full items-center px-3 py-1.5 text-sm text-left hover:bg-gray-50"
                            >
                              <span className="mr-2 inline-flex h-3.5 w-3.5 items-center justify-center">
                                {selected && (
                                  <span className="h-3 w-3 rounded-sm bg-indigo-500 text-white text-[10px] flex items-center justify-center">
                                    ✓
                                  </span>
                                )}
                              </span>
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Öncelik:</span>
                    <select
                      value={conversationFilter.priority}
                      onChange={(e) => setConversationFilter({ ...conversationFilter, priority: e.target.value })}
                      className="px-3 py-2 pr-10 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-w-[160px] appearance-none"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0.75rem center',
                        backgroundSize: '1.25em 1.25em',
                        backgroundRepeat: 'no-repeat'
                      }}
                    >
                      <option value="all">Tüm Öncelikler</option>
                      <option value="low">Düşük</option>
                      <option value="medium">Orta</option>
                      <option value="high">Yüksek</option>
                      <option value="urgent">Acil</option>
                    </select>
                  </div>
                </div>
              </div>

              <AdminChatInterface
                conversationFilter={conversationFilter}
                setConversationFilter={setConversationFilter}
              />
            </div>
          )}

          {activeTab === "test-ayarlari" && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">🎙️ Test Ayarları</h2>
                <p className="text-gray-600">TTS (Text-to-Speech) sağlayıcı ayarlarını yönetin</p>
              </div>
              <TtsProviderSelector />

              <div className="mt-8">
                <EnvironmentSelector />
              </div>

              <div className="mt-8">
                <PaymentEnvironmentSelector />
              </div>
            </div>
          )}

          {activeTab === "ayarlar" && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Sistem Ayarları</h2>
                <Button className="bg-indigo-600 hover:bg-indigo-700 !rounded-button whitespace-nowrap">
                  <i className="fas fa-save mr-2"></i>
                  Değişiklikleri Kaydet
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-3">
                  <h3 className="text-lg font-medium mb-4">TTS Sağlayıcı Ayarları</h3>
                  <TtsProviderSelector />
                </div>

                <div className="lg:col-span-1">
                  <Card>
                    <CardHeader>
                      <CardTitle>Genel Ayarlar</CardTitle>
                      <CardDescription>Temel sistem ayarlarını yapılandırın</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="site-name">Site Adı</Label>
                        <Input id="site-name" defaultValue="Dil Öğrenme Platformu" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="site-url">Site URL</Label>
                        <Input id="site-url" defaultValue="https://dilogrenme.com" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="admin-email">Yönetici E-posta</Label>
                        <Input id="admin-email" defaultValue="admin@dilogrenme.com" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="timezone">Saat Dilimi</Label>
                        <select id="timezone" className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none" defaultValue="europe-istanbul"
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                            backgroundPosition: 'right 0.75rem center',
                            backgroundSize: '1.25em 1.25em',
                            backgroundRepeat: 'no-repeat'
                          }}
                        >
                          <option value="europe-istanbul">Europe/Istanbul (GMT+3)</option>
                          <option value="europe-london">Europe/London (GMT+0)</option>
                          <option value="america-newyork">America/New_York (GMT-5)</option>
                          <option value="asia-tokyo">Asia/Tokyo (GMT+9)</option>
                        </select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="maintenance-mode" />
                        <Label htmlFor="maintenance-mode">Bakım Modu</Label>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:col-span-1">
                  <Card>
                    <CardHeader>
                      <CardTitle>Bildirim Ayarları</CardTitle>
                      <CardDescription>E-posta ve sistem bildirimlerini yapılandırın</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>E-posta Bildirimleri</Label>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox id="email-new-user" defaultChecked />
                            <Label htmlFor="email-new-user">Yeni kullanıcı kaydı</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="email-subscription" defaultChecked />
                            <Label htmlFor="email-subscription">Abonelik değişiklikleri</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="email-payment" defaultChecked />
                            <Label htmlFor="email-payment">Ödeme bildirimleri</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="email-support" defaultChecked />
                            <Label htmlFor="email-support">Destek talepleri</Label>
                          </div>
                        </div>
                      </div>
                      <Separator />
                      <div className="space-y-2">
                        <Label>Sistem Bildirimleri</Label>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox id="system-content" defaultChecked />
                            <Label htmlFor="system-content">Yeni içerik ekleme</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="system-user-report" defaultChecked />
                            <Label htmlFor="system-user-report">Kullanıcı raporları</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="system-error" defaultChecked />
                            <Label htmlFor="system-error">Sistem hataları</Label>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:col-span-1">
                  <Card>
                    <CardHeader>
                      <CardTitle>Ödeme Ayarları</CardTitle>
                      <CardDescription>Ödeme geçitleri ve para birimi ayarları</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="currency">Para Birimi</Label>
                        <select id="currency" className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none" defaultValue="try"
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                            backgroundPosition: 'right 0.75rem center',
                            backgroundSize: '1.25em 1.25em',
                            backgroundRepeat: 'no-repeat'
                          }}
                        >
                          <option value="try">Türk Lirası (₺)</option>
                          <option value="usd">ABD Doları ($)</option>
                          <option value="eur">Euro (€)</option>
                          <option value="gbp">İngiliz Sterlini (£)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Ödeme Geçitleri</Label>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox id="payment-creditcard" defaultChecked />
                            <Label htmlFor="payment-creditcard">Kredi Kartı</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="payment-paypal" defaultChecked />
                            <Label htmlFor="payment-paypal">PayPal</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="payment-banktransfer" />
                            <Label htmlFor="payment-banktransfer">Banka Havalesi</Label>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="invoice-prefix">Fatura Öneki</Label>
                        <Input id="invoice-prefix" defaultValue="INV-" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="test-mode" />
                        <Label htmlFor="test-mode">Test Modu</Label>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <Dialog open={showPackageForm} onOpenChange={setShowPackageForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Paketi Düzenle' : 'Yeni Paket Oluştur'}</DialogTitle>
            <DialogDescription>Paket detaylarını girin</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Ad</Label>
              <Input
                value={planForm.name}
                onChange={(e) => {
                  const newName = e.target.value;
                  // İsim ve fiyat varsa açıklama ve özellikleri otomatik oluştur
                  if (newName && planForm.price) {
                    const details = generatePlanDetails(Number(planForm.price), newName);
                    setPlanForm({ ...planForm, name: newName, description: details.description, features: details.features });
                  } else {
                    setPlanForm({ ...planForm, name: newName });
                  }
                }}
              />
            </div>
            <div>
              <Label>Açıklama</Label>
              <Textarea value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} placeholder="Fiyat ve paket adı girildiğinde otomatik oluşturulur" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Fiyat (₺)</Label>
                <Input
                  type="number"
                  value={planForm.price}
                  onChange={(e) => {
                    const newPrice = e.target.value;
                    // Fiyat ve isim varsa açıklama ve özellikleri otomatik oluştur
                    if (newPrice && planForm.name) {
                      const details = generatePlanDetails(Number(newPrice), planForm.name);
                      setPlanForm({ ...planForm, price: newPrice, description: details.description, features: details.features });
                    } else {
                      setPlanForm({ ...planForm, price: newPrice });
                    }
                  }}
                />
              </div>
              <div>
                <Label>Dönem</Label>
                <select className="w-full border rounded-md px-3 py-2" value={planForm.interval} onChange={(e) => setPlanForm({ ...planForm, interval: e.target.value })}>
                  <option value="monthly">Aylık</option>
                  <option value="yearly">Yıllık</option>
                </select>
              </div>
              <div className="flex items-center gap-2 mt-6 md:mt-0">
                <Checkbox id="is-active" checked={!!planForm.is_active} onChange={(e) => setPlanForm({ ...planForm, is_active: e.currentTarget.checked })} />
                <Label htmlFor="is-active">Aktif</Label>
              </div>
            </div>
            <div>
              <Label>Apple Product ID (iOS)</Label>
              <Input
                value={planForm.apple_product_id}
                onChange={(e) => setPlanForm({ ...planForm, apple_product_id: e.target.value })}
                placeholder="com.lingroot.premium.monthly"
              />
              <p className="text-xs text-gray-500 mt-1">iOS için: com.lingroot.premium.monthly</p>
            </div>
            <div>
              <Label>Google Play Product ID (Android)</Label>
              <Input
                value={planForm.google_product_id}
                onChange={(e) => setPlanForm({ ...planForm, google_product_id: e.target.value })}
                placeholder="com.nsyzk.lingrootmobile.gold.monthly"
              />
              <p className="text-xs text-gray-500 mt-1">Android için: com.nsyzk.lingrootmobile.gold.monthly</p>
            </div>
            <div>
              <Label>Özellikler (virgülle ayırın)</Label>
              <Input value={planForm.features} onChange={(e) => setPlanForm({ ...planForm, features: e.target.value })} placeholder="Örn: Tüm seviyelere erişim, Ayda 30 içerik" />
            </div>
            {/* Limit alanları kaldırıldı: Aylık USD, OpenAI token, TTS karakter */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Checkbox id="is-trial" checked={!!planForm.is_trial} onChange={(e) => setPlanForm({ ...planForm, is_trial: e.currentTarget.checked })} />
                <Label htmlFor="is-trial">Ücretsiz Deneme</Label>
              </div>
              <div>
                <Label>Deneme Süresi (gün)</Label>
                <Input type="number" value={planForm.trial_days} onChange={(e) => setPlanForm({ ...planForm, trial_days: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowPackageForm(false); setEditingPlan(null); }}>İptal</Button>
            <Button onClick={async () => { try { await savePlan(); } catch (e: any) { alert(e?.message || 'Kaydedilemedi'); } }}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default App;

