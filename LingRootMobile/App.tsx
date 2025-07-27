import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { AuthProvider } from './src/contexts/AuthContext';
import { AudioProvider } from './src/contexts/AudioContext';
import AppNavigator from './src/navigation/AppNavigator';
import NotificationService from './src/services/notificationService';

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
          console.log('📱 [APP] Notification service initialized, will start reminders after user login...');
          
          // Get initial status
          const status = await NotificationService.getStatus();
          console.log('📱 [APP] Notification status:', status);
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
    <AuthProvider>
      <AudioProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </AudioProvider>
    </AuthProvider>
  );
}
