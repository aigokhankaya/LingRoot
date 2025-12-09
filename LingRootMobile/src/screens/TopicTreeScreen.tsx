import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, FlatList, TextInput, Alert, Modal } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { apiService } from '../services/api';
import { Topic, AudioTrack, Timepoint, CEFRLevel } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import AudioPlayer from '../components/AudioPlayer';

interface TopicNodeMobileProps {
  topic: Topic;
  depth: number;
  expandedPath: string[];
  onToggleExpand: (topicId: string, depth: number, hasChildren: boolean) => void;
  onRefresh: () => Promise<void>;
  onOpenAiModal: (topic: Topic) => void;
  onOpenManualModal: (topic: Topic) => void;
  onOpenAudio: (topic: Topic) => void;
}

const TopicNodeMobile: React.FC<TopicNodeMobileProps> = ({
  topic,
  depth,
  expandedPath,
  onToggleExpand,
  onRefresh,
  onOpenAiModal,
  onOpenManualModal,
  onOpenAudio,
}) => {
  const { language } = useLanguage();
  const [isDeleting, setIsDeleting] = useState(false);

  const children = Array.isArray(topic.children) ? topic.children : [];
  const hasChildren = children.length > 0;

  const isExpanded = expandedPath[depth] === topic.id;

  const handleToggleExpand = () => {
    if (!hasChildren) return;
    onToggleExpand(topic.id, depth, hasChildren);
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await apiService.deleteTopicAndChildren(topic.id);
      await onRefresh();
    } catch (e: any) {
      Alert.alert(
        language === 'tr' ? 'Hata' : 'Error',
        e?.message || (language === 'tr' ? 'Konu silinemedi' : 'Failed to delete topic')
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDelete = () => {
    if (isDeleting) return;
    Alert.alert(
      language === 'tr' ? 'Konuyu Sil' : 'Delete Topic',
      language === 'tr'
        ? `"${topic.title}" konusunu ve tüm alt konularını silmek istediğinizden emin misiniz?`
        : `Are you sure you want to delete "${topic.title}" and all its subtopics?`,
      [
        {
          text: language === 'tr' ? 'İptal' : 'Cancel',
          style: 'cancel',
        },
        {
          text: language === 'tr' ? 'Sil' : 'Delete',
          style: 'destructive',
          onPress: () => {
            handleDelete();
          },
        },
      ]
    );
  };

  const childCount = children.length;
  const hasAudio = !!topic.latest_content?.mp3_url;

  const containerStyle = [
    styles.topicNodeContainer,
    depth > 0 && styles.topicNodeContainerChild,
  ];

  return (
    <View style={containerStyle}>
      <View style={styles.topicCard}>
        <View style={styles.topicLeft}>
          <Text style={styles.topicEmoji}>{depth === 0 ? '📚' : depth === 1 ? '🔹' : '📝'}</Text>
          <View style={styles.topicTextContainer}>
            <TouchableOpacity onPress={handleToggleExpand} activeOpacity={hasChildren ? 0.7 : 1}>
              <Text style={styles.topicTitle}>{topic.title}</Text>
              {topic.description ? (
                <Text style={styles.topicDescription}>{topic.description}</Text>
              ) : null}
            </TouchableOpacity>
            <View style={[styles.topicMetaRow, { marginTop: 4 }]}>
              <View style={styles.topicBadge}>
                <Text style={styles.topicBadgeText}>{topic.level || 'B1'}</Text>
              </View>
              <Text style={styles.topicMetaText}>
                {childCount}{' '}
                {language === 'tr' ? 'alt konu' : 'subtopics'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 4,
          marginLeft: 8,
          marginRight: 4,
        }}
      >
        {hasAudio && (
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: '#2563EB',
              alignItems: 'center',
              marginRight: 6,
            }}
            onPress={() => onOpenAudio(topic)}
          >
            <Text
              style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {language === 'tr' ? 'Dinle' : 'Listen'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={{
            paddingVertical: 8,
            paddingHorizontal: 10,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: '#D1D5DB',
            marginRight: 6,
          }}
          onPress={() => onOpenAiModal(topic)}
        >
          <Text
            style={{ fontSize: 11, color: '#111827' }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {language === 'tr' ? 'Alt Konu Öner' : 'Suggest Subtopics'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            paddingVertical: 8,
            paddingHorizontal: 10,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: '#D1D5DB',
            marginRight: 6,
          }}
          onPress={() => onOpenManualModal(topic)}
        >
          <Text
            style={{ fontSize: 11, color: '#111827' }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {language === 'tr' ? 'Manuel Ekle' : 'Add Manual'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            paddingVertical: 8,
            paddingHorizontal: 10,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: '#FCA5A5',
          }}
          onPress={confirmDelete}
          disabled={isDeleting}
        >
          <Text
            style={{ fontSize: 11, color: '#B91C1C' }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {isDeleting
              ? language === 'tr'
                ? 'Siliniyor...'
                : 'Deleting...'
              : language === 'tr'
              ? 'Sil'
              : 'Delete'}
          </Text>
        </TouchableOpacity>
      </View>

      {isExpanded && hasChildren && (
        <View style={{ marginTop: 4, paddingLeft: 8 }}>
          {children.map((child) => (
            <TopicNodeMobile
              key={child.id}
              topic={child}
              depth={depth + 1}
              expandedPath={expandedPath}
              onToggleExpand={onToggleExpand}
              onRefresh={onRefresh}
              onOpenAiModal={onOpenAiModal}
              onOpenManualModal={onOpenManualModal}
              onOpenAudio={onOpenAudio}
            />
          ))}
        </View>
      )}
    </View>
  );
};

interface SubtopicModalMobileProps {
  visible: boolean;
  onClose: () => void;
  parentTitle: string;
  isLoading: boolean;
  onGenerate: (params: { count: number; language: string; angle?: string }) => Promise<void> | void;
}

const SubtopicModalMobile: React.FC<SubtopicModalMobileProps> = ({
  visible,
  onClose,
  parentTitle,
  isLoading,
  onGenerate,
}) => {
  const { language } = useLanguage();
  const [countText, setCountText] = useState('5');
  const [selectedCount, setSelectedCount] = useState(5);
  const [selectedLanguage, setSelectedLanguage] = useState<'Turkish' | 'English'>(
    language === 'tr' ? 'Turkish' : 'English'
  );
  const [angle, setAngle] = useState('');

  useEffect(() => {
    if (visible) {
      setSelectedLanguage(language === 'tr' ? 'Turkish' : 'English');
    }
  }, [visible, language]);

  if (!visible) return null;

  const handlePresetPress = (value: number) => {
    setSelectedCount(value);
    setCountText(String(value));
  };

  const handleSubmit = async () => {
    if (isLoading) return;
    const parsed = parseInt(countText || '0', 10);
    const safeCount = !parsed || parsed <= 0 ? selectedCount || 5 : parsed;
    await onGenerate({
      count: safeCount,
      language: selectedLanguage,
      angle: angle.trim() || undefined,
    });
  };

  const titleLabel = language === 'tr' ? 'AI ile Alt Konu Oluştur' : 'Create AI Subtopics';
  const countLabel = language === 'tr' ? 'Kaç adet alt konu oluşturulsun?' : 'How many subtopics?';
  const manualCountLabel = language === 'tr' ? 'Veya kendi sayını gir' : 'Or enter your own count';
  const languageLabel = language === 'tr' ? 'Alt konu dili' : 'Subtopic language';
  const angleLabel = language === 'tr' ? 'Açı/Açıklama' : 'Angle/Description';
  const cancelText = language === 'tr' ? 'İptal' : 'Cancel';
  const submitText = language === 'tr' ? 'Oluştur' : 'Generate';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{titleLabel}</Text>
          <Text style={styles.modalSubtitle}>{parentTitle}</Text>

          <View style={{ marginTop: 12 }}>
            <Text style={styles.modalLabel}>{countLabel}</Text>
            <View style={styles.modalChipRow}>
              {[5, 10, 20].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.modalChip,
                    selectedCount === num && styles.modalChipActive,
                  ]}
                  onPress={() => handlePresetPress(num)}
                  disabled={isLoading}
                >
                  <Text
                    style={[
                      styles.modalChipText,
                      selectedCount === num && styles.modalChipTextActive,
                    ]}
                  >
                    {num}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalLabel, { marginTop: 8 }]}>{manualCountLabel}</Text>
            <TextInput
              value={countText}
              onChangeText={setCountText}
              keyboardType="number-pad"
              style={styles.modalInput}
              editable={!isLoading}
            />
          </View>

          <View style={{ marginTop: 12 }}>
            <Text style={styles.modalLabel}>{languageLabel}</Text>
            <View style={styles.modalChipRow}>
              {(['Turkish', 'English'] as const).map((langKey) => (
                <TouchableOpacity
                  key={langKey}
                  style={[
                    styles.modalChip,
                    selectedLanguage === langKey && styles.modalChipActive,
                  ]}
                  onPress={() => setSelectedLanguage(langKey)}
                  disabled={isLoading}
                >
                  <Text
                    style={[
                      styles.modalChipText,
                      selectedLanguage === langKey && styles.modalChipTextActive,
                    ]}
                  >
                    {langKey === 'Turkish'
                      ? language === 'tr'
                        ? 'Türkçe'
                        : 'Turkish'
                      : language === 'tr'
                      ? 'İngilizce'
                      : 'English'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ marginTop: 12 }}>
            <Text style={styles.modalLabel}>{angleLabel}</Text>
            <TextInput
              value={angle}
              onChangeText={setAngle}
              style={styles.modalTextarea}
              editable={!isLoading}
              multiline
            />
          </View>

          <View style={styles.modalButtonRow}>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.modalButtonText}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonPrimary]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading && (
                <ActivityIndicator color="#FFFFFF" style={{ marginRight: 6 }} />
              )}
              <Text style={styles.modalButtonTextPrimary}>{submitText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

interface ManualSubtopicModalMobileProps {
  visible: boolean;
  onClose: () => void;
  parentTitle: string;
  isSubmitting: boolean;
  onAdd: (title: string, description?: string) => Promise<void> | void;
}

const ManualSubtopicModalMobile: React.FC<ManualSubtopicModalMobileProps> = ({
  visible,
  onClose,
  parentTitle,
  isSubmitting,
  onAdd,
}) => {
  const { language } = useLanguage();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  if (!visible) return null;

  const handleSubmit = async () => {
    if (isSubmitting) return;
    const trimmed = title.trim();
    if (!trimmed) return;
    await onAdd(trimmed, description.trim() || undefined);
    setTitle('');
    setDescription('');
  };

  const modalTitle = language === 'tr' ? 'Manuel Alt Konu Ekle' : 'Add Manual Subtopic';
  const titleLabel = language === 'tr' ? 'Alt Konu Başlığı *' : 'Subtopic Title *';
  const descLabel = language === 'tr' ? 'Açıklama (İsteğe Bağlı)' : 'Description (Optional)';
  const cancelText = language === 'tr' ? 'İptal' : 'Cancel';
  const submitText = language === 'tr' ? 'Ekle' : 'Add';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{modalTitle}</Text>
          <Text style={styles.modalSubtitle}>{parentTitle}</Text>

          <View style={{ marginTop: 12 }}>
            <Text style={styles.modalLabel}>{titleLabel}</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              style={styles.modalInput}
              editable={!isSubmitting}
              maxLength={200}
            />
          </View>

          <View style={{ marginTop: 12 }}>
            <Text style={styles.modalLabel}>{descLabel}</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              style={styles.modalTextarea}
              editable={!isSubmitting}
              multiline
              maxLength={500}
            />
            <Text style={styles.modalCounter}>{description.length}/500</Text>
          </View>

          <View style={styles.modalButtonRow}>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={styles.modalButtonText}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonPrimary]}
              onPress={handleSubmit}
              disabled={isSubmitting || !title.trim()}
            >
              {isSubmitting && (
                <ActivityIndicator color="#FFFFFF" style={{ marginRight: 6 }} />
              )}
              <Text style={styles.modalButtonTextPrimary}>{submitText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

interface TopicTreeSectionProps {
  initialLevel?: CEFRLevel;
  selectedVoice?: string;
  speakingRate?: number;
  embedded?: boolean;
}

const TopicTreeSection: React.FC<TopicTreeSectionProps> = ({
  initialLevel = 'B1',
  selectedVoice,
  speakingRate,
  embedded = false,
}) => {
  const { t, language } = useLanguage();
  const navigation = useNavigation();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mainTitle, setMainTitle] = useState('');
  const [mainDescription, setMainDescription] = useState('');
  const [showDescription, setShowDescription] = useState(false);
  const [isCreatingMain, setIsCreatingMain] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel>(initialLevel);
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiModalTopic, setAiModalTopic] = useState<Topic | null>(null);
  const [aiModalLoading, setAiModalLoading] = useState(false);

  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [manualModalTopic, setManualModalTopic] = useState<Topic | null>(null);
  const [manualModalSubmitting, setManualModalSubmitting] = useState(false);

  const [audioModalVisible, setAudioModalVisible] = useState(false);
  const [audioTrack, setAudioTrack] = useState<AudioTrack | null>(null);
  const [audioTimepoints, setAudioTimepoints] = useState<Timepoint[]>([]);
  const [audioWords, setAudioWords] = useState<string[]>([]);
  const [audioLoading, setAudioLoading] = useState(false);
  const [globalCreateLoading, setGlobalCreateLoading] = useState(false);
  const [expandedPath, setExpandedPath] = useState<string[]>([]);
  const [comboPathsByRoot, setComboPathsByRoot] = useState<Record<string, string[]>>({});
  const [selectedRootIdForActions, setSelectedRootIdForActions] = useState<string | null>(null);
  const [comboPickerVisible, setComboPickerVisible] = useState(false);
  const [comboPickerRootId, setComboPickerRootId] = useState<string | null>(null);
  const [comboPickerDepth, setComboPickerDepth] = useState<number>(0);
  const [comboPickerOptions, setComboPickerOptions] = useState<Topic[]>([]);

  const loadTopicTree = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.getTopicTree();
      if (response.success && response.data) {
        setTopics(response.data.topics || []);
      } else {
        setTopics([]);
      }
    } catch (e: any) {
      setError(e?.message || (language === 'tr' ? 'Konular yüklenemedi' : 'Failed to load topics'));
      setTopics([]);
    } finally {
      setIsLoading(false);
    }
  }, [language]);

  useFocusEffect(
    useCallback(() => {
      loadTopicTree();
      return () => {};
    }, [loadTopicTree])
  );

  const handleRefresh = () => {
    loadTopicTree();
  };

  const handleDeleteRootTopic = (root: Topic) => {
    Alert.alert(
      language === 'tr' ? 'Konuyu Sil' : 'Delete Topic',
      language === 'tr'
        ? `"${root.title}" ana konusunu ve tüm alt konularını silmek istediğinizden emin misiniz?`
        : `Are you sure you want to delete the main topic "${root.title}" and all its subtopics?`,
      [
        {
          text: language === 'tr' ? 'İptal' : 'Cancel',
          style: 'cancel',
        },
        {
          text: language === 'tr' ? 'Sil' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteTopicAndChildren(root.id);
              setComboPathsByRoot((prev) => {
                if (!prev[root.id]) return prev;
                const next = { ...prev } as Record<string, string[]>;
                delete next[root.id];
                return next;
              });
              await loadTopicTree();
            } catch (e: any) {
              Alert.alert(
                language === 'tr' ? 'Hata' : 'Error',
                e?.message ||
                  (language === 'tr'
                    ? 'Konu silinemedi'
                    : 'Failed to delete topic')
              );
            }
          },
        },
      ]
    );
  };

  const renderLevelSelector = () => {
    const label = language === 'tr' ? 'CEFR Seviyesi' : 'CEFR Level';
    const levels: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

    return (
      <View style={styles.levelSelectorContainer}>
        <Text style={styles.levelSelectorLabel}>{label}</Text>
        <View style={styles.levelSelectorRow}>
          {levels.map((lvl) => {
            const isActive = selectedLevel === lvl;
            return (
              <TouchableOpacity
                key={lvl}
                style={[
                  styles.levelPill,
                  isActive && styles.levelPillActive,
                ]}
                onPress={() => setSelectedLevel(lvl)}
                disabled={isCreatingMain}
              >
                <Text
                  style={[
                    styles.levelPillText,
                    isActive && styles.levelPillTextActive,
                  ]}
                >
                  {lvl}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderInfoCard = () => {
    const title = language === 'tr' ? 'Konu Hiyerarşisi Nedir?' : 'What is Topic Hierarchy?';
    const description =
      language === 'tr'
        ? 'Bir ana konu seç, AI alt konular önersin; istersen manuel ekle. Her seviyeden ses oluştur.'
        : 'Choose a main topic, let AI suggest subtopics, or add your own. Create audio at any level.';

    const bullet1 = language === 'tr' ? 'Sonsuz derinlikte konu ağacı' : 'Infinite-depth topic tree';
    const bullet2 = language === 'tr' ? 'AI destekli alt konular' : 'AI-powered subtopics';
    const bullet3 = language === 'tr' ? 'Her seviyeden ses oluşturma' : 'Create audio at any level';

    return (
      <View style={styles.infoCard}>
        <View style={styles.infoIconContainer}>
          <Text style={styles.infoEmoji}>📚</Text>
        </View>
        <View style={styles.infoTextContainer}>
          <Text style={styles.infoTitle}>{title}</Text>
          <Text style={styles.infoDescription}>{description}</Text>
          <View style={styles.infoBullets}>
            <Text style={styles.infoBullet}>• {bullet1}</Text>
            <Text style={styles.infoBullet}>• {bullet2}</Text>
            <Text style={styles.infoBullet}>• {bullet3}</Text>
          </View>
        </View>
      </View>
    );
  };

  const getCurrentSelectionForActions = (): { rootId: string; topic: Topic; depth: number } | null => {
    let best: { rootId: string; topic: Topic; depth: number } | null = null;

    topics.forEach((root) => {
      const path = comboPathsByRoot[root.id];
      if (path && path.length > 0) {
        let current: Topic | null = root;
        let lastSelected: Topic | null = null;
        let lastDepth = -1;

        for (let i = 0; i < path.length; i += 1) {
          if (!current || !Array.isArray(current.children)) break;
          const next: Topic | null =
            (current.children as Topic[]).find((c) => c.id === path[i]) || null;
          if (!next) break;
          lastSelected = next;
          current = next;
          lastDepth = i;
        }

        if (lastSelected && (best === null || lastDepth > best.depth)) {
          best = { rootId: root.id, topic: lastSelected, depth: lastDepth };
        }
      }
    });

    // Eğer hiçbir combobox seçimi yoksa, kullanıcı tarafından seçilmiş bir ana konuyu kullan.
    if (!best && selectedRootIdForActions) {
      const root = topics.find((t) => t.id === selectedRootIdForActions) || null;
      if (root) {
        best = { rootId: root.id, topic: root, depth: 0 };
      }
    }

    return best;
  };

  const requireSelectionOrAlert = () => {
    const selection = getCurrentSelectionForActions();
    if (!selection) {
      Alert.alert(
        language === 'tr' ? 'Konu seçin' : 'Select topic',
        language === 'tr'
          ? 'Lütfen önce bir konu veya alt konu seçin.'
          : 'Please select a topic or subtopic first.'
      );
      return null;
    }
    return selection;
  };

  const handleGlobalCreateAudio = async () => {
    const selection = requireSelectionOrAlert();
    if (!selection) return;

    const { topic } = selection;
    const subject = topic.description
      ? `${topic.title}: ${topic.description}`
      : topic.title;

    const levelLabel = (selectedLevel || topic.level || initialLevel || 'B1')
      .toString()
      .toUpperCase();

    try {
      setGlobalCreateLoading(true);

      const res = await apiService.generateTopicNarrationFromSubject(subject, levelLabel);

      if (!res || res.success === false || !res.data) {
        const message =
          (res as any)?.message ||
          (language === 'tr'
            ? 'Metin oluşturulamadı.'
            : 'Text could not be generated.');
        Alert.alert(language === 'tr' ? 'Hata' : 'Error', message);
        return;
      }

      const data: any = res.data;
      const longTextRaw = data.translated_text || data.adapted_text || '';
      const longText = (longTextRaw || '').toString();

      if (!longText.trim()) {
        Alert.alert(
          language === 'tr' ? 'Hata' : 'Error',
          language === 'tr'
            ? 'Bu konu için metin üretilemedi.'
            : 'No text could be generated for this topic.'
        );
        return;
      }

      (navigation as any).navigate('Main', {
        screen: 'Create',
        params: {
          mode: 'text',
          initialText: longText,
          topicId: topic.id,
          topicLevel: levelLabel,
        },
      });
    } catch (e: any) {
      Alert.alert(
        language === 'tr' ? 'Hata' : 'Error',
        e?.message ||
          (language === 'tr'
            ? 'Metin oluşturulamadı.'
            : 'Text could not be generated.')
      );
    } finally {
      setGlobalCreateLoading(false);
    }
  };

  const handleGlobalAiSuggest = () => {
    const selection = requireSelectionOrAlert();
    if (!selection) return;
    handleOpenAiModal(selection.topic);
  };

  const handleGlobalManualAdd = () => {
    const selection = requireSelectionOrAlert();
    if (!selection) return;
    handleOpenManualModal(selection.topic);
  };

  const handleGlobalDelete = () => {
    const selection = requireSelectionOrAlert();
    if (!selection) return;

    const { topic, rootId } = selection;

    Alert.alert(
      language === 'tr' ? 'Konuyu Sil' : 'Delete Topic',
      language === 'tr'
        ? `"${topic.title}" konusunu ve tüm alt konularını silmek istediğinizden emin misiniz?`
        : `Are you sure you want to delete "${topic.title}" and all its subtopics?`,
      [
        {
          text: language === 'tr' ? 'İptal' : 'Cancel',
          style: 'cancel',
        },
        {
          text: language === 'tr' ? 'Sil' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteTopicAndChildren(topic.id);
              setComboPathsByRoot((prev) => {
                const path = prev[rootId];
                if (!path) return prev;
                const index = path.indexOf(topic.id);
                if (index === -1) return prev;
                return { ...prev, [rootId]: path.slice(0, index) };
              });
              await loadTopicTree();
            } catch (e: any) {
              Alert.alert(
                language === 'tr' ? 'Hata' : 'Error',
                e?.message ||
                  (language === 'tr'
                    ? 'Konu silinemedi'
                    : 'Failed to delete topic')
              );
            }
          },
        },
      ]
    );
  };

  const buildComboLevelsForRoot = (root: Topic) => {
    const levels: { depth: number; options: Topic[]; selectedId?: string }[] = [];
    let current: Topic | null = root;
    let depth = 0;
    const path = comboPathsByRoot[root.id] || [];

    while (current && Array.isArray(current.children) && current.children.length > 0) {
      const options = current.children as Topic[];
      const savedId = path[depth];
      const selectedId = savedId && options.some((o) => o.id === savedId) ? savedId : undefined;

      levels.push({ depth, options, selectedId });

      if (!selectedId) {
        break;
      }

      const nextParent = options.find((o) => o.id === selectedId) || null;
      if (!nextParent) {
        break;
      }

      current = nextParent;
      depth += 1;
    }

    return levels;
  };

  const renderComboSelectors = () => {
    if (!topics || topics.length === 0) return null;
    return (
      <View style={styles.comboSection}>
        {topics.map((root) => {
          const hasChildren = Array.isArray(root.children) && root.children.length > 0;

          // Eğer henüz alt konusu yoksa bile ana konuyu göster ve kullanıcıya
          // buradan AI ile alt konu seçme imkanı ver.
          if (!hasChildren) {
            return (
              <View key={root.id} style={{ marginBottom: 16 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                  }}
                >
                  <TouchableOpacity
                    style={[
                      styles.rootSelectCard,
                      selectedRootIdForActions === root.id && styles.rootSelectCardSelected,
                    ]}
                    activeOpacity={0.8}
                    onPress={() =>
                      setSelectedRootIdForActions((prev) => (prev === root.id ? null : root.id))
                    }
                  >
                    <Text style={styles.headerTitle}>{root.title}</Text>
                  </TouchableOpacity>
                </View>

                {root.description ? (
                  <Text style={styles.infoDescription}>{root.description}</Text>
                ) : null}
              </View>
            );
          }

          const levels = buildComboLevelsForRoot(root);
          if (levels.length === 0) return null;

          const pathForRoot = comboPathsByRoot[root.id] || [];

          return (
            <View key={root.id} style={{ marginBottom: 16 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  marginBottom: 4,
                }}
              >
                <TouchableOpacity
                  style={[
                    styles.rootSelectCard,
                    selectedRootIdForActions === root.id && styles.rootSelectCardSelected,
                  ]}
                  activeOpacity={0.8}
                  onPress={() =>
                    setSelectedRootIdForActions((prev) => (prev === root.id ? null : root.id))
                  }
                >
                  <Text style={styles.headerTitle}>{root.title}</Text>
                </TouchableOpacity>
              </View>

              {root.description ? (
                <Text style={styles.infoDescription}>{root.description}</Text>
              ) : null}

              {levels.map((level) => {
                const selectedId = pathForRoot[level.depth];
                const selectedTopic = selectedId
                  ? level.options.find((o) => o.id === selectedId)
                  : undefined;

                const label = language === 'tr'
                  ? `Seviye ${level.depth + 1} alt konu`
                  : `Level ${level.depth + 1} subtopic`;
                const placeholder = language === 'tr' ? 'Alt konu seç' : 'Select subtopic';

                return (
                  <View key={`${root.id}-${level.depth}`} style={styles.comboBox}>
                    <Text style={styles.comboLabel}>{label}</Text>
                    <TouchableOpacity
                      style={[
                        styles.comboOption,
                        selectedTopic && styles.comboOptionSelected,
                      ]}
                      activeOpacity={0.85}
                      onPress={() => openComboPicker(root.id, level.depth, level.options)}
                    >
                      <Text
                        style={styles.comboOptionTitle}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        {selectedTopic?.title || placeholder}
                      </Text>
                      {selectedTopic?.description ? (
                        <Text
                          style={styles.comboOptionDescription}
                          numberOfLines={3}
                          ellipsizeMode="tail"
                        >
                          {selectedTopic.description}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>
    );
  };

  const handleOpenAiModal = (topic: Topic) => {
    setAiModalTopic(topic);
    setAiModalVisible(true);
  };

  const handleCloseAiModal = () => {
    setAiModalVisible(false);
    setAiModalTopic(null);
  };

  const handleGenerateSubtopicsModal = async (params: {
    count: number;
    language: string;
    angle?: string;
  }) => {
    if (!aiModalTopic) return;
    try {
      setAiModalLoading(true);
      await apiService.generateSubtopics(aiModalTopic.id, {
        count: params.count,
        language: params.language,
        angle: params.angle,
      });
      await loadTopicTree();
      handleCloseAiModal();
    } catch (e: any) {
      Alert.alert(
        language === 'tr' ? 'Hata' : 'Error',
        e?.message ||
          (language === 'tr'
            ? 'Alt konular oluşturulurken hata oluştu'
            : 'Failed to generate subtopics')
      );
    } finally {
      setAiModalLoading(false);
    }
  };

  const handleOpenManualModal = (topic: Topic) => {
    setManualModalTopic(topic);
    setManualModalVisible(true);
  };

  const handleCloseManualModal = () => {
    setManualModalVisible(false);
    setManualModalTopic(null);
  };

  const handleAddManualSubtopicModal = async (title: string, description?: string) => {
    if (!manualModalTopic) return;
    try {
      setManualModalSubmitting(true);
      await apiService.addManualSubtopic(manualModalTopic.id, { title, description });
      await loadTopicTree();
      handleCloseManualModal();
    } catch (e: any) {
      Alert.alert(
        language === 'tr' ? 'Hata' : 'Error',
        e?.message || (language === 'tr' ? 'Alt konu eklenemedi' : 'Failed to add subtopic')
      );
    } finally {
      setManualModalSubmitting(false);
    }
  };

  const buildAudioTrackFromTopic = (
    topic: Topic
  ): { track: AudioTrack; tps: Timepoint[]; words: string[] } | null => {
    const content = topic.latest_content;
    if (!content || !content.mp3_url) return null;

    let rawTimepoints: any = content.timepoints;
    try {
      if (typeof rawTimepoints === 'string') {
        rawTimepoints = JSON.parse(rawTimepoints);
      }
    } catch {}
    const safeTimepoints: Timepoint[] = Array.isArray(rawTimepoints)
      ? (rawTimepoints as Timepoint[])
      : [];

    const safeWords: string[] = Array.isArray(content.words)
      ? (content.words as string[])
      : [];

    const levelStr = (content.level || topic.level || 'B1') as CEFRLevel;
    const durationSeconds =
      typeof content.duration_seconds === 'number' && content.duration_seconds > 0
        ? content.duration_seconds
        : 180;

    const createdAt = content.created_at || topic.created_at || new Date().toISOString();

    const track: AudioTrack = {
      id: content.id,
      title: topic.title,
      url: content.mp3_url,
      level: levelStr,
      duration: durationSeconds,
      created_at: createdAt,
      input_type: 'topic',
      translated_text: content.translated_text || undefined,
      adapted_text: content.adapted_text || undefined,
      // Topic flow için backend'te translated_text Türkçe uzun metni tutuyor.
      // text_content ise genellikle noktalama temizlenmiş İngilizce metin.
      // Original Text sekmesinde Türkçe görünmesi için önce translated_text'i kullan.
      original_turkish:
        (content.translated_text as string | null) ||
        (content.text_content as string | null) ||
        topic.description ||
        topic.title,
      mp3_url: content.mp3_url,
      timepoints: safeTimepoints,
      words: safeWords,
    };

    return { track, tps: safeTimepoints, words: safeWords };
  };

  const handleOpenAudioForTopic = async (topic: Topic) => {
    const existing = buildAudioTrackFromTopic(topic);
    if (existing) {
      setAudioTrack(existing.track);
      setAudioTimepoints(existing.tps);
      setAudioWords(existing.words);
      setAudioModalVisible(true);
      return;
    }

    try {
      setAudioLoading(true);
      const payload =
        selectedVoice || typeof speakingRate === 'number'
          ? {
              voice: selectedVoice,
              speaking_rate:
                typeof speakingRate === 'number' && Number.isFinite(speakingRate)
                  ? speakingRate
                  : undefined,
            }
          : undefined;

      const res = await apiService.createContentFromTopic(topic.id, payload);
      if (res && res.success && res.data && res.data.topic) {
        const updated = buildAudioTrackFromTopic(res.data.topic);
        if (updated) {
          setAudioTrack(updated.track);
          setAudioTimepoints(updated.tps);
          setAudioWords(updated.words);
          setAudioModalVisible(true);
          await loadTopicTree();
        } else {
          Alert.alert(
            language === 'tr' ? 'Hata' : 'Error',
            language === 'tr'
              ? 'Ses oluşturulamadı.'
              : 'Audio could not be created.'
          );
        }
      } else {
        const message = (res as any)?.message;
        Alert.alert(
          language === 'tr' ? 'Hata' : 'Error',
          message || (language === 'tr' ? 'Ses oluşturulamadı.' : 'Audio could not be created.')
        );
      }
    } catch (e: any) {
      Alert.alert(
        language === 'tr' ? 'Hata' : 'Error',
        e?.message || (language === 'tr' ? 'Ses oluşturulamadı.' : 'Audio could not be created.')
      );
    } finally {
      setAudioLoading(false);
    }
  };

  const handleCloseAudioPlayer = async () => {
    setAudioModalVisible(false);
    const mp3Url = audioTrack?.mp3_url || audioTrack?.url;
    if (mp3Url) {
      try {
        await apiService.markTopicAudioListened(mp3Url);
        await loadTopicTree();
      } catch {
        // sessiz geç
      }
    }
    setAudioTrack(null);
    setAudioTimepoints([]);
    setAudioWords([]);
  };

  const handleToggleExpandNode = (topicId: string, depth: number, hasChildren: boolean) => {
    if (!hasChildren) return;
    setExpandedPath((prev) => {
      const isAlreadyExpanded = prev[depth] === topicId;
      if (isAlreadyExpanded) {
        // Collapse this level and anything deeper
        return prev.slice(0, depth);
      }

      const next = prev.slice(0, depth);
      next[depth] = topicId;
      return next;
    });
  };

  const handleSelectComboTopic = (rootId: string, depth: number, topicId: string) => {
    setComboPathsByRoot((prev) => {
      const currentPath = prev[rootId] || [];
      const nextPath = currentPath.slice(0, depth);
      nextPath[depth] = topicId;
      return { ...prev, [rootId]: nextPath };
    });
  };

  const openComboPicker = (rootId: string, depth: number, options: Topic[]) => {
    setComboPickerRootId(rootId);
    setComboPickerDepth(depth);
    setComboPickerOptions(options);
    setComboPickerVisible(true);
  };

  const closeComboPicker = () => {
    setComboPickerVisible(false);
  };

  const handleCreateMainTopic = async () => {
    const trimmedTitle = mainTitle.trim();
    if (!trimmedTitle) {
      return;
    }

    const levelLabel = selectedLevel || initialLevel || 'B1';

    try {
      setIsCreatingMain(true);
      setError(null);
      await apiService.createMainTopic({
        title: trimmedTitle,
        description: mainDescription.trim() || undefined,
        level: levelLabel,
      });
      setMainTitle('');
      setMainDescription('');
      setShowDescription(false);
      await loadTopicTree();
    } catch (e: any) {
      setError(
        e?.message ||
          (language === 'tr'
            ? 'Ana konu oluşturulamadı'
            : 'Failed to create main topic')
      );
    } finally {
      setIsCreatingMain(false);
    }
  };

  const renderMainTopicForm = () => {
    const levelLabel = selectedLevel;

    const titleLabel = language === 'tr' ? '📚 Ana Konu Başlığı' : '📚 Main Topic Title';
    const titlePlaceholder =
      language === 'tr'
        ? 'Örn: Osmanlı Devleti, Bilim Tarihi, Sanat Akımları...'
        : 'e.g. Ottoman Empire, History of Science, Art Movements...';
    const descLabel = language === 'tr' ? '📝 Açıklama (İsteğe Bağlı)' : '📝 Description (Optional)';
    const addDescText = language === 'tr' ? 'Açıklama ekle' : 'Add description';
    const removeDescText = language === 'tr' ? 'Açıklamayı kaldır' : 'Remove description';
    const levelTextLabel = language === 'tr' ? 'Seviye:' : 'Level:';
    const levelInfo =
      language === 'tr'
        ? 'Alt konular bu seviyede oluşturulacak'
        : 'Subtopics will be created at this level';
    const buttonLabel = isCreatingMain
      ? language === 'tr'
        ? 'Oluşturuluyor...'
        : 'Creating...'
      : language === 'tr'
      ? 'Ana Konu Oluştur'
      : 'Create Main Topic';

    const isDisabled = isCreatingMain || !mainTitle.trim();

    return (
      <View style={styles.mainFormCard}>
        <Text style={styles.mainFormLabel}>{titleLabel}</Text>
        <TextInput
          value={mainTitle}
          onChangeText={setMainTitle}
          placeholder={titlePlaceholder}
          style={styles.mainFormInput}
          editable={!isCreatingMain}
        />

        {showDescription ? (
          <View style={styles.mainFormDescBlock}>
            <Text style={styles.mainFormLabel}>{descLabel}</Text>
            <TextInput
              value={mainDescription}
              onChangeText={setMainDescription}
              placeholder={
                language === 'tr'
                  ? 'Konu hakkında kısa bir açıklama yazabilirsiniz...'
                  : 'You can write a short description about the topic...'
              }
              style={[styles.mainFormInput, styles.mainFormTextarea]}
              editable={!isCreatingMain}
              multiline
            />
            <TouchableOpacity
              onPress={() => {
                setShowDescription(false);
                setMainDescription('');
              }}
              disabled={isCreatingMain}
            >
              <Text style={styles.mainFormToggleDescText}>{removeDescText}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setShowDescription(true)} disabled={isCreatingMain}>
            <Text style={styles.mainFormToggleDescText}>{addDescText}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.mainFormLevelRow}>
          <View style={styles.mainFormLevelLeft}>
            <Text style={styles.mainFormLevelIcon}>🎯</Text>
            <Text style={styles.mainFormLevelText}>
              {levelTextLabel}{' '}
              <Text style={styles.mainFormLevelValue}>{levelLabel}</Text>
            </Text>
          </View>
          <Text style={styles.mainFormLevelInfo}>{levelInfo}</Text>
        </View>

        <TouchableOpacity
          style={[styles.mainFormButton, isDisabled && styles.mainFormButtonDisabled]}
          onPress={handleCreateMainTopic}
          disabled={isDisabled}
        >
          {isCreatingMain && <ActivityIndicator color="#FFFFFF" style={{ marginRight: 8 }} />}
          <Text style={styles.mainFormButtonText}>{buttonLabel}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => {
    const title = language === 'tr' ? 'Henüz konu oluşturmadınız' : 'You have not created any topics yet';
    const subtitle =
      language === 'tr'
        ? 'Yukarıdan bir ana konu oluşturarak başlayın.'
        : 'Start by creating a main topic above.';

    return (
      <View style={styles.emptyStateContainer}>
        <Text style={styles.emptyStateIcon}>📂</Text>
        <Text style={styles.emptyStateTitle}>{title}</Text>
        <Text style={styles.emptyStateSubtitle}>{subtitle}</Text>
      </View>
    );
  };

  const renderHeaderRow = () => {
    const title = language === 'tr' ? 'Konu Ağacınız' : 'Your Topic Tree';
    const refreshText = language === 'tr' ? 'Yenile' : 'Refresh';

    return (
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>{title}</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          <Text style={styles.refreshText}>{refreshText}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderTopicItem = ({ item }: { item: Topic }) => {
    return (
      <TopicNodeMobile
        topic={item}
        depth={0}
        expandedPath={expandedPath}
        onToggleExpand={handleToggleExpandNode}
        onRefresh={loadTopicTree}
        onOpenAiModal={handleOpenAiModal}
        onOpenManualModal={handleOpenManualModal}
        onOpenAudio={handleOpenAudioForTopic}
      />
    );
  };

  const showLoading = isLoading && topics.length === 0;

  const currentSelection = getCurrentSelectionForActions();
  const selectedTopicForActions = currentSelection?.topic || null;
  const hasExistingAudioForSelection =
    !!selectedTopicForActions?.latest_content?.mp3_url;

  const content = (
    <>
      {renderLevelSelector()}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {renderMainTopicForm()}

      {renderHeaderRow()}

      {renderComboSelectors()}

      {showLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}

      {!showLoading && topics.length === 0 && renderEmptyState()}
    </>
  );

  const renderGlobalActionsSection = () => (
    <>
      {selectedTopicForActions && hasExistingAudioForSelection && (
        <View style={{ marginTop: 4, marginHorizontal: 8 }}>
          <TouchableOpacity
            style={styles.listenButton}
            onPress={() => handleOpenAudioForTopic(selectedTopicForActions)}
            disabled={audioLoading}
          >
            <Text style={styles.listenButtonText}>
              {language === 'tr' ? 'Sesi Dinle' : 'Listen Audio'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Global action buttons for current selection */}
      <View style={styles.globalActionsContainer}>
        <View style={styles.globalActionsRow}>
          <TouchableOpacity
            style={[styles.globalActionButton, styles.globalActionPrimary, globalCreateLoading && styles.globalActionButtonDisabled]}
            onPress={handleGlobalCreateAudio}
            disabled={globalCreateLoading}
          >
            {globalCreateLoading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.globalActionTextPrimary}>
                  {language === 'tr' ? 'Metin hazırlanıyor...' : 'Preparing text...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.globalActionTextPrimary}>
                {language === 'tr' ? 'Ses Oluştur' : 'Create Audio'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.globalActionButton}
            onPress={handleGlobalAiSuggest}
          >
            <Text style={styles.globalActionText}>
              {language === 'tr' ? 'Alt Konu Öner' : 'Suggest Subtopics'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.globalActionsRow}>
          <TouchableOpacity
            style={styles.globalActionButton}
            onPress={handleGlobalManualAdd}
          >
            <Text style={styles.globalActionText}>
              {language === 'tr' ? 'Manuel Ekle' : 'Add Manual'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.globalActionButtonDanger}
            onPress={handleGlobalDelete}
          >
            <Text style={styles.globalActionTextDanger}>
              {language === 'tr' ? 'Sil' : 'Delete'}
            </Text>
          </TouchableOpacity>
        </View>

        {globalCreateLoading && (
          <Text style={styles.globalActionHelperText}>
            {language === 'tr'
              ? 'Seçilen konu için uzun metin üretiliyor, işlem bittiğinde Create ekranına yönlendirileceksiniz.'
              : 'Generating long text for the selected topic; you will be redirected to the Create screen once it is ready.'}
          </Text>
        )}
      </View>

      {/* Combobox picker modal: shows options for the tapped level */}
      <Modal
        visible={comboPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={closeComboPicker}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: '75%' }]}>
            <Text style={styles.modalTitle}>
              {language === 'tr' ? 'Alt konu seç' : 'Select subtopic'}
            </Text>
            <ScrollView style={{ marginTop: 8 }}>
              {comboPickerOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={styles.comboOption}
                  onPress={() => {
                    if (!comboPickerRootId) return;
                    handleSelectComboTopic(comboPickerRootId, comboPickerDepth, opt.id);
                    closeComboPicker();
                  }}
                >
                  <Text
                    style={styles.comboOptionTitle}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {opt.title}
                  </Text>
                  {opt.description ? (
                    <Text
                      style={styles.comboOptionDescription}
                      numberOfLines={3}
                      ellipsizeMode="tail"
                    >
                      {opt.description}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalButton, { marginTop: 12 }]}
              onPress={closeComboPicker}
            >
              <Text style={styles.modalButtonText}>
                {language === 'tr' ? 'Kapat' : 'Close'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <SubtopicModalMobile
        visible={aiModalVisible}
        onClose={handleCloseAiModal}
        parentTitle={aiModalTopic?.title || ''}
        isLoading={aiModalLoading}
        onGenerate={handleGenerateSubtopicsModal}
      />

      <ManualSubtopicModalMobile
        visible={manualModalVisible}
        onClose={handleCloseManualModal}
        parentTitle={manualModalTopic?.title || ''}
        isSubmitting={manualModalSubmitting}
        onAdd={handleAddManualSubtopicModal}
      />

      {audioTrack && (
        <AudioPlayer
          track={audioTrack}
          visible={audioModalVisible}
          onClose={handleCloseAudioPlayer}
          timepoints={audioTimepoints}
          words={audioWords}
          initialHighlightMode="word"
        />
      )}
    </>
  );

  if (embedded) {
    return (
      <View>
        {content}
        {renderGlobalActionsSection()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          style={{ flex: 1 }}
        >
          {content}
        </ScrollView>
      </View>
      {renderGlobalActionsSection()}
    </View>
  );
};

interface TopicTreeScreenProps {}

const TopicTreeScreen: React.FC<TopicTreeScreenProps> = () => {
  return <TopicTreeSection />;
};

export { TopicTreeSection };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
    marginBottom: 16,
  },
  infoIconContainer: {
    marginRight: 12,
    justifyContent: 'flex-start',
  },
  infoEmoji: {
    fontSize: 28,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 13,
    color: '#1F2933',
    marginBottom: 8,
  },
  infoBullets: {
    gap: 2,
  },
  infoBullet: {
    fontSize: 12,
    color: '#1F2933',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  refreshButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  refreshText: {
    fontSize: 12,
    color: '#111827',
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  emptyStateSubtitle: {
    fontSize: 13,
    color: '#4B5563',
    textAlign: 'center',
  },
  comboSection: {
    marginTop: 8,
    marginBottom: 16,
    gap: 8,
  },
  rootSelectCard: {
    flex: 1,
    marginRight: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  rootSelectCardSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#DBEAFE',
  },
  comboBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 10,
  },
  comboLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  comboOption: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    marginBottom: 6,
    minHeight: 72,
  },
  comboOptionSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#DBEAFE',
  },
  comboOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  comboOptionDescription: {
    fontSize: 12,
    color: '#4B5563',
  },
  topicList: {
    gap: 8,
    paddingBottom: 32,
  },
  topicNodeContainer: {
    marginBottom: 10,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  topicNodeContainerChild: {
    marginTop: 6,
    borderColor: '#E5E7EB',
    paddingLeft: 4,
  },
  topicCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  topicLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  topicEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  topicTextContainer: {
    flex: 1,
  },
  topicTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  topicDescription: {
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 4,
  },
  topicMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topicBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#2563EB',
  },
  topicBadgeText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  topicMetaText: {
    fontSize: 11,
    color: '#6B7280',
  },
  levelSelectorContainer: {
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  levelSelectorLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  levelSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  levelPill: {
    flex: 1,
    marginHorizontal: 2,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelPillActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  levelPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#111827',
  },
  levelPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  errorContainer: {
    marginTop: 8,
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  errorText: {
    fontSize: 12,
    color: '#B91C1C',
  },
  mainFormCard: {
    marginTop: 8,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  mainFormLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 6,
  },
  mainFormInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  mainFormDescBlock: {
    marginTop: 12,
    marginBottom: 4,
  },
  mainFormTextarea: {
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 4,
  },
  mainFormToggleDescText: {
    fontSize: 12,
    color: '#2563EB',
    marginTop: 4,
  },
  mainFormLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 12,
  },
  mainFormLevelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainFormLevelIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  mainFormLevelText: {
    fontSize: 13,
    color: '#374151',
  },
  mainFormLevelValue: {
    fontWeight: '700',
    color: '#2563EB',
  },
  mainFormLevelInfo: {
    fontSize: 11,
    color: '#6B7280',
    maxWidth: '55%',
    textAlign: 'right',
  },
  mainFormButton: {
    marginTop: 4,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainFormButtonDisabled: {
    opacity: 0.5,
  },
  mainFormButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 8,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  modalChipRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  modalChip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  modalChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  modalChipText: {
    fontSize: 12,
    color: '#111827',
  },
  modalChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    marginTop: 4,
  },
  modalTextarea: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    marginTop: 4,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalCounter: {
    marginTop: 4,
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'right',
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 4,
  },
  modalButtonPrimary: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  modalButtonText: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  },
  modalButtonTextPrimary: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  globalActionsContainer: {
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  globalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  globalActionButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  globalActionPrimary: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  globalActionButtonDisabled: {
    opacity: 0.6,
  },
  globalActionButtonDanger: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listenButton: {
    marginTop: 4,
    marginBottom: 4,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listenButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  globalActionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
  },
  globalActionTextPrimary: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  globalActionTextDanger: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B91C1C',
  },
  globalActionHelperText: {
    marginTop: 4,
    marginHorizontal: 8,
    fontSize: 12,
    color: '#4B5563',
  },
});

export default TopicTreeScreen;
