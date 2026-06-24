import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { AudioTrack, CEFRLevel } from '../types';
import { COLORS } from '../theme/colors';
import { useLanguage } from '../contexts/LanguageContext';
import { useTtsJob } from '../contexts/TtsJobContext';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import {
  createStartPodcastAudio,
  createStartTextAudio,
  createStartTopicAudio,
  getStartGenerationActiveJob,
  StartGenerationProgress,
  StartGenerationType,
} from '../services/startOnboardingService';
import {
  normalizeDialogueSegments,
  normalizeTimepoints,
  normalizeWords,
} from '../utils/timepoints';

const LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const STEP_ORDER: StartGenerationType[] = ['podcast', 'topic', 'text'];
const KEYBOARD_INPUT_GAP = 5;

type Props = {
  progress: StartGenerationProgress;
  onProgressRefresh: () => Promise<StartGenerationProgress>;
};

type CardCopy = {
  title: string;
  description: string;
  placeholder: string;
  helper: string;
  cta: string;
  icon: string;
  visualLabel: string;
  completedTitle: string;
};

type Copy = {
  heroTitle: string;
  heroSubtitle: string;
  choose: string;
  completed: string;
  waiting: string;
  levelTitle: string;
  levelRequired: string;
  create: string;
  listen: string;
  next: string;
  previous: string;
  progressLabel: string;
  step: string;
  textTooShort: string;
  genericIncomplete: string;
  text: CardCopy;
  podcast: CardCopy;
  topic: CardCopy;
};

function getStepIndex(type: StartGenerationType) {
  return STEP_ORDER.indexOf(type);
}

function getFirstIncomplete(progress: StartGenerationProgress): StartGenerationType | null {
  if (!progress.podcast_completed) return 'podcast';
  if (!progress.topic_completed) return 'topic';
  if (!progress.text_completed) return 'text';
  return null;
}

function isStepCompleted(progress: StartGenerationProgress, type: StartGenerationType) {
  if (type === 'podcast') return progress.podcast_completed;
  if (type === 'topic') return progress.topic_completed;
  return progress.text_completed;
}

function buildTrackFromHistoryItem(item: any): AudioTrack {
  return {
    id: String(item.id),
    title: item.adapted_text || item.translated_text || item.input || 'Untitled',
    url: item.mp3_url || item.url || '',
    level: (item.level || 'B1') as CEFRLevel,
    duration: typeof item?.duration === 'number' ? item.duration : 180,
    created_at: item.created_at,
    input_type: item.input_type,
    translated_text: item.translated_text,
    adapted_text: item.adapted_text,
    original_turkish: item.original_turkish || item.input || item.translated_text || '',
    mp3_url: item.mp3_url || item.url || '',
    timepoints: normalizeTimepoints(item.timepoints),
    words: normalizeWords(item.words),
    dialogue_segments: normalizeDialogueSegments(item.dialogue_segments),
    timing_source: item.timing_source,
    timing_accuracy: item.timing_accuracy,
  };
}

