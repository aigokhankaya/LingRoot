import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../contexts/LanguageContext';
import { apiService } from '../services/api';
import { COLORS } from '../theme/colors';

interface TtsProvider {
  id: string;
  name: string;
  description: string;
  icon: string;
  features: string[];
}

const TtsProviderSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { language } = useLanguage();
  const [selectedProvider, setSelectedProvider] = useState<string>('google');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const providers: TtsProvider[] = [
    {
      id: 'google',
      name: 'Google Cloud TTS',
      description: language === 'tr' 
        ? 'Yüksek kaliteli doğal sesler ve SSML desteği'
        : 'High-quality natural voices with SSML support',
      icon: 'cloud',
      features: language === 'tr'
        ? ['SSML marks ile hassas timing', 'Çoklu ses seçenekleri', 'Neural sesler']
        : ['Precise timing with SSML marks', 'Multiple voice options', 'Neural voices'],
    },
    {
      id: 'polly',
      name: 'Amazon Polly',
      description: language === 'tr'
        ? 'AWS Polly ile gelişmiş neural sesler ve Speech Marks'
        : 'Advanced neural voices with Speech Marks from AWS Polly',
      icon: 'record-voice-over',
      features: language === 'tr'
        ? ['Speech Marks ile hassas timing', 'Neural engine desteği', 'Geniş ses kütüphanesi']
        : ['Precise timing with Speech Marks', 'Neural engine support', 'Wide voice library'],
    },
    {
      id: 'azure',
      name: 'Microsoft Azure TTS',
      description: language === 'tr'
        ? 'Azure Cognitive Services ile WordBoundary events'
        : 'WordBoundary events with Azure Cognitive Services',
      icon: 'psychology',
      features: language === 'tr'
        ? ['WordBoundary events ile hassas timing', 'Sıfır drift garantisi', 'Premium neural sesler']
        : ['Precise timing with WordBoundary events', 'Zero drift guarantee', 'Premium neural voices'],
    },
  ];

  useEffect(() => {
    fetchCurrentProvider();
  }, []);

  const fetchCurrentProvider = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getTtsProvider();
      if (response?.value) {
        setSelectedProvider(response.value);
      }
    } catch (error) {
      console.error('Failed to fetch TTS provider:', error);
      Alert.alert(
        language === 'tr' ? 'Hata' : 'Error',
        language === 'tr' 
          ? 'TTS sağlayıcı bilgisi alınamadı'
          : 'Failed to fetch TTS provider'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProvider = async (providerId: string) => {
    try {
      setIsSaving(true);
      await apiService.updateTtsProvider(providerId);
      setSelectedProvider(providerId);
      Alert.alert(
        language === 'tr' ? 'Başarılı' : 'Success',
        language === 'tr'
          ? 'TTS sağlayıcı güncellendi'
          : 'TTS provider updated successfully'
      );
    } catch (error) {
      console.error('Failed to update TTS provider:', error);
      Alert.alert(
        language === 'tr' ? 'Hata' : 'Error',
        language === 'tr'
          ? 'TTS sağlayıcı güncellenemedi'
          : 'Failed to update TTS provider'
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === 'tr' ? 'Test Ayarları' : 'Test Settings'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {language === 'tr' ? 'Ses Servis Sağlayıcı' : 'TTS Service Provider'}
          </Text>
          <Text style={styles.sectionDescription}>
            {language === 'tr'
              ? 'Mobil uygulamada kullanılacak ses sentezi servisini seçin'
              : 'Select the text-to-speech service for mobile app'}
          </Text>

          {providers.map((provider) => (
            <TouchableOpacity
              key={provider.id}
              style={[
                styles.providerCard,
                selectedProvider === provider.id && styles.selectedCard,
              ]}
              onPress={() => handleSaveProvider(provider.id)}
              disabled={isSaving}
            >
              <View style={styles.providerHeader}>
                <View style={styles.providerTitleRow}>
                  <Icon
                    name={provider.icon}
                    size={28}
                    color={selectedProvider === provider.id ? COLORS.primary : '#666'}
                  />
                  <View style={styles.providerInfo}>
                    <Text style={[
                      styles.providerName,
                      selectedProvider === provider.id && styles.selectedText
                    ]}>
                      {provider.name}
                    </Text>
                    <Text style={styles.providerDescription}>
                      {provider.description}
                    </Text>
                  </View>
                </View>
                {selectedProvider === provider.id && (
                  <Icon name="check-circle" size={24} color={COLORS.primary} />
                )}
              </View>

              <View style={styles.featuresContainer}>
                {provider.features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Icon name="check" size={16} color="#4CAF50" />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoBox}>
          <Icon name="info-outline" size={20} color="#007AFF" />
          <Text style={styles.infoText}>
            {language === 'tr'
              ? 'Seçtiğiniz sağlayıcı, mobil uygulamada ses oluştururken kullanılacaktır. Her sağlayıcının kendine özgü ses seçenekleri vardır.'
              : 'The selected provider will be used for audio generation in the mobile app. Each provider has its own unique voice options.'}
          </Text>
        </View>
      </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  providerCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  selectedCard: {
    borderColor: COLORS.primary,
    backgroundColor: '#f0f8ff',
  },
  providerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  providerTitleRow: {
    flexDirection: 'row',
    flex: 1,
  },
  providerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  selectedText: {
    color: COLORS.primary,
  },
  providerDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  featuresContainer: {
    marginTop: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  featureText: {
    fontSize: 13,
    color: '#555',
    marginLeft: 8,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1976d2',
    marginLeft: 12,
    lineHeight: 18,
  },
});

export default TtsProviderSettingsScreen;
