'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from "@/lib/auth";
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithPhone, smsLogin, verifySmsLogin, loginWithGoogle } = useAuth();
  
  // Form states
  const [loginType, setLoginType] = useState<'email' | 'phone' | 'sms'>('email'); // email: e-posta+şifre, phone: telefon+şifre, sms: telefon numarası SMS doğrulama
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [userId, setUserId] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [smsStep, setSmsStep] = useState<'phone' | 'verify'>('phone'); // SMS doğrulama için adım

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('LoginPage handleEmailLogin - Email:', email, 'Password:', password); 
    setLoading(true);
    setError(null);

    try {
      const result = await login(email, password, rememberMe);
      if (result.success) {
        router.push('/welcome');
      } else {
        setError(result.message || 'Giriş başarısız');
      }
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('LoginPage handlePhoneLogin - Phone:', phoneNumber, 'Password:', password); 
    setLoading(true);
    setError(null);

    try {
      const result = await loginWithPhone(phoneNumber, password, rememberMe);
      if (result.success) {
        router.push('/welcome');
      } else {
        setError(result.message || 'Telefon ile giriş başarısız');
      }
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSmsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('LoginPage handleSmsLogin - Phone:', phoneNumber); 
    setLoading(true);
    setError(null);

    try {
      if (smsStep === 'phone') {
        // SMS kodu gönder
        const result = await smsLogin(phoneNumber);
        if (result.success && result.userId) {
          setUserId(result.userId);
          setSmsStep('verify');
          setError(null);
        } else {
          setError(result.message || 'SMS gönderilemedi');
        }
      } else {
        // SMS kodunu doğrula
        const result = await verifySmsLogin(userId, verificationCode, rememberMe);
        if (result.success) {
          router.push('/welcome');
        } else {
          setError(result.message || 'SMS doğrulama başarısız');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (value: string) => {
    // Türkiye telefon numarası formatı: +90 (5xx) xxx xx xx
    const cleaned = value.replace(/\D/g, '');
    
    if (cleaned.startsWith('90')) {
      const withoutCountry = cleaned.substring(2);
      if (withoutCountry.length <= 10) {
        let formatted = '+90';
        if (withoutCountry.length > 0) {
          formatted += ` (${withoutCountry.substring(0, 3)}`;
          if (withoutCountry.length > 3) {
            formatted += `) ${withoutCountry.substring(3, 6)}`;
            if (withoutCountry.length > 6) {
              formatted += ` ${withoutCountry.substring(6, 8)}`;
              if (withoutCountry.length > 8) {
                formatted += ` ${withoutCountry.substring(8, 10)}`;
              }
            }
          }
        }
        return formatted;
      }
    } else if (cleaned.startsWith('5') && cleaned.length <= 10) {
      let formatted = '+90 (';
      formatted += cleaned.substring(0, 3);
      if (cleaned.length > 3) {
        formatted += `) ${cleaned.substring(3, 6)}`;
        if (cleaned.length > 6) {
          formatted += ` ${cleaned.substring(6, 8)}`;
          if (cleaned.length > 8) {
            formatted += ` ${cleaned.substring(8, 10)}`;
          }
        }
      }
      return formatted;
    }
    
    return value;
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 Google ile giriş işlemi başlatılıyor...');
      
      // Google Auth modülünü dinamik olarak import et
      console.log('📦 Google Auth modülü yükleniyor...');
      const { initializeGoogleAuth, signInWithGoogle } = await import('../../lib/googleAuth');
      
      // Google Auth'u başlat
      console.log('🔧 Google Auth başlatılıyor...');
      await initializeGoogleAuth();
      
      // Google Sign-In'i tetikle
      console.log('🎯 Google Sign-In tetikleniyor...');
      const { credential } = await signInWithGoogle();
      
      // useAuth hook'undan loginWithGoogle fonksiyonunu kullan
      console.log('🔐 Backend ile kimlik doğrulama yapılıyor...');
      const result = await loginWithGoogle(credential, rememberMe);
      
      if (result.success) {
        // Başarılı giriş sonrası welcome sayfasına yönlendir
        console.log('✅ Google ile giriş başarılı, welcome sayfasına yönlendiriliyor...');
        router.push('/welcome');
      } else {
        console.error('❌ Backend kimlik doğrulama hatası:', result.message);
        setError(result.message || 'Google ile giriş yaparken bir hata oluştu.');
      }
    } catch (err: any) {
      console.error('❌ Google giriş hatası:', err);
      
      // Kullanıcı dostu hata mesajları
      let userErrorMessage = 'Google ile giriş yaparken bir hata oluştu.';
      
      if (err.message.includes('popup') || err.message.includes('pencere')) {
        userErrorMessage = 'Google giriş penceresi açılamadı veya kapatıldı. Lütfen popup engelleyiciyi kontrol edin ve tekrar deneyin.';
      } else if (err.message.includes('cancelled') || err.message.includes('iptal')) {
        userErrorMessage = 'Google girişi iptal edildi.';
      } else if (err.message.includes('timeout') || err.message.includes('zaman aşımı')) {
        userErrorMessage = 'Google giriş zaman aşımına uğradı. Lütfen tekrar deneyin.';
      } else if (err.message.includes('yapılandırılmamış') || err.message.includes('Client ID')) {
        userErrorMessage = 'Google giriş servisi geçici olarak kullanılamıyor. Lütfen daha sonra tekrar deneyin.';
      } else if (err.message.includes('yüklenmedi') || err.message.includes('Services')) {
        userErrorMessage = 'Google servisleri yüklenemedi. İnternet bağlantınızı kontrol edin ve sayfayı yenileyin.';
      } else if (err.message.includes('Failed to fetch') || err.message.includes('bağlanılamadı')) {
        userErrorMessage = 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin ve tekrar deneyin.';
      }
      
      setError(userErrorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Logo ve başlık */}
      <header className="w-full flex justify-center items-center py-8">
        <div className="flex items-center space-x-4">
          <img src="/logo.svg" alt="LingRoot Logo" className="w-12 h-12" />
          <span className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 bg-clip-text text-transparent tracking-tight">LingRoot</span>
        </div>
      </header>
      
      {/* Giriş formu */}
      <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 shadow-md rounded-lg">
          <div>
            <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">
              Giriş Yap
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              AI-powered English learning platform
            </p>
          </div>

          {/* Giriş Tipi Seçimi */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => {
                setLoginType('email');
                setError(null);
                setSmsStep('phone');
              }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                loginType === 'email'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              E-posta ile
            </button>
            <button
              onClick={() => {
                setLoginType('phone');
                setError(null);
                setSmsStep('phone');
              }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                loginType === 'phone'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Telefon + Şifre
            </button>
            <button
              onClick={() => {
                setLoginType('sms');
                setError(null);
                setSmsStep('phone');
              }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                loginType === 'sms'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              SMS ile
            </button>
          </div>
          
          {/* Hata mesajı */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          
          {/* E-posta ile Giriş Formu */}
          {loginType === 'email' && (
            <form className="mt-8 space-y-6" onSubmit={handleEmailLogin}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="E-posta adresinizi girin"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Şifrenizi girin"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                
                {/* Beni hatırla checkbox */}
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                    />
                    <label 
                      htmlFor="remember-me" 
                      className="ml-3 text-sm font-medium text-gray-900 cursor-pointer select-none"
                    >
                      Beni hatırla
                    </label>
                  </div>
                  <div className="text-sm text-gray-600">
                    {rememberMe ? (
                      <span className="flex items-center text-green-600">
                        <i className="fas fa-check-circle mr-1"></i>
                        30 gün aktif
                      </span>
                    ) : (
                      <span className="text-gray-500">1 saat aktif</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Şifremi unuttum linki */}
              <div className="flex justify-end">
                <div className="text-sm">
                  <Link href="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
                    Şifremi unuttum?
                  </Link>
                </div>
              </div>

              {/* Giriş butonu */}
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                </button>
              </div>
            </form>
          )}

          {/* Telefon + Şifre ile Giriş Formu */}
          {loginType === 'phone' && (
            <form className="mt-8 space-y-6" onSubmit={handlePhoneLogin}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="phone-number" className="block text-sm font-medium text-gray-700 mb-1">Telefon Numarası</label>
                  <input
                    id="phone-number"
                    name="phoneNumber"
                    type="tel"
                    autoComplete="tel"
                    required
                    className="w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="+90 (5xx) xxx xx xx"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                  />
                </div>
                <div>
                  <label htmlFor="phone-password" className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
                  <input
                    id="phone-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Şifrenizi girin"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                
                {/* Beni hatırla checkbox */}
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center">
                    <input
                      id="remember-me-phone"
                      name="remember-me"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                    />
                    <label 
                      htmlFor="remember-me-phone" 
                      className="ml-3 text-sm font-medium text-gray-900 cursor-pointer select-none"
                    >
                      Beni hatırla
                    </label>
                  </div>
                  <div className="text-sm text-gray-600">
                    {rememberMe ? (
                      <span className="flex items-center text-green-600">
                        <i className="fas fa-check-circle mr-1"></i>
                        30 gün aktif
                      </span>
                    ) : (
                      <span className="text-gray-500">1 saat aktif</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Giriş butonu */}
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Giriş yapılıyor...' : 'Telefon ile Giriş Yap'}
                </button>
              </div>
            </form>
          )}

          {/* SMS ile Giriş Formu */}
          {loginType === 'sms' && (
            <form className="mt-8 space-y-6" onSubmit={handleSmsLogin}>
              {smsStep === 'phone' ? (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="sms-phone-number" className="block text-sm font-medium text-gray-700 mb-1">Telefon Numarası</label>
                    <input
                      id="sms-phone-number"
                      name="phoneNumber"
                      type="tel"
                      autoComplete="tel"
                      required
                      className="w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="+90 (5xx) xxx xx xx"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                    />
                    <p className="mt-1 text-xs text-gray-500">Kayıtlı telefon numaranızı girin, SMS ile doğrulama kodu göndereceğiz.</p>
                  </div>
                  
                  {/* Beni hatırla checkbox */}
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center">
                      <input
                        id="remember-me-sms"
                        name="remember-me"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                      />
                      <label 
                        htmlFor="remember-me-sms" 
                        className="ml-3 text-sm font-medium text-gray-900 cursor-pointer select-none"
                      >
                        Beni hatırla
                      </label>
                    </div>
                    <div className="text-sm text-gray-600">
                      {rememberMe ? (
                        <span className="flex items-center text-green-600">
                          <i className="fas fa-check-circle mr-1"></i>
                          30 gün aktif
                        </span>
                      ) : (
                        <span className="text-gray-500">1 saat aktif</span>
                      )}
                    </div>
                  </div>

                  {/* SMS gönder butonu */}
                  <div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                    >
                      {loading ? (
                        <span className="flex items-center">
                          <i className="fas fa-spinner fa-spin mr-2"></i>
                          SMS Gönderiliyor...
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <i className="fas fa-sms mr-2"></i>
                          SMS Doğrulama Kodu Gönder
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-sms text-green-600 text-2xl"></i>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">SMS Kodu Gönderildi</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      <span className="font-medium">{phoneNumber}</span> numarasına 6 haneli doğrulama kodu gönderildi.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="verification-code" className="block text-sm font-medium text-gray-700 mb-1">Doğrulama Kodu</label>
                    <input
                      id="verification-code"
                      name="verificationCode"
                      type="text"
                      maxLength={6}
                      required
                      className="w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-center text-lg tracking-widest"
                      placeholder="● ● ● ● ● ●"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                      autoComplete="one-time-code"
                    />
                    <p className="mt-1 text-xs text-gray-500">SMS ile gelen 6 haneli kodu girin.</p>
                  </div>

                  {/* Doğrula butonu */}
                  <div>
                    <button
                      type="submit"
                      disabled={loading || verificationCode.length !== 6}
                      className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {loading ? 'Doğrulanıyor...' : 'Kodu Doğrula ve Giriş Yap'}
                    </button>
                  </div>

                  {/* Yeni kod gönder */}
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setSmsStep('phone');
                        setVerificationCode('');
                        setError(null);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-500"
                    >
                      Kod gelmediyse yeni kod gönder
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
          
          {/* Google ile giriş butonu - Tüm giriş tiplerinde göster */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">veya</span>
              </div>
            </div>
            
            <div className="mt-6">
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
                    Google ile bağlanılıyor...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <i className="fab fa-google mr-2 text-red-500"></i> 
                    Google ile Giriş Yap
                  </div>
                )}
              </button>
            </div>
          </div>
          
          {/* Kayıt ol linki */}
          <div className="text-sm text-center mt-4">
            <button onClick={() => router.push('/register')} className="font-medium text-blue-600 hover:text-blue-500">
              Hesabınız yok mu? Kayıt olun
            </button>
          </div>
        </div>
      </main>
      
      {/* Basit footer */}
      <footer className="w-full flex flex-col items-center py-4 text-xs text-gray-400">
        <div>&copy; {new Date().getFullYear()} LingRoot. All rights reserved.</div>
      </footer>
    </div>
  );
}
