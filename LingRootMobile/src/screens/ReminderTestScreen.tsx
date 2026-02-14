import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useLanguage } from '../contexts/LanguageContext';
import { COLORS } from '../theme/colors';
import { ReminderSettingsService, ReminderSettings } from '../services/reminderSettingsService';
import NotificationService from '../services/notificationService';
import { getVocabulary } from '../services/api';
import type { VocabularyWord } from '../services/api';

interface NotificationStatus {
  isInitialized: boolean;
  hasPermission: boolean;
  scheduledCount: number;
}

const ReminderTestScreen: React.FC = () => {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [notificationStatus, setNotificationStatus] = useState<NotificationStatus | null>(null);
  const [unlearnedWords, setUnlearnedWords] = useState<VocabularyWord[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);

      // Load reminder settings
      const reminderSettings = await ReminderSettingsService.getSettings();
      setSettings(reminderSettings);

      // Load notification status
      const status = await NotificationService.getStatus();
      setNotificationStatus(status);

      // Load unlearned vocabulary words
      const words = await getVocabulary();
      const unlearned = Array.isArray(words)
        ? words.filter(w => w && (w.is_learned === false || typeof w.is_learned === 'undefined'))
        : [];
      setUnlearnedWords(unlearned);
    } catch (err) {
      setError(language === 'tr' ? 'Veriler yüklenirken hata oluştu' : 'Error loading data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [language]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const renderStatusIcon = (isActive: boolean) => (
    <Icon
      name={isActive ? 'check-circle' : 'cancel'}
      size={20}
      color={isActive ? '#22c55e' : COLORS.danger}
    />
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.brandTeal} />
          <Text style={styles.loadingText}>
            {language === 'tr' ? 'Yükleniyor...' : 'Loading...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {error && (
          <View style={styles.errorContainer}>
            <Icon name="error" size={24} color={COLORS.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Reminder Settings Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="alarm" size={24} color={COLORS.brandTeal} />
            <Text style={styles.sectionTitle}>
              {language === 'tr' ? 'Hatırlatma Ayarları' : 'Reminder Settings'}
            </Text>
          </View>

          {settings && (
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.label}>
                  {language === 'tr' ? 'Hatırlatmalar Aktif' : 'Reminders Enabled'}
                </Text>
                <View style={styles.valueContainer}>
                  {renderStatusIcon(settings.isEnabled)}
                  <Text style={styles.value}>
                    {settings.isEnabled
                      ? (language === 'tr' ? 'Evet' : 'Yes')
                      : (language === 'tr' ? 'Hayır' : 'No')}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.row}>
                <Text style={styles.label}>
                  {language === 'tr' ? 'Günlük Kelime Sayısı' : 'Words Per Day'}
                </Text>
                <Text style={styles.value}>{settings.wordsPerDay}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.row}>
                <Text style={styles.label}>
                  {language === 'tr' ? 'Başlangıç Saati' : 'Start Time'}
                </Text>
                <Text style={styles.value}>{settings.startTime}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.row}>
                <Text style={styles.label}>
                  {language === 'tr' ? 'Bitiş Saati' : 'End Time'}
                </Text>
                <Text style={styles.value}>{settings.endTime}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Notification Status Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="notifications" size={24} color={COLORS.brandOrange} />
            <Text style={styles.sectionTitle}>
              {language === 'tr' ? 'Bildirim Durumu' : 'Notification Status'}
            </Text>
          </View>

          {notificationStatus && (
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.label}>
                  {language === 'tr' ? 'Servis Başlatılmış' : 'Service Initialized'}
                </Text>
                <View style={styles.valueContainer}>
                  {renderStatusIcon(notificationStatus.isInitialized)}
                  <Text style={styles.value}>
                    {notificationStatus.isInitialized
                      ? (language === 'tr' ? 'Evet' : 'Yes')
                      : (language === 'tr' ? 'Hayır' : 'No')}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.row}>
                <Text style={styles.label}>
                  {language === 'tr' ? 'İzin Verilmiş' : 'Permission Granted'}
                </Text>
                <View style={styles.valueContainer}>
                  {renderStatusIcon(notificationStatus.hasPermission)}
                  <Text style={styles.value}>
                    {notificationStatus.hasPermission
                      ? (language === 'tr' ? 'Evet' : 'Yes')
                      : (language === 'tr' ? 'Hayır' : 'No')}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.row}>
                <Text style={styles.label}>
                  {language === 'tr' ? 'Zamanlanmış Bildirim' : 'Scheduled Notifications'}
                </Text>
                <Text style={styles.value}>
                  {notificationStatus.scheduledCount} {language === 'tr' ? 'adet' : 'items'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Unlearned Words Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="library-books" size={24} color={COLORS.brandIndigo} />
            <Text style={styles.sectionTitle}>
              {language === 'tr' ? 'Öğrenilmemiş Kelimeler' : 'Unlearned Words'}
              <Text style={styles.countBadge}> ({unlearnedWords.length})</Text>
            </Text>
          </View>

          <View style={styles.card}>
            {unlearnedWords.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="check-circle" size={48} color="#22c55e" />
                <Text style={styles.emptyText}>
                  {language === 'tr'
                    ? 'Tüm kelimeler öğrenildi!'
                    : 'All words have been learned!'}
                </Text>
              </View>
            ) : (
              unlearnedWords.slice(0, 20).map((word, index) => (
                <View key={word.id || index}>
                  {index > 0 && <View style={styles.divider} />}
                  <View style={styles.wordRow}>
                    <View style={styles.wordInfo}>
                      <Text style={styles.wordText}>{word.word}</Text>
                      {word.definition && (
                        <Text style={styles.definitionText} numberOfLines={2}>
                          {word.definition}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              ))
            )}
            {unlearnedWords.length > 20 && (
              <View style={styles.moreContainer}>
                <Text style={styles.moreText}>
                  +{unlearnedWords.length - 20} {language === 'tr' ? 'kelime daha' : 'more words'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Bottom spacing for safe area */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
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
    paddingTop: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.slate600,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: {
    marginLeft: 12,
    fontSize: 14,
    color: COLORS.danger,
    flex: 1,
  },
  section: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.slate800,
  },
  countBadge: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.slate500,
  },
  card: {
    backgroundColor: '#f8f9ff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: {
    fontSize: 15,
    color: COLORS.slate600,
    flex: 1,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.slate800,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.slate200,
    marginVertical: 8,
  },
  wordRow: {
    paddingVertical: 8,
  },
  wordInfo: {
    flex: 1,
  },
  wordText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.slate800,
  },
  definitionText: {
    fontSize: 14,
    color: COLORS.slate500,
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.slate600,
    textAlign: 'center',
  },
  moreContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  moreText: {
    fontSize: 14,
    color: COLORS.brandTeal,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 100,
  },
});

export default ReminderTestScreen;
