import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Footer from '../src/components/Footer';

export default function Terms() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Head>
        <title>Kullanım Şartları | LingRoot</title>
        <meta name="description" content="LingRoot Kullanım Şartları. Platform kullanım kuralları, kullanıcı sorumlulukları ve hizmet koşulları." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>
      
      {/* Header */}
      <header className="fixed w-full py-4 px-4 sm:px-6 flex justify-between items-center z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <Link href="/" className="flex items-center space-x-3">
          <div className="w-12 h-12 relative">
            {/* Modern SVG Logo */}
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-lg"
            >
              {/* Background Circle with Gradient */}
              <circle
                cx="24"
                cy="24"
                r="22"
                fill="url(#gradient)"
                stroke="url(#borderGradient)"
                strokeWidth="2"
              />
              
              {/* Speech Bubble */}
              <path
                d="M32 18c0-4.4-3.6-8-8-8s-8 3.6-8 8 3.6 8 8 8c1.1 0 2.2-.2 3.2-.6l4.8 2.4v-4.2c1.2-1.5 1.9-3.4 1.9-5.6z"
                fill="white"
                fillOpacity="0.9"
              />
              
              {/* Root/Tree Symbol inside speech bubble */}
              <path
                d="M24 14v8m-3-4h6m-6 2h6"
                stroke="url(#textGradient)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              {/* Decorative dots */}
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
          <span className="font-extrabold text-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent tracking-tight">
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
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
            Ücretsiz Başla
          </Link>
        </div>
      </header>

      <main className="flex-grow pt-24">
        {/* Hero Section */}
        <section className="py-20 px-6 bg-gradient-to-r from-blue-600 to-purple-600">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-medium mb-8">
              <span className="w-2 h-2 bg-white rounded-full mr-2"></span>
              Yasal Belgeler
            </div>
            <h1 className="text-4xl md:text-7xl font-extrabold text-white mb-8 tracking-tight">
              Kullanım Şartları
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
              LingRoot platformunu kullanırken uymanız gereken kurallar ve koşullar hakkında bilgi edinin.
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="py-20 px-6 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="prose prose-lg max-w-none">
              
              {/* Son Güncellenme */}
              <div className="mb-12 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-200 shadow-lg">
                <p className="text-blue-800 mb-0 font-medium">
                  <strong>Son Güncellenme:</strong> 1 Ocak 2025
                </p>
              </div>

              {/* Giriş */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Platform Kullanım <span className="text-blue-600">Kuralları</span>
                </h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  LingRoot'a erişerek ve platformumuzu kullanarak, aşağıdaki kullanım şartlarını kabul etmiş sayılırsınız. 
                  Lütfen bu şartları dikkatli bir şekilde okuyunuz.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  Bu şartlar herhangi bir zamanda değiştirilebilir. Değişiklikler platform üzerinden duyurulacak ve 
                  devam eden kullanımınız ile yeni şartları kabul etmiş sayılırsınız.
                </p>
              </div>

              {/* Platform Kullanımı */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  1. Platform <span className="text-blue-600">Kullanımı</span>
                </h2>
                
                <div className="space-y-6">
                  <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                    <h3 className="text-lg font-semibold text-green-900 mb-3">✅ İzin Verilen Kullanımlar</h3>
                    <ul className="text-green-800 space-y-2">
                      <li>• Kişisel İngilizce öğrenme amaçlı kullanım</li>
                      <li>• Eğitim kurumlarında ders materyali olarak kullanım</li>
                      <li>• İçerikleri kişisel arşivleme ve offline kullanım</li>
                      <li>• Öğrenme ilerlemesini takip etme</li>
                    </ul>
                  </div>

                  <div className="bg-red-50 rounded-lg p-6 border border-red-200">
                    <h3 className="text-lg font-semibold text-red-900 mb-3">❌ Yasak Kullanımlar</h3>
                    <ul className="text-red-800 space-y-2">
                      <li>• Ticari amaçlarla içerik satışı</li>
                      <li>• Telif hakkı ihlali oluşturan içerik yükleme</li>
                      <li>• Nefret söylemi içeren materyallerin işlenmesi</li>
                      <li>• Sistem güvenliğini tehdit edici faaliyetler</li>
                      <li>• Sahte hesap oluşturma ve kimlik hırsızlığı</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Hesap Sorumlulukları */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  2. Hesap <span className="text-blue-600">Sorumlulukları</span>
                </h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                    <h3 className="text-lg font-semibold text-blue-900 mb-3">👤 Kullanıcı Sorumlulukları</h3>
                    <ul className="text-blue-800 space-y-2 text-sm">
                      <li>• Hesap bilgilerinin güncel tutulması</li>
                      <li>• Şifre güvenliğinin sağlanması</li>
                      <li>• Hesap aktivitelerinden sorumlu olma</li>
                      <li>• Doğru bilgi verme yükümlülüğü</li>
                    </ul>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
                    <h3 className="text-lg font-semibold text-purple-900 mb-3">🛡️ LingRoot'un Hakları</h3>
                    <ul className="text-purple-800 space-y-2 text-sm">
                      <li>• Hesap askıya alma yetkisi</li>
                      <li>• İçerik moderasyonu hakkı</li>
                      <li>• Kullanım sınırları koyma</li>
                      <li>• Hizmet kesintisi yapabilme</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* İçerik ve Telif Hakkı */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  3. İçerik ve <span className="text-blue-600">Telif Hakkı</span>
                </h2>
                
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-8 border border-amber-200">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-amber-900 mb-3">Önemli: Telif Hakkı Uyarısı</h3>
                      <p className="text-amber-800 mb-4">
                        LingRoot'a yüklediğiniz tüm içerikler için telif hakkı sorumluluğu size aittir. 
                        Başkalarına ait telif hakkı korumalı materyalleri izinsiz yüklemek yasal sorumluluk doğurur.
                      </p>
                      <ul className="text-amber-800 space-y-2 text-sm">
                        <li>• Yalnızca sahip olduğunuz içerikleri yükleyin</li>
                        <li>• Creative Commons lisanslı materyalleri kullanabilirsiniz</li>
                        <li>• Şüpheli durumlarda hukuki danışmanlık alın</li>
                        <li>• İhlal durumunda hesabınız kapatılabilir</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ödeme ve İade */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  4. Ödeme ve <span className="text-blue-600">İade Koşulları</span>
                </h2>
                
                <div className="space-y-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">💳 Ödeme Şartları</h3>
                    <ul className="text-gray-600 space-y-2">
                      <li>• Aylık/yıllık abonelik ödemeleri peşin tahsil edilir</li>
                      <li>• Fiyatlar KDV dahildir</li>
                      <li>• Otomatik yenilenme varsayılan olarak açıktır</li>
                      <li>• İptal dilediğiniz zaman yapılabilir</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">🔄 İade Politikası</h3>
                    <ul className="text-gray-600 space-y-2">
                      <li>• 14 gün içinde sebepsiz iade hakkı</li>
                      <li>• Kullanım süresi ve miktarı iade tutarını etkilemez</li>
                      <li>• İade süreci 5-10 iş günü sürer</li>
                      <li>• Yıllık aboneliklerde eşit oranda iade yapılır</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Hizmet Sınırlamaları */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  5. Hizmet <span className="text-blue-600">Sınırlamaları</span>
                </h2>
                
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-8 border border-blue-200">
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Erişilebilirlik</h3>
                      <p className="text-gray-600 text-sm">7/24 erişim hedeflenir ancak bakım kesintileri olabilir</p>
                    </div>

                    <div className="text-center">
                      <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">İçerik Sınırları</h3>
                      <p className="text-gray-600 text-sm">Plan tipine göre günlük işlem limitleri uygulanır</p>
                    </div>

                    <div className="text-center">
                      <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Destek</h3>
                      <p className="text-gray-600 text-sm">Hafta içi iş saatlerinde öncelikli destek</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sorumluluk Reddi */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  6. Sorumluluk <span className="text-blue-600">Reddi</span>
                </h2>
                
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <p className="text-gray-600 leading-relaxed mb-4">
                    LingRoot, hizmetin kesintisiz ve hatasız olacağını garanti etmez. Platform kullanımından 
                    doğabilecek dolaylı zararlardan sorumlu tutulamaz.
                  </p>
                  <ul className="text-gray-600 space-y-2">
                    <li>• Teknik arızalar ve sistem kesintileri</li>
                    <li>• Üçüncü taraf hizmet sağlayıcıların sorunları</li>
                    <li>• Kullanıcı hatalarından kaynaklanan veri kayıpları</li>
                    <li>• İnternet bağlantısı ve cihaz uyumluluk sorunları</li>
                  </ul>
                </div>
              </div>

              {/* İletişim */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  7. <span className="text-blue-600">İletişim ve Şikayetler</span>
                </h2>
                
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
                  <h3 className="text-xl font-semibold mb-4">Kullanım şartları hakkında sorularınız mı var?</h3>
                  <p className="mb-6 opacity-90">
                    Kullanım şartları veya platform kullanımı hakkında herhangi bir sorunuz varsa, 
                    hukuk ekibimizle iletişime geçebilirsiniz.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link href="/contact" 
                      className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-center">
                      İletişime Geç
                    </Link>
                    <a href="mailto:legal@lingroot.com" 
                      className="px-6 py-3 border border-white text-white rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors text-center">
                      legal@lingroot.com
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