const StartScreen: React.FC<Props> = ({ progress, onProgressRefresh }) => {
  const navigation = useNavigation<any>();
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const { lockTtsJob, unlockTtsJob } = useTtsJob();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView | null>(null);
  const scrollOffsetRef = useRef(0);
  const nextPulseAnim = useRef(new Animated.Value(1)).current;
  const inputRefs = useRef<Record<StartGenerationType, TextInput | null>>({
    podcast: null,
    topic: null,
    text: null,
  });
  const prevCompletedCountRef = useRef(progress.count);

  const [currentStep, setCurrentStep] = useState<StartGenerationType>(getFirstIncomplete(progress) || 'podcast');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWaitingForCompletion, setIsWaitingForCompletion] = useState(false);
  const [activeJobType, setActiveJobType] = useState<StartGenerationType | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [successAlertEstimatedTime, setSuccessAlertEstimatedTime] = useState('1 dakika');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [focusedStep, setFocusedStep] = useState<StartGenerationType | null>(null);
  const [levelByStep, setLevelByStep] = useState<Record<StartGenerationType, CEFRLevel | null>>({
    podcast: null,
    topic: null,
    text: null,
  });
  const [inputByStep, setInputByStep] = useState<Record<StartGenerationType, string>>({
    podcast: '',
    topic: '',
    text: '',
  });
  const [tracksByStep, setTracksByStep] = useState<Partial<Record<StartGenerationType, AudioTrack>>>({});

  const copy: Copy = useMemo(() => ({
    heroTitle: t('startOnboarding.heroTitle'),
    heroSubtitle: t('startOnboarding.heroSubtitle'),
    choose: language === 'tr' ? 'Adım adım ilerle' : 'Complete the steps in order',
    completed: t('startOnboarding.completed'),
    waiting: t('startOnboarding.waiting'),
    levelTitle: t('startOnboarding.levelTitle'),
    levelRequired: t('startOnboarding.levelRequired'),
    create: t('startOnboarding.create'),
    listen: language === 'tr' ? 'Sesi Dinle' : 'Listen to Audio',
    next: language === 'tr' ? 'Sonraki Adım' : 'Next Step',
    previous: language === 'tr' ? 'Önceki Adım' : 'Previous Step',
    progressLabel: language === 'tr' ? 'Başlangıç Yolculuğu' : 'Getting Started',
    step: language === 'tr' ? 'Adım' : 'Step',
    textTooShort: language === 'tr' ? 'Metin en az 10 karakter olmalı.' : 'Text must be at least 10 characters.',
    genericIncomplete: language === 'tr' ? 'İşlem tamamlanamadı. Lütfen tekrar deneyin.' : 'The audio was not completed. Please try again.',
    podcast: {
      title: t('startOnboarding.podcast.title'),
      description: t('startOnboarding.podcast.description'),
      placeholder: t('startOnboarding.podcast.placeholder'),
      helper: t('startOnboarding.podcast.helper'),
      cta: t('startOnboarding.podcast.cta'),
      icon: '👥',
      visualLabel: t('startOnboarding.podcast.visualLabel'),
      completedTitle: t('startOnboarding.podcast.completedTitle'),
    },
    topic: {
      title: t('startOnboarding.topic.title'),
      description: t('startOnboarding.topic.description'),
      placeholder: t('startOnboarding.topic.placeholder'),
      helper: t('startOnboarding.topic.helper'),
      cta: t('startOnboarding.topic.cta'),
      icon: '🧍',
      visualLabel: t('startOnboarding.topic.visualLabel'),
      completedTitle: t('startOnboarding.topic.completedTitle'),
    },
    text: {
      title: t('startOnboarding.text.title'),
      description: t('startOnboarding.text.description'),
      placeholder: t('startOnboarding.text.placeholder'),
      helper: t('startOnboarding.text.helper'),
      cta: t('startOnboarding.text.cta'),
      icon: '📝',
      visualLabel: t('startOnboarding.text.visualLabel'),
      completedTitle: t('startOnboarding.text.completedTitle'),
    },
  }), [language, t]);

  const currentStepIndex = getStepIndex(currentStep);
  const maxAccessibleIndex = progress.count >= STEP_ORDER.length ? STEP_ORDER.length - 1 : progress.count;
  const currentCardCopy = copy[currentStep];
  const currentCompleted = isStepCompleted(progress, currentStep);
  const currentTrack = tracksByStep[currentStep];

  const fetchLatestTracks = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    try {
      const response = await apiService.getUserAudioHistory(user.id, 1, 30, '', 'all', 'all');
      if (!response.success || !Array.isArray(response.data)) {
        return;
      }

      const latest: Partial<Record<StartGenerationType, AudioTrack>> = {};
      for (const item of response.data) {
        const type = String(item?.input_type || '').toLowerCase();
        if ((type === 'podcast' || type === 'topic' || type === 'text') && !latest[type as StartGenerationType]) {
          latest[type as StartGenerationType] = buildTrackFromHistoryItem(item);
        }
      }
      setTracksByStep(latest);
    } catch {
      // Silent in production.
    }
  }, [user?.id]);

  useEffect(() => {
    fetchLatestTracks();
  }, [fetchLatestTracks]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates?.height || 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    const previousCount = prevCompletedCountRef.current;
    if (progress.count > previousCount) {
      fetchLatestTracks();
    }

    if (currentStepIndex > maxAccessibleIndex) {
      setCurrentStep(STEP_ORDER[maxAccessibleIndex]);
    }

    prevCompletedCountRef.current = progress.count;
  }, [currentStepIndex, fetchLatestTracks, maxAccessibleIndex, progress]);

  useEffect(() => {
    if (!(currentCompleted && canGoNext)) {
      nextPulseAnim.stopAnimation();
      nextPulseAnim.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(nextPulseAnim, {
          toValue: 1.04,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(nextPulseAnim, {
          toValue: 1,
          duration: 850,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => {
      animation.stop();
      nextPulseAnim.setValue(1);
    };
  }, [canGoNext, currentCompleted, nextPulseAnim]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    if (isWaitingForCompletion && activeJobType) {
      intervalId = setInterval(async () => {
        try {
          const nextProgress = await onProgressRefresh();
          if (isStepCompleted(nextProgress, activeJobType)) {
            unlockTtsJob();
            setIsWaitingForCompletion(false);
            setIsSubmitting(false);
            setStatusMessage(copy.waiting);
            setErrorMessage(null);
            fetchLatestTracks();
            return;
          }

          const activeJob = await getStartGenerationActiveJob();
          if (!activeJob?.hasActiveJob) {
            unlockTtsJob();
            setIsWaitingForCompletion(false);
            setIsSubmitting(false);
            setErrorMessage(copy.genericIncomplete);
          }
        } catch {
          // Continue polling.
        }
      }, 5000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [activeJobType, copy.genericIncomplete, copy.waiting, fetchLatestTracks, isWaitingForCompletion, onProgressRefresh, unlockTtsJob]);

  const alignInputToKeyboard = useCallback((type: StartGenerationType) => {
    if (keyboardHeight <= 0) {
      return;
    }

    setTimeout(() => {
      const inputRef = inputRefs.current[type];
      const scrollView = scrollViewRef.current;

      if (!inputRef || !scrollView) {
        return;
      }

      inputRef.measureInWindow((_x, y, _width, height) => {
        const screenHeight = Dimensions.get('window').height;
        const keyboardTop = screenHeight - keyboardHeight;
        const inputBottom = y + height;
        const delta = inputBottom + KEYBOARD_INPUT_GAP - keyboardTop;

        if (Math.abs(delta) < 2) {
          return;
        }

        const nextOffset = Math.max(0, scrollOffsetRef.current + delta);
        scrollView.scrollTo({ y: nextOffset, animated: true });
      });
    }, 80);
  }, [keyboardHeight]);

  const handleCreate = async () => {
    const currentLevel = levelByStep[currentStep];
    const currentInput = inputByStep[currentStep];
    const minLength = currentStep === 'text' ? 10 : 5;

    setErrorMessage(null);

    if (!currentLevel) {
      setErrorMessage(copy.levelRequired);
      return;
    }

    if (!currentInput.trim() || currentInput.trim().length < minLength) {
      setErrorMessage(currentStep === 'text' ? copy.textTooShort : currentCardCopy.helper);
      return;
    }

    const lockMessage = language === 'tr'
      ? 'Ses oluşturma süreci devam ediyor. Lütfen bitmesini bekleyin.'
      : 'An audio creation process is still running. Please wait for it to finish.';

    try {
      setIsSubmitting(true);
      setStatusMessage(null);
      setActiveJobType(currentStep);
      lockTtsJob(lockMessage);

      let response;
      if (currentStep === 'text') {
        response = await createStartTextAudio(currentInput.trim(), currentLevel);
      } else if (currentStep === 'podcast') {
        response = await createStartPodcastAudio(currentInput.trim(), currentLevel);
      } else {
        response = await createStartTopicAudio(currentInput.trim(), currentLevel);
      }

      setSuccessAlertEstimatedTime(language === 'tr' ? '1 dakika' : '1 minute');
      setShowSuccessAlert(true);
      setStatusMessage(response.message || copy.waiting);
      setIsWaitingForCompletion(true);
    } catch (error: any) {
      unlockTtsJob();
      setIsSubmitting(false);
      setIsWaitingForCompletion(false);
      setErrorMessage(error?.message || 'Unexpected error');
    }
  };

  const handleListen = () => {
    if (!currentTrack) {
      return;
    }

    navigation.navigate('AudioPlayer', {
      track: currentTrack,
      highlightMode: 'word',
      returnTo: 'onboardingHome',
    });
  };

  const canGoPrevious = currentStepIndex > 0;
  const canGoNext = currentStepIndex < maxAccessibleIndex;

  const bottomPadding = keyboardHeight > 0
    ? insets.bottom + 32
    : Math.max(140, insets.bottom + 104);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'android' ? 'height' : undefined}
      enabled={Platform.OS === 'android'}
    >
      <LinearGradient colors={['#f7fffd', '#eff6ff']} style={StyleSheet.absoluteFillObject} />

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(24, headerHeight + 18),
            paddingBottom: bottomPadding,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        onScroll={(event) => {
          scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>{copy.progressLabel}</Text>
          <Text style={styles.heroTitle}>{copy.heroTitle}</Text>
          <Text style={styles.heroSubtitle}>{copy.heroSubtitle}</Text>

          <View style={styles.stepRail}>
            {STEP_ORDER.map((type, index) => {
              const done = isStepCompleted(progress, type);
              const active = currentStep === type;
              const accessible = index <= maxAccessibleIndex || done;

              return (
                <TouchableOpacity
                  key={type}
                  style={styles.stepRailItem}
                  onPress={() => {
                    if (accessible) {
                      setCurrentStep(type);
                    }
                  }}
                  disabled={!accessible}
                  activeOpacity={0.85}
                >
                  {index > 0 ? (
                    <View
                      style={[
                        styles.stepSegment,
                        styles.stepSegmentLeft,
                        index - 1 < progress.count - 1 && styles.stepSegmentDone,
                      ]}
                    />
                  ) : null}
                  {index < STEP_ORDER.length - 1 ? (
                    <View
                      style={[
                        styles.stepSegment,
                        styles.stepSegmentRight,
                        index < progress.count - 1 && styles.stepSegmentDone,
                      ]}
                    />
                  ) : null}
                  <View
                    style={[
                      styles.stepDot,
                      done && styles.stepDotDone,
                      active && styles.stepDotActive,
                      !accessible && styles.stepDotMuted,
                    ]}
                  >
                    <Text
                      style={[
                        styles.stepDotText,
                        done && styles.stepDotTextDone,
                        active && styles.stepDotTextActive,
                      ]}
                    >
                      {done ? '✓' : index + 1}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      active && styles.stepLabelActive,
                      done && styles.stepLabelDone,
                      !accessible && styles.stepLabelMuted,
                    ]}
                  >
                    {copy[type].title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          {copy.step} {currentStepIndex + 1}/3
        </Text>
        <Text style={styles.sectionSubtitle}>{copy.choose}</Text>

        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.iconBadge}>
              <Text style={styles.iconText}>{currentCardCopy.icon}</Text>
            </View>
            <View
              style={[
                styles.statePill,
                currentCompleted ? styles.stateCompleted : styles.statePending,
              ]}
            >
              <Text
                style={[
                  styles.statePillText,
                  currentCompleted ? styles.stateCompletedText : styles.statePendingText,
                ]}
              >
                {currentCompleted ? copy.completed : currentCardCopy.visualLabel}
              </Text>
            </View>
          </View>

          <Text style={styles.cardTitle}>{currentCardCopy.title}</Text>
          <Text style={styles.cardDescription}>{currentCardCopy.description}</Text>

          <TextInput
            ref={(ref) => {
              inputRefs.current[currentStep] = ref;
            }}
            multiline
            value={inputByStep[currentStep]}
            onChangeText={(value) => setInputByStep((prev) => ({ ...prev, [currentStep]: value }))}
            placeholder={currentCardCopy.placeholder}
            placeholderTextColor={COLORS.slate400}
            style={[
              styles.input,
              currentStep === 'text' ? styles.inputLarge : styles.inputMedium,
            ]}
            editable={!isWaitingForCompletion}
            onFocus={() => {
              setFocusedStep(currentStep);
              alignInputToKeyboard(currentStep);
            }}
            onBlur={() => setFocusedStep((prev) => (prev === currentStep ? null : prev))}
            onContentSizeChange={() => {
              if (focusedStep === currentStep) {
                alignInputToKeyboard(currentStep);
              }
            }}
          />

          <Text style={styles.inputHint}>{currentCardCopy.helper}</Text>

          <Text style={styles.levelTitle}>{copy.levelTitle}</Text>
          <View style={styles.levelRow}>
            {LEVELS.map((level) => {
              const selected = levelByStep[currentStep] === level;
              return (
                <TouchableOpacity
                  key={`${currentStep}-${level}`}
                  style={[styles.levelChip, selected && styles.levelChipSelected]}
                  onPress={() => setLevelByStep((prev) => ({ ...prev, [currentStep]: level }))}
                  disabled={isWaitingForCompletion}
                >
                  <Text style={[styles.levelChipText, selected && styles.levelChipTextSelected]}>
                    {level}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {statusMessage && activeJobType === currentStep ? (
            <Text style={styles.infoText}>{statusMessage}</Text>
          ) : null}
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          {!currentCompleted ? (
            <TouchableOpacity
              style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
              onPress={handleCreate}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>{currentCardCopy.cta}</Text>
              )}
            </TouchableOpacity>
          ) : null}

          {currentCompleted && currentTrack ? (
            <TouchableOpacity style={styles.listenButton} onPress={handleListen}>
              <Text style={styles.listenButtonText}>{copy.listen}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.navigationRow}>
          <TouchableOpacity
            style={[styles.secondaryButton, !canGoPrevious && styles.secondaryButtonDisabled]}
            onPress={() => setCurrentStep(STEP_ORDER[currentStepIndex - 1])}
            disabled={!canGoPrevious}
          >
            <Text style={[styles.secondaryButtonText, !canGoPrevious && styles.secondaryButtonTextDisabled]}>
              {copy.previous}
            </Text>
          </TouchableOpacity>

          <Animated.View
            style={[
              styles.secondaryButtonWrap,
              currentCompleted && canGoNext ? { transform: [{ scale: nextPulseAnim }] } : null,
            ]}
          >
            <TouchableOpacity
              style={[styles.secondaryButton, !canGoNext && styles.secondaryButtonDisabled]}
              onPress={() => setCurrentStep(STEP_ORDER[currentStepIndex + 1])}
              disabled={!canGoNext}
            >
              <Text style={[styles.secondaryButtonText, !canGoNext && styles.secondaryButtonTextDisabled]}>
                {copy.next}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>

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
                <Text style={styles.successIconText}>✓</Text>
              </LinearGradient>
            </View>

            <Text style={styles.successModalTitle}>
              {language === 'tr' ? 'İşlem Başlatıldı!' : 'Processing Started!'}
            </Text>

            <Text style={styles.successModalMessage}>
              {language === 'tr'
                ? `Sesiniz arka planda oluşturuluyor.\n${successAlertEstimatedTime} içinde bildirim alacaksınız.`
                : `Your audio is being created in the background.\nYou'll receive a notification in ${successAlertEstimatedTime}.`}
            </Text>

            <TouchableOpacity
              style={styles.successModalButton}
              onPress={() => setShowSuccessAlert(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.successModalButtonText}>
                {language === 'tr' ? 'Tamam' : 'OK'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 18,
    gap: 18,
  },
  hero: {
    padding: 22,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(39, 190, 170, 0.18)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.brandTeal,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroTitle: {
    marginTop: 10,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
    color: COLORS.slate900,
    letterSpacing: -0.6,
  },
  heroSubtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 23,
    color: COLORS.slate600,
    fontWeight: '600',
  },
  stepRail: {
    marginTop: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    position: 'relative',
    paddingHorizontal: 8,
  },
  stepRailItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  stepSegment: {
    position: 'absolute',
    top: 17,
    width: '34%',
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(226, 232, 240, 0.9)',
    zIndex: 0,
  },
  stepSegmentLeft: {
    left: 0,
  },
  stepSegmentRight: {
    right: 0,
  },
  stepSegmentDone: {
    backgroundColor: 'rgba(39, 190, 170, 0.32)',
  },
  stepDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(39, 190, 170, 0.18)',
    backgroundColor: 'rgba(255,255,255,0.98)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  stepDotDone: {
    backgroundColor: COLORS.brandTeal,
    borderColor: COLORS.brandTeal,
  },
  stepDotActive: {
    borderColor: COLORS.brandOrange,
    backgroundColor: 'rgba(255, 247, 237, 0.98)',
    shadowColor: COLORS.brandOrange,
    shadowOpacity: 0.14,
  },
  stepDotMuted: {
    opacity: 0.45,
  },
  stepDotText: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.slate700,
  },
  stepDotTextDone: {
    color: '#fff',
  },
  stepDotTextActive: {
    color: COLORS.brandOrange,
  },
  stepLabel: {
    marginTop: 12,
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
    color: COLORS.slate500,
    fontWeight: '800',
    paddingHorizontal: 6,
  },
  stepLabelActive: {
    color: COLORS.slate900,
  },
  stepLabelDone: {
    color: COLORS.brandTeal,
  },
  stepLabelMuted: {
    opacity: 0.45,
  },
  sectionTitle: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.brandOrange,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  sectionSubtitle: {
    marginTop: -8,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    color: COLORS.slate900,
    letterSpacing: -0.6,
  },
  card: {
    padding: 22,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(39, 190, 170, 0.18)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(39, 190, 170, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 24,
  },
  statePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  statePending: {
    backgroundColor: 'rgba(245, 165, 36, 0.12)',
  },
  stateCompleted: {
    backgroundColor: 'rgba(39, 190, 170, 0.12)',
  },
  statePillText: {
    fontSize: 12,
    fontWeight: '900',
  },
  statePendingText: {
    color: COLORS.brandOrange,
  },
  stateCompletedText: {
    color: COLORS.brandTeal,
  },
  cardTitle: {
    marginTop: 16,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
    color: COLORS.slate900,
    letterSpacing: -0.7,
  },
  cardDescription: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.slate600,
  },
  input: {
    marginTop: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    backgroundColor: COLORS.slate50,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.slate900,
    textAlignVertical: 'top',
  },
  inputLarge: {
    minHeight: 160,
  },
  inputMedium: {
    minHeight: 116,
  },
  inputHint: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.slate500,
  },
  levelTitle: {
    marginTop: 18,
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.slate900,
  },
  levelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  levelChip: {
    minWidth: 52,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.24)',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  levelChipSelected: {
    borderColor: COLORS.brandTeal,
    backgroundColor: 'rgba(39, 190, 170, 0.1)',
  },
  levelChipText: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.slate700,
  },
  levelChipTextSelected: {
    color: COLORS.brandTeal,
  },
  infoText: {
    marginTop: 16,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.slate600,
  },
  errorText: {
    marginTop: 14,
    fontSize: 13,
    lineHeight: 19,
    color: '#DC2626',
    fontWeight: '700',
  },
  primaryButton: {
    marginTop: 20,
    minHeight: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.brandOrange,
    shadowColor: COLORS.brandOrange,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
  listenButton: {
    marginTop: 18,
    minHeight: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.brandTeal,
    backgroundColor: 'rgba(39, 190, 170, 0.08)',
  },
  listenButtonText: {
    color: COLORS.brandTeal,
    fontSize: 15,
    fontWeight: '900',
  },
  navigationRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 6,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.22)',
  },
  secondaryButtonWrap: {
    flex: 1,
  },
  secondaryButtonDisabled: {
    opacity: 0.45,
  },
  secondaryButtonText: {
    color: COLORS.slate900,
    fontSize: 14,
    fontWeight: '900',
  },
  secondaryButtonTextDisabled: {
    color: COLORS.slate500,
  },
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.38)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successModalContainer: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    backgroundColor: '#fff',
    padding: 28,
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 18,
  },
  successIconGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '900',
  },
  successModalTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    color: COLORS.slate900,
    textAlign: 'center',
  },
  successModalMessage: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 23,
    color: COLORS.slate600,
    textAlign: 'center',
  },
  successModalButton: {
    marginTop: 22,
    width: '100%',
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: COLORS.brandTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successModalButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
});

export default StartScreen;
