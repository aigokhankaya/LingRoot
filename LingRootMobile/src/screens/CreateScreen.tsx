import React, { useState } from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { CEFRLevel, TTSRequest } from '../types';
import { apiService } from '../services/api';

const CreateScreen: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel>('B1');
  const [speechRate, setSpeechRate] = useState(1.0);
  const [isLoading, setIsLoading] = useState(false);

  const levels: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  const levelDescriptions = {
    A1: 'Başlangıç - Temel kelimeler ve ifadeler',
    A2: 'Temel - Günlük konuşma seviyesi',
    B1: 'Orta - İş ve eğitim konuları',
    B2: 'Orta-İleri - Karmaşık metinler',
    C1: 'İleri - Akıcı ve etkili kullanım',
    C2: 'Uzman - Ana dil seviyesi',
  };

  const handleCreateAudio = async () => {
    if (!inputText.trim()) {
      Alert.alert('Hata', 'Lütfen dönüştürülecek metni girin');
      return;
    }

    setIsLoading(true);
    try {
      const request: TTSRequest = {
        input: inputText,
        type: 'text',
        level: selectedLevel,
        sesHizi: speechRate,
      };

      const response = await apiService.processTextToSpeech(request);
      
      if (response.success) {
        Alert.alert(
          'Başarılı!',
          'Ses dosyası başarıyla oluşturuldu. Kütüphane sekmesinden dinleyebilirsiniz.',
          [
            {
              text: 'Tamam',
              onPress: () => {
                setInputText('');
              },
            },
          ]
        );
      } else {
        Alert.alert('Hata', response.message || 'Ses oluşturulamadı');
      }
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = () => {
    // TODO: Implement file picker
    Alert.alert('Yakında', 'Dosya yükleme özelliği yakında eklenecek');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Yeni Ses Oluştur</Text>
          <Text style={styles.subtitle}>
            Metni AI ile CEFR seviyesine uyarla ve sese dönüştür
          </Text>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.sectionTitle}>Metin Girişi</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Dönüştürmek istediğiniz metni buraya yazın..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{inputText.length} karakter</Text>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>veya</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity style={styles.fileButton} onPress={handleFileUpload}>
          <Icon name="upload-file" size={24} color="#007AFF" />
          <Text style={styles.fileButtonText}>Dosya Yükle (PDF, Word)</Text>
        </TouchableOpacity>

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>CEFR Seviyesi</Text>
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

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Konuşma Hızı</Text>
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
            <Text style={styles.speedLabel}>Yavaş</Text>
            <Text style={styles.speedLabel}>Normal</Text>
            <Text style={styles.speedLabel}>Hızlı</Text>
          </View>
        </View>

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
            {isLoading ? 'Oluşturuluyor...' : 'Ses Oluştur'}
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
});

export default CreateScreen; 