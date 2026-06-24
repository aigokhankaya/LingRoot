import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, DeviceEventEmitter, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import HomeScreen from './HomeScreen';
import StartScreen from './StartScreen';
import { COLORS } from '../theme/colors';
import { useLanguage } from '../contexts/LanguageContext';
import {
  getStartGenerationProgress,
  START_ONBOARDING_PROGRESS_EVENT,
  StartGenerationProgress,
} from '../services/startOnboardingService';

const HomeGateScreen: React.FC = () => {
  const { language } = useLanguage();
  const [progress, setProgress] = useState<StartGenerationProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCompletion, setShowCompletion] = useState(false);
  const lastCountRef = useRef<number | null>(null);

  const refreshProgress = useCallback(async () => {
    const nextProgress = await getStartGenerationProgress();
    setProgress(nextProgress);
    DeviceEventEmitter.emit(START_ONBOARDING_PROGRESS_EVENT, nextProgress);

    if (lastCountRef.current != null && lastCountRef.current < 3 && nextProgress.count >= 3) {
      setShowCompletion(true);
    }

    lastCountRef.current = nextProgress.count;
    return nextProgress;
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      (async () => {
        try {
          setIsLoading(true);
          const nextProgress = await refreshProgress();
          if (!active) {
            return;
          }
        } finally {
          if (active) {
            setIsLoading(false);
          }
        }
      })();

      return () => {
        active = false;
      };
    }, [refreshProgress])
  );

  useEffect(() => {
    if (progress?.count === 3 && lastCountRef.current === null) {
      lastCountRef.current = 3;
    }
  }, [progress]);

  if (isLoading || !progress) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.brandTeal} />
      </View>
    );
  }

  if (progress.count >= 3 && showCompletion) {
    const title = language === 'tr' ? 'Harika! Home ekranın hazır' : 'Great! Your Home is ready';
    const button = language === 'tr' ? 'Home\'a Git' : 'Go to Home';

    return (
      <View style={styles.container}>
        <LinearGradient colors={['#f7fffd', '#eff6ff']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.successCard}>
          <Text style={styles.successTitle}>{title}</Text>
          <TouchableOpacity style={styles.button} onPress={() => setShowCompletion(false)}>
            <Text style={styles.buttonText}>{button}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (progress.count < 3) {
    return <StartScreen progress={progress} onProgressRefresh={refreshProgress} />;
  }

  return <HomeScreen />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  successCard: {
    width: '100%',
    maxWidth: 420,
    padding: 28,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(39, 190, 170, 0.16)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  successTitle: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '800',
    color: COLORS.slate900,
  },
  button: {
    marginTop: 22,
    minHeight: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.brandTeal,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
});

export default HomeGateScreen;
