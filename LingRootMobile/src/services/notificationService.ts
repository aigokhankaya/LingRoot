import { Platform } from 'react-native';

const svc = Platform.OS === 'ios'
  ? require('./notificationService.ios').default
  : require('./notificationService.android').default;

// Re-export the badge update event constant
export const NOTIFICATION_BADGE_UPDATE_EVENT = Platform.OS === 'ios'
  ? require('./notificationService.ios').NOTIFICATION_BADGE_UPDATE_EVENT
  : require('./notificationService.android').NOTIFICATION_BADGE_UPDATE_EVENT;

export default svc;
