import React, { useMemo } from 'react';
import {
  Linking,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS } from '../theme/colors';

const TYPE_LABELS: Record<string, string> = {
  general_announcement: 'Genel Duyurular',
  campaign_notice: 'Kampanya Bildirimi',
  info: 'Bilgi',
  success: 'Başarı',
  warning: 'Uyarı',
  error: 'Hata',
};

const normalizeNotificationLink = (link?: string): string => {
  if (!link) {
    return '';
  }

  const trimmed = link.trim();
  if (!trimmed) {
    return '';
  }

  const resolved = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : trimmed.startsWith('/')
      ? `https://www.lingroot.com${trimmed}`
      : `https://${trimmed}`;

  return encodeURI(resolved);
};

const NotificationDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = (route.params || {}) as {
    title?: string;
    message?: string;
    type?: string;
    link?: string;
  };

  const resolvedTypeLabel = useMemo(() => {
    return TYPE_LABELS[params.type || ''] || params.type || 'Bildirim';
  }, [params.type]);

  const resolvedLink = useMemo(() => {
    return normalizeNotificationLink(params.link);
  }, [params.link]);

  const handleOpenLink = async () => {
    if (!resolvedLink) {
      return;
    }
    try {
      const canOpen = await Linking.canOpenURL(resolvedLink);
      if (canOpen) {
        await Linking.openURL(resolvedLink);
      }
    } catch {
      // Ignore link open failures
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => navigation.goBack()}>
        <TouchableOpacity style={styles.card} activeOpacity={1} onPress={(event) => event.stopPropagation()}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton} activeOpacity={0.8}>
            <Icon name="close" size={22} color={COLORS.slate700} />
          </TouchableOpacity>

          <View style={styles.iconShell}>
            <LinearGradient colors={[COLORS.brandTeal, '#0D9488']} style={styles.iconGradient}>
              <Icon name="notifications-active" size={28} color="#FFFFFF" />
            </LinearGradient>
          </View>

          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{resolvedTypeLabel}</Text>
          </View>

          <Text style={styles.title}>{params.title || 'Bildirim'}</Text>
          <Text style={styles.message}>{params.message || ''}</Text>

          {resolvedLink ? (
            <TouchableOpacity style={styles.linkSection} onPress={handleOpenLink} activeOpacity={0.8}>
              <Icon name="link" size={18} color="#2563eb" />
              <Text style={styles.linkText}>{resolvedLink}</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Text style={styles.primaryButtonText}>Tamam</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 22,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 34,
    elevation: 18,
  },
  closeButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconShell: {
    marginTop: 4,
    marginBottom: 18,
  },
  iconGradient: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(39, 190, 170, 0.12)',
  },
  typeBadgeText: {
    color: COLORS.brandTeal,
    fontSize: 13,
    fontWeight: '800',
  },
  title: {
    marginTop: 16,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: COLORS.slate900,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  message: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 24,
    color: COLORS.slate600,
    textAlign: 'center',
  },
  linkSection: {
    width: '100%',
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  linkText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#2563eb',
    textDecorationLine: 'underline',
  },
  primaryButton: {
    marginTop: 22,
    width: '100%',
    backgroundColor: COLORS.brandTeal,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.brandTeal,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

export default React.memo(NotificationDetailScreen);
