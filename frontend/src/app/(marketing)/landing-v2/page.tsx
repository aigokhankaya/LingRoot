'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// LINGROOT LANDING PAGE V2
// BRUTALIST EDITORIAL DARK THEME
// ============================================================================

export default function LandingPageV2() {
  const [activeLevel, setActiveLevel] = useState(2);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  const content = {
    hero: {
      badge: "Hayatin Degismesin, Ingilizcen Gelissin",
      title: "Rutinlerin Ingilizceye Donsun",
      desc: "Haberler, kitaplar veya podcast'ler... LiRo, internetteki herhangi bir icerigi senin Ingilizce seviyene gore sadelestirir ve seslendirir."
    },
    steps: [
      { num: "01", title: "Icerigini Sec", desc: "YouTube videosu, Spotify podcast'i, bir haber yazisi... Sadece linki yapistir." },
      { num: "02", title: "Seviyeni Belirle", desc: "A1'den C2'ye. Icerik, senin anlayabilcegin Ingilizceye cevrilir." },
      { num: "03", title: "Dinle ve Ogren", desc: "Icerik yapay zeka tarafindan seslendirilir ve seviyene ozel hale gelir." }
    ],
    features: [
      { num: "01", title: "Gercek Icerikler", desc: "Ders kitaplari degil, gercek hayattan videolar ve yazilar ile ogren" },
      { num: "02", title: "LiRo: Kisisel Asistanin", desc: "Ne ogrenmek istedigini soyle. LiRo senin icin en ilgi cekici icerikleri bulur." },
      { num: "03", title: "Sadece Dinleyerek Ogren", desc: "Kaliteli seslendirme, altyazi ve tekrar ozellikleriyle pasif ogrenme" },
      { num: "04", title: "Ekstra Zaman Gerekmez", desc: "Gunluk rutinin icinde, ek bir caba harcamadan Ingilizce ogren" }
    ],
    testimonials: [
      { name: "Emre T.", level: "B2", quote: "Ise giderken metrolarda dinliyorum. Her gun yarim saat bile inanilmaz fark yaratiyor." },
      { name: "Siti R.", level: "A2", quote: "LingRoot sayesinde ev islerini yaparken bile Ingilizce dinleyebiliyorum." },
      { name: "Omar H.", level: "B1", quote: "Podcast'leri kendi seviyemde dinleyebilmek harika. Artik yabancilari anlamak cok kolay." }
    ]
  };

  const levelTexts: Record<number, string> = {
    0: "LingRoot helps you. It makes easy content. You listen. You learn words.",
    1: "LingRoot creates content for you. You can listen while doing things.",
    2: "LingRoot transforms your favorite content into learning material at your level.",
    3: "LingRoot leverages AI to adapt content to your proficiency level.",
    4: "LingRoot employs cutting-edge AI to curate nuanced content for you.",
    5: "LingRoot harnesses sophisticated AI to metamorphose complex discourse."
  };

  return (
    <div className="relative" style={{ backgroundColor: '#0a0a0a', color: 'white', minHeight: '100vh', marginTop: '-1rem' }}>

      {/* Noise Overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-50 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
        }}
      />

      {/* ===== NAVIGATION ===== */}
      <nav className="fixed top-0 left-0 right-0 z-40" style={{ backgroundColor: 'rgba(10,10,10,0.95)', borderBottom: '1px solid #27272a' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-5 flex items-center justify-between">
          <Link href="/" className="text-2xl font-black tracking-tight">
            LING<span style={{ color: '#14b8a6' }}>ROOT</span>
          </Link>

          <div className="hidden md:flex items-center gap-10">
            <a href="#nasil-calisir" className="text-sm font-medium text-zinc-400 hover:text-teal-400 transition-colors">Nasil Calisir</a>
            <a href="#ozellikler" className="text-sm font-medium text-zinc-400 hover:text-teal-400 transition-colors">Ozellikler</a>
            <a href="#yorumlar" className="text-sm font-medium text-zinc-400 hover:text-teal-400 transition-colors">Yorumlar</a>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden sm:block text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              Giris Yap
            </Link>
            <Link
              href="/register"
              className="px-5 py-2.5 text-sm font-bold text-black transition-colors"
              style={{ backgroundColor: '#14b8a6' }}
            >
              Ucretsiz Basla
            </Link>
          </div>
        </div>
      </nav>

      {/* ===== HERO SECTION ===== */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 right-0 w-96 h-96 rounded-full opacity-10" style={{ backgroundColor: '#14b8a6', filter: 'blur(100px)' }} />
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-10" style={{ backgroundColor: '#f97316', filter: 'blur(80px)' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left Content */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="flex items-center gap-3 mb-8"
              >
                <div className="w-10 h-px" style={{ backgroundColor: '#14b8a6' }} />
                <span className="text-sm font-medium tracking-wide" style={{ color: '#14b8a6' }}>
                  {content.hero.badge}
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-5xl sm:text-6xl lg:text-7xl font-black leading-none tracking-tight mb-8"
              >
                <span className="block text-white">Rutinlerin</span>
                <span className="block" style={{ color: '#14b8a6' }}>Ingilizceye</span>
                <span className="block text-white">Donsun</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-xl text-zinc-400 leading-relaxed mb-10 max-w-lg"
              >
                {content.hero.desc}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-wrap gap-4"
              >
                <Link
                  href="/register"
                  className="inline-flex items-center gap-3 px-8 py-4 text-black font-bold text-lg transition-transform hover:scale-105"
                  style={{ backgroundColor: '#14b8a6' }}
                >
                  Hemen Basla
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>

                <button
                  onClick={() => setIsVideoPlaying(true)}
                  className="inline-flex items-center gap-3 px-6 py-4 border-2 border-zinc-700 hover:border-teal-400 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full border-2 border-current flex items-center justify-center">
                    <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                  <span className="font-semibold">Videoyu Izle</span>
                </button>
              </motion.div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="flex gap-10 mt-14 pt-8 border-t border-zinc-800"
              >
                {[
                  { value: "50K+", label: "Kullanici" },
                  { value: "1M+", label: "Icerik" },
                  { value: "4.9", label: "Puan" }
                ].map((stat, idx) => (
                  <div key={idx}>
                    <div className="text-3xl font-black" style={{ color: '#14b8a6' }}>{stat.value}</div>
                    <div className="text-sm text-zinc-500">{stat.label}</div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right: Demo Card */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <div className="relative p-6 border border-zinc-800" style={{ backgroundColor: 'rgba(24,24,27,0.8)' }}>

                {/* Level Selector */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Seviye Sec</span>
                    <span className="text-sm font-mono" style={{ color: '#14b8a6' }}>{levels[activeLevel]}</span>
                  </div>
                  <div className="flex gap-1">
                    {levels.map((level, idx) => (
                      <button
                        key={level}
                        onClick={() => setActiveLevel(idx)}
                        className="flex-1 py-2.5 text-sm font-bold transition-all"
                        style={{
                          backgroundColor: activeLevel === idx ? '#14b8a6' : '#27272a',
                          color: activeLevel === idx ? 'black' : '#a1a1aa'
                        }}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content Preview */}
                <div className="space-y-4">
                  <div className="p-4 border-l-2" style={{ backgroundColor: 'rgba(39,39,42,0.5)', borderColor: '#f97316' }}>
                    <div className="text-xs font-bold mb-2" style={{ color: '#f97316' }}>ORIJINAL</div>
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      "Artificial intelligence is revolutionizing how we approach language learning..."
                    </p>
                  </div>

                  <div className="flex justify-center py-1">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(20,184,166,0.2)' }}>
                      <svg className="w-4 h-4" style={{ color: '#14b8a6' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </div>
                  </div>

                  <div className="p-4 border-l-2" style={{ backgroundColor: 'rgba(20,184,166,0.1)', borderColor: '#14b8a6' }}>
                    <div className="text-xs font-bold mb-2" style={{ color: '#14b8a6' }}>
                      SENIN SEVIYEN ({levels[activeLevel]})
                    </div>
                    <p className="text-sm text-white leading-relaxed">
                      "{levelTexts[activeLevel]}"
                    </p>
                  </div>
                </div>

                {/* Audio Player */}
                <div className="mt-6 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                  <div className="flex items-center gap-4">
                    <button className="w-12 h-12 flex items-center justify-center" style={{ backgroundColor: '#14b8a6' }}>
                      <svg className="w-5 h-5 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </button>
                    <div className="flex-1">
                      <div className="h-1 bg-zinc-800 overflow-hidden">
                        <div className="h-full w-3/5" style={{ background: 'linear-gradient(to right, #14b8a6, #22d3ee)' }} />
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-zinc-500 font-mono">
                        <span>02:14</span>
                        <span>03:45</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== VIDEO MODAL ===== */}
      <AnimatePresence>
        {isVideoPlaying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-8"
            style={{ backgroundColor: 'rgba(0,0,0,0.95)' }}
            onClick={() => setIsVideoPlaying(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative w-full max-w-4xl aspect-video"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setIsVideoPlaying(false)}
                className="absolute -top-12 right-0 text-white hover:text-teal-400"
              >
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <iframe
                src="https://www.youtube.com/embed/12hT5S9QuLA?autoplay=1"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== HOW IT WORKS ===== */}
      <section id="nasil-calisir" className="py-24" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-12">

          <div className="mb-16">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-px" style={{ backgroundColor: '#14b8a6' }} />
              <span className="text-sm font-bold uppercase tracking-wider" style={{ color: '#14b8a6' }}>Surecimiz</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tight">LingRoot Nasil Calisir?</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {content.steps.map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="relative p-8 border border-zinc-800 hover:border-teal-400/50 transition-colors group"
                style={{ backgroundColor: 'rgba(24,24,27,0.5)' }}
              >
                <div
                  className="absolute -top-4 -left-4 w-12 h-12 flex items-center justify-center text-lg font-black border-2"
                  style={{ backgroundColor: '#0a0a0a', borderColor: '#14b8a6', color: '#14b8a6' }}
                >
                  {step.num}
                </div>
                <div className="pt-6">
                  <h3 className="text-xl font-bold mb-3 group-hover:text-teal-400 transition-colors">{step.title}</h3>
                  <p className="text-zinc-400">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="ozellikler" className="py-24" style={{ backgroundColor: '#0f0f0f' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-12">

          <div className="mb-16">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-px" style={{ backgroundColor: '#f97316' }} />
              <span className="text-sm font-bold uppercase tracking-wider" style={{ color: '#f97316' }}>Ozellikler</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tight">Neden LingRoot?</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {content.features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                onMouseEnter={() => setHoveredFeature(idx)}
                onMouseLeave={() => setHoveredFeature(null)}
                className="relative p-8 border transition-all duration-300 cursor-pointer"
                style={{
                  backgroundColor: hoveredFeature === idx ? '#14b8a6' : 'rgba(24,24,27,0.5)',
                  borderColor: hoveredFeature === idx ? '#14b8a6' : '#27272a'
                }}
              >
                <div
                  className="absolute top-4 right-4 text-7xl font-black transition-colors"
                  style={{ color: hoveredFeature === idx ? 'rgba(0,0,0,0.2)' : '#1f1f1f' }}
                >
                  {feature.num}
                </div>
                <div className="relative z-10">
                  <h3
                    className="text-xl font-bold mb-3 transition-colors"
                    style={{ color: hoveredFeature === idx ? 'black' : 'white' }}
                  >
                    {feature.title}
                  </h3>
                  <p
                    className="transition-colors"
                    style={{ color: hoveredFeature === idx ? 'rgba(0,0,0,0.7)' : '#a1a1aa' }}
                  >
                    {feature.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section id="yorumlar" className="py-24" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-12">

          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-8 h-px" style={{ backgroundColor: '#14b8a6' }} />
              <span className="text-sm font-bold uppercase tracking-wider" style={{ color: '#14b8a6' }}>Yorumlar</span>
              <div className="w-8 h-px" style={{ backgroundColor: '#14b8a6' }} />
            </div>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tight">Kullanicilar Ne Diyor?</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {content.testimonials.map((t, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="p-8 border border-zinc-800 hover:border-teal-400/30 transition-colors"
                style={{ backgroundColor: 'rgba(24,24,27,0.5)' }}
              >
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5" style={{ color: '#f97316' }} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-zinc-300 leading-relaxed mb-6">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 flex items-center justify-center font-bold text-black"
                    style={{ background: 'linear-gradient(135deg, #14b8a6, #22d3ee)' }}
                  >
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold">{t.name}</div>
                    <div className="text-sm text-zinc-500">{t.level} seviyesinde</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-24" style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
        <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center">
          <h2 className="text-4xl lg:text-6xl font-black tracking-tight text-black mb-6">
            Ingilizce Ogrenmeye Hazir misin?
          </h2>
          <p className="text-xl text-teal-900 mb-10">
            Kredi karti gerektirmez. Ucretsiz basla.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-3 px-10 py-5 bg-black text-white font-bold text-lg hover:bg-zinc-800 transition-colors"
          >
            Ucretsiz Basla
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="py-12 border-t border-zinc-800" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-2xl font-black tracking-tight">
              LING<span style={{ color: '#14b8a6' }}>ROOT</span>
            </div>
            <div className="flex gap-8 text-sm text-zinc-500">
              <a href="/about" className="hover:text-teal-400 transition-colors">Hakkimizda</a>
              <a href="/contact" className="hover:text-teal-400 transition-colors">Iletisim</a>
              <a href="/privacy" className="hover:text-teal-400 transition-colors">Gizlilik</a>
            </div>
            <div className="text-sm text-zinc-600">
              © 2025 LingRoot
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
