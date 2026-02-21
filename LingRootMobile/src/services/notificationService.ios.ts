import { Alert, Platform, PermissionsAndroid, DeviceEventEmitter } from 'react-native';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import type { VocabularyWord } from './api';
import { getVocabulary } from './api';
import { ReminderSettingsService, ReminderSettings } from './reminderSettingsService';
import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createVocabularyNotification, deleteScheduledVocabularyReminders, getNotificationUnreadCount } from './userService';

// Storage key for scheduled notifications (iOS fireDate parsing workaround)
const SCHEDULED_NOTIFICATIONS_KEY = 'scheduled_vocabulary_notifications';

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

  private async rescheduleDailyReminders(force = false): Promise<void> {
    console.log('🚀 [iOS Notifications] rescheduleDailyReminders called (force:', force, ')');

    // If not forced and future notifications exist, skip rescheduling
    if (!force) {
      try {
        const existingNotifications = await this.getScheduledNotifications();
        const futureNotifications = existingNotifications.filter(n => n.fireDate > new Date());
        if (futureNotifications.length > 0) {
          console.log(`⏭️ [iOS Notifications] Skipping reschedule - ${futureNotifications.length} future notifications exist`);
          return;
        }
      } catch {}
    }

    const nowMs = Date.now();
    if (nowMs - this.lastRescheduleAt < 750) {
      console.log('⚠️ [iOS Notifications] Skipping reschedule - too soon (last was', nowMs - this.lastRescheduleAt, 'ms ago)');
      return;
    }
    if (this.rescheduleRunning) {
      console.log('⚠️ [iOS Notifications] Reschedule already running, queuing');
      this.rescheduleQueued = true;
      return;
    }
    this.rescheduleRunning = true;
    this.lastRescheduleAt = nowMs;
    console.log('✅ [iOS Notifications] Starting reschedule process');

    try {
      console.log('🔄 [iOS Notifications] Canceling all existing notifications');

      // First, get all pending notifications and cancel them by ID
      try {
        const pending = await this.getScheduledNotifications();
        console.log(`🗑️ [iOS Notifications] Found ${pending.length} pending notifications to cancel`);
        for (const notif of pending) {
          if (notif.id) {
            try {
              PushNotificationIOS.removePendingNotificationRequests([notif.id]);
            } catch {}
          }
        }
      } catch {}

      // Use both old and new APIs to ensure all notifications are cleared
      try { PushNotificationIOS.cancelAllLocalNotifications(); } catch {}
      try { PushNotificationIOS.removeAllPendingNotificationRequests(); } catch {}
      try { PushNotificationIOS.removeAllDeliveredNotifications(); } catch {}

      // Also clear backend scheduled vocabulary reminders to avoid duplicates
      try {
        const deleted = await deleteScheduledVocabularyReminders();
        console.log(`🗑️ [iOS Notifications] Deleted ${deleted} backend reminders`);
      } catch (e) {
        console.log('[iOS Notifications] Failed to delete backend reminders:', e);
      }

      // Wait for iOS to process cancellations before scheduling new ones
      await new Promise(resolve => setTimeout(resolve, 500));

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
      console.log('🕐 [iOS Notifications] Calculated times:', times.map(t => t.toLocaleString('tr-TR')));
      const selected = this.pickWordsForSlots(unlearned, words as any, times.length);

      console.log(`📅 [iOS Notifications] Scheduling ${times.length} notifications for ${selected.length} words`);

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
            userInfo: { wordId: word?.id?.toString() || '' },
            fireDate: when,
            repeats: false,
          });
        } catch {
          PushNotificationIOS.scheduleLocalNotification({
            alertTitle: title,
            alertBody: body,
            soundName: 'default',
            userInfo: { wordId: word?.id?.toString() || '' },
            fireDate: when.toISOString(),
          });
        }

        // Save to backend for Notifications screen display
        if (word?.id) {
          try {
            await createVocabularyNotification(
              word.id.toString(),
              word.word,
              word.definition,
              when.toISOString() // scheduledFor - will only show after this time
            );
          } catch (e) {
            console.log('[iOS Notifications] Backend save failed:', e);
          }
        }
      }

      // Save scheduled notifications to AsyncStorage for reliable time display
      const scheduledList = times.map((when, i) => ({
        id: `lingroot_${when.getTime()}_${i}`,
        fireDate: when.toISOString(),
        word: selected[i]?.word || '',
        definition: selected[i]?.definition || '',
        wordId: selected[i]?.id?.toString() || '',
      }));
      try {
        await AsyncStorage.setItem(SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify(scheduledList));
        console.log(`💾 [iOS Notifications] Saved ${scheduledList.length} notifications to AsyncStorage`);
      } catch (e) {
        console.log('[iOS Notifications] AsyncStorage save failed:', e);
      }

      console.log(`✅ [iOS Notifications] Successfully scheduled ${times.length} notifications`);

      // Verify scheduled notifications
      await new Promise(resolve => setTimeout(resolve, 200));
      try {
        const scheduled = await this.getScheduledNotifications();
        console.log(`📊 [iOS Notifications] Verification: ${scheduled.length} notifications in queue`);
        scheduled.slice(0, 3).forEach((n, i) => {
          console.log(`   ${i + 1}. ${n.fireDate.toLocaleString('tr-TR')} - ${n.body?.substring(0, 30)}...`);
        });
      } catch {}
    } catch (e) {
      console.error('❌ [iOS Notifications] Error scheduling:', e);
      // Silently fail - don't show alert to user
    } finally {
      this.rescheduleRunning = false;
      if (this.rescheduleQueued) { this.rescheduleQueued = false; setTimeout(() => { this.rescheduleDailyReminders(force).catch(() => {}); }, 150); }
    }
  }

  private pickWordsForSlots(unlearned: VocabularyWord[], all: VocabularyWord[], count: number): VocabularyWord[] {
    const source = (unlearned.length > 0 ? [...unlearned] : [...all]).filter(Boolean);
    // Shuffle the source array (Fisher-Yates)
    for (let i = source.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [source[i], source[j]] = [source[j], source[i]];
    }
    // Return only up to available words - NO REPEATING
    // Each word should appear only once
    const actualCount = Math.min(count, source.length);
    return source.slice(0, actualCount);
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

  public async setupPeriodicVocabularyNotifications(force = false): Promise<void> {
    await this.initialize();
    await this.rescheduleDailyReminders(force);
  }

  public async setupSmartVocabularyNotifications(force = false): Promise<void> {
    await this.initialize();
    await this.rescheduleDailyReminders(force);
  }

  public async stopVocabularyReminders(): Promise<void> {
    // First, cancel all notifications by ID
    try {
      const pending = await this.getScheduledNotifications();
      console.log(`🗑️ [iOS Notifications] Stopping ${pending.length} vocabulary reminders`);
      for (const notif of pending) {
        if (notif.id) {
          try {
            PushNotificationIOS.removePendingNotificationRequests([notif.id]);
          } catch {}
        }
      }
    } catch {}

    // Use all available methods to clear notifications
    try { PushNotificationIOS.cancelAllLocalNotifications(); } catch {}
    try { PushNotificationIOS.removeAllPendingNotificationRequests(); } catch {}
    try { PushNotificationIOS.removeAllDeliveredNotifications(); } catch {}

    // Clear AsyncStorage
    try {
      await AsyncStorage.removeItem(SCHEDULED_NOTIFICATIONS_KEY);
      console.log('🗑️ [iOS Notifications] Cleared AsyncStorage scheduled notifications');
    } catch {}

    // Wait for iOS to process
    await new Promise(resolve => setTimeout(resolve, 300));

    // Verify cancellation
    try {
      const remaining = await this.getScheduledNotifications();
      console.log(`✅ [iOS Notifications] After stop: ${remaining.length} notifications remaining`);
    } catch {}
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
      userInfo: { wordId: word.id?.toString() || '' },
    });
    PushNotificationIOS.scheduleLocalNotification({
      alertTitle: lang === 'tr' ? '📚 LingRoot Hatırlatma' : '📚 LingRoot Reminder',
      alertBody: lang === 'tr'
        ? `Kelime: ${word.word} - ${word.definition || 'Tanım yok'}`
        : `Word: ${word.word} - ${word.definition || 'No definition'}`,
      soundName: 'default',
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
      const pending = await this.getScheduledNotifications();
      return { isInitialized: this.isInitialized, hasPermission: this.hasPermission, scheduledCount: pending.length };
    } catch { return { isInitialized: this.isInitialized, hasPermission: this.hasPermission, scheduledCount: 0 }; }
  }

  public async getScheduledNotifications(): Promise<Array<{ id: string; title: string; body: string; fireDate: Date; wordId?: string }>> {
    // Read from AsyncStorage for reliable time display (iOS fireDate parsing workaround)
    try {
      const stored = await AsyncStorage.getItem(SCHEDULED_NOTIFICATIONS_KEY);
      if (stored) {
        const list = JSON.parse(stored);
        const lang = await this.getLanguage();
        const now = new Date();
        const notifications = list
          .map((item: { id: string; fireDate: string; word: string; definition: string; wordId: string }) => ({
            id: item.id,
            title: lang === 'tr' ? '📚 LingRoot Hatırlatma' : '📚 LingRoot Reminder',
            body: lang === 'tr'
              ? `Kelime: ${item.word}${item.definition ? ' — ' + item.definition : ''}`
              : `Word: ${item.word}${item.definition ? ' — ' + item.definition : ''}`,
            fireDate: new Date(item.fireDate),
            wordId: item.wordId,
          }))
          .filter((n: { fireDate: Date }) => n.fireDate > now) // Filter out past notifications
          .sort((a: { fireDate: Date }, b: { fireDate: Date }) => a.fireDate.getTime() - b.fireDate.getTime());

        console.log(`📋 [iOS Notifications] Loaded ${notifications.length} scheduled notifications from AsyncStorage`);
        return notifications;
      }
    } catch (e) {
      console.log('[iOS Notifications] AsyncStorage read failed:', e);
    }

    // Fallback: try to read from iOS (may have incorrect times)
    return new Promise((resolve) => {
      try {
        PushNotificationIOS.getPendingNotificationRequests((requests) => {
          console.log('📋 [iOS Notifications] Raw pending requests (fallback):', JSON.stringify(requests.slice(0, 3), null, 2));
          const notifications = requests.map((req: any) => {
            // iOS may return fireDate as Date object, ISO string, or timestamp
            let fireDate: Date;
            if (req.fireDate instanceof Date) {
              fireDate = req.fireDate;
            } else if (typeof req.fireDate === 'string') {
              fireDate = new Date(req.fireDate);
            } else if (typeof req.fireDate === 'number') {
              fireDate = new Date(req.fireDate);
            } else if (req.trigger?.timestamp) {
              // iOS 10+ trigger-based notifications
              fireDate = new Date(req.trigger.timestamp * 1000);
            } else if (req.trigger?.dateComponents) {
              // iOS date components trigger
              const dc = req.trigger.dateComponents;
              fireDate = new Date(dc.year || new Date().getFullYear(), (dc.month || 1) - 1, dc.day || 1, dc.hour || 0, dc.minute || 0, dc.second || 0);
            } else {
              console.log('⚠️ [iOS Notifications] Unknown fireDate format:', req);
              fireDate = new Date();
            }
            return {
              id: req.id || req.identifier || '',
              title: req.title || req.alertTitle || '',
              body: req.body || req.alertBody || '',
              fireDate,
              wordId: req.userInfo?.wordId || undefined,
            };
          });
          // Sort by fireDate ascending
          notifications.sort((a, b) => a.fireDate.getTime() - b.fireDate.getTime());
          resolve(notifications);
        });
      } catch {
        resolve([]);
      }
    });
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
        userInfo: {
          type: 'audio_created',
          audioData: JSON.stringify(audioData)
        },
      });
      // Sync badge after showing notification
      await this.syncBadgeWithBackend();
    } catch (error) {
      console.error('[NotificationService iOS] Error showing audio notification:', error);
    }
  }

  /**
   * Update the app icon badge number
   */
  public updateBadgeCount(count: number): void {
    try {
      PushNotificationIOS.setApplicationIconBadgeNumber(count);
      console.log(`🔢 [iOS Notifications] Badge updated to ${count}`);
    } catch (error) {
      console.error('[NotificationService iOS] Error updating badge:', error);
    }
  }

  /**
   * Sync badge count with backend unread notifications
   */
  public async syncBadgeWithBackend(): Promise<void> {
    try {
      const unreadCount = await getNotificationUnreadCount();
      this.updateBadgeCount(unreadCount);
    } catch (error) {
      console.error('[NotificationService iOS] Error syncing badge:', error);
    }
  }

  /**
   * Clear the app icon badge
   */
  public clearBadge(): void {
    this.updateBadgeCount(0);
  }
}

export default NotificationService.getInstance();
