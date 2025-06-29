'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useAuth } from '../src/lib/auth';
import { useMembership } from '../src/context/MembershipContext';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FaUserEdit, FaVolumeUp, FaBook, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { processTts, submitContent, getContentHistory, getUserInterests, getTopicDetailSuggestions, rewriteToNarration, ProcessInputData } from '../src/lib/api';
import { useTranslation } from '../src/lib/i18n';
import InputSection from '../src/components/InputSection';
import OutputSection from '../src/components/OutputSection';
import Footer from '../src/components/Footer';
import StandardHeader from '../src/components/common/StandardHeader';
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
  message: string;
  mp3_url: string;
  vtt_url: string;
  level: string;
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
  const { badge, dailyLimit, remaining } = useMembership();
  const { t } = useTranslation();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [audioResult, setAudioResult] = useState<AudioResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  
  // Yeni tasarım için state'ler
  const [contentType, setContentType] = useState<string>('text');
  const [englishLevel, setEnglishLevel] = useState<string>('a1');
  const [speakingRate, setSpeakingRate] = useState<number>(0.8);
  const [voiceType, setVoiceType] = useState<string>('en-US-Standard-C');
  const [accentType, setAccentType] = useState<string>('all');
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
  const [selectedVoiceCategory, setSelectedVoiceCategory] = useState<string>('standard');
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [selectedAccent, setSelectedAccent] = useState<string>('all');
  
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
  
  // Chat state'leri
  const [chatMessages, setChatMessages] = useState<Array<{role: string, content: string}>>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [chatInitialized, setChatInitialized] = useState<boolean>(false);
  
  // İçerik türü seçenekleri
  const contentTypeOptions: ContentTypeOption[] = [
    { id: 'text', name: 'Metin', icon: 'fas fa-file-alt' },
    { id: 'topic', name: 'Hobi', icon: 'fas fa-lightbulb' },
    { id: 'subject', name: 'Konu', icon: 'fas fa-graduation-cap' },
    { id: 'youtube', name: 'YouTube', icon: 'fab fa-youtube' },
    { id: 'weblink', name: 'Web Bağlantısı', icon: 'fas fa-link' },
    { id: 'document', name: 'Doküman', icon: 'fas fa-file-word' },
    { id: 'spotify', name: 'Spotify', icon: 'fab fa-spotify' },
    { id: 'book', name: 'Kitap', icon: 'fas fa-book' },
    { id: 'custom', name: 'Öneriler', icon: 'fas fa-plus' },
    { id: 'hashtag', name: 'Etiket', icon: 'fas fa-hashtag' },
    { id: 'chat', name: 'Chat', icon: 'fas fa-comments' },
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

  // Ses kategorileri ve detaylı ses verileri
  const voiceCategories = [
    { value: 'standard', label: 'Standart Sesler', icon: 'fas fa-volume-up', badge: 'Ücretsiz', ssmlSupport: false },
    { value: 'wavenet', label: 'WaveNet Sesleri', icon: 'fas fa-star', badge: 'Premium', ssmlSupport: true },
    { value: 'neural2', label: 'Neural2 Sesleri', icon: 'fas fa-brain', badge: 'Premium', ssmlSupport: true },
    { value: 'studio', label: 'Studio Sesleri', icon: 'fas fa-crown', badge: 'Platinium', ssmlSupport: true },
    { value: 'chirp3d', label: 'Chirp 3D', icon: 'fas fa-gem', badge: 'Gold', ssmlSupport: true }
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
    const categoryVoices = detailedVoices[selectedVoiceCategory as keyof typeof detailedVoices] || [];
    
    return categoryVoices.filter(voice => {
      const genderMatch = selectedGender === 'all' || voice.gender === selectedGender;
      const accentMatch = selectedAccent === 'all' || voice.accent === selectedAccent;
      return genderMatch && accentMatch;
    });
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
  const fetchFilteredVoices = async (accent: string, emotion: string, gender?: string) => {
    setLoadingVoices(true);
    try {
      console.log('🎯 Filtrelenmiş sesler çekiliyor...', { accent, emotion, gender });
      
      // API endpoint'ini belirle
      const baseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:5001/api/tts/voices/filter'
        : '/api/tts/voices/filter';
      
      // Query parametrelerini oluştur
      const params = new URLSearchParams();
      if (accent) params.append('accent', accent);
      if (emotion) params.append('emotion', emotion);
      if (gender) params.append('gender', gender);
      
      const apiUrl = `${baseUrl}?${params.toString()}`;
      console.log('🔗 Filter API URL:', apiUrl);
      
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      console.log('🎯 Filtered Voices API response:', data);
      
      if (data.voices && Array.isArray(data.voices)) {
        setAvailableVoices(data.voices);
        console.log(`✅ Filtrelenmiş sesler set edildi: ${data.filteredCount}/${data.totalCount} voice`);
        
        // Mevcut seçili ses filtrelenmiş listede yoksa, ilk sesi seç
        const currentVoiceExists = data.voices.some((voice: any) => voice.name === voiceType);
        if (!currentVoiceExists && data.voices.length > 0) {
          setVoiceType(data.voices[0].name);
          console.log('🔄 Yeni varsayılan ses seçildi:', data.voices[0].name);
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

  // Content history ve user interests'i yüklemek için useEffect ekleyelim
  useEffect(() => {
    if (isAuthenticated) {
      fetchContentHistory();
      fetchUserInterests();
    }
    // Ses listesini her zaman yükle (authentication gerekmez)
    fetchAvailableVoices();
  }, [isAuthenticated]);

  // Aksan türü ve duygu tonu değiştiğinde sesleri filtrele
  useEffect(() => {
    if (accentType !== 'all' || emotionType !== 'all') {
      console.log('🎯 Filtre değişti, sesler yeniden çekiliyor...', { accentType, emotionType });
      fetchFilteredVoices(accentType, emotionType);
    } else {
      console.log('🔄 Tüm filtreler kaldırıldı, tüm sesler çekiliyor...');
      fetchAvailableVoices();
    }
  }, [accentType, emotionType]);

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

      // "subject" (Konu) ve "topic" (Hobi) type'ları için özel işlem
      if (inputData.type === 'subject' || inputData.type === 'topic') {
        const typeLabel = inputData.type === 'subject' ? 'Subject (Konu)' : 'Topic (Hobi)';
        console.log(`${typeLabel} type detected, attempting to rewrite to narration...`);
        
        try {
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
            console.warn('Narration rewrite failed, proceeding with original text as text type');
            // Başarısız olursa orijinal metni text olarak işle
            processInput = {
              ...processInput,
              type: 'text',
              input: inputData.text || inputData.input || ''
            };
          }
        } catch (narrationError: any) {
          console.error(`${typeLabel} narration rewrite error:`, narrationError);
          console.log('Proceeding with original text as text type...');
          
          // Hata durumunda orijinal metni text olarak işle
          processInput = {
            ...processInput,
            type: 'text',
            input: inputData.text || inputData.input || ''
          };
        }
      }

      const result = await processTts(processInput);
      
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
        setAudioResult({
          message: result.message || t('audio_generated_success'),
          mp3_url: result.mp3_url,
          vtt_url: result.vtt_url,
          level: inputData.level
        });
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
          // İçerik kaydetme hatası olsa da ses oluşturma başarılı, kullanıcıya bilgi ver
          setError(`Ses başarıyla oluşturuldu ancak kaydetme sırasında hata oluştu: ${submitError.message}`);
        }
      } else {
        setError(result.message || t('audio_generation_failed'));
      }
    } catch (error: any) {
      console.error('Error generating audio:', error);
      setError(error.message || t('unexpected_error'));
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

    const inputData: InputData = {
      type: contentType as ProcessInputData['type'],
      text: textInput,
      level: englishLevel,
      SesHızı: speakingRate,
      voice: voiceType,
    };

    await handleSubmit(inputData);
  };

  // Chat fonksiyonları
  const initializeChat = async () => {
    if (chatInitialized) return;
    
    try {
      const response = await fetch('/api/chat/initial', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setChatMessages(data.data.conversationHistory);
        setChatInitialized(true);
      }
    } catch (error) {
      console.error('Chat initialization error:', error);
      // Fallback mesaj
      setChatMessages([{
        role: 'assistant',
        content: 'Merhaba! 👋 Bugün ne dinlemek istersin? İlgi alanlarını, hobilerini veya merak ettiğin konuları söyle, sana özel İngilizce içerikler önereyim. Hangi konuda bir şeyler dinlemek istiyorsun?'
      }]);
      setChatInitialized(true);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setIsChatLoading(true);

    // Kullanıcı mesajını hemen ekle
    const newMessages = [...chatMessages, { role: 'user', content: userMessage }];
    setChatMessages(newMessages);

    try {
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: chatMessages
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setChatMessages(data.data.conversationHistory);
      } else {
        // Hata durumunda fallback cevap
        setChatMessages([...newMessages, {
          role: 'assistant',
          content: 'Üzgünüm, şu anda bir sorun yaşıyorum. Lütfen tekrar deneyin.'
        }]);
      }
    } catch (error) {
      console.error('Chat message error:', error);
      // Hata durumunda fallback cevap
      setChatMessages([...newMessages, {
        role: 'assistant',
        content: 'Üzgünüm, şu anda bir sorun yaşıyorum. Lütfen tekrar deneyin.'
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleChatKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  // Chat seçildiğinde initialize et
  React.useEffect(() => {
    if (contentType === 'chat') {
      initializeChat();
    }
  }, [contentType]);

  // Chat'den metin seçme fonksiyonu
  const selectTextFromChat = (text: string) => {
    setTextInput(text);
  };

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.replace('/');
    }
  }, [isAuthenticated, user]);

  if (!isAuthenticated || !user) {
    return null;
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
              </div>
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium text-gray-700">İçerik Girişi</h3>
                  <div className="flex space-x-2">
                    <Button 
                      onClick={handleGenerate}
                      disabled={isLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm flex items-center space-x-2 !rounded-button whitespace-nowrap cursor-pointer"
                    >
                      {isLoading ? (
                        <>
                          <i className="fas fa-circle-notch fa-spin"></i>
                          <span>Oluşturuluyor...</span>
                        </>
                      ) : (
                        <>
                          <i className="fas fa-volume-up"></i>
                          <span>Ses Oluştur</span>
                        </>
                      )}
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

                    {/* Chat sekmesi */}
                    {contentType === 'chat' && (
                      <div className="space-y-4">
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                          <div className="flex items-center mb-2">
                            <i className="fas fa-robot text-blue-600 mr-2"></i>
                            <h3 className="text-lg font-medium text-blue-800">AI Chat Asistanı</h3>
                          </div>
                          <p className="text-sm text-blue-700">
                            Yapay zeka asistanımla sohbet ederek size özel İngilizce içerik önerileri alın. 
                            İlgi alanlarınızı, seviyenizi ve bugün ne dinlemek istediğinizi söyleyin!
                          </p>
                        </div>

                        {/* Chat Mesajları */}
                        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                          <div className="h-96 overflow-y-auto p-4 space-y-3">
                            {chatMessages.map((message, index) => (
                              <div
                                key={index}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                              >
                                <div
                                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                    message.role === 'user'
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  <div className="flex items-start space-x-2">
                                    {message.role === 'assistant' && (
                                      <i className="fas fa-robot text-blue-600 mt-1 flex-shrink-0"></i>
                                    )}
                                    <div className="text-sm whitespace-pre-wrap">
                                      {message.content}
                                      {message.role === 'assistant' && message.content.length > 50 && (
                                        <div className="mt-2 pt-2 border-t border-gray-200">
                                          <Button
                                            onClick={() => selectTextFromChat(message.content)}
                                            size="sm"
                                            variant="outline"
                                            className="text-xs !rounded-button whitespace-nowrap cursor-pointer"
                                          >
                                            <i className="fas fa-arrow-right mr-1"></i>
                                            Bu Metni Seç
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                            
                            {isChatLoading && (
                              <div className="flex justify-start">
                                <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-100">
                                  <div className="flex items-center space-x-2">
                                    <i className="fas fa-robot text-blue-600"></i>
                                    <div className="flex space-x-1">
                                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Chat Input */}
                          <div className="border-t border-gray-200 p-4">
                            <div className="flex space-x-3">
                              <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyPress={handleChatKeyPress}
                                placeholder="Mesajınızı yazın..."
                                className="flex-1 p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                                disabled={isChatLoading}
                              />
                              <Button
                                onClick={sendChatMessage}
                                disabled={!chatInput.trim() || isChatLoading}
                                className={`px-4 py-3 !rounded-button whitespace-nowrap ${
                                  chatInput.trim() && !isChatLoading
                                    ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                                    : 'bg-gray-400 cursor-not-allowed'
                                }`}
                              >
                                {isChatLoading ? (
                                  <i className="fas fa-circle-notch fa-spin"></i>
                                ) : (
                                  <i className="fas fa-paper-plane"></i>
                                )}
                              </Button>
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                              <i className="fas fa-info-circle mr-1"></i>
                              Enter tuşuna basarak mesaj gönderebilirsiniz
                            </div>
                          </div>
                        </div>

                        {/* Chat'den metin seçimi için özel alan */}
                        {textInput && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-center mb-2">
                              <i className="fas fa-check-circle text-green-600 mr-2"></i>
                              <h4 className="font-medium text-green-800">Seçilen İçerik</h4>
                            </div>
                            <div className="text-sm text-green-700 bg-white p-3 rounded border border-green-200 max-h-32 overflow-y-auto">
                              {textInput}
                            </div>
                            <div className="mt-3 text-xs text-green-600">
                              <i className="fas fa-arrow-down mr-1"></i>
                              Bu içerik ses dönüşümü için hazır. Aşağıdaki ayarları yapıp "Ses Oluştur" butonuna tıklayın.
                            </div>
                          </div>
                        )}
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
                    {contentType !== 'topic' && contentType !== 'subject' && contentType !== 'book' && (
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

                </div>

                {/* Sağ Kolon - Ses Kategorisi */}
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-3">Ses Kategorisi</h3>
                  <div className="mb-6">
                    <select 
                      value={selectedVoiceCategory} 
                      onChange={(e) => {
                        const value = e.target.value;
                        setSelectedVoiceCategory(value);
                        // Kategori değiştiğinde ilk sesi seç
                        const categoryVoices = detailedVoices[value as keyof typeof detailedVoices];
                        if (categoryVoices && categoryVoices.length > 0) {
                          setVoiceType(categoryVoices[0].id);
                        }
                      }}
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {voiceCategories.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label} ({category.badge})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Cinsiyet ve Aksan Filtreleri */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <h4 className="text-md font-medium text-gray-600 mb-2">Cinsiyet</h4>
                      <select 
                        value={selectedGender} 
                        onChange={(e) => setSelectedGender(e.target.value)}
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {genderOptions.map((gender) => (
                          <option key={gender.value} value={gender.value}>
                            {gender.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <h4 className="text-md font-medium text-gray-600 mb-2">Aksan</h4>
                      <select 
                        value={selectedAccent} 
                        onChange={(e) => setSelectedAccent(e.target.value)}
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {accentVoiceOptions.map((accent) => (
                          <option key={accent.value} value={accent.value}>
                            {accent.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mevcut Sesler - Full Width */}
              <div className="mt-6">
                <h4 className="text-md font-medium text-gray-600 mb-3">Mevcut Sesler</h4>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 mb-6">
                  {getFilteredVoices().length > 0 ? (
                    <div className="space-y-2">
                      {getFilteredVoices().map((voice) => (
                        <label key={voice.id} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="radio"
                            name="voice"
                            value={voice.id}
                            checked={voiceType === voice.id}
                            onChange={(e) => setVoiceType(e.target.value)}
                            className="mr-3 text-blue-600"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {voice.name} <span className="text-gray-400 font-mono">[{voice.id}]</span>
                              {voice.ssmlSupport && (
                                <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                  SSML destekler
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              {voice.accent === 'american' ? 'Amerikan' : 
                               voice.accent === 'british' ? 'İngiliz' : 
                               voice.accent === 'australian' ? 'Avustralya' : voice.accent} • 
                              {voice.gender === 'male' ? 'Erkek' : 'Kadın'}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-4">
                      <i className="fas fa-info-circle mb-2"></i>
                      <p>Seçilen filtrelere uygun ses bulunamadı.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* DUYGU TONU */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-700 mb-3">Duygu Tonu</h3>
                <select 
                  value={emotionType} 
                  onChange={(e) => setEmotionType(e.target.value)}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {emotionOptions.map((emotion) => (
                    <option key={emotion.value} value={emotion.value}>
                      {emotion.label}
                    </option>
                  ))}
                </select>
              </div>
              
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
              
              {/* SES OLUŞTUR BUTONU - Ana işlem butonu olarak en üst kısımda */}
              <div className="mb-6">
                <div className="flex justify-center">
                  <Button
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg flex items-center space-x-2 !rounded-button whitespace-nowrap cursor-pointer w-full max-w-md"
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
              </div>

              <div className="mt-4">
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-blue-800">Mevcut Üyelik Planınız</h3>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                      {badge?.label || 'Ücretsiz Plan'}
                    </Badge>
                  </div>
                  <div className="text-sm text-blue-600">
                    <p className="mb-2"><i className="fas fa-info-circle mr-2"></i>Günlük {remaining}/{dailyLimit} ses dönüşümü hakkınız kaldı.</p>
                    <div className="flex items-center mt-3">
                      <Button variant="outline" className="mr-3 !rounded-button whitespace-nowrap cursor-pointer">
                        <i className="fas fa-crown text-yellow-500 mr-2"></i>Premium'a Yükselt
                      </Button>
                      <a href="#" className="text-blue-600 hover:text-blue-700 text-sm">Tüm planları karşılaştır</a>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

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
                        <div className="p-4">
                          <div className="flex flex-col gap-4">
                            {/* Başlık ve Bilgiler */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white font-bold">
                                  <i className="fas fa-music text-sm"></i>
                                </div>
                                <h4 className="font-medium text-green-600">Senkronize Oynatıcı</h4>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {(item.input_type || 'unknown').toUpperCase()}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                    {item.level || 'N/A'}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
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
                            </div>

                            {/* Gelişmiş Senkronize Oynatıcı - Direkt göster */}
                            <div className="mt-2">
                              <OutputSection 
                                audioResult={{
                                  message: item.adapted_text || item.input || 'Metin mevcut değil',
                                  mp3_url: item.mp3_url,
                                  vtt_url: item.mp3_url.replace('.mp3', '.vtt'), // Assume VTT exists
                                  level: item.level || 'A1',
                                  timepoints: [], // Will be loaded from VTT
                                  words: (item.adapted_text || item.input || 'Metin mevcut değil').split(/\s+/).filter(word => word.length > 0),
                                  original_turkish: item.input || 'Orijinal metin mevcut değil',
                                  speaking_rate: 1.0
                                }}
                                isLoggedIn={isAuthenticated}
                              />
                            </div>
                          </div>
                        </div>
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