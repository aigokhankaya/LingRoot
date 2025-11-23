import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { apiService, getMyPlanFeatures, PlanFeatures } from '../services/api';
import { AudioTrack } from '../types';

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

  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const translateYAnim = React.useRef(new Animated.Value(12)).current;

  // All available features
  const allFeatures = [
    {
      id: 1,
      title: t('home.textToSpeech'),
      description: t('home.textToSpeechDesc'),
      icon: 'text-fields',
      color: '#007AFF',
      screenName: 'Create',
      params: { mode: 'text' as const },
      featureKey: 'text_input',
    },
    {
      id: 7,
      title: 'YouTube',
      description: language === 'tr' ? 'YouTube linkinden altyazı çek ve sese dönüştür' : 'Fetch subtitles from a YouTube link and convert to speech',
      icon: 'ondemand-video',
      color: '#FF0000',
      screenName: 'Create',
      params: { mode: 'youtube' as const },
      featureKey: 'youtube',
    },
    {
      id: 2,
      title: t('home.uploadFile'),
      description: t('home.uploadFileDesc'),
      icon: 'file-upload',
      color: '#34C759',
      screenName: 'Create',
      params: { mode: 'file' as const },
      featureKey: 'file_upload',
    },
    {
      id: 3,
      title: t('home.vocabulary'),
      description: t('home.vocabularyDesc'),
      icon: 'book',
      color: '#9C27B0',
      screenName: 'Vocabulary',
      featureKey: null, // Always show
    },
    {
      id: 9,
      title: language === 'tr' ? 'Günlük Kullanım Kalıpları' : 'Daily Usage Patterns',
      description: language === 'tr' ? 'İçeriklerinizdeki kalıpları keşfedin' : 'Discover patterns in your content',
      icon: 'auto-awesome',
      color: '#F59E0B',
      screenName: 'PatternList',
      featureKey: null, // Always show
    },
    {
      id: 4,
      title: t('home.topicSuggestions'),
      description: t('home.topicSuggestionsDesc'),
      icon: 'lightbulb',
      color: '#FF9500',
      screenName: 'Create',
      params: { mode: 'suggestion' as const },
      featureKey: 'topic_suggestions',
    },
    {
      id: 6,
      title: t('home.bookSearch'),
      description: t('home.bookSearchDesc'),
      icon: 'menu-book',
      color: '#3f51b5',
      screenName: 'Create',
      params: { mode: 'book' as const },
      featureKey: 'book',
    },
    {
      id: 8,
      title: language === 'tr' ? 'Podcast' : 'Podcast',
      description: language === 'tr' ? 'Podcast linkinden ses çıkar' : 'Extract audio from podcast link',
      icon: 'podcasts',
      color: '#8E44AD',
      screenName: 'Create',
      params: { mode: 'podcast' as const },
      featureKey: 'podcast',
    },
    {
      id: 5,
      title: t('home.audioLibrary'),
      description: t('home.audioLibraryDesc'),
      icon: 'library-music',
      color: '#FF3B30',
      screenName: 'Library',
      featureKey: null, // Always show
    },
  ];

  // Filter features based on plan
  const features = allFeatures.filter(feature => {
    // Always show features without featureKey (Vocabulary, Library)
    if (!feature.featureKey) return true;
    
    // If features not loaded yet, show default features
    if (!planFeatures?.homepage_features) {
      console.log('⚠️ [Mobile] Plan features not loaded yet, showing defaults');
      return feature.featureKey === 'text_input' || feature.featureKey === 'topic_suggestions';
    }
    
    // Check if feature is enabled in plan
    const isEnabled = planFeatures.homepage_features[feature.featureKey as keyof typeof planFeatures.homepage_features] === true;
    console.log(`🔍 [Mobile] Feature ${feature.featureKey}: ${isEnabled}`);
    return isEnabled;
  });

  // Fetch user statistics
  const fetchUserStats = async () => {
    if (!user?.id) {
      setStats({ audioCount: 0, totalDuration: 0, loading: false });
      return;
    }

    try {
      // Parallel: fetch count fast + limited history for duration sum
      const [countOrNull, response] = await Promise.all([
        apiService.getUserAudioCount(user.id),
        apiService.getUserAudioHistory(user.id),
      ]);
      
      if (response.success && response.data) {
        const audioTracks = response.data as any[];
        let finalCount = (typeof countOrNull === 'number' && countOrNull >= 0)
          ? countOrNull
          : ((response as any).total_count ?? audioTracks.length);
        // If backend doesn't provide total_count and we hit the 50 item cap, fallback to full history length once
        if (typeof (response as any).total_count !== 'number' && finalCount === 50) {
          try {
            const full = await apiService.getFullContentHistory();
            if (full?.success && Array.isArray(full.data)) {
              finalCount = full.data.length;
            }
          } catch {}
        }
        // Prefer backend-provided aggregate if available
        const apiTotal = typeof (response as any).total_duration_seconds === 'number' ? (response as any).total_duration_seconds : null;
        // Fast: fallback to sum of the current page durations
        const pageSum = audioTracks.reduce((sum: number, item: any) => sum + (typeof item?.duration === 'number' ? item.duration : 0), 0);
        const totalDuration = apiTotal != null ? apiTotal : pageSum;
        
        setStats({ audioCount: finalCount, totalDuration: Math.round(totalDuration / 60), loading: false });
      } else {
        setStats({ audioCount: 0, totalDuration: 0, loading: false });
      }
    } catch (error) {
      setStats({ audioCount: 0, totalDuration: 0, loading: false });
    }
  };

  // Fetch plan features
  const fetchPlanFeatures = async () => {
    try {
      setFeaturesLoading(true);
      const result = await getMyPlanFeatures();
      console.log('✅ [Mobile] Plan features loaded:', JSON.stringify(result, null, 2));
      console.log('✅ [Mobile] Homepage features:', result.features?.homepage_features);
      setPlanFeatures(result.features);
    } catch (error) {
      console.error('❌ [Mobile] Error loading plan features:', error);
    } finally {
      setFeaturesLoading(false);
    }
  };

  // Load stats and features on component mount
  useEffect(() => {
    fetchUserStats();
    fetchPlanFeatures();
  }, [user?.id]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, translateYAnim]);

  // Refresh stats when Home gains focus (e.g., after creating new audio)
  useFocusEffect(
    React.useCallback(() => {
      fetchUserStats();
      return () => {};
    }, [user?.id])
  );

  const handleFeaturePress = (feature: any) => {
    // Eğer screenName null ise (örn: Podcast), hiçbir şey yapma
    if (!feature.screenName) {
      return;
    }
    
    if (feature.params) {
      // For Tab screens, ensure params are merged even if the tab is already mounted
      try {
        (navigation as any).navigate({ name: feature.screenName, params: feature.params, merge: true });
      } catch {
        (navigation as any).navigate(feature.screenName, feature.params);
      }
    } else {
      (navigation as any).navigate(feature.screenName);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: translateYAnim }] }}>
        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">


        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            {stats.loading ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <>
                <Text style={styles.statNumber}>{stats.audioCount}</Text>
                <Text style={styles.statLabel}>{t('home.audioCreated')}</Text>
              </>
            )}
          </View>
          <View style={styles.statCard}>
            {stats.loading ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <>
                <Text style={styles.statNumber}>{stats.totalDuration}</Text>
                <Text style={styles.statLabel}>{t('home.minutesContent')}</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.featuresContainer}>
          <View style={styles.liroBanner}>
            <TouchableOpacity
              style={styles.liroButton}
              activeOpacity={0.9}
              onPress={() => (navigation as any).navigate('Liro')}
            >
              <View style={styles.liroIcon}>
                <Icon name="auto-awesome" size={26} color="#27BEAA" />
              </View>
              <View style={styles.liroContent}>
                <Text style={styles.liroTitle}>
                  {language === 'tr' ? 'LIRO ile Öğren' : 'Learn with LIRO'}
                </Text>
                <Text style={styles.liroDescription}>
                  {language === 'tr'
                    ? 'Sevdiğin içerikleri seviyene göre dinlemek için LIRO ekranını aç.'
                    : 'Open the LIRO screen to listen to your favorite content at your level.'}
                </Text>
              </View>
              <Icon name="chevron-right" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionTitle}>{t('home.features')}</Text>
          <View style={styles.featuresGrid}>
            {features.map((feature) => (
              <TouchableOpacity
                key={feature.id}
                style={[styles.featureCard, { borderLeftColor: feature.color }]}
                onPress={() => handleFeaturePress(feature)}
              >
                <View style={styles.featureIcon}>
                  <Icon name={feature.icon} size={30} color={feature.color} />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>
                    {feature.description}
                  </Text>
                </View>
                <Icon name="chevron-right" size={20} color="#ccc" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.tipSection}>
          <View style={styles.tipCard}>
            <Icon name="tips-and-updates" size={24} color="#FF9500" />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>{t('home.tip')}</Text>
              <Text style={styles.tipText}>
                {t('home.tipText')}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
      </Animated.View>
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

  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  featuresContainer: {
    padding: 20,
  },
  liroBanner: {
    marginBottom: 16,
  },
  liroButton: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27BEAA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  liroIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(39, 190, 170, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  liroContent: {
    flex: 1,
  },
  liroTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  liroDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: '#6B7280',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  featuresGrid: {
    gap: 12,
  },
  featureCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureIcon: {
    marginRight: 15,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
  },
  tipSection: {
    padding: 20,
    paddingBottom: 40,
  },
  tipCard: {
    backgroundColor: '#FFF9E6',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  tipContent: {
    flex: 1,
    marginLeft: 12,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default HomeScreen; 