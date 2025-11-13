'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useAuth } from '../src/lib/auth';
import { useMembership } from '../src/context/MembershipContext';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FaUserEdit, FaVolumeUp, FaBook, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { MessageSquare } from 'lucide-react';
import { processTts, submitContent, getContentHistory, getUserInterests, getTopicDetailSuggestions, rewriteToNarration, ProcessInputData, getUsageSummary, createPodcast, PodcastCreationParams } from '../src/lib/api';
import PlanRequired from '../src/components/PlanRequired';
import { useTranslation } from '../src/lib/i18n';
import InputSection from '../src/components/InputSection';
import OutputSection from '../src/components/OutputSection';
import Footer from '../src/components/Footer';
import { Button } from "../src/components/ui/button";
import { Input } from "../src/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../src/components/ui/tabs";
import { Slider } from "../src/components/ui/slider";
import { Card, CardContent } from "../src/components/ui/card";
import { Badge } from "../src/components/ui/badge";

interface InputData {
  type: ProcessInputData['type'];
  text?: string;
  input?: string;
  file?: File;
  level: string;
  SesHızı?: number;
  voice?: string;
  chapter?: string;
}

interface ContentTypeOption {
  id: string;
  name: string;
  icon: string;
}

interface AudioResult {
  success?: boolean;
  message: string;
  mp3_url: string;
  vtt_url: string;
  level: string;
  timepoints?: any[];
  words?: string[];
  speaking_rate?: number;
  original_turkish?: string;
  duration_seconds?: string;
  file_name?: string;
  topic?: string;
}

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
}

interface Book {
  id: string;
  title: string;
  author: string;
  description?: string;
  cover_image?: string;
  language: string;
  genre?: string;
  publication_year?: number;
  total_chapters: number;
  text_url?: string;
}

interface Chapter {
  id: string;
  book_id: string;
  chapter_index: number;
  chapter_title: string;
  chapter_text: string;
  created_at: string;
}

