import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import Constants from 'expo-constants';
import { apiService } from './api';

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

    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      return;
    }

    const fcmToken = await messaging().getToken();
    if (!fcmToken) {
      return;
    }

    const appVersion = await getAppVersion();

    await apiService.registerDeviceToken({
      platform: Platform.OS as 'android' | 'ios',
      token: fcmToken,
      deviceId: null,
      appVersion: appVersion || undefined,
    });
  } catch {
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
        const appVersion = await getAppVersion();
        await apiService.registerDeviceToken({
          platform: Platform.OS as 'android' | 'ios',
          token,
          deviceId: null,
          appVersion: appVersion || undefined,
        });
      } catch {
      }
    });
    refreshListenerAttached = true;
  } catch {
  }
}
