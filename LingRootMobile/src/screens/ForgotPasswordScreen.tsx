import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { apiService } from '../services/api';

const ForgotPasswordScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!email) return Alert.alert('Hata', 'Lütfen e-posta girin');
    setLoading(true);
    try {
      await apiService.forgotPassword(email.trim());
      Alert.alert('Bilgi', 'Eğer e-posta kayıtlıysa bir kod gönderdik. Lütfen posta kutunuzu kontrol edin.');
    } catch (e: any) {
      Alert.alert('Hata', e.message || 'İstek başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Şifremi Unuttum</Text>
      <TextInput
        style={styles.input}
        placeholder="E-posta"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TouchableOpacity style={styles.button} onPress={handleSend} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Gönderiliyor...' : 'Kodu Gönder'}</Text>
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

export default ForgotPasswordScreen;


