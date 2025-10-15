import { Alert, Platform, PermissionsAndroid } from 'react-native';
import type { VocabularyWord } from './api';
import { getVocabulary } from './api';
import { ReminderSettingsService, ReminderSettings } from './reminderSettingsService';
import PushNotification from 'react-native-push-notification';

class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;
  private isConfigured = false;
  private hasPermission = false;
  private pendingWordId: string | null = null;
  private responseCallback: ((wordId: string) => void) | null = null;
  private rescheduleRunning = false;
  private rescheduleQueued = false;
  private lastRescheduleAt: number = 0;
  private scheduledCount: number = 0;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private async ensureChannel() {
    return new Promise<void>((resolve) => {
      try {
        PushNotification.createChannel(
          {
            channelId: 'lingroot-reminders',
            channelName: 'LingRoot Reminders',
            channelDescription: 'Günlük kelime hatırlatma bildirimleri',
            importance: 4,
            vibrate: true,
            soundName: 'default',
          },
          () => resolve()
        );
      } catch {
        resolve();
      }
    });
  }

  private configureOnce() {
    if (this.isConfigured) return;
    try {
      PushNotification.configure({
        onNotification: (notification: any) => {
          try {
            const userInfo = notification?.userInfo || notification?.data || {};
            const wordId = userInfo.wordId || userInfo?.item?.wordId;
            if (wordId) {
              if (this.responseCallback) {
                this.pendingWordId = String(wordId);
                this.responseCallback(String(wordId));
              } else {
                this.pendingWordId = String(wordId);
              }
            }
          } catch (e) {
            // Silent error handling
          }
        },
        popInitialNotification: true,
        requestPermissions: false,
      } as any);
      this.isConfigured = true;
    } catch (e) {
      // Silent error handling
    }
  }

  public async initialize(): Promise<boolean> {
    if (this.isInitialized) return this.hasPermission;
    try {
      // Channel
      await this.ensureChannel();
      // Runtime permission API 33+
      try {
        const apiLevel = Number(Platform.Version) || 0;
        if (apiLevel >= 33) {
          const result = await PermissionsAndroid.request(
            'android.permission.POST_NOTIFICATIONS' as any
          );
          this.hasPermission = result === PermissionsAndroid.RESULTS.GRANTED;
        } else {
          this.hasPermission = true;
        }
      } catch (e) {
        this.hasPermission = true;
      }
      // Configure
      this.configureOnce();
      this.isInitialized = true;
      return this.hasPermission;
    } catch (e) {
      this.isInitialized = true;
      this.hasPermission = false;
      return false;
    }
  }

  private pickWordsForSlots(unlearned: VocabularyWord[], all: VocabularyWord[], count: number): VocabularyWord[] {
    const source = (unlearned.length > 0 ? [...unlearned] : [...all]).filter(Boolean);
    for (let i = source.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [source[i], source[j]] = [source[j], source[i]];
    }
    const result: VocabularyWord[] = [];
    for (let i = 0; i < count; i++) result.push(source[i % Math.max(1, source.length)]);
    return result;
  }

  private async rescheduleDailyReminders(): Promise<void> {
    const nowMs = Date.now();
    if (nowMs - this.lastRescheduleAt < 750) return;
    if (this.rescheduleRunning) { this.rescheduleQueued = true; return; }
    this.rescheduleRunning = true;
    try {
      // Reset our internal counter first
      this.scheduledCount = 0;
      // Cancel all scheduled notifications first
      try { 
        PushNotification.cancelAllLocalNotifications();
        PushNotification.removeAllDeliveredNotifications?.(); 
      } catch {}

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
      if (!settings?.isEnabled) return;

      let words: any[] = [];
      try {
        const fetched = await getVocabulary();
        if (Array.isArray(fetched)) words = fetched as any[];
      } catch (err) {
        // Silent error handling
      }
      const unlearned = Array.isArray(words)
        ? words.filter(w => w && (w.is_learned === false || typeof w.is_learned === 'undefined'))
        : [];
      const times = ReminderSettingsService.calculateNotificationTimes(settings, unlearned.length);
      const selected = this.pickWordsForSlots(unlearned, words as any, times.length);

      for (let i = 0; i < times.length; i++) {
        const when = times[i];
        const word = selected[i];
        const title = '📚 LingRoot Hatırlatma';
        const body = word ? `Kelime: ${word.word}${word.definition ? ' — ' + word.definition : ''}` : 'Günün kelimelerini tekrar et!';
        try {
          PushNotification.localNotificationSchedule({
            channelId: 'lingroot-reminders',
            title,
            message: body,
            date: when,
            allowWhileIdle: false,
            playSound: true,
            soundName: 'default',
            userInfo: { wordId: word?.id?.toString() || '' } as any,
            // No repeatType - one-time notifications only
          });
          this.scheduledCount += 1;
        } catch (schedErr) {
          // Silent error handling
        }
      }
    } catch (e) {
      // Silently fail - don't show alert to user
    } finally {
      this.rescheduleRunning = false;
      if (this.rescheduleQueued) { this.rescheduleQueued = false; setTimeout(() => { this.rescheduleDailyReminders().catch(() => {}); }, 150); }
    }
  }

  public async setupPeriodicVocabularyNotifications(): Promise<void> {
    await this.initialize();
    if (!this.hasPermission) return;
    await this.rescheduleDailyReminders();
  }

  public async setupSmartVocabularyNotifications(): Promise<void> {
    await this.initialize();
    if (!this.hasPermission) return;
    await this.rescheduleDailyReminders();
  }

  public async stopVocabularyReminders(): Promise<void> {
    try {
      PushNotification.cancelAllLocalNotifications();
      PushNotification.removeAllDeliveredNotifications?.();
      Alert.alert('Bildirimler Durduruldu', 'Tüm kelime hatırlatmaları iptal edildi.');
    } catch {}
  }

  public async scheduleVocabularyNotification(word: VocabularyWord): Promise<void> {
    await this.initialize();
    if (!this.hasPermission) return;
    PushNotification.localNotification({
      channelId: 'lingroot-reminders',
      title: '🎯 LingRoot Kelime',
      message: `${word.word} - ${word.definition || 'Tanım yok'}`,
      playSound: true,
      soundName: 'default',
      userInfo: { wordId: word.id?.toString() || '' } as any,
    });
    PushNotification.localNotificationSchedule({
      channelId: 'lingroot-reminders',
      title: '📚 LingRoot Hatırlatma',
      message: `Kelime: ${word.word} - ${word.definition || 'Tanım yok'}`,
      date: new Date(Date.now() + 3000),
      // Use inexact alarm for backup schedule
      allowWhileIdle: false,
      playSound: true,
      soundName: 'default',
      userInfo: { wordId: word.id?.toString() || '' } as any,
    });
    // Immediate + backup
    this.scheduledCount += 2;
  }

  public setupNotificationResponseHandler(navigationCallback: (wordId: string) => void) {
    this.responseCallback = navigationCallback;
    // No DeviceEventEmitter bridge on Android here; onNotification covers taps
    return { remove: () => { this.responseCallback = null; } };
  }

  public consumePendingWordId(): string | null {
    const id = this.pendingWordId;
    this.pendingWordId = null;
    return id;
  }

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
      return { isInitialized: this.isInitialized, hasPermission: this.hasPermission, scheduledCount: this.scheduledCount };
    } catch { return { isInitialized: this.isInitialized, hasPermission: this.hasPermission, scheduledCount: this.scheduledCount }; }
  }
}

export default NotificationService.getInstance();
