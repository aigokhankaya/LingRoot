import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Footer from '../src/components/Footer';
import { useTranslation } from '../src/lib/i18n';
import BrandWordmark from '../src/components/BrandWordmark';

export default function PrivacyPolicy() {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Head>
        <title>{t('privacy_policy_title')} | LingRoot</title>
        <meta name="description" content={t('privacy_policy_subtitle')} />
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
              {t('privacy_policy_title')}
            </h1>
            <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed">
              {t('privacy_policy_subtitle')}
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
                  <strong>{t('privacy_last_updated')}:</strong> 1 Ocak 2025
                </p>
              </div>

              {/* Giriş */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                  {t('privacy_intro_title')}
                </h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  {t('privacy_intro_text1')}
                </p>
                <p className="text-gray-600 leading-relaxed">
                  {t('privacy_intro_text2')}
                </p>
              </div>

              {/* Topladığımız Veriler */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-8">
                  1. {t('privacy_data_collected')}
                </h2>
                
                <div className="space-y-6">
                  <div className="bg-muted rounded-2xl p-8 border border-border shadow-lg">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('privacy_account_info')}</h3>
                    <ul className="text-gray-600 space-y-3">
                      <li className="flex items-center"><span className="w-2 h-2 bg-primary rounded-full mr-3"></span>{t('privacy_account_item1')}</li>
                      <li className="flex items-center"><span className="w-2 h-2 bg-primary rounded-full mr-3"></span>{t('privacy_account_item2')}</li>
                      <li className="flex items-center"><span className="w-2 h-2 bg-primary rounded-full mr-3"></span>{t('privacy_account_item3')}</li>
                      <li className="flex items-center"><span className="w-2 h-2 bg-primary rounded-full mr-3"></span>{t('privacy_account_item4')}</li>
                    </ul>
                  </div>

                  <div className="bg-muted rounded-2xl p-8 border border-border shadow-lg">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('privacy_usage_data')}</h3>
                    <ul className="text-gray-600 space-y-3">
                      <li className="flex items-center"><span className="w-2 h-2 bg-secondary rounded-full mr-3"></span>{t('privacy_usage_item1')}</li>
                      <li className="flex items-center"><span className="w-2 h-2 bg-secondary rounded-full mr-3"></span>{t('privacy_usage_item2')}</li>
                      <li className="flex items-center"><span className="w-2 h-2 bg-secondary rounded-full mr-3"></span>{t('privacy_usage_item3')}</li>
                      <li className="flex items-center"><span className="w-2 h-2 bg-secondary rounded-full mr-3"></span>{t('privacy_usage_item4')}</li>
                    </ul>
                  </div>

                  <div className="bg-gradient-to-r from-gray-50 to-green-50 rounded-2xl p-8 border border-gray-200 shadow-lg">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('privacy_technical_data')}</h3>
                    <ul className="text-gray-600 space-y-3">
                      <li className="flex items-center"><span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>{t('privacy_technical_item1')}</li>
                      <li className="flex items-center"><span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>{t('privacy_technical_item2')}</li>
                      <li className="flex items-center"><span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>{t('privacy_technical_item3')}</li>
                      <li className="flex items-center"><span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>{t('privacy_technical_item4')}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Veri Kullanımı */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-8">
                  2. {t('privacy_how_we_use')}
                </h2>
                
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="bg-muted rounded-2xl p-8 border border-border shadow-lg">
                    <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-6">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('privacy_service_provision')}</h3>
                    <ul className="text-gray-800 space-y-3 text-sm">
                      <li className="flex items-start"><span className="w-1.5 h-1.5 bg-primary rounded-full mr-3 mt-2"></span>{t('privacy_service_item1')}</li>
                      <li className="flex items-start"><span className="w-1.5 h-1.5 bg-primary rounded-full mr-3 mt-2"></span>{t('privacy_service_item2')}</li>
                      <li className="flex items-start"><span className="w-1.5 h-1.5 bg-primary rounded-full mr-3 mt-2"></span>{t('privacy_service_item3')}</li>
                    </ul>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-8 border border-green-200 shadow-lg">
                    <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mb-6">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-green-900 mb-4">{t('privacy_communication')}</h3>
                    <ul className="text-green-800 space-y-3 text-sm">
                      <li className="flex items-start"><span className="w-1.5 h-1.5 bg-green-600 rounded-full mr-3 mt-2"></span>{t('privacy_comm_item1')}</li>
                      <li className="flex items-start"><span className="w-1.5 h-1.5 bg-green-600 rounded-full mr-3 mt-2"></span>{t('privacy_comm_item2')}</li>
                      <li className="flex items-start"><span className="w-1.5 h-1.5 bg-green-600 rounded-full mr-3 mt-2"></span>{t('privacy_comm_item3')}</li>
                    </ul>
                  </div>

                  <div className="bg-muted rounded-2xl p-8 border border-border shadow-lg">
                    <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mb-6">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">{t('privacy_development')}</h3>
                    <ul className="text-gray-800 space-y-3 text-sm">
                      <li className="flex items-start"><span className="w-1.5 h-1.5 bg-secondary rounded-full mr-3 mt-2"></span>{t('privacy_dev_item1')}</li>
                      <li className="flex items-start"><span className="w-1.5 h-1.5 bg-secondary rounded-full mr-3 mt-2"></span>{t('privacy_dev_item2')}</li>
                      <li className="flex items-start"><span className="w-1.5 h-1.5 bg-secondary rounded-full mr-3 mt-2"></span>{t('privacy_dev_item3')}</li>
                    </ul>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-8 border border-orange-200 shadow-lg">
                    <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mb-6">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-orange-900 mb-4">{t('privacy_security')}</h3>
                    <ul className="text-orange-800 space-y-3 text-sm">
                      <li className="flex items-start"><span className="w-1.5 h-1.5 bg-orange-600 rounded-full mr-3 mt-2"></span>{t('privacy_sec_item1')}</li>
                      <li className="flex items-start"><span className="w-1.5 h-1.5 bg-orange-600 rounded-full mr-3 mt-2"></span>{t('privacy_sec_item2')}</li>
                      <li className="flex items-start"><span className="w-1.5 h-1.5 bg-orange-600 rounded-full mr-3 mt-2"></span>{t('privacy_sec_item3')}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Veri Korunması */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-8">
                  3. {t('privacy_data_protection')}
                </h2>
                
                <div className="bg-muted rounded-3xl p-12 border border-border shadow-2xl">
                  <div className="grid md:grid-cols-3 gap-8">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('privacy_ssl_encryption')}</h3>
                      <p className="text-gray-600">{t('privacy_ssl_desc')}</p>
                    </div>

                    <div className="text-center">
                      <div className="w-20 h-20 bg-secondary rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('privacy_secure_storage')}</h3>
                      <p className="text-gray-600">{t('privacy_secure_storage_desc')}</p>
                    </div>

                    <div className="text-center">
                      <div className="w-20 h-20 bg-green-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('privacy_access_control')}</h3>
                      <p className="text-gray-600">{t('privacy_access_control_desc')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* İletişim */}
              <div className="bg-slate-900 rounded-3xl p-12 text-white text-center shadow-2xl">
                <h2 className="text-3xl font-bold mb-6">{t('privacy_questions_title')}</h2>
                <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
                  {t('privacy_questions_desc')}
                </p>
                <Link href="/contact" 
                  className="inline-flex items-center px-8 py-4 bg-white text-primary rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {t('privacy_contact_us')}
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
