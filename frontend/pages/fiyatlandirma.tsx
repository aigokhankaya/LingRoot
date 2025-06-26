import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Footer from '../src/components/Footer';

export default function Fiyatlandirma() {
  return (
    <div className="min-h-screen flex flex-col bg-white font-['Roboto',sans-serif]">
      <Head>
        <title>Fiyatlandırma | LingRoot</title>
        <meta name="description" content="LingRoot fiyatlandırma seçenekleri. Bütçenize ve ihtiyaçlarınıza uygun planı seçin." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=Roboto:wght@400;500;700&family=Lato:wght@400;700&display=swap" rel="stylesheet" />
      </Head>
      
      {/* Header */}
      <header className="fixed w-full py-4 px-4 sm:px-6 flex justify-between items-center z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <Link href="/" className="flex items-center space-x-3">
          <div className="w-12 h-12 relative">
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-lg"
            >
              <circle cx="24" cy="24" r="22" fill="url(#gradient)" stroke="url(#borderGradient)" strokeWidth="2" />
              <path d="M32 18c0-4.4-3.6-8-8-8s-8 3.6-8 8 3.6 8 8 8c1.1 0 2.2-.2 3.2-.6l4.8 2.4v-4.2c1.2-1.5 1.9-3.4 1.9-5.6z" fill="white" fillOpacity="0.9" />
              <path d="M24 14v8m-3-4h6m-6 2h6" stroke="url(#textGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="18" cy="30" r="1.5" fill="url(#accentGradient)" />
              <circle cx="22" cy="32" r="1" fill="url(#accentGradient)" />
              <circle cx="26" cy="32" r="1" fill="url(#accentGradient)" />
              <circle cx="30" cy="30" r="1.5" fill="url(#accentGradient)" />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="50%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
                <linearGradient id="borderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
                <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1d4ed8" />
                  <stop offset="100%" stopColor="#6d28d9" />
                </linearGradient>
                <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="font-extrabold text-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent tracking-tight">
            LingRoot
          </span>
        </Link>
        
        <nav className="hidden md:flex items-center space-x-8">
          <Link href="/about" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200">
            Hakkımızda
          </Link>
          <Link href="/nasil-calisir" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200">
            Nasıl Çalışır?
          </Link>
          <Link href="/ozellikler" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200">
            Özellikler
          </Link>
          <Link href="/fiyatlandirma" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors duration-200">
            Fiyatlandırma
          </Link>
          <Link href="/blog" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200">
            Blog
          </Link>
        </nav>

        <div className="flex items-center space-x-4">
          <Link href="/login" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200">
            Giriş Yap
          </Link>
          <Link href="/register" 
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
            Ücretsiz Başla
          </Link>
        </div>
      </header>

      <main className="flex-grow pt-24">
        {/* Hero Section */}
        <section className="py-20 px-6 bg-gradient-to-r from-blue-600 to-purple-600">
          <div className="max-w-6xl mx-auto text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-medium mb-8">
              <span className="w-2 h-2 bg-white rounded-full mr-2"></span>
              Planlar ve Fiyatlar
            </div>
            <h1 className="text-4xl md:text-7xl font-extrabold text-white mb-8 tracking-tight">
              LingRoot <span className="text-blue-200">Fiyatlandırma</span>
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-4xl mx-auto leading-relaxed">
              İhtiyaçlarınıza en uygun planı seçin ve İngilizce öğrenme serüveninize hemen başlayın.
            </p>
          </div>
        </section>

        <section className="py-20 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Size Uygun <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Planı Seçin</span>
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Tüm planlarımızda 7 gün ücretsiz deneme imkanı
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Ücretsiz Plan */}
              <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden hover:-translate-y-2">
                <div className="bg-gradient-to-r from-gray-100 to-gray-200 p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">Ücretsiz</h3>
                  <div className="text-center">
                    <span className="text-4xl font-bold bg-gradient-to-r from-gray-600 to-gray-800 bg-clip-text text-transparent">0 ₺</span>
                    <span className="text-gray-600">/ay</span>
                  </div>
                </div>
                <div className="p-8">
                  <ul className="space-y-4 mb-8">
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">Günlük 5 içerik dönüştürme</span>
                    </li>
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">3 seviyeye erişim (A1-B1)</span>
                    </li>
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">Temel kelime kaydetme özelliği</span>
                    </li>
                    <li className="flex items-start text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>Çevrimdışı erişim</span>
                    </li>
                    <li className="flex items-start text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>Telaffuz geri bildirimleri</span>
                    </li>
                  </ul>
                  <Link href="/register" className="block w-full py-3 px-6 bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 text-gray-800 rounded-xl text-center font-semibold transition-all duration-200 shadow-md hover:shadow-lg">
                    Ücretsiz Başla
                  </Link>
                </div>
              </div>
              
              {/* Aylık Plan */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border-2 border-blue-300 shadow-2xl hover:shadow-3xl transition-all duration-300 transform scale-105 md:scale-100 md:hover:scale-105 z-10 overflow-hidden hover:-translate-y-2">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 relative">
                  <div className="absolute top-0 right-0 mt-3 mr-4">
                    <div className="bg-orange-500 text-white text-xs px-3 py-1 rounded-full font-bold shadow-lg">EN POPÜLER</div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 text-center">Aylık</h3>
                  <div className="text-center">
                    <span className="text-4xl font-bold text-white">49 ₺</span>
                    <span className="text-white opacity-90">/ay</span>
                  </div>
                </div>
                <div className="p-8">
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#28a745] mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">Sınırsız içerik dönüştürme</span>
                    </li>
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#28a745] mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">Tüm seviyelere erişim (A1-C2)</span>
                    </li>
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#28a745] mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">Gelişmiş kelime havuzu ve alıştırmalar</span>
                    </li>
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#28a745] mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">Çevrimdışı erişim</span>
                    </li>
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#28a745] mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">Telaffuz geri bildirimleri</span>
                    </li>
                  </ul>
                  <Link href="/register" className="block w-full py-3 px-4 bg-[#28a745] hover:bg-[#218838] text-white rounded text-center font-medium transition-colors">
                    Hemen Başla
                  </Link>
                </div>
              </div>
              
              {/* Yıllık Plan */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
                <div className="bg-gray-50 p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">Yıllık</h3>
                  <div className="text-center">
                    <span className="text-3xl font-bold text-[#28a745]">399 ₺</span>
                    <span className="text-gray-600">/yıl</span>
                    <div className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded inline-block mt-1">%32 TASARRUF</div>
                  </div>
                </div>
                <div className="p-6">
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#28a745] mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">Sınırsız içerik dönüştürme</span>
                    </li>
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#28a745] mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">Tüm seviyelere erişim (A1-C2)</span>
                    </li>
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#28a745] mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">Gelişmiş kelime havuzu ve alıştırmalar</span>
                    </li>
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#28a745] mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">Çevrimdışı erişim</span>
                    </li>
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#28a745] mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">Telaffuz geri bildirimleri</span>
                    </li>
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#28a745] mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">Öncelikli destek</span>
                    </li>
                  </ul>
                  <Link href="/register" className="block w-full py-3 px-4 bg-[#fd7e14] hover:bg-[#e76b02] text-white rounded text-center font-medium transition-colors">
                    Yıllık Abone Ol
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        <section className="py-12 bg-gray-50">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">Sık Sorulan Sorular</h2>
            
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-[#28a745] mb-2">Üyelik planları arasında nasıl geçiş yapabilirim?</h3>
                <p className="text-gray-600">Hesap ayarlarınızdan dilediğiniz zaman planınızı yükseltebilir veya değiştirebilirsiniz. Yıllık plandan aylık plana geçiş yapmak isterseniz, mevcut abonelik sürenizin sonunda değişiklik gerçekleşir.</p>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-[#28a745] mb-2">Ödememi nasıl yapabilirim?</h3>
                <p className="text-gray-600">Kredi kartı, banka kartı veya PayPal ile güvenli ödeme yapabilirsiniz. Tüm ödemeler SSL ile şifrelenir ve bilgileriniz güvende tutulur.</p>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-[#28a745] mb-2">İade politikanız nedir?</h3>
                <p className="text-gray-600">Satın alma işleminizden itibaren 14 gün içerisinde, herhangi bir sebep belirtmeden iade talep edebilirsiniz. İade talepleri için destek ekibimizle iletişime geçmeniz yeterlidir.</p>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-[#28a745] mb-2">Ücretsiz plan ile ne kadar ileri gidebilirim?</h3>
                <p className="text-gray-600">Ücretsiz planımız, platformumuzun temel özelliklerini denemeniz için tasarlanmıştır. Günlük sınırlar dahilinde, A1-B1 seviyelerinde içerikler oluşturabilir ve temel kelime öğrenme araçlarını kullanabilirsiniz.</p>
              </div>
            </div>
          </div>
        </section>
        
        <section className="py-16 bg-[#f1f9ee]">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Hala kararsız mısınız?</h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Risk almadan ücretsiz planımızla başlayın ve LingRoot'un İngilizce öğrenme deneyiminizi nasıl tamamen değiştireceğini keşfedin.
            </p>
            <Link href="/register" className="inline-block px-8 py-4 bg-[#fd7e14] text-white rounded shadow-md font-medium hover:bg-[#e76b02] transition-colors text-lg">
              Ücretsiz Hesap Oluştur
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
} 