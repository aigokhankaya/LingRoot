import React, { useState } from 'react';
import Link from 'next/link';
import Footer from '../src/components/Footer';

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

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="w-full bg-white shadow-sm py-4 px-6 flex justify-between items-center">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold">LR</div>
          <span className="text-xl font-bold text-blue-700">LingRoot</span>
        </Link>
        <div className="flex gap-2">
          <Link href="/login" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Giriş Yap
          </Link>
          <Link href="/register" className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
            Kayıt Ol
          </Link>
        </div>
      </header>

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="py-12 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Left Column: Text and CTA */}
              <div className="w-full md:w-1/2 text-left">
                <h1 className="text-3xl md:text-4xl font-bold mb-6 text-gray-800">
                  Tek Video, 6 Farklı Seviye: İngilizceyi Kendi Hızınızda Deneyimleyin!
                </h1>
                <p className="text-lg text-gray-600 mb-8">
                  LingRoot ile aynı ilgi çekici videoyu izleyin, seslendirme ve altyazıları A1'den C2'ye kadar kendi İngilizce seviyenize göre anında değiştirin. Dinleyerek ve izleyerek öğrenmenin en etkili yolu!
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/register" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center font-medium">
                    Hemen Ücretsiz Deneyin!
                  </Link>
                  <Link href="#how-it-works" className="px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-center font-medium">
                    Nasıl Çalışır?
                  </Link>
                </div>
              </div>
              
              {/* Right Column: Video Player */}
              <div className="w-full md:w-1/2">
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                  <div className="w-full aspect-video bg-black rounded-lg flex justify-center items-center text-white text-xl mb-6 overflow-hidden">
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
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          selectedLevel === level
                            ? "bg-green-500 text-white"
                            : "bg-white text-blue-600 border border-blue-600 hover:bg-blue-50"
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg min-h-[60px] text-left text-gray-600 text-sm border border-gray-200">
                    <p className="font-medium text-blue-600 mb-1">Altyazı:</p>
                    <p className="italic">
                      {selectedLevel} seviyesine uygun altyazı burada görünecektir...
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="py-12 px-4 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">LingRoot Nasıl Çalışır?</h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">Sadece üç basit adımda, sevdiğiniz içerikleri kendi İngilizce seviyenize uygun hale getirin.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-6 pt-10 rounded-lg shadow-md border border-gray-200 relative">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl absolute -top-6 left-6">1</div>
                <h3 className="text-xl font-bold text-blue-700 mb-3">İçeriğinizi Yükleyin</h3>
                <p className="text-gray-600">İstediğiniz YouTube videosunu, Spotify podcast'ini, metni veya dosyayı platforma yapıştırın veya yükleyin.</p>
              </div>
              
              <div className="bg-white p-6 pt-10 rounded-lg shadow-md border border-gray-200 relative">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl absolute -top-6 left-6">2</div>
                <h3 className="text-xl font-bold text-blue-700 mb-3">Seviyenizi Seçin</h3>
                <p className="text-gray-600">A1'den C2'ye kadar olan İngilizce seviyelerinden size en uygun olanı seçin.</p>
              </div>
              
              <div className="bg-white p-6 pt-10 rounded-lg shadow-md border border-gray-200 relative">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl absolute -top-6 left-6">3</div>
                <h3 className="text-xl font-bold text-blue-700 mb-3">Öğrenmeye Başlayın!</h3>
                <p className="text-gray-600">LingRoot, içeriği sizin için anında uyarlar. Aynı videoyu farklı seviyelerde dinleyin, altyazıları takip edin ve İngilizcenizi geliştirin!</p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-12 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Kullanıcılarımız Ne Diyor?</h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">Binlerce kullanıcımız LingRoot ile İngilizce öğrenme deneyimlerini paylaşıyor.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">AK</div>
                  <div className="ml-4">
                    <h4 className="font-bold">Ayşe K.</h4>
                    <div className="flex text-yellow-400">
                      <span>★★★★★</span>
                    </div>
                  </div>
                </div>
                <p className="italic text-gray-600">"LingRoot sayesinde daha önce anlamakta zorlandığım videoları bile kendi seviyemde izleyebiliyorum. Aynı içeriği farklı seviyelerde dinlemek inanılmaz faydalı!"</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">MY</div>
                  <div className="ml-4">
                    <h4 className="font-bold">Mehmet Y.</h4>
                    <div className="flex text-yellow-400">
                      <span>★★★★★</span>
                    </div>
                  </div>
                </div>
                <p className="italic text-gray-600">"İngilizce öğrenmek hiç bu kadar keyifli olmamıştı. Özellikle 6 seviyeli video özelliği harika bir fikir. Kesinlikle tavsiye ederim."</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">CB</div>
                  <div className="ml-4">
                    <h4 className="font-bold">Can B.</h4>
                    <div className="flex text-yellow-400">
                      <span>★★★★★</span>
                    </div>
                  </div>
                </div>
                <p className="italic text-gray-600">"Sevdiğim YouTube kanallarını artık İngilizce öğrenmek için kullanabiliyorum. LingRoot ile öğrenmek çok daha eğlenceli ve etkili hale geldi."</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-12 px-4 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Neden LingRoot?</h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">Benzersiz özelliklerimizle İngilizce öğrenme deneyiminizi tamamen değiştiriyoruz.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Kişiselleştirilmiş Öğrenme</h3>
                <p className="text-gray-600">Her içerik, sizin seviyenize ve ilgi alanlarınıza göre özel olarak uyarlanır.</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Telaffuz Pratiği</h3>
                <p className="text-gray-600">Gelişmiş yapay zeka ile konuşma becerilerinizi ve telaffuzunuzu mükemmelleştirin.</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Geniş Kelime Havuzu</h3>
                <p className="text-gray-600">Karşılaştığınız yeni kelimeleri kolayca öğrenin ve kalıcı hale getirin.</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Gerçek Dünya İçerikleri</h3>
                <p className="text-gray-600">Sıkıcı ders kitapları yerine, sevdiğiniz videolar ve podcast'lerle öğrenin.</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200">
                <h3 className="text-xl font-bold text-gray-800 mb-2">İlerleme Takibi</h3>
                <p className="text-gray-600">Gelişiminizi adım adım takip edin ve motivasyonunuzu yüksek tutun.</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Esnek ve Erişilebilir</h3>
                <p className="text-gray-600">İstediğiniz zaman, istediğiniz yerden öğrenme özgürlüğünün tadını çıkarın.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-12 px-4 bg-blue-600 text-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-6">İngilizce Öğrenme Yolculuğunuza Bugün Başlayın!</h2>
              <p className="text-xl mb-8 max-w-3xl mx-auto">LingRoot'un benzersiz özelliklerini keşfedin ve İngilizce hedeflerinize daha hızlı ulaşın.</p>
              <Link href="/register" className="inline-block px-8 py-4 bg-white text-blue-600 rounded-lg font-bold text-lg hover:bg-gray-100 transition-colors">
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
