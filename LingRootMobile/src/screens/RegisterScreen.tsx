import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Animated,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { isAppleSignInAvailable } from '../services/socialAuth';
import { COLORS } from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Error code mapping for user-friendly messages
const ERROR_CODE_MAP_TR: Record<string, string> = {
  EMAIL_IN_USE: 'Bu e-posta adresi zaten kullaniliyor',
  PHONE_IN_USE: 'Bu telefon numarasi zaten kullaniliyor',
  PASSWORD_TOO_WEAK: 'Sifre en az 8 karakter, buyuk/kucuk harf ve rakam icermelidir',
  PASSWORD_TOO_SHORT: 'Sifre en az 8 karakter, buyuk/kucuk harf ve rakam icermelidir',
  INVALID_EMAIL: 'Gecersiz e-posta formati',
  INVALID_PHONE: 'Gecersiz telefon numarasi',
  NAME_INVALID: 'Isim veya soyisim gecersiz karakterler iceriyor',
  RATE_LIMIT_EXCEEDED: 'Cok fazla deneme. 1 saat sonra tekrar deneyin',
  DUPLICATE_ENTRY: 'Bu bilgilerle kayit zaten mevcut',
  REGISTRATION_FAILED: 'Kayit islemi basarisiz oldu',
  SERVER_ERROR: 'Sunucu hatasi. Lutfen daha sonra tekrar deneyin',
  NETWORK_ERROR: 'Internet baglantiniz yok. Lutfen baglantinizi kontrol edin'
};

const ERROR_CODE_MAP_EN: Record<string, string> = {
  EMAIL_IN_USE: 'This email is already in use',
  PHONE_IN_USE: 'This phone number is already in use',
  PASSWORD_TOO_WEAK: 'Password must be at least 8 characters with uppercase, lowercase and number',
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters with uppercase, lowercase and number',
  INVALID_EMAIL: 'Invalid email format',
  INVALID_PHONE: 'Invalid phone number',
  NAME_INVALID: 'Name contains invalid characters',
  RATE_LIMIT_EXCEEDED: 'Too many attempts. Try again in 1 hour',
  DUPLICATE_ENTRY: 'Account with these details already exists',
  REGISTRATION_FAILED: 'Registration failed',
  SERVER_ERROR: 'Server error. Please try again later',
  NETWORK_ERROR: 'No internet connection. Please check your connection'
};

// Phone helpers: International E.164 format (+XX XXX XXX XXXX)
const formatPhoneNumber = (value: string): string => {
  // Keep only + at start and digits
  let cleaned = value.replace(/[^\d+]/g, '');

  // Ensure + is only at the start
  if (cleaned.includes('+')) {
    cleaned = '+' + cleaned.replace(/\+/g, '');
  }

  // If no + and starts with digits, add + prefix
  if (cleaned && !cleaned.startsWith('+')) {
    // If starts with 0, assume Turkish local number
    if (cleaned.startsWith('0')) {
      cleaned = '+90' + cleaned.slice(1);
    } else {
      cleaned = '+' + cleaned;
    }
  }

  // Limit total length (E.164 max is 15 digits + 1 for +)
  if (cleaned.length > 16) {
    cleaned = cleaned.slice(0, 16);
  }

  // Format with spaces for readability
  if (cleaned.length <= 1) return cleaned;

  const withoutPlus = cleaned.slice(1);
  let formatted = '+';
  for (let i = 0; i < withoutPlus.length; i++) {
    if (i === 2 || i === 5 || i === 8 || i === 12) {
      formatted += ' ';
    }
    formatted += withoutPlus[i];
  }

  return formatted.trim();
};

const normalizePhoneNumber = (value: string): string => {
  let cleaned = value.replace(/[^\d+]/g, '');
  if (cleaned.includes('+')) {
    cleaned = '+' + cleaned.replace(/\+/g, '');
  }
  if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('0')) {
      cleaned = '+90' + cleaned.slice(1);
    } else {
      cleaned = '+' + cleaned;
    }
  }
  return cleaned;
};

const isValidPhoneNumber = (value: string): boolean => {
  const normalized = normalizePhoneNumber(value);
  // E.164: + followed by 7-15 digits
  return /^\+[1-9]\d{6,14}$/.test(normalized);
};

