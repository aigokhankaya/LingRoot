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
   * Schedules notifications within the configured time window (startTime to endTime)
   * If current time is past endTime, schedules for tomorrow
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

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    const startTimeInMinutes = startHour * 60 + startMinute;
    let endTimeInMinutes = endHour * 60 + endMinute;

    // Handle overnight time range (e.g., 23:00 - 00:00 or 22:00 - 02:00)
    const isOvernightRange = endTimeInMinutes <= startTimeInMinutes;
    if (isOvernightRange) {
      // Add 24 hours to end time for calculation purposes
      endTimeInMinutes += 24 * 60;
    }

    // Determine the target day and time window
    let targetDate = new Date(now);
    let effectiveStartTime: Date;
    let effectiveEndTime: Date;

    // Adjust current time for overnight comparison
    let adjustedCurrentTime = currentTimeInMinutes;
    if (isOvernightRange && currentTimeInMinutes < startTimeInMinutes) {
      // If it's past midnight and we're in an overnight range, add 24 hours
      adjustedCurrentTime += 24 * 60;
    }

    // Case 1: Current time is before start time → schedule for today, full window
    if (adjustedCurrentTime < startTimeInMinutes) {
      effectiveStartTime = new Date(targetDate);
      effectiveStartTime.setHours(startHour, startMinute, 0, 0);
      effectiveEndTime = new Date(targetDate);
      effectiveEndTime.setHours(endHour, endMinute, 0, 0);
      // If overnight range, end time is next day
      if (isOvernightRange) {
        effectiveEndTime.setDate(effectiveEndTime.getDate() + 1);
      }
    }
    // Case 2: Current time is within the window → schedule from now to end
    else if (adjustedCurrentTime >= startTimeInMinutes && adjustedCurrentTime < endTimeInMinutes) {
      effectiveStartTime = new Date(now.getTime() + 60000); // now + 1 minute
      effectiveEndTime = new Date(targetDate);
      effectiveEndTime.setHours(endHour, endMinute, 0, 0);
      // If overnight range and we're still before midnight, end time is next day
      if (isOvernightRange && currentTimeInMinutes >= startTimeInMinutes) {
        effectiveEndTime.setDate(effectiveEndTime.getDate() + 1);
      }
    }
    // Case 3: Current time is past end time → schedule for tomorrow, full window
    else {
      targetDate.setDate(targetDate.getDate() + 1);
      effectiveStartTime = new Date(targetDate);
      effectiveStartTime.setHours(startHour, startMinute, 0, 0);
      effectiveEndTime = new Date(targetDate);
      effectiveEndTime.setHours(endHour, endMinute, 0, 0);
      // If overnight range, end time is the day after tomorrow
      if (isOvernightRange) {
        effectiveEndTime.setDate(effectiveEndTime.getDate() + 1);
      }
    }

    // Calculate total duration
    const totalDurationMs = effectiveEndTime.getTime() - effectiveStartTime.getTime();
    const totalDurationMinutes = totalDurationMs / (1000 * 60);

    // Determine how many words to remind
    const maxAvailable = typeof unlearnedWordsCount === 'number' && unlearnedWordsCount > 0
      ? unlearnedWordsCount
      : settings.wordsPerDay;
    const wordsToRemind = Math.min(settings.wordsPerDay, maxAvailable);

    if (wordsToRemind <= 0 || totalDurationMinutes <= 0) {
      return notifications;
    }

    // Calculate interval between notifications
    const intervalMinutes = totalDurationMinutes / wordsToRemind;
    const intervalMs = intervalMinutes * 60 * 1000;

    // Schedule all notifications evenly distributed from start to end
    for (let i = 0; i < wordsToRemind; i++) {
      const notificationTime = new Date(effectiveStartTime.getTime() + i * intervalMs);
      notifications.push(notificationTime);
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