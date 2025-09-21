import { Platform } from 'react-native';

const svc = Platform.OS === 'ios'
  ? require('./notificationService.ios').default
  : require('./notificationService.android').default;

export default svc;