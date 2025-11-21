import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Footer from '../src/components/Footer';

export default function About() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Head>
        <title>Hakkımızda | LingRoot</title>
        <meta name="description" content="LingRoot'un hikayesi, misyonu ve vizyonu. Teknoloji destekli dil öğrenme yaklaşımımızla İngilizce öğrenimi hayatınızın doğal bir parçası oluyor." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/lingroot-icon.svg" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>
      
      {/* Header - Ana sayfa stilinde */}
      <header className="fixed w-full py-3 px-4 sm:px-6 flex justify-between items-center z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 text-primary border border-primary/20">
            <span className="font-bold text-lg">LR</span>
          </div>
          <span className="font-bold text-xl text-primary">
            LingRoot
          </span>
        </Link>
        
        <nav className="hidden md:flex items-center space-x-6">
          <Link href="/about" className="text-primary hover:text-primary/80 font-medium transition-colors">
            Hakkımızda
          </Link>
          <Link href="/nasil-calisir" className="text-gray-600 hover:text-gray-700 font-medium transition-colors">
            Nasıl Çalışır?
          </Link>
          <Link href="/ozellikler" className="text-gray-600 hover:text-gray-700 font-medium transition-colors">
            Özellikler
          </Link>
          <Link href="/fiyatlandirma" className="text-gray-600 hover:text-gray-700 font-medium transition-colors">
            Fiyatlandırma
          </Link>
          <Link href="/blog" className="text-gray-600 hover:text-gray-700 font-medium transition-colors">
            Blog
          </Link>
        </nav>

        <div className="flex items-center space-x-3">
          <Link href="/login" className="text-gray-600 hover:text-gray-700 font-medium transition-colors">
            Giriş Yap
          </Link>
          <Link href="/register" 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-lg">
            Ücretsiz Başla
          </Link>
        </div>
      </header>

      <main className="flex-grow pt-20">
        {/* Hero Section */}
        <section className="py-16 px-6">
          <div className="max-w-6xl mx-auto text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
              LingRoot Hakkında
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              Hikayemiz
            </h1>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Teknoloji ile dil öğrenme deneyimini kökten değiştirmek için kurulmuş yenilikçi platform.
            </p>
            <div className="mt-8 flex justify-center">
              <div className="px-6 py-3 bg-muted rounded-full border border-primary/10">
                <span className="text-primary font-semibold">
                  "İngilizce öğrenmek için hayatını değiştirmene gerek yok – dinlemeye devam et"
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Main Story Section */}
        <section className="py-16 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                  Bizim <span className="text-primary">Hikayemiz</span>
                </h2>
                <div className="space-y-4 text-gray-600 leading-relaxed">
                  <p>
                    LingRoot, teknolojiyi kullanarak dil öğrenme deneyimini kökten değiştirmek amacıyla kurulmuş yenilikçi bir platformdur. 
                    Misyonumuz, kullanıcıların İngilizce öğrenmek için günlük hayatlarından ödün vermeden, sevdikleri içeriklerle pratik yapabilmelerini sağlamaktır.
                  </p>
                  <p>
                    Bu doğrultuda LingRoot, YouTube videoları, podcast'ler, blog yazıları gibi zaten ilgiyle takip ettiğiniz içerikleri alır ve 
                    bunları seçtiğiniz İngilizce seviyesine uygun hale getirir. Bunu yaparken yapay zekâ destekli dil işleme teknolojileri kullanarak 
                    içerikleri sadeleştirir, text-to-speech ile seslendirir ve altyazı ekleyerek öğreniminizi kolaylaştırır.
                  </p>
                  <p>
                    LingRoot ekibi olarak inanıyoruz ki dijital çağın sunduğu olanaklar sayesinde, dil öğrenmek bir ders ya da zorunluluk olmaktan çıkıp 
                    hayatın içine entegre edilebilir. Kullanıcılarımıza değer katmak için sürekli çalışıyor, gerçek dünyadan içerikleri 
                    kişiselleştirilmiş bir öğrenme deneyimine dönüştürüyoruz.
                  </p>
                </div>
              </div>
              <div className="relative">
                <div className="bg-muted rounded-2xl p-8 border border-border">
                  <div className="bg-white rounded-xl p-6 shadow-lg">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-primary ml-3">2025</h3>
                    </div>
                    <p className="text-gray-600">
                      İstanbul merkezli olarak yola çıktık ve o günden beri kullanıcılarımızın geri bildirimleriyle platformumuzu sürekli geliştiriyoruz.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="py-16 px-6 bg-muted">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Misyon & <span className="text-primary">Vizyon</span>
              </h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl p-8 shadow-lg border-l-4 border-primary/20">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 ml-4">Misyonumuz</h3>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  Sevdiğiniz içerikleri kullanarak, hayat tarzınızı değiştirmeden İngilizcenizi geliştirme imkânı sunmak. 
                  Bunu en yeni teknolojileri kullanarak, her seviyeden kullanıcıya uygun, kişiselleştirilmiş ve erişilebilir 
                  bir öğrenme deneyimi ile gerçekleştirmek.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg border-l-4 border-primary/20">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 ml-4">Vizyonumuz</h3>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  İngilizce başta olmak üzere yabancı dil öğrenimini tüm dünyada insanlar için günlük yaşamın doğal bir parçası haline getirmek. 
                  Teknoloji odaklı yaklaşımımızla, dil bariyerlerini ortadan kaldırarak bireylerin bilgiye ve iletişime engelsiz erişebildiği bir gelecek yaratmayı hedefliyoruz.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Why We Started */}
        <section className="py-16 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Neden <span className="text-primary">LingRoot</span>?
              </h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-red-700 mb-3">Problem</h3>
                <p className="text-red-600 text-sm">
                  Yoğun iş veya okul hayatı olan pek çok kişinin, ek dil öğrenme seanslarına zaman ayırmakta zorlanması
                </p>
              </div>

              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border border-yellow-200">
                <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-yellow-700 mb-3">Fırsat</h3>
                <p className="text-yellow-600 text-sm">
                  Gerçek dünyadan içeriklerle öğrenmenin hem daha eğlenceli hem de daha etkili olduğu bilgisi
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-green-700 mb-3">Çözüm</h3>
                <p className="text-green-600 text-sm">
                  Dil öğrenme sürecini günlük alışkanlıklarla birleştirerek kalıcı ve motive edici bir deneyim sunmak
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-16 px-6 bg-muted">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Temel <span className="text-primary">Değerlerimiz</span>
              </h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white rounded-xl p-8 shadow-lg text-center hover:shadow-xl transition-shadow">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Şeffaflık</h3>
                <p className="text-gray-600">
                  Kullanıcılarımızla her zaman açık ve dürüst iletişim kuruyoruz. Süreçlerimiz ve verileriniz hakkında tam şeffaflık sağlıyoruz.
                </p>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-lg text-center hover:shadow-xl transition-shadow">
                <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Yenilikçilik</h3>
                <p className="text-gray-600">
                  En yeni teknolojileri takip ederek, dil öğrenme deneyimini sürekli geliştiren çözümler sunuyoruz.
                </p>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-lg text-center hover:shadow-xl transition-shadow">
                <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Kullanıcı Odaklılık</h3>
                <p className="text-gray-600">
                  Her karar ve geliştirmede kullanıcı deneyimini merkeze alıyor, ihtiyaçlarınızı önceleyerek hareket ediyoruz.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Security & Trust */}
        <section className="py-16 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="bg-muted rounded-2xl p-12 border border-border">
              <div className="text-center">
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                  Güvenlik ve <span className="text-primary">Gizlilik</span>
                </h2>
                <p className="text-gray-600 text-lg leading-relaxed max-w-4xl mx-auto">
                  LingRoot, kullanıcı güvenliği ve gizliliğini ön planda tutan profesyonel bir yaklaşıma sahiptir. 
                  Platformumuzda yaptığınız tüm işlemler ve paylaştığınız veriler, uluslararası standartlarda korunur. 
                  Verilerinizin güvenliği bizim için bir öncelik değil, vazgeçilmez bir gerekliliktir.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-16 px-6 bg-slate-900 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6">
              LingRoot – We're Rooting for You!
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Dil öğrenme yolculuğunuzda size kökünden (Root'tan) destek olmayı sürdüreceğiz. 
              Siz de bu yolculukta bize katılarak İngilizce öğreniminin ne kadar keyifli olabileceğini keşfedin.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register" 
                className="px-8 py-4 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-colors shadow-lg">
                Hemen Başla
              </Link>
              <Link href="/nasil-calisir" 
                className="px-8 py-4 border border-white text-white rounded-lg font-bold hover:bg-white hover:text-foreground transition-colors">
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