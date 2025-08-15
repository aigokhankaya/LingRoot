import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as DocumentPicker from 'expo-document-picker';
import { CEFRLevel, TTSRequest, Voice, VoiceCategory, VoiceFilter } from '../types';
import { useRoute, useFocusEffect, useNavigation } from '@react-navigation/native';
import { useLanguage } from '../contexts/LanguageContext';
import { apiService, saveDefaultVoiceSetting, getUserSettings } from '../services/api';

const CreateScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const [mode, setMode] = useState<'text' | 'file' | 'book' | 'suggestion'>(
    route.params?.mode === 'file' ? 'file' : (route.params?.mode === 'book' ? 'book' : (route.params?.mode === 'suggestion' ? 'suggestion' : 'text'))
  );
  const { t } = useLanguage();
  const [inputText, setInputText] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel>('B1');
  const [speechRate, setSpeechRate] = useState(1.0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  // Keep mode in sync when screen gains focus (e.g., navigating from Home with different params)
  useFocusEffect(
    React.useCallback(() => {
      const nextMode: 'text' | 'file' | 'book' | 'suggestion' = route.params?.mode === 'file' ? 'file' : (route.params?.mode === 'book' ? 'book' : (route.params?.mode === 'suggestion' ? 'suggestion' : 'text'));
      setMode(nextMode);
      if (nextMode === 'text') {
        setSelectedFile(null);
        // Book mode cleanup
        setSelectedBook(null);
        setSelectedChapterId(null);
        setSelectedChapterText('');
        setSuggestion('');
        setSuggestionResults([]);
      } else {
        setInputText('');
        if (nextMode !== 'book') {
          setSelectedBook(null);
          setSelectedChapterId(null);
          setSelectedChapterText('');
        }
      }
    }, [route.params?.mode])
  );
  // --- Suggestion Mode State ---
  const [suggestion, setSuggestion] = useState('');
  const [suggestionResults, setSuggestionResults] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const handleGetSuggestions = async () => {
    if (!suggestion.trim()) {
      Alert.alert(t('common.error'), t('suggestions.alerts.pleaseEnterTopic'));
      return;
    }
    setIsLoadingSuggestions(true);
    try {
      const res = await apiService.getTopicSuggestions(suggestion, selectedLevel);
      if (res?.success) {
        setSuggestionResults(res.suggestions || []);
      } else {
        Alert.alert(t('common.error'), res?.message || t('suggestions.alerts.fetchFailed'));
      }
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message || t('common.unexpectedError'));
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  
  // Voice selection states
  const [selectedVoiceCategory, setSelectedVoiceCategory] = useState<string>('standard');
  const [selectedVoice, setSelectedVoice] = useState<string>('en-US-Standard-C');
  const [selectedAccent, setSelectedAccent] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState<boolean>(false);
  const [showVoiceSelection, setShowVoiceSelection] = useState<boolean>(false);
  const hasActiveFilters = selectedAccent !== 'all' || selectedGender !== 'all' || selectedVoiceCategory !== 'standard';

  const levels: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  // --- Book Search State ---
  const [bookQ, setBookQ] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [isSearchingBooks, setIsSearchingBooks] = useState(false);
  const [bookResults, setBookResults] = useState<any[]>([]);
  const [bookPage, setBookPage] = useState(1);
  const [bookTotalPages, setBookTotalPages] = useState(1);
  const [selectedBook, setSelectedBook] = useState<any | null>(null);
  const [bookChapters, setBookChapters] = useState<any[]>([]);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);
  const [selectedChapterText, setSelectedChapterText] = useState<string>('');

  const levelDescriptions = {
    A1: t('create.cefrDescriptions.A1'),
    A2: t('create.cefrDescriptions.A2'),
    B1: t('create.cefrDescriptions.B1'),
    B2: t('create.cefrDescriptions.B2'),
    C1: t('create.cefrDescriptions.C1'),
    C2: t('create.cefrDescriptions.C2'),
  } as const;

  // Derive filters (category, accent) from a voice name like "en-GB-Chirp3-HD-Achernar"
  const deriveFiltersFromVoiceName = (voiceName?: string): { category: string; accent: string } => {
    const name = (voiceName || '').toString();
    // Category
    let category = 'standard';
    if (name.includes('Chirp') || name.toLowerCase().includes('chirp')) category = 'chirp3d';
    else if (name.includes('Studio')) category = 'studio';
    else if (name.toLowerCase().includes('neural2')) category = 'neural2';
    else if (name.toLowerCase().includes('wavenet')) category = 'wavenet';
    // Accent by language code
    let accent = 'american';
    if (name.includes('en-GB')) accent = 'british';
    else if (name.includes('en-AU')) accent = 'australian';
    else if (name.includes('en-CA')) accent = 'canadian';
    else if (name.includes('en-IN')) accent = 'indian';
    else if (name.includes('en-US')) accent = 'american';
    return { category, accent };
  };

  // Accent normalization helper: maps codes like GB/US and languageCode (en-GB, en-US)
  // to our UI accents: british, american, australian, canadian, indian
  const normalizeAccentValue = (accent?: string, languageCode?: string): string => {
    const a = (accent || '').toLowerCase();
    const lc = (languageCode || '').toLowerCase();
    if (a === 'british' || a === 'american' || a === 'australian' || a === 'canadian' || a === 'indian') return a;
    if (a === 'gb' || a === 'uk') return 'british';
    if (a === 'us' || a === 'usa') return 'american';
    if (a === 'au' || a === 'aus' || a === 'au_english') return 'australian';
    if (a === 'ca' || a === 'can') return 'canadian';
    if (a === 'in' || a === 'ind') return 'indian';
    if (lc.includes('-gb')) return 'british';
    if (lc.includes('-us')) return 'american';
    if (lc.includes('-au')) return 'australian';
    if (lc.includes('-ca')) return 'canadian';
    if (lc.includes('-in')) return 'indian';
    return 'american';
  };

  // Backend kategori paramını doğrudan kullan (backend 'neural2', 'wavenet', 'studio', 'chirp3d' bekliyor)
  const mapCategoryForBackend = (category?: string): string | undefined => {
    if (!category || category === 'standard') return undefined;
    return category;
  };

  // Voice categories
  const voiceCategories: VoiceCategory[] = [
    { value: 'standard', label: t('create.voice.categories.standard'), icon: 'volume-up', badge: t('create.voice.badge.free') },
    { value: 'wavenet', label: t('create.voice.categories.wavenet'), icon: 'star', badge: t('create.voice.badge.premium') },
    { value: 'neural2', label: t('create.voice.categories.neural2'), icon: 'psychology', badge: t('create.voice.badge.premium') },
    { value: 'studio', label: t('create.voice.categories.studio'), icon: 'workspace-premium', badge: t('create.voice.badge.platinum') },
    { value: 'chirp3d', label: t('create.voice.categories.chirp3d'), icon: 'diamond', badge: t('create.voice.badge.gold') },
  ];

  // Voice filters
  const accentOptions = [
    { value: 'all', label: t('create.voice.filters.all') },
    { value: 'american', label: t('create.voice.accents.american') },
    { value: 'british', label: t('create.voice.accents.british') },
    { value: 'australian', label: t('create.voice.accents.australian') },
    { value: 'canadian', label: t('create.voice.accents.canadian') },
    { value: 'indian', label: t('create.voice.accents.indian') },
  ];

  const genderOptions = [
    { value: 'all', label: t('create.voice.filters.all') },
    { value: 'male', label: t('create.voice.genders.male') },
    { value: 'female', label: t('create.voice.genders.female') },
  ];

  // Fetch available voices
  const fetchAvailableVoices = async () => {
    setLoadingVoices(true);
    try {
      const response = await apiService.getAvailableVoices();
      console.log('🎯 [VOICE DEBUG] Raw API Response:', response);
      
      // Backend'den { provider: 'google', voices: [...] } formatında geliyor
      const apiResponse = response as any;
      const voices = apiResponse.voices || apiResponse.data?.voices || [];
      
      if (voices.length > 0) {
        console.log('🎯 [VOICE DEBUG] Available voices loaded:', voices.length);
        console.log('🎯 [VOICE DEBUG] First voice:', voices[0]);
        
        // Voice alanlarını normalize et (name, category, accent, gender)
        const processedVoices = voices.map((voice: any) => {
          const name = voice.name || voice.voiceName || voice.id || voice.code;
          
          // Kategori
          let category = voice.category || voice.type || voice.voiceType;
          if (!category) {
            const voiceName = name || '';
            if (voiceName.includes('Chirp') || voiceName.toLowerCase().includes('chirp')) {
              category = 'chirp3d';
            } else if (voiceName.includes('Studio')) {
              category = 'studio';
            } else if (voiceName.toLowerCase().includes('neural2')) {
              category = 'neural2';
            } else if (voiceName.toLowerCase().includes('wavenet')) {
              category = 'wavenet';
            } else {
              category = 'standard';
            }
          }

          // Aksan
          const languageCode = voice.languageCode || voice.locale || voice.lang || '';
          const normalizedAccent = normalizeAccentValue(voice.accent, languageCode);

          // Cinsiyet
          const rawGender = voice.gender || voice.ssmlGender || voice.ssml_gender || voice.voiceGender;
          const normalizedGender = (rawGender || '').toString().toLowerCase();
          
          return {
            ...voice,
            name,
            category,
            accent: normalizedAccent,
            gender: normalizedGender,
          };
        });
        
        console.log('🎯 [VOICE DEBUG] Processed voices with categories:', processedVoices.length);
        console.log('🎯 [VOICE DEBUG] Sample processed voice:', processedVoices[0]);
        
        // Web tarafıyla birebir: Backend zaten filtreleyip gönderiyor → UI tarafında tekrar filtreleme yok
        setAvailableVoices(processedVoices);
        setSelectedVoice((prev: string) => {
          const source = processedVoices;
          if (source.some((v: any) => v.name === prev)) return prev;
          const preferred = source.find((v: any) => (selectedGender === 'all') || v.gender === selectedGender);
          return preferred?.name || source[0]?.name || prev;
        });
      } else {
        console.error('🎯 [VOICE DEBUG] No voices found in response:', response);
      }
    } catch (error) {
      console.error('🎯 [VOICE DEBUG] Error loading voices:', error);
    } finally {
      setLoadingVoices(false);
    }
  };

  // Fetch filtered voices
  const fetchFilteredVoices = async (accent?: string, gender?: string, category?: string) => {
    setLoadingVoices(true);
    try {
      const backendCategory = mapCategoryForBackend(category);
      console.log('🎯 [FILTER DEBUG] Backend request params -> accent:', accent, 'gender:', gender, 'category:', backendCategory);
      const response = await apiService.getFilteredVoices(accent, gender, undefined, backendCategory);
      console.log('🎯 [FILTER DEBUG] Raw filtered response:', response);

      // Response şekli: { provider, voices, ... } veya { success, data } olabilir
      const apiResponse: any = response as any;
      const voices: any[] =
        apiResponse?.voices ||
        apiResponse?.data?.voices ||
        (Array.isArray(apiResponse?.data) ? apiResponse.data : []) ||
        [];

      if (Array.isArray(voices) && voices.length >= 0) {
        console.log('🎯 [FILTER DEBUG] Voices array length:', voices.length);
        // Studio + Male fallback (backend deploy beklenirken geçici çözüm)
        if (voices.length === 0 && (category === 'studio') && (gender === 'male')) {
          const fallbackName = accent === 'british' ? 'en-GB-Studio-B' : accent === 'american' ? 'en-US-Studio-M' : undefined;
          if (fallbackName) {
            const fallback = [{
              name: fallbackName,
              category: 'studio',
              accent: accent,
              gender: 'male',
              displayName: fallbackName.includes('GB') ? 'UK English Male (Studio)' : 'US English Male (Studio)',
              ssmlSupport: false,
              package: 'Platinum',
              languageCode: fallbackName.includes('GB') ? 'en-GB' : 'en-US'
            }];
            console.warn('🎯 [FILTER DEBUG] Injecting frontend fallback for Studio+Male:', fallbackName);
            setAvailableVoices(fallback as any);
            setSelectedVoice(fallbackName);
            setLoadingVoices(false);
            return;
          }
        }

        // Wavenet + AU/CA/IN fallback (backend deploy beklenirken geçici çözüm)
        if (voices.length === 0 && (category === 'wavenet') && (accent === 'australian' || accent === 'canadian' || accent === 'indian')) {
          const map: Record<string, { male: string; female: string; lang: string } > = {
            australian: { male: 'en-AU-Wavenet-D', female: 'en-AU-Wavenet-A', lang: 'en-AU' },
            canadian:   { male: 'en-CA-Wavenet-D', female: 'en-CA-Wavenet-A', lang: 'en-CA' },
            indian:     { male: 'en-IN-Wavenet-D', female: 'en-IN-Wavenet-A', lang: 'en-IN' },
          };
          const cfg = map[accent];
          const chosen = (gender === 'male') ? cfg.male : cfg.female;
          const fallback = [{
            name: chosen,
            category: 'wavenet',
            accent: accent,
            gender: gender || 'female',
            displayName: chosen.split('-').slice(-1)[0],
            ssmlSupport: true,
            package: 'Premium',
            languageCode: cfg.lang,
          }];
          console.warn('🎯 [FILTER DEBUG] Injecting frontend fallback for Wavenet:', chosen);
          setAvailableVoices(fallback as any);
          setSelectedVoice(chosen);
          setLoadingVoices(false);
          return;
        }
        // Voice alanlarını normalize et (name, category, accent, gender)
        const processedVoices = voices.map((voice: any) => {
          const name = voice.name || voice.voiceName || voice.id || voice.code;

          // Kategori
          let category = voice.category || voice.type || voice.voiceType;
          if (!category) {
            const voiceName = name || '';
            if (voiceName.includes('Chirp') || voiceName.toLowerCase().includes('chirp')) {
              category = 'chirp3d';
            } else if (voiceName.includes('Studio')) {
              category = 'studio';
            } else if (voiceName.toLowerCase().includes('neural2')) {
              category = 'neural2';
            } else if (voiceName.toLowerCase().includes('wavenet')) {
              category = 'wavenet';
            } else {
              category = 'standard';
            }
          }

          // Aksan
          const languageCode = voice.languageCode || voice.locale || voice.lang || '';
          let normalizedAccent = (voice.accent || '').toString().toLowerCase();
          if (!normalizedAccent) {
            const lc = languageCode.toLowerCase();
            if (lc.includes('-gb')) normalizedAccent = 'british';
            else if (lc.includes('-us')) normalizedAccent = 'american';
            else if (lc.includes('-au')) normalizedAccent = 'australian';
            else if (lc.includes('-ca')) normalizedAccent = 'canadian';
            else if (lc.includes('-in')) normalizedAccent = 'indian';
            else normalizedAccent = 'american';
          }

          // Cinsiyet
          const rawGender = voice.gender || voice.ssmlGender || voice.ssml_gender || voice.voiceGender;
          const normalizedGender = (rawGender || '').toString().toLowerCase();
          
          return {
            ...voice,
            name,
            category,
            accent: normalizedAccent,
            gender: normalizedGender,
          };
        });
        
        setAvailableVoices(processedVoices);
        // Keep current selection if still valid; otherwise pick the first from filtered list
        setSelectedVoice((prev) => {
          if (processedVoices.some(v => v.name === prev)) return prev;
          // Prefer a voice that matches selected gender when available
          const preferred = processedVoices.find(v => (selectedGender === 'all') || v.gender === selectedGender);
          return preferred?.name || processedVoices[0]?.name || prev;
        });
        console.log('✅ Loaded filtered voices with categories:', processedVoices.length);
      }
    } catch (error) {
      console.error('❌ Error loading filtered voices:', error);
    } finally {
      setLoadingVoices(false);
    }
  };

  const filterVoices = (
    voices: Voice[],
    category: string,
    gender: string,
    accent: string
  ) => {
    return voices
      .filter(v => category === 'standard' || v.category === category)
      .filter(v => gender === 'all' || v.gender === gender)
      .filter(v => accent === 'all' || v.accent === accent);
  };

  const getFilteredVoicesByCategory = () => {
    console.log('🎯 [FILTER DEBUG] Using backend/available voices:', availableVoices.length);
    console.log('🎯 [FILTER DEBUG] Selected filters -> category:', selectedVoiceCategory, 'gender:', selectedGender, 'accent:', selectedAccent);
    // Web'de olduğu gibi: filtre aktifse backend zaten filtrelenmiş listyi gönderiyor → doğrudan göster
    if (hasActiveFilters) {
      console.log('🎯 [FILTER DEBUG] Backend-filtered mode active. Returning availableVoices directly:', availableVoices.length);
    return availableVoices;
    }
    // Filtre yoksa local kategori/gender/aksan filtresi uygula
    const result = filterVoices(availableVoices, selectedVoiceCategory, selectedGender, selectedAccent);
    console.log('🎯 [FILTER DEBUG] UI filtered voices count:', result.length);
    return result;
  };

  // --- Book Search Handlers ---
  const handleSearchBooks = async (nextPage?: number) => {
    const hasCriteria = bookQ.trim() || bookTitle.trim() || bookAuthor.trim();
    if (!hasCriteria) return;
    setIsSearchingBooks(true);
    try {
      const res = await apiService.searchBooks({ q: bookQ, title: bookTitle, author: bookAuthor, page: nextPage || 1, per_page: 10 });
      setBookResults(res.books || []);
      setBookPage(res.page || 1);
      setBookTotalPages(res.total_pages || 1);
      setSelectedBook(null);
      setBookChapters([]);
      setSelectedChapterId(null);
      setSelectedChapterText('');
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message || t('Arama başarısız'));
    } finally {
      setIsSearchingBooks(false);
    }
  };

  const handleLoadChapters = async (book: any) => {
    setSelectedBook(book);
    setIsLoadingChapters(true);
    try {
      const list = await apiService.getBookChapters(book.id);
      setBookChapters(list || []);
      // Auto-select first chapter text if available
      if (Array.isArray(list) && list.length > 0) {
        const first = list[0];
        setSelectedChapterId(first.id);
        setSelectedChapterText(first.chapter_text || '');
      } else {
        setSelectedChapterId(null);
        setSelectedChapterText('');
      }
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message || t('Bölümler alınamadı'));
    } finally {
      setIsLoadingChapters(false);
    }
  };

  // Load voices, then load default voice and apply matching filters so it appears selected
  useEffect(() => {
    (async () => {
      try {
        await fetchAvailableVoices();
        const settings = await getUserSettings();
        if (settings?.default_voice) {
          const dv = settings.default_voice;
          setSelectedVoice(dv);
          const derived = deriveFiltersFromVoiceName(dv);
          setSelectedVoiceCategory(derived.category);
          setSelectedAccent(derived.accent);
          setSelectedGender('all');
          // Refresh list with filters to ensure default voice is included
          await fetchFilteredVoices(derived.accent, 'all', derived.category);
          // Ensure the selected voice remains selected after list refresh
          setSelectedVoice(dv);
          console.log('🎯 [DEFAULT VOICE] Applied with filters:', dv, derived);
        }
      } catch (e) {
        console.log('Default voice could not be loaded/applied');
      }
    })();
  }, []);

  // Keep selected voice at top whenever available voices change
  useEffect(() => {
    if (!selectedVoice || availableVoices.length === 0) return;
    const index = availableVoices.findIndex(v => v.name === selectedVoice);
    if (index > 0) {
      const reordered = [availableVoices[index], ...availableVoices.filter((_, i) => i !== index)];
      if (JSON.stringify(reordered.map(v => v.name)) !== JSON.stringify(availableVoices.map(v => v.name))) {
        setAvailableVoices(reordered);
      }
    }
  }, [availableVoices, selectedVoice]);

  // Update filtered voices when filters change
  useEffect(() => {
    // Eğer kategori seçiliyse ve accent/gender filtresi de varsa, backend'den filtrele
    if (selectedVoiceCategory !== 'standard' && (selectedAccent !== 'all' || selectedGender !== 'all')) {
      // Hem kategori hem de accent/gender filtresi varsa backend'den filtrele
      fetchFilteredVoices(selectedAccent, selectedGender, selectedVoiceCategory);
    } else if (selectedAccent !== 'all' || selectedGender !== 'all') {
      // Sadece accent/gender filtresi varsa backend'den filtrele
      fetchFilteredVoices(selectedAccent, selectedGender);
    } else {
      // Hiç filtre yoksa veya sadece kategori filtresi varsa tüm sesleri getir
      fetchAvailableVoices();
    }
  }, [selectedAccent, selectedGender, selectedVoiceCategory]);

  const handleCreateAudio = async () => {
    // Suggestion mode: if no input yet, rewrite the topic/suggestion into narration text first
    let effectiveInputText = inputText;
    if (mode === 'suggestion' && !effectiveInputText.trim()) {
      const base = (suggestionResults && suggestionResults.length > 0)
        ? suggestionResults[0]
        : suggestion;
      if (!base || !base.trim()) {
        Alert.alert(t('common.error'), t('suggestions.alerts.pleaseEnterTopic'));
        return;
      }
      try {
        setIsLoading(true);
        const rr = await apiService.rewriteToNarration(base, selectedLevel);
        const narration = rr?.data?.narration_text || base;
        effectiveInputText = narration;
        setInputText(narration);
      } catch (e: any) {
        setIsLoading(false);
        Alert.alert(t('common.error'), e.message || t('common.unexpectedError'));
        return;
      }
    }

    if (mode === 'book') {
      if (!selectedChapterText || selectedChapterText.trim().length === 0) {
        Alert.alert(t('common.error'), t('create.book.alerts.selectChapter'));
        return;
      }
    } else if (!effectiveInputText.trim() && !selectedFile) {
      Alert.alert(t('common.error'), t('create.alerts.enterTextOrFile'));
      return;
    }

    setIsLoading(true);
    try {
      let request: TTSRequest;
      
      if (selectedFile) {
        // File upload process
        console.log('📁 Processing file:', selectedFile.name);
        
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('file', {
          uri: selectedFile.uri,
          type: selectedFile.mimeType,
          name: selectedFile.name,
        } as any);
        
        // Required parameters that backend expects
        formData.append('type', 'file');
        formData.append('input', selectedFile.name); // File name as input
        formData.append('level', selectedLevel);
        // Backend controller 'speakingRate' ve 'voice' alanlarını okuyor
        formData.append('speakingRate', speechRate.toString());
        formData.append('voice', selectedVoice);
        // Eski alanları da geriye dönük uyumluluk için gönderelim
        formData.append('sesHizi', speechRate.toString());
        formData.append('voiceName', selectedVoice);
        formData.append('gender', selectedGender);
        formData.append('accent', selectedAccent);
        
        console.log('📦 [FILE DEBUG] FormData parameters:', {
          type: 'file',
          input: selectedFile.name,
          level: selectedLevel,
          sesHizi: speechRate.toString(),
          voiceName: selectedVoice,
          fileName: selectedFile.name,
          fileUri: selectedFile.uri,
          fileMimeType: selectedFile.mimeType
        });

        console.log('📦 [FILE DEBUG] Calling processFileToSpeech...');
        
        const response = await apiService.processFileToSpeech(formData);
        
        if (response.success) {
          // Success: directly navigate to Library and refresh there
          setInputText('');
          setSelectedFile(null);
          navigation.navigate('Library' as never);
        } else {
          Alert.alert(t('common.error'), response.message || t('create.alerts.fileProcessFailed'));
        }
      } else if (mode === 'text' || mode === 'suggestion') {
        // Text processing
        request = {
          type: 'text',
          input: effectiveInputText,
          level: selectedLevel,
          // Backend 'voice' ve 'speakingRate' bekliyor
          speakingRate: speechRate,
          voice: selectedVoice,
          // Geriye dönük
          sesHizi: speechRate,
          voiceName: selectedVoice,
          gender: selectedGender as any,
          accent: selectedAccent as any,
        };

        console.log('📝 [TEXT DEBUG] Request parameters:', {
          type: 'text',
          input: effectiveInputText.substring(0, 50) + (effectiveInputText.length > 50 ? '...' : ''),
          level: selectedLevel,
          sesHizi: speechRate,
          voiceName: selectedVoice
        });

        console.log('🎯 [TTS DEBUG] Sending request:', request);
        console.log('🎯 [TTS DEBUG] Selected voice:', selectedVoice);
        console.log('🎯 [TTS DEBUG] Available voices count:', availableVoices.length);

        const response = await apiService.processTextToSpeech(request);
        
        console.log('🎯 [TTS DEBUG] Full API Response:', response);
        console.log('🎯 [TTS DEBUG] Response success:', response.success);
        console.log('🎯 [TTS DEBUG] Response message:', response.message);
        console.log('🎯 [TTS DEBUG] Response mp3_url:', response.mp3_url);
        
        if (response.success) {
          // Success: directly navigate to Library and refresh there
          setInputText('');
          navigation.navigate('Library' as never);
        } else {
          console.log('🎯 [TTS DEBUG] Response success is false, showing error...');
          Alert.alert(t('common.error'), response.message || t('create.alerts.audioCreateFailed'));
        }
      } else if (mode === 'book') {
        // Use selected chapter text
        request = {
          type: 'text',
          input: selectedChapterText,
          level: selectedLevel,
          speakingRate: speechRate,
          voice: selectedVoice,
          sesHizi: speechRate,
          voiceName: selectedVoice,
          gender: selectedGender as any,
          accent: selectedAccent as any,
        };

        console.log('📚 [BOOK TTS] Using chapter text length:', selectedChapterText.length);
        const response = await apiService.processTextToSpeech(request);
        if (response.success) {
          setSelectedBook(null);
          setSelectedChapterId(null);
          setSelectedChapterText('');
          navigation.navigate('Library' as never);
        } else {
          Alert.alert(t('common.error'), response.message || t('create.book.alerts.ttsFailed'));
        }
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('common.unexpectedError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async () => {
    try {
      console.log('📁 Opening document picker...');
      
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      console.log('📁 Document picker result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFile(file);
        setInputText(''); // Clear text input when file is selected
        
        Alert.alert(
          t('create.alerts.fileSelectedTitle'),
          t('create.alerts.fileSelectedMessage', { fileName: file.name })
        );
        
        console.log('✅ File selected:', file.name, file.mimeType);
      }
    } catch (error: any) {
      console.error('❌ File picker error:', error);
      Alert.alert(t('common.error'), t('create.alerts.filePickError'));
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    Alert.alert(t('common.info'), t('create.alerts.fileCleared'));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('create.title')}</Text>
          <Text style={styles.subtitle}>
            {t('create.subtitle')}
          </Text>
        </View>

        {mode === 'text' && (
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>{t('create.input.title')}</Text>
            <TextInput
              style={[styles.textInput, selectedFile && styles.textInputDisabled]}
              placeholder={selectedFile ? t('create.input.placeholderDisabled') : t('create.input.placeholder')}
              value={inputText}
              onChangeText={setInputText}
              multiline
              textAlignVertical="top"
              editable={!selectedFile}
            />
            {!selectedFile && <Text style={styles.charCount}>{t('create.input.charCount', { count: inputText.length })}</Text>}
          </View>
        )}

        {/* Divider hidden in single-mode screens */}

        {mode === 'suggestion' && (
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>{t('suggestions.title')}</Text>
            <TextInput
              style={[styles.textInput]}
              placeholder={t('suggestions.input.placeholder')}
              value={suggestion}
              onChangeText={setSuggestion}
            />
            <TouchableOpacity
              style={[styles.searchButton, isLoadingSuggestions && styles.createButtonDisabled]}
              onPress={handleGetSuggestions}
              disabled={isLoadingSuggestions}
            >
              {isLoadingSuggestions ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Icon name="lightbulb" size={20} color="#fff" />
                  <Text style={styles.createButtonText}>{t('suggestions.buttons.getSuggestions')}</Text>
                </>
              )}
            </TouchableOpacity>
            {suggestionResults.length > 0 && (
              <View style={{ marginTop: 8 }}>
                {suggestionResults.map((s, idx) => (
                  <TouchableOpacity
                    key={`${idx}-${s.substring(0,10)}`}
                    style={styles.bookCard}
                    onPress={async () => {
                      try {
                        const rr = await apiService.rewriteToNarration(s, selectedLevel);
                        const narration = rr?.data?.narration_text || s;
                        setInputText(narration);
                        setMode('text');
                        Alert.alert(t('common.success'), t('Öneri metne dönüştürüldü'));
                      } catch (e: any) {
                        Alert.alert(t('common.error'), e.message || t('common.unexpectedError'));
                      }
                    }}
                  >
                    <View style={{ marginRight: 10 }}><Icon name="description" size={20} color="#FF9500" /></View>
                    <Text style={{ flex: 1, color: '#333' }}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {mode === 'book' && (
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>{t('create.book.title')}</Text>
            <View style={styles.bookSearchRow}>
              <Icon name="search" size={20} color="#666" />
              <TextInput
                style={[styles.textField]}
                placeholder={t('create.book.inputs.qPlaceholder')}
                value={bookQ}
                onChangeText={setBookQ}
                returnKeyType="search"
                onSubmitEditing={() => handleSearchBooks(1)}
              />
            </View>
            <View style={styles.bookSearchRow}>
              <Icon name="title" size={20} color="#666" />
              <TextInput
                style={[styles.textField]}
                placeholder={t('create.book.inputs.titlePlaceholder')}
                value={bookTitle}
                onChangeText={setBookTitle}
                returnKeyType="search"
                onSubmitEditing={() => handleSearchBooks(1)}
              />
            </View>
            <View style={styles.bookSearchRow}>
              <Icon name="person" size={20} color="#666" />
              <TextInput
                style={[styles.textField]}
                placeholder={t('create.book.inputs.authorPlaceholder')}
                value={bookAuthor}
                onChangeText={setBookAuthor}
                returnKeyType="search"
                onSubmitEditing={() => handleSearchBooks(1)}
              />
            </View>
            <TouchableOpacity
              style={[styles.searchButton, !(bookQ.trim() || bookTitle.trim() || bookAuthor.trim()) && styles.createButtonDisabled]}
              onPress={() => handleSearchBooks(1)}
              disabled={isSearchingBooks || !(bookQ.trim() || bookTitle.trim() || bookAuthor.trim())}
            >
              {isSearchingBooks ? <ActivityIndicator color="white" size="small" /> : (
                <>
                  <Icon name="search" size={20} color="#fff" />
                  <Text style={styles.createButtonText}>{t('create.book.buttons.search')}</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Results */}
            {!selectedBook ? (
              <View style={{ marginTop: 12 }}>
                {bookResults.map((b) => (
                  <TouchableOpacity key={b.id} style={styles.bookCard} onPress={() => handleLoadChapters(b)}>
                    <View style={{ marginRight: 10 }}><Icon name="menu-book" size={24} color="#3f51b5" /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bookTitle}>{b.title}</Text>
                      <Text style={styles.bookAuthor}>{b.authors}</Text>
                    </View>
                    <Icon name="chevron-right" size={18} color="#999" />
                  </TouchableOpacity>
                ))}
                {bookResults.length === 0 && !isSearchingBooks && (
                  <Text style={{ color: '#888', textAlign: 'center', marginTop: 8 }}>{t('create.book.emptyResults')}</Text>
                )}
              </View>
            ) : (
              <View style={{ marginTop: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <TouchableOpacity onPress={() => { setSelectedBook(null); setBookChapters([]); setSelectedChapterId(null); setSelectedChapterText(''); }}>
                    <Icon name="arrow-back" size={22} color="#007AFF" />
                  </TouchableOpacity>
                  <Text style={[styles.bookTitle, { marginLeft: 8 }]} numberOfLines={1}>{selectedBook.title}</Text>
                </View>
                {isLoadingChapters ? (
                  <ActivityIndicator color="#007AFF" />
                ) : (
                  <View>
                    {bookChapters.map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        style={[styles.chapterItem, selectedChapterId === c.id && styles.chapterItemActive]}
                        onPress={() => { setSelectedChapterId(c.id); setSelectedChapterText(c.chapter_text || ''); }}
                      >
                        <View style={styles.chapterIndex}><Text style={styles.chapterIndexText}>{c.chapter_index}</Text></View>
                        <Text style={styles.chapterTitle} numberOfLines={2}>{c.chapter_title}</Text>
                        {selectedChapterId === c.id && <Icon name="check" size={18} color="#007AFF" />}
                      </TouchableOpacity>
                    ))}
                    {bookChapters.length === 0 && (
                      <Text style={{ color: '#888', textAlign: 'center', marginTop: 8 }}>{t('create.book.noChapters')}</Text>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {mode === 'file' && (
          selectedFile ? (
            <View style={styles.selectedFileContainer}>
              <View style={styles.selectedFileInfo}>
                <Icon name="insert-drive-file" size={24} color="#007AFF" />
                <View style={styles.fileDetails}>
                  <Text style={styles.fileName}>{selectedFile.name}</Text>
                  <Text style={styles.fileSize}>
                    {selectedFile.size ? `${Math.round(selectedFile.size / 1024)} KB` : 'Boyut bilinmiyor'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.clearFileButton} onPress={clearSelectedFile}>
                <Icon name="clear" size={20} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.fileButton} onPress={handleFileUpload}>
              <Icon name="upload-file" size={24} color="#007AFF" />
              <Text style={styles.fileButtonText}>{t('create.file.uploadButton')}</Text>
            </TouchableOpacity>
          )
        )}

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>{t('create.cefr.title')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.levelSelector}
          >
            {levels.map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.levelButton,
                  selectedLevel === level && styles.levelButtonActive,
                ]}
                onPress={() => setSelectedLevel(level)}
              >
                <Text
                  style={[
                    styles.levelButtonText,
                    selectedLevel === level && styles.levelButtonTextActive,
                  ]}
                >
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.levelDescription}>{levelDescriptions[selectedLevel]}</Text>
        </View>

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>{t('create.speed.title')}</Text>
          <View style={styles.speedContainer}>
            <TouchableOpacity
              style={styles.speedButton}
              onPress={() => setSpeechRate(Math.max(0.5, speechRate - 0.1))}
            >
              <Icon name="remove" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.speedText}>{speechRate.toFixed(1)}x</Text>
            <TouchableOpacity
              style={styles.speedButton}
              onPress={() => setSpeechRate(Math.min(2.0, speechRate + 0.1))}
            >
              <Icon name="add" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.speedLabels}>
            <Text style={styles.speedLabel}>{t('create.speed.slow')}</Text>
            <Text style={styles.speedLabel}>{t('create.speed.normal')}</Text>
            <Text style={styles.speedLabel}>{t('create.speed.fast')}</Text>
          </View>
        </View>

        {/* Voice Selection Section */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>{t('create.voice.title')}</Text>
          
          {/* Voice Categories */}
          <View style={styles.voiceCategoryContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {voiceCategories.map((category) => (
                <TouchableOpacity
                  key={category.value}
                  style={[
                    styles.voiceCategoryButton,
                    selectedVoiceCategory === category.value && styles.voiceCategoryButtonActive,
                  ]}
                  onPress={() => {
                    const newCategory = category.value;
                    setSelectedVoiceCategory(newCategory);
                    // Reset voice selection when category changes
                    const filteredVoices = filterVoices(
                      availableVoices,
                      newCategory,
                      selectedGender,
                      selectedAccent
                    );
                    if (filteredVoices.length > 0) {
                      const preferred = filteredVoices.find(v => (selectedGender === 'all') || v.gender === selectedGender);
                      setSelectedVoice(preferred?.name || filteredVoices[0].name);
                    }
                  }}
                >
                  <Icon name={category.icon} size={16} color={selectedVoiceCategory === category.value ? '#FFF' : '#007AFF'} />
                  <Text style={[
                    styles.voiceCategoryText,
                    selectedVoiceCategory === category.value && styles.voiceCategoryTextActive,
                  ]}>
                    {category.label}
                  </Text>
                  <View style={styles.voiceBadge}>
                    <Text style={styles.voiceBadgeText}>{category.badge}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Voice Filters */}
          <View style={styles.voiceFiltersContainer}>
            <View style={styles.filterRow}>
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>{t('create.voice.filters.accent')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {accentOptions.map((accent) => (
                    <TouchableOpacity
                      key={accent.value}
                      style={[
                        styles.filterButton,
                        selectedAccent === accent.value && styles.filterButtonActive,
                      ]}
                      onPress={() => setSelectedAccent(accent.value)}
                    >
                      <Text style={[
                        styles.filterButtonText,
                        selectedAccent === accent.value && styles.filterButtonTextActive,
                      ]}>
                        {accent.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>{t('create.voice.filters.gender')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {genderOptions.map((gender) => (
                    <TouchableOpacity
                      key={gender.value}
                      style={[
                        styles.filterButton,
                        selectedGender === gender.value && styles.filterButtonActive,
                      ]}
                      onPress={() => setSelectedGender(gender.value)}
                    >
                      <Text style={[
                        styles.filterButtonText,
                        selectedGender === gender.value && styles.filterButtonTextActive,
                      ]}>
                        {gender.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>

          {/* Voice Selection Button */}
          <TouchableOpacity
            style={styles.voiceSelectionButton}
            onPress={async () => {
              // Modal açılmadan önce web'deki gibi mevcut filtrelerle backend'den tazele
              try {
                if (hasActiveFilters) {
                  console.log('🎯 [FILTER DEBUG] Opening modal → refreshing filtered voices...');
                  await fetchFilteredVoices(selectedAccent, selectedGender, selectedVoiceCategory);
                } else {
                  console.log('🎯 [FILTER DEBUG] Opening modal → refreshing all voices...');
                  await fetchAvailableVoices();
                }
              } catch (e) {
                console.warn('⚠️ [FILTER DEBUG] Pre-open refresh failed:', e);
              }
              setShowVoiceSelection(true);
            }}
          >
            <Icon name="record-voice-over" size={24} color="#007AFF" />
            <View style={styles.voiceSelectionInfo}>
              <Text style={styles.voiceSelectionText}>
                {selectedVoice || t('create.voice.selectPrompt')}
              </Text>
              <Text style={styles.voiceSelectionSubtext}>
                {getFilteredVoicesByCategory().find(v => v.name === selectedVoice)?.description || t('create.voice.selectHint')}
              </Text>
            </View>
            <Icon name="arrow-forward-ios" size={16} color="#007AFF" />
          </TouchableOpacity>

          {selectedVoice ? (
            <TouchableOpacity
              style={[styles.defaultVoiceButton, !selectedVoice && styles.createButtonDisabled]}
              onPress={async () => {
                try {
                  const response = await saveDefaultVoiceSetting(selectedVoice);
                  Alert.alert(t('common.success'), t('Varsayılan ses kaydedildi'));
                } catch (e: any) {
                  Alert.alert(t('common.error'), e.message || 'Kaydedilemedi');
                }
              }}
              disabled={!selectedVoice}
            >
              <Text style={styles.defaultVoiceButtonText}>Varsayılan Ses Seç</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Voice Selection Modal - uses RN Modal so it opens in viewport regardless of scroll */}
        <Modal
          visible={showVoiceSelection}
          transparent
          animationType="fade"
          onRequestClose={() => setShowVoiceSelection(false)}
        >
          <View style={styles.voiceModalBackdrop}>
            <View style={[styles.voiceModalContent, { maxHeight: '75%', width: '92%' }]}>
              <View style={styles.voiceModalHeader}>
                <Text style={styles.voiceModalTitle}>{t('create.voice.modal.title')}</Text>
                <TouchableOpacity onPress={() => setShowVoiceSelection(false)}>
                  <Icon name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              {loadingVoices ? (
                <ActivityIndicator size="large" color="#007AFF" style={styles.voiceLoader} />
              ) : (
                <ScrollView style={styles.voiceList}>
                  {getFilteredVoicesByCategory().map((item) => (
                    <TouchableOpacity
                      key={item.name}
                      style={[
                        styles.voiceItem,
                        selectedVoice === item.name && styles.voiceItemActive,
                      ]}
                      onPress={() => {
                        setSelectedVoice(item.name);
                        setShowVoiceSelection(false);
                      }}
                    >
                      <View style={styles.voiceItemInfo}>
                        <Text style={styles.voiceItemName}>{item.name}</Text>
                        <Text style={styles.voiceItemDescription}>
                          {(item.accent === 'american' && t('create.voice.accents.american')) ||
                           (item.accent === 'british' && t('create.voice.accents.british')) ||
                           (item.accent === 'australian' && t('create.voice.accents.australian')) ||
                           (item.accent === 'canadian' && t('create.voice.accents.canadian')) ||
                           (item.accent === 'indian' && t('create.voice.accents.indian')) || item.accent}
                          {` • ${item.gender === 'male' ? t('create.voice.genders.male') : t('create.voice.genders.female')}`}
                        </Text>
                        {item.ssmlSupport && (
                          <Text style={styles.voiceItemSSML}>{t('create.voice.modal.ssmlSupported')}</Text>
                        )}
                      </View>
                      {selectedVoice === item.name && (
                        <Icon name="check" size={20} color="#007AFF" />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        <TouchableOpacity
          style={[styles.createButton, isLoading && styles.createButtonDisabled]}
          onPress={handleCreateAudio}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Icon name="volume-up" size={24} color="white" />
          )}
          <Text style={styles.createButtonText}>
            {isLoading ? (selectedFile ? t('create.buttons.processingFile') : t('create.buttons.processing')) : t('create.buttons.createAudio')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  // Book search styles
  bookSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: '#fafafa',
    gap: 8,
  },
  textField: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 0,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  bookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3f51b5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 8,
  },
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#009688',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 8,
    gap: 10,
  },
  chapterItemActive: {
    borderWidth: 2,
    borderColor: '#009688',
  },
  chapterIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#009688',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterIndexText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 12,
  },
  chapterTitle: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  bookAuthor: {
    fontSize: 13,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  inputSection: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 15,
    color: '#666',
    fontSize: 14,
  },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  fileButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  settingsSection: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },
  levelSelector: {
    marginBottom: 10,
  },
  levelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  levelButtonActive: {
    backgroundColor: '#007AFF',
  },
  levelButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  levelButtonTextActive: {
    color: 'white',
  },
  levelDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  speedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  speedButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  speedText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 20,
    minWidth: 50,
    textAlign: 'center',
  },
  speedLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  speedLabel: {
    fontSize: 12,
    color: '#666',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  defaultVoiceButton: {
    marginTop: 10,
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  defaultVoiceButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  textInputDisabled: {
    backgroundColor: '#f8f8f8',
    color: '#999',
  },
  selectedFileContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedFileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileDetails: {
    marginLeft: 12,
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 14,
    color: '#666',
  },
  clearFileButton: {
    padding: 8,
    backgroundColor: '#FFE5E5',
    borderRadius: 20,
  },
  
  // Voice Selection Styles
  voiceCategoryContainer: {
    marginBottom: 16,
  },
  voiceCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  voiceCategoryButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  voiceCategoryText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginLeft: 4,
  },
  voiceCategoryTextActive: {
    color: 'white',
  },
  voiceBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  voiceBadgeText: {
    fontSize: 10,
    color: '#007AFF',
    fontWeight: '600',
  },
  voiceFiltersContainer: {
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterGroup: {
    flex: 1,
    marginRight: 8,
  },
  filterLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 6,
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  voiceSelectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  voiceSelectionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  voiceSelectionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  voiceSelectionSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  voiceModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  // New: Backdrop for RN Modal to center content on screen
  voiceModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '70%',
  },
  voiceModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  voiceModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  voiceLoader: {
    paddingVertical: 40,
  },
  voiceList: {
    maxHeight: 300,
  },
  voiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f8f8f8',
  },
  voiceItemActive: {
    backgroundColor: '#E3F2FD',
  },
  voiceItemInfo: {
    flex: 1,
  },
  voiceItemName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  voiceItemDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  voiceItemSSML: {
    fontSize: 10,
    color: '#4CAF50',
    marginTop: 2,
    fontWeight: '600',
  },
  });

export default CreateScreen; 