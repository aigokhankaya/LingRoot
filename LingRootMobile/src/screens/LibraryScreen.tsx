import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AudioTrack, CEFRLevel } from '../types';
import {
  getUserAudioHistory,
  getUserContentById,
  getUserFavorites,
  saveUserFavorites,
  getUserFavoriteDetails
} from '../services/contentService';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAudioContext } from '../contexts/AudioContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AudioPlayer from '../components/AudioPlayer';
import { COLORS } from '../theme/colors';

type ContentType = 'all' | 'podcast' | 'text' | 'topic' | 'file' | 'book';

const LibraryScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { isTrackPlaying, currentTrack, isPlaying } = useAudioContext();
  const { t, language } = useLanguage();
  const [searchText, setSearchText] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel | 'all'>('all');
  const [selectedType, setSelectedType] = useState<ContentType>('all');
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<AudioTrack | null>(null);
  const [playerVisible, setPlayerVisible] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const { user } = useAuth();
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasUserScrolled, setHasUserScrolled] = useState(false);
  const [serverTotalCount, setServerTotalCount] = useState<number | null>(null);
  const [isHydratingFavorites, setIsHydratingFavorites] = useState(false);
  const audioTracksRef = useRef<AudioTrack[]>([]);
  const pageRef = useRef<number>(1);
  const [highlightMode, setHighlightMode] = useState<'word' | 'sentence'>('word');

  const levels: (CEFRLevel | 'all')[] = ['all', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  const typeOptions: { id: ContentType; labelTr: string; labelEn: string; icon: string }[] = [
    { id: 'all', labelTr: 'Tümü', labelEn: 'All', icon: 'apps' },
    { id: 'podcast', labelTr: 'Podcast', labelEn: 'Podcast', icon: 'podcasts' },
    { id: 'text', labelTr: 'Metin', labelEn: 'Text', icon: 'text-fields' },
    { id: 'topic', labelTr: 'Konu Ağacı', labelEn: 'Topic Tree', icon: 'account-tree' },
    { id: 'file', labelTr: 'Doküman', labelEn: 'Document', icon: 'insert-drive-file' },
    { id: 'book', labelTr: 'Kitap', labelEn: 'Book', icon: 'menu-book' },
  ];

  // Handle navigation from audio_created notification
  useEffect(() => {
    const params: any = (route as any).params || {};
    const audioData = params.notificationAudio;

    if (!audioData) {
      return;
    }

    const resolveNotificationAudio = async () => {
      try {
        console.log('[Library][Notification] Received notificationAudio:', {
          keys: Object.keys(audioData || {}),
          hasOriginalTurkish: !!audioData?.original_turkish,
          originalTurkishLength: audioData?.original_turkish ? String(audioData.original_turkish).length : 0,
          hasWords: Array.isArray(audioData?.words),
          hasTimepoints: Array.isArray(audioData?.timepoints),
        });

        let source: any = audioData;

        // If we only received a small summary (from FCM), hydrate full data from backend
        const needsHydration = (
          !Array.isArray(audioData.timepoints) || audioData.timepoints.length === 0 ||
          !Array.isArray(audioData.words) || audioData.words.length === 0 ||
          !audioData.original_turkish
        );

        const audioId = audioData.audioId || audioData.id;

        if (needsHydration && audioId) {
          try {
            const res: any = await getUserContentById(String(audioId));
            if (res?.success && res?.data) {
              const backendData = res.data;
              let words = backendData.words;
              let timepoints = backendData.timepoints;

              try {
                if (typeof words === 'string') {
                  words = JSON.parse(words);
                }
              } catch { }

              try {
                if (typeof timepoints === 'string') {
                  timepoints = JSON.parse(timepoints);
                }
              } catch { }

              source = {
                ...audioData,
                ...backendData,
                words: Array.isArray(words) ? words : (audioData.words || []),
                timepoints: Array.isArray(timepoints) ? timepoints : (audioData.timepoints || []),
                original_turkish:
                  backendData.original_turkish ||
                  backendData.input ||
                  audioData.original_turkish ||
                  '',
                mp3_url: backendData.mp3_url || audioData.mp3_url || audioData.url,
              };

              console.log('[Library][Notification] Hydrated audio data from backend:', {
                id: source.id || audioId,
                hasOriginalTurkish: !!source.original_turkish,
                wordsLength: Array.isArray(source.words) ? source.words.length : 0,
                timepointsLength: Array.isArray(source.timepoints) ? source.timepoints.length : 0,
              });
            }
          } catch (e) {
            console.log('[Library][Notification] Failed to hydrate notification audio from backend:', e);
          }
        }

        const track: AudioTrack = {
          id: String(source.audioId || source.id || Date.now().toString()),
          title: source.title || source.adapted_text || source.translated_text || 'Yeni Ses',
          url: source.mp3_url || source.url || '',
          level: (source.level || 'B1') as CEFRLevel,
          duration: typeof source.duration === 'number' ? source.duration : 180,
          created_at: source.created_at || new Date().toISOString(),
          input_type: source.input_type,
          translated_text: source.translated_text,
          adapted_text: source.adapted_text,
          original_turkish: source.original_turkish || '',
          mp3_url: source.mp3_url || source.url,
          timepoints: Array.isArray(source.timepoints) ? source.timepoints : [],
          words: Array.isArray(source.words) ? source.words : [],
        };

        console.log('[Library][Notification] Created track from notification:', {
          id: track.id,
          level: track.level,
          hasOriginalTurkish: !!track.original_turkish,
          originalTurkishLength: track.original_turkish ? track.original_turkish.length : 0,
          words: Array.isArray(track.words) ? track.words.length : 0,
          timepoints: Array.isArray(track.timepoints) ? track.timepoints.length : 0,
        });

        // Optionally prepend to list if not already present
        const exists = audioTracksRef.current.some(t => t.id === track.id);
        if (!exists) {
          const merged = [track, ...audioTracksRef.current];
          audioTracksRef.current = merged;
          setAudioTracks(merged);
        }

        setSelectedTrack(track);
        setPlayerVisible(true);
      } catch (e) {
        // Silent error - player will not open if something goes wrong
      } finally {
        // Clear param so it doesn't trigger again on re-render
        try {
          navigation.setParams({ notificationAudio: undefined });
        } catch {
          // ignore
        }
      }
    };

    resolveNotificationAudio();
  }, [route, navigation]);

  // Fetch audio history from API
  const fetchAudioHistory = async (showLoading = true, nextPage?: number) => {
    if (!user?.id) {
      setLoading(false);
      setAudioTracks([]);
      return;
    }

    try {
      if (showLoading) {
        setLoading(true);
      }

      const currentPage = nextPage || 1;
      const response = await getUserAudioHistory(user.id, currentPage, PAGE_SIZE);

      if (response.success && response.data) {

        // Backend verilerini AudioTrack tipine dönüştür
        const tracks: AudioTrack[] = response.data.map((item: any) => {
          // Prefer backend-provided duration; fall back to 180 if missing
          const derivedDurationSec = typeof item?.duration === 'number' ? item.duration : 180;

          // words/timepoints bazı eski kayıtlar için JSON string olarak saklanmış olabilir;
          // burada güvenli şekilde parse edip diziye çeviriyoruz.
          let words: any = item.words;
          let timepoints: any = item.timepoints;

          try {
            if (typeof words === 'string') {
              words = JSON.parse(words);
            }
          } catch { }

          try {
            if (typeof timepoints === 'string') {
              timepoints = JSON.parse(timepoints);
            }
          } catch { }

          const track = {
            // ID'leri string olarak normalize et (favori eşleşmeleri için kritik)
            id: String(item.id),
            title: item.adapted_text || item.translated_text || item.input || 'Başlıksız',
            url: item.mp3_url || item.url || '',
            level: item.level || 'B1',
            duration: derivedDurationSec,
            created_at: item.created_at,
            input_type: item.input_type,
            translated_text: item.translated_text,
            adapted_text: item.adapted_text,
            original_turkish: item.input || '',
            mp3_url: item.mp3_url,
            timepoints: Array.isArray(timepoints) ? timepoints : [],
            words: Array.isArray(words) ? words : [],
          };

          return track;
        });

        if (currentPage === 1) {
          // Favoriler görünümünde listeyi tamamen sıfırlamak yerine birleştir
          if (showFavoritesOnly) {
            const existingIds = new Set(audioTracksRef.current.map(t => t.id));
            const mergedFirst = [...tracks, ...audioTracksRef.current.filter(t => !new Set(tracks.map(nt => nt.id)).has(t.id))];
            setAudioTracks(mergedFirst);
            audioTracksRef.current = mergedFirst;
          } else {
            setAudioTracks(tracks);
            audioTracksRef.current = tracks;
          }
        } else {
          // Append new page without duplicates (by id)
          const existingIds = new Set(audioTracksRef.current.map(t => t.id));
          const merged = [...audioTracksRef.current, ...tracks.filter(t => !existingIds.has(t.id))];
          setAudioTracks(merged);
          audioTracksRef.current = merged;
        }
        // Total count bilgisi farklı şekillerde gelebilir; güvenli kontrol yap
        const anyRes: any = response as any;
        const totalA = typeof anyRes?.total_count === 'number' ? anyRes.total_count : null;
        const totalB = typeof anyRes?.pagination?.total === 'number' ? anyRes.pagination.total : null;
        setServerTotalCount(totalA ?? totalB ?? null);
        setPage(currentPage);
        pageRef.current = currentPage;
        setHasUserScrolled(currentPage > 1);
      } else {
        setAudioTracks([]);
      }
    } catch (error) {

      // Check if it's a token expiration error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage === 'Token expired' || errorMessage.includes('Unauthorized')) {
        Alert.alert(
          'Oturum Süresi Doldu',
          'Lütfen tekrar giriş yapınız.',
          [
            { text: 'Tamam' }
          ]
        );
      } else {
        Alert.alert('Hata', 'Ses geçmişi yüklenirken hata oluştu');
      }

      setAudioTracks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Favorites helpers
  const favoritesKey = user?.id ? `favorites_${user.id}` : 'favorites_unknown_user';

  const loadFavorites = async () => {
    try {
      if (!user?.id) return;
      // pull from backend first
      const remote = await getUserFavorites();
      if (Array.isArray(remote) && remote.length > 0) {
        const normalized = remote.map((x: any) => String(x));
        setFavoriteIds(normalized);
        await AsyncStorage.setItem(favoritesKey, JSON.stringify(normalized));
        return;
      }

      // fallback to local
      const stored = await AsyncStorage.getItem(favoritesKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setFavoriteIds(parsed.map((x: any) => String(x)));
      }
    } catch (e) {

    }
  };

  const saveFavorites = async (ids: string[]) => {
    try {
      if (!user?.id) return;
      await AsyncStorage.setItem(favoritesKey, JSON.stringify(ids));
      // fire and forget remote save
      saveUserFavorites(ids).then((ok: boolean) => {
        if (!ok) {
          // ignore silently in production
        }
      });
    } catch (e) {

    }
  };

  const isFavorite = (id: string) => favoriteIds.includes(id);

  const toggleFavorite = async (track: AudioTrack) => {
    const id = track.id;
    const next = isFavorite(id)
      ? favoriteIds.filter(fid => fid !== id)
      : [...favoriteIds, id];
    setFavoriteIds(next);
    await saveFavorites(next);
  };

  // Favoriler toggle'ı: Favoriler yüklenmemişse önce yükleyip sonra filtreyi aç
  const handleToggleFavorites = async () => {
    const enabling = !showFavoritesOnly;
    if (enabling) {
      // 1) Favori ID'lerini yükle
      if (!favoriteIds || favoriteIds.length === 0) {
        await loadFavorites();
      }
      // 2) Backend'ten favori detaylarını tek çağrıda çek ve listeye ekle
      try {
        const favDetails = await getUserFavoriteDetails();
        if (Array.isArray(favDetails) && favDetails.length > 0) {
          const mapped = favDetails.map((item: any) => ({
            id: String(item.id),
            title: item.adapted_text || item.translated_text || item.input || item.title || 'Başlıksız',
            url: item.url || item.mp3_url,
            level: (item.level || 'A1') as CEFRLevel,
            duration: typeof item.duration === 'number' ? item.duration : 180,
            created_at: item.created_at,
            input_type: item.input_type,
            translated_text: item.translated_text,
            adapted_text: item.adapted_text,
            original_turkish: item.original_turkish || item.input,
            mp3_url: item.mp3_url || item.url,
            timepoints: Array.isArray(item.timepoints) ? item.timepoints : undefined,
            words: Array.isArray(item.words) ? item.words : undefined,
          } as AudioTrack));
          const existingIds = new Set(audioTracksRef.current.map(t => t.id));
          const merged = [...audioTracksRef.current, ...mapped.filter(t => !existingIds.has(t.id))];
          setAudioTracks(merged);
          audioTracksRef.current = merged;
        }
      } catch (e) {

      }
      // 3) Sonra filtreyi aç ve arka plan hidrasyonu devreye girsin
      setShowFavoritesOnly(true);
      setHasUserScrolled(true);
      ensureFavoritesCoverage();
    } else {
      setShowFavoritesOnly(false);
    }
  };

  // Ensure that when showing favorites we have coverage for all favorite IDs by fetching more pages if needed
  const ensureFavoritesCoverage = async () => {
    if (!showFavoritesOnly) return;
    if (isHydratingFavorites) return;
    // If we don't know total yet, a couple of fetches will set it
    const haveAllFromServer = (serverTotalCount !== null) && (audioTracks.length >= serverTotalCount);
    const currentIds = new Set(audioTracks.map(t => t.id));
    const missingFavs = favoriteIds.filter(fid => !currentIds.has(fid));
    if (missingFavs.length === 0 || haveAllFromServer) return;
    setIsHydratingFavorites(true);
    try {
      let nextPage = pageRef.current + 1;
      // Hard cap to avoid very long loops when server returns small counts
      for (let i = 0; i < 20; i++) {
        const reachedEnd = (serverTotalCount !== null) && (audioTracksRef.current.length >= serverTotalCount);
        if (reachedEnd) break;
        await fetchAudioHistory(false, nextPage);
        nextPage += 1;
        // Recompute remaining
        const ids = new Set(audioTracksRef.current.map(t => t.id));
        const stillMissing = favoriteIds.filter(fid => !ids.has(fid));
        if (stillMissing.length === 0) break;
      }
    } catch (e) {

    } finally {
      setIsHydratingFavorites(false);
    }
  };

  const handleLongPress = (track: AudioTrack) => {
    const currentlyFav = isFavorite(track.id);
    Alert.alert(
      currentlyFav ? 'Favoriler' : 'Favoriler',
      currentlyFav ? 'Bu kaydı favorilerimden kaldırmak ister misiniz?' : 'Bu kaydı favorilerime eklemek ister misiniz?',
      [
        {
          text: currentlyFav ? 'Favorilerimden Kaldır' : 'Favorilerime Ekle',
          onPress: () => toggleFavorite(track),
        },
        { text: 'İptal', style: 'cancel' },
      ]
    );
  };

  // Refresh handler
  const onRefresh = () => {
    setRefreshing(true);
    fetchAudioHistory(false);
  };

  // Load data on component mount
  useEffect(() => {
    fetchAudioHistory(true, 1);
    loadFavorites();
  }, [user?.id]);

  // When toggling to favorites view or when favorites change, try to hydrate missing ones
  useEffect(() => {
    ensureFavoritesCoverage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFavoritesOnly, favoriteIds, serverTotalCount]);

  // Auto-refresh when screen gains focus (e.g., after navigating from Create)
  useFocusEffect(
    React.useCallback(() => {
      // Favoriler görünümündeyken tam yenileme yapmayalım; flicker ve kayıp hissi yaratıyor
      if (!showFavoritesOnly) {
        fetchAudioHistory(false, 1);
      }
      return () => { };
    }, [user?.id, showFavoritesOnly])
  );

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getLevelColor = (level: CEFRLevel) => {
    const colors = {
      A1: '#4CAF50',
      A2: '#8BC34A',
      B1: '#FF9800',
      B2: '#FF5722',
      C1: '#9C27B0',
      C2: '#E91E63',
    };
    return colors[level];
  };

  const filteredTracks = audioTracks.filter((track) => {
    const matchesSearch = track.title.toLowerCase().includes(searchText.toLowerCase());
    const matchesLevel = selectedLevel === 'all' || track.level === selectedLevel;
    const matchesFav = !showFavoritesOnly || isFavorite(track.id);

    let matchesType = true;
    if (selectedType !== 'all') {
      const type = (track.input_type || '').toLowerCase();
      // "books" sometimes appears for book
      if (selectedType === 'book') {
        matchesType = type === 'book' || type === 'books';
      } else {
        matchesType = type === selectedType;
      }
    }

    return matchesSearch && matchesLevel && matchesFav && matchesType;
  });

  // Favorites görünümünde istemci tarafı sayfalamayı kaldırıyoruz.
  // Böylece favorileriniz, daha önce sayfalamayı arttırmanıza gerek kalmadan
  // elde mevcut olanların tamamı hemen listelenir.
  const displayedTracks = showFavoritesOnly
    ? filteredTracks
    : filteredTracks.slice(0, page * PAGE_SIZE);

  useEffect(() => {
    // Reset pagination when filters or search change
    setPage(1);
    setHasUserScrolled(false);
  }, [searchText, selectedLevel, selectedType, showFavoritesOnly]);

  // Favoriler görünümüne geçildiğinde, eksik favorileri arka planda hydrate et
  // ve sayfalamayı başlatmak için scroll gating'i aç.
  useEffect(() => {
    if (showFavoritesOnly) {
      // onEndReached'in engellenmemesi için
      setHasUserScrolled(true);
      // eksik favoriler varsa sayfa sayfa çekmeyi tetikle
      ensureFavoritesCoverage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFavoritesOnly]);

  const handleLoadMore = () => {
    if (!hasUserScrolled) return; // prevent auto-trigger on mount when list doesn't fill viewport
    if (isLoadingMore) return;
    // If we already fetched fewer than PAGE_SIZE from server on last page, no more pages
    if (serverTotalCount !== null && audioTracks.length >= serverTotalCount) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    fetchAudioHistory(false, nextPage).finally(() => setIsLoadingMore(false));
  };

  const handlePlayTrack = (track: AudioTrack) => {

    // Her durumda modal'ı aç
    setSelectedTrack(track);
    setPlayerVisible(true);
  };

  const handleClosePlayer = () => {
    setPlayerVisible(false);
    setSelectedTrack(null);
  };

  const renderAudioTrack = ({ item }: { item: AudioTrack }) => {
    const isCurrentlyPlaying = isTrackPlaying(item.id);

    // Debug log sadece durumu değişen track'ler için
    if (isCurrentlyPlaying) {
      // no-op: avoid console in production
    }

    // Content type'a göre renk ve ikon belirle
    const getContentTypeColor = (inputType?: string) => {
      switch (inputType?.toLowerCase()) {
        case 'podcast': return COLORS.brandTeal;
        case 'books':
        case 'book': return COLORS.brandOrange;
        case 'text': return COLORS.slate500;
        case 'file': return COLORS.brandIndigo;
        default: return COLORS.brandTeal;
      }
    };

    return (
      <TouchableOpacity
        style={[
          styles.trackCard,
          isCurrentlyPlaying && styles.trackCardPlaying
        ]}
        onPress={() => handlePlayTrack(item)}
        onLongPress={() => handleLongPress(item)}
      >
        {/* Left - Audio Wave Icon */}
        <View style={[styles.audioWaveContainer, isCurrentlyPlaying && styles.audioWaveContainerPlaying]}>
          <Icon name="graphic-eq" size={24} color={isCurrentlyPlaying ? '#FFFFFF' : COLORS.brandTeal} />
        </View>

        {/* Middle - Track Info */}
        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={1}>{item.title}</Text>

          {/* Meta row: Level badge + Duration + Date */}
          <View style={styles.trackMeta}>
            <View style={[styles.levelBadge, { backgroundColor: getLevelColor(item.level) }]}>
              <Text style={styles.levelText}>{item.level}</Text>
            </View>
            <View style={styles.metaTextRow}>
              <Icon name="access-time" size={12} color={COLORS.slate400} />
              <Text style={styles.duration}>{formatDuration(item.duration)}</Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.date}>
                {new Date(item.created_at).toLocaleDateString('tr-TR')}
              </Text>
            </View>
          </View>

          {/* Content Type */}
          {item.input_type && (
            <View style={styles.inputTypeContainer}>
              <Icon
                name={item.input_type?.toLowerCase() === 'podcast' ? 'podcasts' :
                  item.input_type?.toLowerCase() === 'books' || item.input_type?.toLowerCase() === 'book' ? 'menu-book' :
                    item.input_type?.toLowerCase() === 'file' ? 'insert-drive-file' : 'notes'}
                size={12}
                color={getContentTypeColor(item.input_type)}
              />
              <Text style={[styles.inputType, { color: getContentTypeColor(item.input_type) }]}>
                {item.input_type}
              </Text>
            </View>
          )}
        </View>

        {/* Right - Favorite Icon */}
        <TouchableOpacity onPress={() => toggleFavorite(item)} style={styles.favoriteIconBtn}>
          <Icon
            name={isFavorite(item.id) ? 'favorite' : 'favorite-border'}
            size={22}
            color={isFavorite(item.id) ? '#E91E63' : COLORS.slate300}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>
            {language === 'tr' ? 'Ses kütüphanesi yükleniyor...' : 'Loading audio library...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Not authenticated state
  if (!user?.id) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Icon name="account-circle" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>{language === 'tr' ? 'Giriş Yapılmadı' : 'Not Logged In'}</Text>
          <Text style={styles.emptyDescription}>
            {language === 'tr'
              ? 'Ses kütüphanenizi görmek için giriş yapmanız gerekiyor.'
              : 'You need to log in to see your audio library.'}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              // Intentionally left blank to avoid console logs
            }}
          >
            <Text style={styles.retryButtonText}>{language === 'tr' ? 'Giriş Yap' : 'Log In'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Icon name="refresh" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.favoritesToggle, showFavoritesOnly && styles.favoritesToggleActive]}
            onPress={handleToggleFavorites}
          >
            <Icon name={showFavoritesOnly ? 'favorite' : 'favorite-border'} size={18} color={showFavoritesOnly ? '#E91E63' : COLORS.primary} />
            <Text style={[styles.favoritesToggleText, showFavoritesOnly && styles.favoritesToggleTextActive]}>
              {language === 'tr' ? 'Favorilerim' : 'My Favorites'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Icon name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder={language === 'tr' ? 'Ses dosyalarında ara...' : 'Search in audio files...'}
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      {/* Type Filters */}
      <View style={styles.typeFilterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeFilterContent}
        >
          {typeOptions.map((opt) => (
            <TouchableOpacity
              key={opt.id}
              style={[
                styles.typeChip,
                selectedType === opt.id && styles.typeChipActive,
              ]}
              onPress={() => setSelectedType(opt.id)}
            >
              <Icon
                name={opt.icon}
                size={16}
                color={selectedType === opt.id ? '#FFFFFF' : COLORS.slate500}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.typeChipText,
                  selectedType === opt.id && styles.typeChipTextActive,
                ]}
              >
                {language === 'tr' ? opt.labelTr : opt.labelEn}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.levelFilter}>
        {/* Row 1: A1, A2, B1 */}
        <View style={styles.levelFilterRow}>
          {(['A1', 'A2', 'B1'] as CEFRLevel[]).map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.levelChip,
                selectedLevel === level && styles.levelChipActive,
              ]}
              onPress={() => setSelectedLevel(selectedLevel === level ? 'all' : level)}
            >
              <Text
                style={[
                  styles.levelChipText,
                  selectedLevel === level && styles.levelChipTextActive,
                ]}
              >
                {level}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Row 2: B2, C1, C2 */}
        <View style={[styles.levelFilterRow, { marginTop: 8 }]}>
          {(['B2', 'C1', 'C2'] as CEFRLevel[]).map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.levelChip,
                selectedLevel === level && styles.levelChipActive,
              ]}
              onPress={() => setSelectedLevel(selectedLevel === level ? 'all' : level)}
            >
              <Text
                style={[
                  styles.levelChipText,
                  selectedLevel === level && styles.levelChipTextActive,
                ]}
              >
                {level}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {filteredTracks.length > 0 ? (
        <FlatList
          data={displayedTracks}
          keyExtractor={(item) => item.id}
          renderItem={renderAudioTrack}
          contentContainerStyle={styles.tracksList}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.2}
          onMomentumScrollBegin={() => setHasUserScrolled(true)}
          onScrollBeginDrag={() => setHasUserScrolled(true)}
          initialNumToRender={PAGE_SIZE}
          windowSize={5}
          removeClippedSubviews
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footerLoadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} style={{ opacity: 0.3 }} />
              </View>
            ) : null
          }
        />
      ) : showFavoritesOnly && (isHydratingFavorites || favoriteIds.length > 0) ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{language === 'tr' ? 'Favoriler yükleniyor...' : 'Loading favorites...'}</Text>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Icon name="library-music" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>
            {audioTracks.length === 0
              ? (language === 'tr' ? 'Henüz ses dosyası yok' : 'No audio files yet')
              : (language === 'tr' ? 'Arama sonucu bulunamadı' : 'No results found')}
          </Text>
          <Text style={styles.emptyDescription}>
            {audioTracks.length === 0
              ? (language === 'tr' ? 'İlk ses dosyanızı oluşturmak için "Ansayfa" sekmesinden uygun bir seçenek kullanın' : 'Use a suitable option from the Home tab to create your first audio')
              : (language === 'tr' ? 'Farklı arama terimleri veya filtreler deneyin' : 'Try different search terms or filters')}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>{language === 'tr' ? 'Yenile' : 'Refresh'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Audio Player Modal */}
      {selectedTrack && (
        <AudioPlayer
          track={selectedTrack}
          visible={playerVisible}
          onClose={handleClosePlayer}
          timepoints={selectedTrack.timepoints || []}
          words={selectedTrack.words || []}
          initialHighlightMode={highlightMode}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.slate500,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.slate700,
    letterSpacing: -0.3,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceGlass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.slate100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.brandTeal,
    borderRadius: 24,
  },
  modeToggleActive: {
    borderColor: COLORS.brandOrange,
    backgroundColor: '#fffbeb',
  },
  modeToggleText: {
    marginLeft: 6,
    color: COLORS.brandTeal,
    fontWeight: '700',
    fontSize: 13,
  },
  modeToggleTextActive: {
    color: COLORS.brandOrange,
  },
  favoritesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.brandTeal,
    borderRadius: 24,
  },
  favoritesToggleActive: {
    borderColor: '#E91E63',
    backgroundColor: '#FFF0F5',
  },
  favoritesToggleText: {
    marginLeft: 6,
    color: COLORS.brandTeal,
    fontWeight: '700',
    fontSize: 13,
  },
  favoritesToggleTextActive: {
    color: '#E91E63',
  },
  searchContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(241, 245, 249, 0.5)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: COLORS.slate700,
    padding: 0,
    fontWeight: '500',
  },
  typeFilterContainer: {
    height: 50,
    marginBottom: 8,
  },
  typeFilterContent: {
    paddingHorizontal: 24,
    gap: 8,
    alignItems: 'center',
  },
  typeChip: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  typeChipActive: {
    backgroundColor: COLORS.brandTeal,
    borderColor: COLORS.brandTeal,
  },
  typeChipText: {
    fontSize: 13,
    color: COLORS.slate500,
    fontWeight: '600',
  },
  typeChipTextActive: {
    color: '#FFFFFF',
  },
  levelFilter: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 20,
  },
  levelFilterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  levelChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelChipActive: {
    backgroundColor: COLORS.brandTeal,
    borderColor: COLORS.brandTeal,
  },
  levelChipText: {
    fontSize: 13,
    color: COLORS.slate400,
    fontWeight: '600',
  },
  levelChipTextActive: {
    color: '#FFFFFF',
  },
  tracksList: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 120,
  },
  trackCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  trackCardPlaying: {
    borderWidth: 2,
    borderColor: COLORS.brandTeal,
    backgroundColor: 'rgba(39, 190, 170, 0.03)',
  },
  audioWaveContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(39, 190, 170, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  audioWaveContainerPlaying: {
    backgroundColor: COLORS.brandTeal,
  },
  trackInfo: {
    flex: 1,
    marginRight: 8,
  },
  trackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.slate800,
    marginBottom: 6,
  },
  levelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  levelText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  trackMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaDot: {
    fontSize: 10,
    color: COLORS.slate300,
    marginHorizontal: 4,
  },
  duration: {
    fontSize: 11,
    color: COLORS.slate400,
    fontWeight: '500',
    marginLeft: 3,
  },
  date: {
    fontSize: 11,
    color: COLORS.slate400,
    fontWeight: '500',
  },
  inputTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inputType: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
    marginLeft: 4,
  },
  favoriteIconBtn: {
    padding: 4,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(39, 190, 170, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonPlaying: {
    backgroundColor: COLORS.brandTeal,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.slate700,
    marginTop: 20,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: COLORS.slate500,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: COLORS.brandTeal,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: COLORS.brandTeal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  footerLoadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LibraryScreen; 