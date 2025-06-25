'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Logo ve Slogan */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#28a745] rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">LR</span>
              </div>
              <span className="font-bold text-2xl text-white">
                <span className="text-[#28a745]">Ling</span>Root
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
              <li className="flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <a href="tel:+902121234567" className="text-gray-400 hover:text-white transition-colors duration-200">
                  +90 212 123 45 67
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