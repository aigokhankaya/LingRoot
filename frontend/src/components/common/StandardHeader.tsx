import React, { useState } from 'react';
import Link from 'next/link';

export default function StandardHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-white shadow-sm py-3 sticky top-0 z-50">
      <div className="container mx-auto px-8 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <img src="/logo.svg" alt="LingRoot Logo" className="w-8 h-8 md:w-10 md:h-10" />
          <span className="text-xl md:text-2xl font-extrabold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 bg-clip-text text-transparent tracking-tight">LingRoot</span>
        </div>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          <Link href="/about" className="text-gray-600 hover:text-blue-600 transition-colors duration-200 cursor-pointer text-sm lg:text-base">
            Hakkımızda
          </Link>
          <Link href="/nasil-calisir" className="text-gray-600 hover:text-blue-600 transition-colors duration-200 cursor-pointer text-sm lg:text-base">
            Nasıl Çalışır?
          </Link>
          <Link href="/ozellikler" className="text-gray-600 hover:text-blue-600 transition-colors duration-200 cursor-pointer text-sm lg:text-base">
            Özellikler
          </Link>
          <Link href="/fiyatlandirma" className="text-gray-600 hover:text-blue-600 transition-colors duration-200 cursor-pointer text-sm lg:text-base">
            Fiyatlandırma
          </Link>
          <Link href="/blog" className="text-gray-600 hover:text-blue-600 transition-colors duration-200 cursor-pointer text-sm lg:text-base">
            Blog
          </Link>
        </div>
        
        {/* Desktop Buttons */}
        <div className="hidden md:flex items-center space-x-4">
          <Link href="/login" className="text-gray-600 hover:text-gray-700 font-medium transition-colors duration-200">
            Giriş Yap
          </Link>
          <Link href="/register" className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl">
            Ücretsiz Başla
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-gray-600 hover:text-gray-900 focus:outline-none focus:text-gray-900"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-8 py-4 space-y-4">
            <Link href="/about" className="block text-gray-600 hover:text-blue-600 transition-colors duration-200">
              Hakkımızda
            </Link>
            <Link href="/nasil-calisir" className="block text-gray-600 hover:text-blue-600 transition-colors duration-200">
              Nasıl Çalışır?
            </Link>
            <Link href="/ozellikler" className="block text-gray-600 hover:text-blue-600 transition-colors duration-200">
              Özellikler
            </Link>
            <Link href="/fiyatlandirma" className="block text-gray-600 hover:text-blue-600 transition-colors duration-200">
              Fiyatlandırma
            </Link>
            <Link href="/blog" className="block text-gray-600 hover:text-blue-600 transition-colors duration-200">
              Blog
            </Link>
            <div className="pt-4 border-t border-gray-200">
              <Link href="/login" className="block text-gray-600 hover:text-gray-700 font-medium mb-2">
                Giriş Yap
              </Link>
              <Link href="/register" className="block px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium text-center">
                Ücretsiz Başla
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
} 