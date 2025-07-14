import React, { useState, useEffect } from 'react';
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
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as DocumentPicker from 'expo-document-picker';
import { CEFRLevel, TTSRequest, Voice, VoiceCategory, VoiceFilter } from '../types';
import { apiService } from '../services/api';

const CreateScreen: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel>('B1');
  const [speechRate, setSpeechRate] = useState(1.0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  
  // Voice selection states
  const [selectedVoiceCategory, setSelectedVoiceCategory] = useState<string>('standard');
  const [selectedVoice, setSelectedVoice] = useState<string>('en-US-Standard-C');
  const [selectedAccent, setSelectedAccent] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState<boolean>(false);
  const [showVoiceSelection, setShowVoiceSelection] = useState<boolean>(false);

  const levels: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  const levelDescriptions = {
    A1: 'Başlangıç - Temel kelimeler ve ifadeler',
    A2: 'Temel - Günlük konuşma seviyesi',
    B1: 'Orta - İş ve eğitim konuları',
    B2: 'Orta-İleri - Karmaşık metinler',
    C1: 'İleri - Akıcı ve etkili kullanım',
    C2: 'Uzman - Ana dil seviyesi',
  };

  // Voice categories
  const voiceCategories: VoiceCategory[] = [
    { value: 'standard', label: 'Standart', icon: 'volume-up', badge: 'Ücretsiz' },
    { value: 'wavenet', label: 'WaveNet', icon: 'star', badge: 'Premium' },
    { value: 'neural2', label: 'Neural2', icon: 'psychology', badge: 'Premium' },
    { value: 'studio', label: 'Studio', icon: 'workspace-premium', badge: 'Platinium' },
    { value: 'chirp3d', label: 'Chirp 3D', icon: 'diamond', badge: 'Gold' },
  ];

  // Voice filters
  const accentOptions = [
    { value: 'all', label: 'Tümü' },
    { value: 'american', label: 'Amerikan' },
    { value: 'british', label: 'İngiliz' },
    { value: 'australian', label: 'Avustralya' },
    { value: 'canadian', label: 'Kanada' },
    { value: 'indian', label: 'Hint' },
  ];

  const genderOptions = [
    { value: 'all', label: 'Tümü' },
    { value: 'male', label: 'Erkek' },
    { value: 'female', label: 'Kadın' },
  ];

  // Fetch available voices
  const fetchAvailableVoices = async () => {
    setLoadingVoices(true);
    try {
      const response = await apiService.getAvailableVoices();
      console.log('🎯 [VOICE DEBUG] Raw API Response:', response);
      
      // Backend'den { provider: 'google', voices: [...] } formatında geliyor
      const apiResponse = response as any;
      const voices = apiResponse.voices || apiResponse.data?.voices || [];
      
      if (voices.length > 0) {
        console.log('🎯 [VOICE DEBUG] Available voices loaded:', voices.length);
        console.log('🎯 [VOICE DEBUG] First voice:', voices[0]);
        setAvailableVoices(voices);
      } else {
        console.error('🎯 [VOICE DEBUG] No voices found in response:', response);
      }
    } catch (error) {
      console.error('🎯 [VOICE DEBUG] Error loading voices:', error);
    } finally {
      setLoadingVoices(false);
    }
  };

  // Fetch filtered voices
  const fetchFilteredVoices = async (accent?: string, gender?: string) => {
    setLoadingVoices(true);
    try {
      const response = await apiService.getFilteredVoices(accent, gender);
      if (response.success && response.data) {
        setAvailableVoices(response.data);
        console.log('✅ Loaded filtered voices:', response.data.length);
      }
    } catch (error) {
      console.error('❌ Error loading filtered voices:', error);
    } finally {
      setLoadingVoices(false);
    }
  };

  const getFilteredVoicesByCategory = () => {
    const filtered = availableVoices.filter(voice => {
      const categoryMatch = voice.category === selectedVoiceCategory;
      const accentMatch = selectedAccent === 'all' || voice.accent === selectedAccent;
      const genderMatch = selectedGender === 'all' || voice.gender === selectedGender;
      
      console.log('🎯 [FILTER DEBUG] Voice:', voice.name, 'Category:', voice.category, 'Selected:', selectedVoiceCategory, 'Match:', categoryMatch);
      
      return categoryMatch && accentMatch && genderMatch;
    });
    
    console.log('🎯 [FILTER DEBUG] Total voices:', availableVoices.length);
    console.log('🎯 [FILTER DEBUG] Filtered voices:', filtered.length);
    console.log('🎯 [FILTER DEBUG] Selected category:', selectedVoiceCategory);
    
    return filtered;
  };

  // Load voices on component mount
  useEffect(() => {
    fetchAvailableVoices();
  }, []);

  // Update filtered voices when filters change
  useEffect(() => {
    if (selectedAccent !== 'all' || selectedGender !== 'all') {
      fetchFilteredVoices(selectedAccent, selectedGender);
    } else {
      fetchAvailableVoices();
    }
  }, [selectedAccent, selectedGender]);

  const handleCreateAudio = async () => {
    if (!inputText.trim() && !selectedFile) {
      Alert.alert('Hata', 'Lütfen metin girin veya dosya seçin');
      return;
    }

    setIsLoading(true);
    try {
      let request: TTSRequest;
      
      if (selectedFile) {
        // File upload process
        console.log('📁 Processing file:', selectedFile.name);
        
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('file', {
          uri: selectedFile.uri,
          type: selectedFile.mimeType,
          name: selectedFile.name,
        } as any);
        formData.append('level', selectedLevel);
        formData.append('sesHizi', speechRate.toString());
        formData.append('voiceName', selectedVoice);
        
        const response = await apiService.processFileToSpeech(formData);
        
        if (response.success) {
          Alert.alert(
            'Başarılı!',
            'Dosya başarıyla işlendi ve ses oluşturuldu. Kütüphane sekmesinden dinleyebilirsiniz.',
            [
              {
                text: 'Tamam',
                onPress: () => {
                  setInputText('');
                  setSelectedFile(null);
                },
              },
            ]
          );
        } else {
          Alert.alert('Hata', response.message || 'Dosya işlenemedi');
        }
      } else {
        // Text processing
        request = {
          input: inputText,
          type: 'text',
          level: selectedLevel,
          sesHizi: speechRate,
          voiceName: selectedVoice,
        };

        console.log('🎯 [TTS DEBUG] Sending request:', request);
        console.log('🎯 [TTS DEBUG] Selected voice:', selectedVoice);
        console.log('🎯 [TTS DEBUG] Available voices count:', availableVoices.length);

        const response = await apiService.processTextToSpeech(request);
        
        console.log('🎯 [TTS DEBUG] Full API Response:', response);
        console.log('🎯 [TTS DEBUG] Response success:', response.success);
        console.log('🎯 [TTS DEBUG] Response message:', response.message);
        console.log('🎯 [TTS DEBUG] Response mp3_url:', response.mp3_url);
        
        if (response.success) {
          console.log('🎯 [TTS DEBUG] Showing success alert...');
          Alert.alert(
            'Başarılı!',
            'Ses dosyası başarıyla oluşturuldu. Kütüphane sekmesinden dinleyebilirsiniz.',
            [
              {
                text: 'Tamam',
                onPress: () => {
                  console.log('🎯 [TTS DEBUG] Alert dismissed, clearing input...');
                  setInputText('');
                },
              },
            ]
          );
        } else {
          console.log('🎯 [TTS DEBUG] Response success is false, showing error...');
          Alert.alert('Hata', response.message || 'Ses oluşturulamadı');
        }
      }
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async () => {
    try {
      console.log('📁 Opening document picker...');
      
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      console.log('📁 Document picker result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFile(file);
        setInputText(''); // Clear text input when file is selected
        
        Alert.alert(
          'Dosya Seçildi',
          `"${file.name}" dosyası seçildi. Ses oluşturmak için "Ses Oluştur" butonuna tıklayın.`
        );
        
        console.log('✅ File selected:', file.name, file.mimeType);
      }
    } catch (error: any) {
      console.error('❌ File picker error:', error);
      Alert.alert('Hata', 'Dosya seçilirken hata oluştu');
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    Alert.alert('Bilgi', 'Seçilen dosya kaldırıldı');
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
            style={[styles.textInput, selectedFile && styles.textInputDisabled]}
            placeholder={selectedFile ? "Dosya seçildi - metin girişi devre dışı" : "Dönüştürmek istediğiniz metni buraya yazın..."}
            value={inputText}
            onChangeText={setInputText}
            multiline
            textAlignVertical="top"
            editable={!selectedFile}
          />
          {!selectedFile && <Text style={styles.charCount}>{inputText.length} karakter</Text>}
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>veya</Text>
          <View style={styles.dividerLine} />
        </View>

        {selectedFile ? (
          <View style={styles.selectedFileContainer}>
            <View style={styles.selectedFileInfo}>
              <Icon name="insert-drive-file" size={24} color="#007AFF" />
              <View style={styles.fileDetails}>
                <Text style={styles.fileName}>{selectedFile.name}</Text>
                <Text style={styles.fileSize}>
                  {selectedFile.size ? `${Math.round(selectedFile.size / 1024)} KB` : 'Boyut bilinmiyor'}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.clearFileButton} onPress={clearSelectedFile}>
              <Icon name="clear" size={20} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.fileButton} onPress={handleFileUpload}>
            <Icon name="upload-file" size={24} color="#007AFF" />
            <Text style={styles.fileButtonText}>Dosya Yükle (PDF, Word)</Text>
          </TouchableOpacity>
        )}

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

        {/* Voice Selection Section */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Ses Seçimi</Text>
          
          {/* Voice Categories */}
          <View style={styles.voiceCategoryContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {voiceCategories.map((category) => (
                <TouchableOpacity
                  key={category.value}
                  style={[
                    styles.voiceCategoryButton,
                    selectedVoiceCategory === category.value && styles.voiceCategoryButtonActive,
                  ]}
                  onPress={() => {
                    setSelectedVoiceCategory(category.value);
                    // Reset voice selection when category changes
                    const filteredVoices = getFilteredVoicesByCategory();
                    if (filteredVoices.length > 0) {
                      setSelectedVoice(filteredVoices[0].name);
                    }
                  }}
                >
                  <Icon name={category.icon} size={16} color={selectedVoiceCategory === category.value ? '#FFF' : '#007AFF'} />
                  <Text style={[
                    styles.voiceCategoryText,
                    selectedVoiceCategory === category.value && styles.voiceCategoryTextActive,
                  ]}>
                    {category.label}
                  </Text>
                  <View style={styles.voiceBadge}>
                    <Text style={styles.voiceBadgeText}>{category.badge}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Voice Filters */}
          <View style={styles.voiceFiltersContainer}>
            <View style={styles.filterRow}>
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Aksan</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {accentOptions.map((accent) => (
                    <TouchableOpacity
                      key={accent.value}
                      style={[
                        styles.filterButton,
                        selectedAccent === accent.value && styles.filterButtonActive,
                      ]}
                      onPress={() => setSelectedAccent(accent.value)}
                    >
                      <Text style={[
                        styles.filterButtonText,
                        selectedAccent === accent.value && styles.filterButtonTextActive,
                      ]}>
                        {accent.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Cinsiyet</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {genderOptions.map((gender) => (
                    <TouchableOpacity
                      key={gender.value}
                      style={[
                        styles.filterButton,
                        selectedGender === gender.value && styles.filterButtonActive,
                      ]}
                      onPress={() => setSelectedGender(gender.value)}
                    >
                      <Text style={[
                        styles.filterButtonText,
                        selectedGender === gender.value && styles.filterButtonTextActive,
                      ]}>
                        {gender.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>

          {/* Voice Selection Button */}
          <TouchableOpacity
            style={styles.voiceSelectionButton}
            onPress={() => setShowVoiceSelection(true)}
          >
            <Icon name="record-voice-over" size={24} color="#007AFF" />
            <View style={styles.voiceSelectionInfo}>
              <Text style={styles.voiceSelectionText}>
                {selectedVoice || 'Ses seçin'}
              </Text>
              <Text style={styles.voiceSelectionSubtext}>
                {getFilteredVoicesByCategory().find(v => v.name === selectedVoice)?.description || 'Dokunarak ses seçin'}
              </Text>
            </View>
            <Icon name="arrow-forward-ios" size={16} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* Voice Selection Modal */}
        {showVoiceSelection && (
          <View style={styles.voiceModal}>
            <View style={styles.voiceModalContent}>
              <View style={styles.voiceModalHeader}>
                <Text style={styles.voiceModalTitle}>Ses Seçin</Text>
                <TouchableOpacity onPress={() => setShowVoiceSelection(false)}>
                  <Icon name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              {loadingVoices ? (
                <ActivityIndicator size="large" color="#007AFF" style={styles.voiceLoader} />
              ) : (
                <FlatList
                  data={getFilteredVoicesByCategory()}
                  keyExtractor={(item) => item.name}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.voiceItem,
                        selectedVoice === item.name && styles.voiceItemActive,
                      ]}
                      onPress={() => {
                        setSelectedVoice(item.name);
                        setShowVoiceSelection(false);
                      }}
                    >
                      <View style={styles.voiceItemInfo}>
                        <Text style={styles.voiceItemName}>{item.name}</Text>
                        <Text style={styles.voiceItemDescription}>
                          {item.accent === 'american' ? 'Amerikan' : 
                           item.accent === 'british' ? 'İngiliz' : 
                           item.accent === 'australian' ? 'Avustralya' : item.accent} • {' '}
                          {item.gender === 'male' ? 'Erkek' : 'Kadın'}
                        </Text>
                        {item.ssmlSupport && (
                          <Text style={styles.voiceItemSSML}>SSML Destekli</Text>
                        )}
                      </View>
                      {selectedVoice === item.name && (
                        <Icon name="check" size={20} color="#007AFF" />
                      )}
                    </TouchableOpacity>
                  )}
                  style={styles.voiceList}
                />
              )}
            </View>
          </View>
        )}

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
  textInputDisabled: {
    backgroundColor: '#f8f8f8',
    color: '#999',
  },
  selectedFileContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedFileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileDetails: {
    marginLeft: 12,
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 14,
    color: '#666',
  },
  clearFileButton: {
    padding: 8,
    backgroundColor: '#FFE5E5',
    borderRadius: 20,
  },
  
  // Voice Selection Styles
  voiceCategoryContainer: {
    marginBottom: 16,
  },
  voiceCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  voiceCategoryButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  voiceCategoryText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginLeft: 4,
  },
  voiceCategoryTextActive: {
    color: 'white',
  },
  voiceBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  voiceBadgeText: {
    fontSize: 10,
    color: '#007AFF',
    fontWeight: '600',
  },
  voiceFiltersContainer: {
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterGroup: {
    flex: 1,
    marginRight: 8,
  },
  filterLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 6,
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  voiceSelectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  voiceSelectionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  voiceSelectionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  voiceSelectionSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  voiceModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  voiceModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  voiceModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  voiceLoader: {
    paddingVertical: 40,
  },
  voiceList: {
    maxHeight: 300,
  },
  voiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f8f8f8',
  },
  voiceItemActive: {
    backgroundColor: '#E3F2FD',
  },
  voiceItemInfo: {
    flex: 1,
  },
  voiceItemName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  voiceItemDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  voiceItemSSML: {
    fontSize: 10,
    color: '#4CAF50',
    marginTop: 2,
    fontWeight: '600',
  },
  });

export default CreateScreen; 