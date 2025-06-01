// The exported code uses Tailwind CSS. Install Tailwind CSS in your dev environment to ensure all styles work.
'use client';

import React, { useState } from "react";
import { useRouter } from 'next/router';
import { useAuth } from '../src/lib/auth';
import { getApiUrl } from "../src/lib/api";
import dynamic from 'next/dynamic';
// import Lottie from "lottie-react"; // Kaldırılacak
import learnAnimation from "../public/animations/language-learn.json";

// Lottie bileşenini sadece client tarafında yüklenecek şekilde dinamik olarak import et
const Lottie = dynamic(() => import('lottie-react'), { 
  ssr: false,
  loading: () => <div className="w-full max-w-3xl mx-auto h-[300px] bg-gray-100 animate-pulse rounded-lg"></div>
});

const App: React.FC = () => {
  const router = useRouter();
  const { login, isAuthenticated, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Client-side rendering için useEffect
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // Kullanıcı zaten giriş yapmışsa welcome sayfasına yönlendir
  React.useEffect(() => {
    if (isAuthenticated) {
      router.push('/welcome');
    }
  }, [isAuthenticated, router]);

  // Debug için state değişikliklerini izleyelim
  React.useEffect(() => {
    console.log('Form state changed:', { email, password });
  }, [email, password]);

  const handleStartButton = () => {
    // Check if user is logged in
    const token = localStorage.getItem('lingroot_token');
    
    if (token) {
      // If logged in, redirect to content selection page
      router.push('/welcome');
    } else {
      // If not logged in, open register modal
      const registerModal = document.getElementById('registerModal');
      if (registerModal) {
        registerModal.classList.remove('hidden');
      }
    }
  };

  const openModal = () => {
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
      loginModal.classList.remove('hidden');
    }
  };

  const closeModalHandler = () => {
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    loginModal?.classList.add('hidden');
    registerModal?.classList.add('hidden');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Anasayfa Modal handleSubmit - Email:', email, 'Password:', password);
    console.log('Form submitted with:', { email, password }); // Bu log zaten vardı, bunu da kontrol edin.
    setLoading(true);
    setError(null);

    try {
      const result = await login(email, password);
      console.log('Login result:', result);
      
      if (result.success) {
        console.log('Login successful, redirecting to /welcome');
        router.push('/welcome');
      } else {
        console.warn('Login failed:', result.message);
        setError(result.message || 'Giriş başarısız');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'Giriş işlemi sırasında bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: Event) => {
    e.preventDefault();
    const nameInput = document.getElementById('register-name') as HTMLInputElement;
    const emailInput = document.getElementById('register-email') as HTMLInputElement;
    const passwordInput = document.getElementById('register-password') as HTMLInputElement;
    
    if (!nameInput || !emailInput || !passwordInput) return;

    const name = nameInput.value;
    const email = emailInput.value;
    const password = passwordInput.value;

    // Split the name into firstName and lastName for the backend
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    try {
      // Show a loading indicator or disable the button here
      const submitButton = document.getElementById('register-submit') as HTMLButtonElement;
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerText = 'Kaydediliyor...';
      }

      console.log('Registering user with:', { firstName, lastName, email, password: '***' });

      // Use the auth context's register function
      const result = await register(firstName, lastName, email, '', password);

      if (result.success) {
        console.log('Registration successful, redirecting to /welcome');
        router.push('/welcome');
      } else {
        alert(result.message || 'Kayıt başarısız');
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Kayıt işlemi sırasında bir hata oluştu');
    } finally {
      // Reset the button state
      const submitButton = document.getElementById('register-submit') as HTMLButtonElement;
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerText = 'Ücretsiz Hesap Oluştur';
      }
    }
  };

  React.useEffect(() => {
    const loginButton = document.getElementById('loginButton');
    const registerButton = document.getElementById('registerButton');
    const startButton = document.getElementById('startButton');
    const closeModal = document.getElementById('closeModal');
    const closeRegisterModal = document.getElementById('closeRegisterModal');
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    // Debug için - elemanlara erişebildiğimizden emin olalım
    console.log('Elements found:', {
      loginButton: !!loginButton,
      registerButton: !!registerButton,
      startButton: !!startButton,
      closeModal: !!closeModal,
      closeRegisterModal: !!closeRegisterModal,
      loginForm: !!loginForm,
      registerForm: !!registerForm,
      loginModal: !!loginModal,
      registerModal: !!registerModal
    });

    // Login buton işlemleri
    loginButton?.addEventListener('click', openModal);
    closeModal?.addEventListener('click', closeModalHandler);
    
    // Register buton ve form işlemleri
    registerButton?.addEventListener('click', () => {
      registerModal?.classList.remove('hidden');
    });
    closeRegisterModal?.addEventListener('click', closeModalHandler);
    
    const registerFormHandler = (e: Event) => handleRegister(e);
    registerForm?.addEventListener('submit', registerFormHandler);

    // Hemen başla butonu
    startButton?.addEventListener('click', handleStartButton);

    // Click outside to close modals
    loginModal?.addEventListener('click', (e) => {
      if (e.target === loginModal) {
        closeModalHandler();
      }
    });
    
    registerModal?.addEventListener('click', (e) => {
      if (e.target === registerModal) {
        closeModalHandler();
      }
    });

    return () => {
      loginButton?.removeEventListener('click', openModal);
      closeModal?.removeEventListener('click', closeModalHandler);
      closeRegisterModal?.removeEventListener('click', closeModalHandler);
      registerForm?.removeEventListener('submit', registerFormHandler);
      startButton?.removeEventListener('click', handleStartButton);
      loginModal?.removeEventListener('click', (e) => {
        if (e.target === loginModal) {
          closeModalHandler();
        }
      });
      registerModal?.removeEventListener('click', (e) => {
        if (e.target === registerModal) {
          closeModalHandler();
        }
      });
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-blue-600">LingRoot</h1>
          </div>
          <nav className="hidden md:flex space-x-8">
            <a
              href="#nasil-calisir"
              className="text-gray-700 hover:text-blue-600 cursor-pointer"
            >
              Nasıl Çalışır
            </a>
            <a
              href="#avantajlar"
              className="text-gray-700 hover:text-blue-600 cursor-pointer"
            >
              Avantajlar
            </a>
            <a
              href="#kimin-icin"
              className="text-gray-700 hover:text-blue-600 cursor-pointer"
            >
              Kimin İçin
            </a>
          </nav>
          <div className="flex items-center space-x-4">
            <button
              id="loginButton"
              className="px-4 py-2 text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 cursor-pointer whitespace-nowrap"
            >
              Giriş Yap
            </button>
            <button
              id="registerButton"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer whitespace-nowrap"
            >
              Kayıt Ol
            </button>

            {/* Login Modal */}
            <div
              id="loginModal"
              className="fixed inset-0 bg-black bg-opacity-50 z-50 hidden flex items-center justify-center"
            >
              <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-800">
                    Giriş Yap
                  </h3>
                  <button
                    id="closeModal"
                    className="text-gray-600 hover:text-gray-800"
                  >
                    <i className="fas fa-times text-xl"></i>
                  </button>
                </div>

                <form id="loginForm" className="space-y-4" onSubmit={handleSubmit}>
                  {/* Hata mesajı */}
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}
                  
                  <div>
                    <label htmlFor="email" className="block text-gray-700 mb-2">
                      E-posta
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                      placeholder="E-posta"
                      required
                      value={email}
                      onChange={(e) => {
                        console.log('Email input changed:', e.target.value);
                        setEmail(e.target.value);
                      }}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="block text-gray-700 mb-2"
                    >
                      Şifre
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                      placeholder="Şifre"
                      required
                      value={password}
                      onChange={(e) => {
                        console.log('Password input changed:', e.target.value);
                        setPassword(e.target.value);
                      }}
                    />
                  </div>

                  <div className="flex justify-end">
                    <a
                      href="/forgot-password"
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Şifremi Unuttum
                    </a>
                  </div>

                  <button
                    type="submit"
                    id="login-submit"
                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    disabled={loading}
                  >
                    {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                  </button>
                </form>

                <div className="mt-4 text-sm text-center">
                  <a href="/register" className="font-medium text-blue-600 hover:text-blue-500">
                    Hesabınız yok mu? Kayıt olun
                  </a>
                </div>
              </div>
            </div>

            {/* Register Modal */}
            <div
              id="registerModal"
              className="fixed inset-0 bg-black bg-opacity-50 z-50 hidden flex items-center justify-center"
            >
              <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-800">
                    Hesap Oluştur
                  </h3>
                  <button
                    id="closeRegisterModal"
                    className="text-gray-600 hover:text-gray-800"
                  >
                    <i className="fas fa-times text-xl"></i>
                  </button>
                </div>

                <form id="registerForm" className="space-y-4">
                  <div>
                    <label htmlFor="register-name" className="block text-gray-700 mb-2">
                      Ad Soyad
                    </label>
                    <input
                      type="text"
                      id="register-name"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="register-email" className="block text-gray-700 mb-2">
                      E-posta
                    </label>
                    <input
                      type="email"
                      id="register-email"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="register-password" className="block text-gray-700 mb-2">
                      Şifre
                    </label>
                    <input
                      type="password"
                      id="register-password"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                      minLength={6}
                      required
                    />
                  </div>

                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      id="accept-terms"
                      className="mt-1"
                      required
                    />
                    <label htmlFor="accept-terms" className="ml-2 text-gray-700 text-sm">
                      Kullanım şartlarını ve gizlilik politikasını kabul ediyorum
                    </label>
                  </div>

                  <button
                    type="submit"
                    id="register-submit"
                    className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition duration-300"
                  >
                    Ücretsiz Hesap Oluştur
                  </button>
                </form>

                <div className="mt-4 text-center text-gray-600 text-sm">
                  Zaten bir hesabınız var mı? <button onClick={openModal} className="text-blue-600 hover:underline">Giriş yapın</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        
        
        <div className="container mx-auto px-6 py-20 md:py-32 relative z-20">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-800 leading-tight mb-6">
              Zaten takip ettiğin içerikleri seviyene göre dönüştürüyoruz. Sen
              sadece dinlemeye devam et.
            </h2>
            <p className="text-xl md:text-2xl text-gray-600 mb-8">
              Günlük içeriklerini İngilizce öğrenme deneyimine dönüştür. Senin
              seviyene, senin içeriğin, senin hızında.
            </p>
            <button
              id="startButton"
              className="px-8 py-4 bg-blue-600 text-white text-lg rounded-lg shadow-lg hover:bg-blue-700 transition duration-300 cursor-pointer whitespace-nowrap"
            >
              Hemen Başla
            </button>
          </div>
          <div className="mt-10">
            {isClient && (
              <Lottie
                animationData={learnAnimation}
                loop
                autoplay
                className="w-full max-w-3xl mx-auto"
              />
            )}
          </div>
    {/*
    <div className="relative w-full h-[500px] overflow-hidden rounded-lg shadow-lg">
  <video
    src="/videos/lingroot-promo.mp4"
    autoPlay
    muted
    loop
    playsInline
    className="w-full h-full object-cover"
  ></video>

  <div className="absolute top-8 left-8 md:top-16 md:left-16 text-white text-xl md:text-3xl font-bold bg-black/50 p-4 rounded-lg shadow-md max-w-[80%]">
    Sevdiğin içeriklerle İngilizce öğren.
  </div>
</div>
*/}


        </div>
      </section>
      {/* LingRoot Nedir */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              LingRoot Nedir?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              LingRoot, günlük yaşamında tükettiğin içerikleri (YouTube
              videoları, Spotify podcast'leri, haberler, bloglar) seçtiğin
              İngilizce seviyesine dönüştürerek sana özel bir dil öğrenme
              deneyimi sunar.
            </p>
          </div>
          {/*<div className="flex justify-center">
            <img
              src="https://readdy.ai/api/search-image?query=A%20visual%20representation%20of%20content%20transformation%20process%20showing%20original%20media%20like%20YouTube%20videos%2C%20Spotify%20podcasts%2C%20and%20news%20articles%20being%20converted%20into%20personalized%20language%20learning%20materials%20with%20level%20indicators%20from%20A1%20to%20C2.%20The%20image%20has%20a%20clean%2C%20professional%20design%20with%20blue%20accent%20colors%20on%20white%20background&width=800&height=500&seq=concept1&orientation=landscape"
              alt="LingRoot konsept görseli"
              className="rounded-lg shadow-xl max-w-full h-auto mb-32"
            />
          </div>*/}

        </div>
      </section>
      {/* Sorun ve Çözüm */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-16">
            Sorun ve Çözüm
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg shadow-lg p-8 transition-transform duration-300 hover:transform hover:scale-105">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                <i className="fas fa-search text-blue-600 text-2xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 text-center mb-4">
                Seviyene uygun içerik bulamıyor musun?
              </h3>
              <p className="text-gray-600 text-center">
                İçerikleri senin seviyene tam olarak uyarlarız.
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-8 transition-transform duration-300 hover:transform hover:scale-105">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                <i className="fas fa-puzzle-piece text-blue-600 text-2xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 text-center mb-4">
                Gerçek hayattan içerikler karmaşık mı geliyor?
              </h3>
              <p className="text-gray-600 text-center">
                İçerikleri basitleştirip anlaşılır hale getiriyoruz.
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-8 transition-transform duration-300 hover:transform hover:scale-105">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                <i className="fas fa-clock text-blue-600 text-2xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 text-center mb-4">
                Dinleme alışkanlığı oluşturmakta zorlanıyor musun?
              </h3>
              <p className="text-gray-600 text-center">
                Günlük rutinlerine kolayca entegre edilebilen kişisel dinleme
                modelleri sunuyoruz.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Nasıl Çalışır */}
      <section id="nasil-calisir" className="py-16 bg-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">LingRoot Nasıl Çalışır</h2>
          <p className="text-gray-600 text-lg mb-12">
            Dil öğrenme deneyiminizi dönüştürecek üç basit adım
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
            <div className="bg-white p-6 rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300">{/* Hover efekti denemesi */}
              <div className="flex items-center justify-center w-12 h-12 bg-blue-600 text-white font-bold text-lg rounded-full mx-auto mb-4">1</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">İçerik bağlantınızı paylaşın</h3>
              <p className="text-gray-700 mb-4">Başlamak için YouTube, Spotify veya desteklenen diğer platformlardan bir URL yapıştırmanız yeterli.</p>
              <img src="https://readdy.ai/api/search-image?query=minimalist%20illustration%20of%20a%20smartphone%20or%20computer%20screen%20showing%20a%20video%20link%20being%20shared%2C%20clean%20design%20with%20blue%20accent%20colors%2C%20professional%20digital%20illustration%20on%20white%20background%2C%20simple%20and%20modern&width=250&height=200&seq=5&orientation=landscape" alt="Adım 1" className="mx-auto max-h-28" />
            </div>
            <div className="bg-blue-50 p-8 rounded-lg shadow hover:shadow-md transition">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-600 text-white font-bold text-lg rounded-full mx-auto mb-4">2</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Yeterlilik seviyenizi seçin</h3>
              <p className="text-gray-700 mb-4">Tam size uygun içerik için İngilizce seviyenizi (A1–C2) seçin.</p>
              <img src="https://readdy.ai/api/search-image?query=minimalist%20illustration%20of%20language%20proficiency%20levels%20from%20A1%20to%20C2%20shown%20as%20a%20slider%20or%20selection%20interface%2C%20clean%20design%20with%20blue%20accent%20colors%2C%20professional%20digital%20illustration%20on%20white%20background%2C%20simple%20and%20modern&width=250&height=200&seq=6&orientation=landscape" alt="Adım 2" className="mx-auto max-h-28" />
            </div>
            <div className="bg-blue-50 p-8 rounded-lg shadow hover:shadow-md transition">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-600 text-white font-bold text-lg rounded-full mx-auto mb-4">3</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Kişiselleştirilmiş öğrenmenin keyfini çıkarın</h3>
              <p className="text-gray-700 mb-4">Öğrenme seviyenize göre optimize edilmiş özel ses ve altyazılara anında erişin.</p>
              <img src="https://readdy.ai/api/search-image?query=minimalist%20illustration%20of%20a%20person%20enjoying%20learning%20with%20headphones%20and%20a%20device%20showing%20subtitles%2C%20clean%20design%20with%20blue%20accent%20colors%2C%20professional%20digital%20illustration%20on%20white%20background%2C%20simple%20and%20modern&width=250&height=200&seq=7&orientation=landscape" alt="Adım 3" className="mx-auto max-h-28" />
            </div>
          </div>
        </div>
      </section>
      {/* Avantajlar */}
      <section id="avantajlar" className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
            LingRoot Avantajları
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white rounded-lg shadow-lg p-8 h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-2 hover:border-blue-500">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-6 mx-auto transition-colors duration-300 group-hover:bg-blue-500">
                <i className="fas fa-user-cog text-blue-600 text-xl transition-colors duration-300 group-hover:text-white"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 text-center mb-4 transition-colors duration-300 group-hover:text-blue-600">
                Kişisel Öğrenme
              </h3>
              <p className="text-gray-600 text-center">
                Seviyene ve ilgi alanlarına göre özel olarak hazırlanmış
                içerikler.
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-8 h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-2 hover:border-blue-500">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-6 mx-auto transition-colors duration-300 group-hover:bg-blue-500">
                <i className="fas fa-podcast text-blue-600 text-xl transition-colors duration-300 group-hover:text-white"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 text-center mb-4 transition-colors duration-300 group-hover:text-blue-600">
                Gerçek İçerikler
              </h3>
              <p className="text-gray-600 text-center">
                Podcast, blog ve videolar gibi gerçek yaşam içeriklerini
                dönüştürürüz.
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-8 h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-2 hover:border-blue-500">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-6 mx-auto transition-colors duration-300 group-hover:bg-blue-500">
                <i className="fas fa-sync-alt text-blue-600 text-xl transition-colors duration-300 group-hover:text-white"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 text-center mb-4 transition-colors duration-300 group-hover:text-blue-600">
                Sürdürülebilir Alışkanlık
              </h3>
              <p className="text-gray-600 text-center">
                Günlük rutinlerine uygun ve sürekli olarak motive eden
                içeriklerle öğrenme alışkanlığını kalıcı hale getiririz.
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-8 h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-2 hover:border-blue-500">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-6 mx-auto transition-colors duration-300 group-hover:bg-blue-500">
                <i className="fas fa-chart-line text-blue-600 text-xl transition-colors duration-300 group-hover:text-white"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 text-center mb-4 transition-colors duration-300 group-hover:text-blue-600">
                Özgüven ve Motivasyon
              </h3>
              <p className="text-gray-600 text-center">
                Seviyene uygun içerikler sayesinde dil öğrenme konusundaki
                özgüvenini ve motivasyonunu artırırız.
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* Kimin İçin */}
      <section id="kimin-icin" className="py-16 bg-white">
  <div className="container mx-auto px-6">
    <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
      Kimin İçin?
    </h2>
    <div className="grid md:grid-cols-3 gap-10 max-w-4xl mx-auto">
      {/* 1. Kart */}
      <div className="flex flex-col items-center">
        <img
          src="/who1.png"
          alt="Günlük içeriklerle öğrenenler"
          className="w-32 h-32 object-contain mb-6"
        />
        <p className="text-gray-700 text-center">
          Günlük içerikleri tüketirken İngilizce öğrenmek isteyenler.
        </p>
      </div>

      {/* 2. Kart */}
      <div className="flex flex-col items-center">
        <img
          src="/who2.png"
          alt="Zamanı olmayan içerik tüketicileri"
          className="w-32 h-32 object-contain mb-6"
        />
        <p className="text-gray-700 text-center">
          Zamanı olmayan ama sürekli içerik tüketenler.
        </p>
      </div>

      {/* 3. Kart */}
      <div className="flex flex-col items-center">
        <img
          src="/who3.png"
          alt="Klasik yöntemlerden sıkılanlar"
          className="w-32 h-32 object-contain mb-6"
        />
        <p className="text-gray-700 text-center">
          Klasik dil öğrenme yöntemlerinden sıkılmış olanlar.
        </p>
      </div>
    </div>
  </div>
</section>

      {/* Slogan ve CTA */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-8">
            LingRoot, kişisel İngilizce asistanınız!
          </h2>
          <p className="text-xl mb-4">
            Her seviyeden senin seviyene LingRoot çevirir.
          </p>
          <p className="text-xl italic mb-12">Your routine turns to English.</p>
          <button className="px-8 py-4 bg-white text-blue-600 text-lg font-semibold rounded-lg shadow-lg hover:bg-blue-50 transition duration-300 cursor-pointer whitespace-nowrap">
            Şimdi Ücretsiz Deneyin
          </button>
        </div>
      </section>
      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">LingRoot</h3>
              <p className="text-gray-400">
                Kişiselleştirilmiş dil öğrenme deneyimi.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Hızlı Bağlantılar</h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white cursor-pointer"
                  >
                    Ana Sayfa
                  </a>
                </li>
                <li>
                  <a
                    href="#nasil-calisir"
                    className="text-gray-400 hover:text-white cursor-pointer"
                  >
                    Nasıl Çalışır
                  </a>
                </li>
                <li>
                  <a
                    href="#avantajlar"
                    className="text-gray-400 hover:text-white cursor-pointer"
                  >
                    Avantajlar
                  </a>
                </li>
                <li>
                  <a
                    href="#kimin-icin"
                    className="text-gray-400 hover:text-white cursor-pointer"
                  >
                    Kimin İçin
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">İletişim</h4>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <i className="fas fa-envelope mr-2 text-gray-400"></i>
                  <a
                    href="mailto:info@lingroot.com"
                    className="text-gray-400 hover:text-white cursor-pointer"
                  >
                    info@lingroot.com
                  </a>
                </li>
                <li className="flex items-center">
                  <i className="fas fa-phone mr-2 text-gray-400"></i>
                  <span className="text-gray-400">+90 212 123 4567</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Bizi Takip Edin</h4>
              <div className="flex space-x-4">
                <a
                  href="#"
                  className="text-gray-400 hover:text-white cursor-pointer"
                >
                  <i className="fab fa-facebook-f text-xl"></i>
                </a>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white cursor-pointer"
                >
                  <i className="fab fa-twitter text-xl"></i>
                </a>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white cursor-pointer"
                >
                  <i className="fab fa-instagram text-xl"></i>
                </a>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white cursor-pointer"
                >
                  <i className="fab fa-linkedin-in text-xl"></i>
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm mb-4 md:mb-0">
              &copy; 2025 LingRoot. Tüm hakları saklıdır.
            </p>
            <div className="flex space-x-6">
              <a
                href="#"
                className="text-gray-400 hover:text-white text-sm cursor-pointer"
              >
                Gizlilik Politikası
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-white text-sm cursor-pointer"
              >
                Kullanım Koşulları
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default App;
