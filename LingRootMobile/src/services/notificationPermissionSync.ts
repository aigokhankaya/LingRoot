import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from './notificationService';
import { updateNotificationPermission } from './userService';

const STORAGE_KEY = 'notification_permission_snapshot_v1';

type PermissionSnapshot = {
  granted: boolean;
  status: string;
  can_receive_remote: boolean;
  platform: string;
};

function serializeSnapshot(snapshot: PermissionSnapshot) {
  return JSON.stringify({
    granted: Boolean(snapshot.granted),
    status: snapshot.status || 'unknown',
    can_receive_remote: Boolean(snapshot.can_receive_remote),
    platform: snapshot.platform || 'unknown',
  });
}

export async function syncNotificationPermissionToBackend(force = false): Promise<void> {
  try {
    const snapshot = await (NotificationService as any).getPermissionSnapshot?.();
    if (!snapshot) {
      return;
    }

    const serialized = serializeSnapshot(snapshot);
    const previous = await AsyncStorage.getItem(STORAGE_KEY);

    if (!force && previous === serialized) {
      return;
    }

    await updateNotificationPermission({
      granted: Boolean(snapshot.granted),
      status: snapshot.status || 'unknown',
      can_receive_remote: Boolean(snapshot.can_receive_remote),
      platform: snapshot.platform || 'unknown',
    });

    await AsyncStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    console.log('[NotificationPermissionSync] Failed to sync permission:', error);
  }
}
