import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS } from '../theme/colors';
import { useCustomAlert } from '../contexts/AlertContext';

// Phone helpers: Turkish format +90 555 123 45 67
const extractDigits = (value: string) => (value || '').replace(/\D+/g, '');
const extractTRLocalDigits = (value: string) => {
  const digits = extractDigits(value);
  // Remove country code if present
  let d = digits.startsWith('90') ? digits.slice(2) : digits;
  // Drop a single leading 0 (common for local format like 0 5xx ...)
  if (d.startsWith('0')) d = d.slice(1);
  // Limit to max 10 local digits
  d = d.slice(0, 10);
  return d;
};
const normalizeTRPhone = (value: string) => {
  const local = extractTRLocalDigits(value);
  return local ? `+90${local}` : '';
};
const formatTRPhone = (value: string) => {
  const local = extractTRLocalDigits(value);
  let parts: string[] = [];
  if (local.length <= 3) parts = [local];
  else if (local.length <= 6) parts = [local.slice(0, 3), local.slice(3)];
  else if (local.length <= 8) parts = [local.slice(0, 3), local.slice(3, 6), local.slice(6)];
  else parts = [local.slice(0, 3), local.slice(3, 6), local.slice(6, 8), local.slice(8, 10)];
  const spaced = parts.filter(Boolean).join(' ').trim();
  return spaced ? `+90 ${spaced}` : '';
};

