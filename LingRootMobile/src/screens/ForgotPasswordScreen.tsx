import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Animated,
  Keyboard,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { requestPasswordReset } from '../services/authService';
import { COLORS } from '../theme/colors';
import { useLanguage } from '../contexts/LanguageContext';

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

const ForgotPasswordScreen: React.FC = () => {
  const { language } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<any>();

  // Animations
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const blob1Anim = useRef(new Animated.Value(0)).current;
  const blob2Anim = useRef(new Animated.Value(0)).current;

  const floatBlob1Ref = useRef<Animated.CompositeAnimation | null>(null);
  const floatBlob2Ref = useRef<Animated.CompositeAnimation | null>(null);

  // Setup animations
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
          Animated.timing(blob1Anim, { toValue: -20, duration: 5000, useNativeDriver: true }),
          Animated.timing(blob1Anim, { toValue: 0, duration: 5000, useNativeDriver: true }),
        ])
      );
      floatBlob2Ref.current = Animated.loop(
        Animated.sequence([
          Animated.timing(blob2Anim, { toValue: -15, duration: 4000, useNativeDriver: true }),
          Animated.timing(blob2Anim, { toValue: 0, duration: 4000, useNativeDriver: true }),
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

  const handleSend = async () => {
    if (!email) {
      Alert.alert(
        language === 'tr' ? 'Hata' : 'Error',
        language === 'tr' ? 'Lütfen e-posta adresinizi girin' : 'Please enter your email address'
      );
      return;
    }

    setLoading(true);
    Keyboard.dismiss();

    try {
      await requestPasswordReset(email.trim());
      // Başarılı isteğin ardından ResetPassword ekranına git
      navigation.navigate('ResetPassword', { email: email.trim() });
    } catch (e: any) {
      Alert.alert(
        language === 'tr' ? 'Hata' : 'Error',
        e.message || (language === 'tr' ? 'İstek başarısız' : 'Request failed')
      );
    } finally {
      setLoading(false);
    }
  };

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
                <Icon name="lock-reset" size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.title}>
                {language === 'tr' ? 'Şifremi Unuttum' : 'Forgot Password?'}
              </Text>
              <Text style={styles.subtitle}>
                {language === 'tr'
                  ? 'Endişelenmeyin, hesabınızı kurtarmanıza yardımcı olacağız.'
                  : "Don't worry, we'll help you recover your account."}
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
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

              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleSend}
                disabled={loading}
                style={styles.submitButtonWrapper}
              >
                <LinearGradient
                  colors={[COLORS.gradientOrangeStart, COLORS.gradientOrangeEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.submitButton, loading && styles.buttonDisabled]}
                >
                  <Text style={styles.submitButtonText}>
                    {loading
                      ? (language === 'tr' ? 'Gönderiliyor...' : 'Sending...')
                      : (language === 'tr' ? 'Kodu Gönder' : 'Send Code')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Back to Login Link */}
            <View style={styles.footer}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Icon name="arrow-back" size={16} color={COLORS.slate400} style={{ marginRight: 4 }} />
                <Text style={styles.backLink}>
                  {language === 'tr' ? 'Giriş Ekranına Dön' : 'Back to Login'}
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
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.slate800,
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.slate400,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  form: {
    gap: 24,
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
  submitButtonWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.brandOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  backLink: {
    fontSize: 13,
    color: COLORS.slate500,
    fontWeight: '600',
  },
});

export default React.memo(ForgotPasswordScreen);
