import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import NotificationService from '../services/notificationService';

const ProfileScreen: React.FC = () => {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkış yapmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error: any) {
              Alert.alert('Hata', error.message || 'Çıkış yapılamadı');
            }
          },
        },
      ]
    );
  };

  const handleTestNotification = async () => {
    try {
      console.log('📱 [TEST] Testing vocabulary notification...');
      
      // Get notification service status
      const status = await NotificationService.getStatus();
      console.log('📱 [TEST] Notification status:', status);
      
      if (!status.hasPermission) {
        Alert.alert('Bildirimler Kapalı', 'Bildirimler için izin gereklidir. Lütfen ayarlardan bildirim izinlerini açınız.');
        return;
      }
      
      // Get a random word and schedule notification
      const randomWord = await NotificationService.getRandomUnlearnedWord();
      
      if (randomWord) {
        await NotificationService.scheduleVocabularyNotification(randomWord);
        Alert.alert('Test Bildirimi', `"${randomWord.word}" kelimesi için test bildirimi gönderildi!`);
      } else {
        Alert.alert(
          'Kelime Bulunamadı', 
          'Öğrenilmemiş kelime bulunamadı. Bu durum şu nedenlerden kaynaklanabilir:\n\n• Kelime listeniz boş\n• Tüm kelimeler öğrenilmiş olarak işaretli\n• Oturum süresi dolmuş (lütfen tekrar giriş yapın)'
        );
      }
    } catch (error: any) {
      console.error('📱 [TEST] Test notification failed:', error);
      let errorMessage = 'Test bildirimi gönderilemedi.';
      
      if (error?.response?.status === 401) {
        errorMessage = 'Oturum süresi dolmuş. Lütfen çıkış yapıp tekrar giriş yapın.';
      }
      
      Alert.alert('Hata', errorMessage);
    }
  };

  const handleNotificationStatus = async () => {
    try {
      const status = await NotificationService.getStatus();
      const statusText = `
Bildirim Durumu:
• Başlatılmış: ${status.isInitialized ? 'Evet' : 'Hayır'}
• İzin Verilmiş: ${status.hasPermission ? 'Evet' : 'Hayır'}
• Zamanlanmış Bildirim: ${status.scheduledCount} adet

${!status.hasPermission ? '\n⚠️ Bildirim izni gereklidir' : ''}
${!status.isInitialized ? '\n⚠️ Servis başlatılmamış' : ''}
      `.trim();
      
      Alert.alert('Bildirim Durumu', statusText);
    } catch (error) {
      Alert.alert('Hata', 'Bildirim durumu alınamadı.');
    }
  };

  const handleQuickDebug = async () => {
    try {
      // Restart smart notifications immediately
      await NotificationService.setupSmartVocabularyNotifications();
      Alert.alert('🔧 Debug Tamamlandı', 'Akıllı bildirimler yeniden başlatıldı!\n\nProfil → Bildirim Durumu ile kontrol edin.');
    } catch (error: any) {
      Alert.alert('Hata', 'Debug işlemi başarısız: ' + (error.message || 'Bilinmeyen hata'));
    }
  };

  const menuItems = [
    { id: 1, title: 'Hesap Ayarları', icon: 'settings', action: () => {} },
    { id: 2, title: 'Ses Geçmişi', icon: 'history', action: () => {} },
    { id: 3, title: 'Üyelik', icon: 'card-membership', action: () => {} },
    { id: 4, title: 'Test Bildirimi', icon: 'notifications', action: handleTestNotification },
    { id: 5, title: 'Bildirim Durumu', icon: 'notifications-active', action: handleNotificationStatus },
    { id: 8, title: '🔧 Hızlı Debug', icon: 'bug-report', action: handleQuickDebug },
    { id: 6, title: 'Yardım', icon: 'help', action: () => {} },
    { id: 7, title: 'Hakkında', icon: 'info', action: () => {} },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Icon name="person" size={40} color="#007AFF" />
          </View>
          <Text style={styles.name}>{user?.full_name || 'Kullanıcı'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.membershipBadge}>
            <Text style={styles.membershipText}>
              {user?.membership_level?.toUpperCase() || 'FREE'}
            </Text>
          </View>
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
          <Text style={styles.signOutText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </ScrollView>
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
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  membershipBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  membershipText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
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
});

export default ProfileScreen; 