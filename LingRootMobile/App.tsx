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

// Suppress all console outputs in mobile app runtime
// This disables console logs, warnings, errors, info, debug, and trace
// to avoid leaking logs in production builds and during mobile usage.
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

export default function App() {
  useEffect(() => {
    // Initialize notification service when app starts
    const initializeNotifications = async () => {
      try {
        await NotificationService.initialize();
      } catch (error) {
        // Swallow errors to avoid console output on mobile
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
