import React, { useState, useEffect } from 'react';
import { initializeGoogleAuth, signInWithGoogle } from '../src/lib/googleAuth';

export default function TestGoogleAuth() {
  const [status, setStatus] = useState<string>('Hazır');
  const [clientId, setClientId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [credential, setCredential] = useState<string>('');

  useEffect(() => {
    // Check if environment variable is loaded
    const id = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'YOK';
    setClientId(id);
  }, []);

  const testGoogleAuth = async () => {
    setStatus('Test başlatılıyor...');
    setError('');
    setCredential('');

    try {
      // Step 1: Check Client ID
      setStatus('1/4: Client ID kontrol ediliyor...');
      const id = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!id) {
        throw new Error('NEXT_PUBLIC_GOOGLE_CLIENT_ID bulunamadı');
      }
      console.log('✅ Client ID:', id);

      // Step 2: Initialize Google Auth
      setStatus('2/4: Google Auth başlatılıyor...');
      await initializeGoogleAuth();
      console.log('✅ Google Auth başlatıldı');

      // Step 3: Check if window.google is available
      setStatus('3/4: Google Identity Services kontrol ediliyor...');
      if (!window.google) {
        throw new Error('window.google yüklenemedi');
      }
      console.log('✅ window.google mevcut');

      // Step 4: Trigger Sign-In
      setStatus('4/4: Google Sign-In tetikleniyor...');
      const result = await signInWithGoogle();
      console.log('✅ Credential alındı:', result.credential.substring(0, 50) + '...');

      setCredential(result.credential);
      setStatus('✅ TEST BAŞARILI! Credential alındı.');
    } catch (err: any) {
      console.error('❌ Test hatası:', err);
      setError(err.message || 'Bilinmeyen hata');
      setStatus('❌ TEST BAŞARISIZ');
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'monospace' }}>
      <h1>Google Auth Test Sayfası</h1>

      <div style={{ marginTop: '20px', padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h2>Ortam Değişkenleri</h2>
        <p><strong>NEXT_PUBLIC_GOOGLE_CLIENT_ID:</strong></p>
        <code style={{ display: 'block', padding: '10px', background: '#fff', marginTop: '10px' }}>
          {clientId}
        </code>
      </div>

      <div style={{ marginTop: '20px', padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h2>Test Durumu</h2>
        <p style={{ fontSize: '16px', fontWeight: 'bold' }}>{status}</p>
        {error && (
          <div style={{ marginTop: '10px', padding: '10px', background: '#ffebee', color: '#c62828', borderRadius: '4px' }}>
            <strong>Hata:</strong> {error}
          </div>
        )}
        {credential && (
          <div style={{ marginTop: '10px', padding: '10px', background: '#e8f5e9', color: '#2e7d32', borderRadius: '4px' }}>
            <strong>Credential (ilk 100 karakter):</strong>
            <br />
            <code style={{ fontSize: '12px', wordBreak: 'break-all' }}>
              {credential.substring(0, 100)}...
            </code>
          </div>
        )}
      </div>

      <button
        onClick={testGoogleAuth}
        style={{
          marginTop: '20px',
          padding: '12px 24px',
          fontSize: '16px',
          background: '#4285f4',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Google Auth Test Et
      </button>

      <div style={{ marginTop: '40px', padding: '20px', background: '#fff3cd', borderRadius: '8px' }}>
        <h2>Kontrol Listesi</h2>
        <ul style={{ lineHeight: '1.8' }}>
          <li>✅ Client ID environment variable&apos;da mı? {clientId !== 'YOK' ? 'EVET' : 'HAYIR'}</li>
          <li>✅ Client ID placeholder değil mi? {clientId.includes('308629480159') ? 'EVET' : 'HAYIR'}</li>
          <li>⚠️ Google Cloud Console&apos;da Authorized JavaScript Origins eklendi mi?</li>
          <li>⚠️ Next.js sunucusu .env.local değişikliğinden sonra yeniden başlatıldı mı?</li>
          <li>⚠️ Tarayıcı cache temizlendi mi?</li>
        </ul>
      </div>

      <div style={{ marginTop: '20px', padding: '20px', background: '#e3f2fd', borderRadius: '8px' }}>
        <h2>Beklenen Davranış</h2>
        <ol style={{ lineHeight: '1.8' }}>
          <li>Butona tıkladığınızda Google One Tap popup&apos;ı açılmalı</li>
          <li>Eğer One Tap gösterilmezse, OAuth popup penceresi açılmalı</li>
          <li>Google hesabınızı seçtikten sonra credential alınmalı</li>
          <li>Credential &quot;✅ TEST BAŞARILI&quot; mesajı ile birlikte gösterilmeli</li>
        </ol>
      </div>

      <div style={{ marginTop: '20px', padding: '20px', background: '#ffebee', borderRadius: '8px' }}>
        <h2>Yaygın Hatalar ve Çözümleri</h2>
        <dl style={{ lineHeight: '1.8' }}>
          <dt><strong>&quot;NEXT_PUBLIC_GOOGLE_CLIENT_ID bulunamadı&quot;</strong></dt>
          <dd>→ .env.local dosyasını kontrol edin ve Next.js'i yeniden başlatın</dd>

          <dt><strong>&quot;window.google yüklenemedi&quot;</strong></dt>
          <dd>→ Google Identity Services script&apos;i yüklenemedi. Ağ bağlantısını kontrol edin</dd>

          <dt><strong>&quot;Google giriş iptal edildi&quot;</strong></dt>
          <dd>→ Kullanıcı popup&apos;ı kapattı (normal)</dd>

          <dt><strong>&quot;Origin mismatch&quot;</strong></dt>
          <dd>→ Google Cloud Console&apos;da http://localhost:3000 ekleyin</dd>
        </dl>
      </div>

      <div style={{ marginTop: '20px', padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h2>Google Cloud Console Ayarları</h2>
        <p>Aşağıdaki URL&apos;leri Google Cloud Console&apos;da ekleyin:</p>
        <h3>Authorized JavaScript Origins:</h3>
        <ul>
          <li><code>http://localhost:3000</code></li>
          <li><code>http://localhost:3001</code></li>
          <li><code>https://lingroot.com</code></li>
          <li><code>https://www.lingroot.com</code></li>
        </ul>
        <p style={{ marginTop: '10px' }}>
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#1976d2', textDecoration: 'underline' }}
          >
            Google Cloud Console&apos;u Aç →
          </a>
        </p>
      </div>
    </div>
  );
}
