import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider } from './src/contexts/AuthContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { AudioProvider } from './src/contexts/AudioContext';
import AppNavigator from './src/navigation/AppNavigator';
import { useAuth } from './src/contexts/AuthContext';
import TrackPlayer from 'react-native-track-player';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import NotificationService from './src/services/notificationService';

// Console logging enabled for debugging notifications

export default function App() {
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    // Initialize services when app starts
    const initializeServices = async () => {
      try {
        // Initialize TrackPlayer first
        console.log('Initializing TrackPlayer...');
        await TrackPlayer.setupPlayer();
        
        // Initialize NotificationService
        await NotificationService.initialize();
        // Auto schedule reminders on app start
        try {
          await NotificationService.setupSmartVocabularyNotifications();
        } catch (e) {
          console.log('Auto schedule on launch failed:', e);
        }
        
        // Setup notification tap handler
        NotificationService.setupNotificationResponseHandler((wordId: string) => {
          console.log('Notification tapped, navigating to word:', wordId);
          // Navigate to vocabulary screen with wordId
          // This will be handled by the navigation system
        });
      } catch (error) {
        console.error('Service initialization error:', error);
      }
    };

    initializeServices();
    
    // Listen for app returning to foreground to re-schedule for the day
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        try {
          console.log('App returned to foreground, ensuring reminders are scheduled...');
          await NotificationService.setupSmartVocabularyNotifications();
        } catch (e) {
          console.log('Auto schedule on foreground failed:', e);
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
          <AppNavigator />
        </AudioProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
