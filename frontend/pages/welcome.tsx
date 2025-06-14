'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useAuth } from '../src/lib/auth';
import { useMembership } from '../src/context/MembershipContext';
import Link from 'next/link';
import { FaUserEdit, FaVolumeUp, FaBook, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { processTts, submitContent, getContentHistory, ProcessInputData } from '../src/lib/api';
import { useTranslation } from '../src/lib/i18n';
import InputSection from '../src/components/InputSection';
import OutputSection from '../src/components/OutputSection';
import Footer from '../src/components/Footer';
import { Button } from "../src/components/ui/button";
import { Input } from "../src/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../src/components/ui/tabs";
import { Slider } from "../src/components/ui/slider";
import { Card, CardContent } from "../src/components/ui/card";
import { Badge } from "../src/components/ui/badge";

interface InputData {
  type: ProcessInputData['type'];
  text?: string;
  input?: string;
  file?: File;
  level: string;
  SesHızı?: number;
  voice?: string;
  chapter?: string;
}

interface ContentTypeOption {
  id: string;
  name: string;
  icon: string;
}

interface AudioResult {
  message: string;
  mp3_url: string;
  vtt_url: string;
  level: string;
}

interface ContentHistoryItem {
  id: string;
  input: string;
  input_type: string;
  level: string;
  mp3_url: string;
  created_at: string;
}

const Welcome: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { badge, dailyLimit, remaining } = useMembership();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [audioResult, setAudioResult] = useState<AudioResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  
  // Yeni tasarım için state'ler
  const [contentType, setContentType] = useState<string>('text');
  const [englishLevel, setEnglishLevel] = useState<string>('a1');
  const [speakingRate, setSpeakingRate] = useState<number>(0.8);
  const [voiceType, setVoiceType] = useState<string>('en-US-Wavenet-F');
  const [accentType, setAccentType] = useState<string>('american');
  const [emotionType, setEmotionType] = useState<string>('neutral');
  const [outputFormat, setOutputFormat] = useState<string>('mp3');
  const [textInput, setTextInput] = useState<string>('');
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const [contentHistory, setContentHistory] = useState<ContentHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [showAllHistory, setShowAllHistory] = useState<boolean>(false);
  
  // İçerik türü seçenekleri
  const contentTypeOptions: ContentTypeOption[] = [
    { id: 'text', name: 'Metin', icon: 'fas fa-file-alt' },
    { id: 'topic', name: 'Konu', icon: 'fas fa-lightbulb' },
    { id: 'youtube', name: 'YouTube', icon: 'fab fa-youtube' },
    { id: 'weblink', name: 'Web Bağlantısı', icon: 'fas fa-link' },
    { id: 'document', name: 'Doküman', icon: 'fas fa-file-word' },
    { id: 'spotify', name: 'Spotify', icon: 'fab fa-spotify' },
    { id: 'book', name: 'Kitap', icon: 'fas fa-book' },
    { id: 'custom', name: 'Öneriler', icon: 'fas fa-plus' },
    { id: 'hashtag', name: 'Etiket', icon: 'fas fa-hashtag' },
  ];
  
  const levelOptions = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const rateOptions = [
    { value: 0.7, label: '0.7x' },
    { value: 0.8, label: '0.8x' },
    { value: 1.0, label: '1x' },
    { value: 1.2, label: '1.2x' },
  ];
  const accentOptions = ['Amerikan', 'İngiliz', 'Avustralya', 'Kanada', 'İrlanda', 'Hindistan'];
  const emotionOptions = ['Nötr', 'Neşeli', 'Ciddi', 'Profesyonel', 'Heyecanlı', 'Sakin'];
  const formatOptions = ['MP3', 'WAV', 'AAC', 'FLAC', 'OGG'];

  // URL conversion fonksiyonu
  const convertToPlayableUrl = (url: string): string => {
    if (!url) return '';
    
    console.log("🔄 Converting URL:", url);
    
    try {
      // TTS audio URL'leri için /api prefix'i ekle
      if (url.startsWith('/tts/')) {
        url = `/api${url}`;
        console.log("✅ Added /api prefix to TTS URL:", url);
      }
      
      // API yolu kontrolü
      if (url.startsWith('/api/')) {
        // Development ortamında
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
          const finalUrl = `http://localhost:5001${url}`;
          console.log("🏠 Local development URL:", finalUrl);
          return finalUrl;
        }
        
        // Production ortamında
        if (typeof window !== 'undefined' && window.location.hostname.includes('lingroot.com')) {
          const finalUrl = `https://lingloops-backend.onrender.com${url}`;
          console.log("🌐 Production URL:", finalUrl);
          return finalUrl;
        }
        
        console.log("📍 Using relative path:", url);
        return url;
      }
      
      // Tam URL kontrolü
      if (url.startsWith('https://')) {
        console.log("🔗 Full HTTPS URL:", url);
        return url;
      }
      
      console.log("❓ Unknown URL format:", url);
      return url;
    } catch (error) {
      console.error("❌ URL dönüştürme hatası:", url, error);
      return url;
    }
  };

  // Content history'yi yüklemek için useEffect ekleyelim
  useEffect(() => {
    if (isAuthenticated) {
      fetchContentHistory();
    }
  }, [isAuthenticated]);

  // Content history'yi çeken fonksiyon
  const fetchContentHistory = async () => {
    setLoadingHistory(true);
    try {
      console.log('fetchContentHistory başlatılıyor...');
      const response = await getContentHistory();
      console.log('getContentHistory response:', response);
      
      if (response.success && response.data) {
        console.log('Content history data:', response.data);
        // Backend'den gelen data yapısını kontrol et
        if (Array.isArray(response.data)) {
          setContentHistory(response.data);
          console.log('Content history array olarak set edildi:', response.data.length, 'item');
        } else {
          console.log('Content history data array değil, boş array set ediliyor');
          setContentHistory([]);
        }
      } else {
        console.log('Response success false veya data yok');
        setContentHistory([]);
      }
    } catch (error) {
      console.error('Content history yüklenirken hata oluştu:', error);
      setContentHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async (inputData: InputData) => {
    setIsLoading(true);
    setError(null);
    try {
      const processInput: ProcessInputData = {
        type: inputData.type,
        input: inputData.text || inputData.input, // text veya input'u input olarak gönder
        file: inputData.file,
        level: inputData.level,
        SesHızı: inputData.SesHızı,
        voice: inputData.voice,
        chapter: (inputData as any).chapter,
      };
      const result = await processTts(processInput);
      if (result && result.mp3_url) {
        setAudioResult({
          message: result.message || t('audio_generated_success'),
          mp3_url: result.mp3_url,
          vtt_url: result.vtt_url,
          level: inputData.level
        });
        const input = inputData.type === 'text' ? inputData.text : inputData.input;
        try {
          await submitContent(input || '', inputData.type, inputData.level, result.mp3_url);
          console.log('İçerik başarıyla kaydedildi');
          // Content history'yi yeniden yükle
          fetchContentHistory();
        } catch (submitError: any) {
          console.error('İçerik kaydetme hatası (ses oluşturma başarılı):', submitError);
          // İçerik kaydetme hatası olsa da ses oluşturma başarılı, kullanıcıya bilgi ver
          setError(`Ses başarıyla oluşturuldu ancak kaydetme sırasında hata oluştu: ${submitError.message}`);
        }
      } else {
        setError(result.message || t('audio_generation_failed'));
      }
    } catch (error: any) {
      console.error('Error generating audio:', error);
      setError(error.message || t('unexpected_error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Doküman yükleme fonksiyonu
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Dosya boyutu kontrolü (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('Dosya boyutu 10MB\'dan büyük olamaz.');
      return;
    }
    
    // Dosya türü kontrolü
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      'application/rtf',
      'text/html',
      'application/vnd.oasis.opendocument.text',
      'application/epub+zip'
    ];
    
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|doc|docx|txt|md|rtf|html|odt|epub)$/i)) {
      alert('Desteklenmeyen dosya türü. Lütfen PDF, DOC, DOCX, TXT, MD, RTF, HTML, ODT veya EPUB dosyası seçin.');
      return;
    }
    
    console.log('Dosya yükleniyor:', file.name, 'Boyut:', file.size, 'Tür:', file.type);
    
    try {
      setUploadingFile(true);
      
      const formData = new FormData();
      formData.append('file', file);
      
      // API URL'ini oluştur - Welcome sayfası için direkt backend URL kullan
      const apiUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:5001/api/content/upload'
        : 'https://lingloops-backend.onrender.com/api/content/upload';
      
      console.log('Upload API URL:', apiUrl);
      
      const res = await fetch(apiUrl, { 
        method: 'POST', 
        body: formData,
        credentials: 'include'
      });
      
      console.log('Upload response status:', res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Upload error response:', errorText);
        
        let errorMessage = `Upload failed: ${res.status} ${res.statusText}`;
        if (res.status === 404) {
          errorMessage = 'Upload API endpoint bulunamadı. Backend çalışıyor mu?';
        } else if (res.status === 500) {
          errorMessage = 'Sunucu hatası. Backend loglarını kontrol edin.';
        } else if (res.status === 413) {
          errorMessage = 'Dosya çok büyük. Daha küçük bir dosya deneyin.';
        } else if (res.status === 415) {
          errorMessage = 'Desteklenmeyen dosya türü.';
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await res.json();
      console.log('Upload response data:', data);
      
      if (data.text) {
        setTextInput(data.text);
        setContentType('text');
        alert(`Dosya başarıyla yüklendi! ${data.text.length} karakter metin çıkarıldı.`);
      } else if (data.error) {
        throw new Error(data.error);
      } else {
        throw new Error('Dosyadan metin çıkarılamadı.');
      }
    } catch (error: any) {
      console.error('File upload error:', error);
      alert(`Dosya yükleme hatası: ${error.message || 'Bilinmeyen hata'}`);
      
      // Input'u temizle
      if (e.target) {
        e.target.value = '';
      }
    } finally {
      setUploadingFile(false);
    }
  };

  // Yeni tasarım için ses oluşturma fonksiyonu
  const handleGenerate = async () => {
    if (!textInput.trim()) {
      setError('Lütfen bir metin girin.');
      return;
    }

    const inputData: InputData = {
      type: contentType as ProcessInputData['type'],
      text: textInput,
      level: englishLevel,
      SesHızı: speakingRate,
      voice: voiceType,
    };

    await handleSubmit(inputData);
  };

  if (user === undefined) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center text-xl text-gray-500">
        Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.
      </main>
    );
  }

  const displayName = (user as any).name || user.email;
  const avatar = (user as any).avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}`;
  const role = user.role || 'user';
  const membershipStatus = user.membershipStatus || 'free';

  // Örnek istatistikler (gerçek projede API'den alınır)
  const stats = {
    contentCreated: 12,
    totalLogins: 5,
    lastLogin: '2025-05-13 10:42',
  };

  const heroImageUrl = 'https://readdy.ai/api/search-image?query=Modern%20language%20learning%20concept%20with%20digital%20technology%2C%20AI%20assistant%20helping%20with%20English%20lessons%2C%20abstract%20blue%20gradient%20background%20with%20subtle%20tech%20elements%2C%20professional%20educational%20atmosphere&width=1200&height=600&seq=hero1&orientation=landscape';

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Top Navigation */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" className="!rounded-button whitespace-nowrap cursor-pointer">
                  <i className="fas fa-home mr-2"></i>
                  Ana Sayfa
                </Button>
              </Link>
              <Button variant="ghost" className="!rounded-button whitespace-nowrap cursor-pointer">
                <i className="fas fa-user mr-2"></i>
                Kullanıcı Paneli
              </Button>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" className="!rounded-button whitespace-nowrap cursor-pointer">
                <i className="fas fa-bell"></i>
              </Button>
              {isAuthenticated && (
                <div className="relative">
                  <div
                    className="flex items-center space-x-3 cursor-pointer"
                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  >
                    <img
                      src={avatar}
                      alt={displayName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="text-sm">
                      <div className="font-medium">{displayName}</div>
                      <div className="text-gray-500 text-xs">{user?.email}</div>
                    </div>
                    <i className={`fas fa-chevron-${profileMenuOpen ? 'up' : 'down'} ml-2 text-gray-500 transition-transform duration-200`}></i>
                  </div>
                  <div
                    className={`absolute right-0 w-48 mt-2 bg-white rounded-lg shadow-lg py-2 ${profileMenuOpen ? 'block' : 'hidden'} z-10`}
                  >
                    <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                      <i className="fas fa-user-circle mr-2"></i>
                      Profil Bilgilerim
                    </Link>
                    <Link href="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                      <i className="fas fa-cog mr-2"></i>
                      Hesap Ayarları
                    </Link>
                    <Link href="/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                      <i className="fas fa-history mr-2"></i>
                      Okuma Geçmişim
                    </Link>
                    <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                      <i className="fas fa-heart mr-2"></i>
                      Favorilerim
                    </a>
                    <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                      <i className="fas fa-globe mr-2"></i>
                      Dil Ayarları
                    </a>
                    <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                      <i className="fas fa-question-circle mr-2"></i>
                      Yardım ve Destek
                    </a>
                    <div className="border-t border-gray-100 mt-2 pt-2">
                      <button
                        onClick={logout}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 cursor-pointer"
                      >
                        <i className="fas fa-sign-out-alt mr-2"></i>
                        Çıkış Yap
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative w-full h-[400px] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImageUrl})` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 to-transparent flex items-center">
          <div className="container mx-auto px-6">
            <div className="max-w-2xl">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                AI ile Güçlendirilmiş İngilizce Öğrenimi
              </h1>
              <p className="text-xl text-blue-100 mb-8">
                Her seviyeye uygun kişiselleştirilmiş İngilizce içerik oluşturun ve ses dönüşümleriyle öğrenme deneyiminizi geliştirin.
              </p>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-lg !rounded-button whitespace-nowrap cursor-pointer">
                Hemen Başlayın
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          {error && (
            <div className="mb-8">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          <Card className="mb-8 border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold mr-4">
                  1
                </div>
                <h2 className="text-2xl font-bold text-blue-600">İçerik Türü ve Giriş</h2>
              </div>
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-700 mb-3">İçerik Türü</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {contentTypeOptions.map((option) => (
                    <div
                      key={option.id}
                      onClick={() => setContentType(option.id)}
                      className={`flex flex-col items-center justify-center p-4 rounded-lg border cursor-pointer transition-all ${
                        contentType === option.id ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <i className={`${option.icon} text-xl ${contentType === option.id ? 'text-blue-600' : 'text-gray-500'}`}></i>
                      <span className={`mt-2 text-sm ${contentType === option.id ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>
                        {option.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium text-gray-700">İçerik Girişi</h3>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="!rounded-button whitespace-nowrap cursor-pointer">
                      <i className="fas fa-cog mr-2"></i> Ayarlar
                    </Button>
                    <Button className="bg-green-600 hover:bg-green-700 !rounded-button whitespace-nowrap cursor-pointer">
                      <i className="fas fa-magic mr-2"></i> Konu Öner
                    </Button>
                  </div>
                </div>
                {contentType === 'document' ? (
                  <div className="space-y-4">
                    <div className={`flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition-colors ${
                      uploadingFile 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300 hover:border-blue-500'
                    }`}>
                      <div className="space-y-1 text-center">
                        {uploadingFile ? (
                          <>
                            <svg className="mx-auto h-12 w-12 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <div className="text-sm text-blue-600 font-medium">
                              Dosya yükleniyor...
                            </div>
                            <p className="text-xs text-blue-500">Lütfen bekleyin</p>
                          </>
                        ) : (
                          <>
                            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4-4m4-4h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <div className="flex text-sm text-gray-600">
                              <label htmlFor="file-upload" className={`relative rounded-md font-medium focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 ${
                                uploadingFile 
                                  ? 'cursor-not-allowed text-gray-400' 
                                  : 'cursor-pointer bg-white text-blue-600 hover:text-blue-500'
                              }`}>
                                <span>Dosya Yükle</span>
                                <input
                                  id="file-upload"
                                  name="file-upload"
                                  type="file"
                                  className="sr-only"
                                  onChange={handleFileUpload}
                                  accept=".pdf,.doc,.docx,.txt,.md,.rtf,.html,.odt,.epub"
                                  disabled={uploadingFile}
                                />
                              </label>
                              <p className="pl-1">veya sürükleyip bırakın</p>
                            </div>
                            <p className="text-xs text-gray-500">PDF, DOC, DOCX, TXT, MD, RTF, HTML, ODT, EPUB</p>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {textInput && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Çıkarılan Metin:
                        </label>
                        <textarea
                          value={textInput}
                          onChange={(e) => setTextInput(e.target.value)}
                          className="w-full min-h-[150px] p-4 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500 resize-none"
                          placeholder="Dosyadan çıkarılan metin burada görünecek..."
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <textarea
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="İngilizce'ye çevirmek veya ses oluşturmak istediğiniz metni buraya girin..."
                      className="w-full min-h-[200px] p-4 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500 resize-none"
                    />
                    <button className="absolute bottom-3 right-3 text-gray-500 hover:text-blue-600 cursor-pointer">
                      <i className="fas fa-edit text-xl"></i>
                    </button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8 border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold mr-4">
                  2
                </div>
                <h2 className="text-2xl font-bold text-blue-600">Ses Ayarları</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-3">İngilizce Seviyesi</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
                    {levelOptions.map((level) => (
                      <Button
                        key={level}
                        onClick={() => setEnglishLevel(level.toLowerCase())}
                        variant={englishLevel === level.toLowerCase() ? "default" : "outline"}
                        className={`!rounded-button whitespace-nowrap cursor-pointer ${
                          englishLevel === level.toLowerCase() ? 'bg-blue-600' : ''
                        }`}
                      >
                        {level}
                      </Button>
                    ))}
                  </div>
                  <h3 className="text-lg font-medium text-gray-700 mb-3">Konuşma Hızı</h3>
                  <div className="grid grid-cols-4 gap-2 mb-6">
                    {rateOptions.map((rate) => (
                      <Button
                        key={rate.value}
                        onClick={() => setSpeakingRate(rate.value)}
                        variant={speakingRate === rate.value ? "default" : "outline"}
                        className={`!rounded-button whitespace-nowrap cursor-pointer ${
                          speakingRate === rate.value ? 'bg-blue-600' : ''
                        }`}
                      >
                        {rate.label}
                      </Button>
                    ))}
                  </div>
                  <h3 className="text-lg font-medium text-gray-700 mb-3">Ses Seçimi</h3>
                  <select 
                    value={voiceType} 
                    onChange={(e) => setVoiceType(e.target.value)}
                    className="w-full mb-6 p-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Ses seçin</option>
                    <option value="en-US-Neural2-D">Neural Erkek (Premium)</option>
                    <option value="en-US-Neural2-I">Neural Erkek 2 (Premium)</option>
                    <option value="en-US-Neural2-J">Neural Erkek 3 (Premium)</option>
                    <option value="en-US-Wavenet-A">Wavenet Erkek (Klasik)</option>
                    <option value="en-US-Standard-D">Standard Erkek (Temel)</option>
                    <option value="en-US-Standard-I">Standard Erkek 2 (Temel)</option>
                    <option value="en-US-Standard-J">Standard Erkek 3 (Temel)</option>
                    <option value="en-US-News-N">Haber Erkek Sesi</option>
                    <option value="en-US-Neural2-A">Neural Erkek (Alternatif)</option>
                    <option value="en-US-Neural2-C">Neural Kadın</option>
                    <option value="en-US-Neural2-E">Neural Kadın 2</option>
                    <option value="en-US-Neural2-F">Neural Kadın 3</option>
                  </select>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-3">Aksan Türü</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
                    {accentOptions.map((accent) => (
                      <Button
                        key={accent}
                        onClick={() => setAccentType(accent.toLowerCase())}
                        variant={accentType === accent.toLowerCase() ? "default" : "outline"}
                        className={`!rounded-button whitespace-nowrap cursor-pointer ${
                          accentType === accent.toLowerCase() ? 'bg-blue-600' : ''
                        }`}
                      >
                        {accent}
                      </Button>
                    ))}
                  </div>
                  <h3 className="text-lg font-medium text-gray-700 mb-3">Duygu Tonu</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
                    {emotionOptions.map((emotion) => (
                      <Button
                        key={emotion}
                        onClick={() => setEmotionType(emotion.toLowerCase())}
                        variant={emotionType === emotion.toLowerCase() ? "default" : "outline"}
                        className={`!rounded-button whitespace-nowrap cursor-pointer ${
                          emotionType === emotion.toLowerCase() ? 'bg-blue-600' : ''
                        }`}
                      >
                        {emotion}
                      </Button>
                    ))}
                  </div>
                  <h3 className="text-lg font-medium text-gray-700 mb-3">Çıktı Formatı</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
                    {formatOptions.map((format) => (
                      <Button
                        key={format}
                        onClick={() => setOutputFormat(format.toLowerCase())}
                        variant={outputFormat === format.toLowerCase() ? "default" : "outline"}
                        className={`!rounded-button whitespace-nowrap cursor-pointer ${
                          outputFormat === format.toLowerCase() ? 'bg-blue-600' : ''
                        }`}
                      >
                        {format}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="mt-4">
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-blue-800">Mevcut Üyelik Planınız</h3>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                      {badge?.label || 'Ücretsiz Plan'}
                    </Badge>
                  </div>
                  <div className="text-sm text-blue-600">
                    <p className="mb-2"><i className="fas fa-info-circle mr-2"></i>Günlük {remaining}/{dailyLimit} ses dönüşümü hakkınız kaldı.</p>
                    <div className="flex items-center mt-3">
                      <Button variant="outline" className="mr-3 !rounded-button whitespace-nowrap cursor-pointer">
                        <i className="fas fa-crown text-yellow-500 mr-2"></i>Premium'a Yükselt
                      </Button>
                      <a href="#" className="text-blue-600 hover:text-blue-700 text-sm">Tüm planları karşılaştır</a>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center mt-8">
            <Button
              onClick={handleGenerate}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg flex items-center space-x-2 !rounded-button whitespace-nowrap cursor-pointer"
            >
              {isLoading ? (
                <>
                  <i className="fas fa-circle-notch fa-spin"></i>
                  <span>Ses Oluşturuluyor...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-volume-up"></i>
                  <span>Ses Oluştur</span>
                </>
              )}
            </Button>
          </div>

          {/* Output Section */}
          {audioResult && (
            <Card className="mt-8 border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold mr-4">
                    <i className="fas fa-check"></i>
                  </div>
                  <h2 className="text-2xl font-bold text-green-600">Ses Oluşturuldu</h2>
                </div>
                <OutputSection 
                  audioResult={audioResult} 
                  isLoggedIn={isAuthenticated}
                />
              </CardContent>
            </Card>
          )}

          {/* Content History Section */}
          {isAuthenticated && (
            <Card className="mt-12 border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold mr-4">
                      <i className="fas fa-history"></i>
                    </div>
                    <h2 className="text-2xl font-bold text-purple-600">Ses Geçmişim</h2>
                  </div>
                  <Button 
                    onClick={fetchContentHistory}
                    variant="outline" 
                    className="!rounded-button whitespace-nowrap cursor-pointer"
                    disabled={loadingHistory}
                  >
                    {loadingHistory ? (
                      <>
                        <i className="fas fa-circle-notch fa-spin mr-2"></i>
                        Yükleniyor
                      </>
                    ) : (
                      <>
                        <i className="fas fa-refresh mr-2"></i>
                        Yenile
                      </>
                    )}
                  </Button>
                </div>

                {loadingHistory ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                  </div>
                ) : contentHistory.length > 0 ? (
                  <div className="space-y-4">
                    {(showAllHistory ? contentHistory : contentHistory.slice(0, 5)).map((item) => (
                      <div key={item.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                {(item.input_type || 'unknown').toUpperCase()}
                              </Badge>
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                {item.level || 'N/A'}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {new Date(item.created_at).toLocaleDateString('tr-TR', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <div className="mb-3">
                              <h4 className="font-medium text-gray-800 mb-1">Orijinal Metin:</h4>
                              <p className="text-sm text-gray-600 line-clamp-2">
                                {item.input}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <audio 
                              controls 
                              className="w-64"
                              src={convertToPlayableUrl(item.mp3_url)}
                              preload="none"
                              onError={(e) => {
                                console.error("❌ Audio yükleme hatası:", e);
                                console.error("❌ Audio src:", convertToPlayableUrl(item.mp3_url));
                                console.error("❌ Audio error details:", e.currentTarget.error);
                              }}
                              onLoadStart={() => console.log("🔄 Audio yükleniyor:", convertToPlayableUrl(item.mp3_url))}
                              onCanPlay={() => console.log("✅ Audio çalınmaya hazır:", convertToPlayableUrl(item.mp3_url))}
                              onLoadedData={() => console.log("📊 Audio data yüklendi:", convertToPlayableUrl(item.mp3_url))}
                              onPlay={() => console.log("▶️ Audio çalmaya başladı:", convertToPlayableUrl(item.mp3_url))}
                              onPause={() => console.log("⏸️ Audio duraklatıldı:", convertToPlayableUrl(item.mp3_url))}
                            >
                              Tarayıcınız ses dosyasını desteklemiyor.
                            </audio>
                            <Button
                              variant="outline"
                              size="sm"
                              className="!rounded-button whitespace-nowrap cursor-pointer"
                              onClick={() => {
                                // Ses dosyasını yeni sekmede aç
                                window.open(convertToPlayableUrl(item.mp3_url), '_blank');
                              }}
                            >
                              <i className="fas fa-external-link-alt"></i>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {contentHistory.length > 5 && (
                      <div className="text-center pt-4">
                        <Button 
                          variant="outline" 
                          className="!rounded-button whitespace-nowrap cursor-pointer"
                          onClick={() => setShowAllHistory(!showAllHistory)}
                        >
                          <i className={`fas ${showAllHistory ? 'fa-chevron-up' : 'fa-chevron-down'} mr-2`}></i>
                          {showAllHistory ? 'Daha Az Göster' : 'Daha Fazla Göster'}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-4">
                      <i className="fas fa-microphone-slash text-4xl"></i>
                    </div>
                    <h3 className="text-lg font-medium text-gray-500 mb-2">Henüz ses kaydınız yok</h3>
                    <p className="text-gray-400">İlk ses kaydınızı oluşturmak için yukarıdaki formu kullanın.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Welcome; 