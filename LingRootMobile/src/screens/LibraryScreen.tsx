import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AudioTrack, CEFRLevel } from '../types';
import { apiService } from '../services/api';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAudioContext } from '../contexts/AudioContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AudioPlayer from '../components/AudioPlayer';

const LibraryScreen: React.FC = () => {
  const { isTrackPlaying, currentTrack, isPlaying } = useAudioContext();
  const { t } = useLanguage();
  const [searchText, setSearchText] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel | 'all'>('all');
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

  const levels: (CEFRLevel | 'all')[] = ['all', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  // Fetch audio history from API
  const fetchAudioHistory = async (showLoading = true, nextPage?: number) => {
    if (!user?.id) {
      console.warn('User not authenticated');
      setLoading(false);
      setAudioTracks([]);
      return;
    }

    try {
      if (showLoading) {
        setLoading(true);
      }
      
      const currentPage = nextPage || 1;
      console.log('🔍 Fetching audio history for user:', user.id, 'page=', currentPage, 'limit=', PAGE_SIZE);
      const response = await apiService.getUserAudioHistory(user.id, currentPage, PAGE_SIZE);
      
      if (response.success && response.data) {
        console.log('✅ Audio history fetched:', response.data.length, 'tracks');
        
        // Backend verilerini AudioTrack tipine dönüştür
        const tracks: AudioTrack[] = response.data.map((item: any) => {
          // Prefer backend-provided duration; fall back to 180 if missing
          const derivedDurationSec = typeof item?.duration === 'number' ? item.duration : 180;
          const track = {
            id: item.id,
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
            timepoints: Array.isArray(item.timepoints) ? item.timepoints : [],
            words: item.words || [],
          };
          
          console.log('🎵 [LIBRARY] Track mapped:', {
            id: track.id,
            title: track.title.substring(0, 50) + '...',
            url: track.url,
            hasTranslatedText: !!track.translated_text,
            hasAdaptedText: !!track.adapted_text,
            hasTimepoints: !!track.timepoints && track.timepoints.length > 0,
            hasWords: !!track.words && track.words.length > 0,
            timepointsCount: track.timepoints?.length || 0,
            wordsCount: track.words?.length || 0
          });
          
          return track;
        });
        
        if (currentPage === 1) {
          setAudioTracks(tracks);
        } else {
          // Append new page without duplicates (by id)
          const existingIds = new Set(audioTracks.map(t => t.id));
          const merged = [...audioTracks, ...tracks.filter(t => !existingIds.has(t.id))];
          setAudioTracks(merged);
        }
        setServerTotalCount(typeof response.total_count === 'number' ? response.total_count : (response.pagination?.total ?? null));
        setPage(currentPage);
        setHasUserScrolled(currentPage > 1);
      } else {
        console.warn('❌ Failed to fetch audio history:', response.message);
        setAudioTracks([]);
      }
    } catch (error) {
      console.error('❌ Error fetching audio history:', error);
      
      // Check if it's a token expiration error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage === 'Token expired' || errorMessage.includes('Unauthorized')) {
        Alert.alert(
          'Oturum Süresi Doldu', 
          'Lütfen tekrar giriş yapınız.',
          [
            { text: 'Tamam', onPress: () => console.log('User needs to login again') }
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
      const remote = await apiService.getUserFavorites();
      if (Array.isArray(remote) && remote.length > 0) {
        setFavoriteIds(remote);
        await AsyncStorage.setItem(favoritesKey, JSON.stringify(remote));
        return;
      }

      // fallback to local
      const stored = await AsyncStorage.getItem(favoritesKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setFavoriteIds(parsed);
      }
    } catch (e) {
      console.warn('Failed to load favorites', e);
    }
  };

  const saveFavorites = async (ids: string[]) => {
    try {
      if (!user?.id) return;
      await AsyncStorage.setItem(favoritesKey, JSON.stringify(ids));
      // fire and forget remote save
      apiService.saveUserFavorites(ids).then((ok) => {
        if (!ok) console.warn('Remote favorites save failed');
      });
    } catch (e) {
      console.warn('Failed to save favorites', e);
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

  // Auto-refresh when screen gains focus (e.g., after navigating from Create)
  useFocusEffect(
    React.useCallback(() => {
      fetchAudioHistory(false, 1);
      return () => {};
    }, [user?.id])
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
    return matchesSearch && matchesLevel && matchesFav;
  });

  const displayedTracks = filteredTracks.slice(0, page * PAGE_SIZE);

  useEffect(() => {
    // Reset pagination when filters or search change
    setPage(1);
    setHasUserScrolled(false);
  }, [searchText, selectedLevel, showFavoritesOnly]);

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
    console.log('🎵 [LIBRARY] Playing track:', {
      id: track.id,
      title: track.title.substring(0, 50) + '...',
      url: track.url,
      hasUrl: !!track.url,
      urlLength: track.url?.length || 0,
      hasTranslatedText: !!track.translated_text,
      hasAdaptedText: !!track.adapted_text,
      isCurrentlyPlaying: isTrackPlaying(track.id)
    });
    
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
      console.log('🎵 [LIBRARY RENDER] Currently playing:', {
        trackId: item.id,
        title: item.title.substring(0, 30) + '...',
      });
    }
    
    return (
      <TouchableOpacity 
        style={[
          styles.trackCard,
          isCurrentlyPlaying && styles.trackCardPlaying
        ]} 
        onPress={() => handlePlayTrack(item)}
        onLongPress={() => handleLongPress(item)}
      >
        <View style={styles.trackInfo}>
          <View style={styles.trackHeader}>
            <Text style={styles.trackTitle} numberOfLines={2}>{item.title}</Text>
            <View style={styles.headerRightGroup}>
              <TouchableOpacity onPress={() => toggleFavorite(item)} style={styles.favoriteIconBtn}>
                <Icon name={isFavorite(item.id) ? 'favorite' : 'favorite-border'} size={20} color={isFavorite(item.id) ? '#E91E63' : '#999'} />
              </TouchableOpacity>
              <View style={[styles.levelBadge, { backgroundColor: getLevelColor(item.level) }]}>
                <Text style={styles.levelText}>{item.level}</Text>
              </View>
            </View>
          </View>
          <View style={styles.trackMeta}>
            <Text style={styles.duration}>
              <Icon name="access-time" size={14} color="#666" /> {formatDuration(item.duration)}
            </Text>
            <Text style={styles.date}>
              {new Date(item.created_at).toLocaleDateString('tr-TR')}
            </Text>
          </View>
          {item.input_type && (
            <View style={styles.inputTypeContainer}>
              <Text style={styles.inputType}>{item.input_type}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity 
          style={[
            styles.playButton,
            isCurrentlyPlaying && styles.playButtonPlaying
          ]} 
          onPress={() => handlePlayTrack(item)}
        >
          {isCurrentlyPlaying ? (
            <Icon name="pause" size={24} color={isCurrentlyPlaying ? "#FFFFFF" : "#007AFF"} />
          ) : (
            <Icon name="play-arrow" size={24} color="#007AFF" />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Ses kütüphanesi yükleniyor...</Text>
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
          <Text style={styles.emptyTitle}>Giriş Yapılmadı</Text>
          <Text style={styles.emptyDescription}>
            Ses kütüphanenizi görmek için giriş yapmanız gerekiyor.
          </Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => {
              // You might want to navigate to login screen here
              console.log('Navigate to login');
            }}
          >
            <Text style={styles.retryButtonText}>Giriş Yap</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Icon name="refresh" size={24} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.favoritesToggle, showFavoritesOnly && styles.favoritesToggleActive]} 
          onPress={() => setShowFavoritesOnly(prev => !prev)}
        >
          <Icon name={showFavoritesOnly ? 'favorite' : 'favorite-border'} size={18} color={showFavoritesOnly ? '#E91E63' : '#007AFF'} />
          <Text style={[styles.favoritesToggleText, showFavoritesOnly && styles.favoritesToggleTextActive]}>Favorilerim</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Icon name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Ses dosyalarında ara..."
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      <View style={styles.levelFilter}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={levels}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.levelChip,
                selectedLevel === item && styles.levelChipActive,
              ]}
              onPress={() => setSelectedLevel(item)}
            >
              <Text
                style={[
                  styles.levelChipText,
                  selectedLevel === item && styles.levelChipTextActive,
                ]}
              >
                {item === 'all' ? t('library.all') : item}
              </Text>
            </TouchableOpacity>
          )}
        />
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
            isLoadingMore && displayedTracks.length < filteredTracks.length ? (
              <View style={{ paddingVertical: 12 }}>
                <ActivityIndicator size="small" color="#007AFF" />
              </View>
            ) : null
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <Icon name="library-music" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>
            {audioTracks.length === 0 ? 'Henüz ses dosyası yok' : 'Arama sonucu bulunamadı'}
          </Text>
          <Text style={styles.emptyDescription}>
            {audioTracks.length === 0 
              ? 'İlk ses dosyanızı oluşturmak için "Oluştur" sekmesini kullanın'
              : 'Farklı arama terimleri veya filtreler deneyin'
            }
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Yenile</Text>
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
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    padding: 8,
  },
  favoritesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 20,
  },
  favoritesToggleActive: {
    borderColor: '#E91E63',
    backgroundColor: '#FFF0F5',
  },
  favoritesToggleText: {
    marginLeft: 6,
    color: '#007AFF',
    fontWeight: '600',
  },
  favoritesToggleTextActive: {
    color: '#E91E63',
  },
  searchContainer: {
    padding: 20,
    backgroundColor: 'white',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  levelFilter: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  levelChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  levelChipActive: {
    backgroundColor: '#007AFF',
  },
  levelChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  levelChipTextActive: {
    color: 'white',
  },
  tracksList: {
    padding: 20,
  },
  trackCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trackCardPlaying: {
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  trackInfo: {
    flex: 1,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  favoriteIconBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginRight: 8,
  },
  levelText: {
    fontSize: 12,
    color: 'white',
    fontWeight: 'bold',
  },
  trackMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  duration: {
    fontSize: 14,
    color: '#666',
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  inputTypeContainer: {
    marginTop: 4,
  },
  inputType: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  playButton: {
    padding: 8,
  },
  playButtonPlaying: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LibraryScreen; 