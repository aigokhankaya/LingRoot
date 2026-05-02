import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import LinearGradient from 'react-native-linear-gradient';
import { CEFRLevel } from '../types';
import { COLORS } from '../theme/colors';
import { useLanguage } from '../contexts/LanguageContext';
import { useTtsJob } from '../contexts/TtsJobContext';
import { getEnvironmentConfig } from '../services/environmentConfig';
import {
  createStartPodcastAudio,
  createStartTextAudio,
  createStartTopicAudio,
  getStartGenerationActiveJob,
  getStartGenerationJobStatus,
  StartGenerationProgress,
  StartGenerationType,
} from '../services/startOnboardingService';

const LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const STEP_ORDER: StartGenerationType[] = ['text', 'podcast', 'topic'];

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
  microGuide: string;
  completedTitle: string;
};

type Copy = {
  heroTitle: string;
  heroSubtitle: string;
  benefits: string[];
  progressSuffix: string;
  progressStates: Record<'0' | '1' | '2', string>;
  choose: string;
  startSelect: string;
  completeStep: string;
  completed: string;
  waiting: string;
  levelTitle: string;
  levelRequired: string;
  create: string;
  textTooShort: string;
  genericIncomplete: string;
  text: CardCopy;
  podcast: CardCopy;
  topic: CardCopy;
};

function getFirstIncomplete(progress: StartGenerationProgress): StartGenerationType | null {
  if (!progress.text_completed) return 'text';
  if (!progress.podcast_completed) return 'podcast';
  if (!progress.topic_completed) return 'topic';
  return null;
}

function isStepCompleted(progress: StartGenerationProgress, type: StartGenerationType) {
  if (type === 'text') return progress.text_completed;
  if (type === 'podcast') return progress.podcast_completed;
  return progress.topic_completed;
}

function getProgressMessage(progress: StartGenerationProgress, copy: Copy) {
  if (progress.count >= 2) return copy.progressStates['2'];
  if (progress.count === 1) return copy.progressStates['1'];
  return copy.progressStates['0'];
}

