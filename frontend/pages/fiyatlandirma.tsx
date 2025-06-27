import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Footer from '../src/components/Footer';
import StandardHeader from '../src/components/common/StandardHeader';

export default function Fiyatlandirma() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      <Head>
        <title>Fiyatlandırma | LingRoot</title>
        <meta name="description" content="LingRoot fiyatlandırma seçenekleri. Bütçenize ve ihtiyaçlarınıza uygun planı seçin." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />

      </Head>
      
      <StandardHeader />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="py-20 px-6 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="max-w-6xl mx-auto text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-medium mb-8">
              <span className="w-2 h-2 bg-white rounded-full mr-2"></span>
              Planlar ve Fiyatlar
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-8 tracking-tight">
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
                Size Uygun <span className="text-blue-600">Planı Seçin</span>
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
                    <span className="text-4xl font-bold text-gray-600">0 ₺</span>
                    <span className="text-gray-600">/ay</span>
                  </div>
                </div>
                <div className="p-8">
                  <ul className="space-y-4 mb-8">
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">Günlük 5 içerik dönüştürme</span>
                    </li>
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">3 seviyeye erişim (A1-B1)</span>
                    </li>
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-300 shadow-2xl hover:shadow-3xl transition-all duration-300 transform scale-105 md:scale-100 md:hover:scale-105 z-10 overflow-hidden hover:-translate-y-2">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 relative">
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
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">Sınırsız içerik dönüştürme</span>
                    </li>
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">Tüm seviyelere erişim (A1-C2)</span>
                    </li>
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">Gelişmiş kelime havuzu ve alıştırmalar</span>
                    </li>
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">Çevrimdışı erişim</span>
                    </li>
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">Telaffuz geri bildirimleri</span>
                    </li>
                  </ul>
                  <Link href="/register" className="block w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded text-center font-medium transition-colors">
                    Hemen Başla
                  </Link>
                </div>
              </div>
              
              {/* Yıllık Plan */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
                <div className="bg-gray-50 p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">Yıllık</h3>
                  <div className="text-center">
                    <span className="text-3xl font-bold text-blue-600">399 ₺</span>
                    <span className="text-gray-600">/yıl</span>
                    <div className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded inline-block mt-1">%32 TASARRUF</div>
                  </div>
                </div>
                <div className="p-6">
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">Sınırsız içerik dönüştürme</span>
                    </li>
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">Tüm seviyelere erişim (A1-C2)</span>
                    </li>
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">Gelişmiş kelime havuzu ve alıştırmalar</span>
                    </li>
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">Çevrimdışı erişim</span>
                    </li>
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">Telaffuz geri bildirimleri</span>
                    </li>
                    <li className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">Öncelikli destek</span>
                    </li>
                  </ul>
                  <Link href="/register" className="block w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-center font-medium transition-colors">
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
                <h3 className="text-lg font-bold text-blue-600 mb-2">Üyelik planları arasında nasıl geçiş yapabilirim?</h3>
                <p className="text-gray-600">Hesap ayarlarınızdan dilediğiniz zaman planınızı yükseltebilir veya değiştirebilirsiniz. Yıllık plandan aylık plana geçiş yapmak isterseniz, mevcut abonelik sürenizin sonunda değişiklik gerçekleşir.</p>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-blue-600 mb-2">Ödememi nasıl yapabilirim?</h3>
                <p className="text-gray-600">Kredi kartı, banka kartı veya PayPal ile güvenli ödeme yapabilirsiniz. Tüm ödemeler SSL ile şifrelenir ve bilgileriniz güvende tutulur.</p>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-blue-600 mb-2">İade politikanız nedir?</h3>
                <p className="text-gray-600">Satın alma işleminizden itibaren 14 gün içerisinde, herhangi bir sebep belirtmeden iade talep edebilirsiniz. İade talepleri için destek ekibimizle iletişime geçmeniz yeterlidir.</p>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-blue-600 mb-2">Ücretsiz plan ile ne kadar ileri gidebilirim?</h3>
                <p className="text-gray-600">Ücretsiz planımız, platformumuzun temel özelliklerini denemeniz için tasarlanmıştır. Günlük sınırlar dahilinde, A1-B1 seviyelerinde içerikler oluşturabilir ve temel kelime öğrenme araçlarını kullanabilirsiniz.</p>
              </div>
            </div>
          </div>
        </section>
        
        <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Hala kararsız mısınız?</h2>
            <p className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto">
              Risk almadan ücretsiz planımızla başlayın ve LingRoot'un İngilizce öğrenme deneyiminizi nasıl tamamen değiştireceğini keşfedin.
            </p>
            <Link href="/register" className="inline-block px-8 py-4 bg-white text-blue-600 rounded shadow-md font-medium hover:bg-gray-100 transition-colors text-lg">
              Ücretsiz Hesap Oluştur
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
} 