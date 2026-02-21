import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
// Lazy-load expo-constants to avoid crash when native module is not linked
let Constants: Record<string, unknown> | null = null;
try {
  Constants = require('expo-constants').default;
} catch {
  // Native module not available
}
import { registerDeviceToken } from './userService';
import NotificationService from './notificationService';

console.log('[PushToken] pushTokenService module loaded');

let refreshListenerAttached = false;

async function getAppVersion(): Promise<string | null> {
  try {
    const anyConstants: any = Constants;
    const expoVersion = anyConstants?.expoConfig?.version as string | undefined;
    const nativeVersion = anyConstants?.nativeAppVersion as string | undefined;
    return expoVersion || nativeVersion || null;
  } catch {
    return null;
  }
}

export async function registerPushTokenWithBackend(): Promise<void> {
  try {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      return;
    }

    console.log('[PushToken] Starting registration for platform:', Platform.OS);

    const authStatus = await messaging().requestPermission();
    console.log('[PushToken] Notification permission status:', authStatus);
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log('[PushToken] Permission not granted, skipping token registration');
      return;
    }

    const fcmToken = await messaging().getToken();
    if (!fcmToken) {
      console.log('[PushToken] No FCM token returned from messaging().getToken()');
      return;
    }

    console.log('[PushToken] FCM token retrieved (truncated):', fcmToken.substring(0, 12) + '...');

    const appVersion = await getAppVersion();

    try {
      const response = await registerDeviceToken({
        platform: Platform.OS as 'android' | 'ios',
        token: fcmToken,
        deviceId: null,
        appVersion: appVersion || undefined,
      });
      console.log('[PushToken] Device token registered successfully:', response);
    } catch (error: any) {
      console.error('[PushToken] Failed to register device token:', {
        message: error?.message,
        responseStatus: error?.response?.status,
        responseData: error?.response?.data,
      });
    }
  } catch (outerError) {
    console.error('[PushToken] Unexpected error during token registration:', outerError);
  }
}

export function setupPushTokenRefreshListener(): void {
  if (refreshListenerAttached) {
    return;
  }
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    refreshListenerAttached = true;
    return;
  }

  try {
    messaging().onTokenRefresh(async (token: string) => {
      try {
        console.log('[PushToken] onTokenRefresh triggered');
        const appVersion = await getAppVersion();
        try {
          const response = await registerDeviceToken({
            platform: Platform.OS as 'android' | 'ios',
            token,
            deviceId: null,
            appVersion: appVersion || undefined,
          });
          console.log('[PushToken] Refreshed device token registered successfully:', response);
        } catch (error: any) {
          console.error('[PushToken] Failed to register refreshed device token:', {
            message: error?.message,
            responseStatus: error?.response?.status,
            responseData: error?.response?.data,
          });
        }
      } catch (innerError) {
        console.error('[PushToken] Unexpected error in onTokenRefresh handler:', innerError);
      }
    });
    refreshListenerAttached = true;
  } catch (error) {
    console.error('[PushToken] Failed to attach onTokenRefresh listener:', error);
  }
}

/**
 * Setup Firebase Messaging listeners for remote push notifications.
 * This handles badge updates when FCM notifications arrive.
 * @returns Cleanup function to remove listeners
 */
export function setupFirebaseMessagingListeners(): () => void {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return () => {};
  }

  console.log('[FCM] Setting up Firebase messaging listeners');

  // Foreground: remote notification received while app is open
  const unsubscribeOnMessage = messaging().onMessage(async (remoteMessage) => {
    console.log('[FCM] Foreground message received:', remoteMessage.notification?.title);
    try {
      await NotificationService.syncBadgeWithBackend();
    } catch (error) {
      console.error('[FCM] Error syncing badge on foreground message:', error);
    }
  });

  // Background -> Foreground: notification tapped while app was in background
  const unsubscribeOnNotificationOpened = messaging().onNotificationOpenedApp(async (remoteMessage) => {
    console.log('[FCM] Notification opened from background:', remoteMessage.notification?.title);
    try {
      await NotificationService.syncBadgeWithBackend();
    } catch (error) {
      console.error('[FCM] Error syncing badge on notification open:', error);
    }
  });

  return () => {
    console.log('[FCM] Cleaning up Firebase messaging listeners');
    unsubscribeOnMessage();
    unsubscribeOnNotificationOpened();
  };
}

/**
 * Check if the app was opened from a notification when it was completely closed (cold start).
 * Should be called once when the app initializes.
 */
export async function checkInitialNotification(): Promise<void> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return;
  }

  try {
    const initialNotification = await messaging().getInitialNotification();
    if (initialNotification) {
      console.log('[FCM] App opened from quit state via notification:', initialNotification.notification?.title);
      await NotificationService.syncBadgeWithBackend();
    }
  } catch (error) {
    console.error('[FCM] Error checking initial notification:', error);
  }
}
