import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Footer from '../src/components/Footer';
import StandardHeader from '../src/components/common/StandardHeader';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Head>
        <title>Gizlilik Politikası | LingRoot</title>
        <meta name="description" content="LingRoot Gizlilik Politikası. Kişisel verilerinizin nasıl toplandığı, işlendiği ve korunduğu hakkında detaylı bilgiler." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>
      
      <StandardHeader />

      <main className="flex-grow pt-24">
        {/* Hero Section */}
        <section className="py-20 px-6 bg-gradient-to-r from-blue-600 to-purple-600">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-medium mb-8">
              <span className="w-2 h-2 bg-white rounded-full mr-2"></span>
              Yasal Belgeler
            </div>
            <h1 className="text-4xl md:text-7xl font-extrabold text-white mb-8 tracking-tight">
              Gizlilik Politikası
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
              Kişisel verilerinizin güvenliğini en üst seviyede tutuyoruz. 
              Bu dokümanda verilerinizin nasıl korunduğunu açıklıyoruz.
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
                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                  Kişisel Verilerinize <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Saygılıyız</span>
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
                <h2 className="text-3xl font-bold text-gray-900 mb-8">
                  1. Topladığımız <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Veriler</span>
                </h2>
                
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-8 border border-gray-200 shadow-lg">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Hesap Bilgileri</h3>
                    <ul className="text-gray-600 space-y-3">
                      <li className="flex items-center"><span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>Ad, soyad ve e-posta adresiniz</li>
                      <li className="flex items-center"><span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>Telefon numaranız (isteğe bağlı)</li>
                      <li className="flex items-center"><span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>Hesap oluşturma tarihi</li>
                      <li className="flex items-center"><span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>Dil öğrenme seviyeniz ve tercihleri</li>
                    </ul>
                  </div>

                  <div className="bg-gradient-to-r from-gray-50 to-purple-50 rounded-2xl p-8 border border-gray-200 shadow-lg">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Kullanım Verileri</h3>
                    <ul className="text-gray-600 space-y-3">
                      <li className="flex items-center"><span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>İşlediğiniz içerikler ve sıklığı</li>
                      <li className="flex items-center"><span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>Platformda geçirdiğiniz süre</li>
                      <li className="flex items-center"><span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>Öğrenme ilerlemeniz ve istatistikler</li>
                      <li className="flex items-center"><span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>Tercih ettiğiniz özellikler</li>
                    </ul>
                  </div>

                  <div className="bg-gradient-to-r from-gray-50 to-green-50 rounded-2xl p-8 border border-gray-200 shadow-lg">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Teknik Veriler</h3>
                    <ul className="text-gray-600 space-y-3">
                      <li className="flex items-center"><span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>IP adresi ve konum bilgisi</li>
                      <li className="flex items-center"><span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>Tarayıcı türü ve versiyonu</li>
                      <li className="flex items-center"><span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>Cihaz bilgileri</li>
                      <li className="flex items-center"><span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>Çerezler ve oturum verileri</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Veri Kullanımı */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-8">
                  2. Verileri Nasıl <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Kullanıyoruz</span>
                </h2>
                
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 border border-blue-200 shadow-lg">
                    <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mb-6">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-blue-900 mb-4">Hizmet Sağlama</h3>
                    <ul className="text-blue-800 space-y-3 text-sm">
                      <li className="flex items-start"><span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-3 mt-2"></span>Kişiselleştirilmiş içerik oluşturma</li>
                      <li className="flex items-start"><span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-3 mt-2"></span>Hesap yönetimi ve güvenlik</li>
                      <li className="flex items-start"><span className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-3 mt-2"></span>Öğrenme ilerlemesi takibi</li>
                    </ul>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-8 border border-green-200 shadow-lg">
                    <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mb-6">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-green-900 mb-4">İletişim</h3>
                    <ul className="text-green-800 space-y-3 text-sm">
                      <li className="flex items-start"><span className="w-1.5 h-1.5 bg-green-600 rounded-full mr-3 mt-2"></span>Müşteri destek hizmetleri</li>
                      <li className="flex items-start"><span className="w-1.5 h-1.5 bg-green-600 rounded-full mr-3 mt-2"></span>Önemli güncellemeler</li>
                      <li className="flex items-start"><span className="w-1.5 h-1.5 bg-green-600 rounded-full mr-3 mt-2"></span>Geri bildirim toplama</li>
                    </ul>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-8 border border-purple-200 shadow-lg">
                    <div className="w-16 h-16 bg-purple-500 rounded-2xl flex items-center justify-center mb-6">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-purple-900 mb-4">Geliştirme</h3>
                    <ul className="text-purple-800 space-y-3 text-sm">
                      <li className="flex items-start"><span className="w-1.5 h-1.5 bg-purple-600 rounded-full mr-3 mt-2"></span>Platform performansı analizi</li>
                      <li className="flex items-start"><span className="w-1.5 h-1.5 bg-purple-600 rounded-full mr-3 mt-2"></span>Yeni özellik geliştirme</li>
                      <li className="flex items-start"><span className="w-1.5 h-1.5 bg-purple-600 rounded-full mr-3 mt-2"></span>Hata tespiti ve düzeltme</li>
                    </ul>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-8 border border-orange-200 shadow-lg">
                    <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mb-6">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-orange-900 mb-4">Güvenlik</h3>
                    <ul className="text-orange-800 space-y-3 text-sm">
                      <li className="flex items-start"><span className="w-1.5 h-1.5 bg-orange-600 rounded-full mr-3 mt-2"></span>Dolandırıcılık önleme</li>
                      <li className="flex items-start"><span className="w-1.5 h-1.5 bg-orange-600 rounded-full mr-3 mt-2"></span>Hesap güvenliği</li>
                      <li className="flex items-start"><span className="w-1.5 h-1.5 bg-orange-600 rounded-full mr-3 mt-2"></span>Sistem koruması</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Veri Korunması */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-8">
                  3. Veri <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Korunması</span>
                </h2>
                
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-3xl p-12 border border-blue-200 shadow-2xl">
                  <div className="grid md:grid-cols-3 gap-8">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">SSL Şifreleme</h3>
                      <p className="text-gray-600">Tüm veri transferleri 256-bit SSL ile şifrelenir</p>
                    </div>

                    <div className="text-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">Güvenli Saklama</h3>
                      <p className="text-gray-600">Veriler güvenli sunucularda korunur</p>
                    </div>

                    <div className="text-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">Erişim Kontrolü</h3>
                      <p className="text-gray-600">Sadece yetkili personel erişebilir</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* İletişim */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-white text-center shadow-2xl">
                <h2 className="text-3xl font-bold mb-6">Sorularınız mı Var?</h2>
                <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                  Gizlilik politikamız hakkında herhangi bir sorunuz varsa, bizimle iletişime geçmekten çekinmeyin.
                </p>
                <Link href="/contact" 
                  className="inline-flex items-center px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  İletişime Geçin
                </Link>
              </div>

            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
} 