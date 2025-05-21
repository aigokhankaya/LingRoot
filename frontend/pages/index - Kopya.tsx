import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Footer from '../src/components/Footer';
import Head from 'next/head';

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

// Seviyelere göre video linkleri
const VIDEO_LINKS: { [key: string]: string } = {
  A1: "https://ffqfcmmbeeieouoghrac.supabase.co/storage/v1/object/public/videos//mainpage_a1.mp4",
  A2: "https://ffqfcmmbeeieouoghrac.supabase.co/storage/v1/object/public/videos//mainpage_a2.mp4",
  B1: "https://ffqfcmmbeeieouoghrac.supabase.co/storage/v1/object/public/videos//mainpage_b1.mp4",
  B2: "https://ffqfcmmbeeieouoghrac.supabase.co/storage/v1/object/public/videos//mainpage_b2.mp4",
  C1: "https://ffqfcmmbeeieouoghrac.supabase.co/storage/v1/object/public/videos//mainpage_c1.mp4",
  C2: "https://ffqfcmmbeeieouoghrac.supabase.co/storage/v1/object/public/videos//mainpage_c2.mp4",
};

export default function HomePage() {
  // Seçili seviye state'i
  const [selectedLevel, setSelectedLevel] = useState('A1');
  const [isVisible, setIsVisible] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    // Sayfa yüklendiğinde animasyonu etkinleştir
    setIsVisible(true);
    
    // Scroll event listener ekle
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white font-['Roboto',sans-serif]">
      <Head>
        <title>LingRoot - İngilizce öğrenmenin yeni yolu</title>
        <meta name="description" content="LingRoot ile içeriklerinizi kendi İngilizce seviyenize göre dinleyin. Etkili ve keyifli dil öğrenimi." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=Roboto:wght@400;500;700&family=Lato:wght@400;700&display=swap" rel="stylesheet" />
      </Head>
      
      {/* Header */}
      <header className="fixed w-full py-4 px-6 flex justify-between items-center z-50 bg-white border-b border-gray-100 shadow-sm">
        <Link href="/" className="flex items-center">
          <h1 className="text-2xl font-['Nunito',sans-serif] font-bold">
            <span className="text-[#28a745]">Ling</span>
            <span className="text-[#333333]">Root</span>
          </h1>
        </Link>
        
        {/* Navigation Menu - Right Side */}
        <div className="hidden md:flex items-center space-x-5">
          <Link href="/nasil-calisir" className="text-gray-700 hover:text-gray-900 font-medium">
            Nasıl Çalışır?
          </Link>
          <Link href="/ozellikler" className="text-gray-700 hover:text-gray-900 font-medium">
            Özellikler
          </Link>
          <Link href="/fiyatlandirma" className="text-gray-700 hover:text-gray-900 font-medium">
            Fiyatlandırma
          </Link>
          <Link href="/login" className="text-gray-700 hover:text-gray-900 font-medium">
            Giriş Yap
          </Link>
          <Link href="/register" className="ml-2 px-4 py-2 bg-[#28a745] text-white rounded font-medium hover:bg-[#218838] transition-colors">
            Kayıt Ol
          </Link>
        </div>
        
        {/* Mobile Menu Toggle */}
        <div className="md:hidden">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
            className="text-gray-700 hover:text-gray-900 focus:outline-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-white z-40 pt-20 px-6 md:hidden">
          <nav className="flex flex-col space-y-6 py-8 font-['Nunito',sans-serif]">
            <Link href="/nasil-calisir" className="text-lg font-medium text-gray-700 hover:text-[#28a745]" onClick={() => setIsMenuOpen(false)}>
              Nasıl Çalışır?
            </Link>
            <Link href="/ozellikler" className="text-lg font-medium text-gray-700 hover:text-[#28a745]" onClick={() => setIsMenuOpen(false)}>
              Özellikler
            </Link>
            <Link href="/fiyatlandirma" className="text-lg font-medium text-gray-700 hover:text-[#28a745]" onClick={() => setIsMenuOpen(false)}>
              Fiyatlandırma
            </Link>
            <hr className="border-gray-200" />
            <div className="flex flex-col space-y-4">
              <Link href="/login" className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded text-center font-medium hover:bg-gray-50" onClick={() => setIsMenuOpen(false)}>
                Giriş Yap
              </Link>
              <Link href="/register" className="px-5 py-2.5 bg-[#28a745] text-white rounded text-center font-medium hover:bg-[#218838]" onClick={() => setIsMenuOpen(false)}>
                Kayıt Ol
              </Link>
            </div>
          </nav>
        </div>
      )}

      <main className="flex-grow pt-16">
        {/* Hero Section */}
        <section className="py-16 bg-[#f1f9ee] min-h-[calc(100vh-4rem)]">
          <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column: Text and CTA */}
            <div className="text-left">
              <h1 className="text-4xl font-['Nunito',sans-serif] font-bold text-[#333333] leading-tight mb-4">
                Tek Video, 6 Farklı Seviye: İngilizceyi Kendi Hızınızda Deneyimleyin!
              </h1>
              <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                LingRoot ile aynı ilgi çekici videoyu izleyin, seslendirme ve altyazıları A1'den C2'ye kadar kendi İngilizce seviyenize göre anında değiştirin. Dinleyerek ve izleyerek öğrenmenin en etkili yolu!
              </p>
              <Link href="/register" className="inline-block px-6 py-3 bg-[#fd7e14] text-white rounded shadow-sm font-medium hover:bg-[#e76b02] transition-colors">
                Hemen Ücretsiz Deneyin!
              </Link>
            </div>
            
            {/* Right Column: Video Player */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="aspect-video bg-black rounded overflow-hidden mb-4">
                {VIDEO_LINKS[selectedLevel] ? (
                  <video 
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                    key={selectedLevel}
                  >
                    <source src={VIDEO_LINKS[selectedLevel]} type="video/mp4" />
                    Tarayıcınız video oynatmayı desteklemiyor.
                  </video>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white">
                    Örnek Video Alanı
                  </div>
                )}
              </div>
              <p className="text-center font-medium mb-4">
                İzlediğiniz videonun seslendirmesini ve altyazısını değiştirmek için seviyenizi seçin:
              </p>
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {LEVELS.map(level => (
                  <button
                    key={level}
                    onClick={() => setSelectedLevel(level)}
                    className={`px-4 py-2 rounded font-medium ${
                      selectedLevel === level
                        ? "bg-[#28a745] text-white"
                        : "bg-white text-gray-700 border border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <div className="bg-gray-100 p-4 rounded text-gray-700 text-sm">
                <p className="italic">
                  Seçilen seviyeye göre altyazı burada görünecektir... (Örn: {selectedLevel} Seviyesi Altyazı)
                </p>
              </div>
              <div className="mt-4 text-sm text-gray-600">
                <p>Açıklama: Yukarıdaki video oynatıcı sabit kalacaktır. Seviye butonlarına tıkladığında, videonun sesi ve altyazıları seçilen İngilizce seviyesine göre anında güncellenecektir.</p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="py-16 px-4 bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 gradient-text">LingRoot <span className="text-gray-800">Nasıl Çalışır?</span></h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">Sadece üç basit adımda, sevdiğiniz içerikleri kendi İngilizce seviyenize uygun hale getirin.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Connecting line in the background */}
              <div className="hidden md:block absolute top-1/2 left-0 w-full h-1 bg-blue-200 -z-10 transform -translate-y-1/2"></div>
              
              <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 relative hover-lift hover:border-blue-200">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-2xl absolute -top-6 left-1/2 transform -translate-x-1/2 shadow-md">1</div>
                <div className="mt-8 text-center">
                  <div className="mb-4 flex justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-blue-700 mb-3">İçeriğinizi Yükleyin</h3>
                  <p className="text-gray-600">Sevdiğiniz YouTube videosunu, Spotify podcast'ini veya metni platforma aktarın ve öğrenmeye hazırlanın.</p>
                </div>
              </div>
              
              <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 relative hover-lift hover:border-blue-200">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-2xl absolute -top-6 left-1/2 transform -translate-x-1/2 shadow-md">2</div>
                <div className="mt-8 text-center">
                  <div className="mb-4 flex justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-blue-700 mb-3">Seviyenizi Seçin</h3>
                  <p className="text-gray-600">A1'den C2'ye kadar olan İngilizce seviyelerinden kendinize en uygun olanı belirleyin.</p>
                </div>
              </div>
              
              <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 relative hover-lift hover:border-blue-200">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-2xl absolute -top-6 left-1/2 transform -translate-x-1/2 shadow-md">3</div>
                <div className="mt-8 text-center">
                  <div className="mb-4 flex justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-blue-700 mb-3">Öğrenmeye Başlayın!</h3>
                  <p className="text-gray-600">LingRoot, içeriği anında seviyenize uyarlar. Farklı seviyelerde dinleyin ve İngilizcenizi hızla geliştirin!</p>
                </div>
              </div>
            </div>
            
            <div className="mt-16 text-center">
              <Link href="/register" className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-all duration-300 hover:shadow-lg">
                <span>Şimdi Deneyin</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-16 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">Benzersiz Deneyim</span>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 mt-2 gradient-text">Neden <span className="text-gray-800">LingRoot?</span></h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">Benzersiz özelliklerimizle İngilizce öğrenme deneyiminizi tamamen değiştiriyoruz.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-white p-6 md:p-8 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-blue-200 group hover:-translate-y-1">
                <div className="mb-6 bg-blue-100 text-blue-700 rounded-lg w-14 h-14 flex items-center justify-center group-hover:bg-blue-700 group-hover:text-white transition-colors duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-blue-700">Kişiselleştirilmiş Öğrenme</h3>
                <p className="text-gray-600">Her içerik, sizin seviyenize ve ilgi alanlarınıza göre özel olarak uyarlanır. Kendi hızınızda ve tarzınızda öğrenin.</p>
              </div>
              
              <div className="bg-white p-6 md:p-8 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-blue-200 group hover:-translate-y-1">
                <div className="mb-6 bg-blue-100 text-blue-700 rounded-lg w-14 h-14 flex items-center justify-center group-hover:bg-blue-700 group-hover:text-white transition-colors duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-blue-700">Telaffuz Pratiği</h3>
                <p className="text-gray-600">Gelişmiş yapay zeka ile konuşma becerilerinizi ve telaffuzunuzu interaktif alıştırmalarla mükemmelleştirin.</p>
              </div>
              
              <div className="bg-white p-6 md:p-8 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-blue-200 group hover:-translate-y-1">
                <div className="mb-6 bg-blue-100 text-blue-700 rounded-lg w-14 h-14 flex items-center justify-center group-hover:bg-blue-700 group-hover:text-white transition-colors duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-blue-700">Geniş Kelime Havuzu</h3>
                <p className="text-gray-600">Karşılaştığınız yeni kelimeleri kolayca öğrenin, hafızanızda kalıcı hale getirin ve aktif kelime dağarcığınızı genişletin.</p>
              </div>
              
              <div className="bg-white p-6 md:p-8 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-blue-200 group hover:-translate-y-1">
                <div className="mb-6 bg-blue-100 text-blue-700 rounded-lg w-14 h-14 flex items-center justify-center group-hover:bg-blue-700 group-hover:text-white transition-colors duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-blue-700">Gerçek Dünya İçerikleri</h3>
                <p className="text-gray-600">Sıkıcı ders kitapları yerine, sevdiğiniz videoları, podcast'leri ve gerçek hayattan içerikleri kullanarak öğrenin.</p>
              </div>
              
              <div className="bg-white p-6 md:p-8 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-blue-200 group hover:-translate-y-1">
                <div className="mb-6 bg-blue-100 text-blue-700 rounded-lg w-14 h-14 flex items-center justify-center group-hover:bg-blue-700 group-hover:text-white transition-colors duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-blue-700">İlerleme Takibi</h3>
                <p className="text-gray-600">Gelişiminizi adım adım takip edin, analizlerinizi görüntüleyin ve motivasyonunuzu her zaman yüksek tutun.</p>
              </div>
              
              <div className="bg-white p-6 md:p-8 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-blue-200 group hover:-translate-y-1">
                <div className="mb-6 bg-blue-100 text-blue-700 rounded-lg w-14 h-14 flex items-center justify-center group-hover:bg-blue-700 group-hover:text-white transition-colors duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-blue-700">Esnek ve Erişilebilir</h3>
                <p className="text-gray-600">İstediğiniz zaman, istediğiniz yerden öğrenme özgürlüğünün tadını çıkarın. Günlük programınıza göre esnek öğrenme.</p>
              </div>
            </div>
            
            <div className="mt-16 bg-blue-50 rounded-xl p-8 border border-blue-100 shadow-md">
              <div className="flex flex-col md:flex-row items-center">
                <div className="md:w-2/3 mb-6 md:mb-0 md:pr-8">
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">Tüm özellikleri keşfetmeye hazır mısınız?</h3>
                  <p className="text-gray-600 mb-6">LingRoot ile İngilizce öğrenmenin keyifli ve etkili yolunu deneyimleyin. Ücretsiz hesabınızı oluşturun ve hemen başlayın.</p>
                  <Link href="/register" className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-all duration-300 hover:shadow-lg">
                    <span>Ücretsiz Hesap Oluştur</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                </div>
                <div className="md:w-1/3 flex justify-center">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-white border-4 border-blue-200 flex items-center justify-center shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 md:h-20 md:w-20 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section id="testimonials" className="py-16 px-4 bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">Başarı Hikayeleri</span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 mt-2 gradient-text">Kullanıcılarımız <span className="text-gray-800">Ne Diyor?</span></h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">Binlerce kullanıcımız LingRoot ile İngilizce öğrenme deneyimlerini paylaşıyor.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="testimonial-card relative">
                <div className="absolute -top-5 -left-5 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                </div>
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white font-bold shadow-md">AK</div>
                  <div className="ml-4">
                    <h4 className="font-bold text-lg">Ayşe K.</h4>
                    <div className="flex text-yellow-400">
                      <span>★★★★★</span>
                    </div>
                  </div>
                </div>
                <p className="italic text-gray-600 mb-4">"LingRoot sayesinde daha önce anlamakta zorlandığım videoları bile kendi seviyemde izleyebiliyorum. Aynı içeriği farklı seviyelerde dinlemek inanılmaz faydalı! Kelime dağarcığım ve anlama becerilerim çok gelişti."</p>
                <div className="text-sm text-gray-500 mt-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>6 aydır kullanıyor</span>
                </div>
              </div>
              
              <div className="testimonial-card relative">
                <div className="absolute -top-5 -left-5 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                </div>
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white font-bold shadow-md">MY</div>
                  <div className="ml-4">
                    <h4 className="font-bold text-lg">Mehmet Y.</h4>
                    <div className="flex text-yellow-400">
                      <span>★★★★★</span>
                    </div>
                  </div>
                </div>
                <p className="italic text-gray-600 mb-4">"İngilizce öğrenmek hiç bu kadar keyifli olmamıştı. Özellikle 6 seviyeli video özelliği harika bir fikir. İş seyahatlerimde artık çok daha rahat iletişim kurabiliyorum. Kesinlikle tavsiye ederim."</p>
                <div className="text-sm text-gray-500 mt-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>1 yıldır kullanıyor</span>
                </div>
              </div>
              
              <div className="testimonial-card relative">
                <div className="absolute -top-5 -left-5 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                </div>
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white font-bold shadow-md">CB</div>
                  <div className="ml-4">
                    <h4 className="font-bold text-lg">Can B.</h4>
                    <div className="flex text-yellow-400">
                      <span>★★★★★</span>
                    </div>
                  </div>
                </div>
                <p className="italic text-gray-600 mb-4">"Sevdiğim YouTube kanallarını artık İngilizce öğrenmek için kullanabiliyorum. LingRoot ile öğrenmek çok daha eğlenceli ve etkili hale geldi. Eğlenceli öğrenme yöntemi sayesinde motivasyonum hiç düşmüyor."</p>
                <div className="text-sm text-gray-500 mt-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>3 aydır kullanıyor</span>
                </div>
              </div>
            </div>
            
            {/* Stats */}
            <div className="mt-16 bg-white rounded-xl shadow-lg border border-gray-200 p-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                <div className="flex flex-col items-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">2,500+</div>
                  <div className="text-gray-600">Aktif Kullanıcı</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">15,000+</div>
                  <div className="text-gray-600">İşlenen İçerik</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">97%</div>
                  <div className="text-gray-600">Memnuniyet Oranı</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">6</div>
                  <div className="text-gray-600">Farklı Seviye</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="md:w-2/3">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">İngilizce Öğrenme <span className="text-blue-200">Yolculuğunuza</span> Bugün Başlayın!</h2>
                <p className="text-xl mb-8 opacity-90 max-w-2xl">LingRoot'un benzersiz AI ile güçlendirilmiş özelliklerini keşfedin ve İngilizce hedeflerinize daha hızlı ulaşın.</p>
                <div className="flex flex-wrap gap-4">
                  <Link href="/register" className="px-8 py-4 bg-white text-blue-700 rounded-lg font-bold text-lg hover:bg-blue-50 transition-colors transform hover:-translate-y-1 hover:shadow-lg inline-flex items-center shadow-md duration-300">
                    <span>Hemen Ücretsiz Deneyin!</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                  <Link href="/login" className="px-8 py-4 border-2 border-white text-white rounded-lg font-bold text-lg hover:bg-white hover:text-blue-700 transition-colors inline-flex items-center duration-300">
                    <span>Giriş Yap</span>
                  </Link>
                </div>
                
                <div className="mt-8 flex items-center space-x-4">
                  <div className="flex -space-x-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-10 h-10 rounded-full bg-white border-2 border-blue-600 flex items-center justify-center text-blue-700 text-xs font-bold shadow-md">
                        {['A', 'B', 'C', 'D', 'E'][i]}
                      </div>
                    ))}
                  </div>
                  <div className="text-blue-100">
                    <span className="font-bold text-white">1,000+</span> kişi bu hafta katıldı
                  </div>
                </div>
              </div>
              <div className="md:w-1/3 flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500 rounded-full opacity-20 blur-3xl transform scale-125"></div>
                  <div className="relative bg-white bg-opacity-10 backdrop-filter backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white border-opacity-20">
                    <div className="w-64 h-64 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <h3 className="text-xl font-bold mb-2">6 Farklı Seviyede</h3>
                      <p className="text-blue-100">A1'den C2'ye kadar tüm içerikler</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-4 text-gray-800">Eğitimde Yeni Bir Çağ Başlatıyoruz</h3>
              <p className="text-lg text-gray-600 mb-8 max-w-3xl mx-auto">
                Yapay zeka ve dil öğrenimi teknolojilerini birleştirerek, her seviyede, kişiselleştirilmiş bir öğrenme deneyimi sunuyoruz.
              </p>
              <div className="flex justify-center space-x-8">
                <img src="/partner-logo-1.svg" alt="Partner 1" className="h-12 w-auto grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-300" />
                <img src="/partner-logo-2.svg" alt="Partner 2" className="h-12 w-auto grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-300" />
                <img src="/partner-logo-3.svg" alt="Partner 3" className="h-12 w-auto grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-300" />
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </main>
    </div>
  );
}
