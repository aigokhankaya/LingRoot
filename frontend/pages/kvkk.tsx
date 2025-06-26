import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Footer from '../src/components/Footer';

export default function KVKK() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <Head>
        <title>KVKK - Kişisel Verilerin Korunması | LingRoot</title>
        <meta name="description" content="LingRoot KVKK uyumluluk belgesi. Kişisel verilerin korunması kanunu çerçevesinde haklar ve yükümlülükler." />
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
              KVKK
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Kişisel Verilerin Korunması Kanunu çerçevesinde haklarınız ve veri işleme süreçlerimiz.
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
                  <strong>Son Güncellenme:</strong> 1 Ocak 2025 | <strong>KVKK Uyumluluk:</strong> 6698 Sayılı Kanun
                </p>
              </div>

              {/* Giriş */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Kişisel Verilerin <span className="text-blue-600">Korunması</span>
                </h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  LingRoot olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) hükümlerine tam uyum sağlayarak 
                  kişisel verilerinizi işlemekteyiz. Bu belge, veri işleme faaliyetlerimizi ve haklarınızı açıklar.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  Veri sorumlusu sıfatıyla, kişisel verilerinizin güvenliğini ve gizliliğini korumak için 
                  gerekli tüm teknik ve idari tedbirleri almaktayız.
                </p>
              </div>

              {/* Veri Sorumlusu Bilgileri */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  1. Veri Sorumlusu <span className="text-blue-600">Bilgileri</span>
                </h2>
                
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-8 border border-blue-200">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-blue-900 mb-3">Şirket Bilgileri</h3>
                      <ul className="text-blue-800 space-y-2 text-sm">
                        <li><strong>Şirket Adı:</strong> LingRoot Teknoloji Ltd. Şti.</li>
                        <li><strong>Adres:</strong> İstanbul, Türkiye</li>
                        <li><strong>E-posta:</strong> kvkk@lingroot.com</li>
                        <li><strong>Telefon:</strong> +90 212 123 45 67</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-purple-900 mb-3">KVKK Sorumlusu</h3>
                      <ul className="text-purple-800 space-y-2 text-sm">
                        <li><strong>Ad:</strong> Veri Koruma Sorumlusu</li>
                        <li><strong>E-posta:</strong> vks@lingroot.com</li>
                        <li><strong>Görev:</strong> KVKK uyumluluk denetimi</li>
                        <li><strong>Çalışma Saatleri:</strong> Hafta içi 09:00-18:00</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Kişisel Veri Türleri */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  2. İşlenen Kişisel <span className="text-blue-600">Veri Türleri</span>
                </h2>
                
                <div className="space-y-6">
                  <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                    <h3 className="text-lg font-semibold text-green-900 mb-3">🧑 Kimlik Verileri</h3>
                    <ul className="text-green-800 space-y-2 text-sm">
                      <li>• Ad, soyad bilgileriniz</li>
                      <li>• E-posta adresiniz</li>
                      <li>• Telefon numaranız (isteğe bağlı)</li>
                      <li>• Doğum tarihi (isteğe bağlı)</li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                    <h3 className="text-lg font-semibold text-blue-900 mb-3">💰 Finansal Veriler</h3>
                    <ul className="text-blue-800 space-y-2 text-sm">
                      <li>• Ödeme geçmişi bilgileri</li>
                      <li>• Abonelik durumu ve fatura bilgileri</li>
                      <li>• Ödeme yöntemi tercihleri (kart bilgileri değil)</li>
                    </ul>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
                    <h3 className="text-lg font-semibold text-purple-900 mb-3">📚 Eğitim/Öğrenme Verileri</h3>
                    <ul className="text-purple-800 space-y-2 text-sm">
                      <li>• İngilizce seviyeniz (CEFR)</li>
                      <li>• Öğrenme tercihleri ve hedefleri</li>
                      <li>• İşlediğiniz içerik türleri</li>
                      <li>• Öğrenme ilerleme istatistikleri</li>
                    </ul>
                  </div>

                  <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
                    <h3 className="text-lg font-semibold text-orange-900 mb-3">🌐 Teknik Veriler</h3>
                    <ul className="text-orange-800 space-y-2 text-sm">
                      <li>• IP adresi ve konum bilgisi</li>
                      <li>• Tarayıcı ve cihaz bilgileri</li>
                      <li>• Site kullanım kayıtları</li>
                      <li>• Oturum ve çerez bilgileri</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* İşleme Amaçları */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  3. Veri İşleme <span className="text-blue-600">Amaçları</span>
                </h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                        <span className="text-white text-sm">1</span>
                      </span>
                      Hizmet Sunumu
                    </h3>
                    <ul className="text-gray-600 space-y-2 text-sm">
                      <li>• Platform erişimi sağlama</li>
                      <li>• Kişiselleştirilmiş içerik üretme</li>
                      <li>• Öğrenme ilerlemesi takibi</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-3">
                        <span className="text-white text-sm">2</span>
                      </span>
                      Güvenlik
                    </h3>
                    <ul className="text-gray-600 space-y-2 text-sm">
                      <li>• Hesap güvenliği sağlama</li>
                      <li>• Dolandırıcılık önleme</li>
                      <li>• Sistem güvenliği izleme</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                        <span className="text-white text-sm">3</span>
                      </span>
                      İletişim
                    </h3>
                    <ul className="text-gray-600 space-y-2 text-sm">
                      <li>• Müşteri destek hizmetleri</li>
                      <li>• Önemli bildirimler</li>
                      <li>• Pazarlama iletişimi (izinli)</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center mr-3">
                        <span className="text-white text-sm">4</span>
                      </span>
                      Analiz
                    </h3>
                    <ul className="text-gray-600 space-y-2 text-sm">
                      <li>• Hizmet kalitesi iyileştirme</li>
                      <li>• Kullanım istatistikleri</li>
                      <li>• Yeni özellik geliştirme</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* KVKK Hakları */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  4. KVKK Kapsamında <span className="text-blue-600">Haklarınız</span>
                </h2>
                
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-8 border border-green-200">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">
                    KVKK md. 11 Kapsamında Veri Sahibi Hakları
                  </h3>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="bg-white rounded-lg p-4 border border-green-200">
                        <h4 className="font-semibold text-green-900 mb-2">📋 Bilgi Talep Etme</h4>
                        <p className="text-green-800 text-sm">
                          Kişisel verilerinizin işlenip işlenmediğini öğrenme ve işleniyorsa bu konuda bilgi talep etme hakkı.
                        </p>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <h4 className="font-semibold text-blue-900 mb-2">✏️ Düzeltme Talep Etme</h4>
                        <p className="text-blue-800 text-sm">
                          Kişisel verilerinizin yanlış veya eksik olması durumunda bunların düzeltilmesini isteme hakkı.
                        </p>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 border border-purple-200">
                        <h4 className="font-semibold text-purple-900 mb-2">🗑️ Silme Talep Etme</h4>
                        <p className="text-purple-800 text-sm">
                          Kişisel verilerinizin silinmesini veya yok edilmesini talep etme hakkı.
                        </p>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 border border-orange-200">
                        <h4 className="font-semibold text-orange-900 mb-2">⚠️ İtiraz Etme</h4>
                        <p className="text-orange-800 text-sm">
                          Kişisel verilerinizin işlenmesine karşı itiraz etme hakkı.
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-white rounded-lg p-4 border border-red-200">
                        <h4 className="font-semibold text-red-900 mb-2">🚫 İşlemeyi Durdurma</h4>
                        <p className="text-red-800 text-sm">
                          Kişisel verilerinizin kanuna aykırı olarak işlenmesi halinde bunun durdurulmasını isteme hakkı.
                        </p>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 border border-indigo-200">
                        <h4 className="font-semibold text-indigo-900 mb-2">📤 Taşınabilirlik</h4>
                        <p className="text-indigo-800 text-sm">
                          Kişisel verilerinizin başka bir veri sorumlusuna aktarılmasını talep etme hakkı.
                        </p>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 border border-pink-200">
                        <h4 className="font-semibold text-pink-900 mb-2">⚖️ Zarar Giderim</h4>
                        <p className="text-pink-800 text-sm">
                          Kanuna aykırı işlemler nedeniyle zarara uğramanız halinde zararın giderilmesini talep etme hakkı.
                        </p>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 border border-teal-200">
                        <h4 className="font-semibold text-teal-900 mb-2">📢 Bildirme</h4>
                        <p className="text-teal-800 text-sm">
                          Düzeltme, silme ve işleme durdurma taleplerinin ilgili üçüncü taraflara bildirilmesini isteme hakkı.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Başvuru Prosedürü */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  5. Başvuru <span className="text-blue-600">Prosedürü</span>
                </h2>
                
                <div className="space-y-6">
                  <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                    <h3 className="text-lg font-semibold text-blue-900 mb-4">📝 Başvuru Yöntemleri</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <h4 className="font-semibold text-blue-900 mb-2">📧 E-posta</h4>
                        <p className="text-blue-800 text-sm mb-2">kvkk@lingroot.com</p>
                        <p className="text-blue-700 text-xs">En hızlı yöntem</p>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <h4 className="font-semibold text-blue-900 mb-2">📞 Telefon</h4>
                        <p className="text-blue-800 text-sm mb-2">+90 212 123 45 67</p>
                        <p className="text-blue-700 text-xs">Hafta içi 09:00-18:00</p>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <h4 className="font-semibold text-blue-900 mb-2">🏢 Fiziksel</h4>
                        <p className="text-blue-800 text-sm mb-2">İstanbul Ofis</p>
                        <p className="text-blue-700 text-xs">Randevu ile</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">⏱️ Süreç ve Süreler</h3>
                    <ul className="text-gray-600 space-y-2">
                      <li>• <strong>Başvuru Alındı:</strong> 3 iş günü içinde otomatik onay</li>
                      <li>• <strong>İnceleme Süresi:</strong> En geç 30 gün içinde cevap</li>
                      <li>• <strong>Karmaşık Başvurular:</strong> 60 güne kadar uzatılabilir</li>
                      <li>• <strong>Ücretsiz:</strong> Başvurular hiçbir ücret alınmaz</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* İletişim */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  6. <span className="text-blue-600">KVKK İletişim</span>
                </h2>
                
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
                  <h3 className="text-xl font-semibold mb-4">KVKK haklarınızı kullanmak mı istiyorsunuz?</h3>
                  <p className="mb-6 opacity-90">
                    Kişisel veri işleme faaliyetlerimiz veya KVKK haklarınız hakkında herhangi bir sorunuz varsa, 
                    Veri Koruma Sorumlumuza ulaşabilirsiniz.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <a href="mailto:kvkk@lingroot.com" 
                      className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-center">
                      KVKK Başvurusu Yap
                    </a>
                    <Link href="/contact" 
                      className="px-6 py-3 border border-white text-white rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors text-center">
                      Genel İletişim
                    </Link>
                  </div>
                  
                  <div className="mt-6 p-4 bg-white/10 rounded-lg">
                    <p className="text-sm opacity-90">
                      <strong>Önemli:</strong> KVKK başvurularınızı yaparken kimlik tespiti için T.C. kimlik numaranızı 
                      ve imzalı başvuru formu göndermeniz gerekebilir.
                    </p>
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