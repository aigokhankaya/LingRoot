import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { apiService } from '../services/api';
import { AudioTrack } from '../types';

const HomeScreen: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigation = useNavigation();
  const [stats, setStats] = useState({
    audioCount: 0,
    totalDuration: 0,
    loading: true,
  });

  const features = [
    {
      id: 1,
      title: t('home.textToSpeech'),
      description: t('home.textToSpeechDesc'),
      icon: 'text-fields',
      color: '#007AFF',
      screenName: 'Create',
      params: { mode: 'text' as const },
    },
    {
      id: 2,
      title: t('home.uploadFile'),
      description: t('home.uploadFileDesc'),
      icon: 'upload-file',
      color: '#34C759',
      screenName: 'Create',
      params: { mode: 'file' as const },
    },
    {
      id: 3,
      title: t('home.vocabulary'),
      description: t('home.vocabularyDesc'),
      icon: 'book',
      color: '#9C27B0',
      screenName: 'Vocabulary',
    },
    {
      id: 4,
      title: t('home.topicSuggestions'),
      description: t('home.topicSuggestionsDesc'),
      icon: 'lightbulb',
      color: '#FF9500',
      screenName: 'Create',
      params: { mode: 'suggestion' as const },
    },
    {
      id: 6,
      title: t('home.bookSearch'),
      description: t('home.bookSearchDesc'),
      icon: 'menu-book',
      color: '#3f51b5',
      screenName: 'Create',
      params: { mode: 'book' as const },
    },
    {
      id: 5,
      title: t('home.audioLibrary'),
      description: t('home.audioLibraryDesc'),
      icon: 'library-music',
      color: '#FF3B30',
      screenName: 'Library',
    },
  ];

  // Fetch user statistics
  const fetchUserStats = async () => {
    if (!user?.id) {
      setStats({ audioCount: 0, totalDuration: 0, loading: false });
      return;
    }

    try {
      console.log('🔍 Fetching user stats for:', user.id);
      
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
        // Fast: backend already provides per-item duration; avoid parsing timepoints on Home
        const totalDuration = audioTracks.reduce((sum: number, item: any) => sum + (typeof item?.duration === 'number' ? item.duration : 0), 0);
        
        console.log('✅ User stats:', { audioCount: finalCount, totalDuration });
        
        setStats({ audioCount: finalCount, totalDuration: Math.round(totalDuration / 60), loading: false });
      } else {
        console.warn('❌ Failed to fetch user stats:', response.message);
        setStats({ audioCount: 0, totalDuration: 0, loading: false });
      }
    } catch (error) {
      console.error('❌ Error fetching user stats:', error);
      setStats({ audioCount: 0, totalDuration: 0, loading: false });
    }
  };

  // Load stats on component mount
  useEffect(() => {
    fetchUserStats();
  }, [user?.id]);

  // Refresh stats when Home gains focus (e.g., after creating new audio)
  useFocusEffect(
    React.useCallback(() => {
      fetchUserStats();
      return () => {};
    }, [user?.id])
  );

  const handleFeaturePress = (feature: any) => {
    console.log('🔄 Navigating to:', feature.screenName, feature.params ? `with params ${JSON.stringify(feature.params)}` : '');
    if (feature.params) {
      navigation.navigate(feature.screenName as never, feature.params as never);
    } else {
      navigation.navigate(feature.screenName as never);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>


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

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>{t('home.quickActions')}</Text>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('Create' as never, { mode: 'text' } as never)}
          >
            <Icon name="add-circle" size={24} color="white" />
            <Text style={styles.quickActionText}>{t('home.createNewAudio')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.quickActionButton, styles.secondaryButton]}
            onPress={() => navigation.navigate('Library' as never)}
          >
            <Icon name="library-music" size={24} color="#007AFF" />
            <Text style={[styles.quickActionText, styles.secondaryText]}>{t('home.listenToAudio')}</Text>
          </TouchableOpacity>
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
  quickActions: {
    padding: 20,
  },
  quickActionButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  quickActionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryText: {
    color: '#007AFF',
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