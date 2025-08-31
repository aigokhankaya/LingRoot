import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider } from './src/contexts/AuthContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { AudioProvider } from './src/contexts/AudioContext';
import AppNavigator from './src/navigation/AppNavigator';
import { useAuth } from './src/contexts/AuthContext';
import TrackPlayer from 'react-native-track-player';
import { Notifications } from 'react-native-notifications';
import NotificationService from './src/services/notificationService';

// Temporarily enable console outputs for debugging
// TODO: Re-enable console suppression after fixing loading issues
/*
if (typeof console !== 'undefined') {
  const noop = () => {};
  // Assign no-op to common console methods
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (['log', 'warn', 'error', 'info', 'debug', 'trace'] as any[]).forEach((k: any) => {
    try {
      // @ts-ignore
      console[k] = noop;
    } catch (e) {
      // ignore
    }
  });
}
*/

export default function App() {
  useEffect(() => {
    // Initialize services when app starts
    const initializeServices = async () => {
      try {
        // Initialize TrackPlayer first
        console.log('Initializing TrackPlayer...');
        await TrackPlayer.setupPlayer({
          waitForBuffer: true,
        });
        console.log('TrackPlayer initialized successfully');
        
        // Then initialize notifications
        console.log('Initializing notifications...');
        const notificationPermission = await NotificationService.initialize();
        console.log('Notification permission granted:', notificationPermission);
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
