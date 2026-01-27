'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';

// ============================================================================
// LINGROOT LANDING PAGE
// Bold Editorial Design with Organic Motion
// Color Palette: Teal/Cyan Primary, Orange/Amber Accent
// ============================================================================

const LandingPage = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeLevel, setActiveLevel] = useState(2);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();

  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  const levelTexts = {
    0: "LingRoot helps you learn. It makes content for you. You listen and learn new words.",
    1: "LingRoot creates personalized content at your level. You can listen while doing other things and learn naturally.",
    2: "LingRoot transforms any content you love into personalized English learning material. Practice while commuting, exercising, or relaxing.",
    3: "LingRoot leverages AI to adapt sophisticated content to your proficiency level, enabling immersive learning through professionally narrated audio.",
    4: "LingRoot employs cutting-edge AI to curate and adapt nuanced content, facilitating acquisition of advanced linguistic structures through contextual exposure.",
    5: "LingRoot harnesses state-of-the-art artificial intelligence to metamorphose complex discourse into bespoke pedagogical material, fostering near-native fluency through authentic, contextually rich auditory immersion."
  };

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      {/* ========== NAVIGATION ========== */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? 'bg-white/90 backdrop-blur-xl shadow-lg shadow-slate-200/50'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/25 group-hover:shadow-teal-500/40 transition-shadow">
                <span className="text-white font-bold text-lg">L</span>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-orange-400 rounded-full border-2 border-white" />
              </div>
              <span className="text-2xl font-black tracking-tight">
                <span className="text-slate-800">Ling</span>
                <span className="text-teal-600">Root</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#nasil-calisir" className="text-slate-600 hover:text-teal-600 transition-colors font-medium">
                Nasil Calisir
              </a>
              <a href="#ozellikler" className="text-slate-600 hover:text-teal-600 transition-colors font-medium">
                Ozellikler
              </a>
              <a href="#fiyatlandirma" className="text-slate-600 hover:text-teal-600 transition-colors font-medium">
                Fiyatlandirma
              </a>
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="hidden sm:inline-flex text-slate-700 hover:text-teal-600 font-semibold transition-colors"
              >
                Giris Yap
              </Link>
              <Link
                href="/register"
                className="relative inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-bold rounded-full shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 hover:scale-105 transition-all duration-300 overflow-hidden group"
              >
                <span className="relative z-10">Ucretsiz Dene</span>
                <svg className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* ========== HERO SECTION ========== */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative min-h-screen flex items-center pt-20 overflow-hidden"
      >
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Gradient Mesh */}
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-teal-200/40 to-cyan-300/30 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-tl from-orange-200/30 to-amber-200/20 rounded-full blur-3xl" />

          {/* Floating Shapes */}
          <motion.div
            animate={{
              y: [0, -20, 0],
              rotate: [0, 5, 0]
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-32 right-20 w-16 h-16 bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl shadow-xl shadow-orange-400/30 opacity-80"
          />
          <motion.div
            animate={{
              y: [0, 15, 0],
              rotate: [0, -8, 0]
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute top-1/2 left-16 w-12 h-12 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-xl shadow-lg shadow-teal-400/30 opacity-70"
          />
          <motion.div
            animate={{
              y: [0, -15, 0],
              x: [0, 10, 0]
            }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-32 right-1/3 w-20 h-20 border-4 border-teal-300/50 rounded-full"
          />

          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgxNSwgMTE4LCAxMTAsIDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-60" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Content */}
            <div className="text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-slate-100 mb-8">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                  </span>
                  <span className="text-sm font-semibold text-slate-600">AI Destekli Kisisellestirilmis Ogrenme</span>
                </div>

                {/* Headline */}
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[0.95] tracking-tight mb-6">
                  <span className="block text-slate-900">
                    Ingilizce
                  </span>
                  <span className="block bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-600 bg-clip-text text-transparent">
                    Dinleyerek
                  </span>
                  <span className="block text-slate-900">
                    Ogren
                  </span>
                </h1>

                {/* Subheadline */}
                <p className="text-xl lg:text-2xl text-slate-600 leading-relaxed mb-10 max-w-xl mx-auto lg:mx-0">
                  Sevdigin icerikleri <span className="text-teal-600 font-semibold">seviyene uygun</span> hale getir,
                  <span className="text-orange-500 font-semibold"> profesyonel seslendirme</span> ile dinle.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Link
                    href="/register"
                    className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-bold text-lg rounded-2xl shadow-xl shadow-teal-500/30 hover:shadow-teal-500/50 hover:scale-105 transition-all duration-300 overflow-hidden"
                  >
                    <span className="relative z-10">Hemen Basla</span>
                    <span className="relative z-10 flex items-center justify-center w-8 h-8 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>

                  <button className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-slate-700 font-bold text-lg rounded-2xl border-2 border-slate-200 hover:border-teal-300 hover:text-teal-600 shadow-sm hover:shadow-lg transition-all duration-300">
                    <span className="flex items-center justify-center w-10 h-10 bg-slate-100 rounded-xl group-hover:bg-teal-50 transition-colors">
                      <svg className="w-5 h-5 text-teal-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </span>
                    <span>Nasil Calisir?</span>
                  </button>
                </div>

                {/* Trust Badges */}
                <div className="mt-12 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-slate-500">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Kredi karti gerekmez</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>5,000+ kullanici</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>CEFR uyumlu</span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Right: Interactive Demo */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="relative"
            >
              <div className="relative bg-white rounded-3xl shadow-2xl shadow-slate-200/50 p-8 border border-slate-100">
                {/* Browser Header */}
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <div className="flex-1 ml-4 h-8 bg-slate-100 rounded-lg flex items-center px-4">
                    <span className="text-xs text-slate-400 font-mono">lingroot.com/demo</span>
                  </div>
                </div>

                {/* Level Selector */}
                <div className="mb-6">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Seviyeni Sec:</p>
                  <div className="flex gap-2">
                    {levels.map((level, idx) => (
                      <button
                        key={level}
                        onClick={() => setActiveLevel(idx)}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                          activeLevel === idx
                            ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-500/30'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content Preview */}
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-amber-500 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">Orjinal Icerik</p>
                        <p className="text-xs text-slate-500">Sectigin kaynak</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      "Artificial intelligence is revolutionizing how we approach language learning,
                      enabling unprecedented personalization and adaptive methodologies..."
                    </p>
                  </div>

                  <div className="flex items-center justify-center py-2">
                    <motion.div
                      animate={{ y: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center shadow-lg shadow-teal-500/30"
                    >
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </motion.div>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border-2 border-teal-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                          <line x1="12" y1="19" x2="12" y2="23"/>
                          <line x1="8" y1="23" x2="16" y2="23"/>
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-teal-800">Senin Seviyende ({levels[activeLevel]})</p>
                        <p className="text-xs text-teal-600">AI ile uyarlandi</p>
                      </div>
                    </div>
                    <motion.p
                      key={activeLevel}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-sm text-teal-700 leading-relaxed"
                    >
                      "{levelTexts[activeLevel as keyof typeof levelTexts]}"
                    </motion.p>
                  </div>
                </div>

                {/* Audio Player Mock */}
                <div className="mt-6 p-4 bg-slate-900 rounded-xl">
                  <div className="flex items-center gap-4">
                    <button className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center hover:bg-teal-600 transition-colors">
                      <svg className="w-5 h-5 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </button>
                    <div className="flex-1">
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: "0%" }}
                          animate={{ width: "45%" }}
                          transition={{ duration: 2, delay: 1 }}
                          className="h-full bg-gradient-to-r from-teal-400 to-cyan-400 rounded-full"
                        />
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-slate-500">
                        <span>1:24</span>
                        <span>3:15</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Cards */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-xl p-4 border border-slate-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                    <span className="text-xl">🎧</span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Bugun dinlendi</p>
                    <p className="font-bold text-slate-800">45 dakika</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-xl p-4 border border-slate-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                    <span className="text-xl">🔥</span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Gunluk seri</p>
                    <p className="font-bold text-slate-800">12 gun</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex flex-col items-center gap-2 text-slate-400"
          >
            <span className="text-sm font-medium">Kesfet</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* ========== HOW IT WORKS ========== */}
      <section id="nasil-calisir" className="py-32 bg-white relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-teal-500/20 to-transparent" />

        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <span className="inline-block px-4 py-2 bg-teal-50 text-teal-600 rounded-full text-sm font-semibold mb-4">
              3 Basit Adim
            </span>
            <h2 className="text-4xl lg:text-5xl font-black text-slate-900 mb-6">
              Nasil Calisir?
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Sevdigin icerikleri Ingilizce ogrenme materyaline donustur
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                step: "01",
                icon: "🔗",
                title: "Icerik Sec",
                description: "YouTube, Spotify, haber sitesi... Ilgini ceken herhangi bir icerigin linkini paylas.",
                color: "orange"
              },
              {
                step: "02",
                icon: "🎯",
                title: "Seviye Belirle",
                description: "A1'den C2'ye kadar seviyeni sec. AI icerigi senin icin optimize etsin.",
                color: "teal"
              },
              {
                step: "03",
                icon: "🎧",
                title: "Dinle & Ogren",
                description: "Profesyonel seslendirme ile her yerde, her zaman dinle ve dogal yoldan ogren.",
                color: "cyan"
              }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.15 }}
                className="relative group"
              >
                {/* Connection Line */}
                {idx < 2 && (
                  <div className="hidden lg:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-slate-200 to-transparent z-0" />
                )}

                <div className="relative bg-slate-50 rounded-3xl p-8 h-full border border-slate-100 hover:border-teal-200 hover:shadow-xl hover:shadow-teal-500/10 transition-all duration-500 group-hover:-translate-y-2">
                  {/* Step Number */}
                  <div className="absolute -top-4 -left-4 w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg">
                    {item.step}
                  </div>

                  {/* Icon */}
                  <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-4xl mb-6 shadow-lg shadow-slate-200/50 group-hover:scale-110 transition-transform duration-300">
                    {item.icon}
                  </div>

                  <h3 className="text-2xl font-bold text-slate-900 mb-4">{item.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== FEATURES SECTION ========== */}
      <section id="ozellikler" className="py-32 bg-gradient-to-b from-slate-50 to-white relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <span className="inline-block px-4 py-2 bg-orange-50 text-orange-600 rounded-full text-sm font-semibold mb-4">
              Guclu Ozellikler
            </span>
            <h2 className="text-4xl lg:text-5xl font-black text-slate-900 mb-6">
              Neden LingRoot?
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Geleneksel dil ogrenme yontemlerinden farkli, kisisellestirilmis deneyim
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: "🤖",
                title: "AI Destekli Adaptasyon",
                description: "GPT-4 tabanli yapay zeka, icerigi seviyene gore yeniden yazar",
                gradient: "from-purple-500 to-indigo-600"
              },
              {
                icon: "🎙️",
                title: "Profesyonel Seslendirme",
                description: "Dogal ve akici ses ile tum iceriklerin profesyonelce seslendirilmesi",
                gradient: "from-teal-500 to-cyan-600"
              },
              {
                icon: "📊",
                title: "Kelime Takibi",
                description: "Ogrendigin kelimeleri takip et, tekrar hatirlatmalari al",
                gradient: "from-orange-500 to-amber-600"
              },
              {
                icon: "🎯",
                title: "CEFR Uyumlu",
                description: "Avrupa Dil Portfolyosu standartlarina uygun seviye sistemi",
                gradient: "from-green-500 to-emerald-600"
              },
              {
                icon: "📱",
                title: "Her Yerde Erisin",
                description: "Web, mobil ve tablet'ten kesintisiz ogrenme deneyimi",
                gradient: "from-blue-500 to-cyan-600"
              },
              {
                icon: "🏆",
                title: "Gamification",
                description: "Gunluk gorevler, rozetler ve liderlik tablosu ile motivasyon",
                gradient: "from-pink-500 to-rose-600"
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="group relative bg-white rounded-3xl p-8 border border-slate-100 hover:border-transparent hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500"
              >
                {/* Gradient Border on Hover */}
                <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-xl`} />

                <div className={`w-16 h-16 bg-gradient-to-r ${feature.gradient} rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== TESTIMONIALS ========== */}
      <section className="py-32 bg-slate-900 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-orange-500/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <span className="inline-block px-4 py-2 bg-teal-500/20 text-teal-400 rounded-full text-sm font-semibold mb-4">
              Kullanici Yorumlari
            </span>
            <h2 className="text-4xl lg:text-5xl font-black text-white mb-6">
              Kullanicilarimiz Ne Diyor?
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Elif Y.",
                role: "Yazilim Gelistirici",
                avatar: "E",
                quote: "Isime giderken dinliyorum. Her gun 30 dakika bile cok fark yaratiyor. 3 ayda B1'den B2'ye gectim!",
                rating: 5
              },
              {
                name: "Mert K.",
                role: "Ogrenci",
                avatar: "M",
                quote: "Tech podcast'lerini seviyeme uygun dinleyebilmek mukemmel. Hem ilgi alanimi takip ediyorum hem Ingilizce gelistiriyorum.",
                rating: 5
              },
              {
                name: "Zeynep A.",
                role: "Pazarlama Uzmani",
                avatar: "Z",
                quote: "Spor yaparken, yemek yaparken... Bos zamanlari degerlendirmek icin harika. Artik Netflix'i altyazisiz izleyebiliyorum!",
                rating: 5
              }
            ].map((testimonial, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.15 }}
                className="bg-slate-800/50 backdrop-blur-sm rounded-3xl p-8 border border-slate-700 hover:border-teal-500/50 transition-all duration-300"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-bold text-white">{testimonial.name}</p>
                    <p className="text-sm text-slate-400">{testimonial.role}</p>
                  </div>
                </div>

                <p className="text-slate-300 leading-relaxed mb-6">"{testimonial.quote}"</p>

                <div className="flex gap-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== CTA SECTION ========== */}
      <section className="py-32 bg-gradient-to-br from-teal-500 via-cyan-600 to-teal-600 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIgZmlsbD0id2hpdGUiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')]" />
        </div>

        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl lg:text-6xl font-black text-white mb-6">
              Ingilizce Ogrenmeye Basla
            </h2>
            <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
              Kredi karti gerekmeden ucretsiz denemeye basla.
              Sevdigin icerikleri dinleyerek Ingilizce ogrenmenin keyfini cikar.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="group inline-flex items-center justify-center gap-3 px-8 py-5 bg-white text-teal-600 font-bold text-lg rounded-2xl shadow-xl shadow-black/20 hover:shadow-black/30 hover:scale-105 transition-all duration-300"
              >
                <span>Ucretsiz Basla</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>

              <Link
                href="/fiyatlandirma"
                className="inline-flex items-center justify-center gap-3 px-8 py-5 bg-white/10 text-white font-bold text-lg rounded-2xl border-2 border-white/30 hover:bg-white/20 hover:border-white/50 transition-all duration-300"
              >
                Fiyatlari Incele
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="py-16 bg-slate-900 text-slate-400">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">L</span>
                </div>
                <span className="text-2xl font-black text-white">
                  Ling<span className="text-teal-500">Root</span>
                </span>
              </div>
              <p className="text-slate-500 max-w-sm mb-6">
                AI destekli kisisellestirilmis Ingilizce dinleme platformu.
                Sevdigin icerikleri seviyene gore dinle, dogal yoldan ogren.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center hover:bg-teal-500 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center hover:bg-teal-500 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center hover:bg-teal-500 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                </a>
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-bold text-white mb-4">Urun</h4>
              <ul className="space-y-3">
                <li><a href="#ozellikler" className="hover:text-teal-400 transition-colors">Ozellikler</a></li>
                <li><a href="/fiyatlandirma" className="hover:text-teal-400 transition-colors">Fiyatlandirma</a></li>
                <li><a href="#nasil-calisir" className="hover:text-teal-400 transition-colors">Nasil Calisir</a></li>
                <li><a href="/blog" className="hover:text-teal-400 transition-colors">Blog</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-4">Destek</h4>
              <ul className="space-y-3">
                <li><a href="/destek" className="hover:text-teal-400 transition-colors">Yardim Merkezi</a></li>
                <li><a href="/contact" className="hover:text-teal-400 transition-colors">Iletisim</a></li>
                <li><a href="/about" className="hover:text-teal-400 transition-colors">Hakkimizda</a></li>
                <li><a href="/cookie-policy" className="hover:text-teal-400 transition-colors">Gizlilik</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm">© 2025 LingRoot. Tum haklar saklidir.</p>
            <div className="flex gap-6 text-sm">
              <a href="/terms" className="hover:text-teal-400 transition-colors">Kullanim Sartlari</a>
              <a href="/privacy" className="hover:text-teal-400 transition-colors">Gizlilik Politikasi</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