// Legacy functions for backward compatibility
const extractTRLocalDigits = (value: string) => {
  const normalized = normalizePhoneNumber(value);
  return normalized.replace(/^\+\d{1,3}/, '');
};

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

    const floatBlob1 = Animated.loop(
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
    const floatBlob2 = Animated.loop(
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
    floatBlob1.start();
    floatBlob2.start();

    return () => {
      floatBlob1.stop();
      floatBlob2.stop();
    };
  }, []);

  const emailRegex = useMemo(() => /\S+@\S+\.\S+/, []);
  // Password complexity regex (min 8 chars, at least 1 uppercase, 1 lowercase, 1 digit)
  const passwordComplexityRegex = useMemo(() => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, []);

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    if (!password) return { level: 0, label: '', color: COLORS.slate300 };

    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++; // Special characters bonus

    if (score <= 2) {
      return {
        level: 1,
        label: language === 'tr' ? 'Zayif' : 'Weak',
        color: '#EF4444' // red
      };
    } else if (score <= 3) {
      return {
        level: 2,
        label: language === 'tr' ? 'Orta' : 'Medium',
        color: '#F59E0B' // yellow/amber
      };
    } else {
      return {
        level: 3,
        label: language === 'tr' ? 'Guclu' : 'Strong',
        color: '#10B981' // green
      };
    }
  }, [password, language]);

  const isFormValid = useMemo(() => {
    return (
      fullName.trim().length >= 2 &&
      emailRegex.test(email.trim()) &&
      isValidPhoneNumber(phoneNumber) &&
      passwordComplexityRegex.test(password) &&
      confirmPassword.length >= 8 &&
      password === confirmPassword &&
      acceptTerms
    );
  }, [fullName, email, phoneNumber, password, confirmPassword, acceptTerms, emailRegex, passwordComplexityRegex]);

  // Get error message from error code
  const getErrorMessage = (error: { code?: string; message?: string }, defaultMessage: string): string => {
    const errorCodeMap = language === 'tr' ? ERROR_CODE_MAP_TR : ERROR_CODE_MAP_EN;
    if (error.code && errorCodeMap[error.code]) {
      return errorCodeMap[error.code];
    }
    // Check if it's a network error
    if (error.message?.includes('network') || error.message?.includes('Network') || error.message?.includes('fetch')) {
      return errorCodeMap['NETWORK_ERROR'];
    }
    return error.message || defaultMessage;
  };

  const handleGoogleSignIn = async () => {
    if (!acceptTerms) {
      Alert.alert(
        t('common.error'),
        language === 'tr'
          ? 'Devam etmek icin Kullanim Kosullari ve Gizlilik Politikasini kabul etmelisiniz.'
          : 'You must accept the Terms of Use and Privacy Policy to continue.'
      );
      return;
    }
    if (!signInWithGoogle) return;
    try {
      await signInWithGoogle();
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      const errorMessage = getErrorMessage(err, language === 'tr' ? 'Google ile kayit basarisiz' : 'Google sign up failed');
      Alert.alert(t('common.error'), errorMessage);
    }
  };

  const handleAppleSignIn = async () => {
    if (!acceptTerms) {
      Alert.alert(
        t('common.error'),
        language === 'tr'
          ? 'Devam etmek icin Kullanim Kosullari ve Gizlilik Politikasini kabul etmelisiniz.'
          : 'You must accept the Terms of Use and Privacy Policy to continue.'
      );
      return;
    }
    if (!signInWithApple) return;
    try {
      await signInWithApple();
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      const errorMessage = getErrorMessage(err, language === 'tr' ? 'Apple ile kayit basarisiz' : 'Apple sign up failed');
      Alert.alert(t('common.error'), errorMessage);
    }
  };

  const handleRegister = async () => {
    // Prevent double submission
    if (isLoading) return;

    const errorCodeMap = language === 'tr' ? ERROR_CODE_MAP_TR : ERROR_CODE_MAP_EN;

    if (!fullName.trim()) return Alert.alert(t('common.error'), t('register.errors.fullNameRequired'));
    if (!emailRegex.test(email.trim())) return Alert.alert(t('common.error'), t('register.errors.emailInvalid'));
    // Phone validation: E.164 international format
    if (!isValidPhoneNumber(phoneNumber)) {
      return Alert.alert(
        t('common.error'),
        language === 'tr'
          ? 'Lutfen gecerli bir telefon numarasi girin (orn: +90 555 123 4567)'
          : 'Please enter a valid phone number (e.g., +90 555 123 4567)'
      );
    }
    // Password complexity validation
    if (!passwordComplexityRegex.test(password)) {
      return Alert.alert(t('common.error'), errorCodeMap['PASSWORD_TOO_WEAK']);
    }
    if (password !== confirmPassword) return Alert.alert(t('common.error'), t('register.errors.passwordMismatch'));
    if (!acceptTerms) return Alert.alert(t('common.error'), t('register.errors.acceptTerms'));

    setIsLoading(true);
    try {
      const normalizedPhone = normalizePhoneNumber(phoneNumber);
      await signUp(email.trim(), password, fullName.trim(), normalizedPhone);
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
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      const errorMessage = getErrorMessage(err, t('register.errors.generic'));
      Alert.alert(t('register.title'), errorMessage);
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
      {/* Background Gradient */}
      <LinearGradient
        colors={[COLORS.slate100, COLORS.slate200]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Floating Blobs */}
      <Animated.View
        style={[
          styles.blob,
          styles.blob1,
          { transform: [{ translateY: blob1Anim }] }
        ]}
      />
      <Animated.View
        style={[
          styles.blob,
          styles.blob2,
          { transform: [{ translateY: blob2Anim }] }
        ]}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
              {renderInput('phone', '+90 555 123 4567', phoneNumber, (v) => setPhoneNumber(formatPhoneNumber(v)), { keyboardType: 'phone-pad', autoComplete: 'tel' })}
              {renderInput('lock', language === 'tr' ? 'Sifre Olustur' : 'Create Password', password, setPassword, { secureTextEntry: !showPassword, showToggle: true, toggleValue: showPassword, onToggle: () => setShowPassword(v => !v) })}

              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <View style={styles.passwordStrengthContainer}>
                  <View style={styles.passwordStrengthBar}>
                    <View
                      style={[
                        styles.passwordStrengthFill,
                        {
                          width: `${(passwordStrength.level / 3) * 100}%`,
                          backgroundColor: passwordStrength.color
                        }
                      ]}
                    />
                  </View>
                  <Text style={[styles.passwordStrengthText, { color: passwordStrength.color }]}>
                    {passwordStrength.label}
                  </Text>
                </View>
              )}

              {renderInput('verified-user', language === 'tr' ? 'Sifreyi Onayla' : 'Confirm Password', confirmPassword, setConfirmPassword, { secureTextEntry: !showConfirmPassword, showToggle: true, toggleValue: showConfirmPassword, onToggle: () => setShowConfirmPassword(v => !v) })}

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
    marginTop: -4,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  passwordStrengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.slate200,
    borderRadius: 2,
    overflow: 'hidden',
    marginRight: 8,
  },
  passwordStrengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  passwordStrengthText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 50,
    textAlign: 'right',
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

export default RegisterScreen;