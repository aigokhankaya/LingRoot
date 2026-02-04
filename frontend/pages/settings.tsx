import React, { useEffect, useState } from 'react';
import { useAuth } from '../src/lib/auth';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { saveInterfaceLanguage } from '../src/lib/api';
import { useTranslation, useLanguage } from '../src/lib/i18n';
import {
  User, Lock, Bell, Globe, Volume2, Eye,
  Shield, CreditCard, Save, ArrowLeft, Settings as SettingsIcon,
  Mail, Phone, Camera, Key, Info, Languages, Headphones
} from 'lucide-react';
import AppHeader from '../src/components/AppHeader';


export default function Settings() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const { changeLanguage } = useLanguage();
  const [activeSection, setActiveSection] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // States
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [interfaceLanguage, setInterfaceLanguage] = useState<'tr' | 'en' | 'de' | 'ar'>('tr');
  const [nativeLanguage, setNativeLanguage] = useState('tr-TR');
  const [defaultLevel, setDefaultLevel] = useState<'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'>('B1');
  const [vocabularyLevel, setVocabularyLevel] = useState<'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'>('B1');
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');

  useEffect(() => {
    if (user) {
      setEmail(user.email);
      loadSettings();
    }
  }, [user]);

  // URL'deki ?section=language gibi parametrelerle doğrudan ilgili sekmeye git
  useEffect(() => {
    if (!router.isReady) return;
    const sectionFromQuery = router.query.section;
    if (typeof sectionFromQuery === 'string') {
      const allowedSections = ['profile', 'password', 'language', 'content', 'audio', 'notifications', 'appearance', 'privacy', 'subscription'];
      if (allowedSections.includes(sectionFromQuery)) {
        setActiveSection(sectionFromQuery);
      }
    }
  }, [router.isReady, router.query.section]);

  const loadSettings = () => {
    try {
      setFirstName(localStorage.getItem('lingroot_firstName') || '');
      setLastName(localStorage.getItem('lingroot_lastName') || '');
      setPhone(localStorage.getItem('lingroot_phone') || '');
      const storedInterfaceLang = localStorage.getItem('lingroot_interfaceLanguage') as string | null;
      const storedGlobalLang = localStorage.getItem('lingroot_language') as string | null;
      const rawLang = (storedInterfaceLang || storedGlobalLang || 'tr') as string;
      if (rawLang === 'tr' || rawLang === 'en' || rawLang === 'de' || rawLang === 'ar') {
        setInterfaceLanguage(rawLang);
      } else {
        setInterfaceLanguage('tr');
      }
      setNativeLanguage(localStorage.getItem('lingroot_locale') || 'tr-TR');
      setDefaultLevel((localStorage.getItem('lingroot_defaultLevel') as any) || 'B1');
      setVocabularyLevel((localStorage.getItem('lingroot_vocabularyLevel') as any) || 'B1');
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
            setMessage({ type: 'error', text: t('passwords_do_not_match') });
            setSaving(false);
            return;
          }
          break;
        case 'language':
          localStorage.setItem('lingroot_interfaceLanguage', interfaceLanguage);
          localStorage.setItem('lingroot_language', interfaceLanguage);
          localStorage.setItem('lingroot_locale', nativeLanguage);
          await saveInterfaceLanguage(interfaceLanguage);
          changeLanguage(interfaceLanguage as any);
          break;
        case 'content':
          localStorage.setItem('lingroot_defaultLevel', defaultLevel);
          localStorage.setItem('lingroot_vocabularyLevel', vocabularyLevel);
          // Also save to backend
          try {
            const token = localStorage.getItem('lingroot_token');
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/auth/update-level`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ contentLevel: defaultLevel, vocabularyLevel })
            });
          } catch (err) {
            console.error('Failed to save levels to backend:', err);
          }
          break;
        case 'audio':
          localStorage.setItem('lingroot_playbackSpeed', playbackSpeed.toString());
          localStorage.setItem('lingroot_autoPlay', autoPlay.toString());
          break;
        case 'appearance':
          localStorage.setItem('lingroot_theme', theme);
          break;
      }
      setMessage({ type: 'success', text: t('settings_saved_success') });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: t('settings_saved_error') });
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { id: 'profile', label: t('settings_section_profile'), icon: <User /> },
    { id: 'password', label: t('settings_section_password'), icon: <Lock /> },
    { id: 'language', label: t('settings_section_language'), icon: <Globe /> },
    { id: 'content', label: t('settings_section_content'), icon: <Languages /> },
    { id: 'audio', label: t('settings_section_audio'), icon: <Volume2 /> },
    { id: 'notifications', label: t('settings_section_notifications'), icon: <Bell /> },
    { id: 'appearance', label: t('settings_section_appearance'), icon: <Eye /> },
    { id: 'privacy', label: t('settings_section_privacy'), icon: <Shield /> },
    { id: 'subscription', label: t('settings_section_subscription'), icon: <CreditCard /> },
  ];

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </main>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-gray-600">{t('settings_login_required_message')}</p>
          <Link href="/login" className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary/90">{t('login')}</Link>
        </div>
      </main>
    );
  }

  const displayName = `${firstName} ${lastName}`.trim() || user.email;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <AppHeader />

      {/* Message */}
      {message && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            <Info className="inline mr-2" />
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
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left ${activeSection === section.id ? 'bg-primary/5 text-primary font-semibold' : 'text-gray-700 hover:bg-gray-50'
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
                  <h2 className="text-2xl font-bold mb-6">{t('settings_profile_title')}</h2>
                  <div className="flex items-center space-x-6 mb-8">
                    <div className="w-24 h-24 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center text-primary-foreground text-3xl font-bold">
                      {displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <button className="px-4 py-2 bg-primary/5 text-primary rounded-lg hover:bg-primary/10">
                      <Camera className="inline mr-2" />{t('settings_change_photo_button')}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('firstName')}</label>
                      <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary" placeholder={t('firstName_placeholder')} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('lastName')}</label>
                      <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary" placeholder={t('lastName_placeholder')} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2"><Mail className="inline mr-2" />{t('email')}</label>
                      <input type="email" value={email} disabled className="w-full px-4 py-2 border rounded-lg bg-gray-50" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2"><Phone className="inline mr-2" />{t('phoneNumber')}</label>
                      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary" placeholder="+90 5xx xxx xx xx" />
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <button onClick={() => saveSettings('profile')} disabled={saving}
                      className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
                      <Save className="inline mr-2" />{saving ? t('settings_saving') : t('settings_save')}
                    </button>
                  </div>
                </div>
              )}

              {activeSection === 'password' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold mb-6">{t('settings_password_title')}</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2"><Key className="inline mr-2" />{t('settings_current_password_label')}</label>
                      <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary" placeholder="••••••••" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings_new_password_label')}</label>
                      <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary" placeholder="••••••••" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings_new_password_confirm_label')}</label>
                      <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary" placeholder="••••••••" />
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <button onClick={() => saveSettings('password')} disabled={saving}
                      className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
                      <Save className="inline mr-2" />{saving ? t('settings_saving') : t('settings_update_password_button')}
                    </button>
                  </div>
                </div>
              )}

              {activeSection === 'language' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold mb-6">{t('settings_language_title')}</h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2"><Globe className="inline mr-2" />{t('settings_interface_language_label')}</label>
                      <select value={interfaceLanguage} onChange={(e) => setInterfaceLanguage(e.target.value as 'tr' | 'en' | 'de' | 'ar')}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary">
                        <option value="tr">{t('language_tr')}</option>
                        <option value="en">{t('language_en')}</option>
                        <option value="de">{t('language_de')}</option>
                        <option value="ar">{t('language_ar')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2"><Headphones className="inline mr-2" />{t('settings_native_language_label')}</label>
                      <select value={nativeLanguage} onChange={(e) => setNativeLanguage(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary">
                        <option value="tr-TR">Türkçe (TR)</option>
                        <option value="en-US">English (US)</option>
                        <option value="ar-AE">العربية (AE)</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <button onClick={() => saveSettings('language')} disabled={saving}
                      className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
                      <Save className="inline mr-2" />{saving ? t('settings_saving') : t('settings_save')}
                    </button>
                  </div>
                </div>
              )}

              {activeSection === 'content' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold mb-6">{t('settings_content_title')}</h2>

                  {/* Content Level */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Languages className="inline mr-2" />İçerik Seviyesi
                    </label>
                    <p className="text-xs text-gray-500 mb-3">Oluşturulan içeriklerin zorluk seviyesi</p>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                      {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const).map((level) => (
                        <button key={level} onClick={() => setDefaultLevel(level)}
                          className={`px-4 py-3 rounded-lg font-semibold ${defaultLevel === level ? 'bg-primary text-primary-foreground' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}>{level}</button>
                      ))}
                    </div>
                  </div>

                  {/* Vocabulary Level */}
                  <div className="pt-4 border-t">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <span className="inline-block w-5 h-5 mr-2 text-purple-600">📚</span>Kelime Seviyesi
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      Kelime kartları ve quiz'lerdeki hedef seviyeniz
                      <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                        Seviye Testi sonucu
                      </span>
                    </p>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                      {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const).map((level) => (
                        <button key={level} onClick={() => setVocabularyLevel(level)}
                          className={`px-4 py-3 rounded-lg font-semibold ${vocabularyLevel === level
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}>{level}</button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button onClick={() => saveSettings('content')} disabled={saving}
                      className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
                      <Save className="inline mr-2" />{saving ? t('settings_saving') : t('settings_save')}
                    </button>
                  </div>
                </div>
              )}

              {activeSection === 'audio' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold mb-6">{t('settings_audio_title')}</h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings_playback_speed_label')} {playbackSpeed}x</label>
                      <input type="range" min="0.5" max="2.0" step="0.1" value={playbackSpeed}
                        onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0.5x</span><span>1.0x</span><span>2.0x</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <span className="font-medium">{t('settings_auto_play_label')}</span>
                      <button onClick={() => setAutoPlay(!autoPlay)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full ${autoPlay ? 'bg-primary' : 'bg-gray-300'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${autoPlay ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <button onClick={() => saveSettings('audio')} disabled={saving}
                      className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
                      <Save className="inline mr-2" />{saving ? t('settings_saving') : t('settings_save')}
                    </button>
                  </div>
                </div>
              )}

              {activeSection === 'notifications' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold mb-6">{t('settings_notifications_title')}</h2>
                  <div className="space-y-4">
                    {[
                      { state: emailNotifications, setState: setEmailNotifications, label: t('settings_email_notifications_label') },
                      { state: pushNotifications, setState: setPushNotifications, label: t('settings_push_notifications_label') }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <span className="font-medium">{item.label}</span>
                        <button onClick={() => item.setState(!item.state)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full ${item.state ? 'bg-primary' : 'bg-gray-300'}`}>
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${item.state ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSection === 'appearance' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold mb-6">{t('settings_appearance_title')}</h2>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">{t('settings_theme_label')}</label>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { value: 'light', label: t('settings_theme_light') },
                        { value: 'dark', label: t('settings_theme_dark') },
                        { value: 'system', label: t('settings_theme_system') }
                      ].map((t) => (
                        <button key={t.value} onClick={() => setTheme(t.value as any)}
                          className={`px-6 py-4 rounded-lg font-semibold ${theme === t.value ? 'bg-primary text-primary-foreground' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}>{t.label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <button onClick={() => saveSettings('appearance')} disabled={saving}
                      className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
                      <Save className="inline mr-2" />{saving ? t('settings_saving') : t('settings_save')}
                    </button>
                  </div>
                </div>
              )}

              {activeSection === 'privacy' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold mb-6">{t('settings_privacy_title')}</h2>
                  <p className="text-gray-600">{t('settings_privacy_coming_soon')}</p>
                </div>
              )}

              {activeSection === 'subscription' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold mb-6">{t('settings_subscription_title')}</h2>
                  <div className="p-6 bg-muted rounded-lg">
                    <p className="text-gray-700">{t('settings_subscription_current_plan_prefix')} <strong className="text-primary">{t('settings_subscription_free_plan_label')}</strong></p>
                    <Link href="/fiyatlandirma" className="inline-block mt-4 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                      {t('settings_subscription_upgrade_button')}
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
