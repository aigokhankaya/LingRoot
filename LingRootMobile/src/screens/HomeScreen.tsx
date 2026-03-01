import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Animated,
  useWindowDimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { CopilotStep, walkthroughable, useCopilot } from 'react-native-copilot';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getUserAudioCount, getUserAudioHistory } from '../services/contentService';
import { getMyPlanFeatures, PlanFeatures } from '../services/subscriptionService';
import { COLORS } from '../theme/colors';
import { AudioTrack } from '../types';
import perfLog from '../utils/performanceLogger';
import {
  TourProvider,
  CustomTooltip,
  TOUR_STEPS,
  TOUR_STEP_MAP,
  HOME_TOUR_KEY,
  useGuideTour,
  homeMaskPath,
} from '../components/GuideTour';

const WalkthroughableView = walkthroughable(View);

// Feature card colors
const FEATURE_COLORS = {
  blue: { bg: '#eff6ff', text: '#3b82f6', border: '#dbeafe', accent: '#3b82f6' },
  green: { bg: '#f0fdf4', text: '#22c55e', border: '#dcfce7', accent: '#22c55e' },
  purple: { bg: '#faf5ff', text: '#a855f7', border: '#f3e8ff', accent: '#a855f7' },
  fuchsia: { bg: '#fdf4ff', text: '#d946ef', border: '#fae8ff', accent: '#d946ef' },
  amber: { bg: '#fffbeb', text: '#f59e0b', border: '#fef3c7', accent: '#f59e0b' },
  teal: { bg: '#f0fdfa', text: '#14b8a6', border: '#ccfbf1', accent: '#14b8a6' },
  indigo: { bg: '#eef2ff', text: '#6366f1', border: '#e0e7ff', accent: '#6366f1' },
  red: { bg: '#fef2f2', text: '#ef4444', border: '#fecaca', accent: '#ef4444' },
};

