import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Footer from '../src/components/Footer';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Form gönderme işlemi burada yapılacak
    console.log('Form gönderildi:', formData);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Head>
        <title>İletişim | LingRoot</title>
        <meta name="description" content="LingRoot ile iletişime geçin. Sorularınız, önerileriniz ve geri bildirimleriniz için bize ulaşın." />
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
          <Link href="/ozellikler" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200">
            Özellikler
          </Link>
          <Link href="/fiyatlandirma" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200">
            Fiyatlandırma
          </Link>
          <Link href="/blog" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200">
            Blog
          </Link>
          <Link href="/contact" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors duration-200">
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
              Bizimle İletişime Geçin
            </div>
            <h1 className="text-4xl md:text-7xl font-extrabold text-white mb-8 tracking-tight">
              İletişim
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
              Sorularınız, önerileriniz ve geri bildirimleriniz bizim için çok değerli. 
              Size nasıl yardımcı olabileceğimizi öğrenmek istiyoruz.
            </p>
          </div>
        </section>

        {/* Contact Info & Form */}
        <section className="py-16 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12">
              {/* İletişim Bilgileri */}
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-8">
                  İletişim <span className="text-blue-600">Bilgileri</span>
                </h2>
                
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">E-posta</h3>
                      <p className="text-gray-600">info@lingroot.com</p>
                      <p className="text-sm text-gray-500 mt-1">Ortalama yanıt süremiz: 1 iş günü</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">Telefon</h3>
                      <p className="text-gray-600">+90 212 123 45 67</p>
                      <p className="text-sm text-gray-500 mt-1">Hafta içi 09:00 - 18:00</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">Adres</h3>
                      <p className="text-gray-600">İstanbul, Türkiye</p>
                      <p className="text-sm text-gray-500 mt-1">Teknoloji geliştirme merkezi</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Destek Ekibimiz</h3>
                  <p className="text-gray-600 text-sm">
                    Deneyimli destek ekibimiz size en hızlı şekilde yardımcı olmak için hazır. 
                    Teknik sorulardan kullanım kılavuzuna kadar her konuda yanınızdayız.
                  </p>
                </div>
              </div>

              {/* İletişim Formu */}
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-8">
                  Bize <span className="text-blue-600">Yazın</span>
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Ad Soyad
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Adınız ve soyadınız"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      E-posta
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="ornek@email.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                      Konu
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Mesajınızın konusu"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                      Mesaj
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={6}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Mesajınızı buraya yazın..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Mesaj Gönder
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 px-6 bg-gradient-to-br from-blue-50 to-purple-50">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Sık Sorulan <span className="text-blue-600">Sorular</span>
              </h2>
              <p className="text-gray-600">
                Merak ettiğiniz konularda hızlı cevaplar
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  LingRoot nasıl çalışır?
                </h3>
                <p className="text-gray-600">
                  LingRoot, YouTube videoları, podcast'ler ve blog yazıları gibi içerikleri alarak bunları seçtiğiniz İngilizce seviyesine uygun hale getirir. AI teknolojisi ile metinleri sadeleştirir ve ses dosyalarına dönüştürür.
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Ücretsiz plan ile neler yapabilirim?
                </h3>
                <p className="text-gray-600">
                  Ücretsiz planımızla günde 3 içerik işleyebilir, A1-B1 seviyelerinde öğrenme materyalleri oluşturabilirsiniz. Premium özellikler için uygun fiyatlı abonelik planlarımızı inceleyebilirsiniz.
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Verilerimin güvenliği nasıl sağlanıyor?
                </h3>
                <p className="text-gray-600">
                  Tüm verileriniz SSL ile şifrelenir ve GDPR standartlarına uygun şekilde işlenir. Kişisel bilgileriniz hiçbir şekilde üçüncü taraflarla paylaşılmaz.
                </p>
              </div>
            </div>
      </div>
        </section>
    </main>

      <Footer />
    </div>
  );
} 