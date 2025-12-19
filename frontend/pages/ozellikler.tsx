import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Footer from '../src/components/Footer';
import { useTranslation } from '../src/lib/i18n';

export default function Ozellikler() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Head>
        <title>{t('features')} | LingRoot</title>
        <meta name="description" content={t('features_hero_desc')} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/lingroot-icon.svg" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>

      {/* Header */}
      <header className="fixed w-full py-4 px-4 sm:px-6 flex justify-between items-center z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <Link href="/" className="flex items-center space-x-3">
          <div className="w-12 h-12 relative">
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-lg"
            >
              <circle cx="24" cy="24" r="22" fill="url(#gradient)" stroke="url(#borderGradient)" strokeWidth="2" />
              <path d="M32 18c0-4.4-3.6-8-8-8s-8 3.6-8 8 3.6 8 8 8c1.1 0 2.2-.2 3.2-.6l4.8 2.4v-4.2c1.2-1.5 1.9-3.4 1.9-5.6z" fill="white" fillOpacity="0.9" />
              <path d="M24 14v8m-3-4h6m-6 2h6" stroke="url(#textGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
          <span className="font-extrabold text-2xl text-primary tracking-tight">
            LingRoot
          </span>
        </Link>

        <nav className="hidden md:flex items-center space-x-8">
          <Link href="/about" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200">
            {t('about')}
          </Link>
          <Link href="/nasil-calisir" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200">
            {t('how_it_works')}
          </Link>
          <Link href="/ozellikler" className="text-primary hover:text-primary/80 font-semibold transition-colors duration-200">
            {t('features')}
          </Link>
          <Link href="/fiyatlandirma" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200">
            {t('pricing')}
          </Link>
          <Link href="/blog" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200">
            {t('blog')}
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
          <div className="max-w-6xl mx-auto text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-medium mb-8">
              <span className="w-2 h-2 bg-white rounded-full mr-2"></span>
              {t('features_hero_badge')}
            </div>
            <h1 className="text-4xl md:text-7xl font-extrabold text-white mb-8 tracking-tight">
              {t('features_hero_title')} <span className="text-primary">{t('features_hero_highlight')}</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/80 max-w-4xl mx-auto leading-relaxed">
              {t('features_hero_desc')}
            </p>
          </div>
        </section>

        <section className="py-20 px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                {t('features_main_title')} <span className="text-primary">{t('features_main_highlight')}</span>
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                {t('features_main_desc')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-muted p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-primary/20 hover:border-primary/40 group hover:-translate-y-2">
                <div className="mb-6 bg-primary text-primary-foreground rounded-xl w-16 h-16 flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-primary transition-all duration-300">{t('feature_personalized_title')}</h3>
                <p className="text-gray-600 leading-relaxed">{t('feature_personalized_desc')}</p>
              </div>

              <div className="bg-white p-6 md:p-8 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-[#28a745] group hover:-translate-y-1">
                <div className="mb-6 bg-[#d1e7dd] text-[#28a745] rounded-lg w-14 h-14 flex items-center justify-center group-hover:bg-[#28a745] group-hover:text-white transition-colors duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-[#28a745]">{t('feature_listening_title')}</h3>
                <p className="text-gray-600">{t('feature_listening_desc')}</p>
              </div>

              <div className="bg-white p-6 md:p-8 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-[#28a745] group hover:-translate-y-1">
                <div className="mb-6 bg-[#d1e7dd] text-[#28a745] rounded-lg w-14 h-14 flex items-center justify-center group-hover:bg-[#28a745] group-hover:text-white transition-colors duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-[#28a745]">{t('feature_vocabulary_title')}</h3>
                <p className="text-gray-600">{t('feature_vocabulary_desc')}</p>
              </div>

              <div className="bg-white p-6 md:p-8 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-[#28a745] group hover:-translate-y-1">
                <div className="mb-6 bg-[#d1e7dd] text-[#28a745] rounded-lg w-14 h-14 flex items-center justify-center group-hover:bg-[#28a745] group-hover:text-white transition-colors duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-[#28a745]">{t('feature_realworld_title')}</h3>
                <p className="text-gray-600">{t('feature_realworld_desc')}</p>
              </div>

              <div className="bg-white p-6 md:p-8 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-[#28a745] group hover:-translate-y-1">
                <div className="mb-6 bg-[#d1e7dd] text-[#28a745] rounded-lg w-14 h-14 flex items-center justify-center group-hover:bg-[#28a745] group-hover:text-white transition-colors duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-[#28a745]">{t('feature_progress_title')}</h3>
                <p className="text-gray-600">{t('feature_progress_desc')}</p>
              </div>

              <div className="bg-white p-6 md:p-8 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-[#28a745] group hover:-translate-y-1">
                <div className="mb-6 bg-[#d1e7dd] text-[#28a745] rounded-lg w-14 h-14 flex items-center justify-center group-hover:bg-[#28a745] group-hover:text-white transition-colors duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-[#28a745]">{t('feature_flexible_title')}</h3>
                <p className="text-gray-600">{t('feature_flexible_desc')}</p>
              </div>
            </div>

            <div className="mt-16 bg-[#f1f9ee] rounded-xl p-8 border border-[#d1e7dd] shadow-md">
              <div className="flex flex-col md:flex-row items-center">
                <div className="md:w-2/3 mb-6 md:mb-0 md:pr-8">
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">{t('features_promo_title')}</h3>
                  <p className="text-gray-600 mb-6">
                    {t('features_promo_desc')}
                  </p>
                  <div className="flex flex-wrap gap-3 mb-4">
                    {["A1", "A2", "B1", "B2", "C1", "C2"].map(level => (
                      <div key={level} className="px-3 py-1.5 bg-white border border-[#28a745] text-[#28a745] rounded-lg text-sm font-medium">
                        {level} {t('features_promo_level_suffix')}
                      </div>
                    ))}
                  </div>
                  <Link href="/register" className="inline-flex items-center px-6 py-3 bg-[#fd7e14] hover:bg-[#e76b02] text-white font-semibold rounded shadow-md transition-all duration-300">
                    <span>{t('features_promo_button')}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                </div>
                <div className="md:w-1/3 flex justify-center">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-white border-4 border-[#28a745] flex items-center justify-center shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 md:h-20 md:w-20 text-[#28a745]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl font-['Nunito',sans-serif] font-bold text-[#333333] mb-12 text-center">
              {t('features_tech_title')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-xl font-bold text-[#28a745] flex items-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('feature_tech_ai_title')}
                </h3>
                <p className="text-gray-600">{t('feature_tech_ai_desc')}</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-xl font-bold text-[#28a745] flex items-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('feature_tech_subtitle_title')}
                </h3>
                <p className="text-gray-600">{t('feature_tech_subtitle_desc')}</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-xl font-bold text-[#28a745] flex items-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('feature_tech_vocab_title')}
                </h3>
                <p className="text-gray-600">{t('feature_tech_vocab_desc')}</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-xl font-bold text-[#28a745] flex items-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('feature_tech_offline_title')}
                </h3>
                <p className="text-gray-600">{t('feature_tech_offline_desc')}</p>
              </div>
            </div>

            <div className="mt-16 text-center">
              <Link href="/register" className="inline-block px-6 py-3 bg-[#28a745] text-white rounded shadow-sm font-medium hover:bg-[#218838] transition-colors">
                {t('features_cta_button')}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
