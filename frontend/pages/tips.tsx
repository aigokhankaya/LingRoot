import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Footer from '../src/components/Footer';
import StandardHeader from '../src/components/common/StandardHeader';

export default function Tips() {
  const tips = [
    {
      id: 1,
      category: "Günlük Pratik",
      title: "Her Gün 15 Dakika İngilizce Dinleme",
      description: "Günde 15 dakika odaklanarak İngilizce dinlemek, ayda 7.5 saat pratiğe denk gelir. Bu sürekli maruziyetin etkisi çarpıcıdır.",
      tips: [
        "Sabah kahvenizi içerken kısa bir podcast dinleyin",
        "Öğle molasında İngilizce haberler takip edin", 
        "Akşam yürüyüşü yaparken audio kitap dinleyin",
        "Temizlik yaparken arka planda İngilizce radyo açın"
      ],
      icon: "🎧"
    },
    {
      id: 2,
      category: "Aktif Dinleme",
      title: "Altyazı Tekniğini Doğru Kullanın",
      description: "Altyazıları stratejik olarak kullanarak hem dinleme hem okuma becerinizi geliştirin.",
      tips: [
        "İlk seferinde altyazısız izlemeye çalışın",
        "Anlamadığınız kısımlarda altyazıyı açıp tekrar izleyin",
        "Türkçe altyazı yerine İngilizce altyazı kullanın",
        "Aynı sahneyi farklı altyazı seçenekleriyle karşılaştırın"
      ],
      icon: "📺"
    },
    {
      id: 3,
      category: "Kelime Öğrenme",
      title: "Bağlamsal Kelime Öğrenme",
      description: "Kelimeleri tek tek ezberlemek yerine cümle içinde öğrenmek daha kalıcı hafıza oluşturur.",
      tips: [
        "Yeni kelimeyi içeren cümleyi not alın",
        "O kelimeyi kendi cümlenizde kullanmaya çalışın",
        "Kelimenin farklı anlamlarını aynı videoda arayın",
        "Benzer anlamlı kelimeleri bir arada öğrenin"
      ],
      icon: "📚"
    },
    {
      id: 4,
      category: "Motivasyon",
      title: "İlerlemenizi Görselleştirin",
      description: "Gelişiminizi somut şekilde takip etmek motivasyonunuzu yüksek tutar ve hedefe odaklı kalmanızı sağlar.",
      tips: [
        "Dinlediğiniz içeriklerin süresini kaydedin",
        "Yeni öğrendiğiniz kelimeleri listeye ekleyin",
        "Haftalık olarak aynı içeriği tekrar dinleyip gelişimi fark edin",
        "Aylık olarak daha zor içeriklere geçiş yapmaya çalışın"
      ],
      icon: "📈"
    },
    {
      id: 5,
      category: "Teknoloji",
      title: "Cihazlarınızı İngilizce Yapın",
      description: "Günlük kullandığınız teknolojik cihazları İngilizce dil ayarına alarak pasif öğrenmeyi artırın.",
      tips: [
        "Telefon dilini İngilizceye çevirin",
        "Sosyal medya hesaplarınızı İngilizce takip edin",
        "Google aramaları İngilizce yapın",
        "Harita uygulamasını İngilizce kullanın"
      ],
      icon: "📱"
    },
    {
      id: 6,
      category: "Sosyal Öğrenme",
      title: "İngilizce İçerik Toplulukları",
      description: "Başkalarıyla birlikte öğrenmek hem motivasyonu artırır hem de farklı perspektifler kazandırır.",
      tips: [
        "Discord İngilizce öğrenme sunucularına katılın",
        "Reddit'te İngilizce içerik paylaşan toplulukları takip edin",
        "YouTube yorumlarını İngilizce yazın",
        "İngilizce blog yazılarına yorum yapın"
      ],
      icon: "👥"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Head>
        <title>İngilizce Öğrenme İpuçları | LingRoot</title>
        <meta name="description" content="Günlük hayatınızda uygulayabileceğiniz pratik İngilizce öğrenme ipuçları ve teknikleri ile dil öğrenme sürecinizi hızlandırın." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <StandardHeader />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-b from-blue-50 to-white">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">
              İngilizce Öğrenme <span className="text-blue-600">İpuçları</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Günlük hayatınızda kolayca uygulayabileceğiniz pratik teknikler ve stratejiler ile 
              İngilizce öğrenme sürecinizi hızlandırın. LingRoot kullanıcılarının deneyimlerinden 
              derlenen en etkili yöntemler burada!
            </p>
          </div>
        </section>

        {/* Tips Grid */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {tips.map((tip) => (
                <div key={tip.id} className="bg-white rounded-xl shadow-lg border-none overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="p-8">
                    <div className="flex items-center mb-4">
                      <span className="text-3xl mr-3">{tip.icon}</span>
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                        {tip.category}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                      {tip.title}
                    </h3>
                    
                    <p className="text-gray-600 mb-4 leading-relaxed">
                      {tip.description}
                    </p>
                    
                    <ul className="space-y-2">
                      {tip.tips.map((item, index) => (
                        <li key={index} className="flex items-start">
                          <svg className="w-4 h-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span className="text-gray-600 text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Success Stories */}
        <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Başarı <span className="text-blue-600">Hikayeleri</span>
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                LingRoot kullanıcılarının gerçek deneyimleri ve kazandıkları başarılar
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white rounded-xl p-8 shadow-lg border-none">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    A
                  </div>
                  <div className="ml-3">
                    <h4 className="font-bold text-gray-900">Ahmet K.</h4>
                    <p className="text-sm text-gray-600">Yazılım Geliştirici</p>
                  </div>
                </div>
                <p className="text-gray-600 italic">
                  "3 ayda A2'den B1'e geçtim. Sevdiğim teknoloji podcastlerini dinleyerek hem sektördeki gelişmeleri takip ediyorum hem İngilizce öğreniyorum."
                </p>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-lg border-none">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    Z
                  </div>
                  <div className="ml-3">
                    <h4 className="font-bold text-gray-900">Zeynep M.</h4>
                    <p className="text-sm text-gray-600">Üniversite Öğrencisi</p>
                  </div>
                </div>
                <p className="text-gray-600 italic">
                  "Sınavlara hazırlanırken LingRoot ile Netflix dizilerimi eğitime dönüştürdüm. Hem eğlendim hem öğrendim!"
                </p>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-lg border-none">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    M
                  </div>
                  <div className="ml-3">
                    <h4 className="font-bold text-gray-900">Mehmet S.</h4>
                    <p className="text-sm text-gray-600">İş İnsanı</p>
                  </div>
                </div>
                <p className="text-gray-600 italic">
                  "Yoğun iş temposu arasında günde 20 dakika ayırarak 6 ayda Business English seviyeme ulaştım."
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Start Guide */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Hemen <span className="text-blue-600">Başlayın</span>
              </h2>
              <p className="text-xl text-gray-600">
                İlk hafta için önerimiz: Bu adımları takip ederek dil öğrenme alışkanlığınızı oluşturun
              </p>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 border border-blue-200">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">1. Hafta: Alışkanlık Oluşturma</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">1</span>
                      <span className="text-gray-600">Günde 15 dakikalık dinleme hedefi belirleyin</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">2</span>
                      <span className="text-gray-600">İlgi alanınıza uygun 3-5 İngilizce kanal bulun</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">3</span>
                      <span className="text-gray-600">LingRoot'a kaydolun ve seviyenizi belirleyin</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">4</span>
                      <span className="text-gray-600">İlk içeriğinizi yükleyin ve dinlemeye başlayın</span>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">2. Hafta: Derinleştirme</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">5</span>
                      <span className="text-gray-600">Dinleme sürenizi 25 dakikaya çıkarın</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">6</span>
                      <span className="text-gray-600">Aynı içeriği farklı hızlarda dinleyin</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">7</span>
                      <span className="text-gray-600">Yeni öğrendiğiniz 10 kelimeyi not alın</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">8</span>
                      <span className="text-gray-600">Telefon dilini İngilizceye çevirin</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-4xl font-bold mb-6">
              İpuçlarını Pratiğe Dökün!
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Bu ipuçlarını uygulamak için LingRoot'u kullanın ve 
              sevdiğiniz içeriklerle İngilizce öğrenme yolculuğunuza başlayın.
            </p>
            <div className="space-x-4">
              <Link href="/register" className="inline-block px-8 py-4 bg-white text-blue-600 rounded-lg font-bold hover:bg-gray-100 transition-colors">
                Ücretsiz Deneyin
              </Link>
              <Link href="/nasil-calisir" className="inline-block px-8 py-4 border border-white text-white rounded-lg font-bold hover:bg-white hover:text-blue-600 transition-colors">
                Nasıl Çalıştığını Görün
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
} 