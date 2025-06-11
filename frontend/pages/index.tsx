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
import InputMask from 'react-input-mask'; // Telefon numarası için eklendi
import '@fortawesome/fontawesome-free/css/all.min.css';


import { useAuth } from '../src/lib/auth';
import { getApiUrl } from "../src/lib/api";
import dynamic from 'next/dynamic';
// import Lottie from "lottie-react"; // Kaldırılacak
import learnAnimation from "../public/animations/language-learn.json";
import InputMask from 'react-input-mask';
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

    // --- ESKİ MANTIKTAN ENTEGRE EDİLEN HOOK'LAR VE STATE'LER ---
  const router = useRouter();
  const { login, isAuthenticated, register } = useAuth();
    const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

    // --- FORM STATE'LERİ (KONTROLLÜ BİLEŞENLER İÇİN) ---
    const [loginForm, setLoginForm] = useState({ email: '', password: '' });
    const [registerForm, setRegisterForm] = useState({
        firstName: '',
        lastName: '',
    email: '',
        phoneNumber: '',
    password: ''
  });

  const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];

    // Kullanıcı zaten giriş yapmışsa welcome sayfasına yönlendir (Eski mantıktan)
  React.useEffect(() => {
    if (isAuthenticated) {
      router.push('/welcome');
    }
  }, [isAuthenticated, router]);

    // Form input değişikliklerini yöneten fonksiyonlar
    const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
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
            const result = await login(loginForm.email, loginForm.password);
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
            register: { // KAYIT MODALI İÇİN YENİ ÇEVİRİLER
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
            // ... Diğer tüm çeviriler yeni tasarımdaki gibi buraya eklenecek ...
            // (Kısalık için diğer kısımları kestim, yeni kodunuzdaki tam çeviri objesini buraya yapıştırın)
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
        en: { // İngilizce çevirileri de buraya tam olarak ekleyin
             nav: { howItWorks: "How It Works", features: "Features", testimonials: "Testimonials", blog: "Blog", login: "Login", signup: "Sign Up Free" },
             login: { title: "Login", description: "Sign in to your LingRoot account", emailLabel: "Email or Username", emailPlaceholder: "example@email.com", passwordLabel: "Password", forgotPassword: "Forgot Password", loginButton: "Login", loadingButton: "Logging in...", or: "or", googleLogin: "Login with Google", facebookLogin: "Login with Facebook", appleLogin: "Login with Apple", noAccount: "Don't have an account?", signupLink: "Sign Up Free" },
             register: { title: "Create a Free Account", description: "Join the LingRoot world and start learning right away.", fullNameLabel: "Full Name", fullNamePlaceholder: "Your Full Name", emailLabel: "Email", emailPlaceholder: "example@email.com", phoneLabel: "Phone Number", passwordLabel: "Password", registerButton: "Create Account", loadingButton: "Creating Account...", hasAccount: "Already have an account?", loginLink: "Login" },
             hero: { badge: "Don't Change Your Life, Improve Your English", title: "Content You Love, ", titleHighlight: "In English You Understand", description: "LingRoot automatically simplifies, narrates, and adds subtitles to the content you already follow—YouTube videos, podcasts, blog posts—according to your chosen English level (A1–C2). You don't need to change your life to learn English—just keep listening.", tryButton: "Try It Free Now", watchButton: "Watch How It Works" },
             // ... diğer ingilizce çeviriler
        }
    };
    const t = translations[language];

  return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
            {/* Navigation */}
            <nav className="bg-white shadow-sm py-3 sticky top-0 z-50">
                <div className="container mx-auto px-4 flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <i className="fas fa-language text-blue-600 text-2xl"></i>
                        <span className="text-xl font-bold text-blue-600">LingRoot</span>
                    </div>
                    <div className="hidden md:flex items-center space-x-6">
                        <a href="#nasil-calisir" className="text-gray-600 hover:text-blue-600 transition-colors duration-200 cursor-pointer">{t.nav.howItWorks}</a>
                        <a href="#ozellikler" className="text-gray-600 hover:text-blue-600 transition-colors duration-200 cursor-pointer">{t.nav.features}</a>
                        <a href="#yorumlar" className="text-gray-600 hover:text-blue-600 transition-colors duration-200 cursor-pointer">{t.nav.testimonials}</a>
                        <a href="#blog" className="text-gray-600 hover:text-blue-600 transition-colors duration-200 cursor-pointer">{t.nav.blog}</a>
          </div>
          <div className="flex items-center space-x-4">
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
                                    {error && <p className="text-sm text-red-500 text-center">{error}</p>} {/* Hata Mesajı */}
                                    <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white !rounded-button" disabled={loading}>
                                        {loading ? t.login.loadingButton : t.login.loginButton}
            </Button>
                                     {/* ... sosyal medya login butonları ... */}
                                </form>
                            </DialogContent>
                        </Dialog>

                        {/* KAYIT OL MODALI */}
                        <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white !rounded-button whitespace-nowrap">{t.nav.signup}</Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-bold text-center mb-2">{t.register.title}</DialogTitle>
                                    <DialogDescription className="text-center">{t.register.description}</DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="fullName">{t.register.fullNameLabel}</Label>
                                        <Input id="fullName" name="fullName" placeholder={t.register.fullNamePlaceholder} onChange={handleRegisterChange} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="register-email">{t.register.emailLabel}</Label>
                                        <Input id="register-email" name="email" type="email" placeholder={t.register.emailPlaceholder} value={registerForm.email} onChange={handleRegisterChange} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phoneNumber">{t.register.phoneLabel}</Label>
                                        <InputMask mask="+90 (999) 999 99 99" value={registerForm.phoneNumber} onChange={handleRegisterChange}>
                                            {(inputProps: any) => <Input {...inputProps} id="phoneNumber" name="phoneNumber" />}
                                        </InputMask>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="register-password">{t.register.passwordLabel}</Label>
                                        <Input id="register-password" name="password" type="password" value={registerForm.password} onChange={handleRegisterChange} required />
                                    </div>
                                    {error && <p className="text-sm text-red-500 text-center">{error}</p>} {/* Hata Mesajı */}
                                    <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white !rounded-button" disabled={loading}>
                                        {loading ? t.register.loadingButton : t.register.registerButton}
            </Button>
                                </form>
                            </DialogContent>
                        </Dialog>
          </div>
        </div>
            </nav>
            
      {/* Hero Section */}
      <section className="relative overflow-hidden">
  <div className="absolute inset-0 z-0"> 
    <img 
      src="https://readdy.ai/api/search-image?query=A%20modern%2C%20clean%2C%20minimalist%20scene%20showing%20a%20person%20relaxing%20with%20headphones%2C%20listening%20to%20content%20on%20their%20device.%20The%20background%20is%20a%20soft%20gradient%20from%20light%20blue%20to%20white%2C%20creating%20a%20calm%20and%20peaceful%20atmosphere.%20The%20scene%20suggests%20learning%20without%20effort%2C%20with%20subtle%20educational%20elements%20in%20the%20background.&width=1440&height=700&seq=hero1&orientation=landscape" 
      alt="Hero Background" 
      className="object-contain"
      style={{ 
        width: '1440px',
        height: '700px',
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      }}
    /> 
  </div>
