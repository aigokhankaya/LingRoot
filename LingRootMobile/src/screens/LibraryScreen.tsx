import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AudioTrack, CEFRLevel } from '../types';

const LibraryScreen: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel | 'all'>('all');

  // Örnek veri - gerçek uygulamada API'den gelecek
  const [audioTracks] = useState<AudioTrack[]>([
    {
      id: '1',
      title: 'İngilizce Hikaye - Başlangıç',
      url: 'https://example.com/audio1.mp3',
      level: 'A1',
      duration: 180,
      created_at: '2024-01-15T10:00:00Z',
    },
    {
      id: '2',
      title: 'Business English Conversation',
      url: 'https://example.com/audio2.mp3',
      level: 'B2',
      duration: 245,
      created_at: '2024-01-14T15:30:00Z',
    },
  ]);

  const levels: (CEFRLevel | 'all')[] = ['all', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

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

  const renderAudioTrack = ({ item }: { item: AudioTrack }) => (
    <TouchableOpacity style={styles.trackCard}>
      <View style={styles.trackInfo}>
        <View style={styles.trackHeader}>
          <Text style={styles.trackTitle}>{item.title}</Text>
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
      </View>
      <TouchableOpacity style={styles.playButton}>
        <Icon name="play-arrow" size={24} color="#007AFF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ses Kütüphanesi</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Icon name="filter-list" size={24} color="#007AFF" />
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
        />
      ) : (
        <View style={styles.emptyState}>
          <Icon name="library-music" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>Henüz ses dosyası yok</Text>
          <Text style={styles.emptyDescription}>
            İlk ses dosyanızı oluşturmak için "Oluştur" sekmesini kullanın
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  filterButton: {
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
    alignItems: 'center',
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
    color: 'white',
    fontSize: 12,
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
    fontSize: 14,
    color: '#666',
  },
  playButton: {
    padding: 8,
    marginLeft: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default LibraryScreen; 