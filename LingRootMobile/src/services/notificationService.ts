import { Alert, Platform, PermissionsAndroid } from 'react-native';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import type { VocabularyWord } from './api';
import { getVocabulary } from './api';
import { ReminderSettingsService } from './reminderSettingsService';
import PushNotification from 'react-native-push-notification';

// Ensure onNotification is configured as early as possible (at module load)
try {
  PushNotification.configure({
    onNotification: (notification: any) => {
      try {
        const userInfo = notification?.userInfo || notification?.data || {};
        const wordId = userInfo.wordId || userInfo?.item?.wordId;
        console.log('🔔 onNotification (early configure) userInfo:', userInfo, 'wordId:', wordId);
        if (wordId) {
          const svc = NotificationService.getInstance?.();
          if (svc) {
            (svc as any).pendingWordId = String(wordId);
            const cb = (svc as any).responseCallback as ((id: string) => void) | null;
            if (cb) cb(String(wordId));
          }
        }
      } catch (e) {
        console.log('early onNotification error', e);
      }
    },
    popInitialNotification: true,
    requestPermissions: false,
  } as any);
} catch (e) {
  console.log('Early PushNotification.configure failed (safe to ignore at build time):', e);
}

// Listen for custom native notification events (iOS foreground tap fix)
import { DeviceEventEmitter } from 'react-native';
try {
  DeviceEventEmitter.addListener('LingRootNotificationTapped', (data: any) => {
    console.log('📱 Native tap event received:', data);
    const wordId = data?.wordId;
    if (wordId) {
      const svc = NotificationService.getInstance?.();
      if (svc) {
        (svc as any).pendingWordId = String(wordId);
        const cb = (svc as any).responseCallback as ((id: string) => void) | null;
        console.log('📱 Callback available:', !!cb);
        
        // Always try direct navigation first since callback timing is unreliable
        setTimeout(() => {
          const { CommonActions } = require('@react-navigation/native');
          try {
            const navRef = (global as any).__NAVIGATION_REF__;
            if (navRef?.current) {
              console.log('📱 Direct navigation triggered for wordId:', wordId);
              navRef.current.dispatch(
                CommonActions.reset({
                  index: 1,
                  routes: [
                    { name: 'Main' },
                    { name: 'Vocabulary', params: { wordId } },
                  ],
                })
              );
            } else {
              console.log('📱 Navigation ref not available');
            }
          } catch (e) {
            console.log('Direct navigation failed:', e);
          }
        }, 100);
        
        // Also try callback if available
        if (cb) {
          console.log('📱 Also calling navigation callback with wordId:', wordId);
          cb(String(wordId));
        }
      }
    }
  });
} catch (e) {
  console.log('Native event listener setup failed:', e);
}

