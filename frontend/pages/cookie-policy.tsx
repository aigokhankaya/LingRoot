import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Footer from '../src/components/Footer';
import BrandWordmark from '../src/components/BrandWordmark';
import { useTranslation } from '../src/lib/i18n';

export default function CookiePolicy() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Head>
        <title>{t('cookie_title')} | LingRoot</title>
        <meta name="description" content={t('cookie_hero_subtitle')} />
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
        <section className="py-20 px-6 bg-slate-950">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-medium mb-8">
              <span className="w-2 h-2 bg-white rounded-full mr-2"></span>
              {t('legal_documents')}
            </div>
            <h1 className="text-4xl md:text-7xl font-extrabold text-white mb-8 tracking-tight">
              {t('cookie_hero_title')}
            </h1>
            <p className="text-xl md:text-2xl text-slate-200 max-w-3xl mx-auto leading-relaxed">
              {t('cookie_hero_subtitle')}
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="py-20 px-6 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="prose prose-lg max-w-none">
              
              {/* Son Güncellenme */}
              <div className="mb-12 p-6 bg-primary/5 rounded-2xl border border-primary/20 shadow-lg">
                <p className="text-primary mb-0 font-medium">
                  <strong>{t('cookie_last_updated')}:</strong> 2025-01-01
                </p>
              </div>

              {/* Giriş */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {t('cookie_intro_title')}
                </h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  {t('cookie_intro_text1')}
                </p>
                <p className="text-gray-600 leading-relaxed">
                  {t('cookie_intro_text2')}
                </p>
              </div>

              {/* Çerez Nedir */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  1. {t('cookie_section1_title')}
                </h2>
                
                <div className="bg-muted rounded-xl p-8 border border-border">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-primary mb-3">{t('cookie_section1_subtitle')}</h3>
                      <p className="text-gray-700 mb-4">
                        {t('cookie_section1_text')}
                      </p>
                      <ul className="text-gray-700 space-y-2 text-sm">
                        <li>• {t('cookie_section1_list1')}</li>
                        <li>• {t('cookie_section1_list2')}</li>
                        <li>• {t('cookie_section1_list3')}</li>
                        <li>• {t('cookie_section1_list4')}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Çerez Kategorileri */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  2. {t('cookie_section2_title')}
                </h2>
                
                <div className="space-y-6">
                  <div className="bg-red-50 rounded-lg p-6 border border-red-200">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center mr-4">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-red-900">🔒 {t('cookie_section2_mandatory_title')}</h3>
                        <p className="text-red-700 text-sm">{t('cookie_section2_mandatory_desc')}</p>
                      </div>
                    </div>
                    <ul className="text-red-800 space-y-2 text-sm">
                      <li>• {t('cookie_section2_mandatory_list1')}</li>
                      <li>• {t('cookie_section2_mandatory_list2')}</li>
                      <li>• {t('cookie_section2_mandatory_list3')}</li>
                    </ul>
                  </div>

                  <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mr-4">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-green-900">⚙️ {t('cookie_section2_functional_title')}</h3>
                        <p className="text-green-700 text-sm">{t('cookie_section2_functional_desc')}</p>
                      </div>
                    </div>
                    <ul className="text-green-800 space-y-2 text-sm">
                      <li>• {t('cookie_section2_functional_list1')}</li>
                      <li>• {t('cookie_section2_functional_list2')}</li>
                      <li>• {t('cookie_section2_functional_list3')}</li>
                    </ul>
                  </div>

                  <div className="bg-primary/5 rounded-lg p-6 border border-primary/20">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mr-4">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-primary">📊 {t('cookie_section2_analytics_title')}</h3>
                        <p className="text-gray-600 text-sm">{t('cookie_section2_analytics_desc')}</p>
                      </div>
                    </div>
                    <ul className="text-gray-700 space-y-2 text-sm">
                      <li>• {t('cookie_section2_analytics_list1')}</li>
                      <li>• {t('cookie_section2_analytics_list2')}</li>
                      <li>• {t('cookie_section2_analytics_list3')}</li>
                    </ul>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center mr-4">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 3v10a2 2 0 002 2h6a2 2 0 002-2V7M7 7h10M9 11v4m6-4v4" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-purple-900">🎯 {t('cookie_section2_marketing_title')}</h3>
                        <p className="text-purple-700 text-sm">{t('cookie_section2_marketing_desc')}</p>
                      </div>
                    </div>
                    <ul className="text-purple-800 space-y-2 text-sm">
                      <li>• {t('cookie_section2_marketing_list1')}</li>
                      <li>• {t('cookie_section2_marketing_list2')}</li>
                      <li>• {t('cookie_section2_marketing_list3')}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Çerez Yönetimi */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  3. {t('cookie_section3_title')}
                </h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">🌐 {t('cookie_section3_browser_title')}</h3>
                    <p className="text-gray-600 mb-4 text-sm">
                      {t('cookie_section3_browser_text')}
                    </p>
                    <ul className="text-gray-600 space-y-2 text-sm">
                      <li>• {t('cookie_section3_browser_list1')}</li>
                      <li>• {t('cookie_section3_browser_list2')}</li>
                      <li>• {t('cookie_section3_browser_list3')}</li>
                      <li>• {t('cookie_section3_browser_list4')}</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">⚠️ {t('cookie_section3_disable_title')}</h3>
                    <p className="text-gray-600 mb-4 text-sm">
                      {t('cookie_section3_disable_text')}
                    </p>
                    <ul className="text-gray-600 space-y-2 text-sm">
                      <li>• {t('cookie_section3_disable_list1')}</li>
                      <li>• {t('cookie_section3_disable_list2')}</li>
                      <li>• {t('cookie_section3_disable_list3')}</li>
                      <li>• {t('cookie_section3_disable_list4')}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Üçüncü Taraf Çerezler */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  4. {t('cookie_section4_title')}
                </h2>
                
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-8 border border-amber-200">
                  <h3 className="text-lg font-semibold text-amber-900 mb-4">🔗 {t('cookie_section4_subtitle')}</h3>
                  <p className="text-amber-800 mb-6">
                    {t('cookie_section4_text')}
                  </p>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-amber-200">
                      <h4 className="font-semibold text-amber-900 mb-2">{t('cookie_section4_google_title')}</h4>
                      <ul className="text-amber-800 text-sm space-y-1">
                        <li>• {t('cookie_section4_google_list1')}</li>
                        <li>• {t('cookie_section4_google_list2')}</li>
                        <li>• {t('cookie_section4_google_list3')}</li>
                      </ul>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 border border-amber-200">
                      <h4 className="font-semibold text-amber-900 mb-2">{t('cookie_section4_social_title')}</h4>
                      <ul className="text-amber-800 text-sm space-y-1">
                        <li>• {t('cookie_section4_social_list1')}</li>
                        <li>• {t('cookie_section4_social_list2')}</li>
                        <li>• {t('cookie_section4_social_list3')}</li>
                      </ul>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 border border-amber-200">
                      <h4 className="font-semibold text-amber-900 mb-2">{t('cookie_section4_payment_title')}</h4>
                      <ul className="text-amber-800 text-sm space-y-1">
                        <li>• {t('cookie_section4_payment_list1')}</li>
                        <li>• {t('cookie_section4_payment_list2')}</li>
                        <li>• {t('cookie_section4_payment_list3')}</li>
                      </ul>
                    </div>
                  </div>
                  
                  <p className="text-amber-800 mt-4 text-sm">
                    {t('cookie_section4_note')}
                  </p>
                </div>
              </div>

              {/* İletişim */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  5. <span className="text-primary">{t('cookie_section5_title')}</span>
                </h2>
                
                <div className="bg-slate-900 rounded-xl p-8 text-white">
                  <h3 className="text-xl font-semibold mb-4">{t('cookie_section5_subtitle')}</h3>
                  <p className="mb-6 opacity-90">
                    {t('cookie_section5_text')}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link href="/contact" 
                      className="px-6 py-3 bg-white text-primary rounded-lg font-semibold hover:bg-gray-100 transition-colors text-center">
                      {t('cookie_contact_button')}
                    </Link>
                    <a href="mailto:privacy@lingroot.com" 
                      className="px-6 py-3 border border-white text-white rounded-lg font-semibold hover:bg-white hover:text-primary transition-colors text-center">
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
