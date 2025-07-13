import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Footer from '../src/components/Footer';
import StandardHeader from '../src/components/common/StandardHeader';

export default function Terms() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Head>
        <title>Kullanım Şartları | LingRoot</title>
        <meta name="description" content="LingRoot Kullanım Şartları. Platform kullanım kuralları, kullanıcı sorumlulukları ve hizmet koşulları." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <StandardHeader />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-b from-blue-50 to-white">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">
              Kullanım Şartları
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              LingRoot platformunu kullanırken uymanız gereken kurallar ve koşullar hakkında bilgi edinin.
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              
              {/* Son Güncellenme */}
              <div className="mb-16 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-lg">
                <p className="text-blue-800 mb-0 font-medium">
                  <strong>Son Güncellenme:</strong> 1 Ocak 2025
                </p>
              </div>

              {/* Giriş */}
              <div className="mb-16">
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
              <div className="mb-16">
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
              <div className="mb-16">
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
              <div className="mb-16">
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

              {/* İletişim */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  İletişim ve <span className="text-blue-600">Şikayetler</span>
                </h2>
                
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-8 text-white">
                  <h3 className="text-xl font-semibold mb-4">Kullanım şartları hakkında sorularınız mı var?</h3>
                  <p className="mb-6">
                    Kullanım şartları, gizlilik politikası veya platform kullanımı hakkında herhangi bir sorunuz 
                    varsa, destek ekibimizle iletişime geçebilirsiniz.
                  </p>
                  <Link href="/contact" className="inline-block bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors">
                    İletişime Geçin
                  </Link>
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