const StartScreen: React.FC<Props> = ({ progress, onProgressRefresh }) => {
  const { language, t } = useLanguage();
  const { lockTtsJob, unlockTtsJob } = useTtsJob();
  const headerHeight = useHeaderHeight();
  const pulseAnim = useRef(new Animated.Value(0)).current;

  const [expandedCard, setExpandedCard] = useState<StartGenerationType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWaitingForCompletion, setIsWaitingForCompletion] = useState(false);
  const [activeJobType, setActiveJobType] = useState<StartGenerationType | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [successAlertEstimatedTime, setSuccessAlertEstimatedTime] = useState('10-15 dk');
  const [debugJobId, setDebugJobId] = useState<string | null>(null);
  const [debugJobSnapshot, setDebugJobSnapshot] = useState<any>(null);
  const [isTestEnv, setIsTestEnv] = useState(false);
  const [focusedCard, setFocusedCard] = useState<StartGenerationType | null>(null);
  const [levelByStep, setLevelByStep] = useState<Record<StartGenerationType, CEFRLevel | null>>({
    text: null,
    podcast: null,
    topic: null,
  });
  const [inputByStep, setInputByStep] = useState<Record<StartGenerationType, string>>({
    text: '',
    podcast: '',
    topic: '',
  });

  const copy: Copy = useMemo(() => ({
    heroTitle: t('startOnboarding.heroTitle'),
    heroSubtitle: t('startOnboarding.heroSubtitle'),
    benefits: [
      t('startOnboarding.benefits.levelBased'),
      t('startOnboarding.benefits.naturalVoice'),
      t('startOnboarding.benefits.learnByListening'),
    ],
    progressSuffix: t('startOnboarding.progressSuffix'),
    progressStates: {
      '0': t('startOnboarding.progressStates.zero'),
      '1': t('startOnboarding.progressStates.one'),
      '2': t('startOnboarding.progressStates.two'),
    },
    choose: t('startOnboarding.choose'),
    startSelect: t('startOnboarding.startSelect'),
    completeStep: t('startOnboarding.completeStep'),
    completed: t('startOnboarding.completed'),
    waiting: t('startOnboarding.waiting'),
    levelTitle: t('startOnboarding.levelTitle'),
    levelRequired: t('startOnboarding.levelRequired'),
    create: t('startOnboarding.create'),
    textTooShort: language === 'tr' ? 'Metin en az 10 karakter olmalı.' : 'Text must be at least 10 characters.',
    genericIncomplete: language === 'tr' ? 'İşlem tamamlanamadı. Lütfen tekrar deneyin.' : 'The audio was not completed. Please try again.',
    text: {
      title: t('startOnboarding.text.title'),
      description: t('startOnboarding.text.description'),
      placeholder: t('startOnboarding.text.placeholder'),
      helper: t('startOnboarding.text.helper'),
      cta: t('startOnboarding.text.cta'),
      icon: '📝',
      visualLabel: t('startOnboarding.text.visualLabel'),
      microGuide: t('startOnboarding.text.microGuide'),
      completedTitle: t('startOnboarding.text.completedTitle'),
    },
    podcast: {
      title: t('startOnboarding.podcast.title'),
      description: t('startOnboarding.podcast.description'),
      placeholder: t('startOnboarding.podcast.placeholder'),
      helper: t('startOnboarding.podcast.helper'),
      cta: t('startOnboarding.podcast.cta'),
      icon: '👥',
      visualLabel: t('startOnboarding.podcast.visualLabel'),
      microGuide: t('startOnboarding.podcast.microGuide'),
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
      microGuide: t('startOnboarding.topic.microGuide'),
      completedTitle: t('startOnboarding.topic.completedTitle'),
    },
  }), [language, t]);

  const firstIncomplete = useMemo(() => getFirstIncomplete(progress), [progress]);
  const progressMessage = useMemo(() => getProgressMessage(progress, copy), [copy, progress]);
  const progressLabel = `${progress.count}/3 ${copy.progressSuffix}`;

  useEffect(() => {
    getEnvironmentConfig().then((config) => {
      setIsTestEnv(config.environment === 'test');
    }).catch(() => { });
  }, []);

  useEffect(() => {
    if (!expandedCard && firstIncomplete) {
      setExpandedCard(firstIncomplete);
    }
  }, [expandedCard, firstIncomplete]);

  useEffect(() => {
    if (!firstIncomplete) {
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1100, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [firstIncomplete, pulseAnim]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const fetchDebugJob = async (jobId: string) => {
      try {
        const res = await getStartGenerationJobStatus(jobId);
        const job = res?.job;
        if (!job) {
          return;
        }
        setDebugJobSnapshot(job);
        if (job.status === 'completed' || job.status === 'failed') {
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        }
      } catch (error: any) {
        setDebugJobSnapshot({
          id: jobId,
          status: 'debug_fetch_failed',
          error: error?.message || 'Debug job fetch failed',
        });
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    };

    if (debugJobId) {
      fetchDebugJob(debugJobId);
      intervalId = setInterval(() => {
        fetchDebugJob(debugJobId);
      }, 3000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [debugJobId]);

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
            return;
          }

          const activeJob = await getStartGenerationActiveJob();
          if (!activeJob?.hasActiveJob) {
            unlockTtsJob();
            setIsWaitingForCompletion(false);
            setIsSubmitting(false);
            setErrorMessage(copy.genericIncomplete);
          } else if (activeJob.job?.id) {
            setDebugJobId(activeJob.job.id);
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
  }, [activeJobType, copy, isWaitingForCompletion, onProgressRefresh, unlockTtsJob]);

  const handleExpandCard = (type: StartGenerationType) => {
    if (isStepCompleted(progress, type)) {
      return;
    }
    setExpandedCard((prev) => (prev === type ? null : type));
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const handleCreate = async (type: StartGenerationType) => {
    const currentLevel = levelByStep[type];
    const currentInput = inputByStep[type];
    const minLength = type === 'text' ? 10 : 5;
    const cardCopy = copy[type];

    setErrorMessage(null);

    if (!currentLevel) {
      setErrorMessage(copy.levelRequired);
      return;
    }

    if (!currentInput.trim() || currentInput.trim().length < minLength) {
      setErrorMessage(type === 'text' ? copy.textTooShort : cardCopy.helper);
      return;
    }

    const lockMessage = language === 'tr'
      ? 'Ses oluşturma süreci devam ediyor. Lütfen bitmesini bekleyin.'
      : 'An audio creation process is still running. Please wait for it to finish.';

    try {
      setIsSubmitting(true);
      setStatusMessage(null);
      setActiveJobType(type);
      lockTtsJob(lockMessage);

      let response;
      if (type === 'text') {
        response = await createStartTextAudio(currentInput.trim(), currentLevel);
      } else if (type === 'podcast') {
        response = await createStartPodcastAudio(currentInput.trim(), currentLevel);
      } else {
        response = await createStartTopicAudio(currentInput.trim(), currentLevel);
      }

      if (response.jobId) {
        setDebugJobId(response.jobId);
      }
      setSuccessAlertEstimatedTime(language === 'tr' ? '10-15 dk' : '10-15 minutes');
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

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#f7fffd', '#eff6ff']} style={StyleSheet.absoluteFillObject} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: Math.max(28, headerHeight + 20) }]}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient colors={['rgba(255,255,255,0.96)', 'rgba(241,250,255,0.96)']} style={styles.hero}>
          <Text style={styles.heroTitle}>{copy.heroTitle}</Text>
          <Text style={styles.heroSubtitle}>{copy.heroSubtitle}</Text>

          <View style={styles.benefitRow}>
            {copy.benefits.map((benefit) => (
              <View key={benefit} style={styles.benefitChip}>
                <Text style={styles.benefitChipText}>{benefit}</Text>
              </View>
            ))}
          </View>

          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>{progressLabel}</Text>
            <Text style={styles.progressCount}>{Math.min(progress.count + 1, 3)}/3</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(progress.count / 3) * 100}%` }]} />
          </View>
          <Text style={styles.progressMessage}>{progressMessage}</Text>
        </LinearGradient>

        <Text style={styles.sectionTitle}>{copy.choose}</Text>

        {STEP_ORDER.map((type) => {
          const cardCopy = copy[type];
          const completed = isStepCompleted(progress, type);
          const expanded = expandedCard === type && !completed;
          const isFirstAvailable = firstIncomplete === type && !completed;
          const isBusyCard = activeJobType === type && (isSubmitting || isWaitingForCompletion);
          const animatedStyle = isFirstAvailable
            ? {
              transform: [{
                scale: pulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.015],
                }),
              }],
            }
            : null;

          return (
            <Animated.View key={type} style={[styles.cardWrapper, animatedStyle || undefined]}>
              <TouchableOpacity
                activeOpacity={0.92}
                onPress={() => handleExpandCard(type)}
                disabled={completed || isWaitingForCompletion}
                style={[
                  styles.card,
                  completed && styles.cardCompleted,
                  isFirstAvailable && styles.cardHighlighted,
                  expanded && styles.cardExpanded,
                ]}
              >
                <View style={styles.cardTop}>
                  <View style={styles.iconBadge}>
                    <Text style={styles.iconText}>{cardCopy.icon}</Text>
                  </View>
                  <Text style={[styles.statePill, completed ? styles.stateCompleted : styles.stateAction]}>
                    {completed ? copy.completed : isFirstAvailable ? copy.startSelect : copy.completeStep}
                  </Text>
                </View>

                <Text style={styles.cardTitle}>{cardCopy.title}</Text>
                <Text style={styles.cardDescription}>{cardCopy.description}</Text>

                <View style={styles.visualRow}>
                  <View style={styles.visualChip}>
                    <Text style={styles.visualChipText}>{cardCopy.visualLabel}</Text>
                  </View>
                </View>

                {completed ? (
                  <View style={styles.completedBox}>
                    <Text style={styles.completedText}>{cardCopy.completedTitle}</Text>
                  </View>
                ) : (
                  <>
                    {!expanded ? (
                      <TouchableOpacity
                        style={styles.primaryCta}
                        onPress={() => handleExpandCard(type)}
                        disabled={isWaitingForCompletion}
                      >
                        <Text style={styles.primaryCtaText}>{cardCopy.cta}</Text>
                      </TouchableOpacity>
                    ) : null}

                    {expanded ? (
                      <View style={styles.inlineForm}>
                        <View style={styles.inlineDivider} />
                        <TextInput
                          multiline
                          value={inputByStep[type]}
                          onChangeText={(value) => setInputByStep((prev) => ({ ...prev, [type]: value }))}
                          placeholder={focusedCard === type ? '' : cardCopy.placeholder}
                          placeholderTextColor={COLORS.slate400}
                          style={[styles.input, type === 'text' ? styles.inputLarge : styles.inputMedium]}
                          editable={!isWaitingForCompletion}
                          onFocus={() => setFocusedCard(type)}
                          onBlur={() => setFocusedCard((prev) => (prev === type ? null : prev))}
                        />
                        {focusedCard !== type ? (
                          <Text style={styles.inputHint}>{cardCopy.helper}</Text>
                        ) : null}

                        <Text style={styles.levelTitle}>{copy.levelTitle}</Text>
                        <View style={styles.levelRow}>
                          {LEVELS.map((level) => {
                            const selected = levelByStep[type] === level;
                            return (
                              <TouchableOpacity
                                key={`${type}-${level}`}
                                style={[styles.levelChip, selected && styles.levelChipSelected]}
                                onPress={() => setLevelByStep((prev) => ({ ...prev, [type]: level }))}
                                disabled={isWaitingForCompletion}
                              >
                                <Text style={[styles.levelChipText, selected && styles.levelChipTextSelected]}>{level}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        {statusMessage && activeJobType === type ? <Text style={styles.infoText}>{statusMessage}</Text> : null}
                        {errorMessage && expanded ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

                        <TouchableOpacity
                          style={[styles.createButton, isBusyCard && styles.createButtonDisabled]}
                          onPress={() => handleCreate(type)}
                          disabled={isBusyCard}
                        >
                          {isBusyCard ? (
                            <ActivityIndicator color="#fff" />
                          ) : (
                            <Text style={styles.createButtonText}>{copy.create}</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          );
        })}

        {isTestEnv && debugJobSnapshot ? (
          <View style={styles.debugCard}>
            <Text style={styles.debugTitle}>Start Debug Job</Text>
            <Text style={styles.debugMeta}>jobId: {debugJobId || debugJobSnapshot.id || '-'}</Text>
            <Text style={styles.debugMeta}>status: {debugJobSnapshot.status || '-'}</Text>
            {debugJobSnapshot.error ? <Text style={styles.debugError}>error: {String(debugJobSnapshot.error)}</Text> : null}
            <ScrollView style={styles.debugScroll} nestedScrollEnabled>
              <Text selectable style={styles.debugText}>
                {JSON.stringify(
                  {
                    progress: debugJobSnapshot.progress,
                    queuePosition: debugJobSnapshot.queuePosition,
                    resultDebug: debugJobSnapshot.result?.debug_info || null,
                    resultMessage: debugJobSnapshot.result?.message || null,
                    debugLogs: debugJobSnapshot.debugLogs || [],
                    fullError: debugJobSnapshot.error || null,
                  },
                  null,
                  2
                )}
              </Text>
            </ScrollView>
          </View>
        ) : null}
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

            <View style={styles.successProgressRow}>
              <Text style={styles.successProgressIcon}>🔔</Text>
              <Text style={styles.successProgressText}>
                {language === 'tr' ? 'Bildirim gönderilecek' : 'Notification will be sent'}
              </Text>
            </View>

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 128,
    gap: 18,
  },
  hero: {
    padding: 24,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(39, 190, 170, 0.18)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  heroTitle: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
    color: COLORS.slate900,
    letterSpacing: -0.7,
  },
  heroSubtitle: {
    marginTop: 10,
    fontSize: 17,
    lineHeight: 25,
    color: COLORS.slate700,
    fontWeight: '600',
  },
  benefitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  benefitChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(39, 190, 170, 0.1)',
  },
  benefitChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brandTeal,
  },
  progressHeader: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.brandTeal,
    lineHeight: 20,
  },
  progressCount: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.slate600,
  },
  progressTrack: {
    height: 11,
    marginTop: 12,
    borderRadius: 999,
    backgroundColor: COLORS.slate200,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: COLORS.brandOrange,
  },
  progressMessage: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.slate700,
  },
  sectionTitle: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.slate900,
    letterSpacing: -0.4,
  },
  cardWrapper: {
    borderRadius: 28,
  },
  card: {
    padding: 22,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(39, 190, 170, 0.18)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  cardExpanded: {
    borderColor: 'rgba(39, 190, 170, 0.34)',
    shadowOpacity: 0.1,
  },
  cardHighlighted: {
    shadowColor: COLORS.brandTeal,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  cardCompleted: {
    opacity: 0.74,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(39, 190, 170, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 22,
  },
  statePill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '800',
  },
  stateAction: {
    color: COLORS.brandOrange,
    backgroundColor: 'rgba(245, 165, 36, 0.1)',
  },
  stateCompleted: {
    color: COLORS.brandTeal,
    backgroundColor: 'rgba(39, 190, 170, 0.1)',
  },
  cardTitle: {
    marginTop: 14,
    fontSize: 27,
    fontWeight: '900',
    color: COLORS.slate900,
    letterSpacing: -0.5,
  },
  cardDescription: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 23,
    color: COLORS.slate600,
  },
  visualRow: {
    marginTop: 14,
  },
  visualChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.05)',
  },
  visualChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.slate700,
  },
  primaryCta: {
    marginTop: 18,
    minHeight: 52,
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
  primaryCtaText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
  inlineForm: {
    marginTop: 18,
    paddingTop: 4,
  },
  inlineDivider: {
    height: 1,
    backgroundColor: COLORS.slate200,
    marginBottom: 18,
  },
  input: {
    borderRadius: 20,
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
    minHeight: 138,
  },
  inputMedium: {
    minHeight: 108,
  },
  inputHint: {
    marginTop: 8,
    fontSize: 13,
    color: COLORS.slate500,
    lineHeight: 18,
  },
  levelTitle: {
    marginTop: 18,
    fontSize: 15,
    fontWeight: '800',
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
    borderColor: COLORS.slate300,
    backgroundColor: '#fff',
  },
  levelChipSelected: {
    borderColor: COLORS.brandTeal,
    backgroundColor: 'rgba(39, 190, 170, 0.12)',
  },
  levelChipText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.slate700,
  },
  levelChipTextSelected: {
    color: COLORS.brandTeal,
  },
  infoText: {
    marginTop: 16,
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.slate600,
  },
  errorText: {
    marginTop: 16,
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.danger,
  },
  createButton: {
    marginTop: 18,
    minHeight: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.brandTeal,
    shadowColor: COLORS.brandTeal,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  createButtonDisabled: {
    opacity: 0.72,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
  completedBox: {
    marginTop: 18,
    padding: 15,
    borderRadius: 18,
    backgroundColor: 'rgba(39, 190, 170, 0.08)',
  },
  completedText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.brandTeal,
  },
  debugCard: {
    marginTop: 8,
    marginBottom: 24,
    padding: 16,
    borderRadius: 18,
    backgroundColor: COLORS.slate900,
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  debugMeta: {
    marginTop: 6,
    fontSize: 12,
    color: COLORS.slate300,
  },
  debugError: {
    marginTop: 8,
    fontSize: 12,
    color: '#fca5a5',
  },
  debugScroll: {
    maxHeight: 260,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
  },
  debugText: {
    fontSize: 11,
    lineHeight: 16,
    color: '#dbeafe',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  successModalContainer: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
    elevation: 24,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.brandTeal,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  successIconText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  successModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.slate800,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  successModalMessage: {
    fontSize: 15,
    color: COLORS.slate500,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
    fontWeight: '500',
  },
  successProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brandTeal + '10',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 24,
    gap: 8,
  },
  successProgressIcon: {
    fontSize: 15,
  },
  successProgressText: {
    fontSize: 13,
    color: COLORS.brandTeal,
    fontWeight: '600',
  },
  successModalButton: {
    width: '100%',
    backgroundColor: COLORS.brandTeal,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: COLORS.brandTeal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  successModalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default StartScreen;
