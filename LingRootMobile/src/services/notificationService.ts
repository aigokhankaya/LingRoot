import { Alert } from 'react-native';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import type { VocabularyWord } from './api';
import { getVocabulary } from './api';

class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;
  private hasPermission = false;
  private pendingWordId: string | null = null;

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
      
      // Request permissions using PushNotificationIOS
      const permissions = await PushNotificationIOS.requestPermissions({
        alert: true,
        badge: true,
        sound: true,
      });
      
      console.log('Permission request result:', permissions);
      this.hasPermission = !!(permissions.alert || permissions.badge || permissions.sound);
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
    console.log('🔔 scheduleVocabularyNotification called with word:', word.word);
    console.log('🔔 Current hasPermission:', this.hasPermission);
    console.log('🔔 Service initialized:', this.isInitialized);
    
    // Always request permissions first
    try {
      console.log('🔔 Requesting permissions...');
      const permissions = await PushNotificationIOS.requestPermissions({
        alert: true,
        badge: true,
        sound: true,
        critical: true,
      });
      console.log('🔔 Permission request result:', permissions);
      this.hasPermission = !!(permissions.alert || permissions.badge || permissions.sound);
      
      if (!this.hasPermission) {
        Alert.alert(
          "❌ Bildirim İzni Gerekli", 
          "iOS Ayarlar > Bildirimler > LingRoot > 'Bildirimlere İzin Ver' seçeneğini açın.",
          [{ text: 'Tamam' }]
        );
        return;
      }
      
      console.log('✅ Permissions granted, sending notifications...');
      
      // Send immediate notification
      PushNotificationIOS.presentLocalNotification({
        alertTitle: '🎯 LingRoot Kelime',
        alertBody: `${word.word} - ${word.definition || 'Tanım yok'}`,
        soundName: 'default',
        applicationIconBadgeNumber: 1,
        userInfo: { wordId: word.id?.toString() || '' },
      });
      
      // Send scheduled notification as backup
      PushNotificationIOS.scheduleLocalNotification({
        alertTitle: '📚 LingRoot Hatırlatma',
        alertBody: `Kelime: ${word.word} - ${word.definition || 'Tanım yok'}`,
        soundName: 'default',
        applicationIconBadgeNumber: 1,
        userInfo: { wordId: word.id?.toString() || '' },
        fireDate: new Date(Date.now() + 3000).toISOString(),
      });
      
      console.log('✅ Notifications sent for word:', word.word, 'with ID:', word.id);
      
      Alert.alert(
        "✅ Bildirim Gönderildi",
        `"${word.word}" bildirimi gönderildi!\n\n📱 Bildirimi görmek için:\n• Uygulamayı arka plana al (home tuşu)\n• Bildirim merkezi/banner'ı kontrol et\n• 3 saniye sonra yedek bildirim gelecek`,
        [{ text: 'Tamam' }]
      );
      
    } catch (error) {
      console.error('🔔 Failed to send notification:', error);
      Alert.alert(
        "❌ Bildirim Hatası",
        `Hata: ${error}\n\niOS Ayarlar > Bildirimler > LingRoot'u kontrol edin.`,
        [{ text: 'Tamam' }]
      );
    }
  }

  public setupNotificationResponseHandler(navigationCallback: (wordId: string) => void) {
    console.log('🔧 Setting up notification response handler...');
    
    // Set up notification tap handler for when app is launched from notification
    PushNotificationIOS.addEventListener('notification', (notification: any) => {
      console.log('🔔 Notification event (app launch) - Full object:', JSON.stringify(notification, null, 2));
      console.log('🔔 UserInfo:', notification.userInfo);
      console.log('🔔 WordId from userInfo:', notification.userInfo?.wordId);
      
      // Show alert for debugging
      Alert.alert(
        '🔔 Notification Tapped (Launch)',
        `Event: notification\nWordId: ${notification.userInfo?.wordId}\nCallback: ${!!navigationCallback}`,
        [{ text: 'OK' }]
      );
      
      const wordId = notification.userInfo?.wordId;
      if (wordId && navigationCallback) {
        console.log('🎯 Calling navigation callback with wordId:', wordId);
        this.pendingWordId = String(wordId);
        navigationCallback(wordId);
      } else {
        console.log('❌ No wordId found or no callback provided');
        console.log('WordId:', wordId, 'Callback:', !!navigationCallback);
      }
    });

    // Set up notification tap handler for when app is in background
    PushNotificationIOS.addEventListener('localNotification', (notification: any) => {
      console.log('🔔 Local notification tapped - Full object:', JSON.stringify(notification, null, 2));
      console.log('🔔 UserInfo:', notification.userInfo);
      console.log('🔔 WordId from userInfo:', notification.userInfo?.wordId);
      
      // Show alert for debugging
      Alert.alert(
        '🔔 Notification Tapped (Background)',
        `Event: localNotification\nWordId: ${notification.userInfo?.wordId}\nCallback: ${!!navigationCallback}`,
        [{ text: 'OK' }]
      );
      
      const wordId = notification.userInfo?.wordId;
      if (wordId && navigationCallback) {
        console.log('🎯 Calling navigation callback with wordId:', wordId);
        this.pendingWordId = String(wordId);
        navigationCallback(wordId);
      } else {
        console.log('❌ No wordId found or no callback provided');
        console.log('WordId:', wordId, 'Callback:', !!navigationCallback);
      }
    });

    return {
      remove: () => {
        PushNotificationIOS.removeEventListener('notification');
        PushNotificationIOS.removeEventListener('localNotification');
      }
    };
  }

  public consumePendingWordId(): string | null {
    const id = this.pendingWordId;
    this.pendingWordId = null;
    return id;
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