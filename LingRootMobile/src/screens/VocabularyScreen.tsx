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
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  getVocabulary,
  addWordToVocabulary,
  addWordWithTranslation,
  deleteWordFromVocabulary,
  updateWordInVocabulary,
  VocabularyWord,
  getReminderSettings,
  saveReminderSettings,
  ReminderSettings
} from '../services/api';
import { ReminderSettingsService } from '../services/reminderSettingsService';
import NotificationService from '../services/notificationService';
import { COLORS } from '../theme/colors';

const { width } = Dimensions.get('window');

export default function VocabularyScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
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
    level: '',
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
    a1: {
      title: language === 'tr' ? 'A1 - Başlangıç' : 'A1 - Beginner',
      color: '#10B981',
      bgColor: '#ECFDF5'
    },
    a2: {
      title: language === 'tr' ? 'A2 - Temel' : 'A2 - Elementary',
      color: '#3B82F6',
      bgColor: '#EFF6FF'
    },
    b1: {
      title: language === 'tr' ? 'B1 - Orta' : 'B1 - Intermediate',
      color: '#8B5CF6',
      bgColor: '#F3E8FF'
    },
    b2: {
      title: language === 'tr' ? 'B2 - Orta-Üstü' : 'B2 - Upper Intermediate',
      color: '#F59E0B',
      bgColor: '#FEF3C7'
    },
    c1: {
      title: language === 'tr' ? 'C1 - İleri' : 'C1 - Advanced',
      color: '#EF4444',
      bgColor: '#FEE2E2'
    },
    c2: {
      title: language === 'tr' ? 'C2 - Ustalık' : 'C2 - Proficiency',
      color: '#EC4899',
      bgColor: '#FCE7F3'
    },
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
      // Find word by ID (convert string to number if needed)
      const targetWordId = parseInt(wordId, 10);

      const targetWord = vocabulary.find(word => word.id === targetWordId);

      if (targetWord) {
        setExpandedWordId(targetWordId);

        // Clear the search term to ensure the word is visible
        setSearchTerm('');
        setActiveLevel('all');
        setLearnedFilter('all');

        // Scroll to the word after a short delay to allow render
        setTimeout(() => {
          scrollToWord(targetWordId);

          // Clear the route params to prevent re-triggering
          navigation.setParams({ wordId: undefined });
        }, 1200); // Increased delay to ensure smooth rendering
      }
    }
  }, [route?.params?.wordId, vocabulary]);

  // Function to scroll to specific word
  const scrollToWord = (wordId: number) => {
    if (!scrollViewRef.current) {
      return;
    }

    // Try to use the word ref for accurate positioning
    const wordRef = wordRefs.current.get(wordId);

    if (wordRef) {
      wordRef.measureLayout(
        scrollViewRef.current as any,
        (x, y, width, height) => {
          // Scroll to position with some offset from top
          const offset = Math.max(0, y - 100); // 100px from top

          scrollViewRef.current?.scrollTo({
            y: offset,
            animated: true,
          });
        },
        () => {
          scrollToWordFallback(wordId);
        }
      );
    } else {
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
      // More aggressive calculation - scroll closer to end for later items
      const estimatedWordHeight = 120;
      const headerOffset = 400; // Generous header space
      const targetOffset = headerOffset + (wordIndex * estimatedWordHeight);

      scrollViewRef.current?.scrollTo({
        y: targetOffset,
        animated: true,
      });
    } else {
      // word not found; no-op
    }
  };

  const loadVocabulary = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const words = await getVocabulary();
      setVocabulary(words);
    } catch (error: any) {
      setError(t('vocabulary.error') + error.message);
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
        // Save to local storage for offline access
        await ReminderSettingsService.saveSettings(settings);
      } catch (apiError) {
        settings = await ReminderSettingsService.getSettings();
      }

      setReminderSettings(settings);
    } catch (error) {
      // silent in production
    }
  };

  const handleSaveReminderSettings = async () => {
    try {
      // Save to both API and local storage
      try {
        await saveReminderSettings(reminderSettings);
      } catch (apiError) {
        // fall back to local only
      }

      // Always save to local storage as backup
      await ReminderSettingsService.saveSettings(reminderSettings);

      // Restart smart notifications with new settings
      await NotificationService.setupSmartVocabularyNotifications();

      setIsReminderModalVisible(false);
      Alert.alert('✅ ' + t('vocabulary.success'), t('vocabulary.reminderSuccess'));
    } catch (error) {
      Alert.alert('❌ ' + t('notifications.error'), t('vocabulary.reminderError'));
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
      Alert.alert(
        language === 'tr' ? 'Hata' : 'Error',
        (language === 'tr' ? 'Kelime durumu güncellenirken hata oluştu: ' : 'Error updating word status: ') + error.message
      );
    }
  };

  const deleteWord = async (wordId: number) => {
    Alert.alert(
      language === 'tr' ? 'Kelimeyi Sil' : 'Delete Word',
      language === 'tr' ? 'Bu kelimeyi silmek istediğinizden emin misiniz?' : 'Are you sure you want to delete this word?',
      [
        { text: language === 'tr' ? 'İptal' : 'Cancel', style: 'cancel' },
        {
          text: language === 'tr' ? 'Sil' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWordFromVocabulary(wordId);
              setVocabulary(vocabulary.filter(word => word.id !== wordId));
            } catch (error: any) {
              Alert.alert(
                language === 'tr' ? 'Hata' : 'Error',
                (language === 'tr' ? 'Kelime silinirken hata oluştu: ' : 'Error deleting word: ') + error.message
              );
            }
          }
        }
      ]
    );
  };

  const addNewWord = async () => {
    if (!newWord.word) {
      Alert.alert(
        language === 'tr' ? 'Hata' : 'Error',
        language === 'tr' ? 'Kelime alanı zorunludur.' : 'Word field is required.'
      );
      return;
    }

    try {
      const cleanWord = newWord.word.trim();

      // Otomatik olarak kelime detaylarını çek (AudioPlayer'daki gibi)
      const result = await addWordWithTranslation(
        cleanWord,
        '', // Context boş olabilir, API kendi context'ini oluşturur
        '', // Level boş - OpenAI otomatik belirleyecek
        '' // Original sentence boş olabilir
      );

      setVocabulary([...vocabulary, result.data]);
      setNewWord({ word: '', definition: '', level: '', example: '' });
      setIsAddModalVisible(false);

      // Detaylı başarı mesajı göster
      if (result.isExisting) {
        Alert.alert(
          language === 'tr' ? 'Bilgi!' : 'Info!',
          language === 'tr'
            ? `"${cleanWord}" kelimesi zaten kelime listenizdedir:\n\nAnlam: ${result.data.definition || 'Belirtilmemiş'}\nÖrnek: ${result.data.example_sentence || 'Belirtilmemiş'}`
            : `"${cleanWord}" is already in your vocabulary list:\n\nMeaning: ${result.data.definition || 'Not specified'}\nExample: ${result.data.example_sentence || 'Not specified'}`,
          [{ text: language === 'tr' ? 'Tamam' : 'OK' }]
        );
      } else if (result.translationError) {
        Alert.alert(
          language === 'tr' ? 'Uyarı!' : 'Warning!',
          language === 'tr'
            ? `"${cleanWord}" kelimesi eklendi ancak çeviri yapılamadı. Anlamı manuel olarak ekleyebilirsiniz.`
            : `"${cleanWord}" was added but translation failed. You can add the meaning manually.`,
          [{ text: language === 'tr' ? 'Tamam' : 'OK' }]
        );
      } else {
        Alert.alert(
          language === 'tr' ? 'Başarılı!' : 'Success!',
          language === 'tr'
            ? `"${cleanWord}" kelimesi başarıyla eklendi!\n\nAnlam: ${result.data.definition}\nÖrnek Cümle: ${result.data.example_sentence}\nSeviye: ${result.data.level}`
            : `"${cleanWord}" was successfully added!\n\nMeaning: ${result.data.definition}\nExample: ${result.data.example_sentence}\nLevel: ${result.data.level}`,
          [{ text: language === 'tr' ? 'Tamam' : 'OK' }]
        );
      }
    } catch (error: any) {
      Alert.alert(
        language === 'tr' ? 'Hata' : 'Error',
        (language === 'tr' ? 'Kelime eklenirken hata oluştu: ' : 'Error adding word: ') + error.message
      );
    }
  };

  const stats = getStatistics();
  const filteredWords = getFilteredWords();

  // Auth loading state
  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
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
            <Text style={styles.progressText}>{language === 'tr' ? 'İlerleme' : 'Progress'}</Text>
            <Text style={styles.progressPercent}>{progress}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: data.color }]} />
          </View>
        </View>
        <View style={styles.levelCardFooter}>
          <Text style={styles.wordCount}>{levelWords.length} {language === 'tr' ? 'kelime' : 'words'}</Text>
          <TouchableOpacity
            style={[styles.viewButton, { backgroundColor: data.color }]}
            onPress={() => setActiveLevel(level)}
          >
            <Text style={styles.viewButtonText}>{language === 'tr' ? 'Görüntüle' : 'View'}</Text>
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
                <Text style={styles.exampleTitle}>{language === 'tr' ? 'Örnek Cümle:' : 'Example Sentence:'}</Text>
                <Text style={styles.exampleText}>"{item.example_sentence}"</Text>
                {item.example_sentence_turkish && (
                  <Text style={styles.exampleTurkish}>🇹🇷 "{item.example_sentence_turkish}"</Text>
                )}
              </View>
            )}

            {item.original_sentence && (
              <View style={styles.originalContainer}>
                <Text style={styles.originalTitle}>{language === 'tr' ? 'Orijinal Cümle:' : 'Original Sentence:'}</Text>
                <Text style={styles.originalText}>"{item.original_sentence}"</Text>
              </View>
            )}

            <View style={styles.wordActions}>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteWord(item.id!)}
              >
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                <Text style={styles.deleteText}>{language === 'tr' ? 'Sil' : 'Delete'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>{t('vocabulary.loading')}</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadVocabulary} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>{t('vocabulary.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* İstatistikler */}
            <View style={styles.statsContainer}>
              <View style={styles.statsHeader}>
                <Text style={styles.sectionTitle}>{t('vocabulary.statistics')}</Text>
                <TouchableOpacity onPress={() => setIsAddModalVisible(true)}>
                  <Ionicons name="add" size={24} color="#3B82F6" />
                </TouchableOpacity>
              </View>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{stats.total}</Text>
                  <Text style={styles.statLabel}>{t('vocabulary.totalWords')}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statNumber, { color: '#10B981' }]}>{stats.learned}</Text>
                  <Text style={styles.statLabel}>{t('vocabulary.learned')}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{stats.notLearned}</Text>
                  <Text style={styles.statLabel}>{t('vocabulary.notLearned')}</Text>
                </View>
              </View>
            </View>

            {/* Arama ve Filtreleme */}
            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={20} color="#9CA3AF" />
                <TextInput
                  style={styles.searchInput}
                  placeholder={language === 'tr' ? 'Kelime veya anlam ara...' : 'Search word or meaning...'}
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                />
              </View>

              {/* Status Filters - Row 1 */}
              <View style={styles.filterRow}>
                <TouchableOpacity
                  style={[styles.filterButton, learnedFilter === 'all' && styles.statusFilterActive]}
                  onPress={() => setLearnedFilter('all')}
                >
                  <Text style={[styles.filterText, learnedFilter === 'all' && styles.statusFilterActiveText]}>
                    {language === 'tr' ? 'Tümü' : 'All'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterButton, learnedFilter === 'learned' && styles.statusFilterActive]}
                  onPress={() => setLearnedFilter('learned')}
                >
                  <Text style={[styles.filterText, learnedFilter === 'learned' && styles.statusFilterActiveText]}>
                    {language === 'tr' ? 'Öğrenildi' : 'Learned'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterButton, learnedFilter === 'unlearned' && styles.statusFilterActive]}
                  onPress={() => setLearnedFilter('unlearned')}
                >
                  <Text style={[styles.filterText, learnedFilter === 'unlearned' && styles.statusFilterActiveText]}>
                    {language === 'tr' ? 'Yeni' : 'New'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* CEFR Level Filters - Row 2 */}
              <View style={[styles.filterRow, { marginTop: 8 }]}>
                {Object.entries(wordLevels).map(([level, data]) => (
                  <TouchableOpacity
                    key={level}
                    style={[styles.filterButton, activeLevel === level && styles.activeFilter]}
                    onPress={() => setActiveLevel(activeLevel === level ? 'all' : level)}
                  >
                    <Text style={[styles.filterText, activeLevel === level && styles.activeFilterText]}>
                      {level.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Kelime Listesi */}
            <View style={styles.wordListContainer}>
              <View style={styles.wordListHeader}>
                <Text style={styles.sectionTitle}>
                  {activeLevel === 'all' ? (language === 'tr' ? 'Tüm Kelimeler' : 'All Words') : wordLevels[activeLevel as keyof typeof wordLevels]?.title}
                </Text>
                <Text style={styles.wordCount}>{filteredWords.length} {language === 'tr' ? 'kelime' : 'words'}</Text>
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
                    {vocabulary.length === 0
                      ? (language === 'tr' ? 'Henüz kelime eklenmemiş' : 'No words added yet')
                      : (language === 'tr' ? 'Sonuç bulunamadı' : 'No results found')
                    }
                  </Text>
                  <Text style={styles.emptyText}>
                    {vocabulary.length === 0
                      ? (language === 'tr'
                        ? 'Metin oynatıcısında kelimelere uzun basarak kelime ekleyebilirsiniz.'
                        : 'You can add words by long-pressing on words in the text player.')
                      : (language === 'tr'
                        ? 'Arama kriterlerinize uygun kelime bulunamadı.'
                        : 'No words found matching your search criteria.')
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
              <Text style={styles.modalCancel}>{language === 'tr' ? 'İptal' : 'Cancel'}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{language === 'tr' ? 'Yeni Kelime' : 'New Word'}</Text>
            <TouchableOpacity onPress={addNewWord}>
              <Text style={styles.modalSave}>{language === 'tr' ? 'Kaydet' : 'Save'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{language === 'tr' ? 'Kelime *' : 'Word *'}</Text>
              <TextInput
                style={styles.textInput}
                value={newWord.word}
                onChangeText={(text) => setNewWord({ ...newWord, word: text })}
                placeholder={language === 'tr' ? 'Örn: beautiful' : 'e.g: beautiful'}
              />
              <Text style={styles.helperText}>
                {language === 'tr'
                  ? '💡 Anlam, örnek cümle ve seviye otomatik olarak AI tarafından belirlenecektir'
                  : '💡 Meaning, example sentence and level will be automatically determined by AI'}
              </Text>
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
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.slate800,
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  contentContainer: {
    paddingTop: 8,
    paddingBottom: 120,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.slate800,
    marginBottom: 16,
  },
  statsContainer: {
    marginBottom: 24,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.slate800,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.slate400,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
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
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  levelCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  levelTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  levelBadgeText: {
    fontSize: 9,
    fontWeight: '900',
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
    fontSize: 11,
    color: COLORS.slate500,
    fontWeight: '500',
  },
  progressPercent: {
    fontSize: 11,
    color: COLORS.slate500,
    fontWeight: '700',
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.slate200,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  levelCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wordCount: {
    fontSize: 13,
    color: COLORS.slate500,
    fontWeight: '500',
  },
  viewButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  viewButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'white',
  },
  searchContainer: {
    marginBottom: 24,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.slate100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: COLORS.slate700,
    fontWeight: '500',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeFilter: {
    backgroundColor: COLORS.brandTeal,
    borderColor: COLORS.brandTeal,
  },
  statusFilterActive: {
    backgroundColor: COLORS.slate800,
    borderColor: COLORS.slate800,
  },
  filterText: {
    fontSize: 11,
    color: COLORS.slate400,
    fontWeight: '700',
  },
  activeFilterText: {
    color: 'white',
  },
  statusFilterActiveText: {
    color: 'white',
  },
  filterDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.slate200,
    alignSelf: 'center',
    marginHorizontal: 8,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginBottom: 12,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: 'rgba(226, 232, 240, 0.5)',
    borderRightColor: 'rgba(226, 232, 240, 0.5)',
    borderBottomColor: 'rgba(226, 232, 240, 0.5)',
    borderLeftWidth: 6,
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
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
    fontWeight: '800',
    color: COLORS.slate800,
    flex: 1,
  },
  definitionText: {
    fontSize: 14,
    color: COLORS.slate500,
  },
  wordDetails: {
    padding: 16,
    paddingTop: 0,
  },
  exampleContainer: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
  },
  exampleTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#3b82f6',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  exampleText: {
    fontSize: 13,
    color: COLORS.slate700,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 4,
  },
  exampleTurkish: {
    fontSize: 12,
    color: COLORS.slate500,
    fontStyle: 'italic',
  },
  originalContainer: {
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.1)',
    marginBottom: 12,
  },
  originalTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.brandIndigo,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  originalText: {
    fontSize: 12,
    color: COLORS.slate600,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  wordActions: {
    flexDirection: 'row',
    gap: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    flex: 1,
    justifyContent: 'center',
  },
  deleteText: {
    fontSize: 12,
    color: '#EF4444',
    marginLeft: 6,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.slate700,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.slate500,
    textAlign: 'center',
    lineHeight: 22,
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
    color: COLORS.slate500,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.danger,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.brandTeal,
    borderRadius: 16,
    shadowColor: COLORS.brandTeal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate100,
  },
  modalCancel: {
    fontSize: 15,
    color: COLORS.slate500,
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.slate800,
  },
  modalSave: {
    fontSize: 15,
    color: COLORS.brandTeal,
    fontWeight: '700',
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.slate400,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 4,
  },
  textInput: {
    backgroundColor: COLORS.slate50,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.slate700,
    borderWidth: 1,
    borderColor: COLORS.slate100,
    fontWeight: '500',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  levelSelector: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 8,
  },
  levelSelectorText: {
    fontSize: 12,
    fontWeight: '700',
  },
  helperText: {
    fontSize: 12,
    color: COLORS.slate500,
    marginTop: 8,
    fontStyle: 'italic',
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  authTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.slate700,
    marginTop: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  loginButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: COLORS.brandTeal,
    borderRadius: 16,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
}); 