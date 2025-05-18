import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Footer from '../src/components/Footer';

export default function NasilCalisir() {
  return (
    <div className="min-h-screen flex flex-col bg-white font-['Roboto',sans-serif]">
      <Head>
        <title>Nasıl Çalışır? | LingRoot</title>
        <meta name="description" content="LingRoot nasıl çalışır? İngilizce öğrenme platformumuzun çalışma şekli ve temel özellikleri hakkında bilgi edinin." />
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
          <Link href="/nasil-calisir" className="text-[#28a745] hover:text-[#218838] font-medium">
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
      </header>

      <main className="flex-grow pt-24">
        <section className="py-12 bg-[#f1f9ee]">
          <div className="max-w-6xl mx-auto px-6">
            <h1 className="text-4xl font-['Nunito',sans-serif] font-bold text-[#333333] mb-6 text-center">
              LingRoot <span className="text-[#28a745]">Nasıl Çalışır?</span>
            </h1>
            <p className="text-lg text-gray-700 mb-12 text-center max-w-3xl mx-auto">
              Sadece üç basit adımda, sevdiğiniz içerikleri kendi İngilizce seviyenize uygun hale getirin.
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
                  <h3 className="text-xl font-bold text-[#28a745] mb-3">İçeriğinizi Yükleyin</h3>
                  <p className="text-gray-600">Sevdiğiniz YouTube videosunu, Spotify podcast'ini veya metni platforma aktarın ve öğrenmeye hazırlanın.</p>
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
                  <h3 className="text-xl font-bold text-[#28a745] mb-3">Seviyenizi Seçin</h3>
                  <p className="text-gray-600">A1'den C2'ye kadar olan İngilizce seviyelerinden kendinize en uygun olanı belirleyin.</p>
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
                  <h3 className="text-xl font-bold text-[#28a745] mb-3">Öğrenmeye Başlayın!</h3>
                  <p className="text-gray-600">LingRoot, içeriği anında seviyenize uyarlar. Farklı seviyelerde dinleyin ve İngilizcenizi hızla geliştirin!</p>
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