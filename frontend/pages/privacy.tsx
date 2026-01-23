import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Footer from '../src/components/Footer';
import BrandWordmark from '../src/components/BrandWordmark';
import { useTranslation } from '../src/lib/i18n';

export default function Privacy() {
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
          <Link href="/ozellikler" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200">
            {t('features')}
          </Link>
          <Link href="/fiyatlandirma" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200">
            {t('pricing')}
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
                  <strong>{t('privacy_last_updated')}:</strong> {new Date().toLocaleDateString()}
                </p>
              </div>

              {/* Giriş */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {t('privacy_intro_title')}
                </h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  {t('privacy_intro_text1')}
                </p>
                <p className="text-gray-600 leading-relaxed">
                  {t('privacy_intro_text2')}
                </p>
              </div>

              {/* Veri Sorumlusu */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {t('privacy_controller_title')}
                </h2>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-8">
                  <p className="text-blue-900 mb-4">{t('privacy_controller_text')}</p>
                  <ul className="space-y-2 text-blue-800 font-medium">
                    <li><strong>{t('privacy_controller_company_label')}</strong> {t('privacy_controller_company_value')}</li>
                    <li><strong>{t('privacy_controller_address_label')}</strong> {t('privacy_controller_address_value')}</li>
                    <li><strong>{t('privacy_controller_email_label')}</strong> <a href={`mailto:${t('privacy_controller_email_value')}`} className="underline">{t('privacy_controller_email_value')}</a></li>
                  </ul>
                </div>
              </div>

              {/* Toplanan Veriler */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {t('privacy_data_collected')}
                </h2>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">👤 {t('privacy_account_info')}</h3>
                    <ul className="text-gray-600 space-y-2 text-sm">
                      <li>• {t('privacy_account_item1')}</li>
                      <li>• {t('privacy_account_item2')}</li>
                      <li>• {t('privacy_account_item3')}</li>
                      <li>• {t('privacy_account_item4')}</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">🛠️ {t('privacy_technical_data')}</h3>
                    <ul className="text-gray-600 space-y-2 text-sm">
                      <li>• {t('privacy_technical_item1')}</li>
                      <li>• {t('privacy_technical_item2')}</li>
                      <li>• {t('privacy_technical_item3')}</li>
                      <li>• {t('privacy_technical_item4')}</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow md:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 {t('privacy_usage_data')}</h3>
                    <ul className="text-gray-600 space-y-2 text-sm grid md:grid-cols-2 gap-2">
                      <li>• {t('privacy_usage_item1')}</li>
                      <li>• {t('privacy_usage_item2')}</li>
                      <li>• {t('privacy_usage_item3')}</li>
                      <li>• {t('privacy_usage_item4')}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Hukuki Sebepler */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {t('privacy_legal_bases_title')}
                </h2>
                <div className="bg-gray-50 rounded-xl p-8 border border-gray-200">
                  <p className="text-gray-600 mb-4">{t('privacy_legal_bases_text')}</p>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <span className="bg-green-100 text-green-600 rounded-full p-1 mr-3 mt-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg></span>
                      <span className="text-gray-700">{t('privacy_legal_bases_item1')}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-green-100 text-green-600 rounded-full p-1 mr-3 mt-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg></span>
                      <span className="text-gray-700">{t('privacy_legal_bases_item2')}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-green-100 text-green-600 rounded-full p-1 mr-3 mt-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg></span>
                      <span className="text-gray-700">{t('privacy_legal_bases_item3')}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="bg-green-100 text-green-600 rounded-full p-1 mr-3 mt-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg></span>
                      <span className="text-gray-700">{t('privacy_legal_bases_item4')}</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Veri Paylaşımı */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {t('privacy_sharing_title')}
                </h2>
                <p className="text-gray-600 mb-4">{t('privacy_sharing_text')}</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg border border-border">
                    <span className="text-2xl mr-2">💳</span> {t('privacy_sharing_item1')}
                  </div>
                  <div className="p-4 bg-muted rounded-lg border border-border">
                    <span className="text-2xl mr-2">🤖</span> {t('privacy_sharing_item2')}
                  </div>
                  <div className="p-4 bg-muted rounded-lg border border-border">
                    <span className="text-2xl mr-2">☁️</span> {t('privacy_sharing_item3')}
                  </div>
                  <div className="p-4 bg-muted rounded-lg border border-border">
                    <span className="text-2xl mr-2">📧</span> {t('privacy_sharing_item4')}
                  </div>
                </div>
              </div>

              {/* Güvenlik */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {t('privacy_security')}
                </h2>
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-8 border border-emerald-200">
                  <div className="grid md:grid-cols-3 gap-6 text-center">
                    <div>
                      <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-2xl">🔒</div>
                      <h4 className="font-semibold text-emerald-900">{t('privacy_ssl_encryption')}</h4>
                      <p className="text-sm text-emerald-800">{t('privacy_ssl_desc')}</p>
                    </div>
                    <div>
                      <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-2xl">💾</div>
                      <h4 className="font-semibold text-emerald-900">{t('privacy_secure_storage')}</h4>
                      <p className="text-sm text-emerald-800">{t('privacy_secure_storage_desc')}</p>
                    </div>
                    <div>
                      <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-2xl">🛡️</div>
                      <h4 className="font-semibold text-emerald-900">{t('privacy_access_control')}</h4>
                      <p className="text-sm text-emerald-800">{t('privacy_access_control_desc')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Uluslararası Aktarım */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {t('privacy_international_transfers_title')}
                </h2>
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <p className="text-gray-600">{t('privacy_international_transfers_text')}</p>
                </div>
              </div>

              {/* Saklama Süreleri */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {t('privacy_retention_title')}
                </h2>
                <p className="text-gray-600 mb-4">{t('privacy_retention_text')}</p>
                <ul className="list-disc pl-5 text-gray-600 space-y-2">
                  <li>{t('privacy_retention_item1')}</li>
                  <li>{t('privacy_retention_item2')}</li>
                  <li>{t('privacy_retention_item3')}</li>
                </ul>
              </div>

              {/* İletişim */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {t('privacy_questions_title')}
                </h2>

                <div className="bg-slate-900 rounded-xl p-8 text-white">
                  <p className="mb-6 opacity-90 text-lg">
                    {t('privacy_questions_desc')}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link href="/contact"
                      className="px-6 py-3 bg-white text-primary rounded-lg font-semibold hover:bg-gray-100 transition-colors text-center">
                      {t('privacy_contact_us')}
                    </Link>
                    <a href={`mailto:${t('privacy_controller_email_value')}`}
                      className="px-6 py-3 border border-white text-white rounded-lg font-semibold hover:bg-white hover:text-primary transition-colors text-center">
                      {t('privacy_controller_email_value')}
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