class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;
  private hasPermission = false;
  private pendingWordId: string | null = null;
  private responseCallback: ((wordId: string) => void) | null = null;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Recreate today's reminder notifications according to user's reminder settings.
   */
  private async rescheduleDailyReminders(): Promise<void> {
    try {
      // 1) Cancel previous ones
      if (Platform.OS === 'ios') {
        PushNotificationIOS.cancelAllLocalNotifications();
      } else {
        PushNotification.cancelAllLocalNotifications();
        PushNotification.removeAllDeliveredNotifications?.();
      }

      // 2) Read settings
      const settings = await ReminderSettingsService.getSettings();
      if (!settings?.isEnabled) {
        return; // disabled
      }

      // 3) Load vocabulary and compute unlearned words
      const words = await getVocabulary();
      const unlearned = Array.isArray(words)
        ? words.filter(w => w && (w.is_learned === false || typeof w.is_learned === 'undefined'))
        : [];

      const unlearnedCount = unlearned.length;

      // 4) Compute notification times for today
      const times = ReminderSettingsService.calculateNotificationTimes(settings, unlearnedCount);

      // 5) Choose words for each slot
      const selectedWords = this.pickWordsForSlots(unlearned, words, times.length);

      // 6) Schedule notifications
      for (let i = 0; i < times.length; i++) {
        const when = times[i];
        const word = selectedWords[i];
        const title = '📚 LingRoot Hatırlatma';
        const body = word
          ? `Kelime: ${word.word}${word.definition ? ' — ' + word.definition : ''}`
          : 'Günün kelimelerini tekrar et!';

        console.log(`[Reminder] Scheduling (${i + 1}/${times.length}) at`, when.toString(), 'word:', word?.word);

        if (Platform.OS === 'ios') {
          // Prefer the newer API for scheduling on iOS
          let modernOk = false;
          try {
            PushNotificationIOS.addNotificationRequest({
              id: `lingroot_${when.getTime()}_${i}`,
              title,
              body,
              sound: 'default',
              badge: 1,
              userInfo: { wordId: word?.id?.toString() || '' },
              fireDate: when,
              // Repeat daily at the same time
              repeats: true,
            });
            modernOk = true;
          } catch (err) {
            console.log('addNotificationRequest failed, will use legacy API', err);
          }
          // Also schedule with legacy API as redundancy
          try {
            PushNotificationIOS.scheduleLocalNotification({
              alertTitle: title,
              alertBody: body,
              soundName: 'default',
              applicationIconBadgeNumber: 1,
              userInfo: { wordId: word?.id?.toString() || '' },
              fireDate: when.toISOString(),
            });
          } catch (legacyErr) {
            if (!modernOk) {
              console.log('Both modern and legacy iOS scheduling failed:', legacyErr);
            }
          }

          // Schedule via react-native-push-notification as well so `configure.onNotification` is triggered reliably on iOS
          try {
            PushNotification.localNotificationSchedule({
              title,
              message: body,
              date: when,
              playSound: true,
              soundName: 'default',
              userInfo: { wordId: word?.id?.toString() || '' } as any,
            });
          } catch (crossErr) {
            console.log('iOS cross-schedule via react-native-push-notification failed:', crossErr);
          }
        } else {
          PushNotification.localNotificationSchedule({
            channelId: 'lingroot-reminders',
            title,
            message: body,
            date: when,
            allowWhileIdle: true,
            playSound: true,
            soundName: 'default',
            userInfo: { wordId: word?.id?.toString() || '' } as any,
            // Repeat daily at the same time
            repeatType: 'day',
          });
        }
      }

      // No user-facing success alerts or extra debug notifications
    } catch (e) {
      console.error('rescheduleDailyReminders error:', e);
      // best-effort — show info for debugging
      Alert.alert('❌ Bildirim Hatası', 'Hatırlatmalar planlanamadı.');
    }
  }

  /**
   * Selects a word for each notification slot. Prefer unlearned; fallback to any vocabulary.
   */
  private pickWordsForSlots(unlearned: VocabularyWord[], all: VocabularyWord[], count: number): VocabularyWord[] {
    const source = (unlearned.length > 0 ? [...unlearned] : [...all]).filter(Boolean);
    // Shuffle source
    for (let i = source.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [source[i], source[j]] = [source[j], source[i]];
    }
    const result: VocabularyWord[] = [];
    for (let i = 0; i < count; i++) {
      result.push(source[i % Math.max(1, source.length)]);
    }
    return result;
  }

  public async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return this.hasPermission;
    }

    try {
      console.log('Starting notification service initialization...');

      if (Platform.OS === 'ios') {
        // iOS permission
        const permissions = await PushNotificationIOS.requestPermissions({
          alert: true,
          badge: true,
          sound: true,
        });
        console.log('iOS permission request result:', permissions);
        this.hasPermission = !!(permissions.alert || permissions.badge || permissions.sound);
      } else {
        // Android: create a default channel for reminders
        PushNotification.createChannel(
          {
            channelId: 'lingroot-reminders',
            channelName: 'LingRoot Reminders',
            channelDescription: 'Günlük kelime hatırlatma bildirimleri',
            importance: 4, // high
            vibrate: true,
            soundName: 'default',
          },
          (created: boolean) => console.log('Android channel created:', created)
        );
        // Android 13+ runtime permission (POST_NOTIFICATIONS)
        try {
          const apiLevel = Number(Platform.Version) || 0;
          if (apiLevel >= 33) {
            const result = await PermissionsAndroid.request(
              'android.permission.POST_NOTIFICATIONS' as any
            );
            this.hasPermission = result === PermissionsAndroid.RESULTS.GRANTED;
          } else {
            this.hasPermission = true; // no runtime permission below 33
          }
        } catch (err) {
          console.warn('Android notification permission request failed:', err);
          this.hasPermission = true; // best-effort
        }
      }

      // Configure a cross-platform notification handler (works on iOS and Android)
      try {
        PushNotification.configure({
          onNotification: (notification: any) => {
            try {
              const userInfo = notification?.userInfo || notification?.data || {};
              const wordId = userInfo.wordId || userInfo?.item?.wordId;
              console.log('🔔 onNotification (configure) userInfo:', userInfo, 'wordId:', wordId);
              if (wordId) {
                if (this.responseCallback) {
                  this.pendingWordId = String(wordId);
                  this.responseCallback(String(wordId));
                } else {
                  this.pendingWordId = String(wordId);
                }
              }
            } catch (e) {
              console.log('onNotification handler error', e);
            }
          },
          popInitialNotification: true,
          requestPermissions: false,
        } as any);
      } catch (cfgErr) {
        console.log('PushNotification.configure failed or not available:', cfgErr);
      }

      this.isInitialized = true;
      console.log('Notification service initialized, hasPermission:', this.hasPermission, 'platform:', Platform.OS);
      return this.hasPermission;
    } catch (error) {
      console.error('Notification initialization error:', error);
      this.isInitialized = true;
      this.hasPermission = false;
      return false;
    }
  }

  public async setupPeriodicVocabularyNotifications(): Promise<void> {
    // Ensure initialized and permissions handled per platform
    await this.initialize();
    if (!this.hasPermission && Platform.OS !== 'ios') return; // proceed on iOS to allow local scheduling
    await this.rescheduleDailyReminders();
  }

  public async setupSmartVocabularyNotifications(): Promise<void> {
    await this.initialize();
    if (!this.hasPermission && Platform.OS !== 'ios') return; // proceed on iOS to allow local scheduling
    await this.rescheduleDailyReminders();
  }

  public async stopVocabularyReminders(): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        PushNotificationIOS.cancelAllLocalNotifications();
      } else {
        PushNotification.cancelAllLocalNotifications();
        PushNotification.removeAllDeliveredNotifications?.();
      }
      Alert.alert(
        "Bildirimler Durduruldu", 
        "Tüm kelime hatırlatmaları iptal edildi."
      );
    } catch (e) {
      // silent
    }
  }

  public async scheduleVocabularyNotification(word: VocabularyWord): Promise<void> {
    console.log('🔔 scheduleVocabularyNotification called with word:', word.word);
    console.log('🔔 Current hasPermission:', this.hasPermission);
    console.log('🔔 Service initialized:', this.isInitialized);
    
    // Always ensure permissions first by platform
    try {
      console.log('🔔 Ensuring permissions...');
      if (Platform.OS === 'ios') {
        const permissions = await PushNotificationIOS.requestPermissions({
          alert: true,
          badge: true,
          sound: true,
          critical: true,
        });
        console.log('🔔 iOS permission request result:', permissions);
        this.hasPermission = !!(permissions.alert || permissions.badge || permissions.sound);
        if (!this.hasPermission) {
          Alert.alert(
            "❌ Bildirim İzni Gerekli", 
            "iOS Ayarlar > Bildirimler > LingRoot > 'Bildirimlere İzin Ver' seçeneğini açın.",
            [{ text: 'Tamam' }]
          );
          return;
        }
      } else {
        // Android runtime permission for API 33+
        const apiLevel = Number(Platform.Version) || 0;
        if (apiLevel >= 33) {
          const result = await PermissionsAndroid.request(
            'android.permission.POST_NOTIFICATIONS' as any
          );
          this.hasPermission = result === PermissionsAndroid.RESULTS.GRANTED;
        } else {
          this.hasPermission = true;
        }
      }

      console.log('✅ Permissions ensured, sending notifications...');
      
      if (Platform.OS === 'ios') {
        // iOS immediate notification
        PushNotificationIOS.presentLocalNotification({
          alertTitle: '🎯 LingRoot Kelime',
          alertBody: `${word.word} - ${word.definition || 'Tanım yok'}`,
          soundName: 'default',
          applicationIconBadgeNumber: 1,
          userInfo: { wordId: word.id?.toString() || '' },
        });
        // backup after 3s
        PushNotificationIOS.scheduleLocalNotification({
          alertTitle: '📚 LingRoot Hatırlatma',
          alertBody: `Kelime: ${word.word} - ${word.definition || 'Tanım yok'}`,
          soundName: 'default',
          applicationIconBadgeNumber: 1,
          userInfo: { wordId: word.id?.toString() || '' },
          fireDate: new Date(Date.now() + 3000).toISOString(),
        });

        // Also fire a local notification through react-native-push-notification so onNotification handler runs
        try {
          PushNotification.localNotification({
            title: '🎯 LingRoot Kelime',
            message: `${word.word} - ${word.definition || 'Tanım yok'}`,
            playSound: true,
            soundName: 'default',
            userInfo: { wordId: word.id?.toString() || '' } as any,
          });
        } catch (e) {
          console.log('iOS localNotification via RN Push Notification failed:', e);
        }
      } else {
        // Android immediate notification
        PushNotification.localNotification({
          channelId: 'lingroot-reminders',
          title: '🎯 LingRoot Kelime',
          message: `${word.word} - ${word.definition || 'Tanım yok'}`,
          playSound: true,
          soundName: 'default',
          userInfo: { wordId: word.id?.toString() || '' } as any,
        });
        // backup after 3s
        PushNotification.localNotificationSchedule({
          channelId: 'lingroot-reminders',
          title: '📚 LingRoot Hatırlatma',
          message: `Kelime: ${word.word} - ${word.definition || 'Tanım yok'}`,
          date: new Date(Date.now() + 3000),
          allowWhileIdle: true,
          playSound: true,
          soundName: 'default',
          userInfo: { wordId: word.id?.toString() || '' } as any,
        });
      }
      
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
    this.responseCallback = navigationCallback;
    console.log('🔧 Callback registered:', !!navigationCallback);
    
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
        try { PushNotificationIOS.removeEventListener('notification'); } catch {}
        try { PushNotificationIOS.removeEventListener('localNotification'); } catch {}
        this.responseCallback = null;
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
    try {
      if (Platform.OS === 'ios') {
        const scheduledCount = await new Promise<number>((resolve) => {
          try {
            // @ts-ignore: RN community API provides this callback-style method
            PushNotificationIOS.getScheduledLocalNotifications((list: any[]) => {
              resolve(Array.isArray(list) ? list.length : 0);
            });
          } catch {
            resolve(0);
          }
        });
        return {
          isInitialized: this.isInitialized,
          hasPermission: this.hasPermission,
          scheduledCount,
        };
      }
      // Android: no simple getter; return 0
      return {
        isInitialized: this.isInitialized,
        hasPermission: this.hasPermission,
        scheduledCount: 0,
      };
    } catch {
      return {
        isInitialized: this.isInitialized,
        hasPermission: this.hasPermission,
        scheduledCount: 0,
      };
    }
  }
}

export default NotificationService.getInstance();