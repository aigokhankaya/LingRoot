import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Footer from '../src/components/Footer';
import { useTranslation } from '../src/lib/i18n';

export default function Blog() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Head>
        <title>{t('blog')} | LingRoot</title>
        <meta name="description" content={t('blog_hero_desc')} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/lingroot-icon.svg" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>
      
      {/* Header */}
      <header className="fixed w-full py-4 px-4 sm:px-6 flex justify-between items-center z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <Link href="/" className="flex items-center space-x-4">
          <div className="w-12 h-12 relative flex-shrink-0">
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
          <span className="font-extrabold text-2xl text-primary tracking-tight whitespace-nowrap">
            LingRoot
          </span>
        </Link>
        
        <nav className="hidden lg:flex items-center space-x-6 xl:space-x-8">
          <Link href="/about" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200 whitespace-nowrap">
            {t('about')}
          </Link>
          <Link href="/nasil-calisir" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200 whitespace-nowrap">
            {t('how_it_works')}
          </Link>
          <Link href="/ozellikler" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200 whitespace-nowrap">
            {t('features')}
          </Link>
          <Link href="/fiyatlandirma" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200 whitespace-nowrap">
            {t('pricing')}
          </Link>
          <Link href="/blog" className="text-primary hover:text-primary/80 font-semibold transition-colors duration-200 whitespace-nowrap">
            {t('blog')}
          </Link>
        </nav>

        <div className="flex items-center space-x-3 lg:space-x-4">
          <Link href="/login" className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200 whitespace-nowrap">
            {t('login')}
          </Link>
          <Link href="/register" 
            className="px-4 lg:px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 whitespace-nowrap text-sm lg:text-base">
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
              {t('blog_hero_badge')}
            </div>
            <h1 className="text-4xl md:text-7xl font-extrabold text-white mb-8 tracking-tight">
              {t('blog_hero_title')} <span className="text-primary">{t('blog_hero_highlight')}</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/80 max-w-4xl mx-auto leading-relaxed">
              {t('blog_hero_desc')}
            </p>
          </div>
        </section>

        {/* Blog Intro */}
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 border border-gray-100">
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
                {t('blog_intro_p1')}
              </p>
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed mt-6">
                {t('blog_intro_p2')}
              </p>
            </div>
          </div>
        </section>

        {/* Blog Articles */}
        <section className="py-16 px-6 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="grid gap-8 md:gap-12">
              
              {/* Article 1 */}
              <article className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                <div className="p-8 md:p-12">
                  <div className="flex items-center mb-6">
                    <div className="w-3 h-3 bg-primary rounded-full mr-3"></div>
                    <span className="text-primary font-semibold text-sm uppercase tracking-wider">{t('blog_article1_tag')}</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                    {t('blog_article1_title')}
                  </h2>
                  <div className="prose prose-lg max-w-none text-gray-700">
                    <p className="mb-6">
                      {t('blog_article1_p1')}
                    </p>
                    <p className="mb-6">
                      {t('blog_article1_p2')}
                    </p>
                    
                    <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">{t('blog_article1_h1')}</h3>
                    <p className="mb-6">
                      {t('blog_article1_p3')}
                    </p>
                    
                    <div className="bg-primary/5 border-l-4 border-primary p-6 my-8">
                      <p className="text-primary font-medium">
                        {t('blog_article1_quote')}
                      </p>
                    </div>
                    
                    <p className="mb-6">
                      {t('blog_article1_p4')}
                    </p>
                    
                    <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">{t('blog_article1_h2')}</h3>
                    <p className="mb-6">
                      {t('blog_article1_p5')}
                    </p>
                    
                    <p className="mb-6">
                      İyi bir dinleyici olmak, aynı zamanda kültürel nüansları da yakalamanızı sağlar; ses tonlarındaki duygu, vurgu ve imaları anlamlandırabilirsiniz.
                    </p>
                    
                    <div className="bg-primary text-primary-foreground p-6 rounded-lg mt-8">
                      <p className="text-lg font-semibold">
                        Sonuç olarak, İngilizce dinleme becerisi bir lüks değil, gerekliliktir. Dil öğrenme yolculuğunuzda dinlemeye ne kadar çok yer ayırırsanız, diğer becerilerinizin de o denli hızlı ve sağlam ilerlediğini göreceksiniz.
                      </p>
                    </div>
                  </div>
                </div>
              </article>

              {/* Article 2 */}
              <article className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                <div className="p-8 md:p-12">
                  <div className="flex items-center mb-6">
                    <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                    <span className="text-purple-600 font-semibold text-sm uppercase tracking-wider">{t('blog_article2_tag')}</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                    {t('blog_article2_title')}
                  </h2>
                  <div className="prose prose-lg max-w-none text-gray-700">
                    <p className="mb-6">
                      {t('blog_article2_p1')}
                    </p>
                    
                    <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">{t('blog_article2_h1')}</h3>
                    <p className="mb-6">
                      {t('blog_article2_p2')}
                    </p>
                    
                    <div className="bg-secondary/10 rounded-lg p-6 my-8">
                      <h4 className="text-lg font-bold text-purple-900 mb-3">{t('blog_article2_box_title')}</h4>
                      <ul className="space-y-2 text-purple-800">
                        <li>{t('blog_article2_box_list1')}</li>
                        <li>{t('blog_article2_box_list2')}</li>
                        <li>{t('blog_article2_box_list3')}</li>
                        <li>{t('blog_article2_box_list4')}</li>
                      </ul>
                    </div>
                    
                    <p className="mb-6">
                      {t('blog_article2_p3')}
                    </p>
                    
                    <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">{t('blog_article2_h2')}</h3>
                    <p className="mb-6">
                      {t('blog_article2_p4')}
                    </p>
                    
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 my-8">
                      <h4 className="text-lg font-bold text-gray-900 mb-3">{t('blog_article2_box2_title')}</h4>
                      <ul className="space-y-3 text-gray-700">
                        <li>{t('blog_article2_box2_list1')}</li>
                        <li>{t('blog_article2_box2_list2')}</li>
                        <li>{t('blog_article2_box2_list3')}</li>
                        <li>{t('blog_article2_box2_list4')}</li>
                      </ul>
                    </div>
                    
                    <p className="mb-6">
                      {t('blog_article2_p5')}
                    </p>
                    
                    <div className="bg-slate-900 text-white p-6 rounded-lg mt-8">
                      <p className="text-lg font-semibold">
                        {t('blog_article2_final')}
                      </p>
                    </div>
                  </div>
                </div>
              </article>

              {/* Article 3 */}
              <article className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                <div className="p-8 md:p-12">
                  <div className="flex items-center mb-6">
                    <div className="w-3 h-3 bg-teal-500 rounded-full mr-3"></div>
                    <span className="text-teal-600 font-semibold text-sm uppercase tracking-wider">{t('blog_article3_tag')}</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                    {t('blog_article3_title')}
                  </h2>
                  <div className="prose prose-lg max-w-none text-gray-700">
                    <p className="mb-6">
                      {t('blog_article3_p1')}
                    </p>
                    
                    <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">{t('blog_article3_h1')}</h3>
                    <p className="mb-6">
                      {t('blog_article3_p2')}
                    </p>
                    
                    <div className="bg-teal-50 rounded-lg p-6 my-8">
                      <h4 className="text-lg font-bold text-teal-900 mb-3">{t('blog_article3_box_title')}</h4>
                      <div className="grid md:grid-cols-2 gap-4 text-teal-800">
                        <div>
                          <p className="font-semibold">{t('blog_article3_morning')}</p>
                          <p>{t('blog_article3_morning_list1')}</p>
                          <p>{t('blog_article3_morning_list2')}</p>
                          <p>{t('blog_article3_morning_list3')}</p>
                        </div>
                        <div>
                          <p className="font-semibold">{t('blog_article3_fun')}</p>
                          <p>{t('blog_article3_fun_list1')}</p>
                          <p>{t('blog_article3_fun_list2')}</p>
                          <p>{t('blog_article3_fun_list3')}</p>
                        </div>
                      </div>
                    </div>
                    
                    <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">{t('blog_article3_h2')}</h3>
                    <p className="mb-6">
                      {t('blog_article3_p3')}
                    </p>
                    
                    <div className="bg-primary/5 border-l-4 border-primary p-6 my-8">
                      <p className="text-primary font-medium">
                        {t('blog_article3_quote')}
                      </p>
                    </div>
                    
                    <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">{t('blog_article3_h3')}</h3>
                    <p className="mb-6">
                      {t('blog_article3_p4')}
                    </p>
                    
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 my-8">
                      <h4 className="text-lg font-bold text-gray-900 mb-3">{t('blog_article3_multi_title')}</h4>
                      <ul className="space-y-2 text-gray-700">
                        <li>{t('blog_article3_multi_list1')}</li>
                        <li>{t('blog_article3_multi_list2')}</li>
                        <li>{t('blog_article3_multi_list3')}</li>
                        <li>{t('blog_article3_multi_list4')}</li>
                      </ul>
                    </div>
                    
                    <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">{t('blog_article3_h4')}</h3>
                    <p className="mb-6">
                      {t('blog_article3_p5')}
                    </p>
                    
                    <p className="mb-6">
                      {t('blog_article3_p6')}
                    </p>
                    
                    <div className="bg-primary text-primary-foreground p-6 rounded-lg mt-8">
                      <p className="text-lg font-semibold mb-2">
                        {t('blog_article3_phil_title')}
                      </p>
                      <p>
                        {t('blog_article3_phil_quote')}
                      </p>
                      <p className="mt-4 text-sm opacity-90">
                        {t('blog_article3_phil_sub')}
                      </p>
                    </div>
                  </div>
                </div>
              </article>

            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-20 px-6 bg-slate-900 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-8">
              {t('blog_cta_title')}
            </h2>
            <p className="text-xl md:text-2xl mb-12 text-white/80">
              {t('blog_cta_desc')}
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link href="/register" className="inline-flex items-center px-8 py-4 bg-white text-primary rounded-xl font-bold hover:bg-gray-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                {t('blog_cta_button_free')}
              </Link>
              <Link href="/nasil-calisir" className="inline-flex items-center px-8 py-4 border-2 border-white text-white rounded-xl font-bold hover:bg-white hover:text-primary transition-all duration-200">
                {t('blog_cta_button_how')}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
