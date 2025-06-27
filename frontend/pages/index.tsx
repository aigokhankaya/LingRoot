// The exported code uses Tailwind CSS. Install Tailwind CSS in your dev environment to ensure all styles work.
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/router';

import { useAuth } from '../src/lib/auth'; // Eski dosyadan auth context'ini import ediyoruz

// shadcn/ui ve diğer kütüphane importları
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
// InputMask removed - using regular Input instead
import '@fortawesome/fontawesome-free/css/all.min.css';


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
    // --- YENİ TASARIMDAN GELEN STATE'LER ---
    const [level, setLevel] = useState(1);
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isRegisterOpen, setIsRegisterOpen] = useState(false); // Kayıt modalı için yeni state
    const [language, setLanguage] = useState<'tr' | 'en'>('tr');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Mobil menü state'i

    // --- ESKİ MANTIKTAN ENTEGRE EDİLEN HOOK'LAR VE STATE'LER ---
  const router = useRouter();
  const { login, loginWithGoogle, isAuthenticated, register } = useAuth();
    const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

    // --- FORM STATE'LERİ (KONTROLLÜ BİLEŞENLER İÇİN) ---
    const [loginForm, setLoginForm] = useState({ email: '', password: '', rememberMe: false });
    const [registerForm, setRegisterForm] = useState({
        firstName: '',
        lastName: '',
    email: '',
        phoneNumber: '',
    password: ''
  });

  const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];


  // Kullanıcı zaten giriş yapmışsa welcome sayfasına yönlendir.

  React.useEffect(() => {
    if (isAuthenticated) {
      router.push('/welcome');
    }
  }, [isAuthenticated, router]);

    // Form input değişikliklerini yöneten fonksiyonlar
    const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setLoginForm({ ...loginForm, [e.target.name]: value });
    };

    const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // İsim ve Soyisimi ayırmak için özel mantık
        if (e.target.name === 'fullName') {
            const nameParts = e.target.value.trim().split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            setRegisterForm({ ...registerForm, firstName, lastName });
        } else {
            setRegisterForm({ ...registerForm, [e.target.name]: e.target.value });
        }
    };
    
    // --- GİRİŞ VE KAYIT FONKSİYONLARI (ESKİ MANTIK İLE YENİ STATE'LER BİRLEŞTİRİLDİ) ---
    const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
            const result = await login(loginForm.email, loginForm.password, loginForm.rememberMe);
      if (result.success) {
                setIsLoginOpen(false); // Başarılı olunca modalı kapat
        router.push('/welcome');
      } else {
                setError(result.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
      }
        } catch (err: any) {
            setError(err.message || 'Giriş sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

    const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const { firstName, lastName, email, phoneNumber, password } = registerForm;
      const result = await register(firstName, lastName, email, phoneNumber, password);
      if (result.success) {
                setIsRegisterOpen(false); // Başarılı olunca modalı kapat
        router.push('/welcome');
      } else {
                setError(result.message || 'Kayıt başarısız. Lütfen bilgilerinizi kontrol edin.');
      }
        } catch (err: any) {
            setError(err.message || 'Kayıt sırasında bir hata oluştu.');
    } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        
        try {
            console.log('🚀 Google giriş başlatılıyor...');
            
            // Google Auth modülünü dinamik olarak import et
            console.log('📦 Google Auth modülü yükleniyor...');
            const { initializeGoogleAuth, signInWithGoogle } = await import('../src/lib/googleAuth');
            
            // Google Auth'u başlat
            console.log('🔧 Google Auth başlatılıyor...');
            await initializeGoogleAuth();
            
            // Google Sign-In'i tetikle
            console.log('🎯 Google Sign-In tetikleniyor...');
            const { credential } = await signInWithGoogle();
            console.log('✅ Google credential alındı');
            
            // useAuth hook'undan loginWithGoogle fonksiyonunu kullan
            console.log('🔐 Backend ile kimlik doğrulama yapılıyor...');
            const result = await loginWithGoogle(credential, loginForm.rememberMe);
            
            if (result.success) {
                console.log('✅ Google giriş başarılı, dashboard\'a yönlendiriliyor...');
                setIsLoginOpen(false);
                router.push('/dashboard');
            } else {
                console.error('❌ Backend giriş hatası:', result.message);
                setError(result.message || 'Google ile giriş başarısız.');
            }
        } catch (err: any) {
            console.error('❌ Google login error:', err);
            
            // Kullanıcı dostu hata mesajları
            let userErrorMessage = 'Google ile giriş sırasında bir hata oluştu.';
            
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

    // Yeni tasarımın çeviri objesi
    const translations = {
      tr: {
        nav: {
          howItWorks: "Nasıl Çalışır?",
          features: "Özellikler",
          testimonials: "Kullanıcı Yorumları",
          blog: "Blog",
          login: "Giriş Yap",
          signup: "Ücretsiz Kaydol"
        },
        login: {
          title: "Giriş Yap",
          description: "LingRoot hesabınıza giriş yapın",
          emailLabel: "E-posta veya Kullanıcı Adı",
          emailPlaceholder: "ornek@email.com",
          passwordLabel: "Şifre",
          forgotPassword: "Şifremi Unuttum",
          loginButton: "Giriş Yap",
          loadingButton: "Giriş Yapılıyor...",
          or: "veya",
          googleLogin: "Google ile Giriş Yap",
          facebookLogin: "Facebook ile Giriş Yap",
          appleLogin: "Apple ile Giriş Yap",
          noAccount: "Hesabınız yok mu?",
          signupLink: "Ücretsiz Kaydol"
        },
        register: {
          title: "Ücretsiz Hesap Oluştur",
          description: "LingRoot dünyasına katılın ve hemen öğrenmeye başlayın.",
          fullNameLabel: "Ad Soyad",
          fullNamePlaceholder: "Adınız Soyadınız",
          emailLabel: "E-posta",
          emailPlaceholder: "ornek@email.com",
          phoneLabel: "Telefon Numarası",
          passwordLabel: "Şifre",
          registerButton: "Hesap Oluştur",
          loadingButton: "Hesap Oluşturuluyor...",
          hasAccount: "Zaten bir hesabınız var mı?",
          loginLink: "Giriş Yap"
        },
        hero: {
          badge: "Hayatın Değişmesin, İngilizcen Gelişsin",
          title: "Sevdiğin İçerikler, ",
          titleHighlight: "Anlayacağın İngilizceyle",
          description: "LingRoot, YouTube videoları, podcast'ler, blog yazıları gibi zaten takip ettiğin içerikleri seçtiğin İngilizce seviyesine (A1–C2) göre otomatik olarak sadeleştirir, seslendirir ve altyazı ekler. İngilizce öğrenmek için hayatını değiştirmene gerek yok — sadece dinlemeye devam et.",
          tryButton: "Hemen Ücretsiz Dene",
          watchButton: "Nasıl Çalıştığını İzle"
        },
        howItWorks: {
          title: "LingRoot Nasıl Çalışır?",
          description: "Sevdiğin içerikleri kendi İngilizce seviyende dinlemek için sadece üç adım yeterli.",
          steps: [
            { icon: "fas fa-link", title: "İçeriğini Seç", description: "YouTube videosu, Spotify podcast'i, bir haber yazısı… Sadece linki yapıştır veya metni yükle." },
            { icon: "fas fa-sliders-h", title: "Seviyeni Belirle", description: "A1'den C2'ye. İçerik, senin anlayabileceğin İngilizceye otomatik olarak çevrilir." },
            { icon: "fas fa-headphones", title: "Dinle ve Öğren", description: "İçerik yapay zeka tarafından seslendirilir, altyazı eklenir ve seviyene özel hale gelir. Artık sevdiğin şeyleri dinleyerek İngilizce öğrenebilirsin." }
          ]
        },
        demo: { title: "Aynı İçerik, Senin Seviyen", description: "Seviyeni seç ve içeriğin nasıl değiştiğini gör. Dilediğin seviyede dinleyerek İngilizceni geliştir.", selectLevel: "Seviyeni Seç", originalContent: "Orijinal İçerik (C2)", yourLevel: "Senin Seviyen", tryYourContent: "Kendi İçeriğini Dene" },
        routine: { title: "Günlük Rutinin = İngilizce Dersin", description: "Ekstra zaman ayırmana gerek yok. Zaten yaptığın aktiviteler sırasında İngilizce öğren.", activities: [{ icon: "fas fa-walking", title: "Yürüyüş Yaparken", description: "Favori podcast'lerini dinlerken İngilizce öğren" }, { icon: "fas fa-dumbbell", title: "Spor Yaparken", description: "Motivasyon videolarını seviyene uygun dinle" }, { icon: "fas fa-car", title: "Araç Kullanırken", description: "Trafikteyken sevdiğin içerikleri dinle" }, { icon: "fas fa-home", title: "Ev İşleri Yaparken", description: "Temizlik ve yemek yaparken öğrenmeye devam et" }], adaptButton: "Seviyene Uyarla" },
        features: { title: "Neden LingRoot?", description: "LingRoot, İngilizce öğrenme deneyimini tamamen farklı bir seviyeye taşır.", featuresList: [{ icon: "fas fa-globe", title: "Gerçek İçerikler", description: "Ders kitapları değil, gerçek hayattan videolar ve yazılar ile öğren" }, { icon: "fas fa-user-cog", title: "Kişiselleştirilmiş Deneyim", description: "Seviyene ve ilgi alanına göre özel olarak hazırlanmış içerikler" }, { icon: "fas fa-headphones-alt", title: "Sadece Dinleyerek Öğren", description: "Kaliteli seslendirme, altyazı ve tekrar özellikleriyle pasif öğrenme" }, { icon: "fas fa-clock", title: "Ekstra Zaman Gerekmez", description: "Günlük rutinin içinde, ek bir çaba harcamadan İngilizce öğren" }] },
        testimonials: { title: "Kullanıcılarımız Ne Diyor?", description: "LingRoot ile İngilizce öğrenme deneyimlerini paylaşan kullanıcılarımızın yorumları.", users: [{ name: "Mert Y.", level: "B1 seviyesinde kullanıcı", quote: "LingRoot sayesinde artık yabancı videolardan korkmuyorum. Aynı içeriği hem A2 hem B1 seviyede dinlemek inanılmaz motive edici." }, { name: "Zeynep K.", level: "A2 seviyesinde kullanıcı", quote: "Sadece dinleyerek öğrendiğimi fark ettim. Her gün izlediğim içerikler artık İngilizce gelişimime katkı sağlıyor." }, { name: "Ahmet S.", level: "B2 seviyesinde kullanıcı", quote: "Sabah koşumda dinlediğim podcast'ler artık İngilizce öğretmenim. Hiç ekstra zaman harcamadan her gün ilerliyorum." }, { name: "Ayşe D.", level: "A1 seviyesinde kullanıcı", quote: "İngilizce öğrenmek için daha önce birçok uygulama denedim ama hiçbiri LingRoot kadar etkili olmadı. Sevdiğim içeriklerle öğrenmek çok daha keyifli." }, { name: "Emre T.", level: "C1 seviyesinde kullanıcı", quote: "İleri seviyede olmama rağmen, LingRoot ile yeni kelimeler öğrenmeye devam ediyorum. Özellikle akademik içerikleri kendi seviyemde dinlemek çok faydalı." }] },
        tryNow: { title: "Başlamak İçin Sadece Link Paylaş", placeholder: "YouTube, Spotify veya herhangi bir içerik linki yapıştır...", tryButton: "Hemen Dene", description: "Seviyeni seç ve içeriği hemen dinlemeye başla. Kayıt olmak için sadece 1 dakika!" },
        cta: { title: "İngilizce Öğrenmek İçin Hayatını Değiştirme. Dinlemeye Devam Et.", description: "Günlük rutininde dinlediğin içerikler şimdi senin İngilizce öğretmenin. Ekstra zaman harcamadan, sevdiğin şeyleri dinleyerek öğren.", button: "Şimdi Başla — Ücretsiz ve Hemen", benefits: ["1 dakikada kaydol", "Kredi kartı gerekmez", "Hemen başla"] },
        footer: { slogan: "\"Your routines turn into English.\"", quickLinks: { title: "Hızlı Bağlantılar", links: ["Hakkımızda", "Nasıl Çalışır?", "Fiyatlandırma", "Blog", "İletişim"] }, legal: { title: "Yasal", links: ["Gizlilik Politikası", "Kullanım Şartları", "Çerez Politikası", "KVKK"] }, contact: { title: "Bize Ulaşın", email: "info@lingroot.com", phone: "+90 212 123 45 67", address: "İstanbul, Türkiye" }, copyright: "Tüm hakları saklıdır." }
      },
      en: {
        nav: {
          howItWorks: "How It Works",
          features: "Features",
          testimonials: "Testimonials",
          blog: "Blog",
          login: "Login",
          signup: "Sign Up Free"
        },
        login: {
          title: "Login",
          description: "Sign in to your LingRoot account",
          emailLabel: "Email or Username",
          emailPlaceholder: "example@email.com",
          passwordLabel: "Password",
          forgotPassword: "Forgot Password",
          loginButton: "Login",
          loadingButton: "Logging in...",
          or: "or",
          googleLogin: "Login with Google",
          facebookLogin: "Login with Facebook",
          appleLogin: "Login with Apple",
          noAccount: "Don't have an account?",
          signupLink: "Sign Up Free"
        },
        register: {
          title: "Create a Free Account",
          description: "Join the LingRoot world and start learning right away.",
          fullNameLabel: "Full Name",
          fullNamePlaceholder: "Your Full Name",
          emailLabel: "Email",
          emailPlaceholder: "example@email.com",
          phoneLabel: "Phone Number",
          passwordLabel: "Password",
          registerButton: "Create Account",
          loadingButton: "Creating Account...",
          hasAccount: "Already have an account?",
          loginLink: "Login"
        },
        hero: {
          badge: "Don't Change Your Life, Improve Your English",
          title: "Content You Love, ",
          titleHighlight: "In English You Understand",
          description: "LingRoot automatically simplifies, narrates, and adds subtitles to the content you already follow—YouTube videos, podcasts, blog posts—according to your chosen English level (A1–C2). You don't need to change your life to learn English—just keep listening.",
          tryButton: "Try It Free Now",
          watchButton: "Watch How It Works"
        },
        howItWorks: {
          title: "How LingRoot Works",
          description: "Just three simple steps to listen to the content you love at your own English level.",
          steps: [
            { icon: "fas fa-link", title: "Choose Your Content", description: "A YouTube video, Spotify podcast, a news article... Just paste the link or upload the text." },
            { icon: "fas fa-sliders-h", title: "Set Your Level", description: "From A1 to C2. The content is automatically converted to English you can understand." },
            { icon: "fas fa-headphones", title: "Listen and Learn", description: "The content is narrated by AI, subtitled, and customized to your level. Now you can learn English by listening to things you love." }
          ]
        },
        demo: {
          title: "Same Content, Your Level",
          description: "Choose your level and see how the content changes. Improve your English by listening at the level you prefer.",
          selectLevel: "Select Your Level",
          originalContent: "Original Content (C2)",
          yourLevel: "Your Level",
          tryYourContent: "Try Your Own Content"
        },
        routine: {
          title: "Your Daily Routine = Your English Lesson",
          description: "No extra time needed. Learn English during activities you already do.",
          activities: [
            { icon: "fas fa-walking", title: "While Walking", description: "Learn English while listening to your favorite podcasts" },
            { icon: "fas fa-dumbbell", title: "While Exercising", description: "Listen to motivational videos at your level" },
            { icon: "fas fa-car", title: "While Driving", description: "Listen to content you love in traffic" },
            { icon: "fas fa-home", title: "During Housework", description: "Continue learning while cleaning and cooking" }
          ],
          adaptButton: "Adapt to Your Level"
        },
        features: {
          title: "Why LingRoot?",
          description: "LingRoot takes the English learning experience to a completely different level.",
          featuresList: [
            { icon: "fas fa-globe", title: "Real Content", description: "Learn with real-life videos and articles, not textbooks" },
            { icon: "fas fa-user-cog", title: "Personalized Experience", description: "Content specially prepared according to your level and interests" },
            { icon: "fas fa-headphones-alt", title: "Learn Just by Listening", description: "Passive learning with quality narration, subtitles, and repetition features" },
            { icon: "fas fa-clock", title: "No Extra Time Required", description: "Learn English within your daily routine, without extra effort" }
          ]
        },
        testimonials: {
          title: "What Our Users Say",
          description: "Reviews from our users sharing their English learning experiences with LingRoot.",
          users: [
            { name: "Mert Y.", level: "B1 level user", quote: "Thanks to LingRoot, I'm no longer afraid of foreign videos. Listening to the same content at both A2 and B1 levels is incredibly motivating." },
            { name: "Zeynep K.", level: "A2 level user", quote: "I realized I'm learning just by listening. The content I watch every day now contributes to my English development." },
            { name: "Ahmet S.", level: "B2 level user", quote: "The podcasts I listen to during my morning run are now my English teacher. I progress every day without spending any extra time." },
            { name: "Ayşe D.", level: "A1 level user", quote: "I've tried many apps to learn English before, but none were as effective as LingRoot. Learning with content I love is much more enjoyable." },
            { name: "Emre T.", level: "C1 level user", quote: "Despite being at an advanced level, I continue to learn new words with LingRoot. Listening to academic content at my own level is especially useful." }
          ]
        },
        tryNow: {
          title: "Just Share a Link to Get Started",
          placeholder: "Paste a YouTube, Spotify, or any content link...",
          tryButton: "Try It Now",
          description: "Choose your level and start listening to content right away. Only 1 minute to sign up!"
        },
        cta: {
          title: "Don't Change Your Life to Learn English. Keep Listening.",
          description: "The content you listen to in your daily routine is now your English teacher. Learn by listening to things you love, without spending extra time.",
          button: "Start Now — Free and Immediate",
          benefits: [
            "Sign up in 1 minute",
            "No credit card required",
            "Start immediately"
          ]
        },
        footer: {
          slogan: "\"Your routines turn into English.\"",
          quickLinks: {
            title: "Quick Links",
            links: ["About Us", "How It Works", "Pricing", "Blog", "Contact"]
          },
          legal: {
            title: "Legal",
            links: ["Privacy Policy", "Terms of Use", "Cookie Policy", "GDPR"]
          },
          contact: {
            title: "Contact Us",
            email: "info@lingroot.com",
            phone: "+90 212 123 45 67",
            address: "Istanbul, Turkey"
          },
          copyright: "All rights reserved."
        }
      }
    };
    const t = translations[language];

  return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
            {/* Navigation */}
            <nav className="bg-white shadow-sm py-3 sticky top-0 z-50">
                <div className="container mx-auto px-8 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <img src="/logo.svg" alt="LingRoot Logo" className="w-8 h-8 md:w-10 md:h-10" />
                        <span className="text-xl md:text-2xl font-extrabold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 bg-clip-text text-transparent tracking-tight">LingRoot</span>
                    </div>
                    
                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-6">
                        <a href="/about" className="text-gray-600 hover:text-blue-600 transition-colors duration-200 cursor-pointer text-sm lg:text-base">Hakkımızda</a>
                        <a href="#nasil-calisir" className="text-gray-600 hover:text-blue-600 transition-colors duration-200 cursor-pointer text-sm lg:text-base">{t.nav.howItWorks}</a>
                        <a href="#ozellikler" className="text-gray-600 hover:text-blue-600 transition-colors duration-200 cursor-pointer text-sm lg:text-base">{t.nav.features}</a>
                        <a href="#yorumlar" className="text-gray-600 hover:text-blue-600 transition-colors duration-200 cursor-pointer text-sm lg:text-base">{t.nav.testimonials}</a>
                        <a href="#blog" className="text-gray-600 hover:text-blue-600 transition-colors duration-200 cursor-pointer text-sm lg:text-base">{t.nav.blog}</a>
                    </div>
                    
                    {/* Desktop Buttons */}
                    <div className="hidden md:flex items-center space-x-4">
                        <Button variant="ghost" className="!rounded-button whitespace-nowrap" onClick={() => setLanguage(language === 'tr' ? 'en' : 'tr')}>
                            {language === 'tr' ? 'EN' : 'TR'}
                        </Button>
                        
                        {/* GİRİŞ YAP MODALI */}
                        <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="!rounded-button whitespace-nowrap">{t.nav.login}</Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-bold text-center mb-2">{t.login.title}</DialogTitle>
                                    <DialogDescription className="text-center">{t.login.description}</DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleLoginSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">{t.login.emailLabel}</Label>
                                        <Input id="email" name="email" type="email" placeholder={t.login.emailPlaceholder} value={loginForm.email} onChange={handleLoginChange} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password">{t.login.passwordLabel}</Label>
                                        <Input id="password" name="password" type="password" value={loginForm.password} onChange={handleLoginChange} required />
                                    </div>
                                    
                                    {/* Beni Hatırla Checkbox */}
                                    <div className="flex items-center space-x-2">
                                        <input
                                            id="rememberMe"
                                            name="rememberMe"
                                            type="checkbox"
                                            checked={loginForm.rememberMe}
                                            onChange={handleLoginChange}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <Label htmlFor="rememberMe" className="text-sm font-medium text-gray-700 cursor-pointer">
                                            Beni hatırla (30 gün)
                                        </Label>
                                    </div>
                                    
                                    {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                                    <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white !rounded-button" disabled={loading}>
                                        {loading ? t.login.loadingButton : t.login.loginButton}
                                    </Button>
                                    
                                    {/* Ayırıcı */}
                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <span className="w-full border-t border-gray-300" />
                                        </div>
                                        <div className="relative flex justify-center text-xs uppercase">
                                            <span className="bg-white px-2 text-gray-500">veya</span>
                                        </div>
                                    </div>
                                    
                                    {/* Google Login Butonu */}
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        className="w-full !rounded-button border-gray-300 hover:bg-gray-50" 
                                        onClick={handleGoogleLogin}
                                        disabled={loading}
                                    >
                                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                        </svg>
                                        Google ile Giriş Yap
                                    </Button>
                                </form>
                            </DialogContent>
                        </Dialog>

                        {/* KAYIT OL BUTONU */}
                        <a href="/register">
                            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white !rounded-button whitespace-nowrap">{t.nav.signup}</Button>
                        </a>
                    </div>
          
                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center space-x-2">
                        <Button variant="ghost" className="p-2 text-xs" onClick={() => setLanguage(language === 'tr' ? 'en' : 'tr')}>
                            {language === 'tr' ? 'EN' : 'TR'}
                        </Button>
                        <Button 
                            variant="ghost" 
                            className="p-2" 
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'} text-xl`}></i>
                        </Button>
                    </div>
                </div>
                
                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden bg-white border-t border-gray-200 mobile-menu">
                        <div className="container mx-auto px-4 py-4 space-y-4">
                            <a href="/about" className="block text-gray-600 hover:text-blue-600 transition-colors duration-200 py-2" onClick={() => setIsMobileMenuOpen(false)}>Hakkımızda</a>
                            <a href="#nasil-calisir" className="block text-gray-600 hover:text-blue-600 transition-colors duration-200 py-2" onClick={() => setIsMobileMenuOpen(false)}>{t.nav.howItWorks}</a>
                            <a href="#ozellikler" className="block text-gray-600 hover:text-blue-600 transition-colors duration-200 py-2" onClick={() => setIsMobileMenuOpen(false)}>{t.nav.features}</a>
                            <a href="#yorumlar" className="block text-gray-600 hover:text-blue-600 transition-colors duration-200 py-2" onClick={() => setIsMobileMenuOpen(false)}>{t.nav.testimonials}</a>
                            <a href="#blog" className="block text-gray-600 hover:text-blue-600 transition-colors duration-200 py-2" onClick={() => setIsMobileMenuOpen(false)}>{t.nav.blog}</a>
                            
                            <div className="pt-4 border-t border-gray-200 space-y-3">
                                <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="w-full !rounded-button" onClick={() => setIsMobileMenuOpen(false)}>{t.nav.login}</Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-md">
                                        <DialogHeader>
                                            <DialogTitle className="text-2xl font-bold text-center mb-2">{t.login.title}</DialogTitle>
                                            <DialogDescription className="text-center">{t.login.description}</DialogDescription>
                                        </DialogHeader>
                                        <form onSubmit={handleLoginSubmit} className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="mobile-email">{t.login.emailLabel}</Label>
                                                <Input id="mobile-email" name="email" type="email" placeholder={t.login.emailPlaceholder} value={loginForm.email} onChange={handleLoginChange} required />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="mobile-password">{t.login.passwordLabel}</Label>
                                                <Input id="mobile-password" name="password" type="password" value={loginForm.password} onChange={handleLoginChange} required />
                                            </div>
                                            
                                            {/* Beni Hatırla Checkbox - Mobile */}
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    id="mobile-rememberMe"
                                                    name="rememberMe"
                                                    type="checkbox"
                                                    checked={loginForm.rememberMe}
                                                    onChange={handleLoginChange}
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                />
                                                <Label htmlFor="mobile-rememberMe" className="text-sm font-medium text-gray-700 cursor-pointer">
                                                    Beni hatırla (30 gün)
                                                </Label>
                                            </div>
                                            
                                            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                                            <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white !rounded-button" disabled={loading}>
                                                {loading ? t.login.loadingButton : t.login.loginButton}
                                            </Button>
                                            
                                            {/* Ayırıcı - Mobile */}
                                            <div className="relative">
                                                <div className="absolute inset-0 flex items-center">
                                                    <span className="w-full border-t border-gray-300" />
                                                </div>
                                                <div className="relative flex justify-center text-xs uppercase">
                                                    <span className="bg-white px-2 text-gray-500">veya</span>
                                                </div>
                                            </div>
                                            
                                            {/* Google Login Butonu - Mobile */}
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                className="w-full !rounded-button border-gray-300 hover:bg-gray-50" 
                                                onClick={handleGoogleLogin}
                                                disabled={loading}
                                            >
                                                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                                </svg>
                                                Google ile Giriş Yap
                                            </Button>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                                
                                <a href="/register" onClick={() => setIsMobileMenuOpen(false)}>
                                    <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white !rounded-button">{t.nav.signup}</Button>
                                </a>
                            </div>
                        </div>
                    </div>
                )}
            </nav>
            
            {/* Hero Section */}
            <section className="relative overflow-hidden min-h-[700px] hero-section">
                <div className="absolute inset-0 z-0"> 
                    <img 
                        src="https://readdy.ai/api/search-image?query=A%20modern%2C%20clean%2C%20minimalist%20scene%20showing%20a%20person%20relaxing%20with%20headphones%2C%20listening%20to%20content%20on%20their%20device.%20The%20background%20is%20a%20soft%20gradient%20from%20light%20blue%20to%20white%2C%20creating%20a%20calm%20and%20peaceful%20atmosphere.%20The%20scene%20suggests%20learning%20without%20effort%2C%20with%20subtle%20educational%20elements%20in%20the%20background.&width=1440&height=700&seq=hero1&orientation=landscape" 
                        alt="Hero Background" 
                        className="w-full h-full object-cover"
                    /> 
                </div>
                <div className="container mx-auto px-8 py-20 relative z-10">
                    <div className="max-w-4xl">
                        <Badge className="mb-4 bg-blue-100 text-blue-800 hover:bg-blue-200 border-none text-sm hero-badge">{t.hero.badge}</Badge>
                        <h1 className="text-6xl font-bold mb-6 text-black leading-tight hero-title">
                            {t.hero.title}<span className="text-blue-600">{t.hero.titleHighlight}</span>
                        </h1>
                        <p className="text-xl text-black mb-10 leading-relaxed hero-description">
                            {t.hero.description}
                        </p>
                        <div className="flex gap-4 hero-buttons">
                            <a href="/register">
                                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-base py-4 px-6 !rounded-button whitespace-nowrap">
                                    <i className="fas fa-rocket mr-2"></i> {t.hero.tryButton}
                                </Button>
                            </a>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 text-base py-4 px-6 !rounded-button whitespace-nowrap">
                                        <i className="fas fa-play-circle mr-2"></i> {t.hero.watchButton}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-4xl">
                                    <DialogHeader>
                                        <DialogTitle className="text-2xl font-bold">{t.howItWorks.title}</DialogTitle>
                                        <DialogDescription>
                                            {t.howItWorks.description}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                                        <iframe
                                            src="https://www.youtube.com/embed/demo-video-id"
                                            className="absolute inset-0 h-full w-full"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen>
                                        </iframe>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </div>
            </section>
            {/* Demo Section - Added before How It Works */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4 text-gray-900 demo-title">{t.demo.title}</h2>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto demo-description" >
                            Ekstra zaman ayırmana gerek yok. Zaten yaptığın aktiviteler sırasında İngilizce öğren.
                        </p>
                    </div>
                    <div className="bg-white rounded-xl shadow-xl overflow-hidden mb-2">
                        <div className="grid md:grid-cols-2 gap-0">
                            <div className="p-8 md:p-12 flex flex-col justify-center">
                                <h3 className="text-2xl font-bold mb-6">{t.demo.selectLevel}</h3>
                                <div className="mb-8">
                                    <div className="flex justify-between mb-4">
                                        {levels.map((lvl, index) => (
                                            <div
                                                key={index}
                                                className={`text-sm font-medium cursor-pointer ${index === level ? 'text-blue-600' : 'text-gray-500'}`}
                                                onClick={() => setLevel(index)}
                                            >
                                                {lvl}
                                            </div>
                                        ))}
                                    </div>
                                    <Slider
                                        defaultValue={[level]}
                                        max={5}
                                        step={1}
                                        onValueChange={(value) => setLevel(value[0])}
                                    />
                                </div>
                                <div className="space-y-4">
                                    <div className="p-4 bg-blue-50 rounded-lg">
                                        <h4 className="font-bold mb-2">{t.demo.originalContent}</h4>
                                        <p className="text-gray-700">The implications of artificial intelligence on modern society are profound and multifaceted, encompassing economic, ethical, and philosophical dimensions.</p>
                                    </div>
                                    <div className="p-4 bg-blue-100 rounded-lg border-2 border-blue-500">
                                        <h4 className="font-bold mb-2">{t.demo.yourLevel} ({levels[level]})</h4>
                                        {level === 0 && <p className="text-gray-700">AI changes how we live. It helps us but also makes us think about what is right and wrong.</p>}
                                        {level === 1 && <p className="text-gray-700">AI is changing our lives in many ways. It helps us but also makes us think about what is right and wrong in society.</p>}
                                        {level === 2 && <p className="text-gray-700">Artificial intelligence is changing our society in many important ways. It affects our jobs and makes us think about ethics.</p>}
                                        {level === 3 && <p className="text-gray-700">Artificial intelligence has significant effects on our modern society. It impacts our economy and raises important ethical questions.</p>}
                                        {level === 4 && <p className="text-gray-700">The effects of artificial intelligence on modern society are significant and varied, including economic impacts and ethical considerations.</p>}
                                        {level === 5 && <p className="text-gray-700">The implications of artificial intelligence on modern society are profound and multifaceted, encompassing economic, ethical, and philosophical dimensions.</p>}
                                    </div>
                                </div>
                                <a href="/register">
                                    <Button className="mt-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white !rounded-button whitespace-nowrap">
                                        {t.demo.tryYourContent}
                                    </Button>
                                </a>
                            </div>
                            <div className="relative overflow-hidden">
                                <div className="relative aspect-video w-full h-full">
                                    <iframe
                                        src="https://www.youtube.com/embed/demo-video-id"
                                        className="absolute inset-0 h-full w-full"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen>
                                    </iframe>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            {/* How It Works Section */}
            <section id="nasil-calisir" className="py-20 bg-gradient-to-b from-gray-50 to-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4 text-gray-900">{t.howItWorks.title}</h2>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto">{t.howItWorks.description}</p>
                    </div>
                    <div className="mb-16">
                        <div className="relative aspect-video w-full overflow-hidden rounded-lg shadow-lg mb-6">
                            <iframe
                                src="https://www.youtube.com/embed/demo-video-id"
                                className="absolute inset-0 h-full w-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen>
                            </iframe>
                        </div>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {t.howItWorks.steps.map((step, index) => (
                            <Card key={index} className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col how-it-works-card">
                                <CardHeader className="pb-0 p-0">
                                    <div className="how-it-works-image">
                                        <img
                                            src={`https://readdy.ai/api/search-image?query=A person ${index === 0 ? 'selecting content on their device, with multiple media platforms visible on screen. The scene shows YouTube videos, Spotify podcasts, and news articles. Clean, modern interface with a soft blue background and minimalist design.' : index === 1 ? 'close-up of a language level selector interface showing levels from A1 to C2. The design is clean and modern with a soft blue background. The interface shows a slider or dropdown menu being adjusted by a finger, representing language level selection.' : 'relaxing with headphones, enjoying content on their device. The screen shows subtitles in English with a clean interface. The background is a soft blue gradient, and the scene conveys effortless learning through listening.'}&width=400&height=300&seq=step${index+1}&orientation=landscape`}
                                            alt={step.title}
                                            className=""
                                        />
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6 flex-grow">
                                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                                        <i className={`${step.icon} text-blue-600 text-xl`}></i>
                                    </div>
                                    <CardTitle className="text-2xl mb-2">{index + 1}. {step.title}</CardTitle>
                                    <CardDescription className="text-gray-600 text-base">{step.description}</CardDescription>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>
            {/* Daily Routine Section */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4 text-gray-900">{t.routine.title}</h2>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12 routine-description">
                            {t.routine.description}
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {t.routine.activities.map((activity, index) => (
                            <Card key={index} className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col routine-card">
                                <CardHeader className="pb-0 p-0">
                                    <div className="routine-image">
                                        <img
                                            src={`https://readdy.ai/api/search-image?query=A person ${index === 0 ? 'walking in a park with headphones, listening to content on their smartphone. The scene has a bright, airy feel with trees and a path. The person looks relaxed and engaged with what they are listening to, suggesting learning while exercising.' : index === 1 ? 'exercising at home or gym with headphones, watching content on a tablet device nearby. The scene shows someone doing light workout while engaging with content. The environment is bright and motivational with a clean, modern aesthetic.' : index === 2 ? 'driving a car while listening to audio content. The dashboard shows a connected smartphone playing content. The scene is from inside the vehicle with a clean, modern interior and a bright day visible through windows.' : 'doing household chores like cleaning or cooking while listening to content on wireless headphones. The home environment is bright, modern and clean. The person looks engaged with what they are listening to while completing their tasks.'}&width=300&height=200&seq=routine${index+1}&orientation=landscape`}
                                            alt={activity.title}
                                            className=""
                                        />
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6 flex-grow">
                                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                                        <i className={`${activity.icon} text-blue-600 text-xl`}></i>
                                    </div>
                                    <CardTitle className="text-xl mb-2">{activity.title}</CardTitle>
                                    <CardDescription className="text-gray-600">{activity.description}</CardDescription>
                                </CardContent>
                                <CardFooter>
                                    <Button variant="outline" className="w-full border-blue-600 text-blue-600 hover:bg-blue-50 !rounded-button whitespace-nowrap">
                                        <i className="fas fa-level-up-alt mr-2"></i> {t.routine.adaptButton}
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>
            {/* Features Section */}
            <section id="ozellikler" className="py-20 bg-gradient-to-b from-gray-50 to-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4 text-gray-900">{t.features.title}</h2>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-4">
                            {t.features.description}
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        {t.features.featuresList.map((feature, index) => (
                            <Card key={index} className="border-none shadow-lg overflow-hidden">
                                <div className="grid md:grid-cols-2 gap-0 h-full">
                                    <div className="order-2 md:order-1 p-6 flex flex-col justify-center">
                                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                                            <i className={`${feature.icon} text-blue-600 text-xl`}></i>
                                        </div>
                                        <CardTitle className="text-xl mb-2">{feature.title}</CardTitle>
                                        <CardDescription className="text-gray-600">{feature.description}</CardDescription>
                                    </div>
                                    <div className="order-1 md:order-2 h-48 md:h-full overflow-hidden feature-image">
                                        <img
                                            src={`https://readdy.ai/api/search-image?query=${index === 0 ? 'A collection of real-world media content displayed on various devices. The scene shows YouTube videos, podcasts, news articles, and social media content. The display is modern and clean with a soft blue background, emphasizing authentic learning materials.' : index === 1 ? 'A personalized user interface showing content recommendations based on interests and language level. The screen displays customization options and preference settings. The design is clean and modern with a soft blue background, conveying personalization.' : index === 2 ? 'A person relaxing with high-quality headphones, listening to content with visible subtitles on their device. The scene shows someone comfortably learning through listening. The environment is peaceful with a soft blue background.' : 'A split-screen showing a person engaged in daily activities while learning. The scene depicts someone multitasking - perhaps commuting, exercising, or doing chores while listening to content. The design is clean with a soft blue background.'}&width=500&height=300&seq=feature${index+1}&orientation=landscape`}
                                            alt={feature.title}
                                            className="w-full h-full object-cover object-center"
                                        />
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>
            {/* Testimonials Section */}
            <section id="yorumlar" className="py-20 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4 text-gray-900">{t.testimonials.title}</h2>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12">
                            {t.testimonials.description}
                        </p>
                    </div>
                    <Swiper
                        modules={[Pagination, Autoplay]}
                        pagination={{ clickable: true }}
                        autoplay={{ delay: 5000 }}
                        spaceBetween={30}
                        slidesPerView={1}
                        breakpoints={{
                            640: { slidesPerView: 2 },
                            1024: { slidesPerView: 3 }
                        }}
                        className="pb-12"
                    >
                        {t.testimonials.users.map((testimonial, index) => (
                            <SwiperSlide key={index}>
                                <Card className="h-full border-none shadow-lg">
                                    <CardContent className="p-8">
                                        <div className="flex items-center mb-6">
                                            <Avatar className="h-12 w-12 mr-4">
                                                <AvatarImage
                                                    src={`https://readdy.ai/api/search-image?query=Professional headshot of a ${index % 2 === 0 ? 'Turkish man' : 'Turkish woman'} ${index === 0 ? 'in his late 20s with short dark hair' : index === 1 ? 'in her mid 20s with long dark hair' : index === 2 ? 'middle-aged with glasses and a professional appearance' : index === 3 ? 'with a headscarf and a friendly smile' : 'in his 30s with a beard and professional appearance'} and a ${index === 3 ? 'warm' : 'friendly'} smile. The photo has a clean, neutral background and professional lighting, suitable for a testimonial or profile picture.&width=100&height=100&seq=user${index+1}&orientation=squarish`}
                                                    alt={testimonial.name}
                                                />
                                                <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <h4 className="font-bold">{testimonial.name}</h4>
                                                <p className="text-sm text-gray-500">{testimonial.level}</p>
                                            </div>
                                        </div>
                                        <p className="text-gray-700 italic">"{testimonial.quote}"</p>
                                        <div className="mt-4 flex">
                                            <i className="fas fa-star text-yellow-400"></i>
                                            <i className="fas fa-star text-yellow-400"></i>
                                            <i className="fas fa-star text-yellow-400"></i>
                                            <i className="fas fa-star text-yellow-400"></i>
                                            <i className="fas fa-star text-yellow-400"></i>
                                        </div>
                                    </CardContent>
                                </Card>
                            </SwiperSlide>
                        ))}
                    </Swiper>
                </div>
            </section>
            {/* Try It Now Section */}
            <section className="py-20 bg-gradient-to-b from-blue-50 to-white">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-xl overflow-hidden">
                        <div className="p-8 md:p-12">
                            <h2 className="text-3xl font-bold mb-6 text-center">{t.tryNow.title}</h2>
                            <div className="mb-8">
                                <div className="relative">
                                    <Input
                                        type="text"
                                        placeholder={t.tryNow.placeholder}
                                        className="w-full h-12 pl-12 pr-36 text-base border-2 border-gray-200 focus:border-blue-500 rounded-lg"
                                    />
                                    <i className="fas fa-link absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                                        <a href="/register">
                                            <Button
                                                className="h-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-md whitespace-nowrap px-5"
                                            >
                                                {t.tryNow.tryButton}
                                            </Button>
                                        </a>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mb-8">
                                {levels.map((lvl, index) => (
                                    <Button
                                        key={index}
                                        variant={index === level ? "default" : "outline"}
                                        className={`flex-grow justify-center !rounded-button whitespace-nowrap ${index === level ? 'bg-blue-600' : 'border-blue-200 text-blue-600'}`}
                                        onClick={() => setLevel(index)}
                                    >
                                        {lvl}
                                    </Button>
                                ))}
                            </div>
                            <p className="text-center text-gray-500">
                                {t.tryNow.description}
                            </p>
                        </div>
                    </div>
                </div>
            </section>
            {/* Extra CTA Section */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-3xl mx-auto">
                        <h2 className="text-4xl font-bold mb-6 text-gray-900">
                            {t.cta.title}
                        </h2>
                        <p className="text-xl text-gray-600 mb-8">
                            {t.cta.description}
                        </p>
                        <a href="/register">
                            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-lg py-6 px-8 !rounded-button whitespace-nowrap">
                                <i className="fas fa-rocket mr-2"></i> {t.cta.button}
                            </Button>
                        </a>
                        <div className="mt-8 flex justify-center items-center space-x-6">
                            {t.cta.benefits.map((benefit, index) => (
                                <div key={index} className="flex items-center">
                                    <i 
                                        className="fas fa-check-circle mr-2" 
                                        style={{ color: '#22c55e' }}
                                    ></i>
                                    <span className="text-gray-600">{benefit}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
            {/* Footer */}
            <footer className="bg-gray-900 text-white py-12">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <div className="flex items-center space-x-2 mb-6">
                                <i className="fas fa-language text-blue-400 text-3xl"></i>
                                <span className="text-2xl font-extrabold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-500 bg-clip-text text-transparent tracking-tight">LingRoot</span>
                            </div>
                            <p className="text-gray-400 mb-4">
                                {t.footer.slogan}
                            </p>
                            <div className="flex space-x-4">
                                <a href="https://facebook.com/lingroot" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer">
                                    <i className="fab fa-facebook-f text-xl"></i>
                                </a>
                                <a href="https://twitter.com/lingroot" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer">
                                    <i className="fab fa-twitter text-xl"></i>
                                </a>
                                <a href="https://instagram.com/lingroot" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer">
                                    <i className="fab fa-instagram text-xl"></i>
                                </a>
                                <a href="https://youtube.com/@lingroot" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer">
                                    <i className="fab fa-youtube text-xl"></i>
                                </a>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold mb-4">{t.footer.quickLinks.title}</h3>
                            <ul className="space-y-2">
                                <li><a href="/about" className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer">Hakkımızda</a></li>
                                <li><a href="/nasil-calisir" className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer">Nasıl Çalışır?</a></li>
                                <li><a href="/fiyatlandirma" className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer">Fiyatlandırma</a></li>
                                <li><a href="/blog" className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer">Blog</a></li>
                                <li><a href="/contact" className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer">İletişim</a></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold mb-4">{t.footer.legal.title}</h3>
                            <ul className="space-y-2">
                                <li><a href="/privacy-policy" className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer">Gizlilik Politikası</a></li>
                                <li><a href="/terms" className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer">Kullanım Şartları</a></li>
                                <li><a href="/cookie-policy" className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer">Çerez Politikası</a></li>
                                <li><a href="/kvkk" className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer">KVKK</a></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold mb-4">{t.footer.contact.title}</h3>
                            <ul className="space-y-2">
                                <li className="flex items-center">
                                    <i className="fas fa-envelope mr-2 text-gray-400"></i>
                                    <a href={`mailto:${t.footer.contact.email}`} className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer">{t.footer.contact.email}</a>
                                </li>
                                <li className="flex items-center">
                                    <i className="fas fa-phone-alt mr-2 text-gray-400"></i>
                                    <a href={`tel:${t.footer.contact.phone}`} className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer">{t.footer.contact.phone}</a>
                                </li>
                                <li className="flex items-start mt-4">
                                    <i className="fas fa-map-marker-alt mr-2 mt-1 text-gray-400"></i>
                                    <span className="text-gray-400">{t.footer.contact.address}</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
                        <p className="text-gray-400 text-sm mb-4 md:mb-0">
                            &copy; {new Date().getFullYear()} LingRoot. {t.footer.copyright}
                        </p>
                        <div className="flex space-x-4">
                            <i className="fab fa-cc-visa text-2xl text-gray-400"></i>
                            <i className="fab fa-cc-mastercard text-2xl text-gray-400"></i>
                            <i className="fab fa-cc-paypal text-2xl text-gray-400"></i>
                            <i className="fab fa-apple-pay text-2xl text-gray-400"></i>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default App;


