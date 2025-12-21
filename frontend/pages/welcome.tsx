'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useAuth } from '../src/lib/auth';
import { useMembership } from '../src/context/MembershipContext';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  FaUserEdit,
  FaVolumeUp,
  FaBook,
  FaCheckCircle,
  FaExclamationCircle,
  FaSitemap,
  FaPodcast,
  FaLightbulb,
  FaYoutube,
  FaFileWord,
  FaFileAlt,
  FaLink,
  FaGraduationCap,
  FaPlus,
} from 'react-icons/fa';
import { MessageSquare } from 'lucide-react';
import { processTts, submitContent, getContentHistory, getUserInterests, getTopicDetailSuggestions, rewriteToNarration, ProcessInputData, getUsageSummary, createPodcast, PodcastCreationParams, generateHobbySuggestions, getRandomHobbySuggestions, checkHobbyExists, getUserBookFavorites, saveUserBookFavorites, getHashtagNews, HashtagNewsItem, fetchArticleDetails, createDocumentFromText, DocumentRecord, DocumentSection } from '../src/lib/api';
import PlanRequired from '../src/components/PlanRequired';
import { useTranslation } from '../src/lib/i18n';
import InputSection from '../src/components/InputSection';
import OutputSection from '../src/components/OutputSection';
import Footer from '../src/components/Footer';
import TopicHierarchySection from '../src/components/TopicHierarchy/TopicHierarchySection';
import InterestManager from '../src/components/InterestManager';
import { WelcomePopup } from '../src/components/welcome/WelcomePopup';
import { Button } from "../src/components/ui/button";
import { Input } from "../src/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../src/components/ui/tabs";
import { Slider } from "../src/components/ui/slider";
import { Card, CardContent } from "../src/components/ui/card";
import { Badge } from "../src/components/ui/badge";
import BrandWordmark from "../src/components/BrandWordmark";
import LiroAvatar from "../src/components/LiroAvatar";
import { ProfileDropdownMenu } from "../src/components/shared/ProfileDropdownMenu";
import NotificationBell from "../src/components/NotificationBell";

interface InputData {
  type: ProcessInputData['type'];
  text?: string;
  input?: string;
  file?: File;
  level: string;
  SesHızı?: number;
  voice?: string;
  chapter?: string;
  chapter_id?: string;
}

interface ContentTypeOption {
  id: string;
  name: string;
  icon: React.ReactNode;
}

