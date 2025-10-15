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
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { apiService } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [showResendUI, setShowResendUI] = useState(false);
<<<<<<< Updated upstream
  const { signIn } = useAuth();
=======
  const [showAppleSignIn, setShowAppleSignIn] = useState(false);
  const { signIn, signInWithGoogle, signInWithApple } = useAuth();
>>>>>>> Stashed changes
  const scrollRef = useRef<ScrollView | null>(null);
  const [resendBoxY, setResendBoxY] = useState<number | null>(null);
  const navigation = useNavigation();
  const route = useRoute<any>();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
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
        // Set early to ensure UI shows even if Alert causes a re-render/remount on some devices
        setShowResendUI(true);
        // Persist intent to show resend UI in route params to survive remounts
        try { (navigation as any)?.setParams?.({ emailNotVerified: true, emailPrefill: email }); } catch {}
        // Also persist via AsyncStorage as a robust fallback across remounts
        try {
          await AsyncStorage.setItem('lr_email_not_verified', JSON.stringify({ email }));
        } catch {}
        // Dismiss keyboard to ensure visibility
        try { Keyboard.dismiss(); } catch {}
        Alert.alert(
          'Aktivasyon Gerekli',
          'Hesabınızı doğrulamak için e-postanıza gönderilen aktivasyon mailine bakın. (Spam/Junk klasörünü de kontrol edin.)',
          [
            {
              text: 'Tamam',
              onPress: () => {
                try { setShowResendUI(true); } catch {}
                // Force navigation to this screen with params so state reliably restores
                try {
                  (navigation as any)?.navigate?.((route as any)?.name || 'Login', {
                    emailNotVerified: true,
                    emailPrefill: email,
                  });
                } catch {}
              }
            },
          ]
        );
      } else {
        Alert.alert('Giriş Hatası', error.message || 'Giriş başarısız');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // When resend UI becomes visible, auto-scroll to it
  useEffect(() => {
    if (showResendUI) {
      setTimeout(() => {
        try {
          if (typeof resendBoxY === 'number') {
            scrollRef.current?.scrollTo({ y: resendBoxY, animated: true });
          } else {
            // Fallback: ensure we scroll to reveal the bottom content
            scrollRef.current?.scrollToEnd({ animated: true });
          }
        } catch {}
      }, 0);
    }
  }, [showResendUI, resendBoxY]);

  // Restore resend UI when coming back to this screen if param is set
  useFocusEffect(
    React.useCallback(() => {
      const p: any = (route as any)?.params || {};
      if (p.emailNotVerified) {
        if (p.emailPrefill && !email) setEmail(p.emailPrefill);
        setErrorCode('EMAIL_NOT_VERIFIED');
        setShowResendUI(true);
        // Clear the flag so it doesn't persist forever
        try { (navigation as any)?.setParams?.({ emailNotVerified: false }); } catch {}
      }
      // Fallback: restore from AsyncStorage
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
        } catch {}
      })();
      return () => {};
    }, [route, navigation, email])
  );

  const handleResend = async () => {
    setResendMessage(null);
    setResendLoading(true);
    try {
      await apiService.resendVerificationEmail(email);
      setResendMessage('Aktivasyon e-postası gönderildi. Lütfen gelen kutunuzu kontrol edin.');
    } catch (e: any) {
      setResendMessage(e?.message || 'İşlem sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setResendLoading(false);
    }
  };

<<<<<<< Updated upstream
=======
  const handleGoogleSignIn = async () => {
    if (!signInWithGoogle) return;
    try {
      await signInWithGoogle();
    } catch (error: any) {
      // Kullanıcı sistemde yoksa register ekranına yönlendir
      if (error.code === 'USER_NOT_FOUND') {
        Alert.alert(
          language === 'tr' ? 'Kullanıcı Bulunamadı' : 'User Not Found',
          language === 'tr' 
            ? 'Bu Google hesabı ile kayıtlı bir kullanıcı bulunamadı. Kayıt ekranına yönlendiriliyorsunuz.' 
            : 'No user found with this Google account. Redirecting to registration.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Register ekranına yönlendir
                try {
                  (navigation as any)?.navigate?.('Register', { 
                    socialData: error.socialData 
                  });
                } catch (navError) {
                  console.error('Navigation error:', navError);
                }
              }
            }
          ]
        );
        return;
      }
      
      Alert.alert(
        language === 'tr' ? 'Google Giriş Hatası' : 'Google Sign-In Error',
        error.message || (language === 'tr' ? 'Google ile giriş başarısız' : 'Google sign-in failed')
      );
    }
  };

  // Facebook sign-in removed

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

