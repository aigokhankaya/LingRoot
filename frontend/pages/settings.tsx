import React, { useEffect, useState } from 'react';
import { useAuth } from '../src/lib/auth';
import Link from 'next/link';
import { 
  FaUser, FaLock, FaBell, FaGlobe, FaVolumeUp, FaEye, 
  FaShieldAlt, FaCreditCard, FaSave, FaArrowLeft, FaCog,
  FaEnvelope, FaPhone, FaCamera, FaKey, FaInfoCircle, FaLanguage, FaHeadphones
} from 'react-icons/fa';

export default function Settings() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [activeSection, setActiveSection] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string}|null>(null);

  // States
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [interfaceLanguage, setInterfaceLanguage] = useState<'tr'|'en'>('tr');
  const [nativeLanguage, setNativeLanguage] = useState('tr-TR');
  const [defaultLevel, setDefaultLevel] = useState<'A1'|'A2'|'B1'|'B2'|'C1'|'C2'>('B1');
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [theme, setTheme] = useState<'light'|'dark'|'system'>('system');

  useEffect(() => {
    if (user) {
      setEmail(user.email);
      loadSettings();
    }
  }, [user]);

  const loadSettings = () => {
    try {
      setFirstName(localStorage.getItem('lingroot_firstName') || '');
      setLastName(localStorage.getItem('lingroot_lastName') || '');
      setPhone(localStorage.getItem('lingroot_phone') || '');
      setInterfaceLanguage((localStorage.getItem('lingroot_interfaceLanguage') as any) || 'tr');
      setNativeLanguage(localStorage.getItem('lingroot_locale') || 'tr-TR');
      setDefaultLevel((localStorage.getItem('lingroot_defaultLevel') as any) || 'B1');
      setPlaybackSpeed(parseFloat(localStorage.getItem('lingroot_playbackSpeed') || '1.0'));
      setAutoPlay(localStorage.getItem('lingroot_autoPlay') === 'true');
      setTheme((localStorage.getItem('lingroot_theme') as any) || 'system');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (section: string) => {
    setSaving(true);
    setMessage(null);
    try {
      switch (section) {
        case 'profile':
          localStorage.setItem('lingroot_firstName', firstName);
          localStorage.setItem('lingroot_lastName', lastName);
          localStorage.setItem('lingroot_phone', phone);
          break;
        case 'password':
          if (newPassword !== confirmPassword) {
            setMessage({type: 'error', text: 'Şifreler eşleşmiyor!'});
            setSaving(false);
            return;
          }
          break;
        case 'language':
          localStorage.setItem('lingroot_interfaceLanguage', interfaceLanguage);
          localStorage.setItem('lingroot_locale', nativeLanguage);
          break;
        case 'content':
          localStorage.setItem('lingroot_defaultLevel', defaultLevel);
          break;
        case 'audio':
          localStorage.setItem('lingroot_playbackSpeed', playbackSpeed.toString());
          localStorage.setItem('lingroot_autoPlay', autoPlay.toString());
          break;
        case 'appearance':
          localStorage.setItem('lingroot_theme', theme);
          break;
      }
      setMessage({type: 'success', text: 'Ayarlar başarıyla kaydedildi!'});
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({type: 'error', text: 'Ayarlar kaydedilirken bir hata oluştu.'});
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { id: 'profile', label: 'Profil Bilgileri', icon: <FaUser /> },
    { id: 'password', label: 'Şifre ve Güvenlik', icon: <FaLock /> },
    { id: 'language', label: 'Dil ve Bölge', icon: <FaGlobe /> },
    { id: 'content', label: 'İçerik Tercihleri', icon: <FaLanguage /> },
    { id: 'audio', label: 'Ses ve Oynatma', icon: <FaVolumeUp /> },
    { id: 'notifications', label: 'Bildirimler', icon: <FaBell /> },
    { id: 'appearance', label: 'Görünüm', icon: <FaEye /> },
    { id: 'privacy', label: 'Gizlilik', icon: <FaShieldAlt /> },
    { id: 'subscription', label: 'Abonelik', icon: <FaCreditCard /> },
  ];

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </main>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-gray-600">Oturum açmanız gerekiyor.</p>
          <Link href="/login" className="bg-blue-600 text-white px-6 py-2 rounded-md">Giriş Yap</Link>
        </div>
      </main>
    );
  }

  const displayName = `${firstName} ${lastName}`.trim() || user.email;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/profile" className="text-gray-600 hover:text-gray-900">
                <FaArrowLeft className="text-xl" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <FaCog className="mr-3 text-blue-600" />
                Ayarlar
              </h1>
            </div>
            <button onClick={logout} className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">
              Çıkış
            </button>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            <FaInfoCircle className="inline mr-2" />
            {message.text}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <nav className="space-y-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left ${
                      activeSection === section.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {section.icon}
                    <span>{section.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm p-8">
              
              {activeSection === 'profile' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold mb-6">Profil Bilgileri</h2>
                  <div className="flex items-center space-x-6 mb-8">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                      {displayName.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                      <FaCamera className="inline mr-2" />Fotoğraf Değiştir
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Ad</label>
                      <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Adınız" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Soyad</label>
                      <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Soyadınız" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2"><FaEnvelope className="inline mr-2"/>E-posta</label>
                      <input type="email" value={email} disabled className="w-full px-4 py-2 border rounded-lg bg-gray-50" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2"><FaPhone className="inline mr-2"/>Telefon</label>
                      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="+90 5xx xxx xx xx" />
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <button onClick={() => saveSettings('profile')} disabled={saving}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                      <FaSave className="inline mr-2"/>{saving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                  </div>
                </div>
              )}

              {activeSection === 'password' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold mb-6">Şifre ve Güvenlik</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2"><FaKey className="inline mr-2"/>Mevcut Şifre</label>
                      <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="••••••••" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Yeni Şifre</label>
                      <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="••••••••" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Yeni Şifre (Tekrar)</label>
                      <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="••••••••" />
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <button onClick={() => saveSettings('password')} disabled={saving}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                      <FaSave className="inline mr-2"/>{saving ? 'Kaydediliyor...' : 'Şifreyi Güncelle'}
                    </button>
                  </div>
                </div>
              )}

              {activeSection === 'language' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold mb-6">Dil ve Bölge Ayarları</h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2"><FaGlobe className="inline mr-2"/>Arayüz Dili</label>
                      <select value={interfaceLanguage} onChange={(e) => setInterfaceLanguage(e.target.value as 'tr'|'en')}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value="tr">Türkçe</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2"><FaHeadphones className="inline mr-2"/>Ana Dil (Seslendirme)</label>
                      <select value={nativeLanguage} onChange={(e) => setNativeLanguage(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value="tr-TR">Türkçe (TR)</option>
                        <option value="en-US">English (US)</option>
                        <option value="en-GB">English (UK)</option>
                        <option value="de-DE">Deutsch</option>
                        <option value="fr-FR">Français</option>
                        <option value="es-ES">Español</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <button onClick={() => saveSettings('language')} disabled={saving}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                      <FaSave className="inline mr-2"/>{saving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                  </div>
                </div>
              )}

              {activeSection === 'content' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold mb-6">İçerik Tercihleri</h2>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2"><FaLanguage className="inline mr-2"/>Varsayılan İngilizce Seviyesi</label>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                      {(['A1','A2','B1','B2','C1','C2'] as const).map((level) => (
                        <button key={level} onClick={() => setDefaultLevel(level)}
                          className={`px-4 py-3 rounded-lg font-semibold ${
                            defaultLevel === level ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}>{level}</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <button onClick={() => saveSettings('content')} disabled={saving}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                      <FaSave className="inline mr-2"/>{saving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                  </div>
                </div>
              )}

              {activeSection === 'audio' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold mb-6">Ses ve Oynatma</h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Oynatma Hızı: {playbackSpeed}x</label>
                      <input type="range" min="0.5" max="2.0" step="0.1" value={playbackSpeed} 
                        onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0.5x</span><span>1.0x</span><span>2.0x</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <span className="font-medium">Otomatik Oynat</span>
                      <button onClick={() => setAutoPlay(!autoPlay)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full ${autoPlay ? 'bg-blue-600' : 'bg-gray-300'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${autoPlay ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <button onClick={() => saveSettings('audio')} disabled={saving}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                      <FaSave className="inline mr-2"/>{saving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                  </div>
                </div>
              )}

              {activeSection === 'notifications' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold mb-6">Bildirim Ayarları</h2>
                  <div className="space-y-4">
                    {[
                      {state: emailNotifications, setState: setEmailNotifications, label: 'E-posta Bildirimleri'},
                      {state: pushNotifications, setState: setPushNotifications, label: 'Push Bildirimleri'}
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <span className="font-medium">{item.label}</span>
                        <button onClick={() => item.setState(!item.state)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full ${item.state ? 'bg-blue-600' : 'bg-gray-300'}`}>
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${item.state ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSection === 'appearance' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold mb-6">Görünüm Ayarları</h2>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Tema</label>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        {value: 'light', label: 'Açık'},
                        {value: 'dark', label: 'Koyu'},
                        {value: 'system', label: 'Sistem'}
                      ].map((t) => (
                        <button key={t.value} onClick={() => setTheme(t.value as any)}
                          className={`px-6 py-4 rounded-lg font-semibold ${
                            theme === t.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}>{t.label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <button onClick={() => saveSettings('appearance')} disabled={saving}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                      <FaSave className="inline mr-2"/>{saving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                  </div>
                </div>
              )}

              {activeSection === 'privacy' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold mb-6">Gizlilik ve Güvenlik</h2>
                  <p className="text-gray-600">Gizlilik ayarları yakında eklenecek.</p>
                </div>
              )}

              {activeSection === 'subscription' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold mb-6">Abonelik Bilgileri</h2>
                  <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
                    <p className="text-gray-700">Mevcut paketiniz: <strong className="text-blue-600">Ücretsiz</strong></p>
                    <Link href="/fiyatlandirma" className="inline-block mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      Premium'a Yükselt
                    </Link>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