<div className="container mx-auto px-4 py-12 md:py-20 relative z-10">
<div className="max-w-3xl">
<Badge className="mb-3 md:mb-4 bg-blue-100 text-blue-800 hover:bg-blue-200 border-none text-sm">{t.hero.badge}</Badge>
<h1 className="text-3xl md:text-6xl font-bold mb-4 md:mb-6 text-black">
{t.hero.title}<span className="text-blue-600">{t.hero.titleHighlight}</span>
</h1>
<p className="text-lg md:text-xl text-black mb-8 md:mb-10">
{t.hero.description}
</p>
<div className="flex flex-col sm:flex-row gap-3 md:gap-4">
<a href="https://readdy.ai/home/11d28807-c376-4c34-ad7f-2622a9d675a0/9ca9e5ea-13a7-4fff-a0f6-eff90c6a2ed3" data-readdy="true">
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
<div className="container mx-auto px-4">
          <div className="text-center mb-16">
<h2 className="text-4xl font-bold mb-4 text-gray-900">{t.demo.title}</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto whitespace-nowrap" >
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
<Button className="mt-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white !rounded-button whitespace-nowrap">
{t.demo.tryYourContent}
</Button>
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
<Tabs defaultValue="A1" className="w-full mb-12">
  <TabsList className="flex w-full">
    <TabsTrigger value="A1" className="text-lg font-medium flex-1 data-[state=active]:border-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:font-bold transition-all rounded-md">A1</TabsTrigger>
    <TabsTrigger value="A2" className="text-lg font-medium flex-1 data-[state=active]:border-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:font-bold transition-all rounded-md">A2</TabsTrigger>
    <TabsTrigger value="B1" className="text-lg font-medium flex-1 data-[state=active]:border-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:font-bold transition-all rounded-md">B1</TabsTrigger>
    <TabsTrigger value="B2" className="text-lg font-medium flex-1 data-[state=active]:border-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:font-bold transition-all rounded-md">B2</TabsTrigger>
    <TabsTrigger value="C1" className="text-lg font-medium flex-1 data-[state=active]:border-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:font-bold transition-all rounded-md">C1</TabsTrigger>
    <TabsTrigger value="C2" className="text-lg font-medium flex-1 data-[state=active]:border-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:font-bold transition-all rounded-md">C2</TabsTrigger>
  </TabsList>
  <TabsContent value="A1" className="mt-4">
    <div className="relative aspect-video w-full overflow-hidden rounded-lg shadow-lg">
      <iframe
        src="https://www.youtube.com/embed/video-a1"
        className="absolute inset-0 h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen>
      </iframe>
    </div>
  </TabsContent>
  <TabsContent value="A2" className="mt-4">
    <div className="relative aspect-video w-full overflow-hidden rounded-lg shadow-lg">
      <iframe
        src="https://www.youtube.com/embed/video-a2"
        className="absolute inset-0 h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen>
      </iframe>
    </div>
  </TabsContent>
  <TabsContent value="B1" className="mt-4">
    <div className="relative aspect-video w-full overflow-hidden rounded-lg shadow-lg">
      <iframe
        src="https://www.youtube.com/embed/video-b1"
        className="absolute inset-0 h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen>
      </iframe>
    </div>
  </TabsContent>
  <TabsContent value="B2" className="mt-4">
    <div className="relative aspect-video w-full overflow-hidden rounded-lg shadow-lg">
      <iframe
        src="https://www.youtube.com/embed/video-b2"
        className="absolute inset-0 h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen>
      </iframe>
    </div>
  </TabsContent>
  <TabsContent value="C1" className="mt-4">
    <div className="relative aspect-video w-full overflow-hidden rounded-lg shadow-lg">
      <iframe
        src="https://www.youtube.com/embed/video-c1"
        className="absolute inset-0 h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen>
      </iframe>
    </div>
  </TabsContent>
  <TabsContent value="C2" className="mt-4">
    <div className="relative aspect-video w-full overflow-hidden rounded-lg shadow-lg">
      <iframe
        src="https://www.youtube.com/embed/video-c2"
        className="absolute inset-0 h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen>
      </iframe>
    </div>
  </TabsContent>
