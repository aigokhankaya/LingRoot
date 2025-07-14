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
import { useAuth } from '../contexts/AuthContext';
import AudioPlayer from '../components/AudioPlayer';

const LibraryScreen: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel | 'all'>('all');
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<AudioTrack | null>(null);
  const [playerVisible, setPlayerVisible] = useState(false);
  const { user } = useAuth();

  const levels: (CEFRLevel | 'all')[] = ['all', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  // Fetch audio history from API
  const fetchAudioHistory = async (showLoading = true) => {
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
      
      console.log('🔍 Fetching audio history for user:', user.id);
      
      const response = await apiService.getUserAudioHistory(user.id);
      
      if (response.success && response.data) {
        console.log('✅ Audio history fetched:', response.data.length, 'tracks');
        
        // Backend verilerini AudioTrack tipine dönüştür
        const tracks: AudioTrack[] = response.data.map((item: any) => {
          const track = {
            id: item.id,
            title: item.adapted_text || item.translated_text || item.input || 'Başlıksız',
            url: item.mp3_url || item.url || '',
            level: item.level || 'B1',
            duration: item.duration || 30, // Varsayılan 30 saniye
            created_at: item.created_at,
            input_type: item.input_type,
            translated_text: item.translated_text,
            adapted_text: item.adapted_text,
            original_turkish: item.input,
            mp3_url: item.mp3_url,
            timepoints: item.timepoints || [], // Backend'den gelen gerçek timepoints
            words: item.words || [], // Backend'den gelen gerçek words
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
        
        setAudioTracks(tracks);
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

  // Refresh handler
  const onRefresh = () => {
    setRefreshing(true);
    fetchAudioHistory(false);
  };

  // Load data on component mount
  useEffect(() => {
    fetchAudioHistory();
  }, [user?.id]);

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
    return matchesSearch && matchesLevel;
  });

  const handlePlayTrack = (track: AudioTrack) => {
    console.log('🎵 [LIBRARY] Playing track:', {
      id: track.id,
      title: track.title.substring(0, 50) + '...',
      url: track.url,
      hasUrl: !!track.url,
      urlLength: track.url?.length || 0,
      hasTranslatedText: !!track.translated_text,
      hasAdaptedText: !!track.adapted_text
    });
    setSelectedTrack(track);
    setPlayerVisible(true);
  };

  const handleClosePlayer = () => {
    setPlayerVisible(false);
    setSelectedTrack(null);
  };

  const renderAudioTrack = ({ item }: { item: AudioTrack }) => (
    <TouchableOpacity style={styles.trackCard} onPress={() => handlePlayTrack(item)}>
      <View style={styles.trackInfo}>
        <View style={styles.trackHeader}>
          <Text style={styles.trackTitle} numberOfLines={2}>{item.title}</Text>
          <View style={[styles.levelBadge, { backgroundColor: getLevelColor(item.level) }]}>
            <Text style={styles.levelText}>{item.level}</Text>
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
      <TouchableOpacity style={styles.playButton} onPress={() => handlePlayTrack(item)}>
        <Icon name="play-arrow" size={24} color="#007AFF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

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
        <Text style={styles.title}>Ses Kütüphanesi</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Icon name="refresh" size={24} color="#007AFF" />
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
                {item === 'all' ? 'Tümü' : item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {filteredTracks.length > 0 ? (
        <FlatList
          data={filteredTracks}
          keyExtractor={(item) => item.id}
          renderItem={renderAudioTrack}
          contentContainerStyle={styles.tracksList}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
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
  trackInfo: {
    flex: 1,
  },
  trackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
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