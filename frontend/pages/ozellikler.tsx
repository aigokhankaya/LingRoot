import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Footer from '../src/components/Footer';

export default function Ozellikler() {
  return (
    <div className="min-h-screen flex flex-col bg-white font-['Roboto',sans-serif]">
      <Head>
        <title>Özellikler | LingRoot</title>
        <meta name="description" content="LingRoot'un benzersiz özellikleri ile İngilizce öğrenme deneyiminizi bir üst seviyeye taşıyın." />
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
          <Link href="/ozellikler" className="text-[#28a745] hover:text-[#218838] font-medium">
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
      </header>

      <main className="flex-grow pt-24">
        <section className="py-12 bg-[#f1f9ee]">
          <div className="max-w-6xl mx-auto px-6">
            <h1 className="text-4xl font-['Nunito',sans-serif] font-bold text-[#333333] mb-6 text-center">
              LingRoot <span className="text-[#28a745]">Özellikleri</span>
            </h1>
            <p className="text-lg text-gray-700 mb-12 text-center max-w-3xl mx-auto">
              Benzersiz özelliklerimizle İngilizce öğrenme deneyiminizi tamamen değiştiriyoruz.
            </p>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-white p-6 md:p-8 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-[#28a745] group hover:-translate-y-1">
                <div className="mb-6 bg-[#d1e7dd] text-[#28a745] rounded-lg w-14 h-14 flex items-center justify-center group-hover:bg-[#28a745] group-hover:text-white transition-colors duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-[#28a745]">Kişiselleştirilmiş Öğrenme</h3>
                <p className="text-gray-600">Her içerik, sizin seviyenize ve ilgi alanlarınıza göre özel olarak uyarlanır. Kendi hızınızda ve tarzınızda öğrenin.</p>
              </div>
              
              <div className="bg-white p-6 md:p-8 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-[#28a745] group hover:-translate-y-1">
                <div className="mb-6 bg-[#d1e7dd] text-[#28a745] rounded-lg w-14 h-14 flex items-center justify-center group-hover:bg-[#28a745] group-hover:text-white transition-colors duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-[#28a745]">Telaffuz Pratiği</h3>
                <p className="text-gray-600">Gelişmiş yapay zeka ile konuşma becerilerinizi ve telaffuzunuzu interaktif alıştırmalarla mükemmelleştirin.</p>
              </div>
              
              <div className="bg-white p-6 md:p-8 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-[#28a745] group hover:-translate-y-1">
                <div className="mb-6 bg-[#d1e7dd] text-[#28a745] rounded-lg w-14 h-14 flex items-center justify-center group-hover:bg-[#28a745] group-hover:text-white transition-colors duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-[#28a745]">Geniş Kelime Havuzu</h3>
                <p className="text-gray-600">Karşılaştığınız yeni kelimeleri kolayca öğrenin, hafızanızda kalıcı hale getirin ve aktif kelime dağarcığınızı genişletin.</p>
              </div>
              
              <div className="bg-white p-6 md:p-8 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-[#28a745] group hover:-translate-y-1">
                <div className="mb-6 bg-[#d1e7dd] text-[#28a745] rounded-lg w-14 h-14 flex items-center justify-center group-hover:bg-[#28a745] group-hover:text-white transition-colors duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-[#28a745]">Gerçek Dünya İçerikleri</h3>
                <p className="text-gray-600">Sıkıcı ders kitapları yerine, sevdiğiniz videoları, podcast'leri ve gerçek hayattan içerikleri kullanarak öğrenin.</p>
              </div>
              
              <div className="bg-white p-6 md:p-8 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-[#28a745] group hover:-translate-y-1">
                <div className="mb-6 bg-[#d1e7dd] text-[#28a745] rounded-lg w-14 h-14 flex items-center justify-center group-hover:bg-[#28a745] group-hover:text-white transition-colors duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-[#28a745]">İlerleme Takibi</h3>
                <p className="text-gray-600">Gelişiminizi adım adım takip edin, analizlerinizi görüntüleyin ve motivasyonunuzu her zaman yüksek tutun.</p>
              </div>
              
              <div className="bg-white p-6 md:p-8 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-[#28a745] group hover:-translate-y-1">
                <div className="mb-6 bg-[#d1e7dd] text-[#28a745] rounded-lg w-14 h-14 flex items-center justify-center group-hover:bg-[#28a745] group-hover:text-white transition-colors duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-[#28a745]">Esnek ve Erişilebilir</h3>
                <p className="text-gray-600">İstediğiniz zaman, istediğiniz yerden öğrenme özgürlüğünün tadını çıkarın. Günlük programınıza göre esnek öğrenme.</p>
              </div>
            </div>
            
            <div className="mt-16 bg-[#f1f9ee] rounded-xl p-8 border border-[#d1e7dd] shadow-md">
              <div className="flex flex-col md:flex-row items-center">
                <div className="md:w-2/3 mb-6 md:mb-0 md:pr-8">
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">En Önemli Özelliğimiz: 6 Seviyeli İçerikler</h3>
                  <p className="text-gray-600 mb-6">
                    LingRoot'un en benzersiz özelliği, aynı içeriği A1'den C2'ye kadar 6 farklı zorluk seviyesinde sunabilmesidir. Böylece sevdiğiniz bir içeriği önce kendi seviyenizde anlayabilir, sonra daha zor seviyelere geçerek İngilizcenizi geliştirebilirsiniz.
                  </p>
                  <div className="flex flex-wrap gap-3 mb-4">
                    {["A1", "A2", "B1", "B2", "C1", "C2"].map(level => (
                      <div key={level} className="px-3 py-1.5 bg-white border border-[#28a745] text-[#28a745] rounded-lg text-sm font-medium">
                        {level} Seviyesi
                      </div>
                    ))}
                  </div>
                  <Link href="/register" className="inline-flex items-center px-6 py-3 bg-[#fd7e14] hover:bg-[#e76b02] text-white font-semibold rounded shadow-md transition-all duration-300">
                    <span>Hemen Deneyin</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                </div>
                <div className="md:w-1/3 flex justify-center">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-white border-4 border-[#28a745] flex items-center justify-center shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 md:h-20 md:w-20 text-[#28a745]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        <section className="py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl font-['Nunito',sans-serif] font-bold text-[#333333] mb-12 text-center">
              Teknik Özelliklerimiz
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-xl font-bold text-[#28a745] flex items-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Yapay Zeka Destekli İçerik Dönüşümü
                </h3>
                <p className="text-gray-600">Gelişmiş yapay zeka algoritmamız, metinleri ve videoları otomatik olarak farklı İngilizce seviyelerine uyarlar, kelime dağarcığını ve gramer yapısını kişiselleştirerek öğrenme sürecinizi optimize eder.</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-xl font-bold text-[#28a745] flex items-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Otomatik Altyazı Oluşturma
                </h3>
                <p className="text-gray-600">Her video için otomatik olarak doğru ve zaman kodlu altyazılar oluşturur. İstediğiniz seviyede altyazı gösterebilir, kelimelere tıklayarak anlamlarını öğrenebilirsiniz.</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-xl font-bold text-[#28a745] flex items-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Kelime ve İfade Kaydetme
                </h3>
                <p className="text-gray-600">İçeriklerde karşılaştığınız yeni kelime ve ifadeleri kişisel sözlüğünüze kaydedebilir, daha sonra özel oluşturulmuş alıştırmalarla pekiştirebilirsiniz.</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-xl font-bold text-[#28a745] flex items-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Çevrimdışı Erişim
                </h3>
                <p className="text-gray-600">Favori içeriklerinizi indirerek internet bağlantısı olmadan da erişebilir, öğrenmeye her yerde ve her zaman devam edebilirsiniz.</p>
              </div>
            </div>
            
            <div className="mt-16 text-center">
              <Link href="/register" className="inline-block px-6 py-3 bg-[#28a745] text-white rounded shadow-sm font-medium hover:bg-[#218838] transition-colors">
                Ücretsiz Hesap Oluştur
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
} 