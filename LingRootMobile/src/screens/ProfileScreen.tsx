import React, { useState } from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Modal,
  Linking,
  Platform,
} from 'react-native';

import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import NotificationService from '../services/notificationService';
import { CopilotStep, walkthroughable } from 'react-native-copilot';
import { COLORS } from '../theme/colors';
import {
  TourProvider,
  ProfileTooltip,
  PROFILE_TOUR_STEPS,
  PROFILE_TOUR_KEY,
  PROFILE_MENU_TOUR_MAP,
  useTourAutoStart,
} from '../components/GuideTour';

const WalkthroughableView = walkthroughable(View);

const ProfileScreenContent: React.FC = () => {
  const { user, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const lang = language === 'tr' ? 'tr' : 'en';

  // Guide tour auto-start
  useTourAutoStart(PROFILE_TOUR_KEY, 800);

  const handleSignOut = async () => {
    Alert.alert(
      t('profile.signOut'),
      t('profile.signOutConfirm'),
      [
        { text: t('profile.cancel'), style: 'cancel' },
        {
          text: t('profile.signOut'),
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error: any) {
              Alert.alert(t('notifications.error'), error.message || t('notifications.signOutFailed'));
            }
          },
        },
      ]
    );
  };

  const handleLanguageSelect = async (selectedLanguage: 'tr' | 'en') => {
    await setLanguage(selectedLanguage);
    setLanguageModalVisible(false);
  };

  const handleTestNotification = async () => {
    try {
      // Get notification service status
      const status = await NotificationService.getStatus();

      if (!status.hasPermission) {
        Alert.alert(t('notifications.disabled'), t('notifications.permissionRequired'));
        return;
      }

      // Get a random word and schedule notification
      const randomWord = await NotificationService.getRandomUnlearnedWord();

      if (randomWord) {
        await NotificationService.scheduleVocabularyNotification(randomWord);
        Alert.alert(t('notifications.testSent'), `"${randomWord.word}" ${t('notifications.testSentMessage')}`);
      } else {
        Alert.alert(
          t('notifications.noWordsFound'),
          t('notifications.noWordsFoundMessage')
        );
      }
    } catch (error: any) {
      let errorMessage = t('notifications.testFailed');

      if (error?.response?.status === 401) {
        errorMessage = t('notifications.sessionExpired');
      }

      Alert.alert(t('notifications.error'), errorMessage);
    }
  };

  const handleNotificationStatus = async () => {
    try {
      const status = await NotificationService.getStatus();
      const yesText = language === 'tr' ? 'Evet' : 'Yes';
      const noText = language === 'tr' ? 'Hayır' : 'No';
      const statusText = `
${language === 'tr' ? 'Bildirim Durumu:' : 'Notification Status:'}
• ${language === 'tr' ? 'Başlatılmış:' : 'Initialized:'} ${status.isInitialized ? yesText : noText}
• ${language === 'tr' ? 'İzin Verilmiş:' : 'Permission Granted:'} ${status.hasPermission ? yesText : noText}
• ${language === 'tr' ? 'Zamanlanmış Bildirim:' : 'Scheduled Notifications:'} ${status.scheduledCount} ${language === 'tr' ? 'adet' : 'items'}

${!status.hasPermission ? `\n⚠️ ${language === 'tr' ? 'Bildirim izni gereklidir' : 'Notification permission required'}` : ''}
${!status.isInitialized ? `\n⚠️ ${language === 'tr' ? 'Servis başlatılmamış' : 'Service not initialized'}` : ''}
      `.trim();

      Alert.alert(t('notifications.testSent').replace('Test ', ''), statusText);
    } catch (error) {
      Alert.alert(t('notifications.error'), t('notifications.statusError'));
    }
  };

  const handleQuickDebug = async () => {
    try {
      // Restart smart notifications immediately
      await NotificationService.setupSmartVocabularyNotifications();
      Alert.alert(t('notifications.debugCompleted'), t('notifications.debugCompletedMessage'));
    } catch (error: any) {
      Alert.alert(t('notifications.error'), t('notifications.debugFailed') + (error.message || t('notifications.unknownError')));
    }
  };

  const handleOpenNotificationSettings = async () => {
    try {
      // Ensure notification service is initialized (creates channel and requests permission on Android)
      try { await NotificationService.initialize(); } catch { }

      // Open OS-level app settings (contains Notifications toggle on both Android and iOS)
      await Linking.openSettings();
    } catch (e) {
      Alert.alert(
        t('notifications.error'),
        language === 'tr' ? 'Sistem bildirim ayarları açılamadı.' : 'Failed to open system notification settings.'
      );
    }
  };

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  const menuItems = [
    { id: 1, title: t('profile.accountSettings'), icon: 'settings', action: () => navigation.navigate('Settings') },
    { id: 1.5, title: t('profile.language'), icon: 'language', action: () => setLanguageModalVisible(true) },
    { id: 2, title: language === 'tr' ? 'Hatırlatıcı Ayarları' : 'Reminder Settings', icon: 'alarm', action: () => navigation.navigate('ReminderSettings') },
    { id: 3, title: language === 'tr' ? 'Kalan Kullanım' : 'Remaining Usage', icon: 'assessment', action: () => navigation.navigate('Membership') },
    { id: 3.2, title: language === 'tr' ? 'Paket Bilgileri' : 'Package Information', icon: 'inventory', action: () => navigation.navigate('Packages') },
    { id: 3.5, title: language === 'tr' ? 'Destek' : 'Support', icon: 'chat', action: () => navigation.navigate('Chat') },
    // Admin-only menu items (TTS Provider Settings removed - admin only feature)
    ...(isAdmin ? [
      { id: 3.8, title: language === 'tr' ? 'Bildirim Ayarlarını Aç' : 'Open Notification Settings', icon: 'notifications-none', action: handleOpenNotificationSettings },
      { id: 4, title: t('profile.testNotification'), icon: 'notifications', action: handleTestNotification },
      { id: 5, title: t('profile.notificationStatus'), icon: 'notifications-active', action: handleNotificationStatus },
      { id: 8, title: t('profile.quickDebug'), icon: 'bug-report', action: handleQuickDebug },
    ] : []),
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <CopilotStep order={1} name="profileInfo" text={PROFILE_TOUR_STEPS.profileInfo[lang]}>
          <WalkthroughableView>
            <View style={styles.header}>
              {/* Profile Avatar */}
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {user?.full_name ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U'}
                  </Text>
                </View>
                <View style={styles.editAvatarButton}>
                  <Icon name="edit" size={14} color={COLORS.brandOrange} />
                </View>
              </View>

              {!!user?.full_name && (
                <Text style={styles.name}>{user.full_name}</Text>
              )}
              {!!user?.email && <Text style={styles.emailBold}>{user.email}</Text>}
            </View>
          </WalkthroughableView>
        </CopilotStep>

        <View style={styles.menu}>
          {menuItems.map((item) => {
            const tourStep = PROFILE_MENU_TOUR_MAP[item.id];
            const menuItemEl = (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={item.action}
              >
                <View style={styles.menuIconContainer}>
                  <Icon name={item.icon} size={22} color={COLORS.slate600} />
                </View>
                <Text style={styles.menuText}>{item.title}</Text>
                <Icon name="chevron-right" size={20} color={COLORS.slate300} />
              </TouchableOpacity>
            );

            if (tourStep) {
              const stepText = PROFILE_TOUR_STEPS[tourStep.name]?.[lang] || '';
              return (
                <CopilotStep key={item.id} order={tourStep.order} name={tourStep.name} text={stepText}>
                  <WalkthroughableView>
                    {menuItemEl}
                  </WalkthroughableView>
                </CopilotStep>
              );
            }

            return menuItemEl;
          })}
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Icon name="logout" size={22} color="#EF4444" />
          <Text style={styles.signOutText}>{t('profile.signOut')}</Text>
        </TouchableOpacity>

        {/* Version Info */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>LingRoot AI v1.0.4</Text>
        </View>
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={languageModalVisible}
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('profile.language')}</Text>
              <TouchableOpacity
                onPress={() => setLanguageModalVisible(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.languageOption,
                language === 'tr' && styles.selectedLanguage
              ]}
              onPress={() => handleLanguageSelect('tr')}
            >
              <Text style={[
                styles.languageText,
                language === 'tr' && styles.selectedLanguageText
              ]}>
                {t('languages.turkish')}
              </Text>
              {language === 'tr' && (
                <Icon name="check" size={20} color={COLORS.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.languageOption,
                language === 'en' && styles.selectedLanguage
              ]}
              onPress={() => handleLanguageSelect('en')}
            >
              <Text style={[
                styles.languageText,
                language === 'en' && styles.selectedLanguageText
              ]}>
                {t('languages.english')}
              </Text>
              {language === 'en' && (
                <Icon name="check" size={20} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* TTS Test Modal removed */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    paddingBottom: 100,
  },
  header: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.slate900,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  email: {
    fontSize: 14,
    color: COLORS.slate400,
    marginBottom: 10,
  },
  emailBold: {
    fontSize: 14,
    color: COLORS.slate500,
    fontWeight: '500',
    marginBottom: 0,
  },
  menu: {
    backgroundColor: '#f8f9ff',
    marginTop: 8,
    marginHorizontal: 24,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate100,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  menuText: {
    flex: 1,
    marginLeft: 16,
    fontSize: 15,
    color: COLORS.slate700,
    fontWeight: '700',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 40,
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.1)',
  },
  signOutText: {
    marginLeft: 10,
    fontSize: 15,
    color: '#EF4444',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 32,
    margin: 24,
    minWidth: 300,
    maxWidth: 400,
    shadowColor: COLORS.brandIndigo,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate100,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.slate800,
  },
  closeButton: {
    padding: 4,
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate100,
  },
  selectedLanguage: {
    backgroundColor: 'rgba(245, 165, 36, 0.05)',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.brandOrange,
  },
  languageText: {
    fontSize: 15,
    color: COLORS.slate700,
    fontWeight: '600',
  },
  selectedLanguageText: {
    color: COLORS.brandOrange,
    fontWeight: '700',
  },
  // Avatar styles
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 32,
    backgroundColor: COLORS.brandTeal,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.brandTeal,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.slate100,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.slate50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  versionContainer: {
    marginTop: 32,
    alignItems: 'center',
    opacity: 0.3,
  },
  versionText: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.slate400,
    textTransform: 'uppercase',
    letterSpacing: 3,
  },
});

const ProfileScreen: React.FC = () => (
  <TourProvider tooltip={ProfileTooltip}>
    <ProfileScreenContent />
  </TourProvider>
);

export default React.memo(ProfileScreen);