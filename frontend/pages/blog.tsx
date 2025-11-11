import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Footer from '../src/components/Footer';

export default function Blog() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Head>
        <title>Blog | LingRoot</title>
        <meta name="description" content="LingRoot Blog'da İngilizce öğrenme ipuçları bulabilirsiniz." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/lingroot-icon.svg" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>
      
      {/* Header */}
      <header className="fixed w-full py-4 px-4 sm:px-6 flex justify-between items-center z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <Link href="/" className="flex items-center space-x-4">
          <div className="w-12 h-12 relative flex-shrink-0">
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
          <span className="font-extrabold text-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent tracking-tight whitespace-nowrap">
            LingRoot
          </span>
        </Link>
        
        <nav className="hidden lg:flex items-center space-x-6 xl:space-x-8">
          <Link href="/about" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200 whitespace-nowrap">
            Hakkımızda
          </Link>
          <Link href="/nasil-calisir" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200 whitespace-nowrap">
            Nasıl Çalışır?
          </Link>
          <Link href="/ozellikler" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200 whitespace-nowrap">
            Özellikler
          </Link>
          <Link href="/fiyatlandirma" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200 whitespace-nowrap">
            Fiyatlandırma
          </Link>
          <Link href="/blog" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors duration-200 whitespace-nowrap">
            Blog
          </Link>
        </nav>

        <div className="flex items-center space-x-3 lg:space-x-4">
          <Link href="/login" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200 whitespace-nowrap">
            Giriş Yap
          </Link>
          <Link href="/register" 
            className="px-4 lg:px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 whitespace-nowrap text-sm lg:text-base">
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
              İngilizce Öğrenme Rehberi
            </div>
            <h1 className="text-4xl md:text-7xl font-extrabold text-white mb-8 tracking-tight">
              LingRoot <span className="text-blue-200">Blog</span>
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-4xl mx-auto leading-relaxed">
              Dil öğrenme serüveninize ışık tutacak ipuçları, bilimsel bulgular ve motivasyon verici yaklaşımlar.
            </p>
          </div>
        </section>

        {/* Blog Intro */}
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 border border-gray-100">
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
                LingRoot Blog'a hoş geldiniz! Burada, dil öğrenme serüveninize ışık tutacak ipuçları, bilimsel bulgular ve motivasyon verici hikâyeler paylaşacağız. Özellikle İngilizce dinleme becerisi ve bunu günlük hayatınıza entegre etmenin yolları üzerine odaklanan içeriklerimizle, teknoloji destekli dil öğrenimi konusunda ufkunuzu genişletebilirsiniz.
              </p>
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed mt-6">
                Amacımız, bir yandan LingRoot'un benimsediği yaklaşımları anlatmak, diğer yandan da genel olarak dil eğitimine dair faydalı bilgiler sunmaktır. Aşağıda, İngilizce öğrenirken işinize yarayacak üç ayrı blog yazımızı bulabilirsiniz. Keyifli okumalar!
              </p>
            </div>
          </div>
        </section>

        {/* Blog Articles */}
        <section className="py-16 px-6 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="grid gap-8 md:gap-12">
              
              {/* Article 1 */}
              <article className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                <div className="p-8 md:p-12">
                  <div className="flex items-center mb-6">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                    <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">Dil Öğrenme</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                    İngilizce Dinleme Becerisinin Önemi
                  </h2>
                  <div className="prose prose-lg max-w-none text-gray-700">
                    <p className="mb-6">
                      İngilizce öğrenirken dört temel beceri (okuma, yazma, konuşma, dinleme) arasında çoğu zaman arka planda kaldığı düşünülen dinleme becerisi aslında bir dilin olmazsa olmaz yapı taşlarından biridir. Dil öğrenme sürecinin başlangıcından itibaren, tıpkı bir bebeğin anadilini çevresini dinleyerek öğrenmesi gibi, ikinci dil ediniminde de dinleme yoluyla anlamlı girdiye maruz kalmak kritik rol oynar.
                    </p>
                    <p className="mb-6">
                      Uzmanlar, dinleme becerisinin dil öğrenmede son derece önemli olduğunu vurguluyor. Hatta dil edinimi teorisyeni Stephen Krashen, tüm koşullar mükemmel bile olsa yeterli dinleme yoluyla girdi almayan birinin dili gerçek anlamda edinip konuşamayacağını ifade etmiştir. Yani, ne kadar çok dinler ve anlarsanız, o kadar iyi konuşursunuz.
                    </p>
                    
                    <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Dinleme Neden Bu Kadar Kritik?</h3>
                    <p className="mb-6">
                      Öncelikle, dinleme dili kullanmanın temelidir. Konuşma becerisi, büyük ölçüde iyi bir dinleyici olmanın üzerine inşa edilir. Kendi anadilimizde bile önce etrafımızdaki insanları dinleyerek kelimeleri, telaffuzları ve cümle yapılarını öğreniriz. İkinci dilde de durum farklı değil: Dinleme, telaffuzunuzu geliştirmede, kelime dağarcığınızı genişletmede ve hatta doğru gramer kullanımını içselleştirmede doğrudan etkili olur.
                    </p>
                    
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-6 my-8">
                      <p className="text-blue-800 font-medium">
                        "Konuşma ediniminde ve gelişiminde dinlemenin rolü çok büyüktür… her yaşta dinleme becerisinin etkin kullanımı önemlidir."
                      </p>
                    </div>
                    
                    <p className="mb-6">
                      İngilizce dinleme becerisini geliştirmek, aynı zamanda anlamaya dayalı öğrenme yaklaşımının da temelini oluşturur. Birçok dilbilimciye göre (Krashen'in "anlaşılabilir girdi" kuramı buna örnek gösterilebilir), insanlar dili en iyi, içeriği genel hatlarıyla anladıkları koşullarda, duydukları ve okudukları mesajlar sayesinde öğrenirler.
                    </p>
                    
                    <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Pratik Faydalar</h3>
                    <p className="mb-6">
                      Ayrıca, dinleme becerisinin gelişmiş olması, iletişim kazalarını da önler. Karşınızdaki kişiyi doğru anlamak, doğru yanıt vermenin ilk adımıdır. İngilizce gibi telaffuzun yazılıştan farklı olabildiği bir dilde, kulağınızı eğitmek yanlış anlamaları en aza indirir. Örneğin, "thought" ve "taught" gibi benzer duyulan kelimelerin ayrımını, ancak kulak aşinalığınız varsa hızlıca yapabilirsiniz.
                    </p>
                    
                    <p className="mb-6">
                      İyi bir dinleyici olmak, aynı zamanda kültürel nüansları da yakalamanızı sağlar; ses tonlarındaki duygu, vurgu ve imaları anlamlandırabilirsiniz.
                    </p>
                    
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg mt-8">
                      <p className="text-lg font-semibold">
                        Sonuç olarak, İngilizce dinleme becerisi bir lüks değil, gerekliliktir. Dil öğrenme yolculuğunuzda dinlemeye ne kadar çok yer ayırırsanız, diğer becerilerinizin de o denli hızlı ve sağlam ilerlediğini göreceksiniz.
                      </p>
                    </div>
                  </div>
                </div>
              </article>

              {/* Article 2 */}
              <article className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                <div className="p-8 md:p-12">
                  <div className="flex items-center mb-6">
                    <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                    <span className="text-purple-600 font-semibold text-sm uppercase tracking-wider">Öğrenme Teknikleri</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                    Odaklanarak Dinlemenin Dili Öğrenmeye Katkısı
                  </h2>
                  <div className="prose prose-lg max-w-none text-gray-700">
                    <p className="mb-6">
                      Günümüzde birçok kişi İngilizce podcast'leri arka planda dinleyerek veya İngilizce müzikleri "kulak dolgunluğu olsun" diye sürekli açık tutarak dil pratiği yapmaya çalışıyor. Peki, bu pasif dinleme ne kadar etkili? Pasif dinleme elbette faydalıdır; yabancı dile maruziyeti artırır. Ancak, amaç dil becerilerimizi geliştirmekse odaklanarak dinleme çok daha büyük bir fark yaratır.
                    </p>
                    
                    <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Aktif vs Pasif Dinleme</h3>
                    <p className="mb-6">
                      Odaklanarak (ya da "aktif") dinleme, duyduğunuz içeriğe tüm dikkatinizi vermek, gerektiğinde not almak, bilinçli bir şekilde anlamaya çalışmak demektir. Bu yaklaşım, dili öğrenme sürecinde pasif dinlemeye kıyasla daha kısa sürede daha kalıcı ilerleme sağlar.
                    </p>
                    
                    <div className="bg-purple-50 rounded-lg p-6 my-8">
                      <h4 className="text-lg font-bold text-purple-900 mb-3">Odaklı Dinlemenin Faydaları:</h4>
                      <ul className="space-y-2 text-purple-800">
                        <li>• İşitsel algıyı geliştirir</li>
                        <li>• Telaffuz farklarını yakalama yeteneği kazandırır</li>
                        <li>• Tonlama ve vurgu noktalarını anlama becerisini artırır</li>
                        <li>• Karmaşık konuşmaları çözümleme kapasitesini güçlendirir</li>
                      </ul>
                    </div>
                    
                    <p className="mb-6">
                      Düzenli ve planlı şekilde odaklanarak dinleme egzersizleri yapmak, kulak alışkanlığı kazanmanın en etkili yollarından biridir. Uzmanların önerisi, her gün belirli bir süreyi (örneğin 20-30 dakikayı) sadece dinlemeye ayırmaktır. Bu süre zarfında dış dikkat dağıtıcıları bir kenara bırakıp tüm konsantrasyonla İngilizce bir içeriğe yoğunlaşmak, kısa zamanda önemli gelişmeler sağlar.
                    </p>
                    
                    <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Pratik Uygulama Önerileri</h3>
                    <p className="mb-6">
                      Odaklanarak dinlemenin bir diğer faydası da aktif öğrenmeyi tetiklemesidir. Pasif dinlemede arka planda çalan bir İngilizce konuşma size dilsel bir ortam sağlar ancak çoğu zaman beyninizin yalnızca bir kısmı bu sürece katılır. Aktif dinlemede ise beyin dilsel uyarana tam kapasiteyle odaklanır.
                    </p>
                    
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 my-8">
                      <h4 className="text-lg font-bold text-gray-900 mb-3">Aktif Dinleme Teknikleri:</h4>
                      <ul className="space-y-3 text-gray-700">
                        <li>🎯 Not alma ve anahtar kelimeleri yakalama</li>
                        <li>🎯 Konuşmacının vurguladığı noktaları belirleme</li>
                        <li>🎯 Her fikirden sonra "Ben bunu anladım mı?" diye sorgulama</li>
                        <li>🎯 Ana fikri özetleme pratiği yapma</li>
                      </ul>
                    </div>
                    
                    <p className="mb-6">
                      Odak ve tekrar ikilisi, dil öğreniminde mucizeler yaratabilir. Odaklanarak dinlediğiniz bir parçayı birkaç gün arayla tekrar dinlemek, ilk sefer kaçırdığınız incelikleri yakalamanızı sağlar. İlk dinleyişte anlamlandıramadığınız bir ifadeyi, ikinci dinleyişte "aha!" diyerek çözebilirsiniz.
                    </p>
                    
                    <div className="bg-gradient-to-r from-purple-500 to-blue-600 text-white p-6 rounded-lg mt-8">
                      <p className="text-lg font-semibold">
                        LingRoot platformu, odaklanarak dinleme pratiğinizi desteklemek için size altyazı, yavaşlatma, tekrar oynatma gibi araçlar sunuyor. Bu araçlar, dikkatinizi toplamanız ve içeriği tamamen kavramanız için tasarlandı.
                      </p>
                    </div>
                  </div>
                </div>
              </article>

              {/* Article 3 */}
              <article className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                <div className="p-8 md:p-12">
                  <div className="flex items-center mb-6">
                    <div className="w-3 h-3 bg-teal-500 rounded-full mr-3"></div>
                    <span className="text-teal-600 font-semibold text-sm uppercase tracking-wider">Yaşam Tarzı</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                    Günlük Yaşantıya Entegre Edilmiş Dil Öğreniminin Faydaları
                  </h2>
                  <div className="prose prose-lg max-w-none text-gray-700">
                    <p className="mb-6">
                      Bir yabancı dili öğrenmenin en etkili yollarından biri, o dili hayatımızın bir parçası haline getirmektir. Yani dili, sınıfın veya ders kitabının sınırlarından çıkarıp günlük rutinimize dahil etmek... Günlük yaşantıya entegre edilmiş dil öğrenimi, geleneksel yöntemlere göre çok daha sürdürülebilir ve doğal bir ilerleme sağlar.
                    </p>
                    
                    <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Artan Maruz Kalma</h3>
                    <p className="mb-6">
                      İlk olarak, yabancı dile maruziyetiniz çarpıcı biçimde artar. Her gün yaptığınız aktiviteleri hedef dilde yapmak, farkında olmadan dil becerilerinizi geliştirmenize yol açar. Örneğin, sabah haberlerinizi İngilizce bir siteden okumak, işe giderken podcast'leri İngilizce dinlemek, boş vakitlerinizde sevdiğiniz diziyi İngilizce altyazıyla izlemek gibi alışkanlıklar sayesinde dil pratiğiniz kesintisiz hale gelir.
                    </p>
                    
                    <div className="bg-teal-50 rounded-lg p-6 my-8">
                      <h4 className="text-lg font-bold text-teal-900 mb-3">Günlük Entegrasyon Örnekleri:</h4>
                      <div className="grid md:grid-cols-2 gap-4 text-teal-800">
                        <div>
                          <p className="font-semibold">Sabah Rutini:</p>
                          <p>• İngilizce haber siteleri</p>
                          <p>• İngilizce podcast'ler</p>
                          <p>• İngilizce müzik</p>
                        </div>
                        <div>
                          <p className="font-semibold">Eğlence Zamanı:</p>
                          <p>• İngilizce altyazılı diziler</p>
                          <p>• İngilizce YouTube kanalları</p>
                          <p>• İngilizce oyunlar</p>
                        </div>
                      </div>
                    </div>
                    
                    <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Kalıcılık ve Pekişme</h3>
                    <p className="mb-6">
                      Bu entegrasyonun bir diğer faydası, öğrenmenin kalıcılığını artırmasıdır. Yeni öğrendiğiniz kelimeleri veya dilbilgisi yapılarını günlük hayatınızda gerçek bağlamlar içinde kullanmaya başladığınızda, bunlar kısa süreli hafızadan uzun süreli hafızaya geçmeye başlar.
                    </p>
                    
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-6 my-8">
                      <p className="text-blue-800 font-medium">
                        "Use it or lose it" (kullan ya da kaybet) prensibi: Günlük kullanım, öğrendiklerinizi taze tutar ve unutulma ihtimalini azaltır.
                      </p>
                    </div>
                    
                    <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Zaman Verimliliği</h3>
                    <p className="mb-6">
                      Dil öğrenimini günlük yaşama yaymanın belki de en güzel tarafı, fazladan zaman ayırma zorunluluğunu ortadan kaldırmasıdır. Yoğun bir programınız olsa bile, zaten yaptığınız işlerle dil pratiğini birleştirebilirsiniz.
                    </p>
                    
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 my-8">
                      <h4 className="text-lg font-bold text-gray-900 mb-3">Multitasking Örnekleri:</h4>
                      <ul className="space-y-2 text-gray-700">
                        <li>🏠 Ev işi yaparken İngilizce radyo dinleme</li>
                        <li>🏃‍♂️ Spor yaparken İngilizce podcast'ler</li>
                        <li>🚗 Yolculuk esnasında İngilizce müzik</li>
                        <li>🍳 Yemek yaparken İngilizce YouTube kanalları</li>
                      </ul>
                    </div>
                    
                    <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Motivasyon ve Sürdürülebilirlik</h3>
                    <p className="mb-6">
                      Günlük entegrasyon aynı zamanda motivasyonu yüksek tutar. Haftada bir yapılan uzun dil çalışma seanslarındansa, her gün biraz biraz yapılan pratikler çok daha motive edicidir. Her gün küçük bir başarı hissi yaşarsınız: Bugün de bir şeyler öğrendim, bugün de İngilizceye dokundum dersiniz.
                    </p>
                    
                    <p className="mb-6">
                      Bu sürekli temas, dil öğrenme sürecini bir görev olmaktan çıkarır, yaşam tarzınızın bir parçası yapar. Örneğin, sabah işe giderken 15 dakika İngilizce dinleme yapmak bir süre sonra alışkanlık olacak ve aksattığınız gün kendinizi eksik hissedeceksiniz.
                    </p>
                    
                    <div className="bg-gradient-to-r from-teal-500 to-blue-600 text-white p-6 rounded-lg mt-8">
                      <p className="text-lg font-semibold mb-2">
                        LingRoot'un Felsefesi:
                      </p>
                      <p>
                        "İngilizce öğrenmek için hayatınızı değiştirmeyin, hayatınıza İngilizceyi dahil edin."
                      </p>
                      <p className="mt-4 text-sm opacity-90">
                        Küçük günlük adımlar, uzun vadede büyük dilsel sıçramalara dönüşebilir!
                      </p>
                    </div>
                  </div>
                </div>
              </article>

            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-20 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-8">
              Hemen Başlayın!
            </h2>
            <p className="text-xl md:text-2xl mb-12 text-blue-100">
              Bu yazılarda bahsettiğimiz teknikleri LingRoot ile pratiğe dökün. İngilizce öğrenmek için hayatınızı değiştirmenize gerek yok!
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link href="/register" className="inline-flex items-center px-8 py-4 bg-white text-blue-600 rounded-xl font-bold hover:bg-gray-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                Ücretsiz Denemeye Başla
              </Link>
              <Link href="/nasil-calisir" className="inline-flex items-center px-8 py-4 border-2 border-white text-white rounded-xl font-bold hover:bg-white hover:text-blue-600 transition-all duration-200">
                Nasıl Çalışır?
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
