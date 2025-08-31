import { Platform, Alert } from 'react-native';
import type { VocabularyWord } from './api';

class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;
  private hasPermission = false;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return this.hasPermission;
    }

    try {
      // For now, assume notifications are available
      // In a real implementation, you'd check actual permissions
      this.hasPermission = true;
      this.isInitialized = true;
      console.log('Notification service initialized successfully');
      return this.hasPermission;
    } catch (error) {
      console.error('Notification initialization error:', error);
      this.isInitialized = true;
      this.hasPermission = false;
      return false;
    }
  }

  public async setupPeriodicVocabularyNotifications(): Promise<void> {
    if (!this.hasPermission) return;
    
    // Show alert for now instead of actual notification
    Alert.alert(
      "Bildirim Ayarlandı",
      "Periyodik kelime hatırlatmaları aktif edildi."
    );
  }

  public async setupSmartVocabularyNotifications(): Promise<void> {
    if (!this.hasPermission) return;
    
    Alert.alert(
      "Akıllı Bildirimler",
      "Akıllı kelime hatırlatmaları aktif edildi."
    );
  }

  public async stopVocabularyReminders(): Promise<void> {
    Alert.alert(
      "Bildirimler Durduruldu", 
      "Tüm kelime hatırlatmaları iptal edildi."
    );
  }

  public async scheduleVocabularyNotification(word: VocabularyWord): Promise<void> {
    if (!this.hasPermission) return;
    
    Alert.alert(
      "Kelime Hatırlatması",
      `"${word.word}" için hatırlatma ayarlandı.`
    );
  }

  public setupNotificationResponseHandler(navigationCallback: (wordId: string) => void) {
    return { remove: () => {} };
  }

  public async getRandomUnlearnedWord(): Promise<VocabularyWord | null> {
    return null;
  }

  public async getStatus(): Promise<{ isInitialized: boolean; hasPermission: boolean; scheduledCount: number }> {
    return {
      isInitialized: this.isInitialized,
      hasPermission: this.hasPermission,
      scheduledCount: 0,
    };
  }
}

export default NotificationService.getInstance();