import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Footer from '../src/components/Footer';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <Head>
        <title>Gizlilik Politikası | LingRoot</title>
        <meta name="description" content="LingRoot Gizlilik Politikası. Kişisel verilerinizin nasıl toplandığı, işlendiği ve korunduğu hakkında detaylı bilgiler." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>
      
      {/* Header */}
      <header className="fixed w-full py-3 px-4 sm:px-6 flex justify-between items-center z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">LR</span>
          </div>
          <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            LingRoot
          </span>
        </Link>
        
        <nav className="hidden md:flex items-center space-x-6">
          <Link href="/about" className="text-gray-600 hover:text-gray-700 font-medium transition-colors">
            Hakkımızda
          </Link>
          <Link href="/nasil-calisir" className="text-gray-600 hover:text-gray-700 font-medium transition-colors">
            Nasıl Çalışır?
          </Link>
          <Link href="/contact" className="text-gray-600 hover:text-gray-700 font-medium transition-colors">
            İletişim
          </Link>
        </nav>

        <div className="flex items-center space-x-3">
          <Link href="/login" className="text-gray-600 hover:text-gray-700 font-medium transition-colors">
            Giriş Yap
          </Link>
          <Link href="/register" 
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl">
            Ücretsiz Başla
          </Link>
        </div>
      </header>

      <main className="flex-grow pt-20">
        {/* Hero Section */}
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
              Yasal Belgeler
            </div>
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
              Gizlilik Politikası
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Kişisel verilerinizin güvenliğini en üst seviyede tutuyoruz. 
              Bu dokümanda verilerinizin nasıl korunduğunu açıklıyoruz.
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="py-16 px-6 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="prose prose-lg max-w-none">
              
              {/* Son Güncellenme */}
              <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800 mb-0">
                  <strong>Son Güncellenme:</strong> 1 Ocak 2025
                </p>
              </div>

              {/* Giriş */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Kişisel Verilerinize <span className="text-blue-600">Saygılıyız</span>
                </h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  LingRoot olarak, kullanıcılarımızın gizliliğini ve veri güvenliğini en üst düzeyde korumayı taahhüt ederiz. 
                  Bu Gizlilik Politikası, kişisel verilerinizin nasıl toplandığını, kullanıldığını, saklandığını ve korunduğunu açıklar.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  Platformumuzu kullanırken bu politikayı kabul etmiş sayılırsınız. Herhangi bir değişiklik durumunda 
                  size bildirimde bulunacağız.
                </p>
              </div>

              {/* Topladığımız Veriler */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  1. Topladığımız <span className="text-blue-600">Veriler</span>
                </h2>
                
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Hesap Bilgileri</h3>
                    <ul className="text-gray-600 space-y-2">
                      <li>• Ad, soyad ve e-posta adresiniz</li>
                      <li>• Telefon numaranız (isteğe bağlı)</li>
                      <li>• Hesap oluşturma tarihi</li>
                      <li>• Dil öğrenme seviyeniz ve tercihleri</li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Kullanım Verileri</h3>
                    <ul className="text-gray-600 space-y-2">
                      <li>• İşlediğiniz içerikler ve sıklığı</li>
                      <li>• Platformda geçirdiğiniz süre</li>
                      <li>• Öğrenme ilerlemeniz ve istatistikler</li>
                      <li>• Tercih ettiğiniz özellikler</li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Teknik Veriler</h3>
                    <ul className="text-gray-600 space-y-2">
                      <li>• IP adresi ve konum bilgisi</li>
                      <li>• Tarayıcı türü ve versiyonu</li>
                      <li>• Cihaz bilgileri</li>
                      <li>• Çerezler ve oturum verileri</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Veri Kullanımı */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  2. Verileri Nasıl <span className="text-blue-600">Kullanıyoruz</span>
                </h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                    <h3 className="text-lg font-semibold text-blue-900 mb-3">Hizmet Sağlama</h3>
                    <ul className="text-blue-800 space-y-2 text-sm">
                      <li>• Kişiselleştirilmiş içerik oluşturma</li>
                      <li>• Hesap yönetimi ve güvenlik</li>
                      <li>• Öğrenme ilerlemesi takibi</li>
                    </ul>
                  </div>

                  <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                    <h3 className="text-lg font-semibold text-green-900 mb-3">İletişim</h3>
                    <ul className="text-green-800 space-y-2 text-sm">
                      <li>• Müşteri destek hizmetleri</li>
                      <li>• Önemli güncellemeler</li>
                      <li>• Geri bildirim toplama</li>
                    </ul>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
                    <h3 className="text-lg font-semibold text-purple-900 mb-3">Geliştirme</h3>
                    <ul className="text-purple-800 space-y-2 text-sm">
                      <li>• Platform performansı analizi</li>
                      <li>• Yeni özellik geliştirme</li>
                      <li>• Hata tespiti ve düzeltme</li>
                    </ul>
                  </div>

                  <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
                    <h3 className="text-lg font-semibold text-orange-900 mb-3">Güvenlik</h3>
                    <ul className="text-orange-800 space-y-2 text-sm">
                      <li>• Dolandırıcılık önleme</li>
                      <li>• Hesap güvenliği</li>
                      <li>• Sistem koruması</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Veri Korunması */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  3. Veri <span className="text-blue-600">Korunması</span>
                </h2>
                
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-8 border border-blue-200">
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">SSL Şifreleme</h3>
                      <p className="text-gray-600 text-sm">Tüm veri transferleri 256-bit SSL ile şifrelenir</p>
                    </div>

                    <div className="text-center">
                      <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Güvenli Sunucular</h3>
                      <p className="text-gray-600 text-sm">Verileriniz güvenli veri merkezlerinde saklanır</p>
                    </div>

                    <div className="text-center">
                      <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">GDPR Uyumlu</h3>
                      <p className="text-gray-600 text-sm">Avrupa veri koruma standartlarına uygun işlem</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Haklarınız */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  4. <span className="text-blue-600">Haklarınız</span>
                </h2>
                
                <div className="space-y-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">✅ Erişim Hakkı</h3>
                    <p className="text-gray-600">Hangi kişisel verilerinizin işlendiğini öğrenme hakkınız vardır.</p>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">✏️ Düzeltme Hakkı</h3>
                    <p className="text-gray-600">Yanlış veya eksik bilgilerin düzeltilmesini talep edebilirsiniz.</p>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">🗑️ Silme Hakkı</h3>
                    <p className="text-gray-600">Kişisel verilerinizin silinmesini talep edebilirsiniz.</p>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">📤 Taşınabilirlik Hakkı</h3>
                    <p className="text-gray-600">Verilerinizi başka bir platforma taşıma hakkınız vardır.</p>
                  </div>
                </div>
              </div>

              {/* İletişim */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  5. <span className="text-blue-600">İletişim</span>
                </h2>
                
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
                  <h3 className="text-xl font-semibold mb-4">Gizlilik konusunda sorularınız mı var?</h3>
                  <p className="mb-6 opacity-90">
                    Kişisel verileriniz hakkında herhangi bir sorunuz veya talebiniz varsa, 
                    bizimle iletişime geçmekten çekinmeyin.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link href="/contact" 
                      className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-center">
                      İletişime Geç
                    </Link>
                    <a href="mailto:privacy@lingroot.com" 
                      className="px-6 py-3 border border-white text-white rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors text-center">
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