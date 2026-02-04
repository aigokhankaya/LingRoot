import { Alert, Platform, PermissionsAndroid, DeviceEventEmitter } from 'react-native';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import type { VocabularyWord } from './api';
import { getVocabulary } from './api';
import { ReminderSettingsService, ReminderSettings } from './reminderSettingsService';
import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';

// iOS: Early configure and native listener preserved
try {
  PushNotification.configure({
    onNotification: (notification: any) => {
      try {
        const userInfo = notification?.userInfo || notification?.data || {};
        
        // Handle audio creation notification
        if (userInfo.type === 'audio_created') {
          const audioData = typeof userInfo.audioData === 'string' 
            ? JSON.parse(userInfo.audioData) 
            : userInfo.audioData;
          
          const svc = NotificationService.getInstance?.();
          if (svc && audioData) {
            const cb = (svc as any).responseCallback as ((data: string) => void) | null;
            if (cb) cb(JSON.stringify({ type: 'audio_created', data: audioData }));
          }
          return;
        }
        
        // Handle support message notification
        if (userInfo.type === 'support_message') {
          try {
            const raw = userInfo.payload || userInfo.supportData;
            const supportData = typeof raw === 'string' 
              ? JSON.parse(raw) 
              : raw;

            const svc = NotificationService.getInstance?.();
            if (svc && supportData) {
              const cb = (svc as any).responseCallback as ((data: string) => void) | null;
              if (cb) cb(JSON.stringify({ type: 'support_message', data: supportData }));
            }
          } catch (e) {
            console.error('[NotificationService iOS] Error handling support_message notification:', e);
          }
          return;
        }
        
        // Handle vocabulary word notification
        const wordId = userInfo.wordId || userInfo?.item?.wordId;
        if (wordId) {
          const svc = NotificationService.getInstance?.();
          if (svc) {
            (svc as any).pendingWordId = String(wordId);
            const cb = (svc as any).responseCallback as ((id: string) => void) | null;
            if (cb) cb(String(wordId));
          }
        }
      } catch (e) {
        console.error('[NotificationService iOS] Error handling notification:', e);
      }
    },
    popInitialNotification: true,
    requestPermissions: false,
  } as any);
} catch (e) {
  // Silent error handling
}

// Global listener stored for cleanup capability
let notificationTapListener: { remove(): void } | null = null;
try {
  notificationTapListener = DeviceEventEmitter.addListener('LingRootNotificationTapped', (data: any) => {
    const wordId = data?.wordId;
    if (wordId) {
      const svc = NotificationService.getInstance?.();
      if (svc) {
        (svc as any).pendingWordId = String(wordId);
        const cb = (svc as any).responseCallback as ((id: string) => void) | null;
        setTimeout(() => {
          const { CommonActions } = require('@react-navigation/native');
          try {
            const navRef = (global as any).__NAVIGATION_REF__;
            if (navRef?.current) {
              navRef.current.dispatch(
                CommonActions.reset({
                  index: 1,
                  routes: [
                    { name: 'Main' },
                    { name: 'Vocabulary', params: { wordId } },
                  ],
                })
              );
            }
          } catch (e) {
            // Silent error handling
          }
        }, 100);
        if (cb) cb(String(wordId));
      }
    }
  });
} catch (e) {
  // Silent error handling
}

