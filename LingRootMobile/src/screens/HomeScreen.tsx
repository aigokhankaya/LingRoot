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
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { apiService, getMyPlanFeatures, PlanFeatures } from '../services/api';
import { COLORS } from '../theme/colors';
import { AudioTrack } from '../types';
import AudioPlayer from '../components/AudioPlayer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

const HomeScreen: React.FC = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const navigation = useNavigation();
  const [stats, setStats] = useState({
    audioCount: 0,
    totalDuration: 0,
    loading: true,
  });
  const [planFeatures, setPlanFeatures] = useState<PlanFeatures | null>(null);
  const [featuresLoading, setFeaturesLoading] = useState(true);
  const [recentTracks, setRecentTracks] = useState<AudioTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<AudioTrack | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);

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

  // Filter features based on plan
  const features = allFeatures.filter(feature => {
    if (!feature.featureKey) return true;
    if (!planFeatures?.homepage_features) {
      return (
        feature.featureKey === 'text_input' ||
        feature.featureKey === 'topic_tree'
      );
    }
    const homepage = planFeatures.homepage_features;
    const key = feature.featureKey as keyof typeof homepage;
    const rawValue = homepage[key];
    return rawValue === true || (feature.featureKey === 'topic_tree' && rawValue === undefined);
  });

  // Fetch user statistics
  const fetchUserStats = async () => {
    if (!user?.id) {
      setStats({ audioCount: 0, totalDuration: 0, loading: false });
      return;
    }
    try {
      const [countOrNull, response] = await Promise.all([
        apiService.getUserAudioCount(user.id),
        apiService.getUserAudioHistory(user.id),
      ]);
      if (response.success && response.data) {
        const audioTracks = response.data as any[];
        let finalCount = (typeof countOrNull === 'number' && countOrNull >= 0)
          ? countOrNull
          : ((response as any).total_count ?? audioTracks.length);
        if (typeof (response as any).total_count !== 'number' && finalCount === 50) {
          try {
            const full = await apiService.getFullContentHistory();
            if (full?.success && Array.isArray(full.data)) {
              finalCount = full.data.length;
            }
          } catch { }
        }
        const apiTotal = typeof (response as any).total_duration_seconds === 'number' ? (response as any).total_duration_seconds : null;
        const pageSum = audioTracks.reduce((sum: number, item: any) => sum + (typeof item?.duration === 'number' ? item.duration : 0), 0);
        const totalDuration = apiTotal != null ? apiTotal : pageSum;
        setStats({ audioCount: finalCount, totalDuration: Math.round(totalDuration / 60), loading: false });

        // Set recent tracks for Jump Back In (last 5)
        setRecentTracks(audioTracks.slice(0, 5));
      } else {
        setStats({ audioCount: 0, totalDuration: 0, loading: false });
        setRecentTracks([]);
      }
    } catch (error) {
      setStats({ audioCount: 0, totalDuration: 0, loading: false });
      setRecentTracks([]);
    }
  };

  // Fetch plan features
  const fetchPlanFeatures = async () => {
    try {
      setFeaturesLoading(true);
      const result = await getMyPlanFeatures();
      setPlanFeatures(result.features);
    } catch (error) {
      console.error('Error loading plan features:', error);
    } finally {
      setFeaturesLoading(false);
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
      fetchUserStats();
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

  const displayName = user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    (language === 'tr' ? 'Kullanıcı' : 'User');

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
          {planFeatures?.homepage_features?.liro === true && (
            <TouchableOpacity
              style={styles.liroBanner}
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
              return (
                <TouchableOpacity
                  key={feature.id}
                  style={[
                    styles.featureCard,
                    { borderLeftColor: colorSet.accent }
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
            })}
          </View>

          {/* Library Card */}
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
                    {language === 'tr' ? 'Kitap Kütüphanesi' : 'Book Library'}
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

          {/* Jump Back In Section */}
          {recentTracks.length > 0 && (
            <View style={styles.jumpBackInSection}>
              <Text style={styles.jumpBackInTitle}>
                {language === 'tr' ? 'Kaldığın Yerden Devam Et' : 'Jump Back In'}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.jumpBackInList}
              >
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

                  return (
                    <TouchableOpacity
                      key={track.id}
                      style={styles.jumpBackInCard}
                      activeOpacity={0.9}
                      onPress={() => {
                        setSelectedTrack(track);
                        setShowPlayer(true);
                      }}
                    >
                      <View style={styles.jumpBackInIconContainer}>
                        <Icon name="graphic-eq" size={22} color={COLORS.brandTeal} />
                      </View>
                      <View style={styles.jumpBackInContent}>
                        <Text style={styles.jumpBackInTrackTitle} numberOfLines={1}>
                          {track.title || 'Untitled'}
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
              </ScrollView>
            </View>
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

      {/* Audio Player Modal */}
      {selectedTrack && (
        <AudioPlayer
          track={selectedTrack}
          visible={showPlayer}
          onClose={() => {
            setShowPlayer(false);
            setSelectedTrack(null);
          }}
          timepoints={selectedTrack.timepoints || []}
          words={selectedTrack.words || []}
        />
      )}
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
    paddingTop: 16,
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
    width: (SCREEN_WIDTH - 48 - 12) / 2,
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
    paddingRight: 24,
    gap: 12,
  },
  jumpBackInCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    paddingRight: 20,
    minWidth: 180,
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

export default HomeScreen;