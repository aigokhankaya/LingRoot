import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useLanguage } from '../contexts/LanguageContext';
import {
  getAllNotifications,
  getNotificationUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteReadNotifications,
} from '../services/userService';
import { COLORS } from '../theme/colors';
import type { RootStackParamList, AudioTrack, CEFRLevel } from '../types';
import NotificationService from '../services/notificationService';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  metadata?: {
    wordId?: string;
    audioId?: string;
    jobId?: string;
    mp3_url?: string;
    title?: string;
    level?: string;
    duration?: number;
    [key: string]: unknown;
  };
}

const NotificationsScreen: React.FC = () => {
  const { language } = useLanguage();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [isDeletingRead, setIsDeletingRead] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const [notifResult, count] = await Promise.all([
        getAllNotifications(50, 0),
        getNotificationUnreadCount(),
      ]);
      console.log('[NotificationsScreen] API response:', {
        total: notifResult.total,
        count: notifResult.notifications?.length,
        unreadCount: count,
        notifications: notifResult.notifications?.slice(0, 3).map((n: NotificationItem) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          metadata: n.metadata,
        })),
      });
      setNotifications(notifResult.notifications);
      setUnreadCount(count);
      // Sync app icon badge with actual unread count
      NotificationService.updateBadgeCount(count);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await loadNotifications();
      setIsLoading(false);
    };
    load();
  }, [loadNotifications]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadNotifications();
    setIsRefreshing(false);
  };

  const handleNotificationPress = async (notification: NotificationItem) => {
    // 1. Mark as read (background, no await)
    if (!notification.isRead) {
      markNotificationAsRead(notification.id).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
      );
      const newUnreadCount = Math.max(0, unreadCount - 1);
      setUnreadCount(newUnreadCount);
      // Update app icon badge
      NotificationService.updateBadgeCount(newUnreadCount);
    }

    // 2. Navigate based on notification type
    switch (notification.type) {
      case 'audio_created':
        if (notification.metadata?.mp3_url) {
          const track: AudioTrack = {
            id: notification.metadata.audioId || notification.id,
            title: notification.metadata.title || notification.title,
            url: notification.metadata.mp3_url,
            mp3_url: notification.metadata.mp3_url,
            level: (notification.metadata.level as CEFRLevel) || 'B1',
            duration: typeof notification.metadata.duration === 'number'
              ? notification.metadata.duration
              : 0,
            created_at: notification.createdAt,
          };
          navigation.navigate('AudioPlayer', { track, highlightMode: 'word' });
        }
        break;

      case 'vocabulary_reminder':
        if (notification.metadata?.wordId) {
          navigation.navigate('Vocabulary', { wordId: notification.metadata.wordId });
        }
        break;

      default:
        // No action for other notification types
        break;
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || isMarkingAll) return;

    try {
      setIsMarkingAll(true);
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      // Clear app icon badge when all notifications are read
      NotificationService.clearBadge();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleDeleteRead = async () => {
    const readCount = notifications.filter((n) => n.isRead).length;
    if (readCount === 0 || isDeletingRead) return;

    Alert.alert(
      language === 'tr' ? 'Okunmuslari Sil' : 'Delete Read',
      language === 'tr'
        ? `${readCount} okunmus bildirim silinecek. Emin misiniz?`
        : `${readCount} read notifications will be deleted. Are you sure?`,
      [
        { text: language === 'tr' ? 'Iptal' : 'Cancel', style: 'cancel' },
        {
          text: language === 'tr' ? 'Sil' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeletingRead(true);
              await deleteReadNotifications();
              setNotifications((prev) => prev.filter((n) => !n.isRead));
            } catch (error) {
              console.error('Error deleting read notifications:', error);
              Alert.alert(
                language === 'tr' ? 'Hata' : 'Error',
                language === 'tr' ? 'Bildirimler silinirken hata olustu' : 'Error deleting notifications'
              );
            } finally {
              setIsDeletingRead(false);
            }
          },
        },
      ]
    );
  };

  const getTypeIcon = (type: string): string => {
    switch (type) {
      case 'vocabulary_reminder':
        return 'school';
      case 'audio_created':
        return 'volume-up';
      case 'success':
        return 'check-circle';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  };

  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'vocabulary_reminder':
        return '#8b5cf6'; // violet-500 for learning
      case 'audio_created':
        return COLORS.brandTeal;
      case 'success':
        return '#22c55e';
      case 'warning':
        return '#f59e0b';
      case 'error':
        return COLORS.danger;
      default:
        return COLORS.brandTeal;
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return language === 'tr' ? 'Az once' : 'Just now';
    if (diffMins < 60) return `${diffMins} ${language === 'tr' ? 'dk' : 'min'}`;
    if (diffHours < 24) return `${diffHours} ${language === 'tr' ? 'saat' : 'hr'}`;
    if (diffDays < 7) return `${diffDays} ${language === 'tr' ? 'gun' : 'd'}`;

    return date.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', {
      day: 'numeric',
      month: 'short',
    });
  };

  const renderNotification = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.isRead && styles.notificationUnread]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${getTypeColor(item.type)}15` }]}>
        <Icon name={getTypeIcon(item.type)} size={22} color={getTypeColor(item.type)} />
      </View>
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={[styles.notificationTitle, !item.isRead && styles.notificationTitleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.notificationDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {item.message}
        </Text>
      </View>
      {!item.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Icon name="notifications-none" size={64} color={COLORS.slate300} />
      </View>
      <Text style={styles.emptyTitle}>
        {language === 'tr' ? 'Bildirim Yok' : 'No Notifications'}
      </Text>
      <Text style={styles.emptyDescription}>
        {language === 'tr'
          ? 'Henuz bildiriminiz bulunmuyor'
          : 'You have no notifications yet'}
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.brandTeal} />
          <Text style={styles.loadingText}>
            {language === 'tr' ? 'Yukleniyor...' : 'Loading...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with unread count and action buttons */}
      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <View style={styles.unreadBadgeContainer}>
            <Text style={styles.unreadBadgeLabel}>
              {language === 'tr' ? 'Okunmamis' : 'Unread'}
            </Text>
            <View style={[styles.unreadBadge, unreadCount === 0 && styles.unreadBadgeEmpty]}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={handleMarkAllAsRead}
              disabled={isMarkingAll}
            >
              {isMarkingAll ? (
                <ActivityIndicator size="small" color={COLORS.brandTeal} />
              ) : (
                <>
                  <Icon name="done-all" size={18} color={COLORS.brandTeal} />
                  <Text style={styles.markAllText}>
                    {language === 'tr' ? 'Tumunu Okundu Isaretle' : 'Mark All Read'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
        {notifications.some((n) => n.isRead) && (
          <TouchableOpacity
            style={styles.deleteReadButton}
            onPress={handleDeleteRead}
            disabled={isDeletingRead}
          >
            {isDeletingRead ? (
              <ActivityIndicator size="small" color={COLORS.danger} />
            ) : (
              <>
                <Icon name="delete-sweep" size={18} color={COLORS.danger} />
                <Text style={styles.deleteReadText}>
                  {language === 'tr' ? 'Okunmuslari Sil' : 'Delete Read'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Notification List */}
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={notifications.length === 0 ? styles.emptyList : styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.brandTeal}
            colors={[COLORS.brandTeal]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: COLORS.slate500,
    fontWeight: '600',
  },
  headerContainer: {
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unreadBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unreadBadgeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.slate500,
  },
  unreadBadge: {
    backgroundColor: COLORS.brandOrange,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 28,
    alignItems: 'center',
  },
  unreadBadgeEmpty: {
    backgroundColor: COLORS.slate200,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(39, 190, 170, 0.1)',
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.brandTeal,
  },
  deleteReadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  deleteReadText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.danger,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  emptyList: {
    flex: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  notificationUnread: {
    backgroundColor: COLORS.slate50,
    borderColor: COLORS.brandTeal + '30',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.slate700,
    flex: 1,
    marginRight: 8,
  },
  notificationTitleUnread: {
    fontWeight: '800',
    color: COLORS.slate900,
  },
  notificationDate: {
    fontSize: 12,
    color: COLORS.slate400,
    fontWeight: '500',
  },
  notificationMessage: {
    fontSize: 13,
    color: COLORS.slate500,
    lineHeight: 18,
    fontWeight: '500',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.brandOrange,
    marginLeft: 8,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.slate50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.slate700,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: COLORS.slate400,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default React.memo(NotificationsScreen);
