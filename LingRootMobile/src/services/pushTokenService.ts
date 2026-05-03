import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
const OPENED_NOTIFICATION_STORAGE_KEY = 'lingroot_opened_notification_payload';

function forwardRemoteMessageToNotificationService(remoteMessage: any): void {
  try {
    const remoteData = remoteMessage?.data || {};
    const remoteType = remoteData?.type;
    const svc: any = NotificationService;
    const callback = svc?.responseCallback || null;

    let payload: string | null = null;

    if (remoteData?.audioData) {
      const audioData = typeof remoteData.audioData === 'string'
        ? JSON.parse(remoteData.audioData)
        : remoteData.audioData;
      if (audioData) {
        payload = JSON.stringify({ type: 'audio_created', data: audioData });
      }
    } else if (remoteData?.payload && remoteType === 'support_message') {
      const supportData = typeof remoteData.payload === 'string'
        ? JSON.parse(remoteData.payload)
        : remoteData.payload;
      if (supportData) {
        payload = JSON.stringify({ type: 'support_message', data: supportData });
      }
    } else if (remoteData?.payload && remoteType) {
      const genericData = typeof remoteData.payload === 'string'
        ? JSON.parse(remoteData.payload)
        : remoteData.payload;
      if (genericData) {
        payload = JSON.stringify({ type: remoteType, data: genericData });
      }
    } else if (remoteData?.wordId) {
      const wordId = String(remoteData.wordId);
      if (callback) {
        callback(wordId);
      } else {
        svc.pendingWordId = wordId;
      }
      return;
    }

    if (!payload) {
      return;
    }

    if (callback) {
      callback(payload);
      return;
    }

    svc.pendingRemotePayload = payload;
    svc.pendingAudioPayload = payload;
  } catch (error) {
    console.error('[FCM] Failed to forward remote message to notification service:', error);
  }
}

function extractRemoteMessageEnvelope(remoteMessage: any): { kind: 'callback' | 'word'; value: string } | null {
  try {
    const remoteData = remoteMessage?.data || {};
    const remoteType = remoteData?.type;

    if (remoteData?.audioData) {
      const audioData = typeof remoteData.audioData === 'string'
        ? JSON.parse(remoteData.audioData)
        : remoteData.audioData;
      if (audioData) {
        return {
          kind: 'callback',
          value: JSON.stringify({ type: 'audio_created', data: audioData }),
        };
      }
    }

    if (remoteData?.payload && remoteType === 'support_message') {
      const supportData = typeof remoteData.payload === 'string'
        ? JSON.parse(remoteData.payload)
        : remoteData.payload;
      if (supportData) {
        return {
          kind: 'callback',
          value: JSON.stringify({ type: 'support_message', data: supportData }),
        };
      }
    }

    if (remoteData?.payload && remoteType) {
      const genericData = typeof remoteData.payload === 'string'
        ? JSON.parse(remoteData.payload)
        : remoteData.payload;
      if (genericData) {
        return {
          kind: 'callback',
          value: JSON.stringify({ type: remoteType, data: genericData }),
        };
      }
    }

    if (remoteData?.wordId) {
      return {
        kind: 'word',
        value: String(remoteData.wordId),
      };
    }
  } catch (error) {
    console.error('[FCM] Failed to extract remote message envelope:', error);
  }

  return null;
}

async function persistOpenedRemoteMessage(remoteMessage: any): Promise<void> {
  try {
    const envelope = extractRemoteMessageEnvelope(remoteMessage);
    if (!envelope) {
      return;
    }

    await AsyncStorage.setItem(OPENED_NOTIFICATION_STORAGE_KEY, JSON.stringify(envelope));
  } catch (error) {
    console.error('[FCM] Failed to persist opened remote message:', error);
  }
}

export async function consumeStoredOpenedNotificationPayload(): Promise<{ kind: 'callback' | 'word'; value: string } | null> {
  try {
    const raw = await AsyncStorage.getItem(OPENED_NOTIFICATION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    await AsyncStorage.removeItem(OPENED_NOTIFICATION_STORAGE_KEY);
    const parsed = JSON.parse(raw);
    if (!parsed || (parsed.kind !== 'callback' && parsed.kind !== 'word') || typeof parsed.value !== 'string') {
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('[FCM] Failed to consume stored opened notification payload:', error);
    return null;
  }
}

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
  // NOTE: Badge sync is handled by global onNotification handler in notificationService.ios.ts
  // We only log here to avoid duplicate sync calls
  const unsubscribeOnMessage = messaging().onMessage(async (remoteMessage) => {
    console.log('[FCM] Foreground message received:', remoteMessage.notification?.title);
    // Badge sync handled by PushNotification.configure onNotification handler
  });

  // Background -> Foreground: notification tapped while app was in background
  // NOTE: Badge sync is handled by global onNotification handler in notificationService.ios.ts
  const unsubscribeOnNotificationOpened = messaging().onNotificationOpenedApp(async (remoteMessage) => {
    console.log('[FCM] Notification opened from background:', remoteMessage.notification?.title);
    await persistOpenedRemoteMessage(remoteMessage);
    forwardRemoteMessageToNotificationService(remoteMessage);
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
      await persistOpenedRemoteMessage(initialNotification);
      forwardRemoteMessageToNotificationService(initialNotification);
    }
  } catch (error) {
    console.error('[FCM] Error checking initial notification:', error);
  }
}
