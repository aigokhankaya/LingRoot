import React, { useEffect, useRef, useState } from 'react';
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
  Keyboard,
  Animated,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { resendVerificationEmail } from '../services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../contexts/LanguageContext';
import { isAppleSignInAvailable } from '../services/socialAuth';
import { COLORS } from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const LoginScreen: React.FC = () => {
  const { language } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [showResendUI, setShowResendUI] = useState(false);
  const [showAppleSignIn, setShowAppleSignIn] = useState(false);
  const { signIn, signInWithGoogle, signInWithFacebook, signInWithApple } = useAuth();
  const scrollRef = useRef<ScrollView | null>(null);
  const [resendBoxY, setResendBoxY] = useState<number | null>(null);
  const navigation = useNavigation();
  const route = useRoute<any>();

  // Animations
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const blob1Anim = useRef(new Animated.Value(0)).current;
  const blob2Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    isAppleSignInAvailable().then(setShowAppleSignIn);
  }, []);

  useEffect(() => {
    // Slide-up animation for the card
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

    // Float animation for blobs
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

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(
        language === 'tr' ? 'Hata' : 'Error',
        language === 'tr' ? 'Lütfen tüm alanları doldurun' : 'Please fill in all fields'
      );
      return;
    }

    setIsLoading(true);
    setErrorText(null);
    setErrorCode(null);
    try {
      await signIn(email, password);
    } catch (error: any) {
      if ((error as any)?.code === 'EMAIL_NOT_VERIFIED') {
        setErrorText(error.message || 'E-posta adresiniz doğrulanmamış görünüyor.');
        setErrorCode('EMAIL_NOT_VERIFIED');
        setResendMessage(null);
        setShowResendUI(true);
        try { (navigation as any)?.setParams?.({ emailNotVerified: true, emailPrefill: email }); } catch { }
        try {
          await AsyncStorage.setItem('lr_email_not_verified', JSON.stringify({ email }));
        } catch { }
        try { Keyboard.dismiss(); } catch { }
        Alert.alert(
          language === 'tr' ? 'Aktivasyon Gerekli' : 'Activation Required',
          language === 'tr'
            ? 'Hesabınızı doğrulamak için e-postanıza gönderilen aktivasyon mailine bakın. (Spam/Junk klasörünü de kontrol edin.)'
            : 'Please check the activation email sent to your email to verify your account. (Also check your Spam/Junk folder.)',
          [
            {
              text: language === 'tr' ? 'Tamam' : 'OK',
              onPress: () => {
                try { setShowResendUI(true); } catch { }
                try {
                  (navigation as any)?.navigate?.((route as any)?.name || 'Login', {
                    emailNotVerified: true,
                    emailPrefill: email,
                  });
                } catch { }
              }
            },
          ]
        );
      } else {
        Alert.alert(
          language === 'tr' ? 'Giriş Hatası' : 'Login Error',
          error.message || (language === 'tr' ? 'Giriş başarısız' : 'Login failed')
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (showResendUI) {
      setTimeout(() => {
        try {
          if (typeof resendBoxY === 'number') {
            scrollRef.current?.scrollTo({ y: resendBoxY, animated: true });
          } else {
            scrollRef.current?.scrollToEnd({ animated: true });
          }
        } catch { }
      }, 0);
    }
  }, [showResendUI, resendBoxY]);

  useFocusEffect(
    React.useCallback(() => {
      const p: any = (route as any)?.params || {};
      if (p.emailNotVerified) {
        if (p.emailPrefill && !email) setEmail(p.emailPrefill);
        setErrorCode('EMAIL_NOT_VERIFIED');
        setShowResendUI(true);
        try { (navigation as any)?.setParams?.({ emailNotVerified: false }); } catch { }
      }
      (async () => {
        try {
          const raw = await AsyncStorage.getItem('lr_email_not_verified');
          if (raw) {
            const data = JSON.parse(raw || '{}');
            if (data?.email) {
              if (!email) setEmail(String(data.email));
              setErrorCode('EMAIL_NOT_VERIFIED');
              setShowResendUI(true);
            }
            await AsyncStorage.removeItem('lr_email_not_verified');
          }
        } catch { }
      })();
      return () => { };
    }, [route, navigation, email])
  );

  const handleResend = async () => {
    setResendMessage(null);
    setResendLoading(true);
    try {
      await resendVerificationEmail(email);
      setResendMessage(language === 'tr'
        ? 'Aktivasyon e-postası gönderildi. Lütfen gelen kutunuzu kontrol edin.'
        : 'Activation email sent. Please check your inbox.');
    } catch (e: any) {
      setResendMessage(e?.message || (language === 'tr'
        ? 'İşlem sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.'
        : 'An error occurred. Please try again later.'));
    } finally {
      setResendLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!signInWithGoogle) return;
    try {
      await signInWithGoogle();
    } catch (error: any) {
      Alert.alert(
        language === 'tr' ? 'Google Giriş Hatası' : 'Google Sign-In Error',
        error.message || (language === 'tr' ? 'Google ile giriş başarısız' : 'Google sign-in failed')
      );
    }
  };

  const handleAppleSignIn = async () => {
    if (!signInWithApple) return;
    try {
      await signInWithApple();
    } catch (error: any) {
      Alert.alert(
        language === 'tr' ? 'Apple Giriş Hatası' : 'Apple Sign-In Error',
        error.message || (language === 'tr' ? 'Apple ile giriş başarısız' : 'Apple sign-in failed')
      );
    }
  };

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
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          bounces={false}
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
                <Icon name="school" size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.title}>LingRoot AI</Text>
              <Text style={styles.subtitle}>
                {language === 'tr' ? 'Tekrar hoş geldin!' : 'Welcome back, explorer!'}
              </Text>
            </View>

            {/* Error Box */}
            {errorText && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorText}</Text>
              </View>
            )}

            {/* Resend UI */}
            {(errorCode === 'EMAIL_NOT_VERIFIED' || showResendUI) && showResendUI && (
              <View style={styles.resendBox} onLayout={(e) => setResendBoxY(e.nativeEvent.layout.y)}>
                <Text style={styles.resendText}>
                  {language === 'tr'
                    ? 'E-postanız doğrulanmamış görünüyor. Aktivasyon e-postasını tekrar gönderebilirsiniz.'
                    : 'Your email appears unverified. You can resend the activation email.'}
                </Text>
                <TouchableOpacity
                  style={[styles.resendButton, { opacity: resendLoading || !email ? 0.5 : 1 }]}
                  onPress={handleResend}
                  disabled={resendLoading || !email}
                >
                  <Text style={styles.resendButtonText}>
                    {resendLoading
                      ? (language === 'tr' ? 'Gönderiliyor...' : 'Sending...')
                      : (language === 'tr' ? 'Tekrar Gönder' : 'Resend Email')}
                  </Text>
                </TouchableOpacity>
                {!!resendMessage && (
                  <Text style={styles.resendInfo}>{resendMessage}</Text>
                )}
              </View>
            )}

            {/* Form */}
            <View style={styles.form}>
              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {language === 'tr' ? 'E-POSTA ADRESİ' : 'EMAIL ADDRESS'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={language === 'tr' ? 'ornek@email.com' : 'hello@example.com'}
                  placeholderTextColor={COLORS.slate300}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  autoCorrect={false}
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {language === 'tr' ? 'ŞİFRE' : 'PASSWORD'}
                </Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder="••••••••"
                    placeholderTextColor={COLORS.slate300}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(v => !v)}
                  >
                    <Icon
                      name={showPassword ? 'visibility-off' : 'visibility'}
                      size={22}
                      color={COLORS.slate400}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Sign In Button */}
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleLogin}
                disabled={isLoading}
                style={styles.signInButtonWrapper}
              >
                <LinearGradient
                  colors={[COLORS.gradientOrangeStart, COLORS.gradientOrangeEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.signInButton, isLoading && styles.buttonDisabled]}
                >
                  <Text style={styles.signInButtonText}>
                    {isLoading
                      ? (language === 'tr' ? 'Giriş Yapılıyor...' : 'Signing in...')
                      : (language === 'tr' ? 'Giriş Yap' : 'Sign In')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Forgot Password */}
              <TouchableOpacity
                style={styles.forgotButton}
                onPress={() => {
                  try { (navigation as any)?.navigate?.('ForgotPassword'); } catch { }
                  try { (navigation as any)?.getParent?.()?.navigate?.('Auth', { screen: 'ForgotPassword' }); } catch { }
                }}
              >
                <Text style={styles.forgotText}>
                  {language === 'tr' ? 'Şifremi Unuttum' : 'Forgot Password?'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>
                {language === 'tr' ? 'VEYA' : 'WITH'}
              </Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Buttons */}
            <View style={styles.socialContainer}>
              <TouchableOpacity style={styles.socialButton} onPress={handleGoogleSignIn}>
                <Icon name="g-mobiledata" size={20} color={COLORS.slate600} />
                <Text style={styles.socialButtonText}>Google</Text>
              </TouchableOpacity>

              {showAppleSignIn && (
                <TouchableOpacity style={styles.socialButton} onPress={handleAppleSignIn}>
                  <Icon name="apple" size={20} color={COLORS.slate900} />
                  <Text style={styles.socialButtonText}>Apple</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Sign Up Link */}
            <View style={styles.signUpContainer}>
              <Text style={styles.signUpText}>
                {language === 'tr' ? 'Hesabın yok mu? ' : "Don't have an account? "}
              </Text>
              <TouchableOpacity onPress={() => { try { (navigation as any)?.navigate?.('Register'); } catch { } }}>
                <Text style={styles.signUpLink}>
                  {language === 'tr' ? 'Kayıt Ol' : 'Sign Up'}
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
    backgroundColor: COLORS.blobBlue,
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
    marginBottom: 32,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
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
    color: COLORS.slate800,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.slate400,
    fontWeight: '500',
  },
  errorBox: {
    backgroundColor: COLORS.dangerBackground,
    borderColor: COLORS.dangerBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 14,
  },
  resendBox: {
    backgroundColor: '#fffbeb',
    borderColor: '#fcd34d',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  resendText: {
    color: '#78350f',
    fontSize: 13,
    marginBottom: 8,
  },
  resendButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.brandTeal,
    borderRadius: 12,
  },
  resendButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  resendInfo: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.slate600,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.slate400,
    letterSpacing: 1.5,
    marginLeft: 4,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.slate700,
    borderWidth: 1,
    borderColor: COLORS.slate100,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  signInButtonWrapper: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.brandOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  signInButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  forgotButton: {
    alignItems: 'center',
    marginTop: 8,
  },
  forgotText: {
    color: COLORS.brandTeal,
    fontSize: 14,
    fontWeight: '600',
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
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.slate100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  socialButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.slate600,
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  signUpText: {
    fontSize: 13,
    color: COLORS.slate400,
    fontWeight: '500',
  },
  signUpLink: {
    fontSize: 13,
    color: COLORS.brandTeal,
    fontWeight: '700',
  },
});

export default LoginScreen;