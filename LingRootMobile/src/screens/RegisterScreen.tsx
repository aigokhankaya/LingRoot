import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Linking,
  Animated,
  Keyboard,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { isAppleSignInAvailable } from '../services/socialAuth';
import { COLORS } from '../theme/colors';

// Phone helpers: International E.164 format support
const extractDigits = (value: string) => (value || '').replace(/\D+/g, '');

// Normalize phone to E.164 format (supports international numbers)
const normalizePhoneNumber = (value: string): string => {
  let cleaned = value.replace(/[^\d+]/g, '');
  // Keep only the first + if present
  if (cleaned.includes('+')) {
    cleaned = '+' + cleaned.replace(/\+/g, '');
  }
  // If no country code, assume Turkish (+90)
  if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('0')) {
      cleaned = '+90' + cleaned.slice(1);
    } else if (cleaned.length >= 10) {
      cleaned = '+90' + cleaned;
    } else {
      cleaned = '+' + cleaned;
    }
  }
  return cleaned;
};

// Validate E.164 format: +[country code][number] (7-15 digits after +)
const isValidPhoneNumber = (value: string): boolean => {
  const normalized = normalizePhoneNumber(value);
  return /^\+[1-9]\d{6,14}$/.test(normalized);
};

// Format phone for display (Turkish format for +90, generic for others)
const formatPhoneForDisplay = (value: string): string => {
  const normalized = normalizePhoneNumber(value);
  if (normalized.startsWith('+90')) {
    // Turkish format: +90 555 123 45 67
    const local = normalized.slice(3).slice(0, 10);
    let parts: string[] = [];
    if (local.length <= 3) parts = [local];
    else if (local.length <= 6) parts = [local.slice(0, 3), local.slice(3)];
    else if (local.length <= 8) parts = [local.slice(0, 3), local.slice(3, 6), local.slice(6)];
    else parts = [local.slice(0, 3), local.slice(3, 6), local.slice(6, 8), local.slice(8, 10)];
    const spaced = parts.filter(Boolean).join(' ').trim();
    return spaced ? `+90 ${spaced}` : '';
  }
  // Generic international format
  return normalized;
};

// Password complexity: minimum 8 chars, at least 1 lowercase, 1 uppercase, 1 digit
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const isPasswordComplex = (password: string): boolean => {
  return PASSWORD_COMPLEXITY_REGEX.test(password);
};

// Password strength calculator
const calculatePasswordStrength = (password: string): { level: number; label: string; color: string } => {
  if (!password) return { level: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) return { level: 1, label: 'Zayıf', color: '#EF4444' };
  if (score === 3) return { level: 2, label: 'Orta', color: '#F59E0B' };
  if (score === 4) return { level: 3, label: 'İyi', color: '#10B981' };
  return { level: 4, label: 'Güçlü', color: '#059669' };
};

// Error code mapping for better UX
const ERROR_CODE_MAP: Record<string, string> = {
  EMAIL_IN_USE: 'Bu e-posta adresi zaten kullanılıyor',
  PHONE_IN_USE: 'Bu telefon numarası zaten kullanılıyor',
  PASSWORD_TOO_WEAK: 'Şifre en az 8 karakter, büyük/küçük harf ve rakam içermelidir',
  PASSWORD_TOO_SHORT: 'Şifre en az 8 karakter olmalıdır',
  PASSWORD_TOO_LONG: 'Şifre 128 karakterden uzun olamaz',
  INVALID_EMAIL: 'Geçersiz e-posta formatı',
  INVALID_PHONE: 'Geçersiz telefon numarası',
  EMAIL_TOO_LONG: 'E-posta 255 karakterden uzun olamaz',
  NAME_TOO_SHORT: 'İsim en az 2 karakter olmalıdır',
  NAME_TOO_LONG: 'İsim 50 karakterden uzun olamaz',
  RATE_LIMIT_EXCEEDED: 'Çok fazla deneme. Lütfen bekleyin.',
  REGISTRATION_FAILED: 'Kayıt işlemi başarısız oldu. Lütfen tekrar deneyin.',
};

const AuthBackground = React.memo(({ blob1Anim, blob2Anim }: {
  blob1Anim: Animated.Value;
  blob2Anim: Animated.Value;
}) => (
  <>
    <LinearGradient
      colors={[COLORS.slate100, COLORS.slate200]}
      style={StyleSheet.absoluteFillObject}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    />
    <Animated.View style={[styles.blob, styles.blob1, { transform: [{ translateY: blob1Anim }] }]} />
    <Animated.View style={[styles.blob, styles.blob2, { transform: [{ translateY: blob2Anim }] }]} />
  </>
));

const RegisterScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAppleSignIn, setShowAppleSignIn] = useState(false);
  const { signUp, signInWithGoogle, signInWithFacebook, signInWithApple } = useAuth();
  const { t, language } = useLanguage();
  const navigation = useNavigation();

  // Animations
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const blob1Anim = useRef(new Animated.Value(0)).current;
  const blob2Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    isAppleSignInAvailable().then(setShowAppleSignIn);
  }, []);

  const floatBlob1Ref = useRef<Animated.CompositeAnimation | null>(null);
  const floatBlob2Ref = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    const startBlobAnimations = () => {
      floatBlob1Ref.current = Animated.loop(
        Animated.sequence([
          Animated.timing(blob1Anim, {
            toValue: -20,
            duration: 5000,
            useNativeDriver: true,
          }),
          Animated.timing(blob1Anim, {
            toValue: 0,
            duration: 5000,
            useNativeDriver: true,
          }),
        ])
      );
      floatBlob2Ref.current = Animated.loop(
        Animated.sequence([
          Animated.timing(blob2Anim, {
            toValue: -15,
            duration: 4000,
            useNativeDriver: true,
          }),
          Animated.timing(blob2Anim, {
            toValue: 0,
            duration: 4000,
            useNativeDriver: true,
          }),
        ])
      );
      floatBlob1Ref.current.start();
      floatBlob2Ref.current.start();
    };

    startBlobAnimations();

    const kbShowSub = Keyboard.addListener('keyboardDidShow', () => {
      floatBlob1Ref.current?.stop();
      floatBlob2Ref.current?.stop();
    });
    const kbHideSub = Keyboard.addListener('keyboardDidHide', () => {
      startBlobAnimations();
    });

    return () => {
      floatBlob1Ref.current?.stop();
      floatBlob2Ref.current?.stop();
      kbShowSub.remove();
      kbHideSub.remove();
    };
  }, []);

  const emailRegex = useMemo(() => /\S+@\S+\.\S+/, []);
  const passwordStrength = useMemo(() => calculatePasswordStrength(password), [password]);
  const isFormValid = useMemo(() => {
    return (
      fullName.trim().length >= 2 &&
      emailRegex.test(email.trim()) &&
      isValidPhoneNumber(phoneNumber) &&
      isPasswordComplex(password) &&
      password === confirmPassword &&
      acceptTerms
    );
  }, [fullName, email, phoneNumber, password, confirmPassword, acceptTerms, emailRegex]);

  const handleGoogleSignIn = async () => {
    if (!acceptTerms) {
      Alert.alert(
        t('common.error'),
        language === 'tr'
          ? 'Devam etmek için Kullanım Koşulları ve Gizlilik Politikasını kabul etmelisiniz.'
          : 'You must accept the Terms of Use and Privacy Policy to continue.'
      );
      return;
    }
    if (!signInWithGoogle) return;
    try {
      await signInWithGoogle();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || 'Google ile kayıt başarısız');
    }
  };

  const handleAppleSignIn = async () => {
    if (!acceptTerms) {
      Alert.alert(
        t('common.error'),
        language === 'tr'
          ? 'Devam etmek için Kullanım Koşulları ve Gizlilik Politikasını kabul etmelisiniz.'
          : 'You must accept the Terms of Use and Privacy Policy to continue.'
      );
      return;
    }
    if (!signInWithApple) return;
    try {
      await signInWithApple();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || 'Apple ile kayıt başarısız');
    }
  };

  const handleRegister = async () => {
    // Check network connectivity first
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      return Alert.alert(
        t('common.error'),
        language === 'tr' ? 'İnternet bağlantınız yok. Lütfen bağlantınızı kontrol edin.' : 'No internet connection. Please check your connection.'
      );
    }

    if (!fullName.trim() || fullName.trim().length < 2) {
      return Alert.alert(t('common.error'), t('register.errors.fullNameRequired'));
    }
    if (!emailRegex.test(email.trim())) {
      return Alert.alert(t('common.error'), t('register.errors.emailInvalid'));
    }
    if (!isValidPhoneNumber(phoneNumber)) {
      return Alert.alert(t('common.error'), 'Lütfen geçerli bir telefon numarası girin');
    }
    if (!isPasswordComplex(password)) {
      return Alert.alert(
        t('common.error'),
        'Şifre en az 8 karakter, 1 büyük harf, 1 küçük harf ve 1 rakam içermelidir'
      );
    }
    if (password !== confirmPassword) {
      return Alert.alert(t('common.error'), t('register.errors.passwordMismatch'));
    }
    if (!acceptTerms) {
      return Alert.alert(t('common.error'), t('register.errors.acceptTerms'));
    }

    setIsLoading(true);
    try {
      const normalizedPhone = normalizePhoneNumber(phoneNumber);
      await signUp(email.trim().toLowerCase(), password, fullName.trim(), normalizedPhone);
      setIsLoading(false);
      const goToLogin = () => {
        try { (navigation as any)?.replace?.('Login'); } catch { }
        try { (navigation as any)?.navigate?.('Login'); } catch { }
        try { (navigation as any)?.getParent?.()?.navigate?.('Auth', { screen: 'Login' }); } catch { }
        try { (navigation as any)?.dispatch?.(CommonActions.reset({ index: 0, routes: [{ name: 'Auth' }] })); } catch { }
        try { (navigation as any)?.goBack?.(); } catch { }
      };
      goToLogin();

      Alert.alert(
        t('common.success'),
        t('register.success'),
        [
          { text: t('common.ok'), onPress: goToLogin }
        ]
      );
    } catch (error: any) {
      // Map error codes to user-friendly messages
      const errorCode = error.code || error.response?.data?.code;
      const userMessage = ERROR_CODE_MAP[errorCode] || error.message || t('register.errors.generic');
      Alert.alert(t('common.error'), userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const renderInput = (
    icon: string,
    placeholder: string,
    value: string,
    onChangeText: (text: string) => void,
    options?: {
      secureTextEntry?: boolean;
      showToggle?: boolean;
      toggleValue?: boolean;
      onToggle?: () => void;
      keyboardType?: any;
      autoCapitalize?: any;
      autoComplete?: any;
    }
  ) => (
    <View style={styles.inputContainer}>
      <Icon name={icon} size={20} color={COLORS.slate300} style={styles.inputIcon} />
      <TextInput
        style={[styles.input, options?.showToggle && { paddingRight: 50 }]}
        placeholder={placeholder}
        placeholderTextColor={COLORS.slate300}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={options?.secureTextEntry}
        keyboardType={options?.keyboardType}
        autoCapitalize={options?.autoCapitalize}
        autoComplete={options?.autoComplete}
      />
      {options?.showToggle && (
        <TouchableOpacity style={styles.eyeButton} onPress={options.onToggle}>
          <Icon
            name={options.toggleValue ? 'visibility-off' : 'visibility'}
            size={20}
            color={COLORS.slate400}
          />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <AuthBackground blob1Anim={blob1Anim} blob2Anim={blob2Anim} />

      <KeyboardAvoidingView
        behavior="padding"
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.card,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideUpAnim }]
              }
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Icon name="person-add-alt-1" size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.title}>
                {language === 'tr' ? 'LingRoot\'a Katıl' : 'Join LingRoot'}
              </Text>
              <Text style={styles.subtitle}>
                {language === 'tr' ? 'AI dil öğrenme yolculuğuna başla' : 'Start your AI language journey'}
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {renderInput('person', language === 'tr' ? 'Ad Soyad' : 'Full Name', fullName, setFullName, { autoCapitalize: 'words' })}
              {renderInput('alternate-email', language === 'tr' ? 'E-posta Adresi' : 'Email Address', email, setEmail, { keyboardType: 'email-address', autoCapitalize: 'none', autoComplete: 'email' })}
              {renderInput('phone', '+90 555 123 45 67', phoneNumber, (v) => setPhoneNumber(formatPhoneForDisplay(v)), { keyboardType: 'phone-pad', autoComplete: 'tel' })}
              {renderInput('lock', language === 'tr' ? 'Şifre Oluştur' : 'Create Password', password, setPassword, { secureTextEntry: !showPassword, showToggle: true, toggleValue: showPassword, onToggle: () => setShowPassword(v => !v) })}

              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <View style={styles.passwordStrengthContainer}>
                  <View style={styles.passwordStrengthBars}>
                    {[1, 2, 3, 4].map((level) => (
                      <View
                        key={level}
                        style={[
                          styles.passwordStrengthBar,
                          { backgroundColor: level <= passwordStrength.level ? passwordStrength.color : COLORS.slate200 }
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={[styles.passwordStrengthLabel, { color: passwordStrength.color }]}>
                    {passwordStrength.label}
                  </Text>
                </View>
              )}
              {renderInput('verified-user', language === 'tr' ? 'Şifreyi Onayla' : 'Confirm Password', confirmPassword, setConfirmPassword, { secureTextEntry: !showConfirmPassword, showToggle: true, toggleValue: showConfirmPassword, onToggle: () => setShowConfirmPassword(v => !v) })}

              {/* Terms Checkbox */}
              <TouchableOpacity style={styles.termsRow} onPress={() => setAcceptTerms(v => !v)}>
                <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
                  {acceptTerms && <Icon name="check" size={14} color="#fff" />}
                </View>
                <Text style={styles.termsText}>
                  {language === 'tr' ? (
                    <>
                      <Text
                        style={styles.termsLink}
                        onPress={(e) => {
                          e.stopPropagation();
                          Linking.openURL('https://www.lingroot.com/terms');
                        }}
                      >
                        Hizmet Şartları
                      </Text>
                      <Text> ve </Text>
                      <Text
                        style={styles.termsLink}
                        onPress={(e) => {
                          e.stopPropagation();
                          Linking.openURL('https://www.lingroot.com/privacy-policy');
                        }}
                      >
                        Gizlilik Politikası
                      </Text>
                      <Text>'nı kabul ediyorum.</Text>
                    </>
                  ) : (
                    <>
                      <Text>I accept the </Text>
                      <Text
                        style={styles.termsLink}
                        onPress={(e) => {
                          e.stopPropagation();
                          Linking.openURL('https://www.lingroot.com/terms');
                        }}
                      >
                        Terms of Service
                      </Text>
                      <Text> and </Text>
                      <Text
                        style={styles.termsLink}
                        onPress={(e) => {
                          e.stopPropagation();
                          Linking.openURL('https://www.lingroot.com/privacy-policy');
                        }}
                      >
                        Privacy Policy
                      </Text>
                      <Text>.</Text>
                    </>
                  )}
                </Text>
              </TouchableOpacity>

              {/* Register Button */}
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleRegister}
                disabled={isLoading || !isFormValid}
                style={styles.registerButtonWrapper}
              >
                <LinearGradient
                  colors={isFormValid ? [COLORS.gradientOrangeStart, COLORS.gradientOrangeEnd] : [COLORS.slate300, COLORS.slate400]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.registerButton}
                >
                  <Text style={styles.registerButtonText}>
                    {isLoading
                      ? (language === 'tr' ? 'Kayıt Yapılıyor...' : 'Creating Account...')
                      : (language === 'tr' ? 'Hesap Oluştur' : 'Create Account')}
                  </Text>
                  <Icon name="arrow-forward" size={20} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>
                {language === 'tr' ? 'VEYA' : 'OR SIGN UP WITH'}
              </Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Buttons */}
            <View style={styles.socialContainer}>
              <TouchableOpacity style={styles.socialButton} onPress={handleGoogleSignIn}>
                <Icon name="g-mobiledata" size={20} color={COLORS.slate700} />
                <Text style={styles.socialButtonText}>Google</Text>
              </TouchableOpacity>

              {showAppleSignIn && (
                <TouchableOpacity style={styles.socialButton} onPress={handleAppleSignIn}>
                  <Icon name="apple" size={20} color={COLORS.slate900} />
                  <Text style={styles.socialButtonText}>Apple</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Sign In Link */}
            <View style={styles.signInContainer}>
              <Text style={styles.signInText}>
                {language === 'tr' ? 'Zaten hesabın var mı? ' : 'Already have an account? '}
              </Text>
              <TouchableOpacity onPress={() => { try { (navigation as any)?.navigate?.('Login'); } catch { } }}>
                <Text style={styles.signInLink}>
                  {language === 'tr' ? 'Giriş Yap' : 'Sign In'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingVertical: 40,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.3,
  },
  blob1: {
    width: 256,
    height: 256,
    backgroundColor: COLORS.blobIndigo,
    top: -40,
    left: -40,
  },
  blob2: {
    width: 320,
    height: 320,
    backgroundColor: COLORS.blobTeal,
    bottom: 80,
    right: -40,
  },
  card: {
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: 40,
    padding: 32,
    shadowColor: COLORS.brandIndigo,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 32,
    elevation: 8,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: COLORS.brandTeal,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: COLORS.brandTeal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.slate900,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.slate500,
    fontWeight: '500',
    marginTop: 4,
  },
  form: {
    gap: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.slate700,
    fontWeight: '500',
  },
  eyeButton: {
    padding: 8,
  },
  passwordStrengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  passwordStrengthBars: {
    flexDirection: 'row',
    flex: 1,
    gap: 4,
  },
  passwordStrengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  passwordStrengthLabel: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '600',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    marginBottom: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.slate200,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  checkboxChecked: {
    backgroundColor: COLORS.brandTeal,
    borderColor: COLORS.brandTeal,
  },
  termsText: {
    flex: 1,
    color: COLORS.slate500,
    fontSize: 13,
    lineHeight: 20,
  },
  termsLink: {
    color: COLORS.brandTeal,
    fontWeight: '700',
  },
  registerButtonWrapper: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.brandOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  registerButton: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.slate100,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.slate300,
    letterSpacing: 1.5,
  },
  socialContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.slate700,
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  signInText: {
    fontSize: 14,
    color: COLORS.slate500,
    fontWeight: '500',
  },
  signInLink: {
    fontSize: 14,
    color: COLORS.brandTeal,
    fontWeight: '800',
  },
});

export default React.memo(RegisterScreen);