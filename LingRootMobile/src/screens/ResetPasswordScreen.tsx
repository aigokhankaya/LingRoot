import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { apiService } from '../services/api';
import { useRoute, useNavigation } from '@react-navigation/native';

const ResetPasswordScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState<string>(route.params?.email || '');
  const [code, setCode] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const handleReset = async () => {
    if (!email || !code || !newPassword) {
      return Alert.alert('Hata', 'Lütfen e-posta, kod ve yeni şifreyi girin');
    }
    if (newPassword !== confirmPassword) {
      return Alert.alert('Hata', 'Yeni şifreler eşleşmiyor');
    }
    setLoading(true);
    try {
      await apiService.resetPassword(email.trim(), code.trim(), newPassword);
      Alert.alert('Başarılı', 'Şifreniz güncellendi. Giriş ekranına dönün.', [
        { text: 'Tamam', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (e: any) {
      Alert.alert('Hata', e.message || 'İşlem başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Şifreyi Sıfırla</Text>
      <TextInput
        style={styles.input}
        placeholder="E-posta"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="6 haneli kod"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
      />
      <View style={styles.inputWrapper}>
        <TextInput
          style={[styles.input, styles.passwordInput]}
          placeholder="Yeni şifre"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry={!showNewPassword}
        />
        <TouchableOpacity style={styles.eyeButton} onPress={() => setShowNewPassword(v => !v)}>
          <Icon name={showNewPassword ? 'visibility-off' : 'visibility'} size={22} color="#666" />
        </TouchableOpacity>
      </View>
      <View style={styles.inputWrapper}>
        <TextInput
          style={[styles.input, styles.passwordInput]}
          placeholder="Yeni şifre (tekrar)"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
        />
        <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirmPassword(v => !v)}>
          <Icon name={showConfirmPassword ? 'visibility-off' : 'visibility'} size={22} color="#666" />
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.button} onPress={handleReset} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Gönderiliyor...' : 'Şifreyi Güncelle'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 24, color: '#111' },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 15, borderWidth: 1, borderColor: '#ddd', marginBottom: 16, color: '#333' },
  inputWrapper: { position: 'relative' },
  passwordInput: { paddingRight: 48 },
  eyeButton: { position: 'absolute', right: 12, top: 0, bottom: 16, width: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  button: { backgroundColor: '#007AFF', borderRadius: 8, padding: 15, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});

export default ResetPasswordScreen;
