import React, { useEffect } from 'react';
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
  useEffect(() => {
    // Initialize services when app starts
    const initializeServices = async () => {
      try {
        // Initialize TrackPlayer first
        console.log('Initializing TrackPlayer...');
        await TrackPlayer.setupPlayer();
        
        // Initialize NotificationService
        await NotificationService.initialize();
        
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
