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

  return (
    <div className="bg-[#f4f7f6] text-[#333] min-h-screen">
      {/* Header */}
      <header className="w-full bg-white flex items-center justify-between border-b border-[#eaf7ef]" style={{ minHeight: 64, padding: '0 40px' }}>
        <div className="text-3xl font-extrabold select-none">
          <span className="text-green-600">Ling</span>
          <span className="text-[#333]">Root</span>
        </div>
        <div className="flex items-center flex-1 justify-end">
          <nav className="flex items-center gap-8 text-lg font-medium text-gray-700">
            <a href="#how-it-works" className="hover:text-[#333] transition-colors">Nasıl Çalışır?</a>
            <a href="#features" className="hover:text-[#333] transition-colors">Özellikler</a>
            <a href="#pricing" className="hover:text-[#333] transition-colors">Fiyatlandırma</a>
            <Link href="/login" className="hover:text-[#333] transition-colors">Giriş Yap</Link>
            <Link href="/register" className="hover:text-[#333] transition-colors">Kayıt Ol</Link>
          </nav>
            </div>
      </header>

      {/* Hero Section */}
      <section className="bg-[#e9f5ee] py-12 px-4 flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1 text-left md:pr-8">
          <h1 className="text-4xl font-bold mb-4">Tek Video, 6 Farklı Seviye: İngilizceyi Kendi Hızınızda Deneyimleyin!</h1>
          <p className="text-lg text-[#555] mb-8">LingRoot ile aynı ilgi çekici videoyu izleyin, seslendirme ve altyazıları A1'den C2'ye kadar kendi İngilizce seviyenize göre anında değiştirin. Dinleyerek ve izleyerek öğrenmenin en etkili yolu!</p>
          <Link href="/register" className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded font-bold text-lg transition">Hemen Ücretsiz Deneyin!</Link>
        </div>
        <div className="flex-1.2 flex justify-center items-center">
          <div className="bg-white p-8 rounded-xl shadow-lg border w-full max-w-xl">
            <div className="w-full h-64 bg-black rounded flex justify-center items-center text-white text-xl mb-6">
              <video
                src={VIDEO_LINKS[selectedLevel] || VIDEO_LINKS['A1']}
                controls
                style={{ width: "100%", height: "100%", objectFit: "cover", background: "black" }}
              >
                Tarayıcınız video etiketini desteklemiyor.
              </video>
            </div>
            <p className="text-center font-bold mb-2 text-base">İzlediğiniz videonun seslendirmesini ve altyazısını değiştirmek için seviyenizi seçin:</p>
            <div className="flex flex-wrap justify-around mb-4">
              {LEVELS.map(level => (
                <button
                  key={level}
                  onClick={() => setSelectedLevel(level)}
                  className={`px-4 py-2 border-2 rounded font-bold m-1 transition ${
                    selectedLevel === level
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-white text-green-600 border-green-600 hover:bg-green-600 hover:text-white"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            <div className="bg-[#f0f0f0] p-3 rounded min-h-[40px] text-left text-[#444] italic text-sm">
              A1 Seviyesi Altyazı burada görünecektir...
            </div>
            <p className="text-xs text-center mt-2 text-[#666]">
              Açıklama: Yukarıdaki video oynatıcı sabit kalacaktır. Seviye butonlarına tıklandığında, videonun sesi ve altyazıları seçilen İngilizce seviyesine göre anında güncellenecektir.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="section py-12 px-4 text-center">
        <h2 className="text-3xl font-bold mb-8">LingRoot Nasıl Çalışır? Sadece 3 Adımda!</h2>
        <div className="flex flex-wrap justify-around gap-8 mt-8">
          <div className="bg-white p-6 rounded-lg shadow flex-1 min-w-[250px] max-w-[350px] mx-auto">
            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">📤</span>
            </div>
            <h3 className="text-lg font-bold text-green-600 mb-2">1. İçeriğinizi Yükleyin</h3>
            <p>İstediğiniz YouTube videosunu, Spotify podcast'ini, metni veya dosyayı platforma yapıştırın veya yükleyin.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow flex-1 min-w-[250px] max-w-[350px] mx-auto">
            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">🎯</span>
            </div>
            <h3 className="text-lg font-bold text-green-600 mb-2">2. Seviyenizi Seçin</h3>
            <p>A1'den C2'ye kadar olan İngilizce seviyelerinden size en uygun olanı seçin.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow flex-1 min-w-[250px] max-w-[350px] mx-auto">
            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">🚀</span>
            </div>
            <h3 className="text-lg font-bold text-green-600 mb-2">3. Öğrenmeye Başlayın!</h3>
            <p>LingRoot, içeriği sizin için anında uyarlar. Aynı videoyu farklı seviyelerde dinleyin, altyazıları takip edin ve İngilizcenizi geliştirin!</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="section py-12 px-4 text-center bg-white">
        <h2 className="text-3xl font-bold mb-8">Neden LingRoot? Benzersiz Özelliklerimiz</h2>
        <div className="flex flex-wrap justify-around gap-8 mt-8">
          <div className="bg-white p-6 rounded-lg shadow flex-1 min-w-[250px] max-w-[350px] mx-auto">
            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">🧠</span>
            </div>
            <h3 className="text-lg font-bold text-green-600 mb-2">Kişiselleştirilmiş Öğrenme</h3>
            <p>Her içerik, sizin seviyenize ve ilgi alanlarınıza göre özel olarak uyarlanır.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow flex-1 min-w-[250px] max-w-[350px] mx-auto">
            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">🗣️</span>
            </div>
            <h3 className="text-lg font-bold text-green-600 mb-2">Telaffuz Pratiği</h3>
            <p>Gelişmiş yapay zeka ile konuşma becerilerinizi ve telaffuzunuzu mükemmelleştirin.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow flex-1 min-w-[250px] max-w-[350px] mx-auto">
            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">📚</span>
            </div>
            <h3 className="text-lg font-bold text-green-600 mb-2">Geniş Kelime Havuzu</h3>
            <p>Karşılaştığınız yeni kelimeleri kolayca öğrenin ve kalıcı hale getirin.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow flex-1 min-w-[250px] max-w-[350px] mx-auto">
            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">🌍</span>
            </div>
            <h3 className="text-lg font-bold text-green-600 mb-2">Gerçek Dünya İçerikleri</h3>
            <p>Sıkıcı ders kitapları yerine, sevdiğiniz videolar ve podcast'lerle öğrenin.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow flex-1 min-w-[250px] max-w-[350px] mx-auto">
            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">📈</span>
            </div>
            <h3 className="text-lg font-bold text-green-600 mb-2">İlerleme Takibi</h3>
            <p>Gelişiminizi adım adım takip edin ve motivasyonunuzu yüksek tutun.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow flex-1 min-w-[250px] max-w-[350px] mx-auto">
            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">🕒</span>
            </div>
            <h3 className="text-lg font-bold text-green-600 mb-2">Esnek ve Erişilebilir</h3>
            <p>İstediğiniz zaman, istediğiniz yerden öğrenme özgürlüğünün tadını çıkarın.</p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials section py-12 px-4 bg-[#e9f5ee] text-center">
        <h2 className="text-3xl font-bold mb-8">Kullanıcılarımız Ne Diyor?</h2>
        <div className="max-w-xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <p className="italic text-[#555]">"LingRoot sayesinde daha önce anlamakta zorlandığım videoları bile kendi seviyemde izleyebiliyorum. Aynı içeriği farklı seviyelerde dinlemek inanılmaz faydalı!"</p>
            <span className="block text-right font-bold mt-2 text-[#333]">- Ayşe K.</span>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="italic text-[#555]">"İngilizce öğrenmek hiç bu kadar keyifli olmamıştı. Özellikle 6 seviyeli video özelliği harika bir fikir. Kesinlikle tavsiye ederim."</p>
            <span className="block text-right font-bold mt-2 text-[#333]">- Mehmet Y.</span>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="section final-cta py-12 px-4 text-center">
        <h2 className="text-3xl font-bold mb-4">İngilizce Öğrenme Yolculuğunuza Bugün Başlayın!</h2>
        <p className="mb-6">LingRoot'un benzersiz özelliklerini keşfedin ve İngilizce hedeflerinize daha hızlı ulaşın.</p>
        <Link href="/register" className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded font-bold text-lg transition">Hemen Kayıt Ol ve Ücretsiz Dene!</Link>
      </section>

      {/* Footer */}
      <footer className="bg-[#333] text-white text-center py-8">
        <p className="mb-2">&copy; 2025 LingRoot. Tüm hakları saklıdır.</p>
        <p>
          <a href="#privacy" className="text-green-500 hover:underline">Gizlilik Politikası</a> |
          <a href="#terms" className="text-green-500 hover:underline mx-2">Kullanım Şartları</a> |
          <a href="#contact" className="text-green-500 hover:underline">İletişim</a>
        </p>
      </footer>
    </div>
  );
}