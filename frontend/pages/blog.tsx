import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Footer from '../src/components/Footer';

export default function Blog() {
  const [selectedArticle, setSelectedArticle] = useState(null);

  const articles = [
    {
      id: 1,
      title: "İngilizce Dinleme Becerisinin Önemi",
      summary: "İngilizce öğrenirken dinleme becerisinin neden kritik olduğunu ve telaffuz geliştirmeden kelime dağarcığı genişletmeye kadar nasıl etkili olduğunu keşfedin.",
      readTime: "5 dakika",
      category: "Dil Öğrenimi",
      content: `
        <p>İngilizce öğrenirken dört temel beceri (okuma, yazma, konuşma, dinleme) arasında çoğu zaman arka planda kaldığı düşünülen dinleme becerisi aslında bir dilin olmazsa olmaz yapı taşlarından biridir. Dil öğrenme sürecinin başlangıcından itibaren, tıpkı bir bebeğin anadilini çevresini dinleyerek öğrenmesi gibi, ikinci dil ediniminde de dinleme yoluyla anlamlı girdiye maruz kalmak kritik rol oynar.</p>

        <p>Uzmanlar, dinleme becerisinin dil öğrenmede son derece önemli olduğunu vurguluyor. Hatta dil edinimi teorisyeni Stephen Krashen, tüm koşullar mükemmel bile olsa yeterli dinleme yoluyla girdi almayan birinin dili gerçek anlamda edinip konuşamayacağını ifade etmiştir. Yani, ne kadar çok dinler ve anlarsanız, o kadar iyi konuşursunuz.</p>

        <h3>Peki dinleme neden bu kadar kritik?</h3>

        <p>Öncelikle, dinleme dili kullanmanın temelidir. Konuşma becerisi, büyük ölçüde iyi bir dinleyici olmanın üzerine inşa edilir. Kendi anadilimizde bile önce etrafımızdaki insanları dinleyerek kelimeleri, telaffuzları ve cümle yapılarını öğreniriz. İkinci dilde de durum farklı değil: Dinleme, telaffuzunuzu geliştirmede, kelime dağarcığınızı genişletmede ve hatta doğru gramer kullanımını içselleştirmede doğrudan etkili olur.</p>

        <p>Yapılan araştırmalar, konuşma ve dinlemenin birbiriyle sıkı bağlarını ortaya koymuştur. Örneğin, "konuşma ediniminde ve gelişiminde dinlemenin rolü çok büyüktür… her yaşta dinleme becerisinin etkin kullanımı önemlidir" ifadesi bu bağı net bir şekilde anlatmaktadır. Yani sadece çocuklukta değil, yetişkinlikte de dinleme odaklı çalışmak dil gelişiminin vazgeçilmez bir parçasıdır.</p>

        <h3>Anlamaya Dayalı Öğrenme</h3>

        <p>İngilizce dinleme becerisini geliştirmek, aynı zamanda anlamaya dayalı öğrenme yaklaşımının da temelini oluşturur. Birçok dilbilimciye göre (Krashen'in "anlaşılabilir girdi" kuramı buna örnek gösterilebilir), insanlar dili en iyi, içeriği genel hatlarıyla anladıkları koşullarda, duydukları ve okudukları mesajlar sayesinde öğrenirler.</p>

        <p>Bu nedenle, seviyenize uygun materyaller dinlemek çok önemlidir. Zorlayıcı olmayan, anlaşılabilir seviyedeki sesli içerikler, beyninizin dili doğal olarak özümsediği bir ortam yaratır. Bu da stres olmadan, neredeyse farkına varmadan öğrenme anlamına gelir.</p>

        <p><strong>Sonuç olarak, İngilizce dinleme becerisi bir lüks değil, gerekliliktir.</strong> Dil öğrenme yolculuğunuzda dinlemeye ne kadar çok yer ayırırsanız, diğer becerilerinizin de o denli hızlı ve sağlam ilerlediğini göreceksiniz. Unutmayın, önce iyi bir dinleyici olun ki iyi bir konuşmacı olabilesiniz.</p>
      `
    },
    {
      id: 2,
      title: "Odaklanarak Dinlemenin Dili Öğrenmeye Katkısı",
      summary: "Pasif dinleme ile aktif dinleme arasındaki farkları öğrenin ve odaklı dinleme tekniklerinin dil öğrenme sürecinize nasıl çarpıcı katkılar sağladığını keşfedin.",
      readTime: "6 dakika",
      category: "Öğrenme Teknikleri",
      content: "Article content will be added here..."
    },
    {
      id: 3,
      title: "Günlük Yaşantıya Entegre Edilmiş Dil Öğreniminin Faydaları",
      summary: "Yabancı dil öğrenmeyi günlük rutininize nasıl entegre edebileceğinizi ve bu yaklaşımın geleneksel yöntemlere göre hangi avantajları sunduğunu öğrenin.",
      readTime: "7 dakika",
      category: "Yaşam Tarzı",
      content: "Article content will be added here..."
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white font-['Roboto',sans-serif]">
      <Head>
        <title>Blog | LingRoot</title>
        <meta name="description" content="LingRoot Blog'da İngilizce öğrenme ipuçları, dinleme becerileri ve dil öğrenimini günlük hayata entegre etme yolları hakkında derinlemesine yazılar bulabilirsiniz." />
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
        
        <div className="flex items-center space-x-5">
          <Link href="/about" className="text-gray-700 hover:text-gray-900 font-medium">
            Hakkımızda
          </Link>
          <Link href="/nasil-calisir" className="text-gray-700 hover:text-gray-900 font-medium">
            Nasıl Çalışır?
          </Link>
          <Link href="/ozellikler" className="text-gray-700 hover:text-gray-900 font-medium">
            Özellikler
          </Link>
          <Link href="/fiyatlandirma" className="text-gray-700 hover:text-gray-900 font-medium">
            Fiyatlandırma
          </Link>
          <Link href="/blog" className="text-[#28a745] hover:text-[#218838] font-medium">
            Blog
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
        {/* Hero Section */}
        <section className="py-16 bg-gradient-to-b from-[#f1f9ee] to-white">
          <div className="max-w-6xl mx-auto px-6 text-center">
            <h1 className="text-5xl font-['Nunito',sans-serif] font-bold text-[#333333] mb-6">
              LingRoot <span className="text-[#28a745]">Blog</span>
            </h1>
            <p className="text-xl text-gray-700 max-w-4xl mx-auto leading-relaxed">
              Dil öğrenme serüveninize ışık tutacak ipuçları, bilimsel bulgular ve motivasyon verici yaklaşımlar. 
              Özellikle İngilizce dinleme becerisi ve bunu günlük hayatınıza entegre etmenin yolları üzerine odaklanan içeriklerimizle, 
              teknoloji destekli dil öğrenimi konusunda ufkunuzu genişletebilirsiniz.
            </p>
          </div>
        </section>

        {/* Blog Articles */}
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-['Nunito',sans-serif] font-bold text-[#333333] mb-6">
                İngilizce Öğrenme <span className="text-[#28a745]">Rehberiniz</span>
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Amacımız, bir yandan LingRoot'un benimsediği yaklaşımları anlatmak, diğer yandan da genel olarak dil eğitimine dair faydalı bilgiler sunmaktır.
              </p>
            </div>

            <div className="grid md:grid-cols-1 lg:grid-cols-1 gap-8">
              {articles.map((article) => (
                <article key={article.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="p-8">
                    <div className="flex items-center mb-4">
                      <span className="inline-block px-3 py-1 bg-[#28a745]/10 text-[#28a745] rounded-full text-sm font-medium">
                        {article.category}
                      </span>
                      <span className="ml-3 text-gray-500 text-sm flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {article.readTime}
                      </span>
                    </div>
                    
                    <h2 className="text-2xl font-['Nunito',sans-serif] font-bold text-[#333333] mb-4 hover:text-[#28a745] transition-colors">
                      {article.title}
                    </h2>
                    
                    <p className="text-gray-600 mb-6 leading-relaxed">
                      {article.summary}
                    </p>
                    
                    <button className="inline-flex items-center px-6 py-3 bg-[#28a745] text-white rounded-lg font-medium hover:bg-[#218838] transition-colors">
                      Devamını Oku
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-16 bg-gradient-to-r from-[#28a745] to-[#20c997] text-white">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-4xl font-['Nunito',sans-serif] font-bold mb-6">
              Teoriden Pratiğe Geçin!
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Blog yazılarımızda öğrendiklerinizi LingRoot ile uygulayın. 
              Sevdiğiniz içerikleri dinleyerek İngilizce öğrenme deneyiminizi hemen başlatın.
            </p>
            <div className="space-x-4">
              <Link href="/register" className="inline-block px-8 py-4 bg-white text-[#28a745] rounded-lg font-bold hover:bg-gray-100 transition-colors">
                Hemen Başla
              </Link>
              <Link href="/nasil-calisir" className="inline-block px-8 py-4 border border-white text-white rounded-lg font-bold hover:bg-white hover:text-[#28a745] transition-colors">
                Nasıl Çalıştığını Öğren
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
} 