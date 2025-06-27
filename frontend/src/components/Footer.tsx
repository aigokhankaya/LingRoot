'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-8 mb-8">
          {/* Logo ve Slogan */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <img src="/logo.svg" alt="LingRoot Logo" className="w-12 h-12" />
              <span className="font-extrabold text-2xl bg-gradient-to-r from-blue-400 via-purple-400 to-blue-500 bg-clip-text text-transparent tracking-tight">
                LingRoot
              </span>
            </div>
            <p className="text-gray-300 mb-4">
              "Your routines turn into English."
            </p>
            <p className="text-gray-400 text-sm leading-relaxed">
              İngilizceyi akıcı konuşmak için yapay zeka destekli kişiselleştirilmiş içerikler. 
              Sevdiğiniz içeriklerle öğrenin, hayatınızı değiştirmeyin.
            </p>
          </div>

          {/* Hızlı Bağlantılar */}
          <div>
            <h3 className="text-lg font-bold mb-4">Hızlı Bağlantılar</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-gray-400 hover:text-white transition-colors duration-200">
                  Hakkımızda
                </Link>
              </li>
              <li>
                <Link href="/nasil-calisir" className="text-gray-400 hover:text-white transition-colors duration-200">
                  Nasıl Çalışır?
                </Link>
              </li>
              <li>
                <Link href="/ozellikler" className="text-gray-400 hover:text-white transition-colors duration-200">
                  Özellikler
                </Link>
              </li>
              <li>
                <Link href="/fiyatlandirma" className="text-gray-400 hover:text-white transition-colors duration-200">
                  Fiyatlandırma
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-gray-400 hover:text-white transition-colors duration-200">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/tips" className="text-gray-400 hover:text-white transition-colors duration-200">
                  Kullanıcı Yorumları
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-400 hover:text-white transition-colors duration-200">
                  İletişim
                </Link>
              </li>
            </ul>
          </div>

          {/* Yasal */}
          <div>
            <h3 className="text-lg font-bold mb-4">Yasal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy-policy" className="text-gray-400 hover:text-white transition-colors duration-200">
                  Gizlilik Politikası
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-400 hover:text-white transition-colors duration-200">
                  Kullanım Şartları
                </Link>
              </li>
              <li>
                <Link href="/cookie-policy" className="text-gray-400 hover:text-white transition-colors duration-200">
                  Çerez Politikası
                </Link>
              </li>
              <li>
                <Link href="/kvkk" className="text-gray-400 hover:text-white transition-colors duration-200">
                  KVKK
                </Link>
              </li>
            </ul>
          </div>

          {/* Sosyal Medya */}
          <div>
            <h3 className="text-lg font-bold mb-4">Sosyal Medya</h3>
            <ul className="space-y-3">
              <li className="flex items-center">
                <svg className="w-4 h-4 mr-3 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                <a href="https://www.instagram.com/lingtoroot" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors duration-200">
                  @lingtoroot
                </a>
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 mr-3 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                <a href="https://www.youtube.com/channel/UCawrU_1MSrik9KTyMkOlj0w" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors duration-200">
                  @lingroot
                </a>
              </li>

            </ul>
          </div>

          {/* Bize Ulaşın */}
          <div>
            <h3 className="text-lg font-bold mb-4">Bize Ulaşın</h3>
            <ul className="space-y-2">
              <li className="flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <a href="mailto:info@lingroot.com" className="text-gray-400 hover:text-white transition-colors duration-200">
                  info@lingroot.com
                </a>
              </li>

              <li className="flex items-start mt-4">
                <svg className="w-4 h-4 mr-2 mt-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-gray-400">İstanbul, Türkiye</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Alt kısım - Copyright ve Ödeme Yöntemleri */}
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} LingRoot. Tüm hakları saklıdır.
          </p>
          <div className="flex space-x-4">
            <div className="w-8 h-6 bg-gray-600 rounded flex items-center justify-center">
              <span className="text-xs text-white font-bold">VISA</span>
            </div>
            <div className="w-8 h-6 bg-gray-600 rounded flex items-center justify-center">
              <span className="text-xs text-white font-bold">MC</span>
            </div>
            <div className="w-8 h-6 bg-gray-600 rounded flex items-center justify-center">
              <span className="text-xs text-white font-bold">PP</span>
            </div>
            <div className="w-8 h-6 bg-gray-600 rounded flex items-center justify-center">
              <span className="text-xs text-white">🍎</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
} 