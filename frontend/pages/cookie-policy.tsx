import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Footer from '../src/components/Footer';

export default function CookiePolicy() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Head>
        <title>Çerez Politikası | LingRoot</title>
        <meta name="description" content="LingRoot Çerez Politikası. Web sitemizde kullandığımız çerezler ve amaçları hakkında detaylı bilgiler." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/lingroot-icon.svg" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>
      
      {/* Header */}
      <header className="fixed w-full py-4 px-4 sm:px-6 flex justify-between items-center z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <Link href="/" className="flex items-center space-x-3">
          <img src="/lingroot-icon.svg" alt="LingRoot Logo" className="w-12 h-12 drop-shadow-lg" />
          <span className="font-extrabold text-2xl text-primary tracking-tight">
            LingRoot
          </span>
        </Link>
        
        <nav className="hidden md:flex items-center space-x-8">
          <Link href="/about" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200">
            Hakkımızda
          </Link>
          <Link href="/nasil-calisir" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200">
            Nasıl Çalışır?
          </Link>
          <Link href="/contact" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200">
            İletişim
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
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-medium mb-8">
              <span className="w-2 h-2 bg-white rounded-full mr-2"></span>
              Yasal Belgeler
            </div>
            <h1 className="text-4xl md:text-7xl font-extrabold text-white mb-8 tracking-tight">
              Çerez Politikası
            </h1>
            <p className="text-xl md:text-2xl text-slate-200 max-w-3xl mx-auto leading-relaxed">
              Web sitemizde kullandığımız çerezler ve bu çerezlerin amaçları hakkında şeffaf bilgiler.
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="py-20 px-6 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="prose prose-lg max-w-none">
              
              {/* Son Güncellenme */}
              <div className="mb-12 p-6 bg-primary/5 rounded-2xl border border-primary/20 shadow-lg">
                <p className="text-primary mb-0 font-medium">
                  <strong>Son Güncellenme:</strong> 1 Ocak 2025
                </p>
              </div>

              {/* Giriş */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Çerezler ve <span className="text-primary">Kullanım Amaçları</span>
                </h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  LingRoot olarak, web sitemizi daha işlevsel ve kullanıcı dostu hale getirmek için çerezler kullanıyoruz. 
                  Bu sayfa, hangi çerezleri kullandığımızı ve bunların amaçlarını açıklar.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  Sitemizi kullanmaya devam ederek çerez kullanımını kabul etmiş sayılırsınız. 
                  Çerez tercihlerinizi tarayıcı ayarlarınızdan dilediğiniz zaman değiştirebilirsiniz.
                </p>
              </div>

              {/* Çerez Nedir */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  1. Çerez <span className="text-primary">Nedir?</span>
                </h2>
                
                <div className="bg-muted rounded-xl p-8 border border-border">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-primary mb-3">Çerez Tanımı</h3>
                      <p className="text-gray-700 mb-4">
                        Çerezler, web sitelerinin bilgisayarınızda veya mobil cihazınızda sakladığı küçük metin dosyalarıdır. 
                        Bu dosyalar, web sitesinin işlevselliğini artırmak ve size daha iyi bir deneyim sunmak için kullanılır.
                      </p>
                      <ul className="text-gray-700 space-y-2 text-sm">
                        <li>• Oturum yönetimi ve güvenlik sağlama</li>
                        <li>• Kullanıcı tercihlerini hatırlama</li>
                        <li>• Site performansını analiz etme</li>
                        <li>• Kişiselleştirilmiş içerik sunma</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Çerez Kategorileri */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  2. Kullandığımız <span className="text-primary">Çerez Türleri</span>
                </h2>
                
                <div className="space-y-6">
                  <div className="bg-red-50 rounded-lg p-6 border border-red-200">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center mr-4">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-red-900">🔒 Zorunlu Çerezler</h3>
                        <p className="text-red-700 text-sm">Bu çerezler sitenin çalışması için gereklidir</p>
                      </div>
                    </div>
                    <ul className="text-red-800 space-y-2 text-sm">
                      <li>• <strong>Oturum Çerezleri:</strong> Giriş durumunuzu ve güvenlik tokenlarını saklар</li>
                      <li>• <strong>Güvenlik Çerezleri:</strong> CSRF koruması ve güvenlik kontrolleri</li>
                      <li>• <strong>Load Balancer:</strong> Sunucu yük dengelemesi için teknik çerezler</li>
                    </ul>
                  </div>

                  <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mr-4">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-green-900">⚙️ Fonksiyonel Çerezler</h3>
                        <p className="text-green-700 text-sm">Tercihlerinizi hatırlar ve deneyimi kişiselleştirir</p>
                      </div>
                    </div>
                    <ul className="text-green-800 space-y-2 text-sm">
                      <li>• <strong>Dil Tercihi:</strong> Seçtiğiniz dil ayarını hatırlar</li>
                      <li>• <strong>Tema Seçimi:</strong> Açık/koyu tema tercihlerinizi saklar</li>
                      <li>• <strong>Öğrenme Ayarları:</strong> CEFR seviyesi ve öğrenme tercihleri</li>
                    </ul>
                  </div>

                  <div className="bg-primary/5 rounded-lg p-6 border border-primary/20">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mr-4">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-primary">📊 Analitik Çerezler</h3>
                        <p className="text-gray-600 text-sm">Site kullanımını analiz eder ve performansı ölçer</p>
                      </div>
                    </div>
                    <ul className="text-gray-700 space-y-2 text-sm">
                      <li>• <strong>Google Analytics:</strong> Ziyaretçi istatistikleri ve sayfa görüntülemeleri</li>
                      <li>• <strong>Performans Metrikleri:</strong> Sayfa yüklenme süreleri ve hata izleme</li>
                      <li>• <strong>Kullanım Analitiği:</strong> En çok kullanılan özellikler ve sayfa akışı</li>
                    </ul>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center mr-4">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 3v10a2 2 0 002 2h6a2 2 0 002-2V7M7 7h10M9 11v4m6-4v4" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-purple-900">🎯 Pazarlama Çerezleri</h3>
                        <p className="text-purple-700 text-sm">Kişiselleştirilmiş reklamlar ve kampanyalar için</p>
                      </div>
                    </div>
                    <ul className="text-purple-800 space-y-2 text-sm">
                      <li>• <strong>Facebook Pixel:</strong> Sosyal medya reklamları için retargeting</li>
                      <li>• <strong>Google Ads:</strong> Arama reklamları ve görüntülü reklamlar</li>
                      <li>• <strong>Email Marketing:</strong> Abonelik kampanyaları ve kişiselleştirme</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Çerez Yönetimi */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  3. Çerez <span className="text-primary">Yönetimi</span>
                </h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">🌐 Tarayıcı Ayarları</h3>
                    <p className="text-gray-600 mb-4 text-sm">
                      Çoğu tarayıcı çerezleri varsayılan olarak kabul eder, ancak bu ayarları değiştirebilirsiniz:
                    </p>
                    <ul className="text-gray-600 space-y-2 text-sm">
                      <li>• Chrome: Ayarlar → Gizlilik ve güvenlik → Çerezler</li>
                      <li>• Firefox: Tercihler → Gizlilik ve güvenlik → Çerezler</li>
                      <li>• Safari: Tercihler → Gizlilik → Çerezleri engelle</li>
                      <li>• Edge: Ayarlar → Site izinleri → Çerezler</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">⚠️ Çerez Devre Dışı Bırakma</h3>
                    <p className="text-gray-600 mb-4 text-sm">
                      Çerezleri devre dışı bırakırsanız bazı özellikler çalışmayabilir:
                    </p>
                    <ul className="text-gray-600 space-y-2 text-sm">
                      <li>• Otomatik giriş yapamama</li>
                      <li>• Tercihlerinizin kaydedilememesi</li>
                      <li>• Kişiselleştirilmiş deneyim kaybı</li>
                      <li>• Bazı sayfaların düzgün çalışmaması</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Üçüncü Taraf Çerezler */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  4. Üçüncü Taraf <span className="text-primary">Çerezler</span>
                </h2>
                
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-8 border border-amber-200">
                  <h3 className="text-lg font-semibold text-amber-900 mb-4">🔗 Entegre Hizmetler</h3>
                  <p className="text-amber-800 mb-6">
                    LingRoot, bazı üçüncü taraf hizmetleri entegre eder ve bu hizmetler kendi çerezlerini kullanabilir:
                  </p>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-amber-200">
                      <h4 className="font-semibold text-amber-900 mb-2">Google Services</h4>
                      <ul className="text-amber-800 text-sm space-y-1">
                        <li>• Analytics</li>
                        <li>• Google Fonts</li>
                        <li>• reCAPTCHA</li>
                      </ul>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 border border-amber-200">
                      <h4 className="font-semibold text-amber-900 mb-2">Sosyal Medya</h4>
                      <ul className="text-amber-800 text-sm space-y-1">
                        <li>• Facebook</li>
                        <li>• Twitter</li>
                        <li>• LinkedIn</li>
                      </ul>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 border border-amber-200">
                      <h4 className="font-semibold text-amber-900 mb-2">Ödeme Sistemi</h4>
                      <ul className="text-amber-800 text-sm space-y-1">
                        <li>• Stripe</li>
                        <li>• PayPal</li>
                        <li>• İyzico</li>
                      </ul>
                    </div>
                  </div>
                  
                  <p className="text-amber-800 mt-4 text-sm">
                    Bu hizmetlerin çerez politikaları için ilgili şirketlerin web sitelerini ziyaret edebilirsiniz.
                  </p>
                </div>
              </div>

              {/* İletişim */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  5. <span className="text-primary">İletişim</span>
                </h2>
                
                <div className="bg-slate-900 rounded-xl p-8 text-white">
                  <h3 className="text-xl font-semibold mb-4">Çerezler hakkında sorularınız mı var?</h3>
                  <p className="mb-6 opacity-90">
                    Çerez kullanımımız veya gizliliğiniz hakkında herhangi bir sorunuz varsa, 
                    bizimle iletişime geçmekten çekinmeyin.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link href="/contact" 
                      className="px-6 py-3 bg-white text-primary rounded-lg font-semibold hover:bg-gray-100 transition-colors text-center">
                      İletişime Geç
                    </Link>
                    <a href="mailto:privacy@lingroot.com" 
                      className="px-6 py-3 border border-white text-white rounded-lg font-semibold hover:bg-white hover:text-primary transition-colors text-center">
                      privacy@lingroot.com
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
} 