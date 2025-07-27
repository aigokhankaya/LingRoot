import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getVocabulary, VocabularyWord } from './api';
import { ReminderSettingsService, ReminderSettings } from './reminderSettingsService';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export class NotificationService {
  private static instance: NotificationService;
  private notificationScheduleId: string | null = null;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize notification service
   */
  public async initialize(): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermissions();
      if (hasPermission) {
        this.isInitialized = true;
        console.log('📱 [NOTIFICATIONS] Service initialized successfully');
        return true;
      } else {
        console.log('📱 [NOTIFICATIONS] Permission denied');
        return false;
      }
    } catch (error) {
      console.error('📱 [NOTIFICATIONS] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Request notification permissions
   */
  private async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.log('📱 [NOTIFICATIONS] Not running on physical device');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('📱 [NOTIFICATIONS] Permission not granted');
      return false;
    }

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('vocabulary-reminders', {
        name: 'Vocabulary Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        description: 'Reminders for unlearned vocabulary words',
      });
    }

    return true;
  }

  /**
   * Start vocabulary reminder notifications
   */
  public async startVocabularyReminders(): Promise<void> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        console.log('📱 [NOTIFICATIONS] Cannot start reminders - not initialized');
        return;
      }
    }

    try {
      // Cancel existing schedule if any
      await this.stopVocabularyReminders();

      // Schedule repeating notification every 5 minutes
      this.notificationScheduleId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Vocabulary Reminder',
          body: 'Loading your next word...',
          data: { type: 'vocabulary_reminder' },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 300, // 5 minutes
          repeats: true,
        },
      });

      console.log('📱 [NOTIFICATIONS] Vocabulary reminders started');
    } catch (error) {
      console.error('📱 [NOTIFICATIONS] Failed to start reminders:', error);
    }
  }

  /**
   * Stop vocabulary reminder notifications
   */
  public async stopVocabularyReminders(): Promise<void> {
    try {
      if (this.notificationScheduleId) {
        await Notifications.cancelScheduledNotificationAsync(this.notificationScheduleId);
        this.notificationScheduleId = null;
      }
      
      // Cancel all vocabulary reminder notifications
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      for (const notification of scheduledNotifications) {
        if (notification.content.data?.type === 'vocabulary_reminder') {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }

      console.log('📱 [NOTIFICATIONS] Vocabulary reminders stopped');
    } catch (error) {
      console.error('📱 [NOTIFICATIONS] Failed to stop reminders:', error);
    }
  }

  /**
   * Schedule immediate vocabulary notification with specific word
   */
  public async scheduleVocabularyNotification(word: VocabularyWord): Promise<void> {
    if (!this.isInitialized) return;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📚 New Word to Learn',
          body: `${word.word}: ${word.definition || 'No definition available'}`,
          data: { 
            type: 'vocabulary_reminder',
            wordId: word.id?.toString() || '',
            word: word.word,
            definition: word.definition || ''
          },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 1,
        },
      });

      console.log('📱 [NOTIFICATIONS] Scheduled notification for word:', word.word);
    } catch (error) {
      console.error('📱 [NOTIFICATIONS] Failed to schedule word notification:', error);
    }
  }

  /**
   * Get random unlearned vocabulary word
   */
  public async getRandomUnlearnedWord(): Promise<VocabularyWord | null> {
    try {
      const vocabulary = await getVocabulary();
      
      if (!vocabulary || vocabulary.length === 0) {
        console.log('📱 [NOTIFICATIONS] No vocabulary found');
        return null;
      }

      // Filter unlearned words (assuming learned words have is_learned: true)
      const unlearnedWords = vocabulary.filter((word: VocabularyWord) => !word.is_learned);
      
      if (unlearnedWords.length === 0) {
        console.log('📱 [NOTIFICATIONS] No unlearned words found');
        return null;
      }

      // Get random word
      const randomIndex = Math.floor(Math.random() * unlearnedWords.length);
      const selectedWord = unlearnedWords[randomIndex];

      console.log('📱 [NOTIFICATIONS] Selected random word:', selectedWord.word);
      return selectedWord;
    } catch (error: any) {
      console.error('📱 [NOTIFICATIONS] Failed to get random word:', error);
      
      // Handle authentication errors gracefully
      if (error?.response?.status === 401) {
        console.log('📱 [NOTIFICATIONS] Authentication error - user needs to login');
        return null;
      }
      
      return null;
    }
  }

  /**
   * Handle notification response (when user taps notification)
   */
  public setupNotificationResponseHandler(navigationCallback: (wordId: string) => void) {
    return Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      console.log('📱 [NOTIFICATIONS] Notification tapped:', data);
      
      if (data?.type === 'smart_vocabulary_reminder' || data?.type === 'vocabulary_reminder') {
        if (data?.wordId) {
          // Navigate to vocabulary screen with specific word
          navigationCallback(data.wordId);
        } else {
          // For smart reminders without specific word, just navigate to vocabulary
          navigationCallback('0'); // Use '0' as placeholder instead of empty string
        }
      }
    });
  }

  /**
   * Setup smart vocabulary notifications based on user settings
   */
  public async setupSmartVocabularyNotifications(): Promise<void> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return;
    }

    try {
      // Cancel existing notifications
      await this.stopVocabularyReminders();

      // Get reminder settings - try API first, fallback to local storage
      let settings;
      try {
        const { getReminderSettings } = require('./api');
        settings = await getReminderSettings();
        console.log('📱 [SMART_NOTIFICATIONS] Loaded settings from API:', settings);
        // Save to local storage for future offline use
        await ReminderSettingsService.saveSettings(settings);
      } catch (error) {
        console.log('📱 [SMART_NOTIFICATIONS] API failed, using local storage:', error);
        settings = await ReminderSettingsService.getSettings();
        console.log('📱 [SMART_NOTIFICATIONS] Loaded settings from local storage:', settings);
      }
      
      if (!settings.isEnabled) {
        console.log('📱 [SMART_NOTIFICATIONS] Notifications disabled in settings');
        return;
      }

      // Get all unlearned words count - with fallback for offline mode
      let unlearnedWords: VocabularyWord[] = [];
      try {
        const allVocabulary = await getVocabulary();
        unlearnedWords = allVocabulary.filter((word: VocabularyWord) => !word.is_learned);
      } catch (error: any) {
        if (error?.response?.status === 401) {
          console.log('📱 [SMART_NOTIFICATIONS] Authentication error - using offline mode');
          // Use a default number for offline scheduling
          unlearnedWords = Array(settings.wordsPerDay).fill({ id: 1, word: 'offline', definition: 'Please login to see your words' });
        } else {
          throw error;
        }
      }
      
      // Calculate notification times
      const notificationTimes = ReminderSettingsService.calculateNotificationTimes(
        settings,
        unlearnedWords.length
      );

      console.log('📱 [SMART_NOTIFICATIONS] Scheduling notifications:', {
        settings,
        unlearnedWordsCount: unlearnedWords.length,
        notificationCount: notificationTimes.length,
        times: notificationTimes.map(t => `${t.toLocaleTimeString()} (${t.toISOString()})`)
      });

      console.log('📱 [SMART_NOTIFICATIONS] Current time:', new Date().toLocaleTimeString(), '(' + new Date().toISOString() + ')');

      // Schedule each notification
      for (let i = 0; i < notificationTimes.length; i++) {
        const notificationTime = notificationTimes[i];
        const now = new Date();
        const delayMs = notificationTime.getTime() - now.getTime();

        if (delayMs > 0) {
          // Get a random word for this specific notification
          const randomWord = await this.getRandomUnlearnedWord();
          const title = randomWord ? `📚 ${randomWord.word}` : '📚 Vocabulary Reminder';
          const body = randomWord ? `${randomWord.definition || 'Anlamını öğren!'}` : 'Time to learn a new word!';
          
          await Notifications.scheduleNotificationAsync({
            content: {
              title,
              body,
              data: { 
                type: 'smart_vocabulary_reminder',
                scheduledTime: notificationTime.toISOString(),
                wordIndex: i,
                wordId: randomWord?.id?.toString() || ''
              },
              sound: 'default',
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: Math.floor(delayMs / 1000),
            },
          });

          console.log(`📱 [SMART_NOTIFICATIONS] Scheduled notification ${i + 1} for:`, notificationTime.toLocaleTimeString(), 'Word:', randomWord?.word);
        }
      }

      // Schedule daily reset (re-setup for next day)
      this.scheduleDailyReset();

      console.log('📱 [SMART_NOTIFICATIONS] Smart notifications setup complete');
    } catch (error) {
      console.error('📱 [SMART_NOTIFICATIONS] Failed to setup smart notifications:', error);
    }
  }

  /**
   * Setup periodic vocabulary notifications (legacy method)
   */
  public async setupPeriodicVocabularyNotifications(): Promise<void> {
    // Use smart notifications instead
    await this.setupSmartVocabularyNotifications();
  }

  /**
   * Schedule daily reset for next day's notifications
   */
  private async scheduleDailyReset(): Promise<void> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0); // Midnight

    const now = new Date();
    const delayMs = tomorrow.getTime() - now.getTime();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '',
        body: '',
        data: { type: 'daily_reset' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.floor(delayMs / 1000),
      },
    });

    console.log('📱 [SMART_NOTIFICATIONS] Daily reset scheduled for:', tomorrow.toLocaleString());
  }

  /**
   * Schedule next vocabulary check
   */
  private async scheduleNextVocabularyCheck(): Promise<void> {
    try {
      const randomWord = await this.getRandomUnlearnedWord();
      
      if (randomWord) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '📚 Vocabulary Reminder',
            body: `${randomWord.word}: ${randomWord.definition || 'No definition available'}`,
            data: { 
              type: 'vocabulary_reminder',
              wordId: randomWord.id?.toString() || '',
              word: randomWord.word,
              definition: randomWord.definition || ''
            },
            sound: 'default',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 300, // 5 minutes from now
          },
        });

        console.log('📱 [NOTIFICATIONS] Next vocabulary check scheduled for:', randomWord.word);
      } else {
        console.log('📱 [NOTIFICATIONS] No words to remind about - either no vocabulary or authentication issue');
      }
    } catch (error) {
      console.error('📱 [NOTIFICATIONS] Failed to schedule next check:', error);
    }
  }

  /**
   * Get notification status
   */
  public async getStatus(): Promise<{
    isInitialized: boolean;
    hasPermission: boolean;
    scheduledCount: number;
  }> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const vocabularyNotifications = scheduled.filter(n => 
        n.content.data?.type === 'vocabulary_reminder'
      );

      return {
        isInitialized: this.isInitialized,
        hasPermission: status === 'granted',
        scheduledCount: vocabularyNotifications.length,
      };
    } catch (error) {
      console.error('📱 [NOTIFICATIONS] Failed to get status:', error);
      return {
        isInitialized: this.isInitialized,
        hasPermission: false,
        scheduledCount: 0,
      };
    }
  }
}

export default NotificationService.getInstance(); 