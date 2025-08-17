import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/contexts/AuthContext';
import { AudioProvider } from './src/contexts/AudioContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';
import NotificationService from './src/services/notificationService';
import KeyboardToggleOverlay from './src/components/KeyboardToggleOverlay';

// Environment Variables Test
console.log('🔧 [APP.TSX DEBUG] Environment Variables:');
console.log('EXPO_PUBLIC_SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
console.log('EXPO_PUBLIC_SUPABASE_ANON_KEY:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
console.log('EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);

export default function App() {
  useEffect(() => {
    // Initialize notification service when app starts
    const initializeNotifications = async () => {
      try {
        console.log('📱 [APP] Initializing notification service...');
        const initialized = await NotificationService.initialize();
        
        if (initialized) {
          console.log('📱 [APP] Notification service initialized successfully');
        } else {
          console.log('📱 [APP] Notification service not initialized');
        }
      } catch (error) {
        console.error('📱 [APP] Failed to initialize notifications:', error);
      }
    };

    initializeNotifications();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LanguageProvider>
        <AuthProvider>
          <AudioProvider>
            <AppNavigator />
            <KeyboardToggleOverlay />
            <StatusBar style="auto" />
          </AudioProvider>
        </AuthProvider>
      </LanguageProvider>
    </GestureHandlerRootView>
  );
}
