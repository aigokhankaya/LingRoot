import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Footer from '../src/components/Footer';
import StandardHeader from '../src/components/common/StandardHeader';

export default function NasilCalisir() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Head>
        <title>Nasıl Çalışır? | LingRoot</title>
        <meta name="description" content="LingRoot nasıl çalışır? İngilizce öğrenme platformumuzun çalışma şekli ve temel özellikleri hakkında bilgi edinin." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <StandardHeader />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-b from-blue-50 to-white">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">
              LingRoot <span className="text-blue-600">Nasıl Çalışır?</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Sevdiğin içerikleri kendi İngilizce seviyende dinlemek için sadece üç adım yeterli. 
              Yapay zeka teknolojimiz, içerikleri analiz eder ve seviyenize uygun hale getirir.
            </p>
          </div>
        </section>

        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Üç Basit Adım</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Sevdiğin içerikleri kendi İngilizce seviyende dinlemek için sadece üç adım yeterli. 
                Yapay zeka teknolojimiz, içerikleri analiz eder ve seviyenize uygun hale getirir.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Connecting line in the background */}
              <div className="hidden md:block absolute top-1/2 left-0 w-full h-1 bg-blue-200 -z-10 transform -translate-y-1/2"></div>
              
              <div className="bg-white p-8 rounded-xl shadow-lg border-none relative hover:shadow-xl transition-all">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl absolute -top-6 left-1/2 transform -translate-x-1/2 shadow-md">1</div>
                <div className="mt-8 text-center">
                  <div className="mb-4 flex justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">İçeriğinizi Seçin</h3>
                  <p className="text-gray-600">
                    YouTube videosu, Spotify podcast'i, bir haber yazısı… Sadece linki yapıştır veya metni yükle. 
                    LingRoot, farklı kaynaklardan gelen içerikleri destekleyecek esneklikte tasarlanmıştır.
                  </p>
                </div>
              </div>
              
              <div className="bg-white p-8 rounded-xl shadow-lg border-none relative hover:shadow-xl transition-all">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl absolute -top-6 left-1/2 transform -translate-x-1/2 shadow-md">2</div>
                <div className="mt-8 text-center">
                  <div className="mb-4 flex justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Seviyenizi Belirleyin</h3>
                  <p className="text-gray-600">
                    A1'den C2'ye kadar İngilizce seviyenizi seçin. İçerik, senin anlayabileceğin İngilizceye otomatik olarak çevrilir. 
                    Dil işleme modeli, cümle yapılarını ve kelime dağarcığını seçilen seviyeye uyarlar.
                  </p>
                </div>
              </div>
              
              <div className="bg-white p-8 rounded-xl shadow-lg border-none relative hover:shadow-xl transition-all">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl absolute -top-6 left-1/2 transform -translate-x-1/2 shadow-md">3</div>
                <div className="mt-8 text-center">
                  <div className="mb-4 flex justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Dinle ve Öğren</h3>
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
        <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Teknik <span className="text-blue-600">Detaylar</span>
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                LingRoot'un arka planında çalışan yapay zeka sisteminin nasıl işlediğini daha detaylı inceleyelim.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">İçerik İşleme Süreci</h3>
                <div className="space-y-6">
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm mr-4 mt-1">1</div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-2">Metin Analizi</h4>
                      <p className="text-gray-600">Yapay zeka, içeriğin zorluğunu, kullanılan dil yapılarını ve kelime dağarcığını analiz eder.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm mr-4 mt-1">2</div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-2">Seviye Uyarlama</h4>
                      <p className="text-gray-600">CEFR standartlarına göre cümle yapıları sadeleştirilir, karmaşık kelimeler daha basit alternatiflerle değiştirilir.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm mr-4 mt-1">3</div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-2">Ses Sentezi</h4>
                      <p className="text-gray-600">Sadeleştirilen metin, doğal telaffuzla seslendirilir ve senkronize altyazılar oluşturulur.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm mr-4 mt-1">4</div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-2">Optimizasyon</h4>
                      <p className="text-gray-600">İçerik, öğrenme açısından en uygun hız ve tonlamada sunulur.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Örnek Dönüşüm</h3>
                
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-red-600 mb-2">Orijinal (C2 Seviyesi):</h4>
                  <p className="text-sm text-gray-600 bg-white p-3 rounded border-l-4 border-red-300">
                    "The unprecedented technological advancement has engendered profound transformations in contemporary society."
                  </p>
                </div>
                
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-blue-600 mb-2">A2 Seviyesine Uyarlanmış:</h4>
                  <p className="text-sm text-gray-600 bg-white p-3 rounded border-l-4 border-blue-600">
                    "New technology has made big changes in our society today."
                  </p>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h5 className="font-bold text-blue-700 text-sm mb-2">Yapılan Değişiklikler:</h5>
                  <ul className="text-sm text-blue-600 space-y-1">
                    <li>• Karmaşık kelimeler basitleştirildi</li>
                    <li>• Cümle yapısı sadeleştirildi</li>
                    <li>• A2 seviyesi kelime dağarcığı kullanıldı</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-gray-900 mb-16 text-center">
              Sık Sorulan Sorular
            </h2>
            
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="bg-gray-50 rounded-lg p-6 shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold text-blue-600 mb-2">LingRoot'un diğer dil öğrenme uygulamalarından farkı nedir?</h3>
                <p className="text-gray-600">LingRoot, aynı içeriği 6 farklı seviyede (A1-C2) dinlemenize olanak tanıyan tek platformdur. Sevdiğiniz içerikleri kendi seviyenize göre dinleyerek daha hızlı ve etkili öğrenirsiniz.</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6 shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold text-blue-600 mb-2">İçerikler nasıl farklı seviyelere dönüştürülüyor?</h3>
                <p className="text-gray-600">Gelişmiş yapay zeka sistemimiz, içerikleri analiz eder ve her seviye için uygun kelime dağarcığı, gramer yapıları ve konuşma hızıyla yeniden oluşturur, böylece öğrenme süreciniz için en uygun formatı sunar.</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6 shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold text-blue-600 mb-2">Hangi tür içerikleri kullanabilirim?</h3>
                <p className="text-gray-600">YouTube videoları, podcast'ler, kendi metin veya ses dosyalarınız gibi çeşitli içerikleri platforma yükleyebilir ve seviyenize göre dönüştürebilirsiniz.</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6 shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold text-blue-600 mb-2">LingRoot hangi İngilizce seviyelerine uygun?</h3>
                <p className="text-gray-600">A1'den C2'ye kadar tüm CEFR seviyelerine uygun içerikler sunuyoruz. Başlangıç seviyesindeyseniz de, ileri seviyedeyseniz de size uygun içerikler bulacaksınız.</p>
              </div>
            </div>
            
            <div className="mt-16 text-center">
              <Link href="/register" className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-lg py-4 px-8 rounded-lg font-medium transition-all duration-300">
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