interface AudioResult {
  success?: boolean;
  message: string;
  dialogue?: string;
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
  adapted_text?: string;
  translated_text?: string;
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
    return labels[key] || (inputType ? inputType.toUpperCase() : 'DİĞER');
  };

  const historyTypeOptions = [
    { id: 'topic', label: t('content_type_topic_tree') },
    { id: 'book', label: t('book') },
    { id: 'document', label: t('document') },
    { id: 'podcast', label: t('podcast') },
    { id: 'youtube', label: t('youtube') },
    { id: 'weblink', label: t('web_link') },
    { id: 'text', label: t('text') },
    { id: 'subject', label: t('subject') },
  ];

  const normalizedPlanName = (currentPlanName || '').toLowerCase();
  const isPlatinumPlan =
    normalizedPlanName.includes('platin') || normalizedPlanName.includes('platinum');

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
      if ((user as any)?.name) return (user as any).name as string;
      if (user?.email) return user.email.split('@')[0];
      return t('user_default');
    } catch {
      return (
        ((user as any)?.name as string) ||
        (user?.email ? user.email.split('@')[0] : t('user_default'))
      );
    }
  };

  const displayName = getDisplayName();
  const avatar =
    (user as any)?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}`;
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [audioResult, setAudioResult] = useState<AudioResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPlanRequired, setShowPlanRequired] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [showWelcomeLoader, setShowWelcomeLoader] = useState<boolean>(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState<boolean>(false);

  // Welcome popup kontrolü - URL'den showWelcome parametresini kontrol et
  useEffect(() => {
    if (!router.isReady) return;

    const { showWelcome } = router.query;
    if (showWelcome === 'true') {
      setShowWelcomePopup(true);
      // URL'den parametreyi temizle
      const newQuery = { ...router.query };
      delete newQuery.showWelcome;
      router.replace({ pathname: router.pathname, query: newQuery }, undefined, { shallow: true });
    }

    // SessionStorage'dan justRegistered flag'ini kontrol et
    try {
      const justRegistered = sessionStorage.getItem('justRegistered');
      if (justRegistered === 'true') {
        setShowWelcomePopup(true);
        sessionStorage.removeItem('justRegistered');
      }
    } catch { }
  }, [router.isReady, router.query]);

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
    } catch { }
  }, [router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const tsRaw = localStorage.getItem('justLoggedIn') || '0';
      const ts = Number(tsRaw);
      if (ts && Date.now() - ts < 5000) {
        setShowWelcomeLoader(true);
        const timeout = setTimeout(() => setShowWelcomeLoader(false), 1500);
        return () => clearTimeout(timeout);
      }
    } catch { }
  }, []);

  // Auth guard: Giriş yapılmadıysa login sayfasına yönlendir
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !user)) {
      const target = typeof window !== 'undefined' ? window.location.pathname + window.location.search + window.location.hash : '/welcome';
      router.push(`/login?next=${encodeURIComponent(target)}`);
    }
  }, [authLoading, isAuthenticated, user, router]);

  // 🎯 Chat'ten ve URL'den gelen parametreleri işle
  useEffect(() => {
    if (!router.isReady) return;

    const { topic, action, text, contentType: contentTypeFromQuery } = router.query;

    // URL'den içerik türü (ör: ?contentType=book)
    if (typeof contentTypeFromQuery === 'string') {
      setContentType(contentTypeFromQuery);
    }

    // action: 'create' -> Konu sekmesi + topic yerleştir
    if (action === 'create' && typeof topic === 'string') {
      setContentType('subject');
      setTextInput(topic);
      console.log('📝 Chat\'ten konu alındı:', topic);
    }

    // action: 'audio' -> Metin sekmesi + text yerleştir
    if (action === 'audio' && typeof text === 'string') {
      setContentType('text');
      setTextInput(text);
      console.log('🎵 Chat\'ten metin alındı (ses oluşturma)');

      // Otomatik scroll (opsiyonel)
      setTimeout(() => {
        window.scrollTo({ top: 400, behavior: 'smooth' });
      }, 300);
    }
  }, [router.isReady, router.query]);

  // Yeni tasarım için state'ler
  const [contentType, setContentType] = useState<string>('text');
  const [englishLevel, setEnglishLevel] = useState<string>('a1');
  const [speakingRate, setSpeakingRate] = useState<number>(0.8);
  const [voiceType, setVoiceType] = useState<string>('');
  const [savedDefaultVoice, setSavedDefaultVoice] = useState<string | null>(null);
  const [defaultApplied, setDefaultApplied] = useState<boolean>(false);
  const [accentType, setAccentType] = useState<string>('american');
  const [emotionType, setEmotionType] = useState<string>('all');
  const [outputFormat, setOutputFormat] = useState<string>('mp3');
  const [textInput, setTextInput] = useState<string>('');
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const [documentTitle, setDocumentTitle] = useState<string>('');
  const [creatingDocument, setCreatingDocument] = useState<boolean>(false);
  const [lastCreatedDocument, setLastCreatedDocument] = useState<DocumentRecord | null>(null);
  const [lastDocumentSections, setLastDocumentSections] = useState<DocumentSection[]>([]);
  const [contentHistory, setContentHistory] = useState<ContentHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [showAllHistory, setShowAllHistory] = useState<boolean>(false);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [loadingInterests, setLoadingInterests] = useState<boolean>(false);
  const [selectedInterest, setSelectedInterest] = useState<string>('');
  const [showInterestManager, setShowInterestManager] = useState<boolean>(false);
  const [topicDetailSuggestions, setTopicDetailSuggestions] = useState<string[]>([]);
  const [isLoadingTopicSuggestions, setIsLoadingTopicSuggestions] = useState<boolean>(false);
  const [selectedDetailTopic, setSelectedDetailTopic] = useState<string>('');
  const [isGeneratingHobbySuggestions, setIsGeneratingHobbySuggestions] = useState<boolean>(false);
  const [hobbyExists, setHobbyExists] = useState<boolean>(false);
  const [hobbyNewsLimit, setHobbyNewsLimit] = useState<number>(5);
  const [hobbyNews, setHobbyNews] = useState<HashtagNewsItem[]>([]);
  const [isLoadingHobbyNews, setIsLoadingHobbyNews] = useState<boolean>(false);
  const [hobbyNewsError, setHobbyNewsError] = useState<string | null>(null);
  const [articleDetails, setArticleDetails] = useState<Record<string, string>>({});
  const [loadingArticleId, setLoadingArticleId] = useState<string | null>(null);
  const [articleDetailError, setArticleDetailError] = useState<string | null>(null);
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
  const [showAudioSettings, setShowAudioSettings] = useState<boolean>(false);

  // İçerik süresi seçenekleri (tüm modlar için ortak)
  // 1.5 dk, 5 dk, 10 dk, 15 dk seçenekleri
  const DURATION_OPTIONS = [
    { value: 1.5, label: `1.5 ${t('duration_min')}`, description: t('duration_words_approx').replace('{count}', '225') },
    { value: 5, label: `5 ${t('duration_min')}`, description: t('duration_words_approx').replace('{count}', '750') },
    { value: 10, label: `10 ${t('duration_min')}`, description: t('duration_words_approx').replace('{count}', '1500') },
    { value: 15, label: `15 ${t('duration_min')}`, description: t('duration_words_approx').replace('{count}', '2250') },
  ];
  const [contentDuration, setContentDuration] = useState<number>(5); // Varsayılan 5 dakika

  // Podcast state'leri
  const [podcastTopic, setPodcastTopic] = useState<string>('');
  const [podcastDuration, setPodcastDuration] = useState<number>(5); // Podcast için varsayılan 5 dk
  const [podcastStyleType, setPodcastStyleType] = useState<string>('friendly_chat');
  const [podcastVoiceChoice, setPodcastVoiceChoice] = useState<string>('english_female');
  const [podcastHostSpeakerId, setPodcastHostSpeakerId] = useState<string>('Kore');
  const [podcastGuestSpeakerId, setPodcastGuestSpeakerId] = useState<string>('Puck');
  const [podcastPersonalityA, setPodcastPersonalityA] = useState<string>('curious_enthusiast');
  const [podcastPersonalityB, setPodcastPersonalityB] = useState<string>('knowledgeable_friend');
  const [podcastIncludeHumor, setPodcastIncludeHumor] = useState<boolean>(true);
  const [podcastIncludeFiller, setPodcastIncludeFiller] = useState<boolean>(true);
  const [isCreatingPodcast, setIsCreatingPodcast] = useState<boolean>(false);
  const [podcastError, setPodcastError] = useState<string | null>(null);

  const GEMINI_PODCAST_SPEAKERS = [
    { value: 'Aoede', label: 'Aoede (F)' },
    { value: 'Kore', label: 'Kore (F)' },
    { value: 'Leda', label: 'Leda (F)' },
    { value: 'Callirrhoe', label: 'Callirrhoe (F)' },
    { value: 'Zephyr', label: 'Zephyr (F)' },
    { value: 'Charon', label: 'Charon (M)' },
    { value: 'Fenrir', label: 'Fenrir (M)' },
    { value: 'Orus', label: 'Orus (M)' },
    { value: 'Puck', label: 'Puck (M)' },
    { value: 'Achilles', label: 'Achilles (M)' },
  ];

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
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [favoriteBookIds, setFavoriteBookIds] = useState<number[]>([]);

  // Content history expanded view state
  const [expandedHistoryItem, setExpandedHistoryItem] = useState<string | null>(null);
  const [activeHistoryTypes, setActiveHistoryTypes] = useState<string[]>(
    historyTypeOptions.map((t) => t.id)
  );

  // İçerik türü seçenekleri
  const contentTypeOptions: ContentTypeOption[] = [
    { id: 'topic_tree', name: t('content_type_topic_tree'), icon: <FaSitemap /> },
    { id: 'book', name: t('book'), icon: <FaBook /> },
    { id: 'podcast', name: t('podcast'), icon: <FaPodcast /> },
    { id: 'topic', name: t('content_type_hobbies'), icon: <FaLightbulb /> },
    { id: 'youtube', name: t('youtube'), icon: <FaYoutube /> },
    { id: 'document', name: t('document'), icon: <FaFileWord /> },
    { id: 'text', name: t('text'), icon: <FaFileAlt /> },
    { id: 'weblink', name: t('web_link'), icon: <FaLink /> },
    { id: 'subject', name: t('subject'), icon: <FaGraduationCap /> },
    { id: 'custom', name: t('content_type_custom'), icon: <FaPlus /> },
  ];

  const levelOptions = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const rateOptions = [
    { value: 0.7, label: '0.7x' },
    { value: 0.8, label: '0.8x' },
    { value: 1.0, label: '1x' },
    { value: 1.2, label: '1.2x' },
  ];
  const accentOptions = [
    { value: 'all', label: t('voice_accent_all') },
    { value: 'american', label: t('voice_accent_american') },
    { value: 'british', label: t('voice_accent_british') },
    { value: 'australian', label: t('voice_accent_australian') },
    { value: 'canadian', label: t('voice_accent_canadian') },
    { value: 'indian', label: t('voice_accent_indian') },
    { value: 'international', label: t('voice_accent_international') }
  ];

  const emotionOptions = [
    { value: 'all', label: t('emotion_all') },
    { value: 'neutral', label: t('emotion_neutral') },
    { value: 'cheerful', label: t('emotion_cheerful') },
    { value: 'serious', label: t('emotion_serious') },
    { value: 'professional', label: t('emotion_professional') },
    { value: 'excited', label: t('emotion_excited') },
    { value: 'calm', label: t('emotion_calm') },
    { value: 'friendly', label: t('emotion_friendly') }
  ];
  const formatOptions = ['MP3', 'WAV', 'AAC', 'FLAC', 'OGG'];

  // Ses kategorileri - TTS provider'a göre dinamik
  const voiceCategories = ttsProvider === 'google'
    ? [
      { value: 'standard', label: t('voice_cat_standard'), icon: 'fas fa-volume-up', ssmlSupport: false },
      { value: 'wavenet', label: t('voice_cat_wavenet'), icon: 'fas fa-star', badge: 'Premium', badgeLabel: t('badge_premium'), ssmlSupport: true },
      { value: 'neural2', label: t('voice_cat_neural2'), icon: 'fas fa-brain', badge: 'Premium', badgeLabel: t('badge_premium'), ssmlSupport: true },
      { value: 'studio', label: t('voice_cat_studio'), icon: 'fas fa-crown', badge: 'Platinium', badgeLabel: t('badge_platinum'), ssmlSupport: true },
      { value: 'chirp3d', label: t('voice_cat_chirp3d'), icon: 'fas fa-gem', badge: 'Gold', badgeLabel: t('badge_gold'), ssmlSupport: true }
    ]
    : [ // Amazon Polly categories
      { value: 'standard', label: 'Standard', icon: 'fas fa-volume-up', ssmlSupport: false },
      { value: 'neural', label: 'Neural', icon: 'fas fa-star', badge: 'Premium', badgeLabel: t('badge_premium'), ssmlSupport: true }
    ];

  const getVoiceName = (voice: any) => {
    const accentKey = `voice_accent_${voice.accent}`;
    const accent = t(accentKey) !== accentKey ? t(accentKey) : voice.accent; // fallback if key missing
    const gender = voice.gender === 'male' ? t('male_voice') : t('female_voice');
    const suffix = voice.id.split('-').pop();
    return `${accent} - ${gender} ${suffix}`;
  };

  const detailedVoices = {
    wavenet: [
      { id: 'en-US-Wavenet-A', name: getVoiceName({ accent: 'american', gender: 'male', id: 'en-US-Wavenet-A' }), accent: 'american', gender: 'male', category: 'wavenet', ssmlSupport: true },
      { id: 'en-US-Wavenet-F', name: getVoiceName({ accent: 'american', gender: 'female', id: 'en-US-Wavenet-F' }), accent: 'american', gender: 'female', category: 'wavenet', ssmlSupport: true },
      { id: 'en-GB-Wavenet-B', name: getVoiceName({ accent: 'british', gender: 'male', id: 'en-GB-Wavenet-B' }), accent: 'british', gender: 'male', category: 'wavenet', ssmlSupport: true },
      { id: 'en-GB-Wavenet-C', name: getVoiceName({ accent: 'british', gender: 'female', id: 'en-GB-Wavenet-C' }), accent: 'british', gender: 'female', category: 'wavenet', ssmlSupport: true },
      { id: 'en-AU-Wavenet-A', name: getVoiceName({ accent: 'australian', gender: 'female', id: 'en-AU-Wavenet-A' }), accent: 'australian', gender: 'female', category: 'wavenet', ssmlSupport: true },
      { id: 'en-AU-Wavenet-D', name: getVoiceName({ accent: 'australian', gender: 'male', id: 'en-AU-Wavenet-D' }), accent: 'australian', gender: 'male', category: 'wavenet', ssmlSupport: true }
    ],
    neural2: [
      { id: 'en-US-Neural2-J', name: getVoiceName({ accent: 'american', gender: 'male', id: 'en-US-Neural2-J' }), accent: 'american', gender: 'male', category: 'neural2', ssmlSupport: true },
      { id: 'en-US-Neural2-H', name: getVoiceName({ accent: 'american', gender: 'female', id: 'en-US-Neural2-H' }), accent: 'american', gender: 'female', category: 'neural2', ssmlSupport: true },
      { id: 'en-GB-Neural2-B', name: getVoiceName({ accent: 'british', gender: 'male', id: 'en-GB-Neural2-B' }), accent: 'british', gender: 'male', category: 'neural2', ssmlSupport: true },
      { id: 'en-GB-Neural2-C', name: getVoiceName({ accent: 'british', gender: 'female', id: 'en-GB-Neural2-C' }), accent: 'british', gender: 'female', category: 'neural2', ssmlSupport: true },
      { id: 'en-AU-Neural2-A', name: getVoiceName({ accent: 'australian', gender: 'female', id: 'en-AU-Neural2-A' }), accent: 'australian', gender: 'female', category: 'neural2', ssmlSupport: true },
      { id: 'en-AU-Neural2-C', name: getVoiceName({ accent: 'australian', gender: 'female', id: 'en-AU-Neural2-C' }), accent: 'australian', gender: 'female', category: 'neural2', ssmlSupport: true },
      { id: 'en-AU-Neural2-D', name: getVoiceName({ accent: 'australian', gender: 'male', id: 'en-AU-Neural2-D' }), accent: 'australian', gender: 'male', category: 'neural2', ssmlSupport: true }
    ],
    studio: [
      { id: 'en-US-Studio-M', name: getVoiceName({ accent: 'american', gender: 'male', id: 'en-US-Studio-M' }), accent: 'american', gender: 'male', category: 'studio', ssmlSupport: true },
      { id: 'en-US-Studio-Q', name: getVoiceName({ accent: 'american', gender: 'female', id: 'en-US-Studio-Q' }), accent: 'american', gender: 'female', category: 'studio', ssmlSupport: true },
      { id: 'en-GB-Studio-B', name: getVoiceName({ accent: 'british', gender: 'male', id: 'en-GB-Studio-B' }), accent: 'british', gender: 'male', category: 'studio', ssmlSupport: true },
      { id: 'en-GB-Studio-C', name: getVoiceName({ accent: 'british', gender: 'female', id: 'en-GB-Studio-C' }), accent: 'british', gender: 'female', category: 'studio', ssmlSupport: true }
    ],
    chirp3d: [
      { id: 'en-US-Journey-D', name: getVoiceName({ accent: 'american', gender: 'female', id: 'en-US-Journey-D' }), accent: 'american', gender: 'female', category: 'chirp3d', ssmlSupport: true },
      { id: 'en-US-Journey-O', name: getVoiceName({ accent: 'american', gender: 'male', id: 'en-US-Journey-O' }), accent: 'american', gender: 'male', category: 'chirp3d', ssmlSupport: true },
      { id: 'en-GB-Journey-F', name: getVoiceName({ accent: 'british', gender: 'female', id: 'en-GB-Journey-F' }), accent: 'british', gender: 'female', category: 'chirp3d', ssmlSupport: true },
      { id: 'en-GB-Journey-M', name: getVoiceName({ accent: 'british', gender: 'male', id: 'en-GB-Journey-M' }), accent: 'british', gender: 'male', category: 'chirp3d', ssmlSupport: true }
    ],
    standard: [
      { id: 'en-US-Standard-B', name: getVoiceName({ accent: 'american', gender: 'male', id: 'en-US-Standard-B' }), accent: 'american', gender: 'male', category: 'standard', ssmlSupport: false },
      { id: 'en-US-Standard-C', name: getVoiceName({ accent: 'american', gender: 'female', id: 'en-US-Standard-C' }), accent: 'american', gender: 'female', category: 'standard', ssmlSupport: false },
      { id: 'en-US-Standard-D', name: getVoiceName({ accent: 'american', gender: 'male', id: 'en-US-Standard-D' }), accent: 'american', gender: 'male', category: 'standard', ssmlSupport: false },
      { id: 'en-US-Standard-E', name: getVoiceName({ accent: 'american', gender: 'female', id: 'en-US-Standard-E' }), accent: 'american', gender: 'female', category: 'standard', ssmlSupport: false },
      { id: 'en-GB-Standard-A', name: getVoiceName({ accent: 'british', gender: 'female', id: 'en-GB-Standard-A' }), accent: 'british', gender: 'female', category: 'standard', ssmlSupport: false },
      { id: 'en-GB-Standard-B', name: getVoiceName({ accent: 'british', gender: 'male', id: 'en-GB-Standard-B' }), accent: 'british', gender: 'male', category: 'standard', ssmlSupport: false },
      { id: 'en-GB-Standard-C', name: getVoiceName({ accent: 'british', gender: 'female', id: 'en-GB-Standard-C' }), accent: 'british', gender: 'female', category: 'standard', ssmlSupport: false },
      { id: 'en-GB-Standard-D', name: getVoiceName({ accent: 'british', gender: 'male', id: 'en-GB-Standard-D' }), accent: 'british', gender: 'male', category: 'standard', ssmlSupport: false },
      { id: 'en-AU-Standard-A', name: getVoiceName({ accent: 'australian', gender: 'female', id: 'en-AU-Standard-A' }), accent: 'australian', gender: 'female', category: 'standard', ssmlSupport: false },
      { id: 'en-AU-Standard-B', name: getVoiceName({ accent: 'australian', gender: 'male', id: 'en-AU-Standard-B' }), accent: 'australian', gender: 'male', category: 'standard', ssmlSupport: false },
      { id: 'en-AU-Standard-C', name: getVoiceName({ accent: 'australian', gender: 'female', id: 'en-AU-Standard-C' }), accent: 'australian', gender: 'female', category: 'standard', ssmlSupport: false },
      { id: 'en-AU-Standard-D', name: getVoiceName({ accent: 'australian', gender: 'male', id: 'en-AU-Standard-D' }), accent: 'australian', gender: 'male', category: 'standard', ssmlSupport: false }
    ]
  };

  // YouTube altyazı çekme
  const handleFetchYoutubeSubtitle = async () => {
    if (!youtubeUrl || !/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(youtubeUrl)) {
      setSubtitleError(t('welcome_youtube_invalid_url'));
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
          throw new Error(t('welcome_youtube_no_subtitles'));
        }
        throw new Error(t('welcome_api_error').replace('{status}', `${res.status} ${res.statusText}`));
      }
      const data: any = await res.json();
      if (data?.errorCode === 'NO_SUBTITLES' || data?.detail?.error_code === 'NO_SUBTITLES') {
        throw new Error(t('welcome_youtube_no_subtitles'));
      }
      const subtitleText = data?.text || '';
      if (!subtitleText || subtitleText.trim().length === 0) {
        throw new Error(t('welcome_youtube_no_subtitles'));
      }
      setTextInput(subtitleText);
      console.log('🎬 [YOUTUBE] Subtitles fetched. Length:', subtitleText.length);
    } catch (e: any) {
      console.error('❌ [YOUTUBE] Altyazı çekme hatası:', e);
      setSubtitleError(e?.message || t('welcome_youtube_fetch_failed'));
    } finally {
      setIsFetchingSubtitle(false);
    }
  };

  // Podcast oluşturma fonksiyonu
  const handleCreatePodcast = async () => {
    if (!podcastTopic || podcastTopic.trim().length === 0) {
      setPodcastError(t('validation_enter_podcast_topic'));
      return;
    }

    setIsCreatingPodcast(true);
    setPodcastError(null);

    try {
      // Podcast creation params - hardcoded to Google TTS
      const params: PodcastCreationParams = {
        topic: podcastTopic,
        level: englishLevel.toUpperCase(),
        duration: podcastDuration,
        ttsProvider: 'google',
        hostSpeakerId: podcastHostSpeakerId,
        guestSpeakerId: podcastGuestSpeakerId,
        styleType: podcastStyleType,
        voiceChoice: podcastVoiceChoice,
        personalityA: podcastPersonalityA,
        personalityB: podcastPersonalityB,
        includeHumor: podcastIncludeHumor,
        includeFiller: podcastIncludeFiller,
      };

      console.log('🎙️ [PODCAST] Creating podcast with params:', params);
      const result = await createPodcast(params);

      console.log('🎙️ [PODCAST] Raw result from createPodcast:', {
        success: result?.success,
        podcast_url: result?.podcast_url,
        hasDialogue: !!result?.dialogue,
        dialogueLength: result?.dialogue?.length || 0,
        transcript: result?.transcript?.substring(0, 50),
        allKeys: result ? Object.keys(result) : [],
      });

      if (result.success && result.podcast_url) {
        // Podcast başarıyla oluşturuldu
        // n8n'den gelen vtt_subtitles zaten Supabase URL'si
        const vttUrl = result.vtt_subtitles || '';
        const topic = result.data?.metadata?.topic || podcastTopic;
        const transcriptText = result.transcript || result.message || topic;
        const dialogueText = result.dialogue || '';

        console.log('🎙️ [PODCAST] Dialogue check:', {
          hasDialogue: !!result.dialogue,
          dialogueLength: result.dialogue?.length || 0,
          dialoguePreview: result.dialogue?.substring(0, 100),
          transcriptPreview: transcriptText?.substring(0, 100),
        });

        // Persist MFA alignment data on audioResult so web player can sync precisely
        setAudioResult({
          message: transcriptText,
          dialogue: dialogueText,
          mp3_url: result.podcast_url,
          vtt_url: vttUrl,
          level: englishLevel,
          duration_seconds: result.duration_seconds,
          file_name: result.file_name,
          topic: topic,
          timepoints: result.timepoints || [],
          words: result.words || [],
        });
        console.log('🎙️ [PODCAST] Podcast created successfully:', {
          topic: topic,
          audio: result.podcast_url,
          vtt: vttUrl,
          duration: result.duration_seconds,
          level: englishLevel,
          costs: result.data?.metadata?.costs
        });

        // Podcast'i contenthistory tablosuna kaydet (mevcut submitContent akışını kullanarak)
        try {
          await submitContent(
            topic,
            'podcast',
            englishLevel.toUpperCase(),
            result.podcast_url,
            (dialogueText && dialogueText.trim().length > 0) ? dialogueText : transcriptText,
            transcriptText,
            undefined,
            result.timepoints,
            result.words,
          );
          console.log('🎙️ [PODCAST] Podcast submitted to contenthistory via submitContent');
        } catch (submitErr) {
          console.error('🎙️ [PODCAST] submitContent failed for podcast:', submitErr);
        }
      } else {
        throw new Error(result.message || t('welcome_podcast_create_failed'));
      }
    } catch (e: any) {
      console.error('❌ [PODCAST] Podcast oluşturma hatası:', e);
      setPodcastError(e?.message || t('welcome_podcast_create_failed'));
    } finally {
      setIsCreatingPodcast(false);
    }
  };

  // Konu önerileri alma fonksiyonu
  const handleGetTopicSuggestions = async () => {
    if (!textInput || textInput.trim().length === 0) {
      setError(t('validation_enter_topic'));
      return;
    }

    setIsLoadingTopicSuggestions(true);
    setTopicDetailSuggestions([]);
    setSelectedDetailTopic('');
    setError(null);

    try {
      console.log('📝 Konu önerileri alınıyor:', textInput);

      const result = await getTopicDetailSuggestions(textInput, englishLevel.toUpperCase());

      if (result.success && result.data?.suggestions) {
        setTopicDetailSuggestions(result.data.suggestions);
        console.log('✅ Konu önerileri alındı:', result.data.suggestions.length);
      } else {
        throw new Error(result.message || t('welcome_error_topic_suggestions').replace('{error}', t('welcome_error_unknown')));
      }
    } catch (e: any) {
      console.error('❌ Konu önerileri hatası:', e);
      setError(e?.message || t('welcome_error_topic_suggestions').replace('{error}', t('welcome_error_unknown')));
      setTopicDetailSuggestions([]);
    } finally {
      setIsLoadingTopicSuggestions(false);
    }
  };

  // Hobi için 200 öneri oluştur
  const handleGenerateHobbySuggestions = async () => {
    if (!selectedInterest) {
      setError(t('validation_select_hobby'));
      return;
    }

    setIsGeneratingHobbySuggestions(true);
    setError(null);

    try {
      console.log('🎨 Hobi önerileri oluşturuluyor:', selectedInterest);
      const result = await generateHobbySuggestions(selectedInterest);

      if (result.success) {
        console.log('✅ Hobi önerileri oluşturuldu:', result.data.count);
        setHobbyExists(true);
        // Otomatik olarak 5 rastgele getir
        await handleGetRandomHobbySuggestions();
      } else {
        throw new Error(result.message || t('welcome_hobby_suggestions_create_failed'));
      }
    } catch (e: any) {
      console.error('❌ Hobi önerileri oluşturma hatası:', e);
      setError(e?.message || t('welcome_hobby_suggestions_create_failed'));
    } finally {
      setIsGeneratingHobbySuggestions(false);
    }
  };

  // Hobi için rastgele 5 öneri getir
  const handleGetRandomHobbySuggestions = async () => {
    if (!selectedInterest) {
      setError(t('validation_select_hobby'));
      return;
    }

    setIsLoadingTopicSuggestions(true);
    setTopicDetailSuggestions([]);
    setSelectedDetailTopic('');
    setError(null);

    try {
      console.log('🎲 Rastgele hobi önerileri getiriliyor:', selectedInterest);
      const result = await getRandomHobbySuggestions(selectedInterest);

      if (result.success && result.data?.suggestions) {
        setTopicDetailSuggestions(result.data.suggestions);
        console.log('✅ Rastgele hobi önerileri geldi:', result.data.suggestions.length);
      } else if (result.needsGeneration) {
        // Öneri yok, oluştur
        console.log('⚠️ Öneri bulunamadı, oluşturuluyor...');
        await handleGenerateHobbySuggestions();
      } else {
        throw new Error(result.message || t('welcome_hobby_suggestions_get_failed'));
      }
    } catch (e: any) {
      console.error('❌ Hobi önerileri getirme hatası:', e);
      setError(e?.message || t('welcome_hobby_suggestions_get_failed'));
      setTopicDetailSuggestions([]);
    } finally {
      setIsLoadingTopicSuggestions(false);
    }
  };

  // Seçili hobi için en güncel haberleri getir
  const handleFetchHobbyNews = async () => {
    if (!selectedInterest) {
      setError(t('validation_select_hobby'));
      return;
    }

    const query = selectedInterest.trim();
    if (!query) {
      setError(t('validation_select_hobby'));
      return;
    }

    const safeLimit = Math.min(Math.max(Number(hobbyNewsLimit) || 5, 1), 50);

    // Twitter entegrasyonu için otomatik hashtag oluştur (#YapayZeka gibi)
    const queryForNews = query.startsWith('#') ? query : `#${query.replace(/\s+/g, '')}`;

    setIsLoadingHobbyNews(true);
    setHobbyNewsError(null);
    setHobbyNews([]);

    try {
      console.log('📰 Hobi haberleri getiriliyor:', { query, queryForNews, safeLimit });
      const response = await getHashtagNews(queryForNews, safeLimit, 'tr');

      if (!response.success) {
        throw new Error(response.message || 'Hobi haberleri alınamadı');
      }

      const items = (response.data as any)?.results || response.data || [];
      setHobbyNews(items as HashtagNewsItem[]);
      console.log('📰 Hobi haberleri alındı:', items.length);
    } catch (e: any) {
      console.error('❌ Hobi haberleri alınırken hata:', e);
      setHobbyNewsError(e?.message || 'Hobi haberleri alınamadı');
    } finally {
      setIsLoadingHobbyNews(false);
    }
  };

  // Hobi haber maddesini doğrudan TTS pipeline'ına gönder
  const handlePlayHobbyNewsItem = async (item: HashtagNewsItem) => {
    const key = (item.id || item.url || '').toString();
    const detailedText = key ? articleDetails[key] : '';

    const baseText = (detailedText && detailedText.trim().length > 0)
      ? detailedText.trim()
      : `${item.title || ''}\n\n${item.summary || ''}\n\nKaynak: ${item.sourceName || item.source || ''}\n${item.url || ''}`.trim();

    if (!baseText) {
      setError('Bu haber için metin bulunamadı.');
      return;
    }

    const inputData: InputData = {
      type: 'text',
      text: baseText,
      input: baseText,
      level: englishLevel.toUpperCase(),
      SesHızı: speakingRate,
      voice: voiceType,
    };

    await handleSubmit(inputData);
  };

  // Haber kartı için tam metni getir
  const handleFetchArticleDetail = async (item: HashtagNewsItem) => {
    if (!item.url) {
      setArticleDetailError('Bu haber için geçerli bir bağlantısı bulunamadı.');
      return;
    }

    const key = (item.id || item.url || '').toString();

    // Google News aggregator URL'leri için backend'e gitmeden özet metni kullan
    try {
      const hostname = new URL(item.url).hostname.toLowerCase();
      if (hostname.includes('news.google.com')) {
        const fallbackText = `${item.title || ''}\n\n${(item.summary || '').trim()}`.trim();
        if (fallbackText) {
          setArticleDetails((prev) => ({
            ...prev,
            [key]: fallbackText,
          }));
          setArticleDetailError(null);
          return;
        }
      }
    } catch {
      // URL parse error - normal akışa devam et
    }

    setLoadingArticleId(key);
    setArticleDetailError(null);

    try {
      const response = await fetchArticleDetails(item.url);
      if (!response.success || !response.data || !response.data.text) {
        throw new Error(response.message || 'Haber detayı alınamadı');
      }

      setArticleDetails((prev) => ({
        ...prev,
        [key]: response.data!.text,
      }));
    } catch (error: any) {
      console.error('Haber detayı alınırken hata:', error);
      setArticleDetailError(error.message || 'Haber detayı alınamadı');
    } finally {
      setLoadingArticleId(null);
    }
  };

  // Hobi seçildiğinde varlık kontrolü
  useEffect(() => {
    if (false) {
      if (contentType === 'topic' && selectedInterest) {
        checkHobbyExists(selectedInterest).then(result => {
          if (result.success) {
            setHobbyExists(result.data.exists);
            if (result.data.exists) {
              // Otomatik olarak 5 rastgele öneri getir
              handleGetRandomHobbySuggestions();
            }
          }
        }).catch(err => {
          console.error('Hobi kontrolü hatası:', err);
          setHobbyExists(false);
        });
      }
    }
  }, [selectedInterest, contentType]);

  const genderOptions = [
    { value: 'all', label: t('gender_all') },
    { value: 'male', label: t('gender_male') },
    { value: 'female', label: t('gender_female') }
  ];

  const accentVoiceOptions = [
    { value: 'all', label: t('accent_all') },
    { value: 'american', label: t('accent_american') },
    { value: 'british', label: t('accent_british') },
    { value: 'australian', label: t('accent_australian') }
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
        if (voices.length === 0 && category === 'wavenet' && accent && ['australian', 'canadian', 'indian'].includes(accent)) {
          const map: Record<string, { male: string; female: string; lang: string }> = {
            australian: { male: 'en-AU-Wavenet-D', female: 'en-AU-Wavenet-A', lang: 'en-AU' },
            canadian: { male: 'en-CA-Wavenet-D', female: 'en-CA-Wavenet-A', lang: 'en-CA' },
            indian: { male: 'en-IN-Wavenet-D', female: 'en-IN-Wavenet-A', lang: 'en-IN' },
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
      } catch { }
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
      } catch { }
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
    } catch { }
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
      } catch { }
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

  useEffect(() => {
    const voices = getFilteredVoices();
    if (!voices || voices.length === 0) return;
    const first: any = voices[0];
    const firstId: string | undefined = (first.name || first.id);
    if (!firstId) return;
    if (firstId !== voiceType) {
      setVoiceType(firstId);
    }
  }, [availableVoices, selectedAccent, selectedGender, selectedVoiceCategory, emotionType]);

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
      setError(t('validation_select_hobby_first'));
      return;
    }

    setIsLoadingTopicSuggestions(true);
    setError(null);

    try {
      const response = await getTopicDetailSuggestions(selectedInterest, englishLevel);
      const suggestions = response.data?.suggestions;
      if (response.success && Array.isArray(suggestions) && suggestions.length > 0) {
        setTopicDetailSuggestions(suggestions);
        console.log(`${selectedInterest} konusu için ${suggestions.length} öneri alındı`);
      } else {
        console.error("Konu önerileri alınamadı:", response);
        setError(t('welcome_error_topic_suggestions').replace('{error}', response.message || t('welcome_error_unknown')));
      }
    } catch (error: any) {
      console.error("Konu önerileri alınırken hata oluştu:", error);
      const errorMessage = error.message || t('welcome_error_unknown');
      setError(t('welcome_error_topic_suggestions').replace('{error}', errorMessage));
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

  // Kitap arama input'ları için canlı (debounced) arama
  useEffect(() => {
    const hasSearchCriteria =
      bookSearchQuery.trim().length > 0 ||
      bookTitleSearch.trim().length > 0 ||
      bookAuthorSearch.trim().length > 0;

    // Hiç kriter yoksa sonuçları temizle
    if (!hasSearchCriteria) {
      setBookSearchResults(null);
      setCurrentPage(1);
      return;
    }

    // Yazarken çok sık istek atmamak için debounce
    const handler = setTimeout(() => {
      // En az bir kriter girilmişse ilk sayfadan ara
      searchBooks(bookSearchQuery, bookTitleSearch, bookAuthorSearch, 1);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [bookSearchQuery, bookTitleSearch, bookAuthorSearch]);

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
        setError(t('welcome_error_chapter_load_detail').replace('{error}', errorData.error || response.statusText));
      }
    } catch (error) {
      console.error('Bölüm yükleme hatası:', error);
      setError(t('welcome_error_chapter_load'));
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

  // Kitabı favorilere ekle/kaldır
  const handleToggleBookFavorite = (book: Book, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const numericId = Number(book.id);
    if (!Number.isFinite(numericId) || numericId <= 0) return;

    setFavoriteBookIds((prev) => {
      const exists = prev.includes(numericId);
      const updated = exists
        ? prev.filter((id) => id !== numericId)
        : [...prev, numericId];

      // Persist updated favorites list (fire and forget)
      saveUserBookFavorites(updated).catch((err) => {
        console.error('[WELCOME] Favori kitaplar kaydedilirken hata oluştu:', err);
      });

      return updated;
    });
  };

  // Bölüm seçimi fonksiyonu
  const handleChapterSelect = async (chapter: Chapter) => {
    setSelectedChapter(chapter);
    setTextInput(chapter.chapter_text);

    // Mevcut ses kontrolü yap
    await checkExistingAudio(chapter.id, voiceType, speakingRate, englishLevel);
  };

  // Belirli bir bölüm için doğrudan ses oluşturma
  const handleGenerateForChapter = async (chapter: Chapter) => {
    const text = (chapter.chapter_text || '').trim();
    if (!text) {
      setError(t('welcome_chapter_no_text'));
      return;
    }

    const inputData: InputData = {
      type: 'book',
      text,
      level: englishLevel.toUpperCase(),
      SesHızı: speakingRate,
      voice: voiceType,
    };

    await handleSubmit(inputData);
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
      const effectiveChapterId = inputData.chapter_id || selectedChapter?.id;
      const effectiveChapterTitle = inputData.chapter || selectedChapter?.chapter_title;

      let processInput: ProcessInputData = {
        type: inputData.type,
        input: inputData.text || inputData.input, // text veya input'u input olarak gönder
        file: inputData.file,
        level: inputData.level,
        SesHızı: inputData.SesHızı,
        voice: inputData.voice,
        chapter: effectiveChapterTitle,
        chapter_id: effectiveChapterId,
        topic_id: activeTopicId || undefined,
      };

      // YouTube: altyazı metnini text olarak TTS'e gönder
      if (inputData.type === 'youtube') {
        const subtitle = (inputData.text || inputData.input || textInput || '').trim();
        if (!subtitle) {
          throw new Error(t('welcome_error_youtube_subtitle'));
        }
        processInput = {
          ...processInput,
          type: 'text',
          input: subtitle,
        };
      }

      // "subject" (Konu) ve "topic" (Hobi) type'ları için backend'e direkt gönder
      if (inputData.type === 'subject' || inputData.type === 'topic') {
        const typeLabel = inputData.type === 'subject' ? 'Subject (Konu)' : 'Topic (Hobi)';
        console.log(`${typeLabel} type detected, sending directly to backend for content generation...`);

        // Backend'de content_generation ve translate_from_english promptları kullanılacak
        // Type'ı olduğu gibi bırak, backend normalize edecek
        // contentDuration'ı targetDurationMinutes olarak gönder
        processInput = {
          ...processInput,
          type: inputData.type, // 'subject' veya 'topic' olarak kalsın
          input: inputData.text || inputData.input || '',
          targetDurationMinutes: contentDuration, // Süre parametresi
        };

        console.log(`${typeLabel} will be processed by backend with content_generation prompts, duration: ${contentDuration} min`);
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
        // Values (shortened)
        translatedText_snake: result?.translated_text ? result.translated_text.substring(0, 50) + '...' : 'UNDEFINED',
        adaptedText_snake: result?.adapted_text ? result.adapted_text.substring(0, 50) + '...' : 'UNDEFINED',
        translatedText_camel: result?.translatedText ? result.translatedText.substring(0, 50) + '...' : 'UNDEFINED',
        adaptedText_camel: result?.adaptedText ? result.adaptedText.substring(0, 50) + '...' : 'UNDEFINED',
        // Timepoints & words
        timepointsIsArray: Array.isArray(result.timepoints),
        timepointsLength: result.timepoints?.length || 0,
        firstTimepoint: result.timepoints?.[0],
        hasWords: !!result.words,
        wordsLength: result.words?.length || 0,
        // All keys in result
        resultKeys: result ? Object.keys(result) : []
      });

      if (result && result.mp3_url) {
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
          original_turkish: (result as any).original_turkish || '',
          adapted_text: (result as any).adapted_text || result.message,
          translated_text: (result as any).original_turkish || (result as any).translated_text || '',
          topic: inputData.type === 'book' ? 'Kitap' : inputData.type === 'text' ? 'Metin' : inputData.type === 'topic' ? 'Konu' : 'İçerik'
        } as any);

        // DEBUG: setAudioResult sonrası kontrol
        console.log('✅ [DEBUG] setAudioResult called successfully');

        // Input değerini belirle - kitap bölümü için chapter title kullan
        let input = processInput.input || inputData.input || inputData.text;
        if (processInput.type === 'book' && (inputData.chapter || selectedChapter?.chapter_title)) {
          input = inputData.chapter || selectedChapter?.chapter_title;
        }

        const chapterIdForSubmit = inputData.chapter_id || selectedChapter?.id;

        try {
          await submitContent(
            input || 'Unknown input',
            processInput.type,
            inputData.level,
            result.mp3_url,
            result.translated_text || result.translatedText || '',
            result.adapted_text || result.adaptedText || '',
            chapterIdForSubmit
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
      } catch { }
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
      alert(t('validation_unsupported_file'));
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
        // Doküman sekmesinde kal, çıkarılan metni sadece burada göster
        alert(t('welcome_file_upload_success').replace('{count}', String(data.text.length)));
      } else if (data.error) {
        throw new Error(data.error);
      } else {
        throw new Error(t('welcome_file_extract_failed'));
      }
    } catch (error: any) {
      console.error('File upload error:', error);
      alert(t('welcome_error_file_upload').replace('{error}', error.message || t('welcome_error_unknown')));

      // Input'u temizle
      if (e.target) {
        e.target.value = '';
      }
    } finally {
      setUploadingFile(false);
    }
  };

  // Doküman sekmesinde: çıkarılan metni kitap benzeri dokümana dönüştür
  const handleCreateDocumentFromText = async () => {
    const title = documentTitle.trim();
    const text = textInput.trim();

    if (!title) {
      setError(t('validation_enter_document_name'));
      return;
    }

    if (!text) {
      setError(t('validation_upload_document_first'));
      return;
    }

    try {
      setCreatingDocument(true);
      setError(null);

      const response = await createDocumentFromText(title, text);

      if (!response.success) {
        throw new Error(response.message || t('welcome_document_create_failed'));
      }

      console.log('📚 Doküman oluşturuldu:', {
        documentId: response.document?.id,
        sectionCount: response.sections?.length,
      });

      setLastCreatedDocument(response.document);
      setLastDocumentSections(response.sections || []);

      alert(t('welcome_document_saved').replace('{count}', String(response.sections?.length || 0)));
    } catch (err: any) {
      console.log('createDocumentFromText error:', err);
      setError(err.message || t('welcome_document_create_failed'));
    } finally {
      setCreatingDocument(false);
    }
  };

  const handlePlayDocumentSection = async (section: DocumentSection) => {
    const baseText = (section.section_text || '').toString().trim();
    if (!baseText) {
      setError(t('welcome_chapter_no_text'));
      return;
    }

    const inputData: InputData = {
      type: 'text',
      text: baseText,
      input: baseText,
      level: englishLevel.toUpperCase(),
      SesHızı: speakingRate,
      voice: voiceType,
    };

    await handleSubmit(inputData);
  };

  // Yeni tasarım için ses oluşturma fonksiyonu
  const handleGenerate = async () => {
    const trimmed = textInput.trim();

    // Metne dayalı modlarda boş içerik engeli
    if ((contentType === 'text' || contentType === 'subject' || contentType === 'topic') && !trimmed) {
      setError(t('validation_enter_text'));
      return;
    }

    // Limit kontrolü
    if (remaining <= 0) {
      setError(t('welcome_limit_exceeded'));
      return;
    }

    let type: ProcessInputData['type'] = 'text';
    if (contentType === 'subject' || contentType === 'topic' || contentType === 'book') {
      type = contentType as ProcessInputData['type'];
    }

    const inputData: InputData = {
      type,
      text: trimmed,
      level: englishLevel.toUpperCase(),
      SesHızı: speakingRate,
      voice: voiceType,
    };

    // Kitap modunda, seçili bölüm varsa bölüm bilgisini de ilet
    if (type === 'book' && selectedChapter) {
      inputData.chapter = selectedChapter.chapter_title;
      inputData.chapter_id = selectedChapter.id;
    }

    await handleSubmit(inputData);
  };

  if (user === undefined) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </main>
    );
  }

  // Auth loading durumunda loading göster
  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">{t('welcome_loading')}</p>
        </div>
      </main>
    );
  }

  // Auth tamamlandıktan sonra user kontrolü
  if (!isAuthenticated || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">{t('dashboard_redirecting')}</p>
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

  // Örnek istatistikler (gerçek projede API'den alınır)
  const stats = {
    contentCreated: 12,
    totalLogins: 5,
    lastLogin: '2025-05-13 10:42',
  };

  const filteredHistory = contentHistory.filter((item) => {
    const typeKey = (item.input_type || '').toLowerCase();
    if (!activeHistoryTypes || activeHistoryTypes.length === 0) return true;
    if (!typeKey) return true;
    return activeHistoryTypes.includes(typeKey);
  });
  const historyToRender = showAllHistory ? filteredHistory : filteredHistory.slice(0, 5);

  // Welcome hero arka plan görseli
  const heroImageUrl = 'https://readdy.ai/api/search-image?query=Modern%20language%20learning%20concept%20with%20digital%20technology%2C%20AI%20assistant%20helping%20with%20English%20lessons%2C%20abstract%20blue%20gradient%20background%20with%20subtle%20tech%20elements%2C%20professional%20educational%20atmosphere&width=1200&height=600&seq=hero1&orientation=landscape';

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-6">
              {/* Logo + Brand (same as home page) */}
              <Link href="/">
                <div className="flex items-center space-x-3 flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/lingroot-icon.svg"
                    alt="LingRoot Logo"
                    className="w-10 h-10 md:w-12 md:h-12"
                  />
                  <BrandWordmark className="hidden sm:inline-block text-lg sm:text-xl md:text-2xl" />
                </div>
              </Link>

              {/* Ana menü linkleri */}
              <div className="flex items-center space-x-2">
                <Link href="/">
                  <Button variant="ghost" className="!rounded-button whitespace-nowrap cursor-pointer">
                    <i className="fas fa-home mr-2"></i>
                    {t('welcome_nav_home')}
                  </Button>
                </Link>
                <Link href="/dashboard?tab=reading-history">
                  <Button variant="ghost" className="!rounded-button whitespace-nowrap cursor-pointer">
                    <i className="fas fa-history mr-2"></i>
                    {t('welcome_nav_reading_history')}
                  </Button>
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <NotificationBell />
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

      {/* Hero Section */}
      <div className="relative w-full h-[440px] md:h-[480px] overflow-hidden slideUp">
        <div
          className="absolute inset-0 bg-cover bg-top"
          style={{ backgroundImage: `url(${heroImageUrl})` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent flex items-center">
          <div className="container mx-auto px-6">
            <div className="max-w-2xl">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                {t('welcome_hero_title')}
              </h1>
              <p className="text-xl text-white/80 mb-8">
                {t('welcome_hero_desc')}
              </p>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 text-lg !rounded-button whitespace-nowrap cursor-pointer">
                {t('welcome_hero_button')}
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
            className="max-w-4xl mx-auto mb-8 bg-white rounded-xl shadow-md hover:shadow-lg cursor-pointer transition-all duration-300 group hover-lift slideUp"
          >
            <div className="p-6 flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">
                  {t('welcome_ai_card_title')}
                </h3>
                <p className="text-gray-600 text-base">
                  {t('welcome_ai_card_desc')}
                </p>
              </div>
              <div className="ml-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <LiroAvatar className="w-12 h-12 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>

          <Card className="mb-8 border-none shadow-lg slideUp">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold mr-4">
                    1
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">{t('welcome_content_type_title')}</h2>
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 flex items-center space-x-2 !rounded-button whitespace-nowrap cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <i className="fas fa-circle-notch fa-spin"></i>
                      <span>{t('welcome_audio_generating')}</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-volume-up"></i>
                      <span>{t('welcome_generate_button')}</span>
                    </>
                  )}
                </Button>
              </div>
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-700 mb-3">{t('welcome_content_type_label')}</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {contentTypeOptions.map((option) => (
                    <div
                      key={option.id}
                      onClick={() => setContentType(option.id)}
                      className={`group flex flex-col items-center justify-center p-4 rounded-lg border cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-md ${contentType === option.id
                        ? 'bg-primary/10 border-primary/40'
                        : 'bg-muted border-border hover:bg-muted/80'
                        }`}
                    >
                      <div className="mb-2 text-primary text-2xl transition-transform group-hover:scale-110 flex items-center justify-center">
                        {option.icon}
                      </div>
                      <span
                        className={`text-sm text-center transition-colors ${contentType === option.id ? 'text-primary font-medium' : 'text-gray-700'
                          }`}
                      >
                        {option.name}
                      </span>
                    </div>
                  ))}
                </div>
                {/* Varsayılan Ses butonu bu bölümden kaldırıldı */}
              </div>
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium text-gray-700">{t('welcome_content_input_label')}</h3>
                  {contentType === 'topic' && (
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="!rounded-button whitespace-nowrap cursor-pointer"
                        type="button"
                        onClick={() => setShowInterestManager(!showInterestManager)}
                      >
                        <i className="fas fa-heart mr-2"></i> {t('welcome_manage_hobbies')}
                      </Button>
                    </div>
                  )}
                </div>
                {contentType === 'document' ? (
                  <div className="space-y-4">
                    <div className={`flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition-colors ${uploadingFile
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary'
                      }`}>
                      <div className="space-y-1 text-center">
                        {uploadingFile ? (
                          <>
                            <svg className="mx-auto h-12 w-12 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <div className="text-sm text-primary font-medium">
                              {t('welcome_file_uploading')}
                            </div>
                            <p className="text-xs text-primary/80">{t('welcome_file_upload_wait')}</p>
                          </>
                        ) : (
                          <>
                            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4-4m4-4h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <div className="flex text-sm text-gray-600">
                              <label htmlFor="file-upload" className={`relative rounded-md font-medium focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary ${uploadingFile
                                ? 'cursor-not-allowed text-gray-400'
                                : 'cursor-pointer bg-white text-primary hover:text-primary/80'
                                }`}>
                                <span>{t('welcome_file_upload_label')}</span>
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
                              <p className="pl-1">{t('welcome_file_upload_hint')}</p>
                            </div>
                            <p className="text-xs text-gray-500">{t('welcome_file_upload_types')}</p>
                          </>
                        )}
                      </div>
                    </div>

                    {textInput && (
                      <div className="mt-4 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('welcome_extracted_text_label')}
                          </label>
                          <textarea
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            className="w-full min-h-[150px] p-4 border border-input rounded-lg focus:border-primary focus:ring-primary resize-none"
                            placeholder={t('welcome_extracted_text_placeholder')}
                          />
                        </div>

                        <div className="grid gap-3 md:grid-cols-[2fr,auto] items-end">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {t('welcome_document_name_label')}
                            </label>
                            <Input
                              type="text"
                              value={documentTitle}
                              onChange={(e) => setDocumentTitle(e.target.value)}
                              placeholder={t('welcome_document_name_placeholder')}
                              className="w-full"
                            />
                          </div>
                          <Button
                            type="button"
                            onClick={handleCreateDocumentFromText}
                            disabled={creatingDocument || !documentTitle.trim() || !textInput.trim()}
                            className={`!rounded-button whitespace-nowrap px-4 py-2.5 flex items-center justify-center ${creatingDocument || !documentTitle.trim() || !textInput.trim()
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-primary hover:bg-primary/90 cursor-pointer'
                              }`}
                          >
                            {creatingDocument ? (
                              <>
                                <i className="fas fa-circle-notch fa-spin mr-2"></i>
                                {t('welcome_saving_document')}
                              </>
                            ) : (
                              <>
                                <i className="fas fa-book-open mr-2"></i>
                                {t('welcome_save_document_button')}
                              </>
                            )}
                          </Button>
                        </div>

                        {lastCreatedDocument && (
                          <div className="mt-6 border-t border-gray-200 pt-4">
                            <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center">
                              <i className="fas fa-file-alt mr-2 text-primary"></i>
                              {t('welcome_last_saved_document')}
                            </h4>
                            <div className="text-sm text-gray-700 mb-3">
                              {lastCreatedDocument.title}
                            </div>
                            {lastDocumentSections.length > 0 && (
                              <div className="max-h-64 overflow-y-auto space-y-2">
                                {lastDocumentSections.map((section) => (
                                  <div
                                    key={section.id}
                                    className="p-3 rounded-lg border border-gray-200 bg-white flex flex-col gap-2"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="text-xs font-semibold text-gray-800 truncate">
                                        {section.section_index}. {section.section_title || t('welcome_section_label')}
                                      </div>
                                      <span className="text-[11px] text-gray-500 whitespace-nowrap">
                                        {section.word_count || 0} {t('welcome_word_count')}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-600 line-clamp-2 whitespace-pre-line">
                                      {section.section_text}
                                    </p>
                                    <div className="flex justify-end">
                                      <Button
                                        type="button"
                                        size="sm"
                                        className="!rounded-button whitespace-nowrap cursor-pointer px-3 py-1.5 text-xs"
                                        onClick={() => handlePlayDocumentSection(section)}
                                      >
                                        <i className="fas fa-volume-up mr-1"></i>
                                        {t('welcome_play_section_button')}
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Hobi seçildiğinde ilgi alanları combobox'ı göster */}
                    {contentType === 'topic' && (
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                              {t('welcome_hobbies_label')}
                            </label>
                          </div>
                          {loadingInterests ? (
                            <div className="flex items-center justify-center p-4 border border-gray-300 rounded-lg">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                              <span className="ml-2 text-gray-600">{t('welcome_hobbies_loading')}</span>
                            </div>
                          ) : userInterests.length > 0 ? (
                            <div className="flex gap-3">
                              <div className="flex-1">
                                <select
                                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-primary focus:ring-primary"
                                  value={selectedInterest}
                                  onChange={(e) => setSelectedInterest(e.target.value)}
                                >
                                  <option value="">{t('welcome_hobbies_select')}</option>
                                  {userInterests.map((interest, index) => (
                                    <option key={index} value={interest}>
                                      {interest}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="w-24">
                                <Input
                                  type="number"
                                  min={1}
                                  max={50}
                                  value={hobbyNewsLimit}
                                  onChange={(e) => setHobbyNewsLimit(Number(e.target.value) || 5)}
                                  className="h-full"
                                />
                              </div>
                              <Button
                                type="button"
                                className={`px-6 py-3 !rounded-button whitespace-nowrap ${selectedInterest && !isLoadingHobbyNews
                                  ? 'bg-green-600 hover:bg-green-700 cursor-pointer'
                                  : 'bg-gray-400 cursor-not-allowed'
                                  }`}
                                disabled={!selectedInterest || isLoadingHobbyNews}
                                onClick={handleFetchHobbyNews}
                              >
                                {isLoadingHobbyNews ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                                    {t('welcome_loading_news')}
                                  </>
                                ) : (
                                  <>
                                    <i className="fas fa-stream mr-2"></i>
                                    {t('welcome_list_current_topics')}
                                  </>
                                )}
                              </Button>
                            </div>
                          ) : (
                            <div className="p-4 border border-yellow-300 bg-yellow-50 rounded-lg">
                              <p className="text-yellow-800 text-sm">
                                {t('welcome_no_hobbies_message')}
                              </p>
                            </div>
                          )}
                        </div>

                        {showInterestManager && (
                          <div className="mt-4">
                            <InterestManager
                              showTitle={false}
                              className="bg-white rounded-lg shadow p-4"
                              isEditing
                              onUpdate={fetchUserInterests}
                            />
                          </div>
                        )}

                        {/* Detaylı öneriler combobox'ı */}
                        {hobbyNewsError && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            {hobbyNewsError}
                          </div>
                        )}
                        {articleDetailError && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            {articleDetailError}
                          </div>
                        )}
                        {hobbyNews.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-sm font-medium text-gray-700">
                                {t('welcome_current_news_label')}
                              </label>
                              <span className="text-xs text-gray-500">{t('welcome_results_count').replace('{count}', String(hobbyNews.length))}</span>
                            </div>
                            <div className="space-y-2 max-h-80 overflow-y-auto">
                              {hobbyNews.map((item, index) => (
                                <div
                                  key={item.id || index}
                                  className="p-3 border border-gray-200 rounded-lg bg-white flex flex-col gap-2"
                                >
                                  <div className="flex justify-between items-start gap-2">
                                    <div>
                                      <div className="text-sm font-semibold text-gray-900 line-clamp-2">
                                        {item.title}
                                      </div>
                                      <div className="text-xs text-gray-500 mt-0.5">
                                        {item.sourceName || item.source}
                                      </div>
                                    </div>
                                  </div>
                                  {item.summary && (
                                    <p className="text-xs text-gray-700 line-clamp-3 whitespace-pre-line">
                                      {item.summary}
                                    </p>
                                  )}
                                  <div className="flex items-center justify-between mt-1 gap-2">
                                    {item.url && (
                                      <a
                                        href={item.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-primary underline truncate max-w-[60%]"
                                      >
                                        Haberi Aç
                                      </a>
                                    )}
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="!rounded-button whitespace-nowrap text-xs px-3 py-1.5"
                                      onClick={() => handleFetchArticleDetail(item)}
                                      disabled={loadingArticleId === (item.id || item.url)}
                                    >
                                      {loadingArticleId === (item.id || item.url) ? (
                                        <>
                                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1 inline-block"></div>
                                          {t('welcome_loading_detail')}
                                        </>
                                      ) : (
                                        <>
                                          <i className="fas fa-file-alt mr-1"></i>
                                          {t('welcome_fetch_detail')}
                                        </>
                                      )}
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="!rounded-button whitespace-nowrap cursor-pointer bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5"
                                      onClick={() => handlePlayHobbyNewsItem(item)}
                                    >
                                      <i className="fas fa-volume-up mr-1"></i>
                                      {t('welcome_audio_generate_news')}
                                    </Button>
                                  </div>
                                  {(() => {
                                    const key = (item.id || item.url || '').toString();
                                    const detail = key ? articleDetails[key] : '';
                                    if (!detail) return null;
                                    return (
                                      <div className="mt-2 p-2 bg-gray-50 border border-dashed border-gray-200 rounded text-xs text-gray-800 max-h-48 overflow-y-auto whitespace-pre-line">
                                        {detail}
                                      </div>
                                    );
                                  })()}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Yeni Konu sekmesi - sadece metin kutusu */}
                    {contentType === 'subject' && (
                      <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('welcome_subject_label')}
                        </label>
                        <div className="relative">
                          <textarea
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            placeholder={t('welcome_text_placeholder')}
                            className="w-full min-h-[200px] p-4 border border-input rounded-lg focus:border-primary focus:ring-primary resize-none"
                          />
                          <button className="absolute bottom-3 right-3 text-gray-500 hover:text-primary cursor-pointer">
                            <i className="fas fa-edit text-xl"></i>
                          </button>
                        </div>

                        {/* Konu Öner Butonu */}
                        <Button
                          type="button"
                          onClick={handleGetTopicSuggestions}
                          disabled={isLoadingTopicSuggestions || !textInput.trim()}
                          className={`w-full py-3 !rounded-button ${!isLoadingTopicSuggestions && textInput.trim()
                            ? 'bg-primary hover:bg-primary/90 cursor-pointer'
                            : 'bg-gray-400 cursor-not-allowed'
                            }`}
                        >
                          {isLoadingTopicSuggestions ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                              {t('welcome_loading_topics')}
                            </>
                          ) : (
                            <>
                              <i className="fas fa-lightbulb mr-2"></i>
                              {t('welcome_suggest_topic')}
                            </>
                          )}
                        </Button>

                        {/* Konu Önerileri Listesi */}
                        {topicDetailSuggestions.length > 0 && (
                          <div className="mt-4 space-y-2">
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">
                              {t('welcome_suggested_subtopics')}
                            </h3>
                            <div className="grid grid-cols-1 gap-2">
                              {topicDetailSuggestions.map((suggestion, index) => (
                                <button
                                  key={index}
                                  onClick={() => {
                                    setSelectedDetailTopic(suggestion);
                                    setTextInput(suggestion);
                                  }}
                                  className={`text-left p-3 rounded-lg border-2 transition-all ${selectedDetailTopic === suggestion
                                    ? 'border-primary/60 bg-primary/5'
                                    : 'border-gray-200 hover:border-gray-300 bg-white'
                                    }`}
                                >
                                  <div className="text-sm">
                                    {index + 1}. {suggestion}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* YouTube sekmesi - link girişi ve altyazı çekme */}
                    {contentType === 'youtube' && (
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('youtube_link_label')}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={youtubeUrl}
                            onChange={(e) => setYoutubeUrl(e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="flex-1 p-3 border border-gray-300 rounded-lg focus:border-primary focus:ring-primary"
                          />
                          <Button
                            type="button"
                            onClick={handleFetchYoutubeSubtitle}
                            className={`px-6 py-3 !rounded-button whitespace-nowrap ${!isFetchingSubtitle ? 'bg-primary hover:bg-primary/90 cursor-pointer' : 'bg-gray-400 cursor-not-allowed'
                              }`}
                            disabled={isFetchingSubtitle}
                          >
                            {isFetchingSubtitle ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                {t('welcome_youtube_fetching')}
                              </>
                            ) : (
                              <>
                                <i className="fas fa-closed-captioning mr-2"></i>
                                {t('welcome_youtube_fetch_button')}
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
                          {t('welcome_youtube_note')}
                        </p>
                      </div>
                    )}

                    {/* Podcast sekmesi */}
                    {contentType === 'podcast' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t('welcome_podcast_host_voice_label') || 'Host Voice'}
                            </label>
                            <select
                              value={podcastHostSpeakerId}
                              onChange={(e) => setPodcastHostSpeakerId(e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-lg focus:border-primary focus:ring-primary"
                            >
                              {GEMINI_PODCAST_SPEAKERS.map((v) => (
                                <option key={v.value} value={v.value}>{v.label}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t('welcome_podcast_guest_voice_label') || 'Guest Voice'}
                            </label>
                            <select
                              value={podcastGuestSpeakerId}
                              onChange={(e) => setPodcastGuestSpeakerId(e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-lg focus:border-primary focus:ring-primary"
                            >
                              {GEMINI_PODCAST_SPEAKERS.map((v) => (
                                <option key={v.value} value={v.value}>{v.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>


                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('welcome_podcast_topic_label')}
                          </label>
                          <textarea
                            value={podcastTopic}
                            onChange={(e) => setPodcastTopic(e.target.value)}
                            placeholder={t('welcome_podcast_topic_placeholder')}
                            className="w-full min-h-[100px] p-3 border border-gray-300 rounded-lg focus:border-primary focus:ring-primary resize-none"
                          />
                        </div>

                        {/* Podcast Süresi Seçici */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <i className="fas fa-clock mr-2"></i>
                            {t('welcome_podcast_duration_label')}
                          </label>
                          <div className="grid grid-cols-4 gap-2">
                            {DURATION_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => setPodcastDuration(option.value)}
                                className={`p-3 rounded-lg border-2 transition-all text-center ${podcastDuration === option.value
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                                  }`}
                              >
                                <div className="font-semibold">{option.label}</div>
                                <div className="text-xs text-gray-500">{option.description}</div>
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {t('welcome_podcast_duration_tolerance')}
                          </p>
                        </div>

                        {/* Hidden Fields for Podcast Configuration - Defaults are used
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t('welcome_podcast_style_label')}
                            </label>
                            <select
                              value={podcastStyleType}
                              onChange={(e) => setPodcastStyleType(e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-lg focus:border-primary focus:ring-primary"
                            >
                              <option value="friendly_chat">{t('podcast_style_friendly_chat')}</option>
                              <option value="professional">{t('podcast_style_professional')}</option>
                              <option value="educational">{t('podcast_style_educational')}</option>
                              <option value="casual">{t('podcast_style_casual')}</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t('welcome_podcast_voice_label')}
                            </label>
                            <select
                              value={podcastVoiceChoice}
                              onChange={(e) => setPodcastVoiceChoice(e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-lg focus:border-primary focus:ring-primary"
                            >
                              <option value="english_female">{t('voice_english_female')}</option>
                              <option value="english_male">{t('voice_english_male')}</option>
                              <option value="american_female">{t('voice_american_female')}</option>
                              <option value="american_male">{t('voice_american_male')}</option>
                              <option value="british_female">{t('voice_british_female')}</option>
                              <option value="british_male">{t('voice_british_male')}</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t('welcome_podcast_personality_a_label')}
                            </label>
                            <select
                              value={podcastPersonalityA}
                              onChange={(e) => setPodcastPersonalityA(e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-lg focus:border-primary focus:ring-primary"
                            >
                              <option value="curious_enthusiast">{t('podcast_personality_curious_enthusiast')}</option>
                              <option value="skeptical_analyst">{t('podcast_personality_skeptical_analyst')}</option>
                              <option value="friendly_guide">{t('podcast_personality_friendly_guide')}</option>
                              <option value="professional_expert">{t('podcast_personality_professional_expert')}</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t('welcome_podcast_personality_b_label')}
                            </label>
                            <select
                              value={podcastPersonalityB}
                              onChange={(e) => setPodcastPersonalityB(e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-lg focus:border-primary focus:ring-primary"
                            >
                              <option value="knowledgeable_friend">{t('podcast_personality_knowledgeable_friend')}</option>
                              <option value="experienced_mentor">{t('podcast_personality_experienced_mentor')}</option>
                              <option value="curious_learner">{t('podcast_personality_curious_learner')}</option>
                              <option value="witty_commentator">{t('podcast_personality_witty_commentator')}</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center space-x-6">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={podcastIncludeHumor}
                              onChange={(e) => setPodcastIncludeHumor(e.target.checked)}
                              className="w-4 h-4 text-primary rounded focus:ring-primary"
                            />
                            <span className="text-sm text-gray-700">{t('welcome_podcast_add_humor')}</span>
                          </label>

                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={podcastIncludeFiller}
                              onChange={(e) => setPodcastIncludeFiller(e.target.checked)}
                              className="w-4 h-4 text-primary rounded focus:ring-primary"
                            />
                            <span className="text-sm text-gray-700">{t('welcome_filler_words_label')}</span>
                          </label>
                        </div>
                        */}

                        <div className="flex justify-center pt-2">
                          <Button
                            type="button"
                            onClick={handleCreatePodcast}
                            className={`px-8 py-3 !rounded-button whitespace-nowrap ${!isCreatingPodcast && podcastTopic.trim()
                              ? 'bg-primary hover:bg-primary/90 cursor-pointer'
                              : 'bg-gray-400 cursor-not-allowed'
                              }`}
                            disabled={isCreatingPodcast || !podcastTopic.trim()}
                          >
                            {isCreatingPodcast ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                {t('welcome_podcast_creating')}
                              </>
                            ) : (
                              <>
                                <i className="fas fa-podcast mr-2"></i>
                                {t('welcome_podcast_create_button')}
                              </>
                            )}
                          </Button>
                        </div>

                        {podcastError && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            {podcastError}
                          </div>
                        )}

                        <div className="p-3 bg-primary/5 border border-primary/20 rounded text-xs text-primary">
                          <i className="fas fa-info-circle mr-1"></i>
                          {t('welcome_podcast_wait_notice')}
                        </div>
                      </div>
                    )}

                    {/* Kitap sekmesi */}
                    {contentType === 'book' && (
                      <div className="space-y-6">
                        {/* Kitap Arama */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            {t('welcome_book_search_label')}
                          </label>
                          <form onSubmit={handleBookSearch} className="space-y-4">
                            {/* Genel Arama */}
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                {t('welcome_book_general_search_label')}
                              </label>
                              <input
                                type="text"
                                value={bookSearchQuery}
                                onChange={(e) => setBookSearchQuery(e.target.value)}
                                placeholder={t('welcome_book_search_placeholder')}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:border-primary focus:ring-primary"
                              />
                            </div>

                            {/* Kitap İsmi ve Yazar İsmi */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  {t('welcome_book_title_label')}
                                </label>
                                <input
                                  type="text"
                                  value={bookTitleSearch}
                                  onChange={(e) => setBookTitleSearch(e.target.value)}
                                  placeholder={t('welcome_book_title_placeholder')}
                                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-primary focus:ring-primary"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  {t('welcome_book_author_label')}
                                </label>
                                <input
                                  type="text"
                                  value={bookAuthorSearch}
                                  onChange={(e) => setBookAuthorSearch(e.target.value)}
                                  placeholder={t('welcome_book_author_placeholder')}
                                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-primary focus:ring-primary"
                                />
                              </div>
                            </div>

                            {/* Arama Butonu */}
                            <div className="flex justify-center">
                              <Button
                                type="submit"
                                className={`px-8 py-3 !rounded-button whitespace-nowrap ${(bookSearchQuery.trim() || bookTitleSearch.trim() || bookAuthorSearch.trim()) && !isSearchingBooks
                                  ? 'bg-primary hover:bg-primary/90 cursor-pointer'
                                  : 'bg-gray-400 cursor-not-allowed'
                                  }`}
                                disabled={!(bookSearchQuery.trim() || bookTitleSearch.trim() || bookAuthorSearch.trim()) || isSearchingBooks}
                              >
                                {isSearchingBooks ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    {t('welcome_book_searching')}
                                  </>
                                ) : (
                                  <>
                                    <i className="fas fa-search mr-2"></i>
                                    {t('welcome_book_search_button')}
                                  </>
                                )}
                              </Button>
                            </div>

                            {/* Arama İpucu */}
                            <div className="text-xs text-gray-500 text-center">
                              <i className="fas fa-info-circle mr-1"></i>
                              {t('welcome_book_search_hint')}
                            </div>
                          </form>
                        </div>

                        {/* Kitap Arama Sonuçları */}
                        {bookSearchResults && (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <h4 className="text-md font-semibold text-gray-800 flex items-center">
                                  <i className="fas fa-book-open mr-2 text-primary"></i>
                                  {t('common_search_results')}
                                </h4>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {t('welcome_book_search_results').replace('{count}', String(bookSearchResults.total))}
                                </p>
                              </div>
                              {bookSearchResults.total_pages > 1 && (
                                <div className="flex items-center space-x-2">
                                  <Button
                                    onClick={() => searchBooks(bookSearchQuery, bookTitleSearch, bookAuthorSearch, currentPage - 1)}
                                    disabled={currentPage <= 1 || isSearchingBooks}
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
                                    disabled={currentPage >= bookSearchResults.total_pages || isSearchingBooks}
                                    variant="outline"
                                    size="sm"
                                    className="!rounded-button"
                                  >
                                    <i className="fas fa-chevron-right"></i>
                                  </Button>
                                </div>
                              )}
                            </div>

                            <div className="max-h-[420px] overflow-y-auto pr-1">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {bookSearchResults.books.map((book) => (
                                  <div
                                    key={book.id}
                                    onClick={() => handleBookSelect(book)}
                                    className={`bg-white rounded-lg shadow-sm border cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${selectedBook?.id === book.id ? 'border-primary ring-1 ring-primary/40' : 'border-gray-200'
                                      }`}
                                  >
                                    <div className="relative w-full h-40 bg-gray-100">
                                      {book.cover_image ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          src={book.cover_image}
                                          alt={book.title}
                                          className="w-full h-full object-cover rounded-t-lg"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 rounded-t-lg">
                                          <i className="fas fa-book text-3xl text-primary/60"></i>
                                        </div>
                                      )}
                                      <button
                                        type="button"
                                        onClick={(e) => handleToggleBookFavorite(book, e)}
                                        className="absolute top-2 left-2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center shadow-sm hover:bg-white cursor-pointer"
                                      >
                                        <i
                                          className={`fas fa-heart text-sm ${favoriteBookIds.includes(Number(book.id)) ? 'text-red-500' : 'text-gray-300'
                                            }`}
                                        ></i>
                                      </button>
                                      {selectedBook?.id === book.id && (
                                        <span className="absolute top-2 right-2 bg-primary text-white text-[10px] px-2 py-1 rounded-full flex items-center">
                                          <i className="fas fa-check-circle mr-1"></i>
                                          {t('welcome_selected')}
                                        </span>
                                      )}
                                    </div>
                                    <div className="p-3 flex flex-col h-full">
                                      <h5 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-1">{book.title}</h5>
                                      <p className="text-xs text-gray-600 line-clamp-1 mb-1">{book.author}</p>
                                      {book.description && (
                                        <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                                          {book.description}
                                        </p>
                                      )}
                                      <div className="flex items-center justify-between mt-auto pt-1">
                                        <div className="flex items-center space-x-2">
                                          <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                                            {book.total_chapters} {t('welcome_book_chapters_suffix')}
                                          </Badge>
                                          {book.genre && (
                                            <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                                              {book.genre}
                                            </Badge>
                                          )}
                                        </div>
                                        <span className="text-[10px] text-primary flex items-center">
                                          {t('welcome_book_view_chapters')}
                                          <i className="fas fa-arrow-right ml-1"></i>
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Seçilen Kitabın Bölümleri */}
                        {selectedBook && (
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-md font-medium text-gray-700">
                                {t('welcome_book_chapters_title').replace('{title}', selectedBook.title)}
                              </h4>
                              {isLoadingChapters && (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                              )}
                            </div>
                            {isLoadingChapters ? (
                              <div className="flex flex-col items-center justify-center p-8 border border-gray-200 rounded-lg">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                <span className="ml-3 text-gray-600 mt-2">{t('welcome_book_chapters_loading')}</span>
                                <span className="text-sm text-gray-500 mt-1">
                                  {selectedBook?.text_url ? t('welcome_book_chapters_loading_from_url') : t('welcome_book_chapters_loading_from_db')}
                                </span>
                              </div>
                            ) : bookChapters.length > 0 ? (
                              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                                {bookChapters.map((chapter) => (
                                  <div
                                    key={chapter.id}
                                    onClick={() => handleChapterSelect(chapter)}
                                    className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-green-50 transition-colors ${selectedChapter?.id === chapter.id ? 'bg-green-50 border-green-200' : ''
                                      }`}
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <div>
                                        <h6 className="font-medium text-gray-900">
                                          {t('welcome_chapter_prefix')} {chapter.chapter_index}: {chapter.chapter_title}
                                        </h6>
                                        <p className="text-sm text-gray-600">
                                          {chapter.chapter_text ? t('welcome_chapter_word_count').replace('{count}', String(chapter.chapter_text.split(' ').length)) : t('welcome_chapter_word_count_calculating')}
                                        </p>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        {selectedChapter?.id === chapter.id && (
                                          <i className="fas fa-check-circle text-green-600"></i>
                                        )}
                                        <Button
                                          type="button"
                                          size="sm"
                                          className="!rounded-button whitespace-nowrap cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleGenerateForChapter(chapter);
                                          }}
                                        >
                                          <i className="fas fa-volume-up mr-1"></i>
                                          {t('welcome_audio_generate_button')}
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="p-4 border border-gray-200 rounded-lg text-center text-gray-500">
                                {t('welcome_book_no_chapters')}
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
                                <h5 className="font-medium text-green-800">{t('welcome_existing_audio_title')}</h5>
                                <p className="text-sm text-green-700 mt-1">
                                  {t('welcome_error_chapter_load_detail').replace('{error}', `${existingAudio.voice_model}, ${existingAudio.speaking_rate}x, ${existingAudio.level?.toUpperCase() || 'Bilinmeyen'}`)}
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
                                  {t('welcome_existing_audio_use_button')}
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Seçilen Bölüm İçeriği */}
                        {selectedChapter && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t('welcome_book_selected_section_label')}
                            </label>
                            <div className="relative">
                              <textarea
                                value={textInput}
                                onChange={(e) => setTextInput(e.target.value)}
                                className="w-full min-h-[200px] p-4 border border-gray-300 rounded-lg focus:border-primary focus:ring-primary resize-none"
                                placeholder={t('welcome_extracted_text_placeholder')}
                              />
                              <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded text-xs text-gray-500">
                                {selectedChapter.chapter_text ? selectedChapter.chapter_text.split(' ').length : 0} {t('welcome_word_count')}
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
                          placeholder={t('welcome_general_text_placeholder')}
                          className="w-full min-h-[200px] p-4 border border-gray-300 rounded-lg focus:border-primary focus:ring-primary resize-none"
                        />
                        <button className="absolute bottom-3 right-3 text-gray-500 hover:text-primary cursor-pointer">
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
              <div
                className="flex items-center mb-6 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setShowAudioSettings(!showAudioSettings)}
              >
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold mr-4">
                  2
                </div>
                <h2 className="text-2xl font-bold text-primary mr-4">{t('welcome_audio_settings_title')}</h2>

                {/* Collapsed Status Summary */}
                {!showAudioSettings && (
                  <div className="flex-1 text-sm text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap">
                    {englishLevel.toUpperCase()} • {speakingRate}x • {`${selectedAccent !== 'all' ? selectedAccent : ''} ${selectedGender !== 'all' ? selectedGender : ''}`} • {contentDuration && t('content_duration_label') ? `${DURATION_OPTIONS.find(d => d.value === contentDuration)?.label || contentDuration} ` : ''} • {voiceType && getSelectedVoiceLabel ? getSelectedVoiceLabel() : ''}
                  </div>
                )}
                {/* Spacer if expanded to push chevron to right */}
                {showAudioSettings && <div className="flex-1"></div>}

                <div className="ml-2">
                  <i className={`fas ${showAudioSettings ? 'fa-chevron-up' : 'fa-chevron-down'} text-gray-400`}></i>
                </div>
              </div>

              {showAudioSettings && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-top-2 fade-in duration-200">
                    {/* Sol Kolon - İngilizce Seviyesi ve Konuşma Hızı */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-700 mb-3">{t('welcome_english_level_label')}</h3>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
                        {levelOptions.map((level) => (
                          <Button
                            key={level}
                            onClick={() => setEnglishLevel(level.toLowerCase())}
                            variant={englishLevel === level.toLowerCase() ? "default" : "outline"}
                            className={`!rounded-button whitespace-nowrap cursor-pointer ${englishLevel === level.toLowerCase() ? 'bg-primary text-primary-foreground' : ''
                              }`}
                          >
                            {level}
                          </Button>
                        ))}
                      </div>
                      <h3 className="text-lg font-medium text-gray-700 mb-3">{t('welcome_speaking_rate_label')}</h3>
                      <div className="grid grid-cols-4 gap-2 mb-6">
                        {rateOptions.map((rate) => (
                          <Button
                            key={rate.value}
                            onClick={() => setSpeakingRate(rate.value)}
                            variant={speakingRate === rate.value ? "default" : "outline"}
                            className={`!rounded-button whitespace-nowrap cursor-pointer ${speakingRate === rate.value ? 'bg-primary text-primary-foreground' : ''
                              }`}
                          >
                            {rate.label}
                          </Button>
                        ))}
                      </div>

                      {/* Cinsiyet ve Aksan Filtreleri */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <h4 className="text-md font-medium text-gray-600 mb-2">{t('welcome_gender_label')}</h4>
                          <div className="grid grid-cols-3 gap-2">
                            {genderOptions.map((gender) => (
                              <Button
                                key={gender.value}
                                onClick={() => setSelectedGender(gender.value)}
                                variant={selectedGender === gender.value ? "default" : "outline"}
                                size="sm"
                                className={`!rounded-button whitespace-nowrap cursor-pointer ${selectedGender === gender.value ? 'bg-primary text-primary-foreground' : ''
                                  }`}
                              >
                                {gender.label}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-md font-medium text-gray-600 mb-2">{t('welcome_accent_label')}</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {accentVoiceOptions.map((accent) => (
                              <Button
                                key={accent.value}
                                onClick={() => setSelectedAccent(accent.value)}
                                variant={selectedAccent === accent.value ? "default" : "outline"}
                                size="sm"
                                className={`!rounded-button whitespace-nowrap cursor-pointer ${selectedAccent === accent.value ? 'bg-primary text-primary-foreground' : ''
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

                    {/* Sağ Kolon - Ses Kategorisi ve İçerik Süresi kopyası */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-700 mb-3">{t('welcome_voice_category_label')}</h3>
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
                            className={`!rounded-button cursor-pointer h-auto flex flex-col items-center justify-center p-2 text-center transition-all duration-200 ${selectedVoiceCategory === category.value ? 'bg-primary text-primary-foreground' : ''
                              }`}
                          >
                            {/* İkon ve Label */}
                            <div className="flex items-center justify-center space-x-1 mb-1 min-h-[24px]">
                              <i className={`${category.icon} text-xs`}></i>
                              <span className="font-medium text-xs leading-none">{category.label}</span>
                            </div>

                            {/* Badge */}
                            {category.badge && (
                              <Badge
                                variant="outline"
                                className={`text-xs px-1.5 py-0.5 mb-1 ${category.badge === 'Ücretsiz' ? 'bg-green-100 text-green-700 border-green-200' :
                                  category.badge === 'Premium' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                    category.badge === 'Gold' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                      category.badge === 'Platinium' ? 'bg-gray-100 text-gray-700 border-gray-200' : ''
                                  }`}
                              >
                                {category.badgeLabel || category.badge}
                              </Badge>
                            )}

                            {/* SSML Support */}
                            {category.ssmlSupport && (
                              <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full leading-none">
                                SSML
                              </span>
                            )}
                          </Button>
                        ))}
                      </div>

                      {(contentType === 'subject' || contentType === 'topic' || contentType === 'topic_tree') && (
                        <div className="mt-4">
                          <h4 className="text-md font-medium text-gray-600 mb-2">
                            <i className="fas fa-clock mr-2"></i>
                            {t('content_duration_label')}
                          </h4>
                          <div className="grid grid-cols-4 gap-2">
                            {DURATION_OPTIONS.map((option) => (
                              <Button
                                key={option.value}
                                onClick={() => setContentDuration(option.value)}
                                variant={contentDuration === option.value ? "default" : "outline"}
                                size="sm"
                                className={`!rounded-button cursor-pointer flex flex-col h-auto py-2 ${contentDuration === option.value ? 'bg-primary text-primary-foreground' : ''
                                  }`}
                              >
                                <span className="font-semibold">{option.label}</span>
                                <span className="text-xs opacity-80">{option.description}</span>
                              </Button>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {t('approx_duration_note')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mevcut Sesler - Full Width */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-md font-medium text-gray-600">{t('available_voices_title')}</h4>
                      {/* Aktif Filtre Göstergesi */}
                      {(selectedAccent !== 'all' || selectedGender !== 'all' || selectedVoiceCategory !== 'standard') && (
                        <div className="flex items-center space-x-2 text-xs">
                          <i className="fas fa-filter text-primary"></i>
                          <span className="text-primary font-medium">
                            {t('filter_active_label')}
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
                                  className={`flex items-center p-2 rounded cursor-pointer border transition-colors ${isDefault ? 'bg-green-50 border-green-300 ring-1 ring-green-300' : 'hover:bg-gray-50 border-transparent'
                                    }`}
                                >
                                  <input
                                    type="radio"
                                    name="voice"
                                    value={voiceId}
                                    checked={voiceType === voiceId}
                                    onChange={(e) => setVoiceType(e.target.value)}
                                    className="mr-3 text-primary"
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">
                                      {voiceName} <span className="text-gray-400 font-mono">[{voiceId}]</span>
                                      {isDefault && (
                                        <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                          {t('voice_default')}
                                        </span>
                                      )}
                                      {voice.ssmlSupport && (
                                        <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                          {t('voice_ssml_support')}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {/* Accent bilgisi */}
                                      {voice.accent === 'american' || voice.languageCode?.includes('US') ? t('accent_american') :
                                        voice.accent === 'british' || voice.languageCode?.includes('GB') ? t('accent_british') :
                                          voice.accent === 'australian' || voice.languageCode?.includes('AU') ? t('accent_australian') :
                                            voice.accent || voice.languageCode || t('voice_unknown')} •
                                      {/* Gender bilgisi */}
                                      {voice.gender === 'MALE' || voice.gender === 'male' ? t('gender_male') :
                                        voice.gender === 'FEMALE' || voice.gender === 'female' ? t('gender_female') : t('voice_unknown')}
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
                            <p>{t('voice_no_match')}</p>
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
                                alert(t('welcome_default_voice_saved'));
                              } catch (e: any) {
                                alert(t('welcome_default_voice_save_failed').replace('{error}', e.message || t('welcome_error_unknown')));
                              }
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white !rounded-button cursor-pointer"
                          >
                            {t('welcome_default_voice_button')}
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
                      emotionType === emotion.value ? 'bg-primary text-primary-foreground' : ''
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
                      outputFormat === format.toLowerCase() ? 'bg-primary text-primary-foreground' : ''
                    }`}
                  >
                    {format}
                  </Button>
                ))}
              </div>
              */}

                  <div className="mt-4">
                    <div className="mb-6 p-4 bg-muted rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-primary">{t('welcome_current_plan_title')}</h3>
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                          {currentPlanName || t('welcome_free_plan')}
                        </Badge>
                      </div>
                      <div className="text-sm">
                        {isPlatinumPlan ? (
                          <>
                            <p className="mb-3 text-xs text-gray-600">
                              {t('welcome_plan_info_message')}
                            </p>
                            <div className="flex items-center mt-3">
                              <Link
                                href="/fiyatlandirma"
                                className="text-primary hover:text-primary/80 text-sm"
                              >
                                {t('welcome_compare_all_plans')}
                              </Link>
                            </div>
                          </>
                        ) : (
                          <div className={remaining <= 0 ? "text-sm text-red-600" : "text-sm text-primary"}>
                            {remaining <= 0 ? (
                              <>
                                <p className="mb-2 font-semibold">
                                  <i className="fas fa-exclamation-triangle mr-2"></i>
                                  {t('welcome_audio_limit_exceeded')}
                                </p>
                                <p className="mb-3 text-xs">
                                  {t('welcome_audio_upgrade_message')}
                                </p>
                              </>
                            ) : (
                              <p className="mb-2">
                                <i className="fas fa-info-circle mr-2"></i>
                                {t('welcome_audio_remaining').replace('{remaining}', String(remaining)).replace('{limit}', String(dailyLimit))}
                              </p>
                            )}
                            <div className="flex items-center mt-3">
                              <Button
                                variant="outline"
                                className="mr-3 !rounded-button whitespace-nowrap cursor-pointer"
                                onClick={() => router.push('/fiyatlandirma')}
                              >
                                <i className="fas fa-crown text-yellow-500 mr-2"></i>
                                {t('welcome_upgrade_to_premium')}
                              </Button>
                              <Link
                                href="/fiyatlandirma"
                                className="text-primary hover:text-primary/80 text-sm"
                              >
                                {t('welcome_compare_all_plans')}
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Konu Ağacım - sadece konu ağacı sekmesi seçiliyken, Ses Ayarları kartının altında */}
          {
            contentType === 'topic_tree' && user && (
              <div className="mt-8">
                <TopicHierarchySection
                  userId={user.id}
                  level={englishLevel}
                  targetDurationMinutes={contentDuration}
                />
              </div>
            )
          }

          <div className="flex justify-center mt-8">
            <Button
              onClick={handleGenerate}
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg flex items-center space-x-2 !rounded-button whitespace-nowrap cursor-pointer"
            >
              {isLoading ? (
                <>
                  <i className="fas fa-circle-notch fa-spin"></i>
                  <span>{t('welcome_audio_generating')}</span>
                </>
              ) : (
                <>
                  <i className="fas fa-volume-up"></i>
                  <span>{t('welcome_audio_generate_button')}</span>
                </>
              )}
            </Button>
          </div>

          {/* Output Section */}
          {
            audioResult && (
              <Card className="mt-8 border-none shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center mb-6">
                    <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold mr-4">
                      <i className="fas fa-check"></i>
                    </div>
                    <h2 className="text-2xl font-bold text-green-600">{t('welcome_audio_created_title')}</h2>
                  </div>
                  <OutputSection
                    audioResult={audioResult}
                    isLoggedIn={isAuthenticated}
                  />
                </CardContent>
              </Card>
            )
          }

          {/* Content History Section */}
          {
            isAuthenticated && (
              <Card className="mt-12 border border-border shadow-lg rounded-2xl bg-white">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4 mb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold mr-4 shadow-sm">
                          <i className="fas fa-history"></i>
                        </div>
                        <h2 className="text-2xl font-bold text-primary tracking-tight">{t('welcome_audio_history_title')}</h2>
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
                            {t('welcome_loading')}
                          </>
                        ) : (
                          <>
                            <i className="fas fa-refresh mr-2"></i>
                            {t('welcome_refresh')}
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 justify-between">
                      <div className="flex flex-wrap gap-2">
                        {historyTypeOptions.map((option) => {
                          const isActive = activeHistoryTypes.includes(option.id);
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => {
                                setActiveHistoryTypes((prev) => {
                                  const exists = prev.includes(option.id);
                                  if (exists) {
                                    // En az bir filtre daima açık kalsın
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
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                      <div className="text-xs text-gray-500 whitespace-nowrap">
                        {filteredHistory.length} {t('records_viewing_suffix')}
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
                          {/* Compact Header - Always Visible */}
                          <div
                            className="p-4 md:p-5 cursor-pointer hover:bg-primary/5 transition-colors"
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
                                <div className="flex items-center gap-2 mb-2 text-xs">
                                  <Badge variant="outline" className="text-xs">
                                    {getHistoryTypeLabel(item.input_type)}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
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
                                  <h4 className="font-semibold text-gray-900 mb-1 text-sm md:text-base">{t('welcome_adapted_text_label')}</h4>
                                  <p className="text-sm text-gray-700 line-clamp-2">
                                    {item.adapted_text || item.input}
                                  </p>
                                  {item.adapted_text && (
                                    <details className="mt-2">
                                      <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                                        {t('welcome_show_original_text')}
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
                                  {expandedHistoryItem === item.id ? t('collapse_button') : t('open_player_button')}
                                </div>
                                <i className={`fas ${expandedHistoryItem === item.id ? 'fa-chevron-up' : 'fa-chevron-down'} text-gray-400`}></i>
                              </div>
                            </div>
                            <button
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${expandedHistoryItem === item.id
                                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                : 'bg-gradient-to-r from-primary to-primary/80 text-white shadow-sm hover:shadow-md hover:scale-105'
                                }`}
                            >
                              <i className={`fas ${expandedHistoryItem === item.id ? 'fa-times' : 'fa-play'} text-[10px]`}></i>
                              <span>{expandedHistoryItem === item.id ? t('collapse_button') : t('open_player_button')}</span>
                            </button>
                          </div>

                          {/* Expanded Player View - Toggleable */}
                          {expandedHistoryItem === item.id && (
                            <div className="border-t border-gray-200 bg-white p-6">
                              {/* GİZLENDİ - Senkronize Oynatıcı başlığı ve debug console.log */}

                              {/* Use OutputSection component for full functionality */}
                              {(() => {
                                const looksLikeDialogueTranscript = (text: any) => {
                                  if (!text || typeof text !== 'string') return false;
                                  return /^(Speaker\s+[AB]|Host|Guest):/im.test(text);
                                };

                                const audioResult = {
                                  message: item.adapted_text || item.input,
                                  mp3_url: item.mp3_url,
                                  vtt_url: item.mp3_url.replace('.mp3', '.vtt'), // Assume VTT exists
                                  level: item.level,
                                  adapted_text: item.adapted_text || item.input,
                                  translated_text: item.translated_text || item.input,
                                  dialogue: looksLikeDialogueTranscript(item.translated_text) ? item.translated_text : undefined,
                                  topic: getHistoryTypeLabel(item.input_type),
                                  input_type: item.input_type,
                                  dialogue_segments: Array.isArray((item as any).dialogue_segments)
                                    ? (item as any).dialogue_segments
                                    : (item as any).dialogue_segments
                                      ? JSON.parse((item as any).dialogue_segments)
                                      : undefined,
                                  timepoints: (() => {
                                    try {
                                      if (Array.isArray(item.timepoints)) return item.timepoints;
                                      if (typeof item.timepoints === 'string') return JSON.parse(item.timepoints);
                                      return [];
                                    } catch (e) {
                                      console.error('Error parsing timepoints:', e);
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
                                  {t('open_in_new_tab')}
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
                                  {t('close_button')}
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
                            {showAllHistory ? t('welcome_show_less') : t('welcome_show_more')}
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-gray-400 mb-4">
                        <i className="fas fa-microphone-slash text-4xl"></i>
                      </div>
                      <h3 className="text-lg font-medium text-gray-500 mb-2">{t('welcome_no_audio_yet')}</h3>
                      <p className="text-gray-400">{t('welcome_no_audio_hint')}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          }
        </div >
      </div >

      {/* Welcome Popup */}
      < WelcomePopup
        isOpen={showWelcomePopup}
        onClose={() => setShowWelcomePopup(false)}
        userEmail={user?.email}
      />

      <Footer />
    </div >
  );
};

export default Welcome;