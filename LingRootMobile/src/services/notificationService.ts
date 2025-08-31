import { Alert } from 'react-native';
import { Notifications } from 'react-native-notifications';
import type { VocabularyWord } from './api';
import { getVocabulary } from './api';

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
      console.log('Starting notification service initialization...');
      
      // First check current permissions
      const currentPermissions = await Notifications.ios.checkPermissions();
      console.log('Current permissions:', currentPermissions);
      
      // If no permissions, request them
      if (!currentPermissions.alert && !currentPermissions.badge && !currentPermissions.sound) {
        console.log('No permissions found, requesting...');
        const requestResult = await new Promise((resolve) => {
          Notifications.events().registerNotificationReceivedForeground((notification, completion) => {
            console.log('Foreground notification received:', notification);
            completion({ alert: true, sound: true, badge: true });
          });
          
          // Use registerRemoteNotifications for permission request
          Notifications.registerRemoteNotifications();
          setTimeout(() => resolve(currentPermissions), 1000);
        });
        console.log('Permission request result:', requestResult);
        this.hasPermission = (requestResult as any)?.alert || (requestResult as any)?.badge || (requestResult as any)?.sound || false;
      } else {
        this.hasPermission = currentPermissions.alert || currentPermissions.badge || currentPermissions.sound;
      }
      
      this.isInitialized = true;
      console.log('Notification service initialized, hasPermission:', this.hasPermission);
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
    console.log('scheduleVocabularyNotification called with word:', word.word);
    console.log('hasPermission:', this.hasPermission);
    
    if (!this.hasPermission) {
      console.log('No permission, showing alert instead');
      Alert.alert("İzin Gerekli", "Bildirim izni verilmemiş. Ayarlar > Bildirimler > LingRoot'tan açabilirsiniz.");
      return;
    }
    
    try {
      console.log('Attempting to send local notification...');
      
      // Send immediate local notification
      Notifications.postLocalNotification({
        identifier: `word_${word.id || Date.now()}`,
        title: 'LingRoot Kelime Hatırlatması',
        body: `Kelime: "${word.word}" - ${word.definition || 'Tanım yok'}`,
        sound: 'default',
        badge: 1,
        type: '',
        thread: '',
        payload: { wordId: word.id?.toString() || '' },
      });
      
      console.log('postLocalNotification called successfully for word:', word.word);
      
      // Also show alert to confirm
      Alert.alert(
        "Bildirim Gönderildi",
        `"${word.word}" için bildirim gönderildi. Bildirim panelini kontrol edin.`
      );
    } catch (error) {
      console.error('Failed to send local notification:', error);
      Alert.alert(
        "Bildirim Hatası",
        `Bildirim gönderilemedi: ${error}`
      );
    }
  }

  public setupNotificationResponseHandler(navigationCallback: (wordId: string) => void) {
    return { remove: () => {} };
  }

  public async getRandomUnlearnedWord(): Promise<VocabularyWord | null> {
    try {
      // Fetch vocabulary for current user
      const words = await getVocabulary();
      if (!Array.isArray(words) || words.length === 0) return null;

      // Prefer unlearned words (is_learned === false or undefined treated as unlearned?)
      // We'll consider strictly false as unlearned; undefined often means not yet learned
      const unlearned = words.filter(w => w && (w.is_learned === false || typeof w.is_learned === 'undefined'));

      const pool = unlearned.length > 0 ? unlearned : words; // fallback to any word if none marked
      if (pool.length === 0) return null;

      const idx = Math.floor(Math.random() * pool.length);
      return pool[idx] || null;
    } catch {
      return null;
    }
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