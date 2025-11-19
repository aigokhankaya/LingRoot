import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider } from './src/contexts/AuthContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { AudioProvider } from './src/contexts/AudioContext';
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
        
        // Setup notification tap handler
        NotificationService.setupNotificationResponseHandler((data: string) => {
          try {
            // Try to parse as audio notification
            const parsed = JSON.parse(data);
            if (parsed.type === 'audio_created' && parsed.data) {
              // Navigate to Library screen with the audio
              // This will be handled by the navigation system
              console.log('[App] Audio created notification tapped:', parsed.data);
              // TODO: Navigate to Library or directly open the audio player
            }
          } catch (e) {
            // Not JSON, treat as wordId for vocabulary
            console.log('[App] Vocabulary notification tapped:', data);
            // Navigate to vocabulary screen with wordId
          }
        });
      } catch (error) {
        // Silent error handling
      }
    };

    initializeServices();
    
    // Poll for notifications every 30 seconds
    const pollNotifications = async () => {
      try {
        const notifications = await apiService.getUnreadNotifications();
        
        // Show local notifications for each unread notification
        for (const notification of notifications) {
          if (notification.type === 'audio_created') {
            await NotificationService.showAudioCreatedNotification(notification.data);
            // Mark as read
            await apiService.markNotificationAsRead(notification.id);
          }
        }
      } catch (error) {
        // Silent error - table might not exist yet
        // console.error('[App] Error polling notifications:', error);
      }
    };

    // Poll immediately and then every 30 seconds
    pollNotifications();
    const pollInterval = setInterval(pollNotifications, 30000);
    
    // Listen for app returning to foreground to re-schedule for the day
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        try {
          if (Platform.OS === 'ios') {
            await NotificationService.setupSmartVocabularyNotifications();
          } else {
            // On Android we still avoid aggressive auto-scheduling on every resume; will be triggered by user login/navigation flows
          }
          // Poll notifications when app comes to foreground
          pollNotifications();
        } catch (e) {
          // Silent error handling
        }
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
      clearInterval(pollInterval);
    };
  }, []);

  return (
    <LanguageProvider>
      <AuthProvider>
        <AudioProvider>
          <AppNavigator />
        </AudioProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
