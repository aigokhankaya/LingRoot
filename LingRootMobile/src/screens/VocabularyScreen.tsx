import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  FlatList,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { 
  getVocabulary, 
  addWordToVocabulary, 
  deleteWordFromVocabulary, 
  updateWordInVocabulary,
  VocabularyWord,
  getReminderSettings,
  saveReminderSettings,
  ReminderSettings 
} from '../services/api';
import { ReminderSettingsService } from '../services/reminderSettingsService';
import NotificationService from '../services/notificationService';

const { width } = Dimensions.get('window');

export default function VocabularyScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const [vocabulary, setVocabulary] = useState<VocabularyWord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeLevel, setActiveLevel] = useState('all');
  const [learnedFilter, setLearnedFilter] = useState('all');
  const [expandedWordId, setExpandedWordId] = useState<number | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const wordRefs = useRef<Map<number, View>>(new Map());
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [newWord, setNewWord] = useState({
    word: '',
    definition: '',
    level: 'a1',
    example: ''
  });
  const [reminderSettings, setReminderSettings] = useState({
    wordsPerDay: 5,
    startTime: '09:00',
    endTime: '18:00',
    isEnabled: true
  });
  const [isReminderModalVisible, setIsReminderModalVisible] = useState(false);

  // CEFR Seviyeleri Konfigürasyonu
  const wordLevels = {
    a1: { title: 'A1 - Başlangıç', color: '#10B981', bgColor: '#ECFDF5' },
    a2: { title: 'A2 - Temel', color: '#3B82F6', bgColor: '#EFF6FF' },
    b1: { title: 'B1 - Orta', color: '#8B5CF6', bgColor: '#F3E8FF' },
    b2: { title: 'B2 - Orta-Üstü', color: '#F59E0B', bgColor: '#FFFBEB' },
    c1: { title: 'C1 - İleri', color: '#6366F1', bgColor: '#EEF2FF' },
    c2: { title: 'C2 - Ustalık', color: '#EF4444', bgColor: '#FEF2F2' },
  };

  // Load vocabulary and settings on component mount
  useEffect(() => {
    if (user) {
      loadVocabulary();
      loadReminderSettings();
    }
  }, [user]);

  // Handle notification navigation - expand specific word if wordId is provided
  useEffect(() => {
    const wordId = route?.params?.wordId;
    if (wordId && vocabulary.length > 0) {
      console.log('📱 [VOCABULARY] Opening word from notification:', wordId);
      
      // Find word by ID (convert string to number if needed)
      const targetWordId = parseInt(wordId, 10);
      const targetWord = vocabulary.find(word => word.id === targetWordId);
      
      if (targetWord) {
        console.log('📱 [VOCABULARY] Found target word:', targetWord.word);
        setExpandedWordId(targetWordId);
        
        // Clear the search term to ensure the word is visible
        setSearchTerm('');
        setActiveLevel('all');
        setLearnedFilter('all');
        
        // Scroll to the word after a short delay to allow render
        setTimeout(() => {
          scrollToWord(targetWordId);
          console.log('📱 [VOCABULARY] Word expanded and scrolled to:', targetWord.word);
          
          // Clear the route params to prevent re-triggering
          navigation.setParams({ wordId: undefined });
        }, 800); // Increased delay to ensure smooth rendering
      } else {
        console.log('📱 [VOCABULARY] Word not found with ID:', wordId);
      }
    }
  }, [route?.params?.wordId, vocabulary]);

  // Function to scroll to specific word
  const scrollToWord = (wordId: number) => {
    if (!scrollViewRef.current) {
      console.log('📱 [SCROLL] ScrollView ref not available');
      return;
    }

    // Try to use the word ref for accurate positioning
    const wordRef = wordRefs.current.get(wordId);
    
    if (wordRef) {
      console.log('📱 [SCROLL] Using word ref to measure position');
      
      wordRef.measureLayout(
        scrollViewRef.current as any,
        (x, y, width, height) => {
          console.log('📱 [SCROLL] Word position measured:', { x, y, width, height });
          
          // Scroll to position with some offset from top
          const offset = Math.max(0, y - 100); // 100px from top
          
          scrollViewRef.current?.scrollTo({
            y: offset,
            animated: true,
          });
          
          console.log('📱 [SCROLL] Scrolled to measured offset:', offset);
        },
        () => {
          console.log('📱 [SCROLL] Measure failed, using fallback calculation');
          scrollToWordFallback(wordId);
        }
      );
    } else {
      console.log('📱 [SCROLL] Word ref not found, using fallback calculation');
      scrollToWordFallback(wordId);
    }
  };

  // Fallback scroll function with calculations
  const scrollToWordFallback = (wordId: number) => {
    // Get current filtered words
    let filtered = [...vocabulary];

    if (searchTerm) {
      filtered = filtered.filter(word =>
        word.word?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        word.definition?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (activeLevel !== 'all') {
      filtered = filtered.filter(word => (word.level || '').toLowerCase() === activeLevel);
    }

    if (learnedFilter !== 'all') {
      const isLearned = learnedFilter === 'learned';
      filtered = filtered.filter(word => Boolean(word.is_learned) === isLearned);
    }

    const wordIndex = filtered.findIndex(word => word.id === wordId);
    
    if (wordIndex !== -1) {
      console.log('📱 [SCROLL] Fallback scrolling to word index:', wordIndex, 'out of', filtered.length);
      
      // More aggressive calculation - scroll closer to end for later items
      const estimatedWordHeight = 120;
      const headerOffset = 400; // Generous header space
      const targetOffset = headerOffset + (wordIndex * estimatedWordHeight);
      
      scrollViewRef.current?.scrollTo({
        y: targetOffset,
        animated: true,
      });
      
      console.log('📱 [SCROLL] Fallback scrolled to offset:', targetOffset);
    } else {
      console.log('📱 [SCROLL] Word not found in filtered list');
    }
  };

  const loadVocabulary = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const words = await getVocabulary();
      setVocabulary(words);
    } catch (error: any) {
      console.error('Error loading vocabulary:', error);
      setError('Kelimeler yüklenirken hata oluştu: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadReminderSettings = async () => {
    try {
      // Try to get from API first, fallback to local storage
      let settings;
      try {
        settings = await getReminderSettings();
        console.log('📱 [SETTINGS] Loaded from API:', settings);
        // Save to local storage for offline access
        await ReminderSettingsService.saveSettings(settings);
      } catch (apiError) {
        console.log('📱 [SETTINGS] API failed, using local storage:', apiError);
        settings = await ReminderSettingsService.getSettings();
      }
      
      setReminderSettings(settings);
      console.log('📱 [SETTINGS] Final loaded settings:', settings);
    } catch (error) {
      console.error('📱 [SETTINGS] Error loading settings:', error);
    }
  };

  const handleSaveReminderSettings = async () => {
    try {
      // Save to both API and local storage
      try {
        await saveReminderSettings(reminderSettings);
        console.log('📱 [SETTINGS] Saved to API successfully');
      } catch (apiError) {
        console.log('📱 [SETTINGS] API save failed, saving locally only:', apiError);
      }
      
      // Always save to local storage as backup
      await ReminderSettingsService.saveSettings(reminderSettings);
      
      // Restart smart notifications with new settings
      await NotificationService.setupSmartVocabularyNotifications();
      
      setIsReminderModalVisible(false);
      Alert.alert('✅ Başarılı!', 'Hatırlatma ayarları kaydedildi ve bildirimler yeniden programlandı.');
    } catch (error) {
      console.error('📱 [SETTINGS] Error saving settings:', error);
      Alert.alert('❌ Hata', 'Ayarlar kaydedilirken bir hata oluştu.');
    }
  };

  const getFilteredWords = () => {
    let filtered = [...vocabulary];

    if (searchTerm) {
      filtered = filtered.filter(word =>
        word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (word.definition || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (activeLevel !== 'all') {
      filtered = filtered.filter(word => (word.level || '').toLowerCase() === activeLevel);
    }

    if (learnedFilter === 'learned') {
      filtered = filtered.filter(word => word.is_learned);
    } else if (learnedFilter === 'not-learned') {
      filtered = filtered.filter(word => !word.is_learned);
    }

    return filtered.sort((a, b) => a.word.localeCompare(b.word));
  };

  const getStatistics = () => {
    const total = vocabulary.length;
    const learned = vocabulary.filter(word => word.is_learned).length;
    return {
      total,
      learned,
      notLearned: total - learned,
      learnedPercentage: total > 0 ? Math.round((learned / total) * 100) : 0
    };
  };

  const getLevelProgress = (level: string) => {
    const levelWords = vocabulary.filter(word => (word.level || '').toLowerCase() === level);
    const learnedLevelWords = levelWords.filter(word => word.is_learned);
    return levelWords.length > 0 ? Math.round((learnedLevelWords.length / levelWords.length) * 100) : 0;
  };

  const toggleWordLearned = async (wordId: number) => {
    try {
      const word = vocabulary.find(w => w.id === wordId);
      if (!word) return;

      const updatedWord = await updateWordInVocabulary(wordId, { 
        is_learned: !word.is_learned 
      });
      
      setVocabulary(vocabulary.map(w =>
        w.id === wordId ? updatedWord : w
      ));
    } catch (error: any) {
      console.error('Error updating word status:', error);
      Alert.alert('Hata', 'Kelime durumu güncellenirken hata oluştu: ' + error.message);
    }
  };

  const deleteWord = async (wordId: number) => {
    Alert.alert(
      'Kelimeyi Sil',
      'Bu kelimeyi silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWordFromVocabulary(wordId);
              setVocabulary(vocabulary.filter(word => word.id !== wordId));
            } catch (error: any) {
              console.error('Error deleting word:', error);
              Alert.alert('Hata', 'Kelime silinirken hata oluştu: ' + error.message);
            }
          }
        }
      ]
    );
  };

  const addNewWord = async () => {
    if (!newWord.word || !newWord.definition) {
      Alert.alert('Hata', 'Kelime ve anlam alanları zorunludur.');
      return;
    }

    try {
      const addedWord = await addWordToVocabulary(
        newWord.word,
        newWord.definition,
        newWord.example || undefined,
        newWord.level.toUpperCase()
      );

      setVocabulary([...vocabulary, addedWord]);
      setNewWord({ word: '', definition: '', level: 'a1', example: '' });
      setIsAddModalVisible(false);
      Alert.alert('Başarılı', 'Kelime başarıyla eklendi!');
    } catch (error: any) {
      console.error('Error adding word:', error);
      Alert.alert('Hata', 'Kelime eklenirken hata oluştu: ' + error.message);
    }
  };

  const stats = getStatistics();
  const filteredWords = getFilteredWords();

  // Auth loading state
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Kelime Listeleri</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.authContainer}>
          <Ionicons name="book-outline" size={48} color="#9CA3AF" />
          <Text style={styles.authTitle}>Kelime listenizi görmek için oturum açmanız gerekiyor.</Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>Giriş Yap</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderLevelCard = ({ item }: { item: [string, any] }) => {
    const [level, data] = item;
    const levelWords = vocabulary.filter(word => (word.level || '').toLowerCase() === level);
    const progress = getLevelProgress(level);

    return (
      <TouchableOpacity
        style={[styles.levelCard, { backgroundColor: data.bgColor }]}
        onPress={() => setActiveLevel(level)}
      >
        <View style={styles.levelCardHeader}>
          <Text style={[styles.levelTitle, { color: data.color }]}>{data.title}</Text>
          <View style={[styles.levelBadge, { backgroundColor: data.color }]}>
            <Text style={styles.levelBadgeText}>{level.toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>İlerleme</Text>
            <Text style={styles.progressPercent}>{progress}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: data.color }]} />
          </View>
        </View>
        <View style={styles.levelCardFooter}>
          <Text style={styles.wordCount}>{levelWords.length} kelime</Text>
          <TouchableOpacity
            style={[styles.viewButton, { backgroundColor: data.color }]}
            onPress={() => setActiveLevel(level)}
          >
            <Text style={styles.viewButtonText}>Görüntüle</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderWord = ({ item }: { item: VocabularyWord }) => {
    if (!item.id) return null;
    
    const levelData = wordLevels[(item.level || 'a1').toLowerCase() as keyof typeof wordLevels] || wordLevels.a1;
    const isExpanded = expandedWordId === item.id;

    return (
      <View 
        ref={(ref) => {
          if (ref && item.id) {
            wordRefs.current.set(item.id, ref);
          }
        }}
        style={[styles.wordCard, { borderColor: levelData.color }]}
      >
        <TouchableOpacity
          style={[styles.wordHeader, isExpanded && { backgroundColor: levelData.bgColor }]}
          onPress={() => {
            if (isExpanded) {
              setExpandedWordId(null);
            } else {
              setExpandedWordId(item.id!);
              // Scroll to the word after expansion
              setTimeout(() => {
                scrollToWord(item.id!);
              }, 300);
            }
          }}
        >
          <View style={styles.wordHeaderLeft}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => toggleWordLearned(item.id!)}
            >
              <Ionicons
                name={item.is_learned ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={item.is_learned ? '#10B981' : '#9CA3AF'}
              />
            </TouchableOpacity>
            <View style={styles.wordInfo}>
              <View style={styles.wordTitleRow}>
                <Text style={styles.wordText}>{item.word}</Text>
                <View style={[styles.levelBadge, { backgroundColor: levelData.color }]}>
                  <Text style={styles.levelBadgeText}>{(item.level || 'A1').toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.definitionText}>{item.definition || 'Anlam eklenmemiş'}</Text>
            </View>
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#9CA3AF"
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.wordDetails}>
            {item.example_sentence && (
              <View style={styles.exampleContainer}>
                <Text style={styles.exampleTitle}>Örnek Cümle:</Text>
                <Text style={styles.exampleText}>"{item.example_sentence}"</Text>
                {item.example_sentence_turkish && (
                  <Text style={styles.exampleTurkish}>🇹🇷 "{item.example_sentence_turkish}"</Text>
                )}
              </View>
            )}
            
            {item.original_sentence && (
              <View style={styles.originalContainer}>
                <Text style={styles.originalTitle}>Orijinal Cümle:</Text>
                <Text style={styles.originalText}>"{item.original_sentence}"</Text>
              </View>
            )}

            <View style={styles.wordActions}>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteWord(item.id!)}
              >
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                <Text style={styles.deleteText}>Sil</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kelime Listeleri</Text>
        <TouchableOpacity onPress={() => setIsAddModalVisible(true)}>
          <Ionicons name="add" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <ScrollView ref={scrollViewRef} style={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Kelimeler yükleniyor...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadVocabulary} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Tekrar Dene</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* İstatistikler */}
            <View style={styles.statsContainer}>
              <Text style={styles.sectionTitle}>İstatistikler</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{stats.total}</Text>
                  <Text style={styles.statLabel}>Toplam Kelime</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statNumber, { color: '#10B981' }]}>{stats.learned}</Text>
                  <Text style={styles.statLabel}>Öğrenildi</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{stats.notLearned}</Text>
                  <Text style={styles.statLabel}>Öğrenilmemiş</Text>
                </View>
              </View>
            </View>

            {/* CEFR Seviyeleri */}
            <View style={styles.levelsContainer}>
              <Text style={styles.sectionTitle}>CEFR Seviyeleri</Text>
              <FlatList
                data={Object.entries(wordLevels)}
                renderItem={renderLevelCard}
                keyExtractor={(item) => item[0]}
                numColumns={2}
                columnWrapperStyle={styles.levelRow}
                scrollEnabled={false}
              />
            </View>

            {/* Arama ve Filtreleme */}
            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={20} color="#9CA3AF" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Kelime veya anlam ara..."
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                />
              </View>
              
              <View style={styles.filterRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <TouchableOpacity
                    style={[styles.filterButton, activeLevel === 'all' && styles.activeFilter]}
                    onPress={() => setActiveLevel('all')}
                  >
                    <Text style={[styles.filterText, activeLevel === 'all' && styles.activeFilterText]}>
                      Tüm Seviyeler
                    </Text>
                  </TouchableOpacity>
                  {Object.entries(wordLevels).map(([level, data]) => (
                    <TouchableOpacity
                      key={level}
                      style={[styles.filterButton, activeLevel === level && styles.activeFilter]}
                      onPress={() => setActiveLevel(level)}
                    >
                      <Text style={[styles.filterText, activeLevel === level && styles.activeFilterText]}>
                        {level.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Kelime Listesi */}
            <View style={styles.wordListContainer}>
              <View style={styles.wordListHeader}>
                <Text style={styles.sectionTitle}>
                  {activeLevel === 'all' ? 'Tüm Kelimeler' : wordLevels[activeLevel as keyof typeof wordLevels]?.title}
                </Text>
                <Text style={styles.wordCount}>{filteredWords.length} kelime</Text>
              </View>
              
              {filteredWords.length > 0 ? (
                <FlatList
                  ref={flatListRef}
                  data={filteredWords}
                  renderItem={renderWord}
                  keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                  scrollEnabled={false}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="book-outline" size={48} color="#9CA3AF" />
                  <Text style={styles.emptyTitle}>
                    {vocabulary.length === 0 ? 'Henüz kelime eklenmemiş' : 'Sonuç bulunamadı'}
                  </Text>
                  <Text style={styles.emptyText}>
                    {vocabulary.length === 0 
                      ? 'Metin oynatıcısında kelimelere uzun basarak kelime ekleyebilirsiniz.'
                      : 'Arama kriterlerinize uygun kelime bulunamadı.'
                    }
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Kelime Ekleme Modal */}
      <Modal
        visible={isAddModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsAddModalVisible(false)}>
              <Text style={styles.modalCancel}>İptal</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Yeni Kelime</Text>
            <TouchableOpacity onPress={addNewWord}>
              <Text style={styles.modalSave}>Kaydet</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Kelime *</Text>
              <TextInput
                style={styles.textInput}
                value={newWord.word}
                onChangeText={(text) => setNewWord({...newWord, word: text})}
                placeholder="Örn: beautiful"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Anlam *</Text>
              <TextInput
                style={styles.textInput}
                value={newWord.definition}
                onChangeText={(text) => setNewWord({...newWord, definition: text})}
                placeholder="Örn: güzel, hoş"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Seviye</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {Object.entries(wordLevels).map(([level, data]) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.levelSelector,
                      { backgroundColor: data.bgColor, borderColor: data.color },
                      newWord.level === level && { backgroundColor: data.color }
                    ]}
                    onPress={() => setNewWord({...newWord, level})}
                  >
                    <Text style={[
                      styles.levelSelectorText,
                      { color: data.color },
                      newWord.level === level && { color: 'white' }
                    ]}>
                      {level.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Örnek Cümle</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={newWord.example}
                onChangeText={(text) => setNewWord({...newWord, example: text})}
                placeholder="Örn: She is very beautiful."
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 16,
  },
  statsContainer: {
    marginTop: 20,
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  levelsContainer: {
    marginBottom: 24,
  },
  levelRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  levelCard: {
    flex: 1,
    marginHorizontal: 6,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  levelCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  levelTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
  },
  progressPercent: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  levelCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wordCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  viewButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  searchContainer: {
    marginBottom: 24,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#374151',
  },
  filterRow: {
    height: 40,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  activeFilter: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  activeFilterText: {
    color: 'white',
  },
  wordListContainer: {
    marginBottom: 24,
  },
  wordListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  wordCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  wordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  wordHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    marginRight: 12,
  },
  wordInfo: {
    flex: 1,
  },
  wordTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  wordText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  definitionText: {
    fontSize: 16,
    color: '#6B7280',
  },
  wordDetails: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  exampleContainer: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  exampleText: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  exampleTurkish: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  originalContainer: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginBottom: 12,
  },
  originalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 6,
  },
  originalText: {
    fontSize: 14,
    color: '#1E40AF',
    fontStyle: 'italic',
  },
  wordActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  deleteText: {
    fontSize: 14,
    color: '#EF4444',
    marginLeft: 4,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalCancel: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  modalSave: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  levelSelector: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  levelSelectorText: {
    fontSize: 14,
    fontWeight: '600',
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  authTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  loginButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 