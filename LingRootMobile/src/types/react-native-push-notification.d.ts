declare module 'react-native-push-notification' {
  import { EmitterSubscription } from 'react-native';
  export interface ChannelObject {
    channelId: string;
    channelName: string;
    channelDescription?: string;
    soundName?: string;
    importance?: number;
    vibrate?: boolean;
  }

  export interface LocalNotificationObject {
    /* Android */
    channelId?: string;
    title?: string;
    message: string;
    date?: Date;
    allowWhileIdle?: boolean;
    playSound?: boolean;
    soundName?: string;
    userInfo?: any;
    /** Repeat interval on Android */
    repeatType?: 'minute' | 'hour' | 'day' | 'week' | 'month';
  }

  const PushNotification: {
    createChannel(channel: ChannelObject, cb?: (created: boolean) => void): void;
    localNotification(config: LocalNotificationObject): void;
    localNotificationSchedule(config: LocalNotificationObject): void;
    cancelAllLocalNotifications(): void;
    removeAllDeliveredNotifications?(): void;
  };

  export default PushNotification;
}
