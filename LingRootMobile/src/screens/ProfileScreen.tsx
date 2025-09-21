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

const ProfileScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

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
      try { await NotificationService.initialize(); } catch {}

      // Open OS-level app settings (contains Notifications toggle on both Android and iOS)
      await Linking.openSettings();
    } catch (e) {
      Alert.alert(
        t('notifications.error'),
        language === 'tr' ? 'Sistem bildirim ayarları açılamadı.' : 'Failed to open system notification settings.'
      );
    }
  };

  const menuItems = [
    { id: 1, title: t('profile.accountSettings'), icon: 'settings', action: () => navigation.navigate('Settings') },
    { id: 1.5, title: t('profile.language'), icon: 'language', action: () => setLanguageModalVisible(true) },
    { id: 2, title: t('profile.audioHistory'), icon: 'history', action: () => {} },
    { id: 3, title: language === 'tr' ? 'Paket Bilgilerim' : 'My Plan', icon: 'inventory', action: () => navigation.navigate('Membership') },
    { id: 3.5, title: 'Mesaj Gönder', icon: 'chat', action: () => navigation.navigate('Chat') },
    { id: 3.8, title: language === 'tr' ? 'Bildirim Ayarlarını Aç' : 'Open Notification Settings', icon: 'notifications-none', action: handleOpenNotificationSettings },
    { id: 4, title: t('profile.testNotification'), icon: 'notifications', action: handleTestNotification },
    { id: 5, title: t('profile.notificationStatus'), icon: 'notifications-active', action: handleNotificationStatus },
    { id: 8, title: t('profile.quickDebug'), icon: 'bug-report', action: handleQuickDebug },
    { id: 6, title: t('profile.help'), icon: 'help', action: () => {} },
    { id: 7, title: t('profile.about'), icon: 'info', action: () => {} },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View style={styles.header}>
          {!!user?.full_name && (
            <Text style={styles.name}>{user.full_name}</Text>
          )}
          {!!user?.email && <Text style={styles.emailBold}>{user.email}</Text>}
        </View>

        <View style={styles.menu}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={item.action}
            >
              <Icon name={item.icon} size={24} color="#333" />
              <Text style={styles.menuText}>{item.title}</Text>
              <Icon name="chevron-right" size={20} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Icon name="logout" size={24} color="#FF3B30" />
          <Text style={styles.signOutText}>{t('profile.signOut')}</Text>
        </TouchableOpacity>
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
                <Icon name="check" size={20} color="#007AFF" />
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
                <Icon name="check" size={20} color="#007AFF" />
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
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  header: {
    backgroundColor: 'white',
    alignItems: 'center',
    padding: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },

  name: {
    fontSize: 22,
    fontWeight: '800',
    color: '#333',
    marginBottom: 6,
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  emailBold: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    marginBottom: 0,
  },
  menu: {
    backgroundColor: 'white',
    marginTop: 20,
    marginHorizontal: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
    color: '#333',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 40,
    padding: 16,
    borderRadius: 12,
  },
  signOutText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 20,
    minWidth: 300,
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedLanguage: {
    backgroundColor: '#f0f8ff',
  },
  languageText: {
    fontSize: 16,
    color: '#333',
  },
  selectedLanguageText: {
    color: '#007AFF',
    fontWeight: '500',
  },
});

export default ProfileScreen; 