const AccountSettingsScreen: React.FC = () => {
  const { user, updateUserProfile, signOut } = useAuth();
  const { t, language } = useLanguage();
  const { showAlert } = useCustomAlert();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Delete Account Modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteEmailInput, setDeleteEmailInput] = useState('');
  const [deletionInfo, setDeletionInfo] = useState<any>(null);

  // Load current phone from backend and prefill
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await apiService.getMe();
        const backendPhone: string | undefined = me?.phonenumber || me?.phoneNumber || me?.phone;
        if (mounted && backendPhone) {
          setPhone(formatTRPhone(backendPhone));
        }
      } catch {
        // silent: leave blank if not available
      }
    })();
    return () => { mounted = false; };
  }, []);

  const isValid = useMemo(() => {
    const nameOk = fullName.trim().length >= 2;
    // phone optional but if present must be valid 10 local digits
    const local = extractTRLocalDigits(phone);
    const phoneOk = phone.trim() === '' || local.length === 10;
    return nameOk && phoneOk;
  }, [fullName, phone]);

  const trOrEn = (tr: string, en: string) => (language === 'tr' ? tr : en);
  const withFallback = (key: string, tr: string, en: string) => {
    const val = t(key);
    return val && val !== key ? val : trOrEn(tr, en);
  };
  const saveLabel = withFallback('common.save', 'Kaydet', 'Save');
  const savingLabel = withFallback('common.saving', 'Kaydediliyor...', 'Saving...');

  const onSave = async () => {
    if (!fullName.trim()) {
      Alert.alert(t('common.error'), t('register.errors.fullNameRequired'));
      return;
    }
    const local = extractTRLocalDigits(phone);
    if (phone.trim() && local.length !== 10) {
      Alert.alert(t('common.error'), 'Lütfen geçerli bir telefon numarası girin');
      return;
    }

    try {
      setIsSaving(true);
      const payload: any = { full_name: fullName.trim() };
      const normalizedPhone = normalizeTRPhone(phone);
      if (normalizedPhone) payload.phoneNumber = normalizedPhone;

      await updateUserProfile(payload);
      // Keep phone input as formatted version after save
      if (normalizedPhone) setPhone(formatTRPhone(normalizedPhone));
      Alert.alert(t('common.success'), t('profile.updated'));
    } catch (e: any) {
      Alert.alert(t('notifications.error'), e.message || t('profile.updateFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  // Open Delete Account Modal
  const openDeleteModal = async () => {
    try {
      const info = await apiService.getAccountDeletionInfo();
      setDeletionInfo(info.data);
      setDeleteEmailInput('');
      setShowDeleteModal(true);
    } catch (error: any) {
      showAlert(
        language === 'tr' ? 'Hata' : 'Error',
        error.message || (language === 'tr'
          ? 'Hesap bilgileri alınamadı.'
          : 'Failed to get account information.'),
        [{ text: 'OK', style: 'default' }],
        'error-outline',
        '#EF4444'
      );
    }
  };

  // Handle permanent deletion after email confirmation
  const handlePermanentDelete = () => {
    // Check if email matches
    if (deleteEmailInput.trim().toLowerCase() !== email.toLowerCase()) {
      showAlert(
        language === 'tr' ? 'Hata' : 'Error',
        language === 'tr'
          ? 'Girdiğiniz e-posta adresi hesabınızla eşleşmiyor.'
          : 'The email address you entered does not match your account.',
        [{ text: 'OK', style: 'default' }],
        'error-outline',
        '#EF4444'
      );
      return;
    }

    // Show final confirmation
    const warningMessage = language === 'tr'
      ? `Bu işlem geri alınamaz!\n\nSilinecek veriler:\n• ${deletionInfo?.contentCount || 0} içerik\n• ${deletionInfo?.vocabularyCount || 0} kelime\n${deletionInfo?.hasActiveSubscription ? '• Aktif abonelik\n' : ''}\nDevam etmek istediğinizden emin misiniz?`
      : `This action cannot be undone!\n\nData to be deleted:\n• ${deletionInfo?.contentCount || 0} content items\n• ${deletionInfo?.vocabularyCount || 0} vocabulary words\n${deletionInfo?.hasActiveSubscription ? '• Active subscription\n' : ''}\nAre you sure you want to continue?`;

    Alert.alert(
      language === 'tr' ? '⚠️ Son Onay' : '⚠️ Final Confirmation',
      warningMessage,
      [
        {
          text: language === 'tr' ? 'İptal' : 'Cancel',
          style: 'cancel'
        },
        {
          text: language === 'tr' ? 'Evet, Sil' : 'Yes, Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              setShowDeleteModal(false);
              await apiService.deleteAccount();

              showAlert(
                language === 'tr' ? 'Başarılı' : 'Success',
                language === 'tr'
                  ? 'Hesabınız başarıyla silindi.'
                  : 'Your account has been successfully deleted.',
                [
                  {
                    text: 'OK',
                    style: 'default',
                    onPress: () => signOut()
                  }
                ],
                'check-circle',
                COLORS.primary
              );
            } catch (error: any) {
              showAlert(
                language === 'tr' ? 'Hata' : 'Error',
                error.message || (language === 'tr'
                  ? 'Hesap silme işlemi başarısız oldu.'
                  : 'Account deletion failed.'),
                [{ text: 'OK', style: 'default' }],
                'error-outline',
                '#EF4444'
              );
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View style={styles.section}>
          <Text style={styles.label}>{t('register.fullName')}</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            placeholder={t('register.fullName')}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            value={email}
            editable={false}
            selectTextOnFocus={false}
          />

          <Text style={styles.label}>{language === 'tr' ? 'Telefon' : 'Phone'}</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={(v) => setPhone(formatTRPhone(v))}
            keyboardType="phone-pad"
            placeholder="+90 555 123 45 67"
          />
        </View>

        <TouchableOpacity style={[styles.button, (!isValid || isSaving) && styles.buttonDisabled]} onPress={onSave} disabled={!isValid || isSaving}>
          <Text style={styles.buttonText}>{isSaving ? savingLabel : saveLabel}</Text>
        </TouchableOpacity>

        {/* Danger Zone - Account Deletion */}
        <View style={styles.dangerZone}>
          <Text style={styles.dangerZoneTitle}>
            {language === 'tr' ? '⚠️ Tehlikeli Bölge' : '⚠️ Danger Zone'}
          </Text>
          <Text style={styles.dangerZoneDescription}>
            {language === 'tr'
              ? 'Hesabınızı silmek tüm verilerinizi kalıcı olarak siler. Bu işlem geri alınamaz.'
              : 'Deleting your account will permanently remove all your data. This action cannot be undone.'}
          </Text>
          <TouchableOpacity
            style={[styles.deleteButton, isDeleting && styles.buttonDisabled]}
            onPress={openDeleteModal}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Icon name="delete-forever" size={20} color="#FFF" />
                <Text style={styles.deleteButtonText}>
                  {language === 'tr' ? 'Kullanıcı Verilerinin Silinmesini Talep Et' : 'Request to delete user data'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Delete Account Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <Text style={styles.modalTitle}>
              {language === 'tr' ? 'Hesabı Sil' : 'Delete Account'}
            </Text>
            <Text style={styles.modalDescription}>
              {language === 'tr'
                ? 'Hesap silme işlemini onaylamak için lütfen e-posta adresinizi girin.'
                : 'Please enter your email address to confirm account deletion.'}
            </Text>

            {/* Email Input */}
            <TextInput
              style={styles.modalInput}
              value={deleteEmailInput}
              onChangeText={setDeleteEmailInput}
              placeholder={language === 'tr' ? 'E-posta adresinizi girin' : 'Enter your email'}
              placeholderTextColor={COLORS.slate400}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Permanently Delete Button */}
            <TouchableOpacity
              style={[
                styles.modalDeleteButton,
                !deleteEmailInput.trim() && styles.modalDeleteButtonDisabled
              ]}
              onPress={handlePermanentDelete}
              disabled={!deleteEmailInput.trim()}
            >
              <Text style={styles.modalDeleteButtonText}>
                {language === 'tr' ? 'Hesabı kalıcı olarak sil' : 'Permanently delete account'}
              </Text>
            </TouchableOpacity>

            {/* Cancel Link */}
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowDeleteModal(false)}
            >
              <Text style={styles.modalCancelText}>
                {language === 'tr' ? 'İptal' : 'Cancel'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  content: {
    padding: 24,
    paddingBottom: 100
  },
  section: {
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    shadowColor: COLORS.brandIndigo,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 32,
    elevation: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.slate400,
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginLeft: 4,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    paddingHorizontal: 20,
    fontSize: 15,
    borderWidth: 1,
    borderColor: COLORS.slate100,
    color: COLORS.slate700,
    fontWeight: '600',
  },
  inputDisabled: {
    backgroundColor: COLORS.slate50,
    color: COLORS.slate400
  },
  button: {
    backgroundColor: COLORS.brandTeal,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: COLORS.brandTeal,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: COLORS.slate200,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800'
  },
  buttonSecondary: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.brandTeal
  },
  buttonSecondaryText: {
    color: COLORS.brandTeal,
    fontSize: 16,
    fontWeight: '800'
  },
  dangerZone: {
    marginTop: 40,
    padding: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.1)',
  },
  dangerZoneTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#EF4444',
    marginBottom: 8,
  },
  dangerZoneDescription: {
    fontSize: 13,
    color: '#B91C1C',
    marginBottom: 20,
    lineHeight: 20,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.slate800,
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 14,
    color: COLORS.slate500,
    lineHeight: 20,
    marginBottom: 24,
  },
  modalInput: {
    backgroundColor: COLORS.slate50,
    borderRadius: 16,
    padding: 16,
    paddingHorizontal: 20,
    fontSize: 15,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    color: COLORS.slate700,
    marginBottom: 16,
  },
  modalDeleteButton: {
    backgroundColor: COLORS.brandTeal,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  modalDeleteButtonDisabled: {
    backgroundColor: COLORS.slate300,
  },
  modalDeleteButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalCancelButton: {
    alignItems: 'center',
    padding: 12,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.brandTeal,
  },
});

export default AccountSettingsScreen;

