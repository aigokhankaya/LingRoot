import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { CEFRLevel } from '../types';
import { apiService } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

const SuggestionsScreen: React.FC = () => {
  const { t } = useLanguage();
  const [topic, setTopic] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel>('B1');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string>('');

  const levels: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  const levelDescriptions = {
    A1: t('suggestions.cefrDescriptions.A1'),
    A2: t('suggestions.cefrDescriptions.A2'),
    B1: t('suggestions.cefrDescriptions.B1'),
    B2: t('suggestions.cefrDescriptions.B2'),
    C1: t('suggestions.cefrDescriptions.C1'),
    C2: t('suggestions.cefrDescriptions.C2'),
  } as const;

  const handleGetSuggestions = async () => {
    if (!topic.trim()) {
      Alert.alert(t('common.error'), t('suggestions.alerts.pleaseEnterTopic'));
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiService.getTopicSuggestions(topic, selectedLevel);
      if (response.success) {
        setSuggestions(response.suggestions || []);
        if (response.suggestions && response.suggestions.length === 0) {
          Alert.alert(t('common.info'), t('suggestions.alerts.noSuggestions'));
        }
      } else {
        Alert.alert(t('common.error'), response.message || t('suggestions.alerts.fetchFailed'));
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('common.unexpectedError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setSelectedSuggestion(suggestion);
    // Burada seçilen öneriyi başka bir ekrana gönderebiliriz
    Alert.alert(
      t('suggestions.select.title'),
      t('suggestions.select.message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.yes'),
          onPress: () => {
            // Create ekranına geçiş yapılabilir
            Alert.alert(t('common.info'), t('suggestions.select.navigateInfo'));
          },
        },
      ]
    );
  };

  const renderSuggestion = ({ item, index }: { item: string; index: number }) => (
    <TouchableOpacity
      style={styles.suggestionCard}
      onPress={() => handleSelectSuggestion(item)}
    >
      <View style={styles.suggestionHeader}>
        <Text style={styles.suggestionNumber}>{index + 1}</Text>
        <Icon name="chevron-right" size={20} color="#007AFF" />
      </View>
      <Text style={styles.suggestionText}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('suggestions.title')}</Text>
          <Text style={styles.subtitle}>
            {t('suggestions.subtitle')}
          </Text>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.sectionTitle}>{t('suggestions.input.title')}</Text>
          <TextInput
            style={styles.textInput}
            placeholder={t('suggestions.input.placeholder')}
            value={topic}
            onChangeText={setTopic}
            multiline={false}
          />
        </View>

        <View style={styles.levelSection}>
          <Text style={styles.sectionTitle}>{t('suggestions.cefr.title')}</Text>
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
          <Text style={styles.levelDescription}>
            {levelDescriptions[selectedLevel]}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.getSuggestionsButton, isLoading && styles.buttonDisabled]}
          onPress={handleGetSuggestions}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Icon name="lightbulb" size={24} color="white" />
          )}
          <Text style={styles.buttonText}>
            {isLoading ? t('suggestions.buttons.loading') : t('suggestions.buttons.getSuggestions')}
          </Text>
        </TouchableOpacity>

        {suggestions.length > 0 && (
          <View style={styles.suggestionsSection}>
            <Text style={styles.sectionTitle}>
              {t('suggestions.results.title', { count: suggestions.length })}
            </Text>
            <FlatList
              data={suggestions}
              keyExtractor={(item, index) => index.toString()}
              renderItem={renderSuggestion}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        )}

        {suggestions.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <Icon name="lightbulb-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>{t('suggestions.empty.title')}</Text>
            <Text style={styles.emptyDescription}>
              {t('suggestions.empty.description')}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  inputSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    minHeight: 50,
  },
  levelSection: {
    marginBottom: 24,
  },
  levelSelector: {
    marginBottom: 8,
  },
  levelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  levelButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  levelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  levelButtonTextActive: {
    color: 'white',
  },
  levelDescription: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  getSuggestionsButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  suggestionsSection: {
    marginBottom: 24,
  },
  suggestionCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  suggestionNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 30,
    textAlign: 'center',
  },
  suggestionText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  separator: {
    height: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default SuggestionsScreen; 