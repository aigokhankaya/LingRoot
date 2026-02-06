import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useLanguage } from '../contexts/LanguageContext';
import { getReminderSettings, saveReminderSettings, ReminderSettings } from '../services/userService';
import NotificationService from '../services/notificationService';
import { COLORS } from '../theme/colors';

const ReminderSettingsScreen: React.FC = () => {
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [settings, setSettings] = useState<ReminderSettings>({
    wordsPerDay: 5,
    startTime: '09:00',
    endTime: '18:00',
    isEnabled: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const data = await getReminderSettings();
      setSettings(data);
    } catch (error) {
      console.error('Error loading reminder settings:', error);
      Alert.alert(
        language === 'tr' ? 'Hata' : 'Error',
        language === 'tr' ? 'Ayarlar yüklenirken hata oluştu' : 'Failed to load settings'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Always cancel existing notifications first before saving new settings
      try {
        await NotificationService.stopVocabularyReminders();
      } catch (error) {
        console.error('Error canceling existing notifications:', error);
      }

      // Save settings to backend
      await saveReminderSettings(settings);

      // If reminders are enabled, reschedule with new settings
      if (settings.isEnabled) {
        try {
          await NotificationService.setupSmartVocabularyNotifications();
        } catch (error) {
          console.error('Error rescheduling notifications:', error);
        }
      }

      Alert.alert(
        language === 'tr' ? 'Başarılı' : 'Success',
        language === 'tr'
          ? settings.isEnabled
            ? 'Hatırlatma ayarları başarıyla kaydedildi!\n\nYeni ayarlar aktif olacak.'
            : 'Hatırlatma ayarları kaydedildi.\n\nTüm zamanlanmış bildirimler iptal edildi.'
          : settings.isEnabled
            ? 'Reminder settings saved successfully!\n\nNew settings will be active.'
            : 'Reminder settings saved.\n\nAll scheduled notifications have been canceled.'
      );
    } catch (error) {
      console.error('Error saving reminder settings:', error);
      Alert.alert(
        language === 'tr' ? 'Hata' : 'Error',
        language === 'tr' ? 'Ayarlar kaydedilirken hata oluştu' : 'Failed to save settings'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const wordsPerDayOptions = [1, 3, 5, 7, 10, 15, 20];

  // Generate all 24 hours
  const allTimeOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return `${hour}:00`;
  });

  const handleTimeSelect = (time: string, isStartTime: boolean) => {
    if (isStartTime) {
      setSettings({ ...settings, startTime: time });
      setShowStartTimePicker(false);
    } else {
      setSettings({ ...settings, endTime: time });
      setShowEndTimePicker(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>
            {language === 'tr' ? 'Ayarlar yükleniyor...' : 'Loading settings...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Header Info */}
        <View style={styles.headerInfo}>
          <Icon name="notifications-active" size={48} color={COLORS.primary} />
          <Text style={styles.headerTitle}>
            {language === 'tr' ? 'Kelime Hatırlatma Ayarları' : 'Word Reminder Settings'}
          </Text>
          <Text style={styles.headerDescription}>
            {language === 'tr'
              ? 'Kelime öğrenme hatırlatmalarınızı özelleştirin'
              : 'Customize your word learning reminders'}
          </Text>
        </View>

        {/* Enable/Disable Toggle */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.sectionTitle}>
                {language === 'tr' ? 'Hatırlatıcıları Aktif Et' : 'Enable Reminders'}
              </Text>
              <Text style={styles.sectionDescription}>
                {language === 'tr'
                  ? 'Kelime hatırlatmalarını aç/kapat'
                  : 'Turn word reminders on/off'}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.toggleSwitch,
                settings.isEnabled && styles.toggleSwitchActive,
              ]}
              onPress={() => setSettings({ ...settings, isEnabled: !settings.isEnabled })}
            >
              <View
                style={[
                  styles.toggleThumb,
                  settings.isEnabled && styles.toggleThumbActive,
                ]}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Words Per Day Setting */}
        <View style={[styles.section, !settings.isEnabled && styles.sectionDisabled]}>
          <Text style={[styles.sectionTitle, !settings.isEnabled && styles.textDisabled]}>
            {language === 'tr' ? 'Günlük Kelime Sayısı' : 'Words Per Day'}
          </Text>
          <Text style={[styles.sectionDescription, !settings.isEnabled && styles.textDisabled]}>
            {language === 'tr'
              ? 'Günde kaç kelime hatırlatılsın?'
              : 'How many words should be reminded per day?'}
          </Text>
          <View style={styles.optionsGrid}>
            {wordsPerDayOptions.map((count) => (
              <TouchableOpacity
                key={count}
                style={[
                  styles.optionButton,
                  settings.wordsPerDay === count && styles.optionButtonSelected,
                  !settings.isEnabled && styles.optionButtonDisabled,
                ]}
                onPress={() => settings.isEnabled && setSettings({ ...settings, wordsPerDay: count })}
                disabled={!settings.isEnabled}
              >
                <Text
                  style={[
                    styles.optionText,
                    settings.wordsPerDay === count && styles.optionTextSelected,
                    !settings.isEnabled && styles.textDisabled,
                  ]}
                >
                  {count} {language === 'tr' ? 'kelime' : 'words'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Time Range Setting */}
        <View style={[styles.section, !settings.isEnabled && styles.sectionDisabled]}>
          <Text style={[styles.sectionTitle, !settings.isEnabled && styles.textDisabled]}>
            {language === 'tr' ? 'Bildirim Saat Aralığı' : 'Notification Time Range'}
          </Text>
          <Text style={[styles.sectionDescription, !settings.isEnabled && styles.textDisabled]}>
            {language === 'tr'
              ? 'Bildirim yapılacak saat aralığını belirleyin'
              : 'Set the time range for notifications'}
          </Text>

          {/* Start Time Selector */}
          <View style={styles.timeRow}>
            <Text style={[styles.timeLabel, !settings.isEnabled && styles.textDisabled]}>
              {language === 'tr' ? 'Başlangıç Saati' : 'Start Time'}
            </Text>
            <TouchableOpacity
              style={[styles.timeSelector, !settings.isEnabled && styles.timeSelectorDisabled]}
              onPress={() => settings.isEnabled && setShowStartTimePicker(true)}
              disabled={!settings.isEnabled}
            >
              <Text style={[styles.timeSelectorText, !settings.isEnabled && styles.textDisabled]}>
                {settings.startTime}
              </Text>
              <Icon name="arrow-drop-down" size={24} color={settings.isEnabled ? "#666" : "#ccc"} />
            </TouchableOpacity>
          </View>

          {/* End Time Selector */}
          <View style={styles.timeRow}>
            <Text style={[styles.timeLabel, !settings.isEnabled && styles.textDisabled]}>
              {language === 'tr' ? 'Bitiş Saati' : 'End Time'}
            </Text>
            <TouchableOpacity
              style={[styles.timeSelector, !settings.isEnabled && styles.timeSelectorDisabled]}
              onPress={() => settings.isEnabled && setShowEndTimePicker(true)}
              disabled={!settings.isEnabled}
            >
              <Text style={[styles.timeSelectorText, !settings.isEnabled && styles.textDisabled]}>
                {settings.endTime}
              </Text>
              <Icon name="arrow-drop-down" size={24} color={settings.isEnabled ? "#666" : "#ccc"} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Icon name="info" size={20} color={COLORS.primary} style={styles.infoIcon} />
          <Text style={styles.infoText}>
            {language === 'tr'
              ? 'Seçilen saat aralığında eşit aralıklarla hatırlatmalar yapılacaktır. Hatırlatmalar, öğrenmediğiniz kelimelerden rastgele seçilir.'
              : 'Reminders will be sent at equal intervals within the selected time range. Reminders are randomly selected from your unlearned words.'}
          </Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Icon name="save" size={20} color="#fff" style={styles.saveIcon} />
              <Text style={styles.saveButtonText}>
                {language === 'tr' ? 'Ayarları Kaydet' : 'Save Settings'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Start Time Picker Modal */}
      <Modal
        visible={showStartTimePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowStartTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {language === 'tr' ? 'Başlangıç Saati Seçin' : 'Select Start Time'}
              </Text>
              <TouchableOpacity onPress={() => setShowStartTimePicker(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.timeList}>
              {allTimeOptions.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeOption,
                    settings.startTime === time && styles.timeOptionSelected,
                  ]}
                  onPress={() => handleTimeSelect(time, true)}
                >
                  <Text
                    style={[
                      styles.timeOptionText,
                      settings.startTime === time && styles.timeOptionTextSelected,
                    ]}
                  >
                    {time}
                  </Text>
                  {settings.startTime === time && (
                    <Icon name="check" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* End Time Picker Modal */}
      <Modal
        visible={showEndTimePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEndTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {language === 'tr' ? 'Bitiş Saati Seçin' : 'Select End Time'}
              </Text>
              <TouchableOpacity onPress={() => setShowEndTimePicker(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.timeList}>
              {allTimeOptions.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeOption,
                    settings.endTime === time && styles.timeOptionSelected,
                  ]}
                  onPress={() => handleTimeSelect(time, false)}
                >
                  <Text
                    style={[
                      styles.timeOptionText,
                      settings.endTime === time && styles.timeOptionTextSelected,
                    ]}
                  >
                    {time}
                  </Text>
                  {settings.endTime === time && (
                    <Icon name="check" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingTop: 44,
    paddingBottom: 100,
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
  headerInfo: {
    backgroundColor: 'transparent',
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.slate800,
    marginTop: 16,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  headerDescription: {
    fontSize: 14,
    color: COLORS.slate500,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  section: {
    backgroundColor: COLORS.surfaceGlass,
    marginTop: 16,
    marginHorizontal: 24,
    padding: 24,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    shadowColor: COLORS.brandIndigo,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 32,
    elevation: 4,
  },
  sectionDisabled: {
    opacity: 0.4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.slate800,
    marginBottom: 6,
  },
  sectionDescription: {
    fontSize: 13,
    color: COLORS.slate500,
    marginBottom: 20,
    fontWeight: '500',
  },
  textDisabled: {
    color: COLORS.slate300,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleSwitch: {
    width: 56,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.slate200,
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: COLORS.brandTeal,
  },
  toggleThumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleThumbActive: {
    transform: [{ translateX: 24 }],
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.slate100,
    backgroundColor: COLORS.surface,
  },
  optionButtonSelected: {
    backgroundColor: COLORS.brandOrange,
    borderColor: COLORS.brandOrange,
    shadowColor: COLORS.brandOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
  optionButtonDisabled: {
    opacity: 0.4,
  },
  optionText: {
    fontSize: 13,
    color: COLORS.slate600,
    fontWeight: '700',
  },
  optionTextSelected: {
    color: '#FFFFFF',
  },
  timeRow: {
    marginBottom: 20,
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.slate400,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 4,
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.slate100,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  timeSelectorText: {
    fontSize: 16,
    color: COLORS.slate700,
    fontWeight: '700',
  },
  timeSelectorDisabled: {
    opacity: 0.4,
  },
  infoBox: {
    backgroundColor: 'rgba(39, 190, 170, 0.08)',
    marginHorizontal: 24,
    marginTop: 20,
    padding: 20,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(39, 190, 170, 0.15)',
  },
  infoIcon: {
    marginRight: 14,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.brandTeal,
    lineHeight: 20,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: COLORS.brandTeal,
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 40,
    padding: 18,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.brandTeal,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  saveButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveIcon: {
    marginRight: 10,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '70%',
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
  timeList: {
    maxHeight: 400,
  },
  timeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate100,
  },
  timeOptionSelected: {
    backgroundColor: 'rgba(245, 165, 36, 0.08)',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.brandOrange,
  },
  timeOptionText: {
    fontSize: 16,
    color: COLORS.slate700,
    fontWeight: '600',
  },
  timeOptionTextSelected: {
    color: COLORS.brandOrange,
    fontWeight: '700',
  },
});

export default React.memo(ReminderSettingsScreen);
