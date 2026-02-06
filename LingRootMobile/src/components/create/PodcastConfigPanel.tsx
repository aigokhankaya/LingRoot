import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { CEFRLevel } from '../../types';
import { COLORS } from '../../theme/colors';

interface PodcastConfigPanelProps {
  onCreatePodcast: (config: PodcastConfig) => void;
  language: string;
  t: (key: string, params?: Record<string, unknown>) => string;
  initialTtsProvider?: string;
}

export interface PodcastConfig {
  topic: string;
  duration: number;
  ttsProvider: string;
  hostSpeakerId: string;
  guestSpeakerId: string;
  styleType: string;
  personalityA: string;
  personalityB: string;
  includeHumor: boolean;
  includeFiller: boolean;
}

const DURATION_OPTIONS = [
  { value: 2, label: '2 dk', description: '~300\nkelime' },
  { value: 5, label: '5 dk', description: '~750\nkelime' },
  { value: 7, label: '7 dk', description: '~1050\nkelime' },
  { value: 10, label: '10 dk', description: '~1500\nkelime' },
];

const GEMINI_PODCAST_SPEAKERS = [
  { value: 'Aoede', label: 'Aoede (F)' },
  { value: 'Kore', label: 'Kore (F)' },
  { value: 'Leda', label: 'Leda (F)' },
  { value: 'Callirrhoe', label: 'Callirrhoe (F)' },
  { value: 'Zephyr', label: 'Zephyr (F)' },
  { value: 'Charon', label: 'Charon (M)' },
  { value: 'Fenrir', label: 'Fenrir (M)' },
  { value: 'Orus', label: 'Orus (M)' },
  { value: 'Puck', label: 'Puck (M)' },
  { value: 'Achilles', label: 'Achilles (M)' },
];

export const PodcastConfigPanel: React.FC<PodcastConfigPanelProps> = ({
  onCreatePodcast,
  language,
  t,
  initialTtsProvider,
}) => {
  const [podcastTopic, setPodcastTopic] = useState<string>('');
  const [podcastDuration, setPodcastDuration] = useState<number>(5);
  const [podcastTtsProvider, setPodcastTtsProvider] = useState<string>(initialTtsProvider || 'google');
  const [podcastStyleType, setPodcastStyleType] = useState<string>('friendly_chat');
  const [podcastHostSpeakerId, setPodcastHostSpeakerId] = useState<string>('Kore');
  const [podcastGuestSpeakerId, setPodcastGuestSpeakerId] = useState<string>('Puck');
  const [podcastPersonalityA, setPodcastPersonalityA] = useState<string>('curious_enthusiast');
  const [podcastPersonalityB, setPodcastPersonalityB] = useState<string>('knowledgeable_friend');
  const [podcastIncludeHumor, setPodcastIncludeHumor] = useState<boolean>(true);
  const [podcastIncludeFiller, setPodcastIncludeFiller] = useState<boolean>(true);
  const [showPodcastHostVoiceModal, setShowPodcastHostVoiceModal] = useState(false);
  const [showPodcastGuestVoiceModal, setShowPodcastGuestVoiceModal] = useState(false);

  const getGeminiSpeakerLabel = (value?: string) => {
    const found = GEMINI_PODCAST_SPEAKERS.find(s => s.value === value);
    return found?.label || value || '';
  };

  const handleCreate = () => {
    const config: PodcastConfig = {
      topic: podcastTopic,
      duration: podcastDuration,
      ttsProvider: podcastTtsProvider,
      hostSpeakerId: podcastHostSpeakerId,
      guestSpeakerId: podcastGuestSpeakerId,
      styleType: podcastStyleType,
      personalityA: podcastPersonalityA,
      personalityB: podcastPersonalityB,
      includeHumor: podcastIncludeHumor,
      includeFiller: podcastIncludeFiller,
    };
    onCreatePodcast(config);
  };

  return (
    <View style={styles.inputSection}>
      <Text style={styles.sectionTitle}>
        {language === 'tr' ? 'Podcast Oluştur' : 'Create Podcast'}
      </Text>
      <Text style={{ fontSize: 14, color: '#666', marginBottom: 12 }}>
        {language === 'tr'
          ? 'Podcast için bir konu girin ve seviye ile süreyi seçin.'
          : 'Enter a topic for the podcast and choose the level and duration.'}
      </Text>

      {podcastTtsProvider === 'google' && (
        <View style={{ marginBottom: 16 }}>
          <Text style={styles.filterLabel}>Host voice</Text>
          <TouchableOpacity
            style={styles.voiceSelectionButton}
            onPress={() => setShowPodcastHostVoiceModal(true)}
          >
            <Icon name="record-voice-over" size={22} color={COLORS.primary} />
            <View style={styles.voiceSelectionInfo}>
              <Text style={styles.voiceSelectionText}>{getGeminiSpeakerLabel(podcastHostSpeakerId)}</Text>
            </View>
            <Icon name="arrow-forward-ios" size={16} color={COLORS.primary} />
          </TouchableOpacity>

          <Text style={[styles.filterLabel, { marginTop: 12 }]}>Guest voice</Text>
          <TouchableOpacity
            style={styles.voiceSelectionButton}
            onPress={() => setShowPodcastGuestVoiceModal(true)}
          >
            <Icon name="record-voice-over" size={22} color={COLORS.primary} />
            <View style={styles.voiceSelectionInfo}>
              <Text style={styles.voiceSelectionText}>{getGeminiSpeakerLabel(podcastGuestSpeakerId)}</Text>
            </View>
            <Icon name="arrow-forward-ios" size={16} color={COLORS.primary} />
          </TouchableOpacity>

          <Modal
            visible={showPodcastHostVoiceModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowPodcastHostVoiceModal(false)}
          >
            <View style={styles.voiceModalBackdrop}>
              <View style={[styles.voiceModalContent, { maxHeight: '75%', width: '92%' }]}>
                <View style={styles.voiceModalHeader}>
                  <View>
                    <Text style={styles.voiceModalTitle}>Host voice</Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowPodcastHostVoiceModal(false)}>
                    <Icon name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.voiceList} keyboardShouldPersistTaps="handled">
                  {GEMINI_PODCAST_SPEAKERS.filter(s => s.label.includes('(F)')).map((opt) => (
                    <TouchableOpacity
                      key={`host_${opt.value}`}
                      style={[styles.voiceItem, podcastHostSpeakerId === opt.value && styles.voiceItemActive]}
                      onPress={() => {
                        setPodcastHostSpeakerId(opt.value);
                        setShowPodcastHostVoiceModal(false);
                      }}
                    >
                      <View style={styles.voiceItemInfo}>
                        <Text style={styles.voiceItemName}>{opt.label}</Text>
                      </View>
                      {podcastHostSpeakerId === opt.value && (
                        <Icon name="check" size={20} color={COLORS.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>

          <Modal
            visible={showPodcastGuestVoiceModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowPodcastGuestVoiceModal(false)}
          >
            <View style={styles.voiceModalBackdrop}>
              <View style={[styles.voiceModalContent, { maxHeight: '75%', width: '92%' }]}>
                <View style={styles.voiceModalHeader}>
                  <View>
                    <Text style={styles.voiceModalTitle}>Guest voice</Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowPodcastGuestVoiceModal(false)}>
                    <Icon name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.voiceList} keyboardShouldPersistTaps="handled">
                  {GEMINI_PODCAST_SPEAKERS.filter(s => s.label.includes('(M)')).map((opt) => (
                    <TouchableOpacity
                      key={`guest_${opt.value}`}
                      style={[styles.voiceItem, podcastGuestSpeakerId === opt.value && styles.voiceItemActive]}
                      onPress={() => {
                        setPodcastGuestSpeakerId(opt.value);
                        setShowPodcastGuestVoiceModal(false);
                      }}
                    >
                      <View style={styles.voiceItemInfo}>
                        <Text style={styles.voiceItemName}>{opt.label}</Text>
                      </View>
                      {podcastGuestSpeakerId === opt.value && (
                        <Icon name="check" size={20} color={COLORS.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </View>
      )}

      <TextInput
        style={[styles.textInput, { minHeight: 100, borderColor: COLORS.slate300 }]}
        placeholder={
          language === 'tr'
            ? 'Podcast için bir konu girin (Örn: İnternetin tarihi)...'
            : 'Enter a topic for the podcast (e.g. The history of the Internet)...'
        }
        value={podcastTopic}
        onChangeText={setPodcastTopic}
        multiline
        textAlignVertical="top"
      />

      <View style={{ marginTop: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8 }}>
          {language === 'tr' ? 'İçerik Süresi' : 'Content Duration'}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 6,
          }}
        >
          {DURATION_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={{
                flex: 1,
                marginHorizontal: 3,
                paddingVertical: 10,
                borderRadius: 8,
                borderWidth: 2,
                borderColor: podcastDuration === opt.value ? COLORS.primary : '#ddd',
                backgroundColor: podcastDuration === opt.value ? '#E3F2FD' : '#fff',
                alignItems: 'center',
              }}
              onPress={() => setPodcastDuration(opt.value)}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: podcastDuration === opt.value ? COLORS.primary : '#333',
                }}
              >
                {opt.label}
              </Text>
              <Text
                style={{
                  fontSize: 10,
                  color: podcastDuration === opt.value ? COLORS.primary : '#888',
                  marginTop: 2,
                  textAlign: 'center',
                }}
              >
                {opt.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
          {language === 'tr'
            ? `Oluşturulacak içeriğin yaklaşık süresi (±%15 tolerans)`
            : `Approximate duration of the content (±15% tolerance)`}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  inputSection: {
    marginHorizontal: 24,
    marginBottom: 20,
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    shadowColor: COLORS.brandIndigo,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 32,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.slate400,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginLeft: 4,
  },
  filterLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
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
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.slate300,
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: COLORS.slate700,
    minHeight: 120,
    textAlignVertical: 'top',
    backgroundColor: COLORS.slate50,
    fontWeight: '500',
  },
  voiceModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '70%',
  },
  voiceModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  voiceModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
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
});