const HomeScreenContent: React.FC = () => {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const navigation = useNavigation();
  const [stats, setStats] = useState({
    audioCount: 0,
    totalDuration: 0,
    loading: true,
  });
  const [planFeatures, setPlanFeatures] = useState<PlanFeatures | null>(null);
  const [activePlanName, setActivePlanName] = useState<string | null>(null);
  const [featuresLoading, setFeaturesLoading] = useState(true);
  const [recentTracks, setRecentTracks] = useState<AudioTrack[]>([]);

  // Guide tour — wait for data to load so layout is stable before measuring
  const lang = language === 'tr' ? 'tr' : 'en';
  const { start: startTour, copilotEvents } = useCopilot();
  const { shouldShow: shouldShowTour, markCompleted: markTourCompleted } = useGuideTour(HOME_TOUR_KEY);
  const scrollViewRef = useRef<ScrollView>(null);
  const dataReady = !stats.loading && !featuresLoading;

  useEffect(() => {
    const handler = () => { if (shouldShowTour) markTourCompleted(); };
    copilotEvents.on('stop', handler);
    return () => { copilotEvents.off('stop', handler); };
  }, [copilotEvents, shouldShowTour, markTourCompleted]);

  useEffect(() => {
    if (shouldShowTour && dataReady) {
      const timer = setTimeout(
        () => startTour(undefined, scrollViewRef.current ?? null),
        500,
      );
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldShowTour, dataReady]);

  // Animations
  const slideUpAnim = useRef(new Animated.Value(20)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bookFloatAnim = useRef(new Animated.Value(0)).current;
  const liroDotAnim = useRef(new Animated.Value(1)).current;
  const liroWaveAnim = useRef(new Animated.Value(0)).current;

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (language === 'tr') {
      if (hour < 12) return 'Günaydın';
      if (hour < 18) return 'İyi Günler';
      return 'İyi Akşamlar';
    }
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  // All available features - matched to newDesign CreateSection
  const allFeatures = [
    {
      id: 1,
      title: language === 'tr' ? 'Metin Seslendirme' : 'Text to Speech',
      description: language === 'tr' ? 'Metni anında dönüştür' : 'Convert text instantly',
      icon: 'translate',
      bgIcon: 'text-fields',
      color: 'blue',
      screenName: 'Create',
      params: { mode: 'text' as const },
      featureKey: 'text_input',
    },
    {
      id: 2,
      title: language === 'tr' ? 'Dosya Yükle' : 'Upload File',
      description: language === 'tr' ? 'PDF & Word dosyaları' : 'PDF & Word docs',
      icon: 'post-add',
      bgIcon: 'description',
      color: 'green',
      screenName: 'Create',
      params: { mode: 'file' as const },
      featureKey: 'file_upload',
    },
    {
      id: 3,
      title: 'Podcast',
      description: language === 'tr' ? 'Dinleyerek öğren' : 'Learn by listening',
      icon: 'mic',
      bgIcon: 'podcasts',
      color: 'purple',
      screenName: 'Create',
      params: { mode: 'podcast' as const, podcastProvider: 'google' as const },
      featureKey: 'podcast',
    },
    {
      id: 4,
      title: language === 'tr' ? 'Konu Ağacım' : 'My Topic Tree',
      description: language === 'tr' ? 'Yol haritanı keşfet' : 'Explore your roadmap',
      icon: 'hub',
      bgIcon: 'account-tree',
      color: 'fuchsia',
      screenName: 'TopicTree',
      featureKey: 'topic_tree',
    },
    {
      id: 5,
      title: language === 'tr' ? 'Kelime Dağarcığı' : 'Vocabulary',
      description: language === 'tr' ? 'Kelime listen' : 'Your word list',
      icon: 'menu-book',
      bgIcon: 'spellcheck',
      color: 'amber',
      screenName: 'Vocabulary',
      featureKey: null,
    },
    {
      id: 6,
      title: language === 'tr' ? 'Kitap Ara' : 'Search Books',
      description: language === 'tr' ? 'Sonraki okumayı bul' : 'Find your next read',
      icon: 'manage-search',
      bgIcon: 'search',
      color: 'teal',
      screenName: 'Create',
      params: { mode: 'book' as const },
      featureKey: 'book',
    },
  ];

  const isAdmin = user?.role === 'admin';

  // DEBUG: Log filter inputs
  console.log('[HomeScreen] DEBUG - isAdmin:', isAdmin);
  console.log('[HomeScreen] DEBUG - planFeatures:', JSON.stringify(planFeatures, null, 2));
  console.log('[HomeScreen] DEBUG - planFeatures?.homepage_features:', planFeatures?.homepage_features);

  // Filter features based on plan (admin sees all)
  const features = allFeatures.filter(feature => {
    if (isAdmin) return true;
    if (!feature.featureKey) return true;
    if (!planFeatures?.homepage_features) {
      // Free paket default özellikleri (Admin paneli ile senkron)
      const isVisible = (
        feature.featureKey === 'text_input' ||
        feature.featureKey === 'file_upload' ||
        feature.featureKey === 'podcast' ||
        feature.featureKey === 'topic_tree' ||
        feature.featureKey === 'book'
      );
      console.log(`[HomeScreen] DEBUG - Feature "${feature.featureKey}" (no homepage_features): ${isVisible}`);
      return isVisible;
    }
    const homepage = planFeatures.homepage_features;
    const key = feature.featureKey as keyof typeof homepage;
    const rawValue = homepage[key];
    const isVisible = rawValue === true || (feature.featureKey === 'topic_tree' && rawValue === undefined);
    console.log(`[HomeScreen] DEBUG - Feature "${feature.featureKey}" rawValue=${rawValue}: ${isVisible}`);
    return isVisible;
  });

  console.log('[HomeScreen] DEBUG - Visible features:', features.map(f => f.featureKey));

  // Fetch user statistics
  const fetchUserStats = async () => {
    if (!user?.id) {
      setStats({ audioCount: 0, totalDuration: 0, loading: false });
      return;
    }
    perfLog.start('fetchUserStats', 'HomeScreen');
    try {
      const [countResult, response] = await Promise.all([
        getUserAudioCount(user.id),
        getUserAudioHistory(user.id),
      ]);
      if (response.success && response.data) {
        const audioTracks = response.data as any[];
        // Use count and duration from count endpoint
        const finalCount = countResult.count || audioTracks.length;
        const totalDurationSeconds = countResult.totalDurationSeconds || 0;

        // Convert to minutes
        setStats({
          audioCount: finalCount,
          totalDuration: Math.round(totalDurationSeconds / 60),
          loading: false
        });

        // Map raw API data to AudioTrack format (ensures original_turkish is populated)
        const mappedTracks: AudioTrack[] = audioTracks.map((item: any) => ({
          id: String(item.id),
          title: item.adapted_text || item.translated_text || item.input || 'Untitled',
          url: item.mp3_url || item.url || '',
          level: item.level || 'B1',
          duration: typeof item?.duration === 'number' ? item.duration : 180,
          created_at: item.created_at,
          input_type: item.input_type,
          translated_text: item.translated_text,
          adapted_text: item.adapted_text,
          original_turkish: item.input || '',
          mp3_url: item.mp3_url,
          timepoints: item.timepoints ?? [],
          words: item.words ?? [],
        }));

        // Set recent tracks for Jump Back In (last 5)
        setRecentTracks(mappedTracks.slice(0, 5));
      } else {
        setStats({ audioCount: 0, totalDuration: 0, loading: false });
        setRecentTracks([]);
      }
    } catch (error) {
      setStats({ audioCount: 0, totalDuration: 0, loading: false });
      setRecentTracks([]);
    } finally {
      perfLog.end('fetchUserStats');
    }
  };

  // Fetch plan features (with caching - userId enables user-aware cache)
  const fetchPlanFeatures = async () => {
    perfLog.start('fetchPlanFeatures', 'HomeScreen');
    try {
      // Pass userId to enable user-aware caching
      // onRefresh callback updates UI when background refresh completes
      const result = await getMyPlanFeatures(
        user?.id,
        false,
        (refreshedData) => {
          console.log('[HomeScreen] Background refresh received, updating UI');
          setPlanFeatures(refreshedData.features);
          setActivePlanName(refreshedData.plan_name);
        }
      );
      console.log('[HomeScreen] DEBUG - Plan features from API:', JSON.stringify(result, null, 2));
      console.log('[HomeScreen] DEBUG - homepage_features:', JSON.stringify(result.features?.homepage_features, null, 2));
      setPlanFeatures(result.features);
      setActivePlanName(result.plan_name);
    } catch (error) {
      console.error('Error loading plan features:', error);
    } finally {
      setFeaturesLoading(false);
      perfLog.end('fetchPlanFeatures');
    }
  };

  useEffect(() => {
    fetchUserStats();
    fetchPlanFeatures();
  }, [user?.id]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Start floating book animation
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bookFloatAnim, {
          toValue: -8,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(bookFloatAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    floatAnimation.start();

    // Liro status dot pulse animation
    const dotPulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(liroDotAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(liroDotAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    dotPulseAnimation.start();

    // Liro sound wave animation
    const waveAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(liroWaveAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(liroWaveAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    waveAnimation.start();

    return () => {
      floatAnimation.stop();
      dotPulseAnimation.stop();
      waveAnimation.stop();
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      perfLog.mark('home:focus:start');
      fetchUserStats().then(() => perfLog.mark('home:focus:fetchDone'));
      // Refresh plan features on focus (uses stale-while-revalidate cache strategy)
      fetchPlanFeatures();
      return () => { };
    }, [user?.id])
  );

  const handleFeaturePress = (feature: any) => {
    if (!feature.screenName) return;
    if (feature.params) {
      try {
        (navigation as any).navigate({ name: feature.screenName, params: feature.params, merge: true });
      } catch {
        (navigation as any).navigate(feature.screenName, feature.params);
      }
    } else {
      (navigation as any).navigate(feature.screenName);
    }
  };

  const displayName = user?.full_name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    (language === 'tr' ? 'Kullanıcı' : 'User');

  const getPlanBadgeConfig = () => {
    const normalizedPlan = (activePlanName || '').toLowerCase();

    if (normalizedPlan.includes('gold')) {
      return {
        label: 'Gold',
        backgroundColor: '#FFF7ED',
        borderColor: '#FDBA74',
        textColor: '#C2410C',
      };
    }

    if (normalizedPlan.includes('platin') || normalizedPlan.includes('platinum')) {
      return {
        label: 'Platin',
        backgroundColor: '#EEF2FF',
        borderColor: '#A5B4FC',
        textColor: '#4338CA',
      };
    }

    return {
      label: 'Free',
      backgroundColor: '#ECFDF5',
      borderColor: '#86EFAC',
      textColor: '#15803D',
    };
  };

  const planBadge = getPlanBadgeConfig();

  return (
    <SafeAreaView style={styles.container}>
      {/* Background */}
      <LinearGradient
        colors={[COLORS.slate100, COLORS.slate200]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }}>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              <Text style={styles.userName}>{displayName}</Text>
            </View>
            <View style={styles.headerCenter}>
              <View
                style={[
                  styles.planBadge,
                  {
                    backgroundColor: planBadge.backgroundColor,
                    borderColor: planBadge.borderColor,
                  },
                ]}
              >
                <Text style={[styles.planBadgeText, { color: planBadge.textColor }]}>
                  {planBadge.label}
                </Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              {/* Audio Count */}
              <View style={styles.statCard}>
                {stats.loading ? (
                  <ActivityIndicator size="small" color={COLORS.brandOrange} />
                ) : (
                  <>
                    <Text style={styles.statNumber}>{stats.audioCount}</Text>
                    <Text style={styles.statLabel}>
                      {language === 'tr' ? 'Ses\nOluştur.' : 'Audio\nCreated'}
                    </Text>
                  </>
                )}
              </View>
              {/* Minutes */}
              <View style={styles.statCard}>
                {stats.loading ? (
                  <ActivityIndicator size="small" color={COLORS.brandOrange} />
                ) : (
                  <>
                    <Text style={styles.statNumber}>{stats.totalDuration}</Text>
                    <Text style={styles.statLabel}>
                      {language === 'tr' ? 'Dakika\nİçerik' : 'Minutes\nContent'}
                    </Text>
                  </>
                )}
              </View>
            </View>
          </View>

          {/* Liro Banner */}
          {(isAdmin || planFeatures?.homepage_features?.liro === true) && (
            <CopilotStep
              order={1}
              name="liro"
              text={TOUR_STEPS.liro[lang]}
            >
              <WalkthroughableView style={{ marginBottom: 24 }}>
                <TouchableOpacity
                  style={[styles.liroBanner, { marginBottom: 0 }]}
                  activeOpacity={0.9}
                  onPress={() => (navigation as any).navigate('Liro')}
                >
                  <View style={styles.liroBannerGlow} />
                  <View style={styles.liroContent}>
                    <View style={styles.liroIconWrapper}>
                      {/* Sound wave rings */}
                      <Animated.View style={[styles.liroWaveRing, styles.liroWaveRing1, {
                        opacity: liroWaveAnim.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0.6, 0.3, 0],
                        }),
                        transform: [{
                          scale: liroWaveAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.8],
                          }),
                        }],
                      }]} />
                      <Animated.View style={[styles.liroWaveRing, styles.liroWaveRing2, {
                        opacity: liroWaveAnim.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0.4, 0.2, 0],
                        }),
                        transform: [{
                          scale: liroWaveAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1.2, 2.2],
                          }),
                        }],
                      }]} />
                      <View style={styles.liroIconContainer}>
                        {/* Headphone Band - curved arc on top */}
                        <View style={styles.liroHeadphoneBand} />
                        {/* Robot Head Icon */}
                        <Icon name="smart-toy" size={26} color="#FFFFFF" />
                        {/* Headphone Cups - left and right */}
                        <View style={styles.liroHeadphoneCupLeft} />
                        <View style={styles.liroHeadphoneCupRight} />
                      </View>
                      <Animated.View style={[styles.liroStatusDot, { opacity: liroDotAnim }]} />
                    </View>
                    <View style={styles.liroTextContainer}>
                      <View style={styles.liroTitleRow}>
                        <Text style={styles.liroTitle}>Liro AI</Text>
                        <View style={styles.liroReadyBadge}>
                          <Text style={styles.liroReadyText}>
                            {language === 'tr' ? 'Hazır' : 'Ready'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.liroSubtitle}>
                        {language === 'tr'
                          ? 'Sevdiğin içerikleri seviyene göre dinle'
                          : 'Listen to content at your level'}
                      </Text>
                    </View>
                    <View style={styles.liroPlayButton}>
                      <Icon name="play-arrow" size={24} color={COLORS.brandTeal} />
                    </View>
                  </View>
                </TouchableOpacity>
              </WalkthroughableView>
            </CopilotStep>
          )}

          {/* Create Section Title */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {language === 'tr' ? 'Oluştur' : 'Create'}
            </Text>
          </View>

          {/* Feature Grid */}
          <View style={styles.featureGrid}>
            {features.map((feature) => {
              const colorSet = FEATURE_COLORS[feature.color as keyof typeof FEATURE_COLORS] || FEATURE_COLORS.blue;
              const card = (
                <TouchableOpacity
                  key={feature.id}
                  style={[
                    styles.featureCard,
                    {
                      width: (SCREEN_WIDTH - 48 - 12) / 2,
                      borderLeftColor: colorSet.accent
                    }
                  ]}
                  activeOpacity={0.9}
                  onPress={() => handleFeaturePress(feature)}
                >
                  {/* Background Icon */}
                  <View style={styles.featureBgIcon}>
                    <Icon name={feature.bgIcon} size={56} color={colorSet.text} style={{ opacity: 0.08 }} />
                  </View>

                  {/* Icon */}
                  <View style={[styles.featureIconContainer, { backgroundColor: colorSet.bg, borderColor: colorSet.border }]}>
                    <Icon name={feature.icon} size={22} color={colorSet.text} />
                  </View>

                  {/* Text */}
                  <View style={styles.featureTextContainer}>
                    <Text style={styles.featureTitle}>{feature.title}</Text>
                    <Text style={styles.featureDescription}>{feature.description}</Text>
                  </View>
                </TouchableOpacity>
              );

              const tourStep = TOUR_STEP_MAP[feature.id];
              if (tourStep) {
                const stepText = TOUR_STEPS[tourStep.name]?.[language === 'tr' ? 'tr' : 'en'] || '';
                return (
                  <CopilotStep
                    key={feature.id}
                    order={tourStep.order}
                    name={tourStep.name}
                    text={stepText}
                  >
                    <WalkthroughableView style={{ width: (SCREEN_WIDTH - 48 - 12) / 2 }}>
                      {card}
                    </WalkthroughableView>
                  </CopilotStep>
                );
              }
              return card;
            })}
          </View>

          {/* Library Card */}
          <CopilotStep order={8} name="homeLibrary" text={TOUR_STEPS.homeLibrary[lang]}>
          <WalkthroughableView>
          <TouchableOpacity
            style={styles.libraryCard}
            activeOpacity={0.9}
            onPress={() => (navigation as any).navigate('Library')}
          >
            <View style={styles.libraryGradient} />
            <View style={styles.libraryContent}>
              <View style={styles.libraryHeader}>
                <View>
                  <View style={[styles.featureIconContainer, { backgroundColor: FEATURE_COLORS.indigo.bg, borderColor: FEATURE_COLORS.indigo.border }]}>
                    <Icon name="local-library" size={22} color={FEATURE_COLORS.indigo.text} />
                  </View>
                  <Text style={styles.libraryTitle}>
                    {language === 'tr' ? 'Kütüphane' : 'Library'}
                  </Text>
                  <Text style={styles.librarySubtitle}>
                    {language === 'tr' ? 'Sürükleyici okuma & dinleme' : 'Immersive reading & listening'}
                  </Text>
                </View>
                <View style={styles.libraryIconBadge}>
                  <Icon name="auto-stories" size={16} color={FEATURE_COLORS.indigo.text} />
                </View>
              </View>

              {/* Decorative Books */}
              <View style={styles.booksContainer}>
                <View style={[styles.book, styles.bookLeft, { backgroundColor: COLORS.brandOrange }]} />
                <Animated.View style={[styles.book, styles.bookCenter, { transform: [{ translateY: bookFloatAnim }] }]}>
                  <Icon name="school" size={32} color="#FFFFFF" />
                </Animated.View>
                <View style={[styles.book, styles.bookRight, { backgroundColor: COLORS.brandTeal }]} />
              </View>
            </View>
          </TouchableOpacity>
          </WalkthroughableView>
          </CopilotStep>

          {/* Jump Back In Section */}
          {recentTracks.length > 0 && (
            <CopilotStep order={9} name="homeRecentTracks" text={TOUR_STEPS.homeRecentTracks[lang]}>
            <WalkthroughableView style={styles.jumpBackInSection}>
              <Text style={styles.jumpBackInTitle}>
                {language === 'tr' ? 'Son 5 Kayıt' : 'Last 5 Records'}
              </Text>
              <View style={styles.jumpBackInList}>
                {recentTracks.map((track) => {
                  const levelColors: { [key: string]: string } = {
                    'A1': '#10B981', 'A2': '#3B82F6', 'B1': '#8B5CF6',
                    'B2': '#F59E0B', 'C1': '#EF4444', 'C2': '#EC4899',
                  };
                  const levelColor = levelColors[track.level || 'B1'] || '#6366f1';
                  const inputTypeLabel = track.input_type === 'file' ? 'File' :
                    track.input_type === 'book' ? 'Book' :
                      track.input_type === 'podcast' ? 'Podcast' : 'Text';
                  const duration = track.duration ? `${Math.round(track.duration / 60)}m` : '';

                  // Get display title from adapted_text or translated_text (first ~50 chars)
                  const getDisplayTitle = (): string => {
                    const text = track.adapted_text || track.translated_text || track.title;
                    if (!text || text === 'Untitled') {
                      return language === 'tr' ? 'Başlıksız' : 'Untitled';
                    }
                    // Take first ~50 characters for vertical layout
                    if (text.length <= 50) return text;
                    const truncated = text.substring(0, 50);
                    const lastSpace = truncated.lastIndexOf(' ');
                    return (lastSpace > 25 ? truncated.substring(0, lastSpace) : truncated) + '...';
                  };

                  return (
                    <TouchableOpacity
                      key={track.id}
                      style={styles.jumpBackInCard}
                      activeOpacity={0.9}
                      onPress={() => {
                        // Navigate directly to AudioPlayer screen
                        navigation.navigate('AudioPlayer', { track, highlightMode: 'word' } as any);
                      }}
                    >
                      <View style={styles.jumpBackInIconContainer}>
                        <Icon name="graphic-eq" size={22} color={COLORS.brandTeal} />
                      </View>
                      <View style={styles.jumpBackInContent}>
                        <Text style={styles.jumpBackInTrackTitle} numberOfLines={1}>
                          {getDisplayTitle()}
                        </Text>
                        <View style={styles.jumpBackInMeta}>
                          <View style={[styles.jumpBackInLevelBadge, { backgroundColor: levelColor }]}>
                            <Text style={styles.jumpBackInLevelText}>{track.level || 'B1'}</Text>
                          </View>
                          <Text style={styles.jumpBackInMetaText}>
                            {inputTypeLabel}{duration ? ` • ${duration}` : ''}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </WalkthroughableView>
            </CopilotStep>
          )}
          {/* Tip Box */}
          <View style={styles.tipBox}>
            <View style={styles.tipIconContainer}>
              <Icon name="lightbulb" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.tipTextContainer}>
              <Text style={styles.tipTitle}>
                {language === 'tr' ? 'Okuma İpucu' : 'Reading Tip'}
              </Text>
              <Text style={styles.tipText}>
                {language === 'tr'
                  ? 'Okurken herhangi bir kelimeye dokunarak anında çeviri alın ve kelime listenize kaydedin.'
                  : 'Tap on any word while reading to get an instant translation and save it to your vocabulary list.'}
              </Text>
            </View>
            <View style={styles.tipDecoration} />
          </View>

        </Animated.View>
      </ScrollView>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 70,
    paddingBottom: 100,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  headerCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.slate500,
    marginBottom: 2,
  },
  userName: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.slate900,
    letterSpacing: -0.5,
  },
  planBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  planBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
    borderWidth: 1,
    borderColor: COLORS.brandTeal,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.brandOrange,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.slate400,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Liro Banner
  liroBanner: {
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    shadowColor: COLORS.brandIndigo,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 32,
    elevation: 4,
    overflow: 'hidden',
  },
  liroBannerGlow: {
    position: 'absolute',
    right: -20,
    top: -20,
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(39, 190, 170, 0.1)',
  },
  liroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  liroIconWrapper: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liroWaveRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: COLORS.brandTeal,
  },
  liroWaveRing1: {
    // First wave ring - styled via animation
  },
  liroWaveRing2: {
    // Second wave ring - styled via animation
  },
  liroIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.brandTeal,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.brandTeal,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  liroHeadphoneBand: {
    position: 'absolute',
    top: 6,
    width: 24,
    height: 14,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  liroHeadphoneCupLeft: {
    position: 'absolute',
    left: 8,
    top: '50%',
    marginTop: -8,
    width: 5,
    height: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 2,
  },
  liroHeadphoneCupRight: {
    position: 'absolute',
    right: 8,
    top: '50%',
    marginTop: -8,
    width: 5,
    height: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 2,
  },
  liroStatusDot: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4ade80',
    borderWidth: 3,
    borderColor: COLORS.surface,
  },
  liroTextContainer: {
    flex: 1,
  },
  liroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  liroTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.slate900,
  },
  liroReadyBadge: {
    backgroundColor: 'rgba(39, 190, 170, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  liroReadyText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.brandTeal,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  liroSubtitle: {
    fontSize: 14,
    color: COLORS.slate500,
  },
  liroPlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },

  // Section Header
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.slate800,
  },

  // Feature Grid
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  featureCard: {
    height: 140,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 16,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: 'rgba(226, 232, 240, 0.5)',
    borderRightColor: 'rgba(226, 232, 240, 0.5)',
    borderBottomColor: 'rgba(226, 232, 240, 0.5)',
    borderLeftWidth: 5,
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  featureBgIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 12,
  },
  featureTextContainer: {
    zIndex: 10,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.slate900,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 11,
    color: COLORS.slate500,
  },

  // Library Card
  libraryCard: {
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: COLORS.borderLight,
    borderRightColor: COLORS.borderLight,
    borderBottomColor: COLORS.borderLight,
    borderLeftWidth: 5,
    borderLeftColor: FEATURE_COLORS.indigo.accent,
    overflow: 'hidden',
    shadowColor: COLORS.brandIndigo,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 32,
    elevation: 4,
  },
  libraryGradient: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: '66%',
    height: '100%',
    backgroundColor: 'rgba(238, 242, 255, 0.2)',
  },
  libraryContent: {
    zIndex: 10,
  },
  libraryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  libraryTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.slate800,
    marginTop: 12,
    marginBottom: 4,
  },
  librarySubtitle: {
    fontSize: 14,
    color: COLORS.slate500,
  },
  libraryIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.slate50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.slate100,
  },
  booksContainer: {
    height: 140,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: -20,
  },
  book: {
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  bookLeft: {
    width: 60,
    height: 90,
    transform: [{ rotate: '-10deg' }, { translateX: 20 }],
    opacity: 0.9,
  },
  bookCenter: {
    width: 80,
    height: 110,
    backgroundColor: COLORS.brandIndigo,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 4,
    borderLeftColor: 'rgba(255,255,255,0.2)',
  },
  bookRight: {
    width: 60,
    height: 90,
    transform: [{ rotate: '10deg' }, { translateX: -20 }],
    opacity: 0.9,
  },

  // Tip Box
  tipBox: {
    backgroundColor: '#fffbeb',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    borderWidth: 1,
    borderColor: '#fef3c7',
    overflow: 'hidden',
  },
  tipIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
  tipTextContainer: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.slate900,
    marginBottom: 4,
  },
  tipText: {
    fontSize: 14,
    color: COLORS.slate600,
    lineHeight: 20,
  },
  tipDecoration: {
    position: 'absolute',
    right: -24,
    bottom: -24,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
  },

  // Jump Back In Section
  jumpBackInSection: {
    marginBottom: 24,
  },
  jumpBackInTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.slate800,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  jumpBackInList: {
    gap: 10,
  },
  jumpBackInCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    paddingRight: 16,
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  jumpBackInIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(39, 190, 170, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jumpBackInContent: {
    flex: 1,
  },
  jumpBackInTrackTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.slate800,
    marginBottom: 4,
  },
  jumpBackInMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  jumpBackInLevelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  jumpBackInLevelText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  jumpBackInMetaText: {
    fontSize: 11,
    color: COLORS.slate400,
    fontWeight: '500',
  },
});

const HomeScreen: React.FC = () => (
  <TourProvider tooltip={CustomTooltip} maskPath={homeMaskPath}>
    <HomeScreenContent />
  </TourProvider>
);

export default React.memo(HomeScreen);
