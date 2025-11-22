import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Footer from '../src/components/Footer';
import BrandWordmark from '../src/components/BrandWordmark';

export default function NasilCalisir() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Head>
        <title>Nasıl Çalışır? | LingRoot</title>
        <meta name="description" content="LingRoot nasıl çalışır? İngilizce öğrenme platformumuzun çalışma şekli ve temel özellikleri hakkında bilgi edinin." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/lingroot-icon.svg" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>
      
      {/* Header */}
      <header className="fixed w-full py-4 px-4 sm:px-6 flex justify-between items-center z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <Link href="/" className="flex items-center space-x-3">
          <img src="/lingroot-icon.svg" alt="LingRoot Logo" className="w-12 h-12 drop-shadow-lg" />
          <BrandWordmark className="text-2xl" />
        </Link>
        
        {/* Navigation Menu - Right Side */}
        <nav className="hidden md:flex items-center space-x-8">
          <Link href="/about" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200">
            Hakkımızda
          </Link>
          <Link href="/nasil-calisir" className="text-primary hover:text-primary/90 font-semibold transition-colors duration-200">
            Nasıl Çalışır?
          </Link>
          <Link href="/ozellikler" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200">
            Özellikler
          </Link>
          <Link href="/fiyatlandirma" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200">
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
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
            Ücretsiz Başla
          </Link>
        </div>
      </header>

      <main className="flex-grow pt-24">
        {/* Hero Section */}
        <section className="py-20 px-6 bg-slate-950">
          <div className="max-w-6xl mx-auto text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-medium mb-8">
              <span className="w-2 h-2 bg-white rounded-full mr-2"></span>
              Üç Basit Adım
            </div>
            <h1 className="text-4xl md:text-7xl font-extrabold text-white mb-8 tracking-tight">
              LingRoot <span className="text-primary/80">Nasıl Çalışır?</span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-200 max-w-3xl mx-auto leading-relaxed">
              Sevdiğin içerikleri kendi İngilizce seviyende dinlemek için sadece üç adım yeterli. 
              Yapay zeka teknolojimiz, içerikleri analiz eder ve seviyenize uygun hale getirir.
            </p>
          </div>
        </section>

        <section className="py-12 bg-[#f1f9ee]">
          <div className="max-w-6xl mx-auto px-6">
            <h1 className="text-4xl font-['Nunito',sans-serif] font-bold text-[#333333] mb-6 text-center">
              LingRoot <span className="text-[#28a745]">Nasıl Çalışır?</span>
            </h1>
            <p className="text-lg text-gray-700 mb-12 text-center max-w-3xl mx-auto">
              Sevdiğin içerikleri kendi İngilizce seviyende dinlemek için sadece üç adım yeterli. 
              Yapay zeka teknolojimiz, içerikleri analiz eder ve seviyenize uygun hale getirir.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Connecting line in the background */}
              <div className="hidden md:block absolute top-1/2 left-0 w-full h-1 bg-[#d1e7dd] -z-10 transform -translate-y-1/2"></div>
              
              <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 relative hover:border-[#28a745] transition-all">
                <div className="w-16 h-16 bg-[#28a745] rounded-full flex items-center justify-center text-white font-bold text-2xl absolute -top-6 left-1/2 transform -translate-x-1/2 shadow-md">1</div>
                <div className="mt-8 text-center">
                  <div className="mb-4 flex justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-[#28a745]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-[#28a745] mb-3">İçeriğinizi Seçin</h3>
                  <p className="text-gray-600">
                    YouTube videosu, Spotify podcast'i, bir haber yazısı… Sadece linki yapıştır veya metni yükle. 
                    LingRoot, farklı kaynaklardan gelen içerikleri destekleyecek esneklikte tasarlanmıştır.
                  </p>
                </div>
              </div>
              
              <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 relative hover:border-[#28a745] transition-all">
                <div className="w-16 h-16 bg-[#28a745] rounded-full flex items-center justify-center text-white font-bold text-2xl absolute -top-6 left-1/2 transform -translate-x-1/2 shadow-md">2</div>
                <div className="mt-8 text-center">
                  <div className="mb-4 flex justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-[#28a745]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-[#28a745] mb-3">Seviyenizi Belirleyin</h3>
                  <p className="text-gray-600">
                    A1'den C2'ye kadar İngilizce seviyenizi seçin. İçerik, senin anlayabileceğin İngilizceye otomatik olarak çevrilir. 
                    Dil işleme modeli, cümle yapılarını ve kelime dağarcığını seçilen seviyeye uyarlar.
                  </p>
                </div>
              </div>
              
              <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 relative hover:border-[#28a745] transition-all">
                <div className="w-16 h-16 bg-[#28a745] rounded-full flex items-center justify-center text-white font-bold text-2xl absolute -top-6 left-1/2 transform -translate-x-1/2 shadow-md">3</div>
                <div className="mt-8 text-center">
                  <div className="mb-4 flex justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-[#28a745]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-[#28a745] mb-3">Dinle ve Öğren</h3>
                  <p className="text-gray-600">
                    İçerik yapay zeka tarafından seslendirilir, altyazı eklenir ve seviyene özel hale gelir. 
                    Artık sevdiğin şeyleri dinleyerek İngilizce öğrenebilirsin. Senkronize altyazılar ve anlık çeviri özellikleriyle dinleme deneyimini kontrol edebilirsin.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Detailed Process Section */}
        <section className="py-16 bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-['Nunito',sans-serif] font-bold text-[#333333] mb-6">
                Teknik <span className="text-[#28a745]">Detaylar</span>
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                LingRoot'un arka planında çalışan yapay zeka sisteminin nasıl işlediğini daha detaylı inceleyelim.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-2xl font-bold text-[#333333] mb-6">İçerik İşleme Süreci</h3>
                <div className="space-y-6">
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-[#28a745] rounded-full flex items-center justify-center text-white font-bold text-sm mr-4 mt-1">1</div>
                    <div>
                      <h4 className="font-bold text-[#333333] mb-2">Metin Analizi</h4>
                      <p className="text-gray-600">Yapay zeka, içeriğin zorluğunu, kullanılan dil yapılarını ve kelime dağarcığını analiz eder.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-[#28a745] rounded-full flex items-center justify-center text-white font-bold text-sm mr-4 mt-1">2</div>
                    <div>
                      <h4 className="font-bold text-[#333333] mb-2">Seviye Uyarlama</h4>
                      <p className="text-gray-600">CEFR standartlarına göre cümle yapıları sadeleştirilir, karmaşık kelimeler daha basit alternatiflerle değiştirilir.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-[#28a745] rounded-full flex items-center justify-center text-white font-bold text-sm mr-4 mt-1">3</div>
                    <div>
                      <h4 className="font-bold text-[#333333] mb-2">Ses Sentezi</h4>
                      <p className="text-gray-600">Sadeleştirilen metin, doğal telaffuzla seslendirilir ve senkronize altyazılar oluşturulur.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-[#28a745] rounded-full flex items-center justify-center text-white font-bold text-sm mr-4 mt-1">4</div>
                    <div>
                      <h4 className="font-bold text-[#333333] mb-2">Optimizasyon</h4>
                      <p className="text-gray-600">İçerik, öğrenme açısından en uygun hız ve tonlamada sunulur.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-[#28a745]/10 to-[#28a745]/5 rounded-2xl p-8">
                <h3 className="text-xl font-bold text-[#333333] mb-6">Örnek Dönüşüm</h3>
                
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-red-600 mb-2">Orijinal (C2 Seviyesi):</h4>
                  <p className="text-sm text-gray-700 bg-white p-3 rounded border-l-4 border-red-300">
                    "The unprecedented technological advancement has engendered profound transformations in contemporary society."
                  </p>
                </div>
                
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-[#28a745] mb-2">A2 Seviyesine Uyarlanmış:</h4>
                  <p className="text-sm text-gray-700 bg-white p-3 rounded border-l-4 border-[#28a745]">
                    "New technology has made big changes in our society today."
                  </p>
                </div>
                
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h5 className="font-bold text-primary text-sm mb-2">Yapılan Değişiklikler:</h5>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Karmaşık kelimeler basitleştirildi</li>
                    <li>• Cümle yapısı sadeleştirildi</li>
                    <li>• A2 seviyesi kelime dağarcığı kullanıldı</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl font-['Nunito',sans-serif] font-bold text-[#333333] mb-8 text-center">
              Sık Sorulan Sorular
            </h2>
            
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="bg-gray-50 rounded-lg p-6 shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold text-[#28a745] mb-2">LingRoot'un diğer dil öğrenme uygulamalarından farkı nedir?</h3>
                <p className="text-gray-700">LingRoot, aynı içeriği 6 farklı seviyede (A1-C2) dinlemenize olanak tanıyan tek platformdur. Sevdiğiniz içerikleri kendi seviyenize göre dinleyerek daha hızlı ve etkili öğrenirsiniz.</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6 shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold text-[#28a745] mb-2">İçerikler nasıl farklı seviyelere dönüştürülüyor?</h3>
                <p className="text-gray-700">Gelişmiş yapay zeka sistemimiz, içerikleri analiz eder ve her seviye için uygun kelime dağarcığı, gramer yapıları ve konuşma hızıyla yeniden oluşturur, böylece öğrenme süreciniz için en uygun formatı sunar.</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6 shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold text-[#28a745] mb-2">Hangi tür içerikleri kullanabilirim?</h3>
                <p className="text-gray-700">YouTube videoları, podcast'ler, kendi metin veya ses dosyalarınız gibi çeşitli içerikleri platforma yükleyebilir ve seviyenize göre dönüştürebilirsiniz.</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6 shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold text-[#28a745] mb-2">LingRoot hangi İngilizce seviyelerine uygun?</h3>
                <p className="text-gray-700">A1'den C2'ye kadar tüm CEFR seviyelerine uygun içerikler sunuyoruz. Başlangıç seviyesindeyseniz de, ileri seviyedeyseniz de size uygun içerikler bulacaksınız.</p>
              </div>
            </div>
            
            <div className="mt-12 text-center">
              <Link href="/register" className="inline-block px-6 py-3 bg-[#fd7e14] text-white rounded shadow-sm font-medium hover:bg-[#e76b02] transition-colors">
                Hemen Ücretsiz Deneyin!
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
} 