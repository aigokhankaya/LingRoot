import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { apiService } from '../services/api';
import { useRoute, useNavigation } from '@react-navigation/native';

const ResetPasswordScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState<string>(route.params?.email || '');
  const [code, setCode] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleReset = async () => {
    if (!email || !code || !newPassword) {
      return Alert.alert('Hata', 'Lütfen e-posta, kod ve yeni şifreyi girin');
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
      <TextInput
        style={styles.input}
        placeholder="Yeni şifre"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.button} onPress={handleReset} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Gönderiliyor...' : 'Şifreyi Güncelle'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 24 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 15, borderWidth: 1, borderColor: '#ddd', marginBottom: 16 },
  button: { backgroundColor: '#007AFF', borderRadius: 8, padding: 15, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});

export default ResetPasswordScreen;