</Tabs>
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
<Card key={index} className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
<CardHeader className="pb-0">
<div className="w-full h-48 overflow-hidden rounded-t-lg">
<img
src={`https://readdy.ai/api/search-image?query=A person ${index === 0 ? 'selecting content on their device, with multiple media platforms visible on screen. The scene shows YouTube videos, Spotify podcasts, and news articles. Clean, modern interface with a soft blue background and minimalist design.' : index === 1 ? 'close-up of a language level selector interface showing levels from A1 to C2. The design is clean and modern with a soft blue background. The interface shows a slider or dropdown menu being adjusted by a finger, representing language level selection.' : 'relaxing with headphones, enjoying content on their device. The screen shows subtitles in English with a clean interface. The background is a soft blue gradient, and the scene conveys effortless learning through listening.'}&width=400&height=300&seq=step${index+1}&orientation=landscape`}
alt={step.title}
className="w-full h-full object-cover object-top"
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
<p className="text-xl text-gray-600 max-w-3xl mx-auto whitespace-nowrap mb-12">
{t.routine.description}
</p>
</div>
<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
{t.routine.activities.map((activity, index) => (
<Card key={index} className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
<CardHeader className="pb-0">
<div className="w-full h-40 overflow-hidden rounded-t-lg">
<img
src={`https://readdy.ai/api/search-image?query=A person ${index === 0 ? 'walking in a park with headphones, listening to content on their smartphone. The scene has a bright, airy feel with trees and a path. The person looks relaxed and engaged with what they are listening to, suggesting learning while exercising.' : index === 1 ? 'exercising at home or gym with headphones, watching content on a tablet device nearby. The scene shows someone doing light workout while engaging with content. The environment is bright and motivational with a clean, modern aesthetic.' : index === 2 ? 'driving a car while listening to audio content. The dashboard shows a connected smartphone playing content. The scene is from inside the vehicle with a clean, modern interior and a bright day visible through windows.' : 'doing household chores like cleaning or cooking while listening to content on wireless headphones. The home environment is bright, modern and clean. The person looks engaged with what they are listening to while completing their tasks.'}&width=300&height=200&seq=routine${index+1}&orientation=landscape`}
alt={activity.title}
className="w-full h-full object-cover object-top"
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
<div className="order-1 md:order-2 h-48 md:h-full overflow-hidden">
<img
src={`https://readdy.ai/api/search-image?query=${index === 0 ? 'A collection of real-world media content displayed on various devices. The scene shows YouTube videos, podcasts, news articles, and social media content. The display is modern and clean with a soft blue background, emphasizing authentic learning materials.' : index === 1 ? 'A personalized user interface showing content recommendations based on interests and language level. The screen displays customization options and preference settings. The design is clean and modern with a soft blue background, conveying personalization.' : index === 2 ? 'A person relaxing with high-quality headphones, listening to content with visible subtitles on their device. The scene shows someone comfortably learning through listening. The environment is peaceful with a soft blue background.' : 'A split-screen showing a person engaged in daily activities while learning. The scene depicts someone multitasking - perhaps commuting, exercising, or doing chores while listening to content. The design is clean with a soft blue background.'}&width=500&height=300&seq=feature${index+1}&orientation=landscape`}
alt={feature.title}
className="w-full h-full object-cover object-top"
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
        <Button

            className="h-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-md whitespace-nowrap px-5"
        >
            {t.tryNow.tryButton}
        </Button>
    </div>
</div>


            </div>
<div className="flex items-center gap-2 mb-8">
{levels.map((lvl, index) => (
    <Button
        key={index}
        variant={index === level ? "default" : "outline"}
        // EN ÖNEMLİ KISIM: Butonun büyümesini ve metni ortalamasını sağlayan sınıflar
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
<Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-lg py-6 px-8 !rounded-button whitespace-nowrap">
<i className="fas fa-rocket mr-2"></i> {t.cta.button}
</Button>
<div className="mt-8 flex justify-center items-center space-x-6">
{t.cta.benefits.map((benefit, index) => (
<div key={index} className="flex items-center">
<i 
                className="fas fa-check-circle mr-2" 
                style={{ color: '#22c55e' }} // <-- BU SATIRI EKLEYİN
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
<span className="text-2xl font-bold">LingRoot</span>
</div>
<p className="text-gray-400 mb-4">
{t.footer.slogan}
</p>
<div className="flex space-x-4">
<a href="#" className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer">
<i className="fab fa-facebook-f text-xl"></i>
</a>
<a href="#" className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer">
<i className="fab fa-twitter text-xl"></i>
</a>
<a href="#" className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer">
<i className="fab fa-instagram text-xl"></i>
</a>
<a href="#" className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer">
<i className="fab fa-youtube text-xl"></i>
</a>
</div>
</div>
<div>
<h3 className="text-lg font-bold mb-4">{t.footer.quickLinks.title}</h3>
<ul className="space-y-2">
{t.footer.quickLinks.links.map((link, index) => (
<li key={index}><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer">{link}</a></li>
))}
</ul>
</div>
<div>
<h3 className="text-lg font-bold mb-4">{t.footer.legal.title}</h3>
<ul className="space-y-2">
{t.footer.legal.links.map((link, index) => (
<li key={index}><a href="#" className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer">{link}</a></li>
))}
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