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
              
              if (this.responseCallback && audioData) {
                console.log('[NotificationService][Android] Calling responseCallback');
                this.responseCallback(JSON.stringify({ type: 'audio_created', data: audioData }));
              } else {
                console.log('[NotificationService][Android] No responseCallback, using global navigation');
                // Fallback: use global navigation ref if callback not set
                const navRef = (global as any).__NAVIGATION_REF__;
                if (navRef?.current && audioData) {
                  try {
                    const { CommonActions } = require('@react-navigation/native');
                    navRef.current.dispatch(
                      CommonActions.reset({
                        index: 0,
                        routes: [
                          {
                            name: 'Main',
                            state: {
                              routes: [
                                {
                                  name: 'Library',
                                  params: { notificationAudio: audioData },
                                },
                              ],
                            },
                          },
                        ],
                      })
                    );
                    console.log('[NotificationService][Android] Navigation dispatched via global ref');
                  } catch (navError) {
                    console.error('[NotificationService][Android] Navigation error:', navError);
                  }
                }
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
