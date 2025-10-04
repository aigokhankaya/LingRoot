import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

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
  const { user, updateUserProfile } = useAuth();
  const { t, language } = useLanguage();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 20 },
  section: { backgroundColor: 'white', borderRadius: 12, padding: 16 },
  label: { fontSize: 14, color: '#666', marginTop: 8, marginBottom: 6 },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#333',
  },
  inputDisabled: { backgroundColor: '#f6f6f6', color: '#999' },
  button: { backgroundColor: '#007AFF', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 16 },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  buttonSecondary: { backgroundColor: '#fff', borderRadius: 8, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#007AFF' },
  buttonSecondaryText: { color: '#007AFF', fontSize: 16, fontWeight: 'bold' },
});

export default AccountSettingsScreen;
