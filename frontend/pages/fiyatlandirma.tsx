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
      <header className="fixed w-full py-4 px-6 flex justify-between items-center z-50 bg-white border-b border-gray-100 shadow-sm">
        <Link href="/" className="flex items-center">
          <h1 className="text-2xl font-['Nunito',sans-serif] font-bold">
            <span className="text-[#28a745]">Ling</span>
            <span className="text-[#333333]">Root</span>
          </h1>
        </Link>
        
        {/* Navigation Menu - Right Side */}
        <div className="flex items-center space-x-5">
          <Link href="/nasil-calisir" className="text-gray-700 hover:text-gray-900 font-medium">
            Nasıl Çalışır?
          </Link>
          <Link href="/ozellikler" className="text-gray-700 hover:text-gray-900 font-medium">
            Özellikler
          </Link>
          <Link href="/fiyatlandirma" className="text-[#28a745] hover:text-[#218838] font-medium">
            Fiyatlandırma
          </Link>
          <Link href="/login" className="text-gray-700 hover:text-gray-900 font-medium">
            Giriş Yap
          </Link>
          <Link href="/register" className="ml-2 px-4 py-2 bg-[#28a745] text-white rounded font-medium hover:bg-[#218838] transition-colors">
            Kayıt Ol
          </Link>
        </div>
      </header>

      <main className="flex-grow pt-24">
        <section className="py-12 bg-[#f1f9ee]">
          <div className="max-w-6xl mx-auto px-6">
            <h1 className="text-4xl font-['Nunito',sans-serif] font-bold text-[#333333] mb-6 text-center">
              LingRoot <span className="text-[#28a745]">Fiyatlandırma</span>
            </h1>
            <p className="text-lg text-gray-700 mb-12 text-center max-w-3xl mx-auto">
              İhtiyaçlarınıza en uygun planı seçin ve İngilizce öğrenme serüveninize hemen başlayın.
            </p>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Ücretsiz Plan */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
                <div className="bg-gray-50 p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">Ücretsiz</h3>
                  <div className="text-center">
                    <span className="text-3xl font-bold text-[#28a745]">0 ₺</span>
                    <span className="text-gray-600">/ay</span>
                  </div>
                </div>
                <div className="p-6">
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#28a745] mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">Günlük 5 içerik dönüştürme</span>
                    </li>
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#28a745] mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">3 seviyeye erişim (A1-B1)</span>
                    </li>
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#28a745] mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">Temel kelime kaydetme özelliği</span>
                    </li>
                    <li className="flex items-start text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>Çevrimdışı erişim</span>
                    </li>
                    <li className="flex items-start text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>Telaffuz geri bildirimleri</span>
                    </li>
                  </ul>
                  <Link href="/register" className="block w-full py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-center font-medium transition-colors">
                    Ücretsiz Başla
                  </Link>
                </div>
              </div>
              
              {/* Aylık Plan */}
              <div className="bg-white rounded-xl border-2 border-[#28a745] shadow-lg hover:shadow-xl transition-all transform scale-105 md:scale-100 md:hover:scale-105 z-10 overflow-hidden">
                <div className="bg-[#28a745] p-6 relative">
                  <div className="absolute top-0 right-0 mt-2 mr-3">
                    <div className="bg-[#fd7e14] text-white text-xs px-2 py-1 rounded-full font-bold">EN POPÜLER</div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 text-center">Aylık</h3>
                  <div className="text-center">
                    <span className="text-3xl font-bold text-white">49 ₺</span>
                    <span className="text-white opacity-90">/ay</span>
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