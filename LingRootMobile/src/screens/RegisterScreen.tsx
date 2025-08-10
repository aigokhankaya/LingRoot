import React, { useMemo, useState } from 'react';
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
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, CommonActions } from '@react-navigation/native';

const RegisterScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();
  const { t } = useLanguage();
  const navigation = useNavigation();

  const emailRegex = useMemo(() => /\S+@\S+\.\S+/, []);
  const isFormValid = useMemo(() => {
    return (
      fullName.trim().length >= 2 &&
      emailRegex.test(email.trim()) &&
      password.length >= 6 &&
      confirmPassword.length >= 6 &&
      password === confirmPassword &&
      acceptTerms
    );
  }, [fullName, email, password, confirmPassword, acceptTerms, emailRegex]);

  const handleRegister = async () => {
    if (!fullName.trim()) return Alert.alert(t('common.error'), t('register.errors.fullNameRequired'));
    if (!emailRegex.test(email.trim())) return Alert.alert(t('common.error'), t('register.errors.emailInvalid'));
    if (password.length < 6) return Alert.alert(t('common.error'), t('register.errors.passwordShort'));
    if (password !== confirmPassword) return Alert.alert(t('common.error'), t('register.errors.passwordMismatch'));
    if (!acceptTerms) return Alert.alert(t('common.error'), t('register.errors.acceptTerms'));

    setIsLoading(true);
    try {
      await signUp(email.trim(), password, fullName.trim());
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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('register.title')}</Text>
          <Text style={styles.subtitle}>{t('register.subtitle')}</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder={t('register.fullName')}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />

          <TextInput
            style={styles.input}
            placeholder={t('register.email')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder={t('register.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
            />
            <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(v => !v)}>
              <Icon name={showPassword ? 'visibility-off' : 'visibility'} size={22} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder={t('register.confirmPassword')}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoComplete="password"
            />
            <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirmPassword(v => !v)}>
              <Icon name={showConfirmPassword ? 'visibility-off' : 'visibility'} size={22} color="#666" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.termsRow} onPress={() => setAcceptTerms(v => !v)}>
            <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
              {acceptTerms && <Icon name="check" size={16} color="#fff" />}
            </View>
            <Text style={styles.termsText}>{t('register.termsText')}</Text>
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
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    marginRight: 8,
  },
  eyeButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
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
});

export default RegisterScreen; 