class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;
  private hasPermission = false;
  private pendingWordId: string | null = null;
  private responseCallback: ((wordId: string) => void) | null = null;
  private rescheduleRunning = false;
  private rescheduleQueued = false;
  private lastRescheduleAt: number = 0;
  private isConfigured = false;

  private async getLanguage(): Promise<'tr' | 'en'> {
    try {
      const lang = await AsyncStorage.getItem('app_language');
      return (lang === 'tr' || lang === 'en') ? lang : 'en';
    } catch {
      return 'en';
    }
  }

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private async rescheduleDailyReminders(): Promise<void> {
    const nowMs = Date.now();
    if (nowMs - this.lastRescheduleAt < 750) {
      console.log('⚠️ [iOS Notifications] Skipping reschedule - too soon');
      return;
    }
    if (this.rescheduleRunning) { 
      console.log('⚠️ [iOS Notifications] Reschedule already running, queuing');
      this.rescheduleQueued = true; 
      return; 
    }
    this.rescheduleRunning = true;
    this.lastRescheduleAt = nowMs;
    
    try {
      console.log('🔄 [iOS Notifications] Canceling all existing notifications');
      PushNotificationIOS.cancelAllLocalNotifications();

      let settings: ReminderSettings;
      try { settings = await ReminderSettingsService.getSettings(); }
      catch {
        const now = new Date();
        settings = {
          isEnabled: true,
          startTime: `${now.getHours()}:${String(now.getMinutes() + 1).padStart(2, '0')}`,
          endTime: `${now.getHours()}:${String(now.getMinutes() + 6).padStart(2, '0')}`,
          wordsPerDay: 5,
        } as ReminderSettings;
      }
      
      console.log('📋 [iOS Notifications] Settings:', settings);
      
      if (!settings?.isEnabled) {
        console.log('⚠️ [iOS Notifications] Reminders disabled, skipping');
        return;
      }

      const words = await getVocabulary();
      const unlearned = Array.isArray(words)
        ? words.filter(w => w && (w.is_learned === false || typeof w.is_learned === 'undefined'))
        : [];
      if (unlearned.length === 0) {
        console.log('⚠️ [iOS Notifications] No unlearned vocabulary, skipping reminders');
        return;
      }
      const times = ReminderSettingsService.calculateNotificationTimes(settings, unlearned.length);
      const selected = this.pickWordsForSlots(unlearned, words as any, times.length);

      console.log(`📅 [iOS Notifications] Scheduling ${times.length} notifications`);

      const lang = await this.getLanguage();
      
      for (let i = 0; i < times.length; i++) {
        const when = times[i];
        const word = selected[i];
        const title = lang === 'tr' ? '📚 LingRoot Hatırlatma' : '📚 LingRoot Reminder';
        const body = word 
          ? (lang === 'tr' ? `Kelime: ${word.word}${word.definition ? ' — ' + word.definition : ''}` : `Word: ${word.word}${word.definition ? ' — ' + word.definition : ''}`)
          : (lang === 'tr' ? 'Günün kelimelerini tekrar et!' : 'Review today\'s words!');
        const requestId = `lingroot_${when.getTime()}_${i}`;
        
        console.log(`⏰ [iOS Notifications] Scheduling #${i + 1} at ${when.toLocaleString('tr-TR')}`);
        
        try {
          PushNotificationIOS.addNotificationRequest({
            id: requestId,
            title,
            body,
            sound: 'default',
            badge: 1,
            userInfo: { wordId: word?.id?.toString() || '' },
            fireDate: when,
            repeats: false,
          });
        } catch {
          PushNotificationIOS.scheduleLocalNotification({
            alertTitle: title,
            alertBody: body,
            soundName: 'default',
            applicationIconBadgeNumber: 1,
            userInfo: { wordId: word?.id?.toString() || '' },
            fireDate: when.toISOString(),
          });
        }
      }
      
      console.log(`✅ [iOS Notifications] Successfully scheduled ${times.length} notifications`);
    } catch (e) {
      // Silently fail - don't show alert to user
    } finally {
      this.rescheduleRunning = false;
      if (this.rescheduleQueued) { this.rescheduleQueued = false; setTimeout(() => { this.rescheduleDailyReminders().catch(() => {}); }, 150); }
    }
  }

  private pickWordsForSlots(unlearned: VocabularyWord[], all: VocabularyWord[], count: number): VocabularyWord[] {
    const source = (unlearned.length > 0 ? [...unlearned] : [...all]).filter(Boolean);
    for (let i = source.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [source[i], source[j]] = [source[j], source[i]]; }
    const result: VocabularyWord[] = [];
    for (let i = 0; i < count; i++) result.push(source[i % Math.max(1, source.length)]);
    return result;
  }

  public async initialize(): Promise<boolean> {
    if (this.isInitialized) return this.hasPermission;
    try {
      const permissions = await PushNotificationIOS.requestPermissions({ alert: true, badge: true, sound: true });
      this.hasPermission = !!(permissions.alert || permissions.badge || permissions.sound);
      if (!this.isConfigured) {
        PushNotification.configure({
          onNotification: (notification: any) => {
            try {
              const userInfo = notification?.userInfo || notification?.data || {};
              const wordId = userInfo.wordId || userInfo?.item?.wordId;
              if (wordId) {
                if (this.responseCallback) { this.pendingWordId = String(wordId); this.responseCallback(String(wordId)); }
                else { this.pendingWordId = String(wordId); }
              }
            } catch (e) { /* Silent error handling */ }
          },
          popInitialNotification: true,
          requestPermissions: false,
        } as any);
        this.isConfigured = true;
      }
      this.isInitialized = true;
      return this.hasPermission;
    } catch (error) {
      this.isInitialized = true;
      this.hasPermission = false;
      return false;
    }
  }

  public async setupPeriodicVocabularyNotifications(): Promise<void> {
    await this.initialize();
    await this.rescheduleDailyReminders();
  }

  public async setupSmartVocabularyNotifications(): Promise<void> {
    await this.initialize();
    await this.rescheduleDailyReminders();
  }

  public async stopVocabularyReminders(): Promise<void> {
    try { PushNotificationIOS.cancelAllLocalNotifications(); } catch {}
    const lang = await this.getLanguage();
    Alert.alert(
      lang === 'tr' ? 'Bildirimler Durduruldu' : 'Notifications Stopped',
      lang === 'tr' ? 'Tüm kelime hatırlatmaları iptal edildi.' : 'All vocabulary reminders have been cancelled.'
    );
  }

  public async scheduleVocabularyNotification(word: VocabularyWord): Promise<void> {
    await this.initialize();
    const lang = await this.getLanguage();
    
    PushNotificationIOS.presentLocalNotification({
      alertTitle: lang === 'tr' ? '🎯 LingRoot Kelime' : '🎯 LingRoot Word',
      alertBody: lang === 'tr' 
        ? `${word.word} - ${word.definition || 'Tanım yok'}`
        : `${word.word} - ${word.definition || 'No definition'}`,
      soundName: 'default',
      applicationIconBadgeNumber: 1,
      userInfo: { wordId: word.id?.toString() || '' },
    });
    PushNotificationIOS.scheduleLocalNotification({
      alertTitle: lang === 'tr' ? '📚 LingRoot Hatırlatma' : '📚 LingRoot Reminder',
      alertBody: lang === 'tr'
        ? `Kelime: ${word.word} - ${word.definition || 'Tanım yok'}`
        : `Word: ${word.word} - ${word.definition || 'No definition'}`,
      soundName: 'default',
      applicationIconBadgeNumber: 1,
      userInfo: { wordId: word.id?.toString() || '' },
      fireDate: new Date(Date.now() + 3000).toISOString(),
    });
  }

  public setupNotificationResponseHandler(navigationCallback: (wordId: string) => void) {
    this.responseCallback = navigationCallback;
    if (Platform.OS === 'ios') {
      PushNotificationIOS.addEventListener('notification', (notification: any) => {
        const wordId = notification.userInfo?.wordId;
        if (wordId && navigationCallback) { this.pendingWordId = String(wordId); navigationCallback(wordId); }
      });
      PushNotificationIOS.addEventListener('localNotification', (notification: any) => {
        const wordId = notification.userInfo?.wordId;
        if (wordId && navigationCallback) { this.pendingWordId = String(wordId); navigationCallback(wordId); }
      });
    }
    return { remove: () => { try { PushNotificationIOS.removeEventListener('notification'); } catch {} try { PushNotificationIOS.removeEventListener('localNotification'); } catch {} this.responseCallback = null; } };
  }

  public cleanup(): void {
    notificationTapListener?.remove();
    notificationTapListener = null;
    this.responseCallback = null;
    this.pendingWordId = null;
  }

  public consumePendingWordId(): string | null { const id = this.pendingWordId; this.pendingWordId = null; return id; }

  public async getRandomUnlearnedWord(): Promise<VocabularyWord | null> {
    try {
      const words = await getVocabulary();
      if (!Array.isArray(words) || words.length === 0) return null;
      const unlearned = words.filter(w => w && (w.is_learned === false || typeof w.is_learned === 'undefined'));
      const pool = unlearned.length > 0 ? unlearned : words;
      if (pool.length === 0) return null;
      const idx = Math.floor(Math.random() * pool.length);
      return pool[idx] || null;
    } catch { return null; }
  }

  public async getStatus(): Promise<{ isInitialized: boolean; hasPermission: boolean; scheduledCount: number }> {
    try {
      return { isInitialized: this.isInitialized, hasPermission: this.hasPermission, scheduledCount: 0 };
    } catch { return { isInitialized: this.isInitialized, hasPermission: this.hasPermission, scheduledCount: 0 }; }
  }

  /**
   * Show audio creation notification (iOS)
   * @param audioData - Audio track data from notification
   */
  public async showAudioCreatedNotification(audioData: any): Promise<void> {
    await this.initialize();
    if (!this.hasPermission) return;

    try {
      const lang = await this.getLanguage();
      
      PushNotificationIOS.addNotificationRequest({
        id: `audio_${Date.now()}`,
        title: lang === 'tr' ? '🎵 Ses Oluşturuldu!' : '🎵 Audio Created!',
        body: audioData.title || (lang === 'tr' ? 'Sesiniz hazır. Dinlemek için tıklayın.' : 'Your audio is ready. Tap to listen.'),
        sound: 'default',
        badge: 1,
        userInfo: { 
          type: 'audio_created',
          audioData: JSON.stringify(audioData)
        },
      });
    } catch (error) {
      console.error('[NotificationService iOS] Error showing audio notification:', error);
    }
  }
}

export default NotificationService.getInstance();
