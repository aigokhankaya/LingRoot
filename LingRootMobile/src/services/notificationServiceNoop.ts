// No-op notification service replacement (no Expo dependencies)
import { Platform } from 'react-native';
import type { VocabularyWord } from './api';

class NotificationServiceNoop {
  private static instance: NotificationServiceNoop;
  private constructor() {}

  public static getInstance(): NotificationServiceNoop {
    if (!NotificationServiceNoop.instance) {
      NotificationServiceNoop.instance = new NotificationServiceNoop();
    }
    return NotificationServiceNoop.instance;
  }

  public async initialize(): Promise<boolean> {
    return false;
  }

  public async setupPeriodicVocabularyNotifications(): Promise<void> {
    // no-op
  }

  public async setupSmartVocabularyNotifications(): Promise<void> {
    // no-op
  }

  public async stopVocabularyReminders(): Promise<void> {
    // no-op
  }

  public async scheduleVocabularyNotification(_word: VocabularyWord): Promise<void> {
    // no-op
  }

  public setupNotificationResponseHandler(_navigationCallback: (wordId: string) => void) {
    // return a no-op subscription-like object
    return { remove: () => {} } as any;
  }

  public async getRandomUnlearnedWord(): Promise<VocabularyWord | null> {
    return null;
  }

  public async getStatus(): Promise<{ isInitialized: boolean; hasPermission: boolean; scheduledCount: number }> {
    return { isInitialized: false, hasPermission: false, scheduledCount: 0 };
  }

  public async getPermissionSnapshot(): Promise<{
    granted: boolean;
    status: string;
    can_receive_remote: boolean;
    platform: string;
  }> {
    return {
      granted: false,
      status: 'unknown',
      can_receive_remote: false,
      platform: Platform.OS,
    };
  }
}

export default NotificationServiceNoop.getInstance();
