import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import Constants from 'expo-constants';
import { apiService } from './api';

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
      const response = await apiService.registerDeviceToken({
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
          const response = await apiService.registerDeviceToken({
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
