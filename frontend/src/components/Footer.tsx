'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gradient-to-r from-primary via-emerald-600 to-teal-600 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Logo ve Slogan */}
          <div>
            <div className="flex items-center space-x-2 mb-6">
              <img src="/lingroot-icon16.svg" alt="LingRoot" className="w-10 h-10" />
              <span className="text-2xl font-extrabold tracking-tight">LingRoot</span>
            </div>
            <p className="text-gray-400 mb-4">"Your routines turn into English."</p>
            <div className="flex space-x-4">
              <a
                href="https://instagram.com/lingtoroot"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer"
              >
                <i className="fab fa-instagram text-xl"></i>
              </a>
              <a
                href="https://youtube.com/@lingroot"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer"
              >
                <i className="fab fa-youtube text-xl"></i>
              </a>
            </div>
          </div>

          {/* Hızlı Bağlantılar */}
          <div>
            <h3 className="text-lg font-bold mb-4">Hızlı Bağlantılar</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/about"
                  className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer"
                >
                  Hakkımızda
                </Link>
              </li>
              <li>
                <Link
                  href="/nasil-calisir"
                  className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer"
                >
                  Nasıl Çalışır?
                </Link>
              </li>
              <li>
                <Link
                  href="/fiyatlandirma"
                  className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer"
                >
                  Fiyatlandırma
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer"
                >
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
                <Link
                  href="/privacy-policy"
                  className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer"
                >
                  Gizlilik Politikası
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer"
                >
                  Kullanım Şartları
                </Link>
              </li>
              <li>
                <Link
                  href="/cookie-policy"
                  className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer"
                >
                  Çerez Politikası
                </Link>
              </li>
              <li>
                <Link
                  href="/kvkk"
                  className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer"
                >
                  KVKK
                </Link>
              </li>
            </ul>
          </div>

          {/* Bize Ulaşın */}
          <div>
            <h3 className="text-lg font-bold mb-4">Bize Ulaşın</h3>
            <ul className="space-y-2">
              <li className="flex items-center">
                <i className="fas fa-envelope mr-2 text-gray-400"></i>
                <a
                  href="mailto:info@lingroot.com"
                  className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer"
                >
                  info@lingroot.com
                </a>
              </li>
              <li className="flex items-start mt-4">
                <i className="fas fa-map-marker-alt mr-2 mt-1 text-gray-400"></i>
                <span className="text-gray-400">İstanbul, Türkiye</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Alt kısım - Copyright ve Ödeme Yöntemleri */}
        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} LingRoot. Tüm hakları saklıdır.
          </p>
          <div className="flex space-x-4">
            <i className="fab fa-cc-visa text-2xl text-gray-400"></i>
            <i className="fab fa-cc-mastercard text-2xl text-gray-400"></i>
            <i className="fab fa-cc-paypal text-2xl text-gray-400"></i>
            <i className="fab fa-apple-pay text-2xl text-gray-400"></i>
          </div>
        </div>
      </div>
    </footer>
  );
}

 