import AsyncStorage from '@react-native-async-storage/async-storage';
import { getReminderSettings as getReminderSettingsFromApi } from './api';

export interface ReminderSettings {
  wordsPerDay: number;
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
  isEnabled: boolean;
}

const STORAGE_KEY = 'reminder_settings';

const defaultSettings: ReminderSettings = {
  wordsPerDay: 5,
  startTime: '09:00',
  endTime: '18:00',
  isEnabled: true,
};

export class ReminderSettingsService {
  /**
   * Get reminder settings from storage
   */
  static async getSettings(): Promise<ReminderSettings> {
    try {
      // 1) Try fetching latest settings from backend so web changes are reflected
      try {
        const apiSettings = await getReminderSettingsFromApi();
        const merged = { ...defaultSettings, ...apiSettings } as ReminderSettings;
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        return merged;
      } catch (apiErr) {
        // 2) Fallback to local storage
        const storedSettings = await AsyncStorage.getItem(STORAGE_KEY);
        if (storedSettings) {
          return { ...defaultSettings, ...JSON.parse(storedSettings) };
        }
        return defaultSettings;
      }
    } catch (error) {
      // silent in production
      return defaultSettings;
    }
  }

  /**
   * Save reminder settings to storage
   */
  static async saveSettings(settings: ReminderSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      // propagate for caller to handle
      throw error;
    }
  }

  /**
   * Calculate notification intervals based on settings
   * Always schedules the full number of words from current time to end time
   */
  static calculateNotificationTimes(
    settings: ReminderSettings,
    unlearnedWordsCount: number
  ): Date[] {
    const notifications: Date[] = [];
    
    if (!settings.isEnabled) {
      return notifications;
    }

    // Parse start and end times
    const [startHour, startMinute] = settings.startTime.split(':').map(Number);
    const [endHour, endMinute] = settings.endTime.split(':').map(Number);

    // Create today's start and end times
    const now = new Date();
    const endTime = new Date(now);
    endTime.setHours(endHour, endMinute, 0, 0);

    // Determine actual start time (now or configured start time, whichever is later)
    const configuredStartTime = new Date(now);
    configuredStartTime.setHours(startHour, startMinute, 0, 0);
    
    // Start scheduling from now + 1 minute (minimum lead time)
    const actualStartTime = new Date(now.getTime() + 60000);
    
    // If we're before the configured start time, use configured start time
    const startTime = actualStartTime < configuredStartTime ? configuredStartTime : actualStartTime;

    // If end time is before start time, it means next day
    if (endTime <= startTime) {
      endTime.setDate(endTime.getDate() + 1);
    }

    // If we're past the end time for today, schedule for tomorrow
    if (startTime >= endTime) {
      startTime.setDate(startTime.getDate() + 1);
      endTime.setDate(endTime.getDate() + 1);
    }

    // Calculate total duration from NOW (or start time) to end time
    const totalDurationMs = endTime.getTime() - startTime.getTime();
    const totalDurationMinutes = totalDurationMs / (1000 * 60);

    // Always schedule the full desired number of reminders
    // but never exceed available unlearned words to avoid repeating the same word
    const maxAvailable = typeof unlearnedWordsCount === 'number' && unlearnedWordsCount > 0
      ? unlearnedWordsCount
      : settings.wordsPerDay;
    const wordsToRemind = Math.min(settings.wordsPerDay, maxAvailable);
    
    if (wordsToRemind <= 0 || totalDurationMinutes <= 0) {
      return notifications;
    }

    // Calculate interval between notifications based on remaining time
    const intervalMinutes = totalDurationMinutes / wordsToRemind;
    const intervalMs = intervalMinutes * 60 * 1000;

    // Schedule all notifications evenly distributed from start to end
    for (let i = 0; i < wordsToRemind; i++) {
      const notificationTime = new Date(startTime.getTime() + i * intervalMs);
      
      // Only add if it's within the time window
      if (notificationTime <= endTime) {
        notifications.push(notificationTime);
      }
    }

    return notifications;
  }

  /**
   * Format time for display
   */
  static formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  }

  /**
   * Calculate time difference in readable format
   */
  static getTimeDifference(startTime: string, endTime: string): string {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    let totalMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
    
    // Handle next day scenario
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60; // Add 24 hours
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) {
      return `${minutes} dakika`;
    } else if (minutes === 0) {
      return `${hours} saat`;
    } else {
      return `${hours} saat ${minutes} dakika`;
    }
  }
} 