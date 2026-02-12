import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, TextInput, Modal } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { CopilotStep, walkthroughable, useCopilot } from 'react-native-copilot';
import {
  getTopicTree,
  createMainTopic,
  deleteTopicAndChildren,
  generateSubtopics,
  addManualSubtopic,
  generateTopicNarrationFromSubject,
  Topic
} from '../services/topicService';
import { AudioTrack, Timepoint, CEFRLevel, TTSRequest } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import * as ttsService from '../services/ttsService';
import { getUsageSummary } from '../services/subscriptionService';
import AudioPlayer from '../components/AudioPlayer';
import CustomAlert, { CustomAlertButton } from '../components/CustomAlert';
import VoiceSelector, { VoiceSelectionResult } from '../components/VoiceSelector';
import { COLORS } from '../theme/colors';
import { AnalyticsHelper } from '../utils/AnalyticsHelper';
import {
  TourProvider,
  TopicTreeTooltip,
  TOPICTREE_TOUR_STEPS,
  TOPICTREE_TOUR_KEY,
  TOPICTREE_ACTIONS_TOUR_KEY,
  useGuideTour,
  roundedMaskPath,
} from '../components/GuideTour';

const WalkthroughableView = walkthroughable(View);

const TopicTreeScreenContent: React.FC = () => {
  const { language } = useLanguage();
  const lang = language === 'tr' ? 'tr' : 'en';
  const navigation = useNavigation();
  const { user } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);

  // --- Tour control ---
  const { start, copilotEvents } = useCopilot();
  const { shouldShow, markCompleted } = useGuideTour(TOPICTREE_TOUR_KEY);
  const { shouldShow: shouldShowActions, markCompleted: markActionsCompleted } = useGuideTour(TOPICTREE_ACTIONS_TOUR_KEY);
  const startRef = useRef(start);
  startRef.current = start;

  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingNarration, setIsGeneratingNarration] = useState(false);
  const [isTtsJobLocked, setIsTtsJobLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Voice selection from VoiceSelector component
  const [voiceSelection, setVoiceSelection] = useState<VoiceSelectionResult | null>(null);

  // Success modal
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [successEstimatedTime, setSuccessEstimatedTime] = useState('');

  // Creation State
  const [mainTitle, setMainTitle] = useState('');
  const [isCreatingMain, setIsCreatingMain] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel>('B1');

  // Modals
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiModalTopic, setAiModalTopic] = useState<Topic | null>(null);
  const [aiModalLoading, setAiModalLoading] = useState(false);
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [manualModalTopic, setManualModalTopic] = useState<Topic | null>(null);
  const [manualModalLoading, setManualModalLoading] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [aiCount, setAiCount] = useState(5);

  // Audio
  const [audioModalVisible, setAudioModalVisible] = useState(false);
  const [audioTrack, setAudioTrack] = useState<AudioTrack | null>(null);
  const [audioTimepoints, setAudioTimepoints] = useState<Timepoint[]>([]);
  const [audioWords, setAudioWords] = useState<string[]>([]);

  // Cascading Selection Path: [RootID, Level1ID, Level2ID, ...]
  const [activePath, setActivePath] = useState<string[]>([]);

  // Combo Picker
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerDepth, setPickerDepth] = useState(0);
  const [pickerOptions, setPickerOptions] = useState<Topic[]>([]);

  // Custom Alert State
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertButtons, setAlertButtons] = useState<CustomAlertButton[]>([]);
  const [alertIcon, setAlertIcon] = useState<string | undefined>();
  const [alertIconColor, setAlertIconColor] = useState<string | undefined>();

  const showAlert = (title: string, message: string, buttons?: CustomAlertButton[], icon?: string, iconColor?: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertButtons(buttons || [{ text: 'OK', style: 'default' }]);
    setAlertIcon(icon);
    setAlertIconColor(iconColor);
    setAlertVisible(true);
  };

  const loadTopics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getTopicTree();
      if (res.success && res.data) {
        setTopics(res.data.topics || []);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load topics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadTopics();
    AnalyticsHelper.logScreenView('TopicTree', 'TopicTreeScreen');

    // Check for active TTS job on focus (like CreateScreen does)
    const checkActiveJob = async () => {
      try {
        const res = await ttsService.getActiveTtsJob();
        setIsTtsJobLocked(res?.hasActiveJob === true);
      } catch {
        setIsTtsJobLocked(false);
      }
    };
    checkActiveJob();
  }, [loadTopics]));

  // --- Helpers ---
  const getTopicAtPath = (path: string[]): Topic | null => {
    if (path.length === 0 || topics.length === 0) return null;
    let current: Topic | undefined = topics.find(t => t.id === path[0]);
    for (let i = 1; i < path.length && current; i++) {
      current = (current.children as Topic[] | undefined)?.find(c => c.id === path[i]);
    }
    return current || null;
  };

  const buildLevels = () => {
    const levels: { depth: number; options: Topic[]; selectedId?: string }[] = [];
    // Level 0: Roots
    if (topics.length > 0) {
      levels.push({ depth: 0, options: topics, selectedId: activePath[0] });
    }
    // Subsequent levels
    let currentTopic = activePath[0] ? topics.find(t => t.id === activePath[0]) : undefined;
    for (let i = 0; i < activePath.length && currentTopic; i++) {
      const children = (currentTopic.children as Topic[]) || [];
      if (children.length > 0) {
        levels.push({ depth: i + 1, options: children, selectedId: activePath[i + 1] });
      }
      currentTopic = children.find(c => c.id === activePath[i + 1]);
    }
    return levels;
  };

  const handleSelectAtDepth = (depth: number, topicId: string) => {
    setActivePath(prev => [...prev.slice(0, depth), topicId]);
  };

  const openPicker = (depth: number, options: Topic[]) => {
    setPickerDepth(depth);
    setPickerOptions(options);
    setPickerVisible(true);
  };

  const activeTopic = getTopicAtPath(activePath);

  // --- Tour logic ---
  const dataReady = !isLoading;

  // Stop event: mark the correct sub-tour as completed based on shouldShow state
  useEffect(() => {
    const handler = () => {
      // if/else if ensures only one is marked per stop event
      if (shouldShow) markCompleted();
      else if (shouldShowActions) markActionsCompleted();
    };
    copilotEvents.on('stop', handler);
    return () => { copilotEvents.off('stop', handler); };
  }, [copilotEvents, shouldShow, markCompleted, shouldShowActions, markActionsCompleted]);

  // Tour 1: Initial tour — start from step 1 once data is loaded
  useEffect(() => {
    if (shouldShow && dataReady) {
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
        requestAnimationFrame(() => {
          startRef.current(undefined, scrollViewRef.current ?? undefined);
        });
      }, 800);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldShow, dataReady]);

  // Tour 2: Actions tour — start from 'topicTreeActions' step on first topic selection
  const tour2TriggeredRef = useRef(false);
  useEffect(() => {
    if (!shouldShow && shouldShowActions && activeTopic && !tour2TriggeredRef.current) {
      tour2TriggeredRef.current = true;
      const timer = setTimeout(() => {
        requestAnimationFrame(() => {
          startRef.current('topicTreeActions', scrollViewRef.current ?? undefined);
        });
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [activeTopic?.id, shouldShowActions, shouldShow]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Actions ---
  const handleCreateMain = async () => {
    if (!mainTitle.trim() || isCreatingMain) return;
    try {
      setIsCreatingMain(true);
      await createMainTopic({ title: mainTitle.trim(), level: selectedLevel });
      setMainTitle('');
      await loadTopics();
    } catch (e: any) {
      showAlert(
        language === 'tr' ? 'Hata' : 'Error',
        e?.message || (language === 'tr' ? 'Bir hata oluştu' : 'An error occurred'),
        [{ text: 'OK', style: 'default' }],
        'error-outline',
        '#EF4444'
      );
    } finally {
      setIsCreatingMain(false);
    }
  };

  const handleDelete = () => {
    if (!activeTopic) return;
    showAlert(
      language === 'tr' ? 'Konuyu Sil' : 'Delete Topic',
      `"${activeTopic.title}" ${language === 'tr' ? 've tüm alt konuları silinecek. Devam etmek istiyor musunuz?' : 'and all subtopics will be deleted. Do you want to continue?'}`,
      [
        { text: language === 'tr' ? 'İptal' : 'Cancel', style: 'cancel' },
        {
          text: language === 'tr' ? 'Sil' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTopicAndChildren(activeTopic.id);
              setActivePath(prev => prev.slice(0, prev.indexOf(activeTopic.id)));
              await loadTopics();
            } catch (e: any) {
              showAlert(
                language === 'tr' ? 'Hata' : 'Error',
                e?.message,
                [{ text: 'OK', style: 'default' }],
                'error-outline',
                '#EF4444'
              );
            }
          },
        },
      ],
      'delete-outline',
      '#EF4444'
    );
  };

  const handleAiGenerate = async () => {
    if (!aiModalTopic || aiModalLoading) return;
    try {
      setAiModalLoading(true);
      await generateSubtopics(aiModalTopic.id, { count: aiCount, language: language === 'tr' ? 'Turkish' : 'English' });
      await loadTopics();
      setAiModalVisible(false);
    } catch (e: any) {
      showAlert(language === 'tr' ? 'Hata' : 'Error', e?.message, [{ text: 'OK', style: 'default' }], 'error-outline', '#EF4444');
    } finally {
      setAiModalLoading(false);
    }
  };

  const handleManualAdd = async () => {
    if (!manualModalTopic || !manualTitle.trim() || manualModalLoading) return;
    try {
      setManualModalLoading(true);
      await addManualSubtopic(manualModalTopic.id, { title: manualTitle.trim() });
      await loadTopics();
      setManualTitle('');
      setManualModalVisible(false);
    } catch (e: any) {
      showAlert(language === 'tr' ? 'Hata' : 'Error', e?.message, [{ text: 'OK', style: 'default' }], 'error-outline', '#EF4444');
    } finally {
      setManualModalLoading(false);
    }
  };

  const buildAudioTrack = (topic: Topic) => {
    const c = topic.latest_content;
    if (!c?.mp3_url) return null;
    let tp: any = c.timepoints;
    try { if (typeof tp === 'string') tp = JSON.parse(tp); } catch { }
    return {
      track: { id: c.id, title: topic.title, url: c.mp3_url, mp3_url: c.mp3_url, level: (c.level || topic.level || 'B1') as CEFRLevel, duration: c.duration_seconds || 180, created_at: c.created_at || '', input_type: 'topic' as const, timepoints: Array.isArray(tp) ? tp : [], words: Array.isArray(c.words) ? c.words : [] },
      tps: Array.isArray(tp) ? tp : [],
      words: Array.isArray(c.words) ? c.words : [],
    };
  };

  const handleListen = () => {
    if (!activeTopic) return;
    const data = buildAudioTrack(activeTopic);
    if (data) {
      setAudioTrack(data.track);
      setAudioTimepoints(data.tps);
      setAudioWords(data.words);
      setAudioModalVisible(true);
    } else {
      showAlert(
        language === 'tr' ? 'Bilgi' : 'Info',
        language === 'tr' ? 'Bu konuda henüz ses yok.' : 'No audio for this topic yet.',
        [{ text: 'OK', style: 'default' }],
        'info-outline',
        '#3B82F6'
      );
    }
  };

  const handleCreateAudio = async () => {
    if (!activeTopic) return;
    if (isTtsJobLocked) {
      showAlert(
        language === 'tr' ? 'Bilgi' : 'Info',
        language === 'tr'
          ? 'Ses oluşturma süreci devam ediyor. Lütfen mevcut işlemin bitmesini bekleyin.'
          : 'An audio creation process is already running. Please wait for it to finish.',
        [{ text: 'OK', style: 'default' }],
        'info-outline',
        '#3B82F6'
      );
      return;
    }
    if (!voiceSelection?.voiceName) {
      showAlert(
        language === 'tr' ? 'Uyarı' : 'Warning',
        language === 'tr' ? 'Lütfen önce bir ses seçin.' : 'Please select a voice first.',
        [{ text: 'OK', style: 'default' }],
        'warning',
        '#F59E0B'
      );
      return;
    }

    const topicSubject = activeTopic.description
      ? `${activeTopic.title}: ${activeTopic.description}`
      : activeTopic.title || '';
    const lvl = activeTopic.level || selectedLevel;

    setIsGeneratingNarration(true);
    try {
      // Usage limit pre-check
      try {
        const summary = await getUsageSummary();
        const sData = (summary as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
        if (summary?.success && (sData?.isExceeded || sData?.hasPlan === false)) {
          showAlert(
            language === 'tr' ? 'Hata' : 'Error',
            sData?.hasPlan === false
              ? 'Aktif paketiniz yok. Lütfen Apple Store üzerinden paket satın alın.'
              : 'Paket kullanım sınırınız aşıldı. Lütfen paket yükseltin veya sonraki dönemi bekleyin.',
            [
              { text: 'OK', style: 'default' },
              {
                text: language === 'tr' ? 'Paket Al' : 'Get Package',
                style: 'default',
                onPress: () => (navigation as Record<string, unknown> & { navigate: (screen: string) => void }).navigate('Packages'),
              },
            ],
            'error-outline',
            '#EF4444'
          );
          return;
        }
      } catch {
        // silent - continue with the request anyway
      }

      // Generate narration text from topic subject
      const res = await generateTopicNarrationFromSubject(topicSubject, lvl);
      const data = (res as Record<string, unknown>)?.data || res;
      // adapted_text = English (for TTS), translated_text = Turkish (fallback only)
      const generatedText = (data as Record<string, unknown>)?.adapted_text as string ||
        (data as Record<string, unknown>)?.translated_text as string || '';

      if (!generatedText) {
        showAlert(
          language === 'tr' ? 'Hata' : 'Error',
          language === 'tr' ? 'Metin oluşturulamadı' : 'Could not generate text',
          [{ text: 'OK', style: 'default' }],
          'error-outline',
          '#EF4444'
        );
        return;
      }

      // Build TTS request and fire async
      const speakingRate = lvl === 'A1' ? 0.8 : 1.0;
      const request: TTSRequest = {
        type: 'text',
        input: generatedText,
        level: lvl as CEFRLevel,
        speakingRate,
        voice: voiceSelection.voiceName,
        sesHizi: speakingRate,
        voiceName: voiceSelection.voiceName,
        gender: voiceSelection.gender as 'male' | 'female' | 'neutral',
        accent: voiceSelection.accent as TTSRequest['accent'],
        topic_id: activeTopic.id,
        engine: voiceSelection.engine,
      };

      const ttsResponse = await ttsService.processTextToSpeechAsync(request);

      if (ttsResponse.success) {
        setSuccessEstimatedTime(ttsResponse.estimatedTime || '2-5 minutes');
        setShowSuccessAlert(true);
        setIsTtsJobLocked(true);

        AnalyticsHelper.logEvent('content_creation_complete', {
          type: 'narration',
          content_type: 'topic_tree',
          level: lvl,
          voice: voiceSelection.voiceName,
          status: 'async_started',
        });
      } else {
        showAlert(
          language === 'tr' ? 'Hata' : 'Error',
          language === 'tr' ? 'Ses oluşturulamadı' : 'Could not create audio',
          [{ text: 'OK', style: 'default' }],
          'error-outline',
          '#EF4444'
        );
      }
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error?.code === 'TTS_JOB_IN_PROGRESS') {
        showAlert(
          language === 'tr' ? 'Bilgi' : 'Info',
          language === 'tr'
            ? 'Ses oluşturma süreci devam ediyor. Lütfen mevcut işlemin bitmesini bekleyin.'
            : 'An audio creation process is already running. Please wait for it to finish.',
          [{ text: 'OK', style: 'default' }],
          'info-outline',
          '#3B82F6'
        );
      } else {
        showAlert(
          language === 'tr' ? 'Hata' : 'Error',
          error?.message || (language === 'tr' ? 'Bir hata oluştu' : 'An error occurred'),
          [{ text: 'OK', style: 'default' }],
          'error-outline',
          '#EF4444'
        );
      }
    } finally {
      setIsGeneratingNarration(false);
    }
  };

  const levels = buildLevels();
  const hasAudio = !!activeTopic?.latest_content?.mp3_url;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#E0F7FA', '#F1F5F9']} style={StyleSheet.absoluteFillObject} />
      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {/* STEP 1: CREATE NEW TOPIC — always a CopilotStep */}
        <CopilotStep order={1} name="topicTreeCreate" text={TOPICTREE_TOUR_STEPS.topicTreeCreate[lang]}>
          <WalkthroughableView>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>{language === 'tr' ? 'YENİ ANA KONU OLUŞTUR' : 'CREATE NEW MAIN TOPIC'}</Text>

              <Text style={styles.fieldLabel}>{language === 'tr' ? 'SEVİYE' : 'LEVEL'}</Text>
              <View style={styles.levelRow}>
                {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as CEFRLevel[]).map(lvl => (
                  <TouchableOpacity key={lvl} onPress={() => setSelectedLevel(lvl)} style={[styles.levelPill, selectedLevel === lvl && styles.levelPillActive]}>
                    <Text style={[styles.levelText, selectedLevel === lvl && styles.levelTextActive]}>{lvl}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>{language === 'tr' ? 'KONU BAŞLIĞI' : 'TOPIC TITLE'}</Text>
              <TextInput
                value={mainTitle}
                onChangeText={setMainTitle}
                placeholder={language === 'tr' ? 'Örn: Osmanlı Tarihi...' : 'e.g. Ottoman History...'}
                placeholderTextColor="#94A3B8"
                style={styles.textInput}
              />

              <TouchableOpacity onPress={handleCreateMain} disabled={isCreatingMain || !mainTitle.trim()} activeOpacity={0.8}>
                <LinearGradient colors={['#F97316', '#FB923C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.primaryBtn, (!mainTitle.trim() || isCreatingMain) && { opacity: 0.5 }]}>
                  {isCreatingMain ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>{language === 'tr' ? 'KONU OLUŞTUR' : 'CREATE TOPIC'}</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </WalkthroughableView>
        </CopilotStep>

        {/* STEP 2: TOPIC SELECTION — always a CopilotStep */}
        <CopilotStep order={2} name="topicTreeSelect" text={TOPICTREE_TOUR_STEPS.topicTreeSelect[lang]}>
          <WalkthroughableView>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>{language === 'tr' ? 'KONU SEÇİMİ' : 'TOPIC SELECTION'}</Text>

              {isLoading && topics.length === 0 ? (
                <ActivityIndicator color={COLORS.brandTeal} style={{ marginVertical: 20 }} />
              ) : topics.length === 0 ? (
                <Text style={styles.emptyText}>{language === 'tr' ? 'Henüz konu yok.' : 'No topics yet.'}</Text>
              ) : (
                levels.map((level) => {
                  const selected = level.options.find(o => o.id === level.selectedId);
                  const label = level.depth === 0
                    ? (language === 'tr' ? 'Ana Konu' : 'Main Topic')
                    : (language === 'tr' ? `${level.depth}. Seviye Alt Konu` : `Level ${level.depth} Subtopic`);
                  return (
                    <View key={level.depth} style={styles.dropdownGroup}>
                      <Text style={styles.fieldLabel}>{label}</Text>
                      <TouchableOpacity style={styles.dropdown} onPress={() => openPicker(level.depth, level.options)}>
                        <Text style={selected ? styles.dropdownValue : styles.dropdownPlaceholder} numberOfLines={1}>
                          {selected ? selected.title : (language === 'tr' ? 'Seçiniz...' : 'Select...')}
                        </Text>
                        <Icon name="keyboard-arrow-down" size={24} color="#64748B" />
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}

              {/* STEP 3: ACTION BUTTONS — nested CopilotStep, mounts when activeTopic exists */}
              {activeTopic && (
                <CopilotStep order={3} name="topicTreeActions" text={TOPICTREE_TOUR_STEPS.topicTreeActions[lang]}>
                  <WalkthroughableView>
                    <View style={styles.topicActionsGrid}>
                      {hasAudio && (
                        <TouchableOpacity style={styles.actionBtn} onPress={handleListen}>
                          <Icon name="headset" size={22} color={COLORS.brandTeal} />
                          <Text style={styles.actionBtnLabel}>{language === 'tr' ? 'Dinle' : 'Listen'}</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity style={styles.actionBtn} onPress={() => { setAiModalTopic(activeTopic); setAiModalVisible(true); }}>
                        <Icon name="auto-awesome" size={22} color="#8B5CF6" />
                        <Text style={styles.actionBtnLabel}>{language === 'tr' ? 'Alt Konu Oluştur' : 'Create Subtopic'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => { setManualModalTopic(activeTopic); setManualModalVisible(true); }}>
                        <Icon name="add-circle-outline" size={22} color="#3B82F6" />
                        <Text style={styles.actionBtnLabel}>{language === 'tr' ? 'Manuel Ekle' : 'Add Manual'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={handleDelete}>
                        <Icon name="delete-outline" size={22} color="#EF4444" />
                        <Text style={[styles.actionBtnLabel, { color: '#EF4444' }]}>{language === 'tr' ? 'Sil' : 'Delete'}</Text>
                      </TouchableOpacity>
                    </View>
                  </WalkthroughableView>
                </CopilotStep>
              )}
            </View>
          </WalkthroughableView>
        </CopilotStep>

        {/* STEP 4: AUDIO CREATION CARD — mounts when activeTopic exists */}
        {activeTopic && (
          <CopilotStep order={4} name="topicTreeAudioCreate" text={TOPICTREE_TOUR_STEPS.topicTreeAudioCreate[lang]}>
            <WalkthroughableView>
              <View style={styles.actionsCard}>
                <View style={styles.actionsHeader}>
                  <Text style={styles.actionsTitle} numberOfLines={1}>{activeTopic.title}</Text>
                  <View style={styles.badge}><Text style={styles.badgeText}>{activeTopic.level || 'B1'}</Text></View>
                </View>

                <VoiceSelector
                  onVoiceChange={setVoiceSelection}
                  userId={user?.id}
                  language={language}
                  compact
                />

                <TouchableOpacity
                  style={[styles.actionBtnPrimary, { marginTop: 12 }, (isGeneratingNarration || isTtsJobLocked) && { opacity: 0.7 }]}
                  disabled={isGeneratingNarration || isTtsJobLocked}
                  onPress={handleCreateAudio}
                >
                  {isGeneratingNarration ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Icon name={isTtsJobLocked ? 'hourglass-top' : 'campaign'} size={22} color="#FFFFFF" />
                  )}
                  <Text style={styles.actionBtnLabelPrimary}>
                    {isGeneratingNarration
                      ? (language === 'tr' ? 'Oluşturuluyor...' : 'Generating...')
                      : isTtsJobLocked
                        ? (language === 'tr' ? 'Ses Hazırlanıyor...' : 'Audio Processing...')
                        : (language === 'tr' ? 'Ses Oluştur' : 'Create Audio')}
                  </Text>
                </TouchableOpacity>
              </View>
            </WalkthroughableView>
          </CopilotStep>
        )}

      </ScrollView>

      {/* PICKER MODAL */}
      <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModal}>
            <Text style={styles.pickerTitle}>{language === 'tr' ? 'Seçiniz' : 'Select'}</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {pickerOptions.map(opt => (
                <TouchableOpacity key={opt.id} style={styles.pickerOption} onPress={() => { handleSelectAtDepth(pickerDepth, opt.id); setPickerVisible(false); }}>
                  <Text style={styles.pickerOptionText}>{opt.title}</Text>
                  {opt.children && opt.children.length > 0 && <Text style={styles.pickerOptionSub}>{opt.children.length} alt konu</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.pickerCloseBtn} onPress={() => setPickerVisible(false)}>
              <Text style={styles.pickerCloseBtnText}>{language === 'tr' ? 'Kapat' : 'Close'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* AI MODAL */}
      <Modal visible={aiModalVisible} transparent animationType="fade" onRequestClose={() => setAiModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.formModal}>
            <Text style={styles.formModalTitle}>{language === 'tr' ? 'AI ile Alt Konu Oluştur' : 'Generate Subtopics with AI'}</Text>
            <Text style={styles.formModalSub}>{aiModalTopic?.title}</Text>
            <Text style={styles.fieldLabel}>{language === 'tr' ? 'ADET' : 'COUNT'}</Text>
            <View style={styles.levelRow}>
              {[2, 3, 4, 5, 10, 20].map(n => (
                <TouchableOpacity key={n} onPress={() => setAiCount(n)} style={[styles.levelPill, aiCount === n && styles.levelPillActive]}>
                  <Text style={[styles.levelText, aiCount === n && styles.levelTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnSecondary} onPress={() => setAiModalVisible(false)}><Text style={styles.modalBtnSecondaryText}>{language === 'tr' ? 'İptal' : 'Cancel'}</Text></TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnPrimary} onPress={handleAiGenerate} disabled={aiModalLoading}>
                {aiModalLoading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.modalBtnPrimaryText}>{language === 'tr' ? 'Oluştur' : 'Generate'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MANUAL MODAL */}
      <Modal visible={manualModalVisible} transparent animationType="fade" onRequestClose={() => setManualModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.formModal}>
            <Text style={styles.formModalTitle}>{language === 'tr' ? 'Manuel Alt Konu Ekle' : 'Add Manual Subtopic'}</Text>
            <Text style={styles.formModalSub}>{manualModalTopic?.title}</Text>
            <Text style={styles.fieldLabel}>{language === 'tr' ? 'BAŞLIK' : 'TITLE'}</Text>
            <TextInput value={manualTitle} onChangeText={setManualTitle} placeholder="..." placeholderTextColor="#94A3B8" style={styles.textInput} />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnSecondary} onPress={() => { setManualModalVisible(false); setManualTitle(''); }}><Text style={styles.modalBtnSecondaryText}>{language === 'tr' ? 'İptal' : 'Cancel'}</Text></TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnPrimary} onPress={handleManualAdd} disabled={manualModalLoading || !manualTitle.trim()}>
                {manualModalLoading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.modalBtnPrimaryText}>{language === 'tr' ? 'Ekle' : 'Add'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* AUDIO PLAYER */}
      {audioTrack && <AudioPlayer track={audioTrack} visible={audioModalVisible} onClose={() => { setAudioModalVisible(false); setAudioTrack(null); }} timepoints={audioTimepoints} words={audioWords} initialHighlightMode="word" />}

      {/* SUCCESS MODAL */}
      <Modal
        visible={showSuccessAlert}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessAlert(false)}
      >
        <TouchableOpacity
          style={styles.successModalOverlay}
          activeOpacity={1}
          onPress={() => setShowSuccessAlert(false)}
        >
          <View style={styles.successModalContainer}>
            <View style={styles.successIconContainer}>
              <LinearGradient
                colors={[COLORS.brandTeal, '#0D9488']}
                style={styles.successIconGradient}
              >
                <Icon name="check" size={40} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <Text style={styles.successModalTitle}>
              {language === 'tr' ? 'İşlem Başlatıldı!' : 'Processing Started!'}
            </Text>
            <Text style={styles.successModalMessage}>
              {language === 'tr'
                ? `Sesiniz arka planda oluşturuluyor.\n${successEstimatedTime} içinde bildirim alacaksınız.`
                : `Your audio is being created in the background.\nYou'll receive a notification in ${successEstimatedTime}.`}
            </Text>
            <View style={styles.successProgressRow}>
              <Icon name="notifications-active" size={16} color={COLORS.brandTeal} />
              <Text style={styles.successProgressText}>
                {language === 'tr' ? 'Bildirim gönderilecek' : 'Notification will be sent'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.successModalButton}
              onPress={() => setShowSuccessAlert(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.successModalButtonText}>
                {language === 'tr' ? 'Tamam' : 'OK'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* CUSTOM ALERT */}
      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        buttons={alertButtons}
        onDismiss={() => setAlertVisible(false)}
        icon={alertIcon}
        iconColor={alertIconColor}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingTop: 100, paddingHorizontal: 20, paddingBottom: 100 },

  // Card
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 4 },
  cardLabel: { fontSize: 12, fontWeight: '800', color: '#94A3B8', letterSpacing: 1, marginBottom: 16 },

  // Fields
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', letterSpacing: 0.5, marginBottom: 8, marginTop: 12 },
  textInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#1E293B' },

  // Level Pills
  levelRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  levelPill: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  levelPillActive: { backgroundColor: '#14B8A6', borderColor: '#14B8A6' },
  levelText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  levelTextActive: { color: '#FFFFFF' },

  // Primary Button
  primaryBtn: { marginTop: 20, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },

  // Dropdown
  dropdownGroup: { marginBottom: 12 },
  dropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 },
  dropdownValue: { fontSize: 15, fontWeight: '600', color: '#1E293B', flex: 1 },
  dropdownPlaceholder: { fontSize: 15, color: '#94A3B8', flex: 1 },

  emptyText: { textAlign: 'center', color: '#94A3B8', paddingVertical: 20 },

  // Actions Card
  actionsCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 2, borderColor: '#14B8A6' },
  actionsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  actionsTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A', flex: 1, marginRight: 8 },
  badge: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  topicActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  actionBtn: { flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  actionBtnPrimary: { flexBasis: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 12, backgroundColor: '#F97316' },
  actionBtnDanger: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  actionBtnLabel: { fontSize: 13, fontWeight: '600', color: '#475569' },
  actionBtnLabelPrimary: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  // Modal Overlay
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },

  // Picker Modal
  pickerModal: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, width: '100%', maxWidth: 400 },
  pickerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', textAlign: 'center', marginBottom: 16 },
  pickerOption: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  pickerOptionText: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  pickerOptionSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  pickerCloseBtn: { marginTop: 16, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center' },
  pickerCloseBtnText: { fontSize: 14, fontWeight: '700', color: '#475569' },

  // Form Modal
  formModal: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, width: '100%', maxWidth: 400 },
  formModalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', textAlign: 'center', marginBottom: 4 },
  formModalSub: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 16 },
  modalBtnRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalBtnSecondary: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center' },
  modalBtnSecondaryText: { fontSize: 14, fontWeight: '700', color: '#475569' },
  modalBtnPrimary: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#14B8A6', alignItems: 'center' },
  modalBtnPrimaryText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  // Success Modal
  successModalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  successModalContainer: { width: '100%', maxWidth: 340, backgroundColor: '#FFFFFF', borderRadius: 28, padding: 28, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.2, shadowRadius: 40, elevation: 24 },
  successIconContainer: { marginBottom: 20 },
  successIconGradient: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.brandTeal, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  successModalTitle: { fontSize: 22, fontWeight: '800', color: '#1E293B', textAlign: 'center', marginBottom: 12, letterSpacing: -0.3 },
  successModalMessage: { fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 24, marginBottom: 20, fontWeight: '500' },
  successProgressRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.brandTeal + '10', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginBottom: 24, gap: 8 },
  successProgressText: { fontSize: 13, color: COLORS.brandTeal, fontWeight: '600' },
  successModalButton: { width: '100%', backgroundColor: COLORS.brandTeal, paddingVertical: 16, borderRadius: 16, alignItems: 'center', shadowColor: COLORS.brandTeal, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 4 },
  successModalButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});

const TopicTreeScreen: React.FC = () => (
  <TourProvider tooltip={TopicTreeTooltip} maskPath={roundedMaskPath}>
    <TopicTreeScreenContent />
  </TourProvider>
);

export default React.memo(TopicTreeScreen);
