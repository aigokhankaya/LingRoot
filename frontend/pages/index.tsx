import React, { useState } from 'react';
import Link from 'next/link';

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

// Seviyelere göre video linkleri
const VIDEO_LINKS: { [key: string]: string } = {
  A1: "https://ffqfcmmbeeieouoghrac.supabase.co/storage/v1/object/public/videos//mainpage_a1.mp4",
  A2: "https://ffqfcmmbeeieouoghrac.supabase.co/storage/v1/object/public/videos//mainpage_a2.mp4",
  B1: "https://ffqfcmmbeeieouoghrac.supabase.co/storage/v1/object/public/videos//mainpage_b1.mp4",
  C2: "https://ffqfcmmbeeieouoghrac.supabase.co/storage/v1/object/public/videos//mainpage_c2.mp4",
};

export default function HomePage() {
  // Seçili seviye state'i
  const [selectedLevel, setSelectedLevel] = useState('A1');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="bg-white text-[#333] min-h-screen">
      {/* Header */}
      <header className="w-full bg-white flex items-center justify-between border-b border-[#eaf7ef] sticky top-0 z-50 shadow-sm" style={{ minHeight: 70, padding: '0 40px' }}>
        <div className="flex items-center">
          <Link href="/" className="flex items-center">
            <img 
              src="/lingroot_logo.png" 
              alt="LingRoot Logo" 
              className="h-12 w-auto"
            />
          </Link>
        </div>
        
        {/* Mobile menu button */}
        <button 
          className="md:hidden flex items-center" 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center flex-1 justify-end">
          <nav className="flex items-center gap-6 text-base font-medium text-gray-700">
            <Link href="#how-it-works" className="hover:text-[#A7C7E7] transition-colors">Nasıl Çalışır?</Link>
            <Link href="#features" className="hover:text-[#A7C7E7] transition-colors">Özellikler</Link>
            <Link href="#testimonials" className="hover:text-[#A7C7E7] transition-colors">Kullanıcı Yorumları</Link>
            <Link href="#pricing" className="hover:text-[#A7C7E7] transition-colors">Fiyatlandırma</Link>
            <Link href="/login" className="hover:text-[#A7C7E7] transition-colors px-4 py-2 border border-[#A7C7E7] rounded-xl">Giriş Yap</Link>
            <Link href="/register" className="bg-[#A7C7E7] hover:bg-[#86b3de] text-white px-4 py-2 rounded-xl transition-colors">Kayıt Ol</Link>
          </nav>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white w-full py-4 px-6 shadow-md">
          <nav className="flex flex-col space-y-4">
            <Link href="#how-it-works" className="text-gray-700 hover:text-[#A7C7E7] transition-colors" onClick={() => setIsMenuOpen(false)}>Nasıl Çalışır?</Link>
            <Link href="#features" className="text-gray-700 hover:text-[#A7C7E7] transition-colors" onClick={() => setIsMenuOpen(false)}>Özellikler</Link>
            <Link href="#testimonials" className="text-gray-700 hover:text-[#A7C7E7] transition-colors" onClick={() => setIsMenuOpen(false)}>Kullanıcı Yorumları</Link>
            <Link href="#pricing" className="text-gray-700 hover:text-[#A7C7E7] transition-colors" onClick={() => setIsMenuOpen(false)}>Fiyatlandırma</Link>
            <Link href="/login" className="text-gray-700 hover:text-[#A7C7E7] transition-colors" onClick={() => setIsMenuOpen(false)}>Giriş Yap</Link>
            <Link href="/register" className="bg-[#A7C7E7] hover:bg-[#86b3de] text-white px-4 py-2 rounded-xl transition-colors inline-block" onClick={() => setIsMenuOpen(false)}>Kayıt Ol</Link>
          </nav>
        </div>
      )}

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#f8f9fa] to-white py-16 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Left Column: Text and CTA */}
            <div className="flex-1 text-left md:pr-8 order-2 md:order-1">
              <h1 className="text-4xl md:text-5xl font-bold mb-6 text-[#333]">
                <span className="text-[#A7C7E7]">Tek Video</span>, 6 Farklı Seviye: İngilizceyi Kendi Hızınızda Deneyimleyin!
              </h1>
              <p className="text-lg text-[#555] mb-8">
                LingRoot ile aynı ilgi çekici videoyu izleyin, seslendirme ve altyazıları A1'den C2'ye kadar kendi İngilizce seviyenize göre anında değiştirin. Dinleyerek ve izleyerek öğrenmenin en etkili yolu!
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/register" className="bg-[#A7C7E7] hover:bg-[#86b3de] text-white px-8 py-3 rounded-xl font-bold text-lg transition-colors text-center">
                  Hemen Ücretsiz Deneyin!
                </Link>
                <Link href="#how-it-works" className="border-2 border-[#A7C7E7] text-[#A7C7E7] hover:bg-[#A7C7E7] hover:text-white px-8 py-3 rounded-xl font-bold text-lg transition-colors text-center">
                  Nasıl Çalışır?
                </Link>
              </div>
              <div className="mt-8 flex items-center">
                <p className="text-[#FFE29A] bg-[#FFF8E1] px-3 py-1 rounded-full text-sm font-medium inline-flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Yapay zeka destekli öğrenme
                </p>
                <span className="mx-2 text-gray-300">•</span>
                <p className="text-[#B6E2D3] bg-[#E6F7F1] px-3 py-1 rounded-full text-sm font-medium">
                  Günlük rutininize entegre
                </p>
              </div>
            </div>
            
            {/* Right Column: Video Player */}
            <div className="flex-1 w-full order-1 md:order-2">
              <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 w-full">
                <div className="w-full aspect-video bg-black rounded-xl flex justify-center items-center text-white text-xl mb-6 overflow-hidden">
                  <video
                    src={VIDEO_LINKS[selectedLevel] || VIDEO_LINKS['A1']}
                    controls
                    className="w-full h-full object-cover"
                  >
                    Tarayıcınız video etiketini desteklemiyor.
                  </video>
                </div>
                <p className="text-center font-medium mb-3 text-base">İzlediğiniz videonun seslendirmesini ve altyazısını değiştirmek için seviyenizi seçin:</p>
                <div className="flex flex-wrap justify-center gap-2 mb-4">
                  {LEVELS.map(level => (
                    <button
                      key={level}
                      onClick={() => setSelectedLevel(level)}
                      className={`px-4 py-2 rounded-xl font-bold transition-all ${
                        selectedLevel === level
                          ? "bg-[#B6E2D3] text-white"
                          : "bg-white text-[#A7C7E7] border border-[#A7C7E7] hover:bg-[#A7C7E7] hover:text-white"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
                <div className="bg-[#f8f9fa] p-4 rounded-xl min-h-[60px] text-left text-[#444] text-sm border border-gray-100">
                  <p className="font-medium text-[#A7C7E7] mb-1">Altyazı:</p>
                  <p className="italic">
                    {selectedLevel} seviyesine uygun altyazı burada görünecektir...
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Wave Divider */}
      <div className="w-full">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 100" className="w-full">
          <path fill="#f8f9fa" fillOpacity="1" d="M0,64L80,58.7C160,53,320,43,480,48C640,53,800,75,960,80C1120,85,1280,75,1360,69.3L1440,64L1440,0L1360,0C1280,0,1120,0,960,0C800,0,640,0,480,0C320,0,160,0,80,0L0,0Z"></path>
        </svg>
      </div>

      {/* How it works */}
      <section id="how-it-works" className="py-16 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">LingRoot Nasıl Çalışır?</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">Sadece üç basit adımda, sevdiğiniz içerikleri kendi İngilizce seviyenize uygun hale getirin.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <div className="bg-white p-8 rounded-2xl shadow-md border border-gray-100 relative">
              <div className="absolute -top-5 -left-5 w-12 h-12 bg-[#A7C7E7] rounded-full flex items-center justify-center text-white font-bold text-xl">1</div>
              <div className="mb-6">
                <img src="/placeholder_icon_upload.png" alt="İçerik Yükleme" width="64" height="64" className="mx-auto" />
              </div>
              <h3 className="text-xl font-bold text-[#A7C7E7] mb-3">İçeriğinizi Yükleyin</h3>
              <p className="text-gray-600">İstediğiniz YouTube videosunu, Spotify podcast'ini, metni veya dosyayı platforma yapıştırın veya yükleyin.</p>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-md border border-gray-100 relative">
              <div className="absolute -top-5 -left-5 w-12 h-12 bg-[#A7C7E7] rounded-full flex items-center justify-center text-white font-bold text-xl">2</div>
              <div className="mb-6">
                <img src="/placeholder_icon_learn.png" alt="Seviye Seçimi" width="64" height="64" className="mx-auto" />
              </div>
              <h3 className="text-xl font-bold text-[#A7C7E7] mb-3">Seviyenizi Seçin</h3>
              <p className="text-gray-600">A1'den C2'ye kadar olan İngilizce seviyelerinden size en uygun olanı seçin.</p>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-md border border-gray-100 relative">
              <div className="absolute -top-5 -left-5 w-12 h-12 bg-[#A7C7E7] rounded-full flex items-center justify-center text-white font-bold text-xl">3</div>
              <div className="mb-6">
                <img src="/placeholder_icon_progress.png" alt="Öğrenmeye Başlayın" width="64" height="64" className="mx-auto" />
              </div>
              <h3 className="text-xl font-bold text-[#A7C7E7] mb-3">Öğrenmeye Başlayın!</h3>
              <p className="text-gray-600">LingRoot, içeriği sizin için anında uyarlar. Aynı videoyu farklı seviyelerde dinleyin, altyazıları takip edin ve İngilizcenizi geliştirin!</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 px-4 bg-[#f8f9fa]">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Neden LingRoot?</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">Benzersiz özelliklerimizle İngilizce öğrenme deneyiminizi tamamen değiştiriyoruz.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
            <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className="w-14 h-14 bg-[#E6F7F1] rounded-2xl mb-4 flex items-center justify-center">
                <img src="/placeholder_icon_adaptive.png" alt="Kişiselleştirilmiş Öğrenme" width="32" height="32" />
              </div>
              <h3 className="text-xl font-bold text-[#333] mb-2">Kişiselleştirilmiş Öğrenme</h3>
              <p className="text-gray-600">Her içerik, sizin seviyenize ve ilgi alanlarınıza göre özel olarak uyarlanır.</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className="w-14 h-14 bg-[#E6F7F1] rounded-2xl mb-4 flex items-center justify-center">
                <img src="/placeholder_icon_pronunciation.png" alt="Telaffuz Pratiği" width="32" height="32" />
              </div>
              <h3 className="text-xl font-bold text-[#333] mb-2">Telaffuz Pratiği</h3>
              <p className="text-gray-600">Gelişmiş yapay zeka ile konuşma becerilerinizi ve telaffuzunuzu mükemmelleştirin.</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className="w-14 h-14 bg-[#E6F7F1] rounded-2xl mb-4 flex items-center justify-center">
                <img src="/placeholder_icon_vocabulary.png" alt="Geniş Kelime Havuzu" width="32" height="32" />
              </div>
              <h3 className="text-xl font-bold text-[#333] mb-2">Geniş Kelime Havuzu</h3>
              <p className="text-gray-600">Karşılaştığınız yeni kelimeleri kolayca öğrenin ve kalıcı hale getirin.</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className="w-14 h-14 bg-[#E6F7F1] rounded-2xl mb-4 flex items-center justify-center">
                <img src="/placeholder_icon_real_content.png" alt="Gerçek Dünya İçerikleri" width="32" height="32" />
              </div>
              <h3 className="text-xl font-bold text-[#333] mb-2">Gerçek Dünya İçerikleri</h3>
              <p className="text-gray-600">Sıkıcı ders kitapları yerine, sevdiğiniz videolar ve podcast'lerle öğrenin.</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className="w-14 h-14 bg-[#E6F7F1] rounded-2xl mb-4 flex items-center justify-center">
                <img src="/placeholder_icon_progress.png" alt="İlerleme Takibi" width="32" height="32" />
              </div>
              <h3 className="text-xl font-bold text-[#333] mb-2">İlerleme Takibi</h3>
              <p className="text-gray-600">Gelişiminizi adım adım takip edin ve motivasyonunuzu yüksek tutun.</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className="w-14 h-14 bg-[#E6F7F1] rounded-2xl mb-4 flex items-center justify-center">
                <img src="/placeholder_icon_flexible.png" alt="Esnek ve Erişilebilir" width="32" height="32" />
              </div>
              <h3 className="text-xl font-bold text-[#333] mb-2">Esnek ve Erişilebilir</h3>
              <p className="text-gray-600">İstediğiniz zaman, istediğiniz yerden öğrenme özgürlüğünün tadını çıkarın.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Wave Divider */}
      <div className="w-full transform rotate-180">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 100" className="w-full">
          <path fill="#f8f9fa" fillOpacity="1" d="M0,64L80,58.7C160,53,320,43,480,48C640,53,800,75,960,80C1120,85,1280,75,1360,69.3L1440,64L1440,0L1360,0C1280,0,1120,0,960,0C800,0,640,0,480,0C320,0,160,0,80,0L0,0Z"></path>
        </svg>
      </div>

      {/* Testimonials */}
      <section id="testimonials" className="py-16 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Kullanıcılarımız Ne Diyor?</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">Binlerce kullanıcımız LingRoot ile İngilizce öğrenme deneyimlerini paylaşıyor.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-[#A7C7E7] rounded-full flex items-center justify-center text-white font-bold">AK</div>
                <div className="ml-4">
                  <h4 className="font-bold">Ayşe K.</h4>
                  <div className="flex text-[#FFE29A]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                </div>
              </div>
              <p className="italic text-gray-600">"LingRoot sayesinde daha önce anlamakta zorlandığım videoları bile kendi seviyemde izleyebiliyorum. Aynı içeriği farklı seviyelerde dinlemek inanılmaz faydalı!"</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-[#A7C7E7] rounded-full flex items-center justify-center text-white font-bold">MY</div>
                <div className="ml-4">
                  <h4 className="font-bold">Mehmet Y.</h4>
                  <div className="flex text-[#FFE29A]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                </div>
              </div>
              <p className="italic text-gray-600">"İngilizce öğrenmek hiç bu kadar keyifli olmamıştı. Özellikle 6 seviyeli video özelliği harika bir fikir. Kesinlikle tavsiye ederim."</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-[#A7C7E7] rounded-full flex items-center justify-center text-white font-bold">CB</div>
                <div className="ml-4">
                  <h4 className="font-bold">Can B.</h4>
                  <div className="flex text-[#FFE29A]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                </div>
              </div>
              <p className="italic text-gray-600">"Sevdiğim YouTube kanallarını artık İngilizce öğrenmek için kullanabiliyorum. LingRoot ile öğrenmek çok daha eğlenceli ve etkili hale geldi."</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 px-4 bg-[#f8f9fa]">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Fiyatlandırma</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">Her bütçeye uygun, esnek fiyatlandırma seçenekleri.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <div className="bg-white p-8 rounded-2xl shadow-md border border-gray-100 relative">
              <div className="absolute top-0 right-0 bg-[#FFE29A] text-[#333] px-4 py-1 rounded-tr-2xl rounded-bl-2xl font-medium text-sm">Popüler</div>
              <h3 className="text-2xl font-bold text-[#333] mb-2">Ücretsiz</h3>
              <p className="text-gray-600 mb-6">İngilizce öğrenmeye başlamak için</p>
              <div className="text-4xl font-bold mb-6">0 ₺<span className="text-lg font-normal text-gray-500">/ay</span></div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#B6E2D3] mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Günlük 10 dakika içerik</span>
                </li>
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#B6E2D3] mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>A1-B1 seviyeleri</span>
                </li>
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#B6E2D3] mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Temel özellikler</span>
                </li>
              </ul>
              <Link href="/register" className="block w-full bg-[#A7C7E7] hover:bg-[#86b3de] text-white text-center py-3 rounded-xl font-bold transition-colors">
                Ücretsiz Başla
              </Link>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-md border-2 border-[#A7C7E7] relative transform md:scale-105 z-10">
              <div className="absolute top-0 right-0 bg-[#A7C7E7] text-white px-4 py-1 rounded-tr-2xl rounded-bl-2xl font-medium text-sm">Tavsiye Edilen</div>
              <h3 className="text-2xl font-bold text-[#333] mb-2">Premium</h3>
              <p className="text-gray-600 mb-6">Tam kapsamlı İngilizce öğrenme</p>
              <div className="text-4xl font-bold mb-6">49 ₺<span className="text-lg font-normal text-gray-500">/ay</span></div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#B6E2D3] mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Sınırsız içerik</span>
                </li>
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#B6E2D3] mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Tüm seviyeler (A1-C2)</span>
                </li>
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#B6E2D3] mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Telaffuz değerlendirmesi</span>
                </li>
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#B6E2D3] mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Kişisel ilerleme raporları</span>
                </li>
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#B6E2D3] mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>İçerik indirme</span>
                </li>
              </ul>
              <Link href="/register" className="block w-full bg-[#A7C7E7] hover:bg-[#86b3de] text-white text-center py-3 rounded-xl font-bold transition-colors">
                Premium'a Geç
              </Link>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-md border border-gray-100">
              <h3 className="text-2xl font-bold text-[#333] mb-2">Kurumsal</h3>
              <p className="text-gray-600 mb-6">Şirketler ve eğitim kurumları için</p>
              <div className="text-4xl font-bold mb-6">Özel<span className="text-lg font-normal text-gray-500">/yıllık</span></div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#B6E2D3] mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Sınırsız kullanıcı</span>
                </li>
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#B6E2D3] mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Özel içerik entegrasyonu</span>
                </li>
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#B6E2D3] mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Yönetim paneli</span>
                </li>
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#B6E2D3] mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Özel destek</span>
                </li>
              </ul>
              <Link href="/contact" className="block w-full bg-white border-2 border-[#A7C7E7] text-[#A7C7E7] hover:bg-[#A7C7E7] hover:text-white text-center py-3 rounded-xl font-bold transition-colors">
                Bizimle İletişime Geçin
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4 bg-gradient-to-r from-[#A7C7E7] to-[#B6E2D3] text-white">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">İngilizce Öğrenme Yolculuğunuza Bugün Başlayın!</h2>
            <p className="text-xl mb-8 max-w-3xl mx-auto">LingRoot'un benzersiz özelliklerini keşfedin ve İngilizce hedeflerinize daha hızlı ulaşın.</p>
            <Link href="/register" className="bg-white text-[#A7C7E7] hover:bg-[#f8f9fa] px-8 py-4 rounded-xl font-bold text-lg inline-block transition-colors">
              Hemen Ücretsiz Deneyin!
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#333] text-white py-12 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <img src="/lingroot_logo.png" alt="LingRoot Logo" width="180" height="60" className="mb-4" />
              <p className="text-gray-400 mb-4">Your routines turn into English</p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm6.066 9.645c.183 4.04-2.83 8.544-8.164 8.544-1.622 0-3.131-.476-4.402-1.291 1.524.18 3.045-.244 4.252-1.189-1.256-.023-2.317-.854-2.684-1.995.451.086.895.061 1.298-.049-1.381-.278-2.335-1.522-2.304-2.853.388.215.83.344 1.301.359-1.279-.855-1.641-2.544-.889-3.835 1.416 1.738 3.533 2.881 5.92 3.001-.419-1.796.944-3.527 2.799-3.527.825 0 1.572.349 2.096.907.654-.128 1.27-.368 1.824-.697-.215.671-.67 1.233-1.263 1.589.581-.07 1.135-.224 1.649-.453-.384.578-.87 1.084-1.433 1.489z" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-2 16h-2v-6h2v6zm-1-6.891c-.607 0-1.1-.496-1.1-1.109 0-.612.492-1.109 1.1-1.109s1.1.497 1.1 1.109c0 .613-.493 1.109-1.1 1.109zm8 6.891h-1.998v-2.861c0-1.881-2.002-1.722-2.002 0v2.861h-2v-6h2v1.093c.872-1.616 4-1.736 4 1.548v3.359z" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-bold mb-4">Hızlı Bağlantılar</h4>
              <ul className="space-y-2">
                <li><Link href="/" className="text-gray-400 hover:text-white transition-colors">Ana Sayfa</Link></li>
                <li><Link href="#how-it-works" className="text-gray-400 hover:text-white transition-colors">Nasıl Çalışır?</Link></li>
                <li><Link href="#features" className="text-gray-400 hover:text-white transition-colors">Özellikler</Link></li>
                <li><Link href="#pricing" className="text-gray-400 hover:text-white transition-colors">Fiyatlandırma</Link></li>
                <li><Link href="/blog" className="text-gray-400 hover:text-white transition-colors">Blog</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-bold mb-4">Yasal</h4>
              <ul className="space-y-2">
                <li><Link href="/privacy-policy" className="text-gray-400 hover:text-white transition-colors">Gizlilik Politikası</Link></li>
                <li><Link href="/terms" className="text-gray-400 hover:text-white transition-colors">Kullanım Şartları</Link></li>
                <li><Link href="/cookie-policy" className="text-gray-400 hover:text-white transition-colors">Çerez Politikası</Link></li>
                <li><Link href="/gdpr" className="text-gray-400 hover:text-white transition-colors">KVKK</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-bold mb-4">İletişim</h4>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-gray-400">info@lingroot.com</span>
                </li>
                <li className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="text-gray-400">+90 (212) 123 4567</span>
                </li>
                <li className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-gray-400">İstanbul, Türkiye</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-700 mt-12 pt-8 text-center">
            <p className="text-gray-400">&copy; {new Date().getFullYear()} LingRoot. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