>>>>>>> Stashed changes
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        bounces={false}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.centerWrap}>
          <View style={styles.header}>
          <Text style={styles.title}>LingRoot</Text>
          <Text style={styles.subtitle}>AI Destekli Dil Öğrenme</Text>
          </View>

          <View style={styles.form}>
          {errorText && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorText}</Text>
            </View>
          )}
          {(errorCode === 'EMAIL_NOT_VERIFIED' || showResendUI) && showResendUI && (
            <View style={styles.resendBox} onLayout={(e) => setResendBoxY(e.nativeEvent.layout.y)}>
              <Text style={styles.resendText}>
                E-postanız doğrulanmamış görünüyor. Aşağıdaki bağlantı ile aktivasyon e-postasını mevcut adresinize tekrar gönderebilirsiniz.
              </Text>
              <TouchableOpacity
                style={[styles.linkButton, { alignSelf: 'flex-start', marginTop: 8, opacity: resendLoading || !email ? 0.5 : 1 }]}
                onPress={handleResend}
                disabled={resendLoading || !email}
              >
                <Text style={styles.linkText}>
                  {resendLoading ? 'Gönderiliyor...' : 'Aktivasyon e-postasını yeniden gönder'}
                </Text>
              </TouchableOpacity>
              {!!resendMessage && (
                <Text style={styles.resendInfo}>{resendMessage}</Text>
              )}
            </View>
          )}
          <TextInput
            style={styles.input}
            placeholder="E-posta"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            autoCorrect={false}
          />

          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Şifre"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
            />
            <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(v => !v)}>
              <Icon name={showPassword ? 'visibility-off' : 'visibility'} size={22} color="#666" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.linkButton}
            onPress={() => {
              try { (navigation as any)?.navigate?.('ForgotPassword'); } catch {}
              try { (navigation as any)?.getParent?.()?.navigate?.('Auth', { screen: 'ForgotPassword' }); } catch {}
            }}
          >
            <Text style={styles.linkText}>Şifremi Unuttum</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkButton} onPress={() => { try { (navigation as any)?.navigate?.('Register'); } catch {} }}>
            <Text style={styles.linkText}>Hesabın yok mu? Kayıt ol</Text>
          </TouchableOpacity>
<<<<<<< Updated upstream
=======

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{language === 'tr' ? 'veya' : 'or'}</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.socialButton} onPress={handleGoogleSignIn}>
            <Icon name="google" size={20} color="#DB4437" />
            <Text style={styles.socialButtonText}>
              {language === 'tr' ? 'Google ile Giriş Yap' : 'Sign in with Google'}
            </Text>
          </TouchableOpacity>

          {showAppleSignIn && (
            <TouchableOpacity style={[styles.socialButton, styles.appleButton]} onPress={handleAppleSignIn}>
              <Icon name="apple" size={20} color="#000" />
              <Text style={[styles.socialButtonText, styles.appleButtonText]}>
                {language === 'tr' ? 'Apple ile Giriş Yap' : 'Sign in with Apple'}
              </Text>
            </TouchableOpacity>
          )}
>>>>>>> Stashed changes
          </View>
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
    padding: 20,
    paddingBottom: 24,
  },
  centerWrap: {
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: '100%',
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
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  inputWrapper: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 15,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
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
  errorBox: {
    backgroundColor: '#fde8e8',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 14,
  },
  resendBox: {
    backgroundColor: '#fffbeb',
    borderColor: '#fcd34d',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  resendText: {
    color: '#78350f',
    fontSize: 14,
  },
  resendInfo: {
    marginTop: 6,
    fontSize: 12,
    color: '#444',
  },
  smallButton: {
    marginLeft: 8,
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  smallButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default LoginScreen; 