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
    let startTime = new Date(now);
    startTime.setHours(startHour, startMinute, 0, 0);
    
    const endTime = new Date(now);
    endTime.setHours(endHour, endMinute, 0, 0);

    // If start time is in the past, adjust to next occurrence
    // BUT if we're within the time window (past start but before end), start from now
    if (startTime <= now) {
      const endTimeToday = new Date(now);
      endTimeToday.setHours(endHour, endMinute, 0, 0);
      
      if (now < endTimeToday) {
        // We're within today's window, start scheduling from now
        startTime = new Date(now.getTime() + 60000); // Start 1 minute from now
      } else {
        // Window is completely past, move to next day
        startTime.setDate(startTime.getDate() + 1);
      }
    }

    // If end time is before start time, it means next day
    if (endTime <= startTime) {
      endTime.setDate(endTime.getDate() + 1);
    }
    
    console.log('🔔 Time calculation - Now:', now.toLocaleString(), 'Start:', startTime.toLocaleString(), 'End:', endTime.toLocaleString());

    // Calculate total duration in minutes
    const totalDurationMs = endTime.getTime() - startTime.getTime();
    const totalDurationMinutes = totalDurationMs / (1000 * 60);

    // Always schedule desired number of reminders; word selection will fallback when needed
    const wordsToRemind = settings.wordsPerDay;
    
    if (wordsToRemind <= 0) {
      return notifications;
    }

    // Calculate interval between notifications
    const intervalMinutes = totalDurationMinutes / wordsToRemind;

    // Keep cadence consistent across the whole window.
    // If user saves settings mid-window, start from the next interval boundary >= now
    // and continue with the same cadence until end of window or desired count.
    const minLeadMillis = 5 * 1000; // small safety margin for iOS scheduling
    const intervalMs = intervalMinutes * 60 * 1000;

    // How many intervals have elapsed from startTime to now?
    const elapsedMs = Math.max(0, now.getTime() - startTime.getTime());
    const elapsedIntervals = elapsedMs / intervalMs;
    const nextIntervalIndex = Math.ceil(elapsedIntervals); // first index whose time >= now

    for (let i = nextIntervalIndex; i < wordsToRemind; i++) {
      const candidate = new Date(startTime.getTime() + i * intervalMs);
      // enforce minimal lead time for very near-future schedules
      const earliest = new Date(now.getTime() + minLeadMillis);
      const notificationTime = candidate < earliest ? earliest : candidate;
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