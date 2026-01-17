import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getUserPatternHistory } from '../services/patternService';

interface Pattern {
  pattern: string;
  pattern_tr: string;
  example_sentence: string;
  example_sentence_tr: string;
  level?: string;
  found_in_topic?: string;
  found_at?: string;
}

interface GroupedPatterns {
  [level: string]: Pattern[];
}

export default function PatternListScreen() {
  const navigation = useNavigation();
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedPattern, setSelectedPattern] = useState<Pattern | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPatterns();
  }, []);

  const fetchPatterns = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await getUserPatternHistory();

      if (response.success) {
        setPatterns(response.patterns || []);
      } else {
        setError(response.message || 'Kalıplar yüklenemedi');
      }
    } catch (err: any) {
      console.error('Error fetching patterns:', err);
      setError(err.message || 'Kalıplar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPatterns();
    setRefreshing(false);
  }, []);

  const filteredPatterns = patterns.filter(p =>
    p.pattern.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.pattern_tr?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedByLevel: GroupedPatterns = filteredPatterns.reduce((acc, pattern) => {
    const level = pattern.level || 'Unknown';
    if (!acc[level]) acc[level] = [];
    acc[level].push(pattern);
    return acc;
  }, {} as GroupedPatterns);

  const renderPatternCard = ({ item }: { item: Pattern }) => (
    <TouchableOpacity
      style={styles.patternCard}
      onPress={() => setSelectedPattern(item)}
      activeOpacity={0.7}
    >
      <Text style={styles.patternText}>{item.pattern}</Text>
      <Text style={styles.patternTr}>{item.pattern_tr}</Text>
      {item.found_in_topic && (
        <View style={styles.topicBadge}>
          <Text style={styles.topicText}>📝 {item.found_in_topic}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderLevelSection = ({ item }: { item: [string, Pattern[]] }) => {
    const [level, levelPatterns] = item;

    return (
      <View style={styles.levelSection}>
        <View style={styles.levelHeader}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>{level}</Text>
          </View>
          <Text style={styles.levelCount}>{levelPatterns.length} kalıp</Text>
        </View>
        <View style={styles.patternsGrid}>
          {levelPatterns.map((pattern, index) => (
            <View key={index} style={styles.gridItem}>
              {renderPatternCard({ item: pattern })}
            </View>
          ))}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9333ea" />
          <Text style={styles.loadingText}>Kalıplar yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Geri</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>✨ Günlük Kullanım Kalıpları</Text>
          <Text style={styles.subtitle}>
            İçeriklerinizde geçen {patterns.length} kalıp
          </Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Kalıp ara..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholderTextColor="#9ca3af"
        />
      </View>

      {/* Error */}
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Patterns List */}
      {Object.keys(groupedByLevel).length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📚</Text>
          <Text style={styles.emptyTitle}>Henüz kalıp bulunamadı</Text>
          <Text style={styles.emptySubtitle}>
            İçerik oluşturmaya başladığınızda kalıplar burada görünecek
          </Text>
        </View>
      ) : (
        <FlatList
          data={Object.entries(groupedByLevel)}
          renderItem={renderLevelSection}
          keyExtractor={([level]) => level}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {/* Pattern Detail Modal */}
      <Modal
        visible={selectedPattern !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPattern(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedPattern(null)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedPattern?.pattern}</Text>
              <TouchableOpacity
                onPress={() => setSelectedPattern(null)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.modalBody}>
              {/* Anlamı - Yellow Card */}
              <View style={[styles.card, styles.meaningCard]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardIcon}>🇹🇷</Text>
                  <Text style={styles.cardTitle}>Anlamı</Text>
                </View>
                <Text style={styles.cardValue}>
                  {selectedPattern?.pattern_tr || '-'}
                </Text>
              </View>

              {/* Örnek Cümle - Blue Card */}
              <View style={[styles.card, styles.exampleCard]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardIcon}>🇬🇧</Text>
                  <Text style={styles.cardTitle}>Örnek Cümle</Text>
                </View>
                <Text style={styles.cardValue}>
                  {selectedPattern?.example_sentence || '-'}
                </Text>
              </View>

              {/* Çeviri - Green Card */}
              <View style={[styles.card, styles.translationCard]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardIcon}>💬</Text>
                  <Text style={styles.cardTitle}>Çeviri</Text>
                </View>
                <Text style={styles.cardValue}>
                  {selectedPattern?.example_sentence_tr || '-'}
                </Text>
              </View>

              {/* Metadata */}
              {selectedPattern?.found_in_topic && (
                <View style={styles.metadataCard}>
                  <Text style={styles.metadataLabel}>Bulunduğu Konu</Text>
                  <Text style={styles.metadataValue}>
                    {selectedPattern.found_in_topic}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
  headerContent: {
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  searchInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  errorContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fecaca',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  levelSection: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  levelBadge: {
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 12,
  },
  levelText: {
    color: '#7c3aed',
    fontWeight: '700',
    fontSize: 16,
  },
  levelCount: {
    color: '#6b7280',
    fontSize: 14,
  },
  patternsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  gridItem: {
    width: '50%',
    padding: 6,
  },
  patternCard: {
    backgroundColor: '#fef3c7',
    borderWidth: 2,
    borderColor: '#fbbf24',
    borderRadius: 12,
    padding: 12,
  },
  patternText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 6,
  },
  patternTr: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  topicBadge: {
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  topicText: {
    fontSize: 10,
    color: '#7c3aed',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: '600',
  },
  modalBody: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
  },
  meaningCard: {
    backgroundColor: '#fef3c7',
    borderColor: '#fbbf24',
  },
  exampleCard: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  translationCard: {
    backgroundColor: '#d1fae5',
    borderColor: '#10b981',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  cardValue: {
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 20,
  },
  metadataCard: {
    padding: 12,
    backgroundColor: '#f3e8ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  metadataLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7c3aed',
    marginBottom: 4,
  },
  metadataValue: {
    fontSize: 12,
    color: '#374151',
  },
});