interface BookSearchResult {
  books: Book[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

interface ExistingAudio {
  id: string;
  chapter_id: string;
  voice_model: string;
  speaking_rate: number;
  level: string;
  mp3_url: string;
  vtt_url?: string;
  created_at: string;
}

const Welcome: React.FC = () => {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { badge, dailyLimit, remaining, currentPlanName } = useMembership();
  const { t } = useTranslation();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [audioResult, setAudioResult] = useState<AudioResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPlanRequired, setShowPlanRequired] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  
  // Welcome guard: Eğer middleware çerezleri varsa (suppressWelcome/postLoginTarget), hemen hedefe yönlendir
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const cookies = document.cookie || '';
      const hasFlag = /(?:^|; )suppressWelcome=1/.test(cookies);
      const targetMatch = /(?:^|; )postLoginTarget=([^;]+)/.exec(cookies);
      if (hasFlag) {
        const raw = targetMatch ? targetMatch[1] : '';
        let target = raw ? (() => { try { return decodeURIComponent(raw); } catch { return raw; } })() : '/dashboard';
        if (!target || !target.trim() || target === '/welcome') target = '/dashboard';
        // Çerezleri hemen temizle
        document.cookie = 'postLoginTarget=; Path=/; Max-Age=0';
        document.cookie = 'suppressWelcome=; Path=/; Max-Age=0';
        // Yönlendir
        router.replace(target.startsWith('/') ? target : '/dashboard');
      }
    } catch {}
  }, [router]);

  // Yeni tasarım için state'ler - Default to Emma
  const [contentType, setContentType] = useState<string>('text');
  const [englishLevel, setEnglishLevel] = useState<string>('a1');
  const [speakingRate, setSpeakingRate] = useState<number>(0.8);
  const [voiceType, setVoiceType] = useState<string>('Emma');
  const [savedDefaultVoice, setSavedDefaultVoice] = useState<string | null>(null);
  const [defaultApplied, setDefaultApplied] = useState<boolean>(false);
  const [accentType, setAccentType] = useState<string>('american');
  const [emotionType, setEmotionType] = useState<string>('all');
  const [outputFormat, setOutputFormat] = useState<string>('mp3');
  const [textInput, setTextInput] = useState<string>('');
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const [contentHistory, setContentHistory] = useState<ContentHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [showAllHistory, setShowAllHistory] = useState<boolean>(false);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [loadingInterests, setLoadingInterests] = useState<boolean>(false);
  const [selectedInterest, setSelectedInterest] = useState<string>('');
  const [topicDetailSuggestions, setTopicDetailSuggestions] = useState<string[]>([]);
  const [isLoadingTopicSuggestions, setIsLoadingTopicSuggestions] = useState<boolean>(false);
  const [selectedDetailTopic, setSelectedDetailTopic] = useState<string>('');
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);
  const [loadingVoices, setLoadingVoices] = useState<boolean>(false);
  const [selectedVoiceCategory, setSelectedVoiceCategory] = useState<string>('neural');
  const [selectedGender, setSelectedGender] = useState<string>('female');
  const [selectedAccent, setSelectedAccent] = useState<string>('american');
  const [ttsProvider, setTtsProvider] = useState<string>('amazon'); // TTS provider from settings
  // YouTube altyazı çekme state'leri
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [isFetchingSubtitle, setIsFetchingSubtitle] = useState<boolean>(false);
  const [subtitleError, setSubtitleError] = useState<string | null>(null);
  
  // Podcast state'leri
  const [podcastTopic, setPodcastTopic] = useState<string>('');
  const [podcastDuration, setPodcastDuration] = useState<number>(3);
  const [podcastStyleType, setPodcastStyleType] = useState<string>('friendly_chat');
  const [podcastVoiceChoice, setPodcastVoiceChoice] = useState<string>('english_female');
  const [podcastPersonalityA, setPodcastPersonalityA] = useState<string>('curious_enthusiast');
  const [podcastPersonalityB, setPodcastPersonalityB] = useState<string>('knowledgeable_friend');
  const [podcastIncludeHumor, setPodcastIncludeHumor] = useState<boolean>(true);
  const [podcastIncludeFiller, setPodcastIncludeFiller] = useState<boolean>(true);
  const [isCreatingPodcast, setIsCreatingPodcast] = useState<boolean>(false);
  const [podcastError, setPodcastError] = useState<string | null>(null);
  
  // Kitap arama ve seçim state'leri
  const [bookSearchQuery, setBookSearchQuery] = useState<string>('');
  const [bookTitleSearch, setBookTitleSearch] = useState<string>('');
  const [bookAuthorSearch, setBookAuthorSearch] = useState<string>('');
  const [bookSearchResults, setBookSearchResults] = useState<BookSearchResult | null>(null);
  const [isSearchingBooks, setIsSearchingBooks] = useState<boolean>(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [bookChapters, setBookChapters] = useState<Chapter[]>([]);
  const [isLoadingChapters, setIsLoadingChapters] = useState<boolean>(false);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [existingAudio, setExistingAudio] = useState<ExistingAudio | null>(null);
  const [isCheckingExistingAudio, setIsCheckingExistingAudio] = useState<boolean>(false);
  
  // Content history expanded view state
  const [expandedHistoryItem, setExpandedHistoryItem] = useState<string | null>(null);
  
  // İçerik türü seçenekleri
  const contentTypeOptions: ContentTypeOption[] = [
    { id: 'text', name: 'Metin', icon: 'fas fa-file-alt' },
    { id: 'topic', name: 'Hobi', icon: 'fas fa-lightbulb' },
    { id: 'subject', name: 'Konu', icon: 'fas fa-graduation-cap' },
    { id: 'youtube', name: 'YouTube', icon: 'fab fa-youtube' },
    { id: 'weblink', name: 'Web Bağlantısı', icon: 'fas fa-link' },
    { id: 'document', name: 'Doküman', icon: 'fas fa-file-word' },
    { id: 'podcast', name: 'Podcast', icon: 'fas fa-podcast' },
    { id: 'book', name: 'Kitap', icon: 'fas fa-book' },
    { id: 'custom', name: 'Öneriler', icon: 'fas fa-plus' },
    { id: 'hashtag', name: 'Etiket', icon: 'fas fa-hashtag' },
  ];
  
  const levelOptions = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const rateOptions = [
    { value: 0.7, label: '0.7x' },
    { value: 0.8, label: '0.8x' },
    { value: 1.0, label: '1x' },
    { value: 1.2, label: '1.2x' },
  ];
  const accentOptions = [
    { value: 'all', label: 'Tümü' },
    { value: 'american', label: 'Amerikan' },
    { value: 'british', label: 'İngiliz' },
    { value: 'australian', label: 'Avustralya' },
    { value: 'canadian', label: 'Kanada' },
    { value: 'indian', label: 'Hindistan' },
    { value: 'international', label: 'Uluslararası' }
  ];
  
  const emotionOptions = [
    { value: 'all', label: 'Tümü' },
    { value: 'neutral', label: 'Nötr' },
    { value: 'cheerful', label: 'Neşeli' },
    { value: 'serious', label: 'Ciddi' },
    { value: 'professional', label: 'Profesyonel' },
    { value: 'excited', label: 'Heyecanlı' },
    { value: 'calm', label: 'Sakin' },
    { value: 'friendly', label: 'Samimi' }
  ];
  const formatOptions = ['MP3', 'WAV', 'AAC', 'FLAC', 'OGG'];

  // Ses kategorileri - TTS provider'a göre dinamik
  const voiceCategories = ttsProvider === 'google' 
    ? [
        { value: 'standard', label: 'Standart Sesler', icon: 'fas fa-volume-up', badge: 'Ücretsiz', ssmlSupport: false },
        { value: 'wavenet', label: 'WaveNet Sesleri', icon: 'fas fa-star', badge: 'Premium', ssmlSupport: true },
        { value: 'neural2', label: 'Neural2 Sesleri', icon: 'fas fa-brain', badge: 'Premium', ssmlSupport: true },
        { value: 'studio', label: 'Studio Sesleri', icon: 'fas fa-crown', badge: 'Platinium', ssmlSupport: true },
        { value: 'chirp3d', label: 'Chirp 3D', icon: 'fas fa-gem', badge: 'Gold', ssmlSupport: true }
      ]
    : [ // Amazon Polly categories
        { value: 'standard', label: 'Standard', icon: 'fas fa-volume-up', badge: 'Ücretsiz', ssmlSupport: false },
        { value: 'neural', label: 'Neural', icon: 'fas fa-star', badge: 'Premium', ssmlSupport: true }
      ];

  const detailedVoices = {
    wavenet: [
      { id: 'en-US-Wavenet-A', name: 'ABD İngilizcesi - Erkek A', accent: 'american', gender: 'male', category: 'wavenet', ssmlSupport: true },
      { id: 'en-US-Wavenet-F', name: 'ABD İngilizcesi - Kadın F', accent: 'american', gender: 'female', category: 'wavenet', ssmlSupport: true },
      { id: 'en-GB-Wavenet-B', name: 'İngiliz İngilizcesi - Erkek B', accent: 'british', gender: 'male', category: 'wavenet', ssmlSupport: true },
      { id: 'en-GB-Wavenet-C', name: 'İngiliz İngilizcesi - Kadın C', accent: 'british', gender: 'female', category: 'wavenet', ssmlSupport: true },
      { id: 'en-AU-Wavenet-A', name: 'Avustralya İngilizcesi - Kadın A', accent: 'australian', gender: 'female', category: 'wavenet', ssmlSupport: true },
      { id: 'en-AU-Wavenet-D', name: 'Avustralya İngilizcesi - Erkek D', accent: 'australian', gender: 'male', category: 'wavenet', ssmlSupport: true }
    ],
    neural2: [
      { id: 'en-US-Neural2-J', name: 'ABD İngilizcesi - Erkek J', accent: 'american', gender: 'male', category: 'neural2', ssmlSupport: true },
      { id: 'en-US-Neural2-H', name: 'ABD İngilizcesi - Kadın H', accent: 'american', gender: 'female', category: 'neural2', ssmlSupport: true },
      { id: 'en-GB-Neural2-B', name: 'İngiliz İngilizcesi - Erkek B', accent: 'british', gender: 'male', category: 'neural2', ssmlSupport: true },
      { id: 'en-GB-Neural2-C', name: 'İngiliz İngilizcesi - Kadın C', accent: 'british', gender: 'female', category: 'neural2', ssmlSupport: true },
      { id: 'en-AU-Neural2-A', name: 'Avustralya İngilizcesi - Kadın A', accent: 'australian', gender: 'female', category: 'neural2', ssmlSupport: true },
      { id: 'en-AU-Neural2-C', name: 'Avustralya İngilizcesi - Kadın C', accent: 'australian', gender: 'female', category: 'neural2', ssmlSupport: true },
      { id: 'en-AU-Neural2-D', name: 'Avustralya İngilizcesi - Erkek D', accent: 'australian', gender: 'male', category: 'neural2', ssmlSupport: true }
    ],
    studio: [
      { id: 'en-US-Studio-M', name: 'ABD İngilizcesi - Erkek M', accent: 'american', gender: 'male', category: 'studio', ssmlSupport: true },
      { id: 'en-US-Studio-Q', name: 'ABD İngilizcesi - Kadın Q', accent: 'american', gender: 'female', category: 'studio', ssmlSupport: true },
      { id: 'en-GB-Studio-B', name: 'İngiliz İngilizcesi - Erkek B', accent: 'british', gender: 'male', category: 'studio', ssmlSupport: true },
      { id: 'en-GB-Studio-C', name: 'İngiliz İngilizcesi - Kadın C', accent: 'british', gender: 'female', category: 'studio', ssmlSupport: true }
    ],
    chirp3d: [
      { id: 'en-US-Journey-D', name: 'ABD İngilizcesi - Kadın D', accent: 'american', gender: 'female', category: 'chirp3d', ssmlSupport: true },
      { id: 'en-US-Journey-O', name: 'ABD İngilizcesi - Erkek O', accent: 'american', gender: 'male', category: 'chirp3d', ssmlSupport: true },
      { id: 'en-GB-Journey-F', name: 'İngiliz İngilizcesi - Kadın F', accent: 'british', gender: 'female', category: 'chirp3d', ssmlSupport: true },
      { id: 'en-GB-Journey-M', name: 'İngiliz İngilizcesi - Erkek M', accent: 'british', gender: 'male', category: 'chirp3d', ssmlSupport: true }
    ],
    standard: [
      { id: 'en-US-Standard-B', name: 'ABD İngilizcesi - Erkek B', accent: 'american', gender: 'male', category: 'standard', ssmlSupport: false },
      { id: 'en-US-Standard-C', name: 'ABD İngilizcesi - Kadın C', accent: 'american', gender: 'female', category: 'standard', ssmlSupport: false },
      { id: 'en-US-Standard-D', name: 'ABD İngilizcesi - Erkek D', accent: 'american', gender: 'male', category: 'standard', ssmlSupport: false },
      { id: 'en-US-Standard-E', name: 'ABD İngilizcesi - Kadın E', accent: 'american', gender: 'female', category: 'standard', ssmlSupport: false },
      { id: 'en-GB-Standard-A', name: 'İngiliz İngilizcesi - Kadın A', accent: 'british', gender: 'female', category: 'standard', ssmlSupport: false },
      { id: 'en-GB-Standard-B', name: 'İngiliz İngilizcesi - Erkek B', accent: 'british', gender: 'male', category: 'standard', ssmlSupport: false },
      { id: 'en-GB-Standard-C', name: 'İngiliz İngilizcesi - Kadın C', accent: 'british', gender: 'female', category: 'standard', ssmlSupport: false },
      { id: 'en-GB-Standard-D', name: 'İngiliz İngilizcesi - Erkek D', accent: 'british', gender: 'male', category: 'standard', ssmlSupport: false },
      { id: 'en-AU-Standard-A', name: 'Avustralya İngilizcesi - Kadın A', accent: 'australian', gender: 'female', category: 'standard', ssmlSupport: false },
      { id: 'en-AU-Standard-B', name: 'Avustralya İngilizcesi - Erkek B', accent: 'australian', gender: 'male', category: 'standard', ssmlSupport: false },
      { id: 'en-AU-Standard-C', name: 'Avustralya İngilizcesi - Kadın C', accent: 'australian', gender: 'female', category: 'standard', ssmlSupport: false },
      { id: 'en-AU-Standard-D', name: 'Avustralya İngilizcesi - Erkek D', accent: 'australian', gender: 'male', category: 'standard', ssmlSupport: false }
    ]
  };

  // YouTube altyazı çekme
  const handleFetchYoutubeSubtitle = async () => {
    if (!youtubeUrl || !/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(youtubeUrl)) {
      setSubtitleError('Geçerli bir YouTube linki girin.');
      return;
    }
    setIsFetchingSubtitle(true);
    setSubtitleError(null);
    try {
      // CORS sorunlarını aşmak için yerel Next.js API proxy'sini kullan
      const endpoint = '/api/youtube-subtitle';
      console.log('🎬 [YOUTUBE] via local proxy:', endpoint, youtubeUrl);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl })
      });
      if (!res.ok) {
        let body: any = null;
        try { body = await res.json(); } catch { body = await res.text().catch(() => ''); }
        const noSubs = (body && (body?.errorCode === 'NO_SUBTITLES' || body?.detail?.error_code === 'NO_SUBTITLES'));
        if (noSubs) {
          throw new Error('Bu videoda altyazı bulunmamaktadır');
        }
        throw new Error(`API hatası: ${res.status} ${res.statusText}`);
      }
      const data: any = await res.json();
      if (data?.errorCode === 'NO_SUBTITLES' || data?.detail?.error_code === 'NO_SUBTITLES') {
        throw new Error('Bu videoda altyazı bulunmamaktadır');
      }
      const subtitleText = data?.text || '';
      if (!subtitleText || subtitleText.trim().length === 0) {
        throw new Error('Bu videoda altyazı bulunmamaktadır');
      }
      setTextInput(subtitleText);
      console.log('🎬 [YOUTUBE] Subtitles fetched. Length:', subtitleText.length);
    } catch (e: any) {
      console.error('❌ [YOUTUBE] Altyazı çekme hatası:', e);
      setSubtitleError(e?.message || 'Altyazı çekilemedi.');
    } finally {
      setIsFetchingSubtitle(false);
    }
  };

  // Podcast oluşturma fonksiyonu
  const handleCreatePodcast = async () => {
    if (!podcastTopic || podcastTopic.trim().length === 0) {
      setPodcastError('Lütfen bir podcast konusu girin.');
      return;
    }
    
    setIsCreatingPodcast(true);
    setPodcastError(null);
    
    try {
      // n8n webhook formatı: { topic, level, duration }
      const params: PodcastCreationParams = {
        topic: podcastTopic,
        level: englishLevel.toUpperCase(),
        duration: podcastDuration
      };
      
      console.log('🎙️ [PODCAST] Creating podcast with params:', params);
      const result = await createPodcast(params);
      
      if (result.success && result.podcast_url) {
        // Podcast başarıyla oluşturuldu
        // n8n'den gelen vtt_subtitles zaten Supabase URL'si
        const vttUrl = result.vtt_subtitles || '';
        const topic = result.data?.metadata?.topic || podcastTopic;
        
        setAudioResult({
          message: result.transcript || result.message || topic,
          mp3_url: result.podcast_url,
          vtt_url: vttUrl,
          level: englishLevel,
          duration_seconds: result.duration_seconds,
          file_name: result.file_name,
          topic: topic
        });
        console.log('🎙️ [PODCAST] Podcast created successfully:', {
          topic: topic,
          audio: result.podcast_url,
          vtt: vttUrl,
          duration: result.duration_seconds,
          level: englishLevel,
          costs: result.data?.metadata?.costs
        });
      } else {
        throw new Error(result.message || 'Podcast oluşturulamadı');
      }
    } catch (e: any) {
      console.error('❌ [PODCAST] Podcast oluşturma hatası:', e);
      setPodcastError(e?.message || 'Podcast oluşturulamadı.');
    } finally {
      setIsCreatingPodcast(false);
    }
  };

  const genderOptions = [
    { value: 'all', label: 'Tümü' },
    { value: 'male', label: 'Erkek' },
    { value: 'female', label: 'Kadın' }
  ];

  const accentVoiceOptions = [
    { value: 'all', label: 'Tümü' },
    { value: 'american', label: 'Amerikan' },
    { value: 'british', label: 'İngiliz' },
    { value: 'australian', label: 'Avustralya' }
  ];



  // Filtrelenmiş sesler için yardımcı fonksiyon
  const getFilteredVoices = () => {
    // Backend'den gelen sesler zaten filtrelenmiş olarak gelir
    // Bu fonksiyon sadece backend'den gelen sesleri gösterir
    if (availableVoices.length > 0) {
      console.log('🔍 Backend\'den filtrelenmiş sesler:', availableVoices.length);
      // Varsayılan sesi listenin başına taşı (listede varsa)
      if (savedDefaultVoice) {
        const voices = [...availableVoices];
        const idx = voices.findIndex((v: any) => (v.name || v.id) === savedDefaultVoice);
        if (idx > 0) {
          const [item] = voices.splice(idx, 1);
          voices.unshift(item);
          return voices;
        }
      }
      return availableVoices;
    } else {
      // Fallback: backend çalışmıyorsa hardcoded sesler (sadece geliştirme için)
      console.log('🔍 Fallback - hardcoded sesler kullanılıyor');
      const categoryVoices = detailedVoices[selectedVoiceCategory as keyof typeof detailedVoices] || [];
      
      const filtered = categoryVoices.filter(voice => {
        const genderMatch = selectedGender === 'all' || voice.gender === selectedGender;
        const accentMatch = selectedAccent === 'all' || voice.accent === selectedAccent;
        
        return genderMatch && accentMatch;
      });
      return filtered;
    }
  };

  // Seçili modelin kullanıcıya gösterilecek etiketini döndür
  const getSelectedVoiceLabel = () => {
    if (!voiceType) return '';
    try {
      const v: any = (availableVoices || []).find((x: any) => (x.name || x.id) === voiceType);
      const label = v?.displayName || (v?.name ? v.name.replace(/^[a-z]{2}-[A-Z]{2}-/, '') : '') || voiceType.replace(/^[a-z]{2}-[A-Z]{2}-/, '');
      return label;
    } catch {
      return '';
    }
  };

  // URL conversion fonksiyonu
  const convertToPlayableUrl = (url: string): string => {
    if (!url) return '';
    
    console.log("🔄 Converting URL:", url);
    
    try {
      // TTS audio URL'leri için /api prefix'i ekle
      if (url.startsWith('/tts/')) {
        url = `/api${url}`;
        console.log("✅ Added /api prefix to TTS URL:", url);
      }
      
      // API yolu kontrolü
      if (url.startsWith('/api/')) {
        // Development ortamında
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
          const finalUrl = `http://localhost:5001${url}`;
          console.log("🏠 Local development URL:", finalUrl);
          return finalUrl;
        }
        
        // Production ortamında
        if (typeof window !== 'undefined' && window.location.hostname.includes('lingroot.com')) {
          const finalUrl = `https://lingloops-backend.onrender.com${url}`;
          console.log("🌐 Production URL:", finalUrl);
          return finalUrl;
        }
        
        console.log("📍 Using relative path:", url);
        return url;
      }
      
      // Tam URL kontrolü
      if (url.startsWith('https://')) {
        console.log("🔗 Full HTTPS URL:", url);
        return url;
      }
      
      console.log("❓ Unknown URL format:", url);
      return url;
    } catch (error) {
      console.error("❌ URL dönüştürme hatası:", url, error);
      return url;
    }
  };

  // Kullanılabilir sesleri çeken fonksiyon
  const fetchAvailableVoices = async () => {
    setLoadingVoices(true);
    try {
      console.log('fetchAvailableVoices başlatılıyor...');
      
      // API endpoint'ini belirle
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:5001/api/tts/voices'
        : '/api/tts/voices';
      
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      console.log('Voices API response:', data);
      
      if (data.voices && Array.isArray(data.voices)) {
        setAvailableVoices(data.voices);
        console.log('Available voices set edildi:', data.voices.length, 'voice');
        
        // İlk sesi varsayılan olarak seç (eğer henüz seçilmemişse)
        if (!voiceType && data.voices.length > 0) {
          setVoiceType(data.voices[0].name);
          console.log('Varsayılan ses seçildi:', data.voices[0].name);
        }
      } else {
        console.log('API response voices array değil, boş array set ediliyor');
        setAvailableVoices([]);
      }
    } catch (error) {
      console.error('Sesler yüklenirken hata oluştu:', error);
      setAvailableVoices([]);
    } finally {
      setLoadingVoices(false);
    }
  };

  // Filtrelenmiş sesleri çeken fonksiyon
  const fetchFilteredVoices = async (accent?: string, emotion?: string, gender?: string, category?: string) => {
    setLoadingVoices(true);
    try {
      console.log('🎯 Filtrelenmiş sesler çekiliyor...', { accent, emotion, gender, category });
      
      // API endpoint'ini belirle
      const baseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:5001/api/tts/voices/filter'
        : '/api/tts/voices/filter';
      
      // Query parametrelerini oluştur
      const params = new URLSearchParams();
      if (accent && accent !== 'all') params.append('accent', accent);
      if (emotion && emotion !== 'all') params.append('emotion', emotion);
      if (gender && gender !== 'all') params.append('gender', gender);
      if (category && category !== 'all') params.append('category', category);
      
      const apiUrl = `${baseUrl}?${params.toString()}`;
      console.log('🔗 Filter API URL:', apiUrl);
      
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      console.log('🎯 Filtered Voices API response:', data);
      
      if (data.voices && Array.isArray(data.voices)) {
        let voices = data.voices as any[];

        // Web tarafı fallback: Wavenet + AU/CA/IN boş gelirse bir ses enjekte et
        if (voices.length === 0 && category === 'wavenet' && accent && ['australian','canadian','indian'].includes(accent)) {
          const map: Record<string, { male: string; female: string; lang: string } > = {
            australian: { male: 'en-AU-Wavenet-D', female: 'en-AU-Wavenet-A', lang: 'en-AU' },
            canadian:   { male: 'en-CA-Wavenet-D', female: 'en-CA-Wavenet-A', lang: 'en-CA' },
            indian:     { male: 'en-IN-Wavenet-D', female: 'en-IN-Wavenet-A', lang: 'en-IN' },
          };
          const cfg = map[accent];
          const chosen = (gender === 'male') ? cfg.male : (gender === 'female') ? cfg.female : cfg.female;
          voices = [{
            name: chosen,
            displayName: chosen.split('-').slice(-1)[0],
            gender: (gender && gender !== 'all') ? gender.toUpperCase() : 'FEMALE',
            languageCode: cfg.lang,
            accent: cfg.lang.split('-')[1],
            emotion: 'Natural',
            ssmlSupport: true,
            package: 'Premium'
          }];
          console.warn('🎯 [WEB FALLBACK] Injected Wavenet fallback:', chosen);
        }

        setAvailableVoices(voices);
        console.log(`✅ Filtrelenmiş sesler set edildi: ${voices.length}/${data.totalCount} voice`);

        const normalizeGender = (g: any) => String(g || '').toLowerCase();
        const currentVoice = voices.find((voice: any) => (voice.name || voice.id) === voiceType);
        const currentVoiceExists = !!currentVoice;
        const currentMatchesGender = selectedGender === 'all' || (currentVoice && normalizeGender(currentVoice.gender) === selectedGender);

        if ((!currentVoiceExists || !currentMatchesGender) && voices.length > 0) {
          // Önce cinsiyete göre uygun bir ses seç (male/female)
          const preferredByGender = selectedGender !== 'all'
            ? voices.find((v: any) => String(v.gender || '').toLowerCase() === selectedGender)
            : null;
          // Sonra kaydedilmiş varsayılan varsa onu kullan
          const preferredByDefault = savedDefaultVoice && voices.find((v: any) => (v.name || v.id) === savedDefaultVoice);
          const next = (preferredByGender && (preferredByGender.name || preferredByGender.id))
            || (preferredByDefault && (preferredByDefault.name || preferredByDefault.id))
            || (voices[0].name || voices[0].id);
          setVoiceType(next);
          console.log('🔄 Yeni varsayılan ses seçildi:', next);
        } else if (!defaultApplied && savedDefaultVoice) {
          // Liste yüklendi ve varsayılan listede varsa force seç
          const exists = voices.find((v: any) => (v.name || v.id) === savedDefaultVoice);
          if (exists) {
            // Gender filtresini de varsayılan sese göre ayarla
            if (exists.gender) {
              const g = String(exists.gender).toLowerCase();
              if (g === 'male' || g === 'female') {
                setSelectedGender(g);
              }
            }
            setVoiceType(exists.name || exists.id);
            setDefaultApplied(true);
            console.log('✅ Varsayılan ses uygula (refresh sonrası):', exists.name || exists.id);
          }
        }
      } else {
        console.log('❌ API response voices array değil, boş array set ediliyor');
        setAvailableVoices([]);
      }
    } catch (error) {
      console.error('❌ Filtrelenmiş sesler yüklenirken hata oluştu:', error);
      setAvailableVoices([]);
    } finally {
      setLoadingVoices(false);
    }
  };

  // Fetch TTS provider from settings
  useEffect(() => {
    const fetchTtsProvider = async () => {
      try {
        const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
          ? 'http://localhost:5001/api/admin/settings/tts-provider'
          : '/api/admin/settings/tts-provider';
        
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (data.success && data.tts_provider) {
          console.log('🎙️ TTS Provider from settings:', data.tts_provider);
          setTtsProvider(data.tts_provider);
        }
      } catch (error) {
        console.error('Error fetching TTS provider:', error);
        setTtsProvider('amazon'); // Default to Amazon
      }
    };
    
    fetchTtsProvider();
  }, []);

  // Content history ve user interests'i yüklemek için useEffect ekleyelim
  useEffect(() => {
    if (isAuthenticated) {
      fetchContentHistory();
      fetchUserInterests();
    }
    // Ses listesini her zaman yükle (authentication gerekmez)
    fetchAvailableVoices();
    (async () => {
      try {
        const { getUserSettings } = await import('../src/lib/api');
        const settings = await getUserSettings();
        if (settings?.default_voice) {
          setSavedDefaultVoice(settings.default_voice);
          setVoiceType(settings.default_voice);
          // Varsayılan sese göre filtreleri ayarla (liste o sesi içersin)
          const name: string = settings.default_voice;
          // Kategori
          if (name.includes('Wavenet')) setSelectedVoiceCategory('wavenet');
          else if (name.includes('Neural2')) setSelectedVoiceCategory('neural2');
          else if (name.includes('Studio')) setSelectedVoiceCategory('studio');
          else if (name.includes('Journey') || name.includes('Chirp')) setSelectedVoiceCategory('chirp3d');
          else setSelectedVoiceCategory('standard');
          // Aksan
          if (name.includes('en-GB')) setSelectedAccent('british');
          else if (name.includes('en-US')) setSelectedAccent('american');
          else if (name.includes('en-AU')) setSelectedAccent('australian');
          else if (name.includes('en-CA')) setSelectedAccent('canadian');
          else if (name.includes('en-IN')) setSelectedAccent('indian');
          // Cinsiyet: emin değilsek all bırak
          setDefaultApplied(false); // apply on next filtered list load
        }
      } catch {}
    })();
  }, [isAuthenticated]);

  // Mobile safety net: DISABLE native alert and use custom modal instead
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const originalAlert = window.alert;
    window.alert = (msg?: any) => {
      try {
        const text = String(msg || '');
        const noPlan = text.includes('Aktif paketiniz yok');
        const limit = text.includes('Paket kullanım sınırınız aşıldı');
        if (noPlan || limit) {
          // Do NOT show native alert; open custom modal instead
          setError(noPlan ? 'Aktif paketiniz yok' : 'Paket kullanım sınırınız aşıldı');
          setShowPlanRequired(true);
          return;
        }
      } catch {}
      // For all other alerts on this page, suppress native alert entirely
      return;
    };
    return () => {
      window.alert = originalAlert;
    };
  }, []);

  // Redirect or show custom modal after error is set
  useEffect(() => {
    if (!error) return;
    try {
      const text = String(error);
      const shouldOpen = text.includes('Aktif paketiniz yok') || text.includes('Paket kullanım sınırınız aşıldı');
      if (shouldOpen) setShowPlanRequired(true);
    } catch {}
  }, [error]);

  // Safety: handle unhandled 402 errors (promise rejections) without native alert
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: PromiseRejectionEvent) => {
      try {
        const anyReason: any = event.reason || {};
        const status = anyReason?.response?.status;
        const message = String(anyReason?.message || '');
        const noPlan = message.includes('Aktif paketiniz yok');
        const limit = message.includes('Paket kullanım sınırınız aşıldı');
        if (status === 402 || noPlan || limit) {
          setError(noPlan ? 'Aktif paketiniz yok' : 'Paket kullanım sınırınız aşıldı');
          setShowPlanRequired(true);
        }
      } catch {}
    };
    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, []);

  // Filtreler değiştiğinde sesleri yeniden çek
  useEffect(() => {
    const hasActiveFilters = selectedAccent !== 'all' || selectedGender !== 'all' || emotionType !== 'all' || selectedVoiceCategory !== 'standard';
    
    if (hasActiveFilters) {
      console.log('🎯 Filtre değişti, sesler yeniden çekiliyor...', { 
        selectedAccent, 
        selectedGender, 
        emotionType,
        selectedVoiceCategory
      });
      fetchFilteredVoices(selectedAccent, emotionType, selectedGender, selectedVoiceCategory);
    } else {
      console.log('🔄 Tüm filtreler kaldırıldı, tüm sesler çekiliyor...');
      fetchAvailableVoices();
    }
  }, [selectedAccent, selectedGender, emotionType, selectedVoiceCategory]);

  // Content history'yi çeken fonksiyon
  const fetchContentHistory = async () => {
    setLoadingHistory(true);
    try {
      console.log('fetchContentHistory başlatılıyor...');
      const response = await getContentHistory();
      console.log('getContentHistory response:', response);
      
      if (response.success && response.data) {
        console.log('Content history data:', response.data);
        // Backend'den gelen data yapısını kontrol et
        if (Array.isArray(response.data)) {
          setContentHistory(response.data);
          console.log('Content history array olarak set edildi:', response.data.length, 'item');
        } else {
          console.log('Content history data array değil, boş array set ediliyor');
          setContentHistory([]);
        }
      } else {
        console.log('Response success false veya data yok');
        setContentHistory([]);
      }
    } catch (error) {
      console.error('Content history yüklenirken hata oluştu:', error);
      setContentHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Kullanıcı ilgi alanlarını çeken fonksiyon
  const fetchUserInterests = async () => {
    setLoadingInterests(true);
    try {
      console.log('fetchUserInterests başlatılıyor...');
      const response = await getUserInterests();
      console.log('getUserInterests response:', response);
      
      if (response && Array.isArray(response)) {
        // Backend'den gelen format: [{ interest_keyword: "İngilizce" }, ...]
        const interests = response.map((item: any) => item.interest_keyword || item);
        setUserInterests(interests);
        console.log('User interests set edildi:', interests);
      } else {
        console.log('User interests data array değil, boş array set ediliyor');
        setUserInterests([]);
      }
    } catch (error) {
      console.error('User interests yüklenirken hata oluştu:', error);
      setUserInterests([]);
    } finally {
      setLoadingInterests(false);
    }
  };

  // Konu önerisi fonksiyonu - mevcut InputSection yapısına uyarlanmış
  const handleTopicSuggestion = async () => {
    if (contentType !== 'topic') return;
    
    if (!selectedInterest) {
      setError('Lütfen önce bir hobi/ilgi alanı seçin.');
      return;
    }
    
    setIsLoadingTopicSuggestions(true);
    setError(null);
    
    try {
      const response = await getTopicDetailSuggestions(selectedInterest, englishLevel);
      if (response.success && response.data.suggestions) {
        setTopicDetailSuggestions(response.data.suggestions);
        console.log(`${selectedInterest} konusu için ${response.data.suggestions.length} öneri alındı`);
      } else {
        console.error("Konu önerileri alınamadı:", response);
        setError("Konu önerileri alınamadı: " + (response.message || "Bilinmeyen hata"));
      }
    } catch (error: any) {
      console.error("Konu önerileri alınırken hata oluştu:", error);
      const errorMessage = error.message || "Bilinmeyen bir hata oluştu";
      setError(`Konu önerileri alınamadı: ${errorMessage}`);
    } finally {
      setIsLoadingTopicSuggestions(false);
    }
  };

  // Detaylı konu seçildiğinde çalışacak handler
  const handleDetailTopicSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    setSelectedDetailTopic(selectedValue);
    setTextInput(selectedValue); // Seçilen detaylı konuyu textarea'ya yaz
  };

  // Kitap arama fonksiyonu
  const searchBooks = async (query?: string, title?: string, author?: string, page: number = 1) => {
    // En az bir arama kriteri olmalı
    if (!query?.trim() && !title?.trim() && !author?.trim()) {
      console.log('🔍 [BOOK SEARCH] No search criteria provided');
      return;
    }
    
    console.log('🔍 [BOOK SEARCH] Starting search with:', { query, title, author, page });
    
    setIsSearchingBooks(true);
    try {
      // URL parametrelerini oluştur
      const searchParams = new URLSearchParams();
      if (query?.trim()) searchParams.append('q', query.trim());
      if (title?.trim()) searchParams.append('title', title.trim());
      if (author?.trim()) searchParams.append('author', author.trim());
      searchParams.append('page', page.toString());
      searchParams.append('per_page', '10');
      
      const searchUrl = `/api/books/search?${searchParams.toString()}`;
      console.log('🔍 [BOOK SEARCH] Fetching URL:', searchUrl);
      
      const response = await fetch(searchUrl);
      console.log('🔍 [BOOK SEARCH] Response status:', response.status);
      console.log('🔍 [BOOK SEARCH] Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const data: BookSearchResult = await response.json();
        console.log('🔍 [BOOK SEARCH] Success! Found:', data.total, 'books');
        console.log('🔍 [BOOK SEARCH] Books data:', data);
        setBookSearchResults(data);
        setCurrentPage(page);
      } else {
        const errorText = await response.text();
        console.error('🔍 [BOOK SEARCH] Error response:', response.status, response.statusText);
        console.error('🔍 [BOOK SEARCH] Error body:', errorText);
      }
    } catch (error) {
      console.error('🔍 [BOOK SEARCH] Fetch error:', error);
    } finally {
      setIsSearchingBooks(false);
    }
  };

  // Kitap bölümlerini yükleme fonksiyonu
  const loadBookChapters = async (bookId: string) => {
    setIsLoadingChapters(true);
    try {
      const response = await fetch(`/api/books/${bookId}/chapters`);
      if (response.ok) {
        const chapters: Chapter[] = await response.json();
        setBookChapters(chapters);
      } else {
        const errorData = await response.json();
        console.error('Bölüm yükleme hatası:', errorData);
        setError(`Bölüm yükleme hatası: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error('Bölüm yükleme hatası:', error);
      setError('Bölümler yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsLoadingChapters(false);
    }
  };

  // Mevcut ses kontrolü fonksiyonu
  const checkExistingAudio = async (chapterId: string, voiceModel: string, speakingRate: number, level: string) => {
    if (!selectedBook) {
      console.error('No book selected for audio check');
      return null;
    }
    
    setIsCheckingExistingAudio(true);
    try {
      const response = await fetch(`/api/books/${selectedBook.id}/chapters/${chapterId}/audio?voice_model=${voiceModel}&speaking_rate=${speakingRate}&level=${level}`);
      if (response.ok) {
        const audio: ExistingAudio = await response.json();
        setExistingAudio(audio);
        return audio;
      } else {
        setExistingAudio(null);
        return null;
      }
    } catch (error) {
      console.error('Mevcut ses kontrolü hatası:', error);
      setExistingAudio(null);
      return null;
    } finally {
      setIsCheckingExistingAudio(false);
    }
  };

  // Kitap seçimi fonksiyonu
  const handleBookSelect = (book: Book) => {
    setSelectedBook(book);
    setSelectedChapter(null);
    setBookChapters([]);
    setExistingAudio(null);
    loadBookChapters(book.id);
  };

  // Bölüm seçimi fonksiyonu
  const handleChapterSelect = async (chapter: Chapter) => {
    setSelectedChapter(chapter);
    setTextInput(chapter.chapter_text);
    
    // Mevcut ses kontrolü yap
    await checkExistingAudio(chapter.id, voiceType, speakingRate, englishLevel);
  };

  // Kitap arama submit fonksiyonu
  const handleBookSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // En az bir arama kriteri olmalı
    if (bookSearchQuery.trim() || bookTitleSearch.trim() || bookAuthorSearch.trim()) {
      searchBooks(bookSearchQuery, bookTitleSearch, bookAuthorSearch, 1);
    }
  };

  const handleSubmit = async (inputData: InputData) => {
    setIsLoading(true);
    setError(null);
    try {
      let processInput: ProcessInputData = {
        type: inputData.type,
        input: inputData.text || inputData.input, // text veya input'u input olarak gönder
        file: inputData.file,
        level: inputData.level,
        SesHızı: inputData.SesHızı,
        voice: inputData.voice,
        chapter: (inputData as any).chapter,
        chapter_id: selectedChapter?.id, // Kitap bölümü ID'sini ekle
      };

      // YouTube: altyazı metnini text olarak TTS'e gönder
      if (inputData.type === 'youtube') {
        const subtitle = (inputData.text || inputData.input || textInput || '').trim();
        if (!subtitle) {
          throw new Error('Önce "Altyazı çek" ile metni yükleyin.');
        }
        processInput = {
          ...processInput,
          type: 'text',
          input: subtitle,
        };
      }

      // "subject" (Konu) ve "topic" (Hobi) type'ları için özel işlem
      if (inputData.type === 'subject' || inputData.type === 'topic') {
        const typeLabel = inputData.type === 'subject' ? 'Subject (Konu)' : 'Topic (Hobi)';
        console.log(`${typeLabel} type detected, rewriting to narration...`);
        
        // Metni anlatım formatına dönüştür
        const narrationResult = await rewriteToNarration(
          inputData.text || inputData.input || '', 
          inputData.level
        );
        
        if (narrationResult.success && narrationResult.data.narration_text) {
          // Dönüştürülmüş metni kullan ve type'ı text olarak değiştir
          processInput = {
            ...processInput,
            type: 'text',
            input: narrationResult.data.narration_text
          };
          
          console.log(`${typeLabel} text rewritten to narration format:`, {
            originalLength: (inputData.text || inputData.input || '').length,
            narrationLength: narrationResult.data.narration_text.length
          });
        } else {
          throw new Error('Metin anlatım formatına dönüştürülemedi.');
        }
      }

      // Kullanım/abonelik kontrolü
      try {
        const usageSummary = await getUsageSummary();
        if (usageSummary?.success && usageSummary.data && usageSummary.data.hasPlan === false) {
          setError('Aktif paketiniz yok');
          setIsLoading(false);
          return;
        }
        if (usageSummary?.success && usageSummary.data?.isExceeded) {
          setError('Paket kullanım sınırınız aşıldı');
          setIsLoading(false);
          return;
        }
      } catch (e) {
        // Precheck başarısızsa, TTS çağrısını yapmayalım; özel modalı açalım
        setError('Paket doğrulaması yapılamadı');
        setShowPlanRequired(true);
        setIsLoading(false);
        return;
      }

      console.log('🔄 [DEBUG] About to call processTts with:', processInput);
      const result = await processTts({ ...processInput, suppressPlanAlerts: true });
      console.log('✅ [DEBUG] processTts completed with result:', result);
      
      // CRITICAL DEBUG: Check why setAudioResult is not called
      console.log('🚨 [CRITICAL DEBUG] Validation checks:', {
        hasResult: !!result,
        resultType: typeof result,
        hasMP3Url: !!result?.mp3_url,
        mp3UrlValue: result?.mp3_url,
        mp3UrlType: typeof result?.mp3_url,
        conditionResult: !!(result && result.mp3_url)
      });
      
      // Debug: TTS sonucunu logla
      console.log('🔍 [FRONTEND DEBUG] Full TTS Result:', result);
      console.log('🔍 [FRONTEND DEBUG] TTS Result Analysis:', {
        hasResult: !!result,
        hasMp3Url: !!result?.mp3_url,
        // Snake case versions
        hasTranslatedText_snake: !!result?.translated_text,
        hasAdaptedText_snake: !!result?.adapted_text,
        // Camel case versions
        hasTranslatedText_camel: !!result?.translatedText,
        hasAdaptedText_camel: !!result?.adaptedText,
        // Values
        translatedText_snake: result?.translated_text ? result.translated_text.substring(0, 50) + '...' : 'UNDEFINED',
        adaptedText_snake: result?.adapted_text ? result.adapted_text.substring(0, 50) + '...' : 'UNDEFINED',
        translatedText_camel: result?.translatedText ? result.translatedText.substring(0, 50) + '...' : 'UNDEFINED',
        adaptedText_camel: result?.adaptedText ? result.adaptedText.substring(0, 50) + '...' : 'UNDEFINED',
        // All keys in result
        resultKeys: result ? Object.keys(result) : []
      });
      
      if (result && result.mp3_url) {
        // DEBUG: setAudioResult öncesi timepoints kontrolü
        console.log('🔍 [WELCOME DEBUG] Before setAudioResult:', {
          hasTimepoints: !!result.timepoints,
          timepointsLength: result.timepoints?.length || 0,
          timepointsType: typeof result.timepoints,
          isArray: Array.isArray(result.timepoints),
          firstTimepoint: result.timepoints?.[0],
          hasWords: !!result.words,
          wordsLength: result.words?.length || 0
        });
        
        console.log('🚀 [DEBUG] About to call setAudioResult with:', {
          mp3_url: result.mp3_url,
          timepoints_length: result.timepoints?.length,
          words_length: result.words?.length
        });
        
        setAudioResult({
          success: true,
          message: result.message || t('audio_generated_success'),
          mp3_url: result.mp3_url,
          vtt_url: result.vtt_url,
          level: inputData.level,
          timepoints: result.timepoints || [],
          words: result.words || [],
          speaking_rate: (result as any).speaking_rate || 1.0,
          original_turkish: (result as any).original_turkish || ''
        });
        
        // DEBUG: setAudioResult sonrası kontrol
        console.log('✅ [DEBUG] setAudioResult called successfully');
        
        // Input değerini belirle - kitap bölümü için chapter title kullan
        let input = processInput.input || inputData.input || inputData.text;
        if (processInput.type === 'book' && selectedChapter) {
          input = `${selectedChapter.chapter_title} (Chapter ${selectedChapter.chapter_index})`;
        }
        
        try {
          await submitContent(
            input || 'Unknown input', 
            processInput.type, 
            inputData.level, 
            result.mp3_url, 
            result.translated_text || result.translatedText || '',
            result.adapted_text || result.adaptedText || ''
          );
          console.log('İçerik başarıyla kaydedildi');
          // Content history'yi yeniden yükle
          fetchContentHistory();
        } catch (submitError: any) {
          console.error('İçerik kaydetme hatası (ses oluşturma başarılı):', submitError);
          const errMsg = String(submitError?.message || '');
          const errJson = (() => {
            try { return JSON.parse(errMsg.split(' - ').pop() || '{}'); } catch { return {}; }
          })();
          const serverError = String((errJson as any)?.error || '');
          const isDuplicate = errMsg.toLowerCase().includes('duplicate key') 
            || serverError.toLowerCase().includes('duplicate key')
            || errMsg.includes('ux_contenthistory_user_mp3') 
            || serverError.includes('ux_contenthistory_user_mp3');
          if (isDuplicate) {
            // Aynı mp3_url için kayıt zaten var → uyarıyı kullanıcıya göstermeyelim
            console.warn('Duplicate contenthistory entry detected; suppressing user-facing error.');
          } else {
            // Diğer hataları normal şekilde göster
            setError(`Ses başarıyla oluşturuldu ancak kaydetme sırasında hata oluştu: ${submitError.message}`);
          }
        }
      } else {
        setError(result.message || t('audio_generation_failed'));
      }
    } catch (error: any) {
      console.error('Error generating audio:', error);
      const message = String(error?.message || '');
      // Mobile-safe open external link for subscription/limit errors
      try {
        const externalLink = '/login?next=%2Fdashboard%3Ftab%3Dpaket-bilgilerim';
        if (typeof window !== 'undefined') {
          const isNoPlan = message.includes('Aktif paketiniz yok');
          const isLimit = message.includes('Paket kullanım sınırınız aşıldı');
          const is402 = (error as any)?.response?.status === 402;
          if (isNoPlan || isLimit || is402) {
            // Try to open in a new tab/window; fallback to same-tab navigation
            try {
              const win = window.open(externalLink, '_blank', 'noopener,noreferrer');
              if (win) {
                win.focus();
              } else {
                window.location.href = externalLink;
              }
            } catch {
              window.location.href = externalLink;
            }
          }
        }
      } catch {}
      setError(message || t('unexpected_error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Doküman yükleme fonksiyonu
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Dosya boyutu kontrolü (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('Dosya boyutu 10MB\'dan büyük olamaz.');
      return;
    }
    
    // Dosya türü kontrolü
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      'application/rtf',
      'text/html',
      'application/vnd.oasis.opendocument.text',
      'application/epub+zip'
    ];
    
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|doc|docx|txt|md|rtf|html|odt|epub)$/i)) {
      alert('Desteklenmeyen dosya türü. Lütfen PDF, DOC, DOCX, TXT, MD, RTF, HTML, ODT veya EPUB dosyası seçin.');
      return;
    }
    
    console.log('Dosya yükleniyor:', file.name, 'Boyut:', file.size, 'Tür:', file.type);
    
    try {
      setUploadingFile(true);
      
      const formData = new FormData();
      formData.append('file', file);
      
      // API URL'ini oluştur - Welcome sayfası için direkt backend URL kullan
      const apiUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:5001/api/content/upload'
        : 'https://lingloops-backend.onrender.com/api/content/upload';
      
      console.log('Upload API URL:', apiUrl);
      
      const res = await fetch(apiUrl, { 
        method: 'POST', 
        body: formData,
        credentials: 'include'
      });
      
      console.log('Upload response status:', res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Upload error response:', errorText);
        
        let errorMessage = `Upload failed: ${res.status} ${res.statusText}`;
        if (res.status === 404) {
          errorMessage = 'Upload API endpoint bulunamadı. Backend çalışıyor mu?';
        } else if (res.status === 500) {
          errorMessage = 'Sunucu hatası. Backend loglarını kontrol edin.';
        } else if (res.status === 413) {
          errorMessage = 'Dosya çok büyük. Daha küçük bir dosya deneyin.';
        } else if (res.status === 415) {
          errorMessage = 'Desteklenmeyen dosya türü.';
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await res.json();
      console.log('Upload response data:', data);
      
      if (data.text) {
        setTextInput(data.text);
        setContentType('text');
        alert(`Dosya başarıyla yüklendi! ${data.text.length} karakter metin çıkarıldı.`);
      } else if (data.error) {
        throw new Error(data.error);
      } else {
        throw new Error('Dosyadan metin çıkarılamadı.');
      }
    } catch (error: any) {
      console.error('File upload error:', error);
      alert(`Dosya yükleme hatası: ${error.message || 'Bilinmeyen hata'}`);
      
      // Input'u temizle
      if (e.target) {
        e.target.value = '';
      }
    } finally {
      setUploadingFile(false);
    }
  };

  // Yeni tasarım için ses oluşturma fonksiyonu
  const handleGenerate = async () => {
    if (!textInput.trim()) {
      setError('Lütfen bir metin girin.');
      return;
    }

    // Limit kontrolü
    if (remaining <= 0) {
      setError('Ses oluşturma hakkınız bitti. Premium pakete geçerek sınırsız ses oluşturabilirsiniz.');
      return;
    }

    const inputData: InputData = {
      type: contentType as ProcessInputData['type'],
      text: textInput,
      level: englishLevel,
      SesHızı: speakingRate,
      voice: voiceType,
    };

    await handleSubmit(inputData);
  };

  if (user === undefined) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </main>
    );
  }

  // Auth loading durumunda loading göster
  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Yükleniyor...</p>
        </div>
      </main>
    );
  }

  // Auth tamamlandıktan sonra user kontrolü
  if (!isAuthenticated || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center text-xl text-gray-500">
        <div className="text-center">
          <p className="mb-4">Oturum açmanız gerekiyor.</p>
          <button 
            onClick={() => router.push('/login')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md"
          >
            Giriş Yap
          </button>
        </div>
      </main>
    );
  }

  // Custom plan required modal (replaces native alert)
  if (showPlanRequired) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <PlanRequired
          message={error?.includes('kullanım') ? 'Paket kullanım sınırınız aşıldı.' : 'Aktif paketiniz yok.'}
          onClose={() => setShowPlanRequired(false)}
        />
      </main>
    );
  }

  const displayName = (user as any).name || user.email;
  const avatar = (user as any).avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}`;
  const role = user.role || 'user';
  const membershipStatus = user.membershipStatus || 'free';

  // Örnek istatistikler (gerçek projede API'den alınır)
  const stats = {
    contentCreated: 12,
    totalLogins: 5,
    lastLogin: '2025-05-13 10:42',
  };

  const heroImageUrl = 'https://readdy.ai/api/search-image?query=Modern%20language%20learning%20concept%20with%20digital%20technology%2C%20AI%20assistant%20helping%20with%20English%20lessons%2C%20abstract%20blue%20gradient%20background%20with%20subtle%20tech%20elements%2C%20professional%20educational%20atmosphere&width=1200&height=600&seq=hero1&orientation=landscape';

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Top Navigation */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" className="!rounded-button whitespace-nowrap cursor-pointer">
                  <i className="fas fa-home mr-2"></i>
                  Ana Sayfa
                </Button>
              </Link>
              <Button variant="ghost" className="!rounded-button whitespace-nowrap cursor-pointer">
                <i className="fas fa-user mr-2"></i>
                Kullanıcı Paneli
              </Button>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" className="!rounded-button whitespace-nowrap cursor-pointer">
                <i className="fas fa-bell"></i>
              </Button>
              {isAuthenticated && (
                <div className="relative">
                  <div
                    className="flex items-center space-x-3 cursor-pointer"
                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  >
                    <img
                      src={avatar}
                      alt={displayName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="text-sm">
                      <div className="font-medium">{displayName}</div>
                      <div className="text-gray-500 text-xs">{user?.email}</div>
                    </div>
                    <i className={`fas fa-chevron-${profileMenuOpen ? 'up' : 'down'} ml-2 text-gray-500 transition-transform duration-200`}></i>
                  </div>
                  <div
                    className={`absolute right-0 w-48 mt-2 bg-white rounded-lg shadow-lg py-2 ${profileMenuOpen ? 'block' : 'hidden'} z-10`}
                  >
                    <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                      <i className="fas fa-user-circle mr-2"></i>
                      Profil Bilgilerim
                    </Link>
                    <Link href="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                      <i className="fas fa-cog mr-2"></i>
                      Hesap Ayarları
                    </Link>
                    <Link href="/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                      <i className="fas fa-history mr-2"></i>
                      Okuma Geçmişim
                    </Link>
                    <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                      <i className="fas fa-heart mr-2"></i>
                      Favorilerim
                    </a>
                    <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                      <i className="fas fa-globe mr-2"></i>
                      Dil Ayarları
                    </a>
                    <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                      <i className="fas fa-question-circle mr-2"></i>
                      Yardım ve Destek
                    </a>
                    <div className="border-t border-gray-100 mt-2 pt-2">
                      <button
                        onClick={() => {
                          logout();
                          router.push('/');
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 cursor-pointer"
                      >
                        <i className="fas fa-sign-out-alt mr-2"></i>
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

      {/* Hero Section */}
      <div className="relative w-full h-[400px] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImageUrl})` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 to-transparent flex items-center">
          <div className="container mx-auto px-6">
            <div className="max-w-2xl">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                AI ile Güçlendirilmiş İngilizce Öğrenimi
              </h1>
              <p className="text-xl text-blue-100 mb-8">
                Her seviyeye uygun kişiselleştirilmiş İngilizce içerik oluşturun ve ses dönüşümleriyle öğrenme deneyiminizi geliştirin.
              </p>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-lg !rounded-button whitespace-nowrap cursor-pointer">
                Hemen Başlayın
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          {error && (
            <div className="mb-8">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* AI Content Entry Card */}
          <div 
            onClick={() => router.push('/chat/assistant')}
            className="max-w-4xl mx-auto mb-8 bg-white rounded-xl shadow-md hover:shadow-lg cursor-pointer transition-all duration-300 group"
          >
            <div className="p-6 flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  LingRoot AI ile İçerik Oluştur
                </h3>
                <p className="text-gray-600 text-base">
                  Yapay zekayla sohbet ederek seviyene uygun içerik oluşturmaya hemen başla.
                </p>
              </div>
              <div className="ml-6">
                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <MessageSquare className="w-8 h-8 text-blue-600 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>

          <Card className="mb-8 border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold mr-4">
                  1
                </div>
                <h2 className="text-2xl font-bold text-blue-600">İçerik Türü ve Giriş</h2>
              </div>
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-700 mb-3">İçerik Türü</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {contentTypeOptions.map((option) => (
                    <div
                      key={option.id}
                      onClick={() => setContentType(option.id)}
                      className={`flex flex-col items-center justify-center p-4 rounded-lg border cursor-pointer transition-all ${
                        contentType === option.id ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <i className={`${option.icon} text-2xl mb-2 ${contentType === option.id ? 'text-blue-600' : 'text-gray-500'}`}></i>
                      <span className={`text-sm text-center ${contentType === option.id ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>
                        {option.name}
                      </span>
                    </div>
                  ))}
                </div>
                {/* Varsayılan Ses butonu bu bölümden kaldırıldı */}
              </div>
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium text-gray-700">İçerik Girişi</h3>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="!rounded-button whitespace-nowrap cursor-pointer">
                      <i className="fas fa-cog mr-2"></i> Ayarlar
                    </Button>
                  </div>
                </div>
                {contentType === 'document' ? (
                  <div className="space-y-4">
                    <div className={`flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition-colors ${
                      uploadingFile 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300 hover:border-blue-500'
                    }`}>
                      <div className="space-y-1 text-center">
                        {uploadingFile ? (
                          <>
                            <svg className="mx-auto h-12 w-12 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <div className="text-sm text-blue-600 font-medium">
                              Dosya yükleniyor...
                            </div>
                            <p className="text-xs text-blue-500">Lütfen bekleyin</p>
                          </>
                        ) : (
                          <>
                            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4-4m4-4h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <div className="flex text-sm text-gray-600">
                              <label htmlFor="file-upload" className={`relative rounded-md font-medium focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 ${
                                uploadingFile 
                                  ? 'cursor-not-allowed text-gray-400' 
                                  : 'cursor-pointer bg-white text-blue-600 hover:text-blue-500'
                              }`}>
                                <span>Dosya Yükle</span>
                                <input
                                  id="file-upload"
                                  name="file-upload"
                                  type="file"
                                  className="sr-only"
                                  onChange={handleFileUpload}
                                  accept=".pdf,.doc,.docx,.txt,.md,.rtf,.html,.odt,.epub"
                                  disabled={uploadingFile}
                                />
                              </label>
                              <p className="pl-1">veya sürükleyip bırakın</p>
                            </div>
                            <p className="text-xs text-gray-500">PDF, DOC, DOCX, TXT, MD, RTF, HTML, ODT, EPUB</p>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {textInput && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Çıkarılan Metin:
                        </label>
                        <textarea
                          value={textInput}
                          onChange={(e) => setTextInput(e.target.value)}
                          className="w-full min-h-[150px] p-4 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500 resize-none"
                          placeholder="Dosyadan çıkarılan metin burada görünecek..."
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Hobi seçildiğinde ilgi alanları combobox'ı göster */}
                    {contentType === 'topic' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Hobiler/İlgi Alanlarınız:
                          </label>
                          {loadingInterests ? (
                            <div className="flex items-center justify-center p-4 border border-gray-300 rounded-lg">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                              <span className="ml-2 text-gray-600">İlgi alanları yükleniyor...</span>
                            </div>
                          ) : userInterests.length > 0 ? (
                            <div className="flex gap-3">
                              <div className="flex-1">
                                <select 
                                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                                  value={selectedInterest}
                                  onChange={(e) => setSelectedInterest(e.target.value)}
                                >
                                  <option value="">Hobi/İlgi alanı seçin...</option>
                                  {userInterests.map((interest, index) => (
                                    <option key={index} value={interest}>
                                      {interest}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <Button 
                                type="button"
                                className={`px-6 py-3 !rounded-button whitespace-nowrap ${
                                  selectedInterest && !isLoadingTopicSuggestions
                                    ? 'bg-green-600 hover:bg-green-700 cursor-pointer' 
                                    : 'bg-gray-400 cursor-not-allowed'
                                }`}
                                disabled={!selectedInterest || isLoadingTopicSuggestions}
                                onClick={handleTopicSuggestion}
                              >
                                {isLoadingTopicSuggestions ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Yükleniyor...
                                  </>
                                ) : (
                                  <>
                                    <i className="fas fa-magic mr-2"></i>
                                    Hobi Öner
                                  </>
                                )}
                              </Button>
                            </div>
                          ) : (
                            <div className="p-4 border border-yellow-300 bg-yellow-50 rounded-lg">
                              <p className="text-yellow-800 text-sm">
                                Hobi/İlgi alanlarınız bulunamadı. Profil ayarlarınızdan ilgi alanlarınızı ekleyebilirsiniz.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Detaylı öneriler combobox'ı */}
                        {topicDetailSuggestions.length > 0 && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Detaylı Öneriler:
                            </label>
                            <select
                              className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                              value={selectedDetailTopic}
                              onChange={handleDetailTopicSelect}
                            >
                              <option value="">Öneri seçin...</option>
                              {topicDetailSuggestions.map((suggestion, index) => (
                                <option key={index} value={suggestion}>
                                  {suggestion.length > 100 ? `${suggestion.substring(0, 100)}...` : suggestion}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Yeni Konu sekmesi - sadece metin kutusu */}
                    {contentType === 'subject' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Konu:
                        </label>
                        <div className="relative">
                          <textarea
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            placeholder="Öğrenmek istediğiniz konuyu yazın..."
                            className="w-full min-h-[200px] p-4 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500 resize-none"
                          />
                          <button className="absolute bottom-3 right-3 text-gray-500 hover:text-blue-600 cursor-pointer">
                            <i className="fas fa-edit text-xl"></i>
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* YouTube sekmesi - link girişi ve altyazı çekme */}
                    {contentType === 'youtube' && (
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          YouTube Linki:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={youtubeUrl}
                            onChange={(e) => setYoutubeUrl(e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="flex-1 p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                          />
                          <Button
                            type="button"
                            onClick={handleFetchYoutubeSubtitle}
                            className={`px-6 py-3 !rounded-button whitespace-nowrap ${
                              !isFetchingSubtitle ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer' : 'bg-gray-400 cursor-not-allowed'
                            }`}
                            disabled={isFetchingSubtitle}
                          >
                            {isFetchingSubtitle ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Altyazı çekiliyor...
                              </>
                            ) : (
                              <>
                                <i className="fas fa-closed-captioning mr-2"></i>
                                Altyazı çek
                              </>
                            )}
                          </Button>
                        </div>
                        {subtitleError && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            {subtitleError}
                          </div>
                        )}
                        <p className="text-xs text-gray-500">
                          Not: Altyazı metni başarıyla alındığında aşağıdaki metin kutusuna otomatik olarak yapıştırılır.
                        </p>
                      </div>
                    )}

                    {/* Podcast sekmesi */}
                    {contentType === 'podcast' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Podcast Konusu:
                          </label>
                          <textarea
                            value={podcastTopic}
                            onChange={(e) => setPodcastTopic(e.target.value)}
                            placeholder="Podcast için bir konu girin (Örn: The history of the Internet)..."
                            className="w-full min-h-[100px] p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500 resize-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Süre (dakika):
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="30"
                            value={podcastDuration}
                            onChange={(e) => setPodcastDuration(parseInt(e.target.value) || 3)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Konuşma Stili:
                            </label>
                            <select
                              value={podcastStyleType}
                              onChange={(e) => setPodcastStyleType(e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                            >
                              <option value="friendly_chat">Samimi Sohbet</option>
                              <option value="professional">Profesyonel</option>
                              <option value="educational">Eğitici</option>
                              <option value="casual">Rahat</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Ses Seçimi:
                            </label>
                            <select
                              value={podcastVoiceChoice}
                              onChange={(e) => setPodcastVoiceChoice(e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                            >
                              <option value="english_female">İngilizce - Kadın</option>
                              <option value="english_male">İngilizce - Erkek</option>
                              <option value="american_female">Amerikan - Kadın</option>
                              <option value="american_male">Amerikan - Erkek</option>
                              <option value="british_female">İngiliz - Kadın</option>
                              <option value="british_male">İngiliz - Erkek</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Kişilik A:
                            </label>
                            <select
                              value={podcastPersonalityA}
                              onChange={(e) => setPodcastPersonalityA(e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                            >
                              <option value="curious_enthusiast">Meraklı Coşkulu</option>
                              <option value="skeptical_analyst">Şüpheci Analist</option>
                              <option value="friendly_guide">Samimi Rehber</option>
                              <option value="professional_expert">Profesyonel Uzman</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Kişilik B:
                            </label>
                            <select
                              value={podcastPersonalityB}
                              onChange={(e) => setPodcastPersonalityB(e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                            >
                              <option value="knowledgeable_friend">Bilgili Arkadaş</option>
                              <option value="experienced_mentor">Deneyimli Mentor</option>
                              <option value="curious_learner">Meraklı Öğrenci</option>
                              <option value="witty_commentator">Esprili Yorumcu</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center space-x-6">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={podcastIncludeHumor}
                              onChange={(e) => setPodcastIncludeHumor(e.target.checked)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Mizah Ekle</span>
                          </label>
                          
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={podcastIncludeFiller}
                              onChange={(e) => setPodcastIncludeFiller(e.target.checked)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Dolgu Kelimeler Ekle</span>
                          </label>
                        </div>

                        <div className="flex justify-center pt-2">
                          <Button
                            type="button"
                            onClick={handleCreatePodcast}
                            className={`px-8 py-3 !rounded-button whitespace-nowrap ${
                              !isCreatingPodcast && podcastTopic.trim() 
                                ? 'bg-purple-600 hover:bg-purple-700 cursor-pointer' 
                                : 'bg-gray-400 cursor-not-allowed'
                            }`}
                            disabled={isCreatingPodcast || !podcastTopic.trim()}
                          >
                            {isCreatingPodcast ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Podcast Oluşturuluyor...
                              </>
                            ) : (
                              <>
                                <i className="fas fa-podcast mr-2"></i>
                                Podcast Oluştur
                              </>
                            )}
                          </Button>
                        </div>

                        {podcastError && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            {podcastError}
                          </div>
                        )}
                        
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                          <i className="fas fa-info-circle mr-1"></i>
                          Podcast oluşturma işlemi birkaç dakika sürebilir. Lütfen bekleyin.
                        </div>
                      </div>
                    )}

                    {/* Kitap sekmesi */}
                    {contentType === 'book' && (
                      <div className="space-y-6">
                        {/* Kitap Arama */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Kitap Ara:
                          </label>
                          <form onSubmit={handleBookSearch} className="space-y-4">
                            {/* Genel Arama */}
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Genel Arama (İsteğe Bağlı)
                              </label>
                              <input
                                type="text"
                                value={bookSearchQuery}
                                onChange={(e) => setBookSearchQuery(e.target.value)}
                                placeholder="Herhangi bir kelime girin..."
                                className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                              />
                            </div>

                            {/* Kitap İsmi ve Yazar İsmi */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Kitap İsmi
                                </label>
                                <input
                                  type="text"
                                  value={bookTitleSearch}
                                  onChange={(e) => setBookTitleSearch(e.target.value)}
                                  placeholder="Örn: Frankenstein"
                                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Yazar İsmi
                                </label>
                                <input
                                  type="text"
                                  value={bookAuthorSearch}
                                  onChange={(e) => setBookAuthorSearch(e.target.value)}
                                  placeholder="Örn: Mary Shelley"
                                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                                />
                              </div>
                            </div>

                            {/* Arama Butonu */}
                            <div className="flex justify-center">
                              <Button 
                                type="submit"
                                className={`px-8 py-3 !rounded-button whitespace-nowrap ${
                                  (bookSearchQuery.trim() || bookTitleSearch.trim() || bookAuthorSearch.trim()) && !isSearchingBooks
                                    ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer' 
                                    : 'bg-gray-400 cursor-not-allowed'
                                }`}
                                disabled={!(bookSearchQuery.trim() || bookTitleSearch.trim() || bookAuthorSearch.trim()) || isSearchingBooks}
                              >
                                {isSearchingBooks ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Aranıyor...
                                  </>
                                ) : (
                                  <>
                                    <i className="fas fa-search mr-2"></i>
                                    Kitap Ara
                                  </>
                                )}
                              </Button>
                            </div>

                            {/* Arama İpucu */}
                            <div className="text-xs text-gray-500 text-center">
                              <i className="fas fa-info-circle mr-1"></i>
                              En az bir arama kriteri girin. Tüm alanları birlikte kullanabilirsiniz.
                            </div>
                          </form>
                        </div>

                        {/* Kitap Arama Sonuçları */}
                        {bookSearchResults && (
                          <div>
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="text-md font-medium text-gray-700">
                                Arama Sonuçları ({bookSearchResults.total} kitap)
                              </h4>
                              {bookSearchResults.total_pages > 1 && (
                                <div className="flex items-center space-x-2">
                                  <Button
                                    onClick={() => searchBooks(bookSearchQuery, bookTitleSearch, bookAuthorSearch, currentPage - 1)}
                                    disabled={currentPage <= 1}
                                    variant="outline"
                                    size="sm"
                                    className="!rounded-button"
                                  >
                                    <i className="fas fa-chevron-left"></i>
                                  </Button>
                                  <span className="text-sm text-gray-600">
                                    {currentPage} / {bookSearchResults.total_pages}
                                  </span>
                                  <Button
                                    onClick={() => searchBooks(bookSearchQuery, bookTitleSearch, bookAuthorSearch, currentPage + 1)}
                                    disabled={currentPage >= bookSearchResults.total_pages}
                                    variant="outline"
                                    size="sm"
                                    className="!rounded-button"
                                  >
                                    <i className="fas fa-chevron-right"></i>
                                  </Button>
                                </div>
                              )}
                            </div>
                            <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
                              {bookSearchResults.books.map((book) => (
                                <div
                                  key={book.id}
                                  onClick={() => handleBookSelect(book)}
                                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${
                                    selectedBook?.id === book.id ? 'bg-blue-50 border-blue-200' : ''
                                  }`}
                                >
                                  <div className="flex items-start space-x-3">
                                    {book.cover_image ? (
                                      <img
                                        src={book.cover_image}
                                        alt={book.title}
                                        className="w-12 h-16 object-cover rounded"
                                      />
                                    ) : (
                                      <div className="w-12 h-16 bg-gray-200 rounded flex items-center justify-center">
                                        <i className="fas fa-book text-gray-400"></i>
                                      </div>
                                    )}
                                    <div className="flex-1">
                                      <h5 className="font-medium text-gray-900">{book.title}</h5>
                                      <p className="text-sm text-gray-600">{book.author}</p>
                                      {book.description && (
                                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                          {book.description}
                                        </p>
                                      )}
                                      <div className="flex items-center space-x-2 mt-2">
                                        <Badge variant="secondary" className="text-xs">
                                          {book.total_chapters} bölüm
                                        </Badge>
                                        {book.genre && (
                                          <Badge variant="outline" className="text-xs">
                                            {book.genre}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Seçilen Kitabın Bölümleri */}
                        {selectedBook && (
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-md font-medium text-gray-700">
                                "{selectedBook.title}" Bölümleri
                              </h4>
                              {isLoadingChapters && (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                              )}
                            </div>
                            {isLoadingChapters ? (
                              <div className="flex flex-col items-center justify-center p-8 border border-gray-200 rounded-lg">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                <span className="ml-3 text-gray-600 mt-2">Bölümler yükleniyor...</span>
                                <span className="text-sm text-gray-500 mt-1">
                                  {selectedBook?.text_url ? 'Kitap metni URL\'den çıkarılıyor...' : 'Veritabanından yükleniyor...'}
                                </span>
                              </div>
                            ) : bookChapters.length > 0 ? (
                              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                                {bookChapters.map((chapter) => (
                                  <div
                                    key={chapter.id}
                                    onClick={() => handleChapterSelect(chapter)}
                                    className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-green-50 transition-colors ${
                                      selectedChapter?.id === chapter.id ? 'bg-green-50 border-green-200' : ''
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <h6 className="font-medium text-gray-900">
                                          Bölüm {chapter.chapter_index}: {chapter.chapter_title}
                                        </h6>
                                        <p className="text-sm text-gray-600">
                                          {chapter.chapter_text ? `${chapter.chapter_text.split(' ').length} kelime` : 'Kelime sayısı hesaplanıyor...'}
                                        </p>
                                      </div>
                                      {selectedChapter?.id === chapter.id && (
                                        <i className="fas fa-check-circle text-green-600"></i>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="p-4 border border-gray-200 rounded-lg text-center text-gray-500">
                                Bu kitap için bölüm bulunamadı.
                              </div>
                            )}
                          </div>
                        )}

                        {/* Mevcut Ses Uyarısı */}
                        {existingAudio && selectedChapter && (
                          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-start space-x-3">
                              <i className="fas fa-info-circle text-green-600 mt-1"></i>
                              <div>
                                <h5 className="font-medium text-green-800">Mevcut Ses Bulundu!</h5>
                                <p className="text-sm text-green-700 mt-1">
                                  Bu bölüm için aynı ayarlarla ({existingAudio.voice_model}, {existingAudio.speaking_rate}x hız, {existingAudio.level?.toUpperCase() || 'Bilinmeyen'} seviye) 
                                  daha önce oluşturulmuş ses dosyası mevcut. Yeni ses oluşturmak yerine mevcut sesi kullanabilirsiniz.
                                </p>
                                <Button
                                  onClick={() => {
                                    setAudioResult({
                                      message: selectedChapter.chapter_text,
                                      mp3_url: existingAudio.mp3_url,
                                      vtt_url: existingAudio.vtt_url || '',
                                      level: existingAudio.level
                                    });
                                  }}
                                  className="mt-2 bg-green-600 hover:bg-green-700 !rounded-button"
                                  size="sm"
                                >
                                  <i className="fas fa-play mr-2"></i>
                                  Mevcut Sesi Kullan
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Seçilen Bölüm İçeriği */}
                        {selectedChapter && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Seçilen Bölüm İçeriği:
                            </label>
                            <div className="relative">
                              <textarea
                                value={textInput}
                                onChange={(e) => setTextInput(e.target.value)}
                                className="w-full min-h-[200px] p-4 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500 resize-none"
                                placeholder="Bölüm içeriği burada görünecek..."
                              />
                              <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded text-xs text-gray-500">
                                {selectedChapter.chapter_text ? selectedChapter.chapter_text.split(' ').length : 0} kelime
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Diğer içerik türleri için genel textarea */}
                    {contentType !== 'topic' && contentType !== 'subject' && contentType !== 'book' && contentType !== 'podcast' && (
                      <div className="relative">
                        <textarea
                          value={textInput}
                          onChange={(e) => setTextInput(e.target.value)}
                          placeholder="İngilizce'ye çevirmek veya ses oluşturmak istediğiniz metni buraya girin..."
                          className="w-full min-h-[200px] p-4 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500 resize-none"
                        />
                        <button className="absolute bottom-3 right-3 text-gray-500 hover:text-blue-600 cursor-pointer">
                          <i className="fas fa-edit text-xl"></i>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8 border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold mr-4">
                  2
                </div>
                <h2 className="text-2xl font-bold text-blue-600">Ses Ayarları</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Sol Kolon - İngilizce Seviyesi ve Konuşma Hızı */}
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-3">İngilizce Seviyesi</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
                    {levelOptions.map((level) => (
                      <Button
                        key={level}
                        onClick={() => setEnglishLevel(level.toLowerCase())}
                        variant={englishLevel === level.toLowerCase() ? "default" : "outline"}
                        className={`!rounded-button whitespace-nowrap cursor-pointer ${
                          englishLevel === level.toLowerCase() ? 'bg-blue-600' : ''
                        }`}
                      >
                        {level}
                      </Button>
                    ))}
                  </div>
                  <h3 className="text-lg font-medium text-gray-700 mb-3">Konuşma Hızı</h3>
                  <div className="grid grid-cols-4 gap-2 mb-6">
                    {rateOptions.map((rate) => (
                      <Button
                        key={rate.value}
                        onClick={() => setSpeakingRate(rate.value)}
                        variant={speakingRate === rate.value ? "default" : "outline"}
                        className={`!rounded-button whitespace-nowrap cursor-pointer ${
                          speakingRate === rate.value ? 'bg-blue-600' : ''
                        }`}
                      >
                        {rate.label}
                      </Button>
                    ))}
                  </div>

                  {/* Cinsiyet ve Aksan Filtreleri */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="text-md font-medium text-gray-600 mb-2">Cinsiyet</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {genderOptions.map((gender) => (
                          <Button
                            key={gender.value}
                            onClick={() => setSelectedGender(gender.value)}
                            variant={selectedGender === gender.value ? "default" : "outline"}
                            size="sm"
                            className={`!rounded-button whitespace-nowrap cursor-pointer ${
                              selectedGender === gender.value ? 'bg-blue-600' : ''
                            }`}
                          >
                            {gender.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-md font-medium text-gray-600 mb-2">Aksan</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {accentVoiceOptions.map((accent) => (
                          <Button
                            key={accent.value}
                            onClick={() => setSelectedAccent(accent.value)}
                            variant={selectedAccent === accent.value ? "default" : "outline"}
                            size="sm"
                            className={`!rounded-button whitespace-nowrap cursor-pointer ${
                              selectedAccent === accent.value ? 'bg-blue-600' : ''
                            }`}
                          >
                            {accent.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* SSML Desteği Filtresi */}



                </div>

                {/* Sağ Kolon - Ses Kategorisi */}
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-3">Ses Kategorisi</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    {voiceCategories.map((category) => (
                      <Button
                        key={category.value}
                        onClick={() => {
                          setSelectedVoiceCategory(category.value);
                          // Kategori değiştiğinde ilk sesi seç
                          const categoryVoices = detailedVoices[category.value as keyof typeof detailedVoices];
                          if (categoryVoices && categoryVoices.length > 0) {
                            setVoiceType(categoryVoices[0].id);
                          }
                        }}
                        variant={selectedVoiceCategory === category.value ? "default" : "outline"}
                        className={`!rounded-button cursor-pointer h-auto flex flex-col items-center justify-center p-2 text-center transition-all duration-200 ${
                          selectedVoiceCategory === category.value ? 'bg-blue-600' : ''
                        }`}
                      >
                        {/* İkon ve Label */}
                        <div className="flex items-center justify-center space-x-1 mb-1 min-h-[24px]">
                          <i className={`${category.icon} text-xs`}></i>
                          <span className="font-medium text-xs leading-none">{category.label}</span>
                        </div>
                        
                        {/* Badge */}
                        <Badge 
                          variant="outline" 
                          className={`text-xs px-1.5 py-0.5 mb-1 ${
                            category.badge === 'Ücretsiz' ? 'bg-green-100 text-green-700 border-green-200' :
                            category.badge === 'Premium' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                            category.badge === 'Gold' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                            category.badge === 'Platinium' ? 'bg-gray-100 text-gray-700 border-gray-200' : ''
                          }`}
                        >
                          {category.badge}
                        </Badge>
                        
                        {/* SSML Support */}
                        {category.ssmlSupport && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full leading-none">
                            SSML
                          </span>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mevcut Sesler - Full Width */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-md font-medium text-gray-600">Mevcut Sesler</h4>
                  {/* Aktif Filtre Göstergesi */}
                  {(selectedAccent !== 'all' || selectedGender !== 'all' || selectedVoiceCategory !== 'standard') && (
                    <div className="flex items-center space-x-2 text-xs">
                      <i className="fas fa-filter text-blue-600"></i>
                      <span className="text-blue-600 font-medium">
                        Filtre aktif:
                        {selectedVoiceCategory !== 'standard' && ` ${selectedVoiceCategory.charAt(0).toUpperCase() + selectedVoiceCategory.slice(1)}`}
                        {selectedAccent !== 'all' && ` ${selectedAccent}`}
                        {selectedGender !== 'all' && ` ${selectedGender}`}
                        {voiceType && ` • ${getSelectedVoiceLabel()}`}
                      </span>
                    </div>
                  )}
                </div>
                <div className="border border-gray-200 rounded-lg p-2 mb-6">
                  <div className="max-h-40 overflow-y-auto pr-1">
                    {getFilteredVoices().length > 0 ? (
                      <div className="space-y-2">
                      {getFilteredVoices().map((voice) => {
                        // Backend voices use 'name' as ID, hardcoded voices use 'id'
                        const voiceId = voice.name || voice.id;
                        const voiceName = voice.displayName || (voice.name ? voice.name.replace(/^[a-z]{2}-[A-Z]{2}-/, '') : voice.id);
                        const isDefault = savedDefaultVoice && ((voice.name || voice.id) === savedDefaultVoice);
                        
                        return (
                          <label
                            key={voiceId}
                            className={`flex items-center p-2 rounded cursor-pointer border transition-colors ${
                              isDefault ? 'bg-green-50 border-green-300 ring-1 ring-green-300' : 'hover:bg-gray-50 border-transparent'
                            }`}
                          >
                            <input
                              type="radio"
                              name="voice"
                              value={voiceId}
                              checked={voiceType === voiceId}
                              onChange={(e) => setVoiceType(e.target.value)}
                              className="mr-3 text-blue-600"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-sm">
                                {voiceName} <span className="text-gray-400 font-mono">[{voiceId}]</span>
                                {isDefault && (
                                  <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                    Varsayılan
                                  </span>
                                )}
                                {voice.ssmlSupport && (
                                  <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                    SSML destekler
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">
                                {/* Accent bilgisi */}
                                {voice.accent === 'american' || voice.languageCode?.includes('US') ? 'Amerikan' : 
                                 voice.accent === 'british' || voice.languageCode?.includes('GB') ? 'İngiliz' : 
                                 voice.accent === 'australian' || voice.languageCode?.includes('AU') ? 'Avustralya' : 
                                 voice.accent || voice.languageCode || 'Bilinmeyen'} • 
                                {/* Gender bilgisi */}
                                {voice.gender === 'MALE' || voice.gender === 'male' ? 'Erkek' : 
                                 voice.gender === 'FEMALE' || voice.gender === 'female' ? 'Kadın' : 'Bilinmeyen'}
                                {/* Voice type bilgisi backend'den geliyorsa */}
                                {voice.category && (
                                  <span className="ml-1">
                                    • {voice.category.charAt(0).toUpperCase() + voice.category.slice(1)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-4">
                        <i className="fas fa-info-circle mb-2"></i>
                        <p>Seçilen filtrelere uygun ses bulunamadı.</p>
                      </div>
                    )}
                  </div>
                  {voiceType && (
                    <div className="pt-2 mt-2 border-t text-right">
                      <Button
                        onClick={async () => {
                          try {
                            const { saveDefaultVoice } = await import('../src/lib/api');
                            await saveDefaultVoice(voiceType);
                            alert('Varsayılan ses kaydedildi');
                          } catch (e: any) {
                            alert('Kaydedilemedi: ' + (e.message || 'Bilinmeyen hata'));
                          }
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white !rounded-button cursor-pointer"
                      >
                        Varsayılan Ses Seç
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* DUYGU TONU - Geçici olarak gizlendi */}
              {/*
              <h3 className="text-lg font-medium text-gray-700 mb-3">Duygu Tonu</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
                {emotionOptions.map((emotion) => (
                  <Button
                    key={emotion.value}
                    onClick={() => setEmotionType(emotion.value)}
                    variant={emotionType === emotion.value ? "default" : "outline"}
                    className={`!rounded-button whitespace-nowrap cursor-pointer ${
                      emotionType === emotion.value ? 'bg-blue-600' : ''
                    }`}
                  >
                    {emotion.label}
                  </Button>
                ))}
              </div>
              */}
              
              {/* ÇIKTI FORMATı - Geçici olarak gizlendi */}
              {/*
              <h3 className="text-lg font-medium text-gray-700 mb-3">Çıktı Formatı</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
                {formatOptions.map((format) => (
                  <Button
                    key={format}
                    onClick={() => setOutputFormat(format.toLowerCase())}
                    variant={outputFormat === format.toLowerCase() ? "default" : "outline"}
                    className={`!rounded-button whitespace-nowrap cursor-pointer ${
                      outputFormat === format.toLowerCase() ? 'bg-blue-600' : ''
                    }`}
                  >
                    {format}
                  </Button>
                ))}
              </div>
              */}
              
              <div className="mt-4">
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-blue-800">Mevcut Üyelik Planınız</h3>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                      {currentPlanName || 'Ücretsiz Plan'}
                    </Badge>
                  </div>
                  <div className={remaining <= 0 ? "text-sm text-red-600" : "text-sm text-blue-600"}>
                    {remaining <= 0 ? (
                      <>
                        <p className="mb-2 font-semibold"><i className="fas fa-exclamation-triangle mr-2"></i>Ses oluşturma hakkınız bitti!</p>
                        <p className="mb-3 text-xs">Premium pakete yükselterek sınırsız ses oluşturabilirsiniz.</p>
                      </>
                    ) : (
                      <p className="mb-2"><i className="fas fa-info-circle mr-2"></i>Günlük {remaining}/{dailyLimit} ses dönüşümü hakkınız kaldı.</p>
                    )}
                    <div className="flex items-center mt-3">
                      <Button 
                        variant="outline" 
                        className="mr-3 !rounded-button whitespace-nowrap cursor-pointer"
                        onClick={() => router.push('/fiyatlandirma')}
                      >
                        <i className="fas fa-crown text-yellow-500 mr-2"></i>Premium'a Yükselt
                      </Button>
                      <a 
                        href="/fiyatlandirma" 
                        className="text-blue-600 hover:text-blue-700 text-sm"
                        onClick={(e) => {
                          e.preventDefault();
                          router.push('/fiyatlandirma');
                        }}
                      >
                        Tüm planları karşılaştır
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center mt-8">
            <Button
              onClick={handleGenerate}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg flex items-center space-x-2 !rounded-button whitespace-nowrap cursor-pointer"
            >
              {isLoading ? (
                <>
                  <i className="fas fa-circle-notch fa-spin"></i>
                  <span>Ses Oluşturuluyor...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-volume-up"></i>
                  <span>Ses Oluştur</span>
                </>
              )}
            </Button>
          </div>

          {/* Output Section */}
          {audioResult && (
            <Card className="mt-8 border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold mr-4">
                    <i className="fas fa-check"></i>
                  </div>
                  <h2 className="text-2xl font-bold text-green-600">Ses Oluşturuldu</h2>
                </div>
                <OutputSection 
                  audioResult={audioResult} 
                  isLoggedIn={isAuthenticated}
                />
              </CardContent>
            </Card>
          )}

          {/* Content History Section */}
          {isAuthenticated && (
            <Card className="mt-12 border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold mr-4">
                      <i className="fas fa-history"></i>
                    </div>
                    <h2 className="text-2xl font-bold text-purple-600">Ses Geçmişim</h2>
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
                        Yükleniyor
                      </>
                    ) : (
                      <>
                        <i className="fas fa-refresh mr-2"></i>
                        Yenile
                      </>
                    )}
                  </Button>
                </div>

                {loadingHistory ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                  </div>
                ) : contentHistory.length > 0 ? (
                  <div className="space-y-4">
                    {(showAllHistory ? contentHistory : contentHistory.slice(0, 5)).map((item) => (
                      <div key={item.id} className="bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
                        {/* Compact Header - Always Visible */}
                        <div 
                          className="p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => {
                            console.log('🎯 [HISTORY DEBUG] Item clicked:', {
                              itemId: item.id,
                              currentExpanded: expandedHistoryItem,
                              willBeExpanded: expandedHistoryItem === item.id ? null : item.id,
                              mp3_url: item.mp3_url,
                              hasTimepoints: !!item.timepoints,
                              timepointsLength: item.timepoints?.length || 0
                            });
                            setExpandedHistoryItem(expandedHistoryItem === item.id ? null : item.id);
                          }}
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {(item.input_type || 'unknown').toUpperCase()}
                                </Badge>
                                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                  {item.level || 'N/A'}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  {new Date(item.created_at).toLocaleDateString('tr-TR', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              <div className="mb-3">
                                <h4 className="font-medium text-gray-800 mb-1">İngilizce Metin (Seviyenize Uyarlanmış):</h4>
                                <p className="text-sm text-gray-600 line-clamp-2">
                                  {item.adapted_text || item.input}
                                </p>
                                {item.adapted_text && (
                                  <details className="mt-2">
                                    <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                                      Orijinal Türkçe metni göster
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
                                {expandedHistoryItem === item.id ? 'Daralt' : 'Oynatıcıyı Aç'}
                              </div>
                              <i className={`fas ${expandedHistoryItem === item.id ? 'fa-chevron-up' : 'fa-chevron-down'} text-gray-400`}></i>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Player View - Toggleable */}
                        {expandedHistoryItem === item.id && (
                          <div className="border-t border-gray-200 bg-white p-6">
                            {/* GİZLENDİ - Senkronize Oynatıcı başlığı ve debug console.log */}
                            
                            {/* Use OutputSection component for full functionality */}
                            {(() => {
                              const audioResult = {
                                message: item.adapted_text || item.input,
                                mp3_url: item.mp3_url,
                                vtt_url: item.mp3_url.replace('.mp3', '.vtt'), // Assume VTT exists
                                level: item.level,
                                timepoints: (() => {
                                  try {
                                    return Array.isArray(item.timepoints) ? item.timepoints : (item.timepoints ? JSON.parse(item.timepoints) : []);
                                  } catch (e) {
                                    console.warn('Failed to parse timepoints:', e);
                                    return [];
                                  }
                                })(),
                                words: (() => {
                                  try {
                                    return Array.isArray(item.words) ? item.words : (item.words ? JSON.parse(item.words) : (item.adapted_text || item.input).split(/\s+/).filter(word => word.length > 0));
                                  } catch (e) {
                                    console.warn('Failed to parse words:', e);
                                    return (item.adapted_text || item.input).split(/\s+/).filter(word => word.length > 0);
                                  }
                                })(),
                                original_turkish: item.input,
                                speaking_rate: 1.0
                              };
                              
                              console.log('🔍 [OUTPUT DEBUG] About to pass to OutputSection:', {
                                hasMessage: !!audioResult.message,
                                hasMp3Url: !!audioResult.mp3_url,
                                messageLength: audioResult.message?.length || 0,
                                timepointsLength: audioResult.timepoints?.length || 0,
                                wordsLength: audioResult.words?.length || 0,
                                mp3_url: audioResult.mp3_url,
                                firstFewWords: audioResult.words?.slice(0, 5)
                              });
                              
                              return (
                                <OutputSection 
                                  audioResult={audioResult}
                              isLoggedIn={isAuthenticated}
                            />
                              );
                            })()}

                            {/* Quick actions */}
                            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
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
                                Yeni Sekmede Aç
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
                                Kapat
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
                          {showAllHistory ? 'Daha Az Göster' : 'Daha Fazla Göster'}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-4">
                      <i className="fas fa-microphone-slash text-4xl"></i>
                    </div>
                    <h3 className="text-lg font-medium text-gray-500 mb-2">Henüz ses kaydınız yok</h3>
                    <p className="text-gray-400">İlk ses kaydınızı oluşturmak için yukarıdaki formu kullanın.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Welcome; 