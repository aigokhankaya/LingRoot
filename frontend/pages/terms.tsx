import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Footer from '../src/components/Footer';
import BrandWordmark from '../src/components/BrandWordmark';
import { useTranslation } from '../src/lib/i18n';

export default function Terms() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Head>
        <title>{t('terms_title')} | LingRoot</title>
        <meta name="description" content={t('terms_hero_subtitle')} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/lingroot-icon.svg" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>
      
      {/* Header */}
      <header className="fixed w-full py-4 px-4 sm:px-6 flex justify-between items-center z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <Link href="/" className="flex items-center space-x-3">
          <img src="/lingroot-icon.svg" alt="LingRoot Logo" className="w-12 h-12 drop-shadow-lg" />
          <BrandWordmark className="text-2xl" />
        </Link>
        
        <nav className="hidden md:flex items-center space-x-8">
          <Link href="/about" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200">
            {t('about')}
          </Link>
          <Link href="/nasil-calisir" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200">
            {t('how_it_works')}
          </Link>
          <Link href="/ozellikler" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200">
            {t('features')}
          </Link>
          <Link href="/fiyatlandirma" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200">
            {t('pricing')}
          </Link>
          <Link href="/blog" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200">
            {t('blog')}
          </Link>
          <Link href="/contact" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200">
            {t('contact')}
          </Link>
        </nav>

        <div className="flex items-center space-x-4">
          <Link href="/login" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200">
            {t('login')}
          </Link>
          <Link href="/register" 
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
            {t('register_now')}
          </Link>
        </div>
      </header>

      <main className="flex-grow pt-24">
        {/* Hero Section */}
        <section className="py-20 px-6 bg-slate-900">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-medium mb-8">
              <span className="w-2 h-2 bg-white rounded-full mr-2"></span>
              {t('legal_documents')}
            </div>
            <h1 className="text-4xl md:text-7xl font-extrabold text-white mb-8 tracking-tight">
              {t('terms_hero_title')}
            </h1>
            <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed">
              {t('terms_hero_subtitle')}
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="py-20 px-6 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="prose prose-lg max-w-none">
              
              {/* Son Güncellenme */}
              <div className="mb-12 p-6 bg-muted rounded-2xl border border-border shadow-lg">
                <p className="text-primary mb-0 font-medium">
                  <strong>{t('terms_last_updated')}:</strong> 2025-01-01
                </p>
              </div>

              {/* Giriş */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {t('terms_intro_title')}
                </h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  {t('terms_intro_text1')}
                </p>
                <p className="text-gray-600 leading-relaxed">
                  {t('terms_intro_text2')}
                </p>
              </div>

              {/* Platform Kullanımı */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  1. {t('terms_section1_title')}
                </h2>
                
                <div className="space-y-6">
                  <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                    <h3 className="text-lg font-semibold text-green-900 mb-3">✅ {t('terms_section1_allowed_title')}</h3>
                    <ul className="text-green-800 space-y-2">
                      <li>• {t('terms_section1_allowed_list1')}</li>
                      <li>• {t('terms_section1_allowed_list2')}</li>
                      <li>• {t('terms_section1_allowed_list3')}</li>
                      <li>• {t('terms_section1_allowed_list4')}</li>
                    </ul>
                  </div>

                  <div className="bg-red-50 rounded-lg p-6 border border-red-200">
                    <h3 className="text-lg font-semibold text-red-900 mb-3">❌ {t('terms_section1_forbidden_title')}</h3>
                    <ul className="text-red-800 space-y-2">
                      <li>• {t('terms_section1_forbidden_list1')}</li>
                      <li>• {t('terms_section1_forbidden_list2')}</li>
                      <li>• {t('terms_section1_forbidden_list3')}</li>
                      <li>• {t('terms_section1_forbidden_list4')}</li>
                      <li>• {t('terms_section1_forbidden_list5')}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Hesap Sorumlulukları */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  2. {t('terms_section2_title')}
                </h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-muted rounded-lg p-6 border border-primary/20">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">👤 {t('terms_section2_user_title')}</h3>
                    <ul className="text-gray-700 space-y-2 text-sm">
                      <li>• {t('terms_section2_user_list1')}</li>
                      <li>• {t('terms_section2_user_list2')}</li>
                      <li>• {t('terms_section2_user_list3')}</li>
                      <li>• {t('terms_section2_user_list4')}</li>
                    </ul>
                  </div>

                  <div className="bg-muted rounded-lg p-6 border border-primary/20">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">🛡️ {t('terms_section2_rights_title')}</h3>
                    <ul className="text-gray-700 space-y-2 text-sm">
                      <li>• {t('terms_section2_rights_list1')}</li>
                      <li>• {t('terms_section2_rights_list2')}</li>
                      <li>• {t('terms_section2_rights_list3')}</li>
                      <li>• {t('terms_section2_rights_list4')}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* İçerik ve Telif Hakkı */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  3. {t('terms_section3_title')}
                </h2>
                
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-8 border border-amber-200">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-amber-900 mb-3">{t('terms_section3_warning_title')}</h3>
                      <p className="text-amber-800 mb-4">
                        {t('terms_section3_warning_text1')}
                      </p>
                      <p className="text-amber-800 mb-4">
                        {t('terms_section3_warning_text2')}
                      </p>
                      <ul className="text-amber-800 space-y-2 text-sm">
                        <li>• {t('terms_section3_list1')}</li>
                        <li>• {t('terms_section3_list2')}</li>
                        <li>• {t('terms_section3_list3')}</li>
                        <li>• {t('terms_section3_list4')}</li>
                        <li>• {t('terms_section3_list5')}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ödeme ve İade */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  4. {t('terms_section4_title')}
                </h2>
                
                <div className="space-y-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">💳 {t('terms_section4_payment_title')}</h3>
                    <ul className="text-gray-600 space-y-2">
                      <li>• {t('terms_section4_payment_list1')}</li>
                      <li>• {t('terms_section4_payment_list2')}</li>
                      <li>• {t('terms_section4_payment_list3')}</li>
                      <li>• {t('terms_section4_payment_list4')}</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">🔄 {t('terms_section4_refund_title')}</h3>
                    <ul className="text-gray-600 space-y-2">
                      <li>• {t('terms_section4_refund_list1')}</li>
                      <li>• {t('terms_section4_refund_list2')}</li>
                      <li>• {t('terms_section4_refund_list3')}</li>
                      <li>• {t('terms_section4_refund_list4')}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Hizmet Sınırlamaları */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  5. {t('terms_section5_title')}
                </h2>
                
                <div className="bg-muted rounded-xl p-8 border border-border">
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('terms_section5_access_title')}</h3>
                      <p className="text-gray-600 text-sm">{t('terms_section5_access_desc')}</p>
                    </div>

                    <div className="text-center">
                      <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('terms_section5_limits_title')}</h3>
                      <p className="text-gray-600 text-sm">{t('terms_section5_limits_desc')}</p>
                    </div>

                    <div className="text-center">
                      <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('terms_section5_support_title')}</h3>
                      <p className="text-gray-600 text-sm">{t('terms_section5_support_desc')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sorumluluk Reddi */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  6. {t('terms_section6_title')}
                </h2>
                
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <p className="text-gray-600 leading-relaxed mb-4">
                    {t('terms_section6_text')}
                  </p>
                  <ul className="text-gray-600 space-y-2">
                    <li>• {t('terms_section6_list1')}</li>
                    <li>• {t('terms_section6_list2')}</li>
                    <li>• {t('terms_section6_list3')}</li>
                    <li>• {t('terms_section6_list4')}</li>
                  </ul>
                </div>
              </div>

              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  7. {t('terms_privacy_title')}
                </h2>

                <div className="bg-muted rounded-xl p-8 border border-border">
                  <p className="text-gray-700 leading-relaxed mb-4">
                    {t('terms_privacy_text')}
                  </p>
                  <Link href="/privacy-policy" className="text-primary font-semibold hover:underline">
                    {t('privacy_policy')}
                  </Link>
                </div>
              </div>

              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  8. {t('terms_termination_title')}
                </h2>

                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-8 border border-amber-200">
                  <p className="text-amber-900 leading-relaxed mb-6">
                    {t('terms_termination_text')}
                  </p>
                  <ul className="text-amber-900 space-y-2">
                    <li>• {t('terms_termination_list1')}</li>
                    <li>• {t('terms_termination_list2')}</li>
                    <li>• {t('terms_termination_list3')}</li>
                  </ul>
                </div>
              </div>

              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  9. {t('terms_governing_law_title')}
                </h2>

                <div className="bg-white border border-gray-200 rounded-xl p-8">
                  <p className="text-gray-700 leading-relaxed mb-0">
                    {t('terms_governing_law_text')}
                  </p>
                </div>
              </div>

              {/* İletişim */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  10. {t('terms_section7_title')}
                </h2>
                
                <div className="bg-slate-900 rounded-xl p-8 text-white">
                  <h3 className="text-xl font-semibold mb-4">{t('terms_section7_subtitle')}</h3>
                  <p className="mb-6 opacity-90">
                    {t('terms_section7_text')}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link href="/contact" 
                      className="px-6 py-3 bg-white text-primary rounded-lg font-semibold hover:bg-gray-100 transition-colors text-center">
                      {t('terms_contact_button')}
                    </Link>
                    <a href="mailto:legal@lingroot.com" 
                      className="px-6 py-3 border border-white text-white rounded-lg font-semibold hover:bg-white hover:text-primary transition-colors text-center">
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
