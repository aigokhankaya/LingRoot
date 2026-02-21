import { Alert, Platform, PermissionsAndroid } from 'react-native';
import type { VocabularyWord } from './api';
import { getVocabulary } from './api';
import { ReminderSettingsService, ReminderSettings } from './reminderSettingsService';
import PushNotification from 'react-native-push-notification';
import { createVocabularyNotification, deleteScheduledVocabularyReminders } from './userService';

class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;
  private isConfigured = false;
  private hasPermission = false;
  private pendingWordId: string | null = null;
  private pendingAudioPayload: string | null = null;
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
        // Reminder channel
        PushNotification.createChannel(
          {
            channelId: 'lingroot-reminders',
            channelName: 'LingRoot Reminders',
            channelDescription: 'Günlük kelime hatırlatma bildirimleri',
            importance: 4,
            vibrate: true,
            soundName: 'default',
          },
          () => {}
        );
        
        // Audio creation channel
        PushNotification.createChannel(
          {
            channelId: 'lingroot-audio',
            channelName: 'LingRoot Audio',
            channelDescription: 'Ses oluşturma bildirimleri',
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
            console.log('[NotificationService][Android] onNotification:', notification);
            const userInfo = notification?.userInfo || notification?.data || {};
            
            // Handle audio creation notification
            if (userInfo.type === 'audio_created') {
              const audioData = typeof userInfo.audioData === 'string'
                ? JSON.parse(userInfo.audioData)
                : userInfo.audioData;

              console.log('[NotificationService][Android] Audio notification detected, audioData:', audioData);

              if (!audioData) {
                return;
              }

              const payload = JSON.stringify({ type: 'audio_created', data: audioData });

              if (this.responseCallback) {
                console.log('[NotificationService][Android] Calling responseCallback for audio notification');
                this.responseCallback(payload);
              } else {
                console.log('[NotificationService][Android] No responseCallback yet, storing pending audio payload');
                this.pendingAudioPayload = payload;
              }
              return;
            }

            // Handle support message notification
            if (userInfo.type === 'support_message') {
              try {
                const raw = userInfo.payload || userInfo.supportData;
                const supportData = typeof raw === 'string' ? JSON.parse(raw) : raw;

                if (!supportData) {
                  return;
                }

                const payload = JSON.stringify({ type: 'support_message', data: supportData });

                if (this.responseCallback) {
                  this.responseCallback(payload);
                } else {
                  // Reuse pendingAudioPayload buffer for support payloads as well
                  this.pendingAudioPayload = payload;
                }
              } catch (e) {
                console.error('[NotificationService][Android] Error handling support_message notification:', e);
              }
              return;
            }
            
            // Handle vocabulary word notification
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
            console.error('[NotificationService] Error handling notification:', e);
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

  private async rescheduleDailyReminders(force = false): Promise<void> {
    console.log('🚀 [Android Notifications] rescheduleDailyReminders called (force:', force, ')');

    // If not forced and future notifications exist, skip rescheduling
    if (!force) {
      try {
        const existingNotifications = await this.getScheduledNotifications();
        const futureNotifications = existingNotifications.filter(n => n.fireDate > new Date());
        if (futureNotifications.length > 0) {
          console.log(`⏭️ [Android Notifications] Skipping reschedule - ${futureNotifications.length} future notifications exist`);
          return;
        }
      } catch {}
    }

    const nowMs = Date.now();
    if (nowMs - this.lastRescheduleAt < 750) return;
    if (this.rescheduleRunning) { this.rescheduleQueued = true; return; }
    this.rescheduleRunning = true;
    this.lastRescheduleAt = nowMs;
    try {
      // Reset our internal counter first
      this.scheduledCount = 0;

      console.log('🔄 [Android Notifications] Canceling all existing notifications');

      // First cancel all by getting the list and removing each
      try {
        const pending = await this.getScheduledNotifications();
        console.log(`🗑️ [Android Notifications] Found ${pending.length} pending notifications`);
      } catch {}

      // Cancel all scheduled notifications
      try {
        PushNotification.cancelAllLocalNotifications();
        PushNotification.removeAllDeliveredNotifications?.();
      } catch {}

      // Also clear backend scheduled vocabulary reminders to avoid duplicates
      try {
        const deleted = await deleteScheduledVocabularyReminders();
        console.log(`🗑️ [Android Notifications] Deleted ${deleted} backend reminders`);
      } catch (e) {
        console.log('[Android Notifications] Failed to delete backend reminders:', e);
      }

      // Wait for Android to process cancellations
      await new Promise(resolve => setTimeout(resolve, 300));

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
      // If user has no unlearned words (or no words at all), skip scheduling reminders
      const unlearned = Array.isArray(words)
        ? words.filter(w => w && (w.is_learned === false || typeof w.is_learned === 'undefined'))
        : [];
      if (unlearned.length === 0) {
        return;
      }
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
            allowWhileIdle: true, // Android 12+ requires this
            playSound: true,
            soundName: 'default',
            userInfo: { wordId: word?.id?.toString() || '' } as any,
            // No repeatType - one-time notifications only
          });
          this.scheduledCount += 1;
        } catch (schedErr) {
          console.warn('[Notification] Schedule error:', schedErr);
          // Silent error handling
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
            console.log('[Android Notifications] Backend save failed:', e);
          }
        }
      }
      console.log(`✅ [Android Notifications] Successfully scheduled ${times.length} notifications`);

      // Verify scheduled notifications
      await new Promise(resolve => setTimeout(resolve, 200));
      try {
        const scheduled = await this.getScheduledNotifications();
        console.log(`📊 [Android Notifications] Verification: ${scheduled.length} notifications in queue`);
        scheduled.slice(0, 3).forEach((n, i) => {
          console.log(`   ${i + 1}. ${n.fireDate.toLocaleString('tr-TR')} - ${n.body?.substring(0, 30)}...`);
        });
      } catch {}
    } catch (e) {
      console.error('❌ [Android Notifications] Error scheduling:', e);
      // Silently fail - don't show alert to user
    } finally {
      this.rescheduleRunning = false;
      if (this.rescheduleQueued) { this.rescheduleQueued = false; setTimeout(() => { this.rescheduleDailyReminders(force).catch(() => {}); }, 150); }
    }
  }

  public async setupPeriodicVocabularyNotifications(force = false): Promise<void> {
    await this.initialize();
    if (!this.hasPermission) return;
    await this.rescheduleDailyReminders(force);
  }

  public async setupSmartVocabularyNotifications(force = false): Promise<void> {
    await this.initialize();
    if (!this.hasPermission) return;
    await this.rescheduleDailyReminders(force);
  }

  public async stopVocabularyReminders(): Promise<void> {
    try {
      console.log('🗑️ [Android Notifications] Stopping all vocabulary reminders');

      // Get count before clearing
      const pending = await this.getScheduledNotifications();
      console.log(`   Found ${pending.length} pending notifications`);

      PushNotification.cancelAllLocalNotifications();
      PushNotification.removeAllDeliveredNotifications?.();

      // Wait for Android to process
      await new Promise(resolve => setTimeout(resolve, 300));

      // Verify
      const remaining = await this.getScheduledNotifications();
      console.log(`✅ [Android Notifications] After stop: ${remaining.length} notifications remaining`);
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
      allowWhileIdle: true, // Android 12+ requires this
      playSound: true,
      soundName: 'default',
      userInfo: { wordId: word.id?.toString() || '' } as any,
    });
    // Immediate + backup
    this.scheduledCount += 2;
  }

  public setupNotificationResponseHandler(navigationCallback: (wordId: string) => void) {
    this.responseCallback = navigationCallback;

    // If we received an audio notification before the callback was
    // registered (cold start), forward the pending payload now so that
    // navigation is handled consistently in AppNavigator.
    if (this.pendingAudioPayload && this.responseCallback) {
      const payload = this.pendingAudioPayload;
      this.pendingAudioPayload = null;
      try {
        this.responseCallback(payload);
      } catch {
        // Ignore callback errors
      }
    }

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
      const pending = await this.getScheduledNotifications();
      return { isInitialized: this.isInitialized, hasPermission: this.hasPermission, scheduledCount: pending.length };
    } catch { return { isInitialized: this.isInitialized, hasPermission: this.hasPermission, scheduledCount: this.scheduledCount }; }
  }

  public async getScheduledNotifications(): Promise<Array<{ id: string; title: string; body: string; fireDate: Date; wordId?: string }>> {
    return new Promise((resolve) => {
      try {
        // Cast to any to access getScheduledLocalNotifications which exists at runtime
        (PushNotification as any).getScheduledLocalNotifications((notifications: any[]) => {
          const result = notifications.map((notif) => ({
            id: notif.id || '',
            title: notif.title || '',
            body: notif.message || notif.body || '',
            fireDate: notif.date ? new Date(notif.date) : new Date(),
            wordId: notif.data?.wordId || notif.userInfo?.wordId || undefined,
          }));
          // Sort by fireDate ascending
          result.sort((a: { fireDate: Date }, b: { fireDate: Date }) => a.fireDate.getTime() - b.fireDate.getTime());
          resolve(result);
        });
      } catch {
        resolve([]);
      }
    });
  }

  /**
   * Show audio creation notification
   * @param audioData - Audio track data from notification
   */
  public async showAudioCreatedNotification(audioData: any): Promise<void> {
    await this.initialize();
    if (!this.hasPermission) return;

    try {
      PushNotification.localNotification({
        channelId: 'lingroot-audio',
        title: '🎵 Ses Oluşturuldu!',
        message: audioData.title || 'Sesiniz hazır. Dinlemek için tıklayın.',
        playSound: true,
        soundName: 'default',
        // iOS ekstra verileri userInfo üzerinden alıyor
        userInfo: { 
          type: 'audio_created',
          audioData: JSON.stringify(audioData)
        } as any,
        // Android ise data alanını kullanıyor, bu yüzden aynısını buraya da yazıyoruz
        data: {
          type: 'audio_created',
          audioData: JSON.stringify(audioData)
        } as any,
      } as any);
    } catch (error) {
      console.error('[NotificationService] Error showing audio notification:', error);
    }
  }
}

export default NotificationService.getInstance();
