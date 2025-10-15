import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, CommonActions, useRoute } from '@react-navigation/native';
import { isAppleSignInAvailable } from '../services/socialAuth';

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
  return `+90${local}`;
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

const RegisterScreen: React.FC = () => {
  const route = useRoute<any>();
  const socialData = route.params?.socialData;
  
  const [email, setEmail] = useState(socialData?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState(socialData?.name || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAppleSignIn, setShowAppleSignIn] = useState(false);
  const [isSocialRegister, setIsSocialRegister] = useState(!!socialData);
  const { signUp, signInWithGoogle, signInWithApple } = useAuth();
  const { t } = useLanguage();
  const navigation = useNavigation();

  useEffect(() => {
    // Check if Apple Sign-In is available
    isAppleSignInAvailable().then(setShowAppleSignIn);
    
    // Eğer social data varsa, kullanıcıya bilgi ver
    if (socialData) {
      Alert.alert(
        t('common.info') || 'Bilgi',
        'Google hesabınızla kayıt olmak için lütfen telefon numaranızı girin ve şartları kabul edin.',
        [{ text: 'OK' }]
      );
    }
  }, []);

  const emailRegex = useMemo(() => /\S+@\S+\.\S+/, []);
  const isFormValid = useMemo(() => {
    const phoneDigits = extractTRLocalDigits(phoneNumber);
    
    // Social register için sadece telefon ve şartlar yeterli
    if (isSocialRegister) {
      return phoneDigits.length === 10 && acceptTerms;
    }
    
    // Normal register için tüm alanlar gerekli
    return (
      fullName.trim().length >= 2 &&
      emailRegex.test(email.trim()) &&
      phoneDigits.length === 10 &&
      password.length >= 6 &&
      confirmPassword.length >= 6 &&
      password === confirmPassword &&
      acceptTerms
    );
  }, [fullName, email, phoneNumber, password, confirmPassword, acceptTerms, emailRegex, isSocialRegister]);

  const handleGoogleSignIn = async () => {
    if (!signInWithGoogle) return;
    try {
      await signInWithGoogle();
    } catch (error: any) {
      // Kullanıcı sistemde yoksa, bu ekranda zaten kayıt yapıyoruz
      if (error.code === 'USER_NOT_FOUND') {
        Alert.alert(
          t('common.info') || 'Bilgi',
          'Lütfen telefon numaranızı girin ve kayıt işlemini tamamlayın.'
        );
        return;
      }
      Alert.alert(t('common.error'), error.message || 'Google ile kayıt başarısız');
    }
  };

  // Facebook sign-in removed

  const handleAppleSignIn = async () => {
    if (!signInWithApple) return;
    try {
      await signInWithApple();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || 'Apple ile kayıt başarısız');
    }
  };

  const handleSocialRegister = async () => {
    // Social register için sadece telefon numarası ve şartlar gerekli
    const phoneDigits = extractTRLocalDigits(phoneNumber);
    if (phoneDigits.length !== 10) return Alert.alert(t('common.error'), 'Lütfen geçerli bir telefon numarası girin');
    if (!acceptTerms) return Alert.alert(t('common.error'), t('register.errors.acceptTerms'));

    setIsLoading(true);
    try {
      const normalizedPhone = normalizeTRPhone(phoneNumber);
      const API_BASE_URL = 'https://lingloops-backend.onrender.com';
      
      // Backend'e social register isteği gönder
      const endpoint = socialData.provider === 'google' 
        ? '/api/auth/google-register'
        : '/api/auth/apple-register';
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          credential: socialData.credential,
          phoneNumber: normalizedPhone,
          fullName: fullName.trim() || socialData.name,
          email: email.trim() || socialData.email,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Kayıt başarısız');
      }

      setIsLoading(false);
      
      Alert.alert(
        t('common.success'),
        'Kayıt başarılı! Şimdi giriş yapabilirsiniz.',
        [
          { 
            text: 'OK', 
            onPress: () => {
              try { (navigation as any)?.navigate?.('Login'); } catch {}
            }
          }
        ]
      );
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || 'Kayıt başarısız');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!signInWithGoogle) return;
    try {
      await signInWithGoogle();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || 'Google ile kayıt başarısız');
    }
  };

  const handleFacebookSignIn = async () => {
    if (!signInWithFacebook) return;
    try {
      await signInWithFacebook();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || 'Facebook ile kayıt başarısız');
    }
  };

  const handleAppleSignIn = async () => {
    if (!signInWithApple) return;
    try {
      await signInWithApple();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || 'Apple ile kayıt başarısız');
    }
  };

  const handleRegister = async () => {
    // Eğer social register ise farklı akış
    if (isSocialRegister && socialData) {
      return handleSocialRegister();
    }

    // Normal register
    if (!fullName.trim()) return Alert.alert(t('common.error'), t('register.errors.fullNameRequired'));
    if (!emailRegex.test(email.trim())) return Alert.alert(t('common.error'), t('register.errors.emailInvalid'));
    const phoneDigits = extractTRLocalDigits(phoneNumber);
    if (phoneDigits.length !== 10) return Alert.alert(t('common.error'), 'Lütfen geçerli bir telefon numarası girin');
    if (password.length < 6) return Alert.alert(t('common.error'), t('register.errors.passwordShort'));
    if (password !== confirmPassword) return Alert.alert(t('common.error'), t('register.errors.passwordMismatch'));
    if (!acceptTerms) return Alert.alert(t('common.error'), t('register.errors.acceptTerms'));

    setIsLoading(true);
    try {
      const normalizedPhone = normalizeTRPhone(phoneNumber);
      await signUp(email.trim(), password, fullName.trim(), normalizedPhone);
      setIsLoading(false);
      const goToLogin = () => {
        try { (navigation as any)?.replace?.('Login'); } catch {}
        try { (navigation as any)?.navigate?.('Login'); } catch {}
        try { (navigation as any)?.getParent?.()?.navigate?.('Auth', { screen: 'Login' }); } catch {}
        try { (navigation as any)?.dispatch?.(CommonActions.reset({ index: 0, routes: [{ name: 'Auth' }] })); } catch {}
        try { (navigation as any)?.goBack?.(); } catch {}
      };
      goToLogin();

      // Also show confirmation (pressing OK will try navigate again)
      Alert.alert(
        t('common.success'),
        t('register.success'),
        [
          { text: t('common.ok'), onPress: goToLogin }
        ]
      );
    } catch (error: any) {
      Alert.alert(t('register.title'), error.message || t('register.errors.generic'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View style={styles.header}>
          <Text style={styles.title}>{t('register.title')}</Text>
          <Text style={styles.subtitle}>{t('register.subtitle')}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('register.fullName')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('register.fullName')}
              placeholderTextColor="#999"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('register.email')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('register.email')}
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Telefon Numarası</Text>
            <TextInput
              style={[styles.input, isSocialRegister && styles.disabledInput]}
              placeholder={t('register.email')}
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!isSocialRegister}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Telefon Numarası</Text>
            <TextInput
              style={styles.input}
              placeholder="+90 555 123 45 67"
              placeholderTextColor="#999"
              value={phoneNumber}
              onChangeText={(v) => setPhoneNumber(formatTRPhone(v))}
              keyboardType="phone-pad"
              autoComplete="tel"
            />
          </View>

          {!isSocialRegister && (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('register.password')}</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder={t('register.password')}
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                  />
                  <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(v => !v)}>
                    <Icon name={showPassword ? 'visibility-off' : 'visibility'} size={22} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('register.confirmPassword')}</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder={t('register.confirmPassword')}
                    placeholderTextColor="#999"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoComplete="password"
                  />
                  <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirmPassword(v => !v)}>
                    <Icon name={showConfirmPassword ? 'visibility-off' : 'visibility'} size={22} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          <TouchableOpacity style={styles.termsRow} onPress={() => setAcceptTerms(v => !v)}>
            <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
              {acceptTerms && <Icon name="check" size={16} color="#fff" />}
            </View>
            <Text style={styles.termsText}>
              <Text>LingRoot'un </Text>
              <Text 
                style={styles.linkText}
                onPress={(e) => {
                  e.stopPropagation();
                  Linking.openURL('https://www.lingroot.com/terms');
                }}
              >
                Hizmet Şartları
              </Text>
              <Text> ve </Text>
              <Text 
                style={styles.linkText}
                onPress={(e) => {
                  e.stopPropagation();
                  Linking.openURL('https://www.lingroot.com/privacy-policy');
                }}
              >
                Gizlilik Politikası
              </Text>
              <Text>'nı okudum ve kabul ediyorum.</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, (isLoading || !isFormValid) && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={isLoading || !isFormValid}
          >
            <Text style={styles.buttonText}>
              {isLoading ? t('register.registering') : t('register.cta')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkButton} onPress={() => { try { (navigation as any)?.navigate?.('Login'); } catch {} }}>
            <Text style={styles.linkText}>{t('register.haveAccount')}</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>veya</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.socialButton} onPress={handleGoogleSignIn}>
            <Icon name="google" size={20} color="#DB4437" />
            <Text style={styles.socialButtonText}>Google ile Kayıt Ol</Text>
          </TouchableOpacity>

          {showAppleSignIn && (
            <TouchableOpacity style={[styles.socialButton, styles.appleButton]} onPress={handleAppleSignIn}>
              <Icon name="apple" size={20} color="#000" />
              <Text style={[styles.socialButtonText, styles.appleButtonText]}>Apple ile Kayıt Ol</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#000', // Text color for visibility
  },
  disabledInput: {
    backgroundColor: '#f0f0f0',
    color: '#666',
  },
  inputWrapper: { position: 'relative' },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 15,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  termsText: {
    flex: 1,
    color: '#666',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 10,
  },
  linkText: {
    color: '#007AFF',
    fontSize: 14,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#666',
    fontSize: 14,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  socialButtonText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  appleButton: {
    backgroundColor: '#000',
  },
  appleButtonText: {
    color: '#fff',
  },
});

export default RegisterScreen; 