import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Footer from '../src/components/Footer';

import { useTranslation } from '../src/lib/i18n';

export default function Tips() {
  const { t } = useTranslation();
  const tips = [
    {
      id: 1,
      category: t('tips_category_daily'),
      title: t('tips_title_daily'),
      description: t('tips_desc_daily'),
      tips: [
        t('tips_list_daily_1'),
        t('tips_list_daily_2'),
        t('tips_list_daily_3'),
        t('tips_list_daily_4')
      ],
      icon: "🎧"
    },
    {
      id: 2,
      category: t('tips_category_active'),
      title: t('tips_title_active'),
      description: t('tips_desc_active'),
      tips: [
        t('tips_list_active_1'),
        t('tips_list_active_2'),
        t('tips_list_active_3'),
        t('tips_list_active_4')
      ],
      icon: "📺"
    },
    {
      id: 3,
      category: t('tips_category_vocab'),
      title: t('tips_title_vocab'),
      description: t('tips_desc_vocab'),
      tips: [
        t('tips_list_vocab_1'),
        t('tips_list_vocab_2'),
        t('tips_list_vocab_3'),
        t('tips_list_vocab_4')
      ],
      icon: "📚"
    },
    {
      id: 4,
      category: t('tips_category_motivation'),
      title: t('tips_title_motivation'),
      description: t('tips_desc_motivation'),
      tips: [
        t('tips_list_motivation_1'),
        t('tips_list_motivation_2'),
        t('tips_list_motivation_3'),
        t('tips_list_motivation_4')
      ],
      icon: "📈"
    },
    {
      id: 5,
      category: t('tips_category_tech'),
      title: t('tips_title_tech'),
      description: t('tips_desc_tech'),
      tips: [
        t('tips_list_tech_1'),
        t('tips_list_tech_2'),
        t('tips_list_tech_3'),
        t('tips_list_tech_4')
      ],
      icon: "📱"
    },
    {
      id: 6,
      category: t('tips_category_social'),
      title: t('tips_title_social'),
      description: t('tips_desc_social'),
      tips: [
        t('tips_list_social_1'),
        t('tips_list_social_2'),
        t('tips_list_social_3'),
        t('tips_list_social_4')
      ],
      icon: "👥"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white font-['Roboto',sans-serif]">
      <Head>
        <title>{t('tips_page_title')}</title>
        <meta name="description" content={t('tips_meta_desc')} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/lingroot-icon.svg" />
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=Roboto:wght@400;500;700&family=Lato:wght@400;700&display=swap" rel="stylesheet" />
      </Head>

      {/* Header */}
      <header className="fixed w-full py-4 px-6 flex justify-between items-center z-50 bg-white border-b border-gray-100 shadow-sm">
        <Link href="/" className="flex items-center">
          <h1 className="text-2xl font-['Nunito',sans-serif] font-bold">
            <span className="text-[#28a745]">Ling</span>
            <span className="text-[#333333]">Root</span>
          </h1>
        </Link>

        <div className="flex items-center space-x-5">
          <Link href="/about" className="text-gray-700 hover:text-gray-900 font-medium">
            {t('about_title')}
          </Link>
          <Link href="/nasil-calisir" className="text-gray-700 hover:text-gray-900 font-medium">
            {t('header_how_it_works')}
          </Link>
          <Link href="/ozellikler" className="text-gray-700 hover:text-gray-900 font-medium">
            {t('features_title')}
          </Link>
          <Link href="/blog" className="text-gray-700 hover:text-gray-900 font-medium">
            {t('blog_title')}
          </Link>
          <Link href="/tips" className="text-[#28a745] hover:text-[#218838] font-medium">
            {t('tips_hero_title_suffix')}
          </Link>
          <Link href="/login" className="text-gray-700 hover:text-gray-900 font-medium">
            {t('login')}
          </Link>
          <Link href="/register" className="ml-2 px-4 py-2 bg-[#28a745] text-white rounded font-medium hover:bg-[#218838] transition-colors">
            {t('register_title')}
          </Link>
        </div>
      </header>

      <main className="flex-grow pt-24">
        {/* Hero Section */}
        <section className="py-16 bg-gradient-to-b from-[#f1f9ee] to-white">
          <div className="max-w-6xl mx-auto px-6 text-center">
            <h1 className="text-5xl font-['Nunito',sans-serif] font-bold text-[#333333] mb-6">
              {t('tips_hero_title_prefix')} <span className="text-[#28a745]">{t('tips_hero_title_suffix')}</span>
            </h1>
            <p className="text-xl text-gray-700 max-w-4xl mx-auto leading-relaxed">
              {t('tips_hero_desc')}
            </p>
          </div>
        </section>

        {/* Tips Grid */}
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {tips.map((tip) => (
                <div key={tip.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="p-6">
                    <div className="flex items-center mb-4">
                      <span className="text-3xl mr-3">{tip.icon}</span>
                      <span className="inline-block px-3 py-1 bg-[#28a745]/10 text-[#28a745] rounded-full text-sm font-medium">
                        {tip.category}
                      </span>
                    </div>

                    <h3 className="text-xl font-['Nunito',sans-serif] font-bold text-[#333333] mb-3">
                      {tip.title}
                    </h3>

                    <p className="text-gray-600 mb-4 leading-relaxed">
                      {tip.description}
                    </p>

                    <ul className="space-y-2">
                      {tip.tips.map((item, index) => (
                        <li key={index} className="flex items-start">
                          <svg className="w-4 h-4 text-[#28a745] mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span className="text-gray-700 text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Success Stories */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-['Nunito',sans-serif] font-bold text-[#333333] mb-6">
                {t('tips_success_stories_title')} <span className="text-[#28a745]">{t('tips_success_stories_title_suffix')}</span>
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                {t('tips_success_stories_desc')}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white rounded-xl p-6 shadow-md">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-[#28a745] rounded-full flex items-center justify-center text-white font-bold text-lg">
                    A
                  </div>
                  <div className="ml-3">
                    <h4 className="font-bold text-gray-800">Ahmet K.</h4>
                    <p className="text-sm text-gray-600">{t('tips_story_1_role')}</p>
                  </div>
                </div>
                <p className="text-gray-700 italic">
                  {t('tips_story_1_quote')}
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-md">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-[#fd7e14] rounded-full flex items-center justify-center text-white font-bold text-lg">
                    Z
                  </div>
                  <div className="ml-3">
                    <h4 className="font-bold text-gray-800">Zeynep M.</h4>
                    <p className="text-sm text-gray-600">{t('tips_story_2_role')}</p>
                  </div>
                </div>
                <p className="text-gray-700 italic">
                  {t('tips_story_2_quote')}
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-md">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-[#6c757d] rounded-full flex items-center justify-center text-white font-bold text-lg">
                    M
                  </div>
                  <div className="ml-3">
                    <h4 className="font-bold text-gray-800">Mehmet S.</h4>
                    <p className="text-sm text-gray-600">{t('tips_story_3_role')}</p>
                  </div>
                </div>
                <p className="text-gray-700 italic">
                  {t('tips_story_3_quote')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Start Guide */}
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-['Nunito',sans-serif] font-bold text-[#333333] mb-6">
                {t('tips_quick_start_title')} <span className="text-[#28a745]">{t('tips_quick_start_title_suffix')}</span>
              </h2>
              <p className="text-lg text-gray-600">
                {t('tips_quick_start_desc')}
              </p>
            </div>

            <div className="bg-gradient-to-r from-[#28a745]/5 to-[#20c997]/5 rounded-2xl p-8 border border-[#28a745]/20">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-bold text-[#333333] mb-4">{t('tips_week_1_title')}</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <span className="w-6 h-6 bg-[#28a745] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">1</span>
                      <span className="text-gray-700">{t('tips_week_1_list_1')}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-6 h-6 bg-[#28a745] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">2</span>
                      <span className="text-gray-700">{t('tips_week_1_list_2')}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-6 h-6 bg-[#28a745] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">3</span>
                      <span className="text-gray-700">{t('tips_week_1_list_3')}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-6 h-6 bg-[#28a745] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">4</span>
                      <span className="text-gray-700">{t('tips_week_1_list_4')}</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-[#333333] mb-4">{t('tips_week_2_title')}</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <span className="w-6 h-6 bg-[#fd7e14] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">5</span>
                      <span className="text-gray-700">{t('tips_week_2_list_1')}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-6 h-6 bg-[#fd7e14] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">6</span>
                      <span className="text-gray-700">{t('tips_week_2_list_2')}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-6 h-6 bg-[#fd7e14] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">7</span>
                      <span className="text-gray-700">{t('tips_week_2_list_3')}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="w-6 h-6 bg-[#fd7e14] text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">8</span>
                      <span className="text-gray-700">{t('tips_week_2_list_4')}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-16 bg-gradient-to-r from-[#28a745] to-[#20c997] text-white">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-4xl font-['Nunito',sans-serif] font-bold mb-6">
              {t('tips_cta_title')}
            </h2>
            <p className="text-xl mb-8 opacity-90">
              {t('tips_cta_desc')}
            </p>
            <div className="space-x-4">
              <Link href="/register" className="inline-block px-8 py-4 bg-white text-[#28a745] rounded-lg font-bold hover:bg-gray-100 transition-colors">
                {t('tips_cta_button_primary')}
              </Link>
              <Link href="/nasil-calisir" className="inline-block px-8 py-4 border border-white text-white rounded-lg font-bold hover:bg-white hover:text-[#28a745] transition-colors">
                {t('tips_cta_button_secondary')}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
} 