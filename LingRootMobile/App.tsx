import React, { useEffect } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { AuthProvider } from './src/contexts/AuthContext';
import { AudioProvider } from './src/contexts/AudioContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';
import NotificationService from './src/services/notificationServiceNoop';
import KeyboardToggleOverlay from './src/components/KeyboardToggleOverlay';

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
    <LanguageProvider>
      <AuthProvider>
        <AudioProvider>
          <AppNavigator />
          <KeyboardToggleOverlay />
          <StatusBar barStyle="dark-content" />
        </AudioProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
