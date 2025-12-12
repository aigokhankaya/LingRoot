import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Footer from '../src/components/Footer';
import BrandWordmark from '../src/components/BrandWordmark';
import { useTranslation } from '../src/lib/i18n';

export default function KVKK() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Head>
        <title>{t('kvkk_title')} | LingRoot</title>
        <meta name="description" content={t('kvkk_hero_subtitle')} />
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
        <section className="py-20 px-6 bg-slate-950">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-medium mb-8">
              <span className="w-2 h-2 bg-white rounded-full mr-2"></span>
              {t('legal_documents')}
            </div>
            <h1 className="text-4xl md:text-7xl font-extrabold text-white mb-8 tracking-tight">
              {t('kvkk_title')}
            </h1>
            <p className="text-xl md:text-2xl text-slate-200 max-w-3xl mx-auto leading-relaxed">
              {t('kvkk_hero_subtitle')}
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
                  <strong>{t('kvkk_last_updated')}:</strong> 1 Ocak 2025 | <strong>{t('kvkk_compliance')}:</strong> {t('kvkk_law_no')}
                </p>
              </div>

              {/* Giriş */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {t('kvkk_intro_title')}
                </h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  {t('kvkk_intro_text1')}
                </p>
                <p className="text-gray-600 leading-relaxed">
                  {t('kvkk_intro_text2')}
                </p>
              </div>

              {/* Veri Sorumlusu Bilgileri */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  1. {t('kvkk_section1_title')}
                </h2>
                
                <div className="bg-muted rounded-xl p-8 border border-border">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-primary mb-3">{t('kvkk_company_info_title')}</h3>
                      <ul className="text-gray-700 space-y-2 text-sm">
                        <li><strong>{t('kvkk_company_name_label')}</strong> {t('kvkk_company_name')}</li>
                        <li><strong>{t('kvkk_address_label')}</strong> {t('kvkk_address')}</li>
                        <li><strong>{t('kvkk_email_label')}</strong> {t('kvkk_email')}</li>
                        <li><strong>{t('kvkk_phone_label')}</strong> {t('kvkk_phone')}</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-accent-foreground mb-3">{t('kvkk_officer_title')}</h3>
                      <ul className="text-gray-700 space-y-2 text-sm">
                        <li><strong>{t('kvkk_officer_name_label')}</strong> {t('kvkk_officer_name')}</li>
                        <li><strong>{t('kvkk_officer_email_label')}</strong> {t('kvkk_officer_email')}</li>
                        <li><strong>{t('kvkk_officer_role_label')}</strong> {t('kvkk_officer_role')}</li>
                        <li><strong>{t('kvkk_officer_hours_label')}</strong> {t('kvkk_officer_hours')}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Kişisel Veri Türleri */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  2. {t('kvkk_section2_title')}
                </h2>
                
                <div className="space-y-6">
                  <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                    <h3 className="text-lg font-semibold text-green-900 mb-3">🧑 {t('kvkk_identity_data_title')}</h3>
                    <ul className="text-green-800 space-y-2 text-sm">
                      <li>• {t('kvkk_identity_data_list1')}</li>
                      <li>• {t('kvkk_identity_data_list2')}</li>
                      <li>• {t('kvkk_identity_data_list3')}</li>
                      <li>• {t('kvkk_identity_data_list4')}</li>
                    </ul>
                  </div>

                  <div className="bg-primary/5 rounded-lg p-6 border border-primary/20">
                    <h3 className="text-lg font-semibold text-primary mb-3">💰 {t('kvkk_financial_data_title')}</h3>
                    <ul className="text-gray-700 space-y-2 text-sm">
                      <li>• {t('kvkk_financial_data_list1')}</li>
                      <li>• {t('kvkk_financial_data_list2')}</li>
                      <li>• {t('kvkk_financial_data_list3')}</li>
                    </ul>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
                    <h3 className="text-lg font-semibold text-purple-900 mb-3">📚 {t('kvkk_education_data_title')}</h3>
                    <ul className="text-purple-800 space-y-2 text-sm">
                      <li>• {t('kvkk_education_data_list1')}</li>
                      <li>• {t('kvkk_education_data_list2')}</li>
                      <li>• {t('kvkk_education_data_list3')}</li>
                      <li>• {t('kvkk_education_data_list4')}</li>
                    </ul>
                  </div>

                  <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
                    <h3 className="text-lg font-semibold text-orange-900 mb-3">🌐 {t('kvkk_technical_data_title')}</h3>
                    <ul className="text-orange-800 space-y-2 text-sm">
                      <li>• {t('kvkk_technical_data_list1')}</li>
                      <li>• {t('kvkk_technical_data_list2')}</li>
                      <li>• {t('kvkk_technical_data_list3')}</li>
                      <li>• {t('kvkk_technical_data_list4')}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* İşleme Amaçları */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  3. {t('kvkk_section3_title')}
                </h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="w-8 h-8 bg-primary rounded-full flex items-center justify-center mr-3">
                        <span className="text-white text-sm">1</span>
                      </span>
                      {t('kvkk_purpose_service_title')}
                    </h3>
                    <ul className="text-gray-600 space-y-2 text-sm">
                      <li>• {t('kvkk_purpose_service_list1')}</li>
                      <li>• {t('kvkk_purpose_service_list2')}</li>
                      <li>• {t('kvkk_purpose_service_list3')}</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-3">
                        <span className="text-white text-sm">2</span>
                      </span>
                      {t('kvkk_purpose_security_title')}
                    </h3>
                    <ul className="text-gray-600 space-y-2 text-sm">
                      <li>• {t('kvkk_purpose_security_list1')}</li>
                      <li>• {t('kvkk_purpose_security_list2')}</li>
                      <li>• {t('kvkk_purpose_security_list3')}</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                        <span className="text-white text-sm">3</span>
                      </span>
                      {t('kvkk_purpose_communication_title')}
                    </h3>
                    <ul className="text-gray-600 space-y-2 text-sm">
                      <li>• {t('kvkk_purpose_communication_list1')}</li>
                      <li>• {t('kvkk_purpose_communication_list2')}</li>
                      <li>• {t('kvkk_purpose_communication_list3')}</li>
                    </ul>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center mr-3">
                        <span className="text-white text-sm">4</span>
                      </span>
                      {t('kvkk_purpose_analysis_title')}
                    </h3>
                    <ul className="text-gray-600 space-y-2 text-sm">
                      <li>• {t('kvkk_purpose_analysis_list1')}</li>
                      <li>• {t('kvkk_purpose_analysis_list2')}</li>
                      <li>• {t('kvkk_purpose_analysis_list3')}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* KVKK Hakları */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  4. {t('kvkk_section4_title')}
                </h2>
                
                <div className="bg-gradient-to-r from-green-50 to-primary/10 rounded-xl p-8 border border-green-200">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">
                    {t('kvkk_rights_subtitle')}
                  </h3>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="bg-white rounded-lg p-4 border border-green-200">
                        <h4 className="font-semibold text-green-900 mb-2">📋 {t('kvkk_right_info_title')}</h4>
                        <p className="text-green-800 text-sm">
                          {t('kvkk_right_info_desc')}
                        </p>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 border border-primary/20">
                        <h4 className="font-semibold text-primary mb-2">✏️ {t('kvkk_right_correction_title')}</h4>
                        <p className="text-gray-700 text-sm">
                          {t('kvkk_right_correction_desc')}
                        </p>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 border border-purple-200">
                        <h4 className="font-semibold text-purple-900 mb-2">🗑️ {t('kvkk_right_deletion_title')}</h4>
                        <p className="text-purple-800 text-sm">
                          {t('kvkk_right_deletion_desc')}
                        </p>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 border border-orange-200">
                        <h4 className="font-semibold text-orange-900 mb-2">⚠️ {t('kvkk_right_objection_title')}</h4>
                        <p className="text-orange-800 text-sm">
                          {t('kvkk_right_objection_desc')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-white rounded-lg p-4 border border-red-200">
                        <h4 className="font-semibold text-red-900 mb-2">🚫 {t('kvkk_right_stop_title')}</h4>
                        <p className="text-red-800 text-sm">
                          {t('kvkk_right_stop_desc')}
                        </p>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 border border-accent/40">
                        <h4 className="font-semibold text-accent-foreground mb-2">📤 {t('kvkk_right_portability_title')}</h4>
                        <p className="text-gray-700 text-sm">
                          {t('kvkk_right_portability_desc')}
                        </p>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 border border-pink-200">
                        <h4 className="font-semibold text-pink-900 mb-2">⚖️ {t('kvkk_right_compensation_title')}</h4>
                        <p className="text-pink-800 text-sm">
                          {t('kvkk_right_compensation_desc')}
                        </p>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 border border-teal-200">
                        <h4 className="font-semibold text-teal-900 mb-2">📢 {t('kvkk_right_notification_title')}</h4>
                        <p className="text-teal-800 text-sm">
                          {t('kvkk_right_notification_desc')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Başvuru Prosedürü */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  5. {t('kvkk_section5_title')}
                </h2>
                
                <div className="space-y-6">
                  <div className="bg-primary/5 rounded-lg p-6 border border-primary/20">
                    <h3 className="text-lg font-semibold text-primary mb-4">📝 {t('kvkk_app_methods_title')}</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="bg-white rounded-lg p-4 border border-primary/20">
                        <h4 className="font-semibold text-primary mb-2">📧 {t('kvkk_app_email_title')}</h4>
                        <p className="text-gray-700 text-sm mb-2">kvkk@lingroot.com</p>
                        <p className="text-gray-500 text-xs">{t('kvkk_app_email_desc')}</p>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 border border-primary/20">
                        <h4 className="font-semibold text-primary mb-2">📞 {t('kvkk_app_phone_title')}</h4>
                        <p className="text-gray-700 text-sm mb-2">+90 212 123 45 67</p>
                        <p className="text-gray-500 text-xs">{t('kvkk_app_phone_desc')}</p>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 border border-primary/20">
                        <h4 className="font-semibold text-primary mb-2">🏢 {t('kvkk_app_physical_title')}</h4>
                        <p className="text-gray-700 text-sm mb-2">{t('kvkk_app_physical_desc')}</p>
                        <p className="text-gray-500 text-xs">{t('kvkk_app_physical_subdesc')}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">⏱️ {t('kvkk_process_title')}</h3>
                    <ul className="text-gray-600 space-y-2">
                      <li>• {t('kvkk_process_list1')}</li>
                      <li>• {t('kvkk_process_list2')}</li>
                      <li>• {t('kvkk_process_list3')}</li>
                      <li>• {t('kvkk_process_list4')}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* İletişim */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  6. <span className="text-primary">{t('kvkk_section6_title')}</span>
                </h2>
                
                <div className="bg-slate-900 rounded-xl p-8 text-white">
                  <h3 className="text-xl font-semibold mb-4">{t('kvkk_contact_subtitle')}</h3>
                  <p className="mb-6 opacity-90">
                    {t('kvkk_contact_text')}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <a href="mailto:kvkk@lingroot.com" 
                      className="px-6 py-3 bg-white text-primary rounded-lg font-semibold hover:bg-gray-100 transition-colors text-center">
                      {t('kvkk_contact_button')}
                    </a>
                    <Link href="/contact" 
                      className="px-6 py-3 border border-white text-white rounded-lg font-semibold hover:bg-white hover:text-primary transition-colors text-center">
                      {t('kvkk_general_contact_button')}
                    </Link>
                  </div>
                  
                  <div className="mt-6 p-4 bg-white/10 rounded-lg">
                    <p className="text-sm opacity-90">
                      {t('kvkk_important_note')}
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
