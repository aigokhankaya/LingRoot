import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider } from './src/contexts/AuthContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { AudioProvider } from './src/contexts/AudioContext';
import { AlertProvider } from './src/contexts/AlertContext';
import AppNavigator from './src/navigation/AppNavigator';
import { useAuth } from './src/contexts/AuthContext';
import TrackPlayer from 'react-native-track-player';
import NotificationService from './src/services/notificationService';
import { clearEnvironmentCache } from './src/services/environmentConfig';
import { apiService } from './src/services/api';

export default function App() {
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    // Initialize services when app starts
    const initializeServices = async () => {
      try {
        // TEMPORARY: Clear environment cache to force refresh
        // Remove this after testing
        await clearEnvironmentCache();
        console.log('🧹 [APP] Environment cache cleared on startup');
        // iOS: perform full init on launch
        if (Platform.OS === 'ios') {
          await TrackPlayer.setupPlayer();

          await NotificationService.initialize();
          try {
            await NotificationService.setupSmartVocabularyNotifications();
          } catch (e) {
            // Silent error handling
          }
        } else {
          // Android: Skip any early initialization to avoid rare OEM-specific startup crashes.
          // We'll initialize lazily from Profile actions (Test Notification / Open Notification Settings / Quick Debug).
        }
      } catch (error) {
        // Silent error handling
      }
    };

    initializeServices();

    // Listen for app returning to foreground to re-schedule for the day
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        try {
          if (Platform.OS === 'ios') {
            await NotificationService.setupSmartVocabularyNotifications();
          } else {
            // On Android we still avoid aggressive auto-scheduling on every resume; will be triggered by user login/navigation flows
          }
        } catch (e) {
          // Silent error handling
        }
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <LanguageProvider>
      <AuthProvider>
        <AudioProvider>
          <AlertProvider>
            <AppNavigator />
          </AlertProvider>
        </AudioProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
