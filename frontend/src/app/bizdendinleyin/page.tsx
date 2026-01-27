'use client';

import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
    Headphones,
    BookOpen,
    Volume2,
    Brain,
    ChevronDown,
    Play,
    Podcast,
    Film,
    Newspaper,
    Check,
    X,
    Sparkles,
    ArrowRight,
    MessageCircleQuestion,
    Users,
    Star,
    Clock,
    Zap,
    Quote
} from 'lucide-react';
import Link from 'next/link';

// Animation variants
const fadeInUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } }
};

const stagger = {
    visible: { transition: { staggerChildren: 0.15 } }
};

const scaleIn = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } }
};

// Animated Section wrapper
function Section({
    children,
    className = '',
    id,
    gradient = false
}: {
    children: React.ReactNode;
    className?: string;
    id?: string;
    gradient?: boolean;
}) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-100px' });

    return (
        <section
            ref={ref}
            id={id}
            className={`min-h-screen flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-16 snap-start relative ${gradient ? 'bg-gradient-to-b from-gray-50 via-white to-gray-50' : 'bg-white'
                } ${className}`}
        >
            <motion.div
                initial="hidden"
                animate={isInView ? 'visible' : 'hidden'}
                variants={stagger}
                className="max-w-5xl mx-auto w-full"
            >
                {children}
            </motion.div>
        </section>
    );
}

// ============================================
// SLIDE 1: HERO
// ============================================
function HeroSlide() {
    return (
        <section className="min-h-screen flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 relative overflow-hidden snap-start">
            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-teal-400/20 to-cyan-400/10 blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-orange-400/20 to-amber-400/10 blur-3xl" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-center relative z-10 max-w-4xl"
            >
                {/* Icon */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    className="w-28 h-28 mx-auto mb-6 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-2xl shadow-teal-500/30"
                >
                    <Headphones className="w-14 h-14 text-white" />
                </motion.div>

                {/* Badge */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-100 text-teal-700 text-sm font-medium mb-4"
                >
                    <Sparkles className="w-4 h-4" />
                    <span>AI Destekli Dinleme Pratiği</span>
                </motion.div>

                {/* Title */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-4 leading-tight"
                >
                    Sözlüğe bakmadan,{' '}
                    <span className="bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                        İngilizce dinleyin
                    </span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="text-xl sm:text-2xl text-gray-600 mb-6"
                >
                    Sevdiğiniz içerikler, sizin seviyenizde. Yolda, sporda, evde - her yerde pratik.
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8"
                >
                    <Link href="/register">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold text-lg shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 transition-all flex items-center gap-2"
                        >
                            <Zap className="w-5 h-5" />
                            <span>Ücretsiz Dene</span>
                        </motion.button>
                    </Link>
                    <p className="text-gray-500 text-sm">Kredi kartı gerektirmez</p>
                </motion.div>

                {/* Social Proof */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 }}
                    className="flex flex-wrap justify-center items-center gap-6 text-gray-600 mb-8"
                >
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-teal-500" />
                        <span className="font-semibold">2,500+</span>
                        <span className="text-gray-500">aktif kullanıcı</span>
                    </div>
                    <div className="hidden sm:block w-px h-6 bg-gray-300" />
                    <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                        ))}
                        <span className="ml-1 font-semibold">4.8</span>
                        <span className="text-gray-500">memnuniyet</span>
                    </div>
                </motion.div>

                {/* Content types */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.0 }}
                    className="flex flex-wrap justify-center gap-3 text-gray-500 text-sm"
                >
                    <span className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-full">
                        <BookOpen className="w-3.5 h-3.5" /> Kitaplar
                    </span>
                    <span className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-full">
                        <Newspaper className="w-3.5 h-3.5" /> Makaleler
                    </span>
                    <span className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-full">
                        <Podcast className="w-3.5 h-3.5" /> Herhangi bir konu
                    </span>
                </motion.div>
            </motion.div>

            {/* Scroll indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2"
            >
                <motion.div
                    animate={{ y: [0, 10, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="flex flex-col items-center text-gray-400"
                >
                    <span className="text-sm mb-2">Aşağı kaydır</span>
                    <ChevronDown className="w-6 h-6" />
                </motion.div>
            </motion.div>
        </section>
    );
}

// ============================================
// SLIDE 2: PROBLEM
// ============================================
function ProblemSlide() {
    const problems = [
        {
            icon: Podcast,
            text: 'Podcast dinlemek istiyorum',
            problem: '5 dakika sonra vazgeçiyorum - hiçbir şey anlamıyorum',
            emotion: 'Hayal kırıklığı'
        },
        {
            icon: BookOpen,
            text: 'Sesli kitap denemek istiyorum',
            problem: 'Her cümlede sözlüğe bakıyorum, hikayeyi kaybediyorum',
            emotion: 'Yorgunluk'
        },
        {
            icon: Film,
            text: 'Dizi izleyerek öğrenmek istiyorum',
            problem: 'Altyazı kapatınca hiçbir şey anlamıyorum',
            emotion: 'Çaresizlik'
        },
        {
            icon: Newspaper,
            text: 'Haber dinleyerek pratik yapmak istiyorum',
            problem: 'Çok hızlı konuşuyorlar, yetişemiyorum',
            emotion: 'Stres'
        },
    ];

    return (
        <Section id="problem" gradient>
            <motion.div variants={fadeInUp} className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-100 text-red-700 text-sm font-medium mb-6">
                    <X className="w-4 h-4" />
                    <span>Tanıdık Geldi mi?</span>
                </div>

                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                    İngilizce dinlemek istiyorsunuz...
                </h2>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                    Ama her seferinde aynı hayal kırıklığı: <strong>ya çok kolay, ya çok zor.</strong>
                </p>
            </motion.div>

            <motion.div
                variants={stagger}
                className="grid grid-cols-1 sm:grid-cols-2 gap-6"
            >
                {problems.map((item, i) => (
                    <motion.div
                        key={i}
                        variants={fadeInUp}
                        className="bg-white rounded-2xl p-6 shadow-lg border border-red-100 hover:shadow-xl hover:border-red-200 transition-all"
                    >
                        <div className="flex items-start gap-4">
                            <div className="w-14 h-14 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                                <item.icon className="w-7 h-7 text-red-500" />
                            </div>
                            <div className="flex-1">
                                <p className="text-lg font-semibold text-gray-900 mb-2">{item.text}</p>
                                <p className="text-red-600 italic mb-2">&quot;{item.problem}&quot;</p>
                                <span className="inline-block px-2 py-1 rounded bg-red-50 text-red-500 text-xs font-medium">
                                    {item.emotion}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            <motion.div
                variants={fadeInUp}
                className="mt-10 text-center bg-gray-900 rounded-2xl p-8"
            >
                <p className="text-xl text-white mb-2">
                    <strong>Sonuç:</strong> Dinleme pratiği yapmak istiyorsunuz ama yapamıyorsunuz.
                </p>
                <p className="text-gray-400">
                    Ve her geçen gün İngilizce hedefiniz biraz daha uzaklaşıyor...
                </p>
            </motion.div>
        </Section>
    );
}

// ============================================
// SLIDE 3: SOLUTION
// ============================================
function SolutionSlide() {
    const benefits = [
        {
            icon: BookOpen,
            title: 'Sözlüğe Bakmadan Dinleyin',
            desc: 'İçerik sizin seviyenize uyarlanır. Her kelimeyi anlamak zorunda değilsiniz - akışı takip edebilirsiniz.',
            color: 'teal'
        },
        {
            icon: Clock,
            title: 'Her Yerde Pratik Yapın',
            desc: 'Yolda, sporda, ev işlerinde... Boş zamanlarınızı İngilizce dinleme pratiğine çevirin.',
            color: 'orange'
        },
        {
            icon: Sparkles,
            title: 'İlginizi Çeken Konular',
            desc: 'Sıkıcı ders materyalleri değil, gerçekten merak ettiğiniz konuları dinleyin.',
            color: 'cyan'
        },
    ];

    return (
        <Section id="solution">
            <motion.div variants={fadeInUp} className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-100 text-teal-700 text-sm font-medium mb-6">
                    <Check className="w-4 h-4" />
                    <span>Çözüm</span>
                </div>

                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                    <span className="bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                        LingRoot
                    </span>{' '}
                    ile farklı olacak
                </h2>

                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                    Herhangi bir içeriği sizin İngilizce seviyenize çevirir ve profesyonel sesle okur.
                </p>
            </motion.div>

            {/* Benefits - What you get */}
            <motion.div
                variants={stagger}
                className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
            >
                {benefits.map((item, i) => (
                    <motion.div
                        key={i}
                        variants={fadeInUp}
                        className={`bg-gradient-to-br ${item.color === 'teal' ? 'from-teal-50 to-cyan-50 border-teal-100' :
                            item.color === 'orange' ? 'from-orange-50 to-amber-50 border-orange-100' :
                                'from-cyan-50 to-teal-50 border-cyan-100'
                            } rounded-2xl p-6 border`}
                    >
                        <div className={`w-12 h-12 rounded-xl ${item.color === 'teal' ? 'bg-teal-500' :
                            item.color === 'orange' ? 'bg-orange-500' : 'bg-cyan-500'
                            } flex items-center justify-center mb-4`}>
                            <item.icon className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                        <p className="text-gray-600">{item.desc}</p>
                    </motion.div>
                ))}
            </motion.div>

            {/* How it works - simple */}
            <motion.div
                variants={fadeInUp}
                className="bg-gray-900 rounded-3xl p-8 text-center"
            >
                <h4 className="text-xl font-bold text-white mb-6">Nasıl Çalışır?</h4>
                <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center text-white font-bold">1</div>
                        <span className="text-gray-300">Konu veya içerik seçin</span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-600 hidden md:block" />
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold">2</div>
                        <span className="text-gray-300">Seviyenizi belirleyin</span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-600 hidden md:block" />
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold">3</div>
                        <span className="text-gray-300">Dinlemeye başlayın</span>
                    </div>
                </div>
            </motion.div>

            {/* Important distinction */}
            <motion.div
                variants={fadeInUp}
                className="mt-12 bg-gray-50 rounded-2xl p-8 border border-gray-200"
            >
                <h4 className="text-xl font-bold text-gray-900 mb-6 text-center">Önemli Not</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <p className="font-semibold text-red-600 flex items-center gap-2">
                            <X className="w-5 h-5" /> LingRoot BU DEĞİL:
                        </p>
                        <ul className="space-y-2 text-gray-600">
                            <li className="flex items-center gap-2"><X className="w-4 h-4 text-red-400" /> Her şeyi öğreten tam paket kurs</li>
                            <li className="flex items-center gap-2"><X className="w-4 h-4 text-red-400" /> Gramer veya konuşma uygulaması</li>
                        </ul>
                    </div>
                    <div className="space-y-3">
                        <p className="font-semibold text-teal-600 flex items-center gap-2">
                            <Check className="w-5 h-5" /> LingRoot BU:
                        </p>
                        <ul className="space-y-2 text-gray-600">
                            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-teal-500" /> <strong>Dinleme pratiği</strong> platformu</li>
                            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-teal-500" /> Öğrenme sürecinizi <strong>tamamlayan</strong> araç</li>
                        </ul>
                    </div>
                </div>
            </motion.div>
        </Section>
    );
}

// ============================================
// SLIDE 4: DEMO - How it works
// ============================================
function DemoSlide() {
    const steps = [
        { step: '1', title: 'Konu Seçin', desc: 'Merak ettiğiniz bir konuyu yazın, içerik yükleyin veya hazır kitaplardan seçin' },
        { step: '2', title: 'Seviye Belirleyin', desc: 'A1\'den C2\'ye kadar İngilizce seviyenizi seçin' },
        { step: '3', title: 'Dinleyin', desc: 'Oluşturulan içeriği senkronize altyazıyla dinleyin' },
    ];

    return (
        <Section id="demo" gradient>
            <motion.div variants={fadeInUp} className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 text-orange-700 text-sm font-medium mb-6">
                    <Play className="w-4 h-4" />
                    <span>Nasıl Çalışır?</span>
                </div>

                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                    3 Adımda Başlayın
                </h2>
            </motion.div>

            <motion.div
                variants={stagger}
                className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
                {steps.map((item, i) => (
                    <motion.div
                        key={i}
                        variants={fadeInUp}
                        className="relative"
                    >
                        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 text-center h-full">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-teal-500/20">
                                <span className="text-2xl font-bold text-white">{item.step}</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                            <p className="text-gray-600">{item.desc}</p>
                        </div>
                        {i < steps.length - 1 && (
                            <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                                <ArrowRight className="w-8 h-8 text-gray-300" />
                            </div>
                        )}
                    </motion.div>
                ))}
            </motion.div>
        </Section>
    );
}

// ============================================
// SLIDE 4.5: LEVEL COMPARISON
// ============================================
function LevelComparisonSlide() {
    const [playingLevel, setPlayingLevel] = React.useState<string | null>(null);

    const handlePlay = (level: string) => {
        setPlayingLevel(playingLevel === level ? null : level);
        // Demo: gerçek ses dosyası bağlandığında burada çalacak
    };

    return (
        <Section id="levels">
            <motion.div variants={fadeInUp} className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-100 text-cyan-700 text-sm font-medium mb-6">
                    <Volume2 className="w-4 h-4" />
                    <span>Farkı Duyun</span>
                </div>

                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                    Aynı Hikaye, Farklı Seviyeler
                </h2>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                    Harry Potter&apos;ın ilk sahnesi - C1 ve A2 versiyonlarını dinleyin
                </p>
            </motion.div>

            <motion.div
                variants={stagger}
                className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
                {/* C1 Version */}
                <motion.div
                    variants={fadeInUp}
                    className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-6 border border-red-100"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-bold">C1</span>
                            <span className="text-red-600 font-semibold">Zor - Orijinale Yakın</span>
                        </div>
                        <button
                            onClick={() => handlePlay('c1')}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${playingLevel === 'c1'
                                ? 'bg-red-500 text-white'
                                : 'bg-red-100 text-red-600 hover:bg-red-200'
                                }`}
                        >
                            <Play className={`w-5 h-5 ${playingLevel === 'c1' ? 'animate-pulse' : ''}`} />
                        </button>
                    </div>
                    <div className="bg-white rounded-xl p-5 border border-red-100">
                        <p className="text-gray-700 leading-relaxed text-sm">
                            &quot;Mr. and Mrs. Dursley, of number four Privet Drive, were proud to say that they were perfectly normal, thank you very much. They were the last people you&apos;d expect to be involved in anything strange or mysterious, because they just didn&apos;t hold with such nonsense.&quot;
                        </p>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-red-600 text-sm">
                        <X className="w-4 h-4" />
                        <span>Uzun cümleler, karmaşık yapılar, zor kelimeler</span>
                    </div>
                </motion.div>

                {/* A2 Version */}
                <motion.div
                    variants={fadeInUp}
                    className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-6 border border-teal-100 ring-2 ring-teal-200 ring-offset-2"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 rounded-full bg-teal-500 text-white text-sm font-bold">A2</span>
                            <span className="text-teal-600 font-semibold">Kolay - Anlaşılır</span>
                            <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-700 text-xs font-medium">Önerilen</span>
                        </div>
                        <button
                            onClick={() => handlePlay('a2')}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${playingLevel === 'a2'
                                ? 'bg-teal-500 text-white'
                                : 'bg-teal-100 text-teal-600 hover:bg-teal-200'
                                }`}
                        >
                            <Play className={`w-5 h-5 ${playingLevel === 'a2' ? 'animate-pulse' : ''}`} />
                        </button>
                    </div>
                    <div className="bg-white rounded-xl p-5 border border-teal-100">
                        <p className="text-gray-700 leading-relaxed text-sm">
                            &quot;Mr. and Mrs. Dursley lived at number four Privet Drive. They were very normal people. They did not like strange things. They did not like anything unusual.&quot;
                        </p>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-teal-600 text-sm">
                        <Check className="w-4 h-4" />
                        <span>Kısa cümleler, basit kelimeler, net yapı</span>
                    </div>
                </motion.div>
            </motion.div>

            <motion.div
                variants={fadeInUp}
                className="mt-10 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-2xl p-8 text-center text-white"
            >
                <p className="text-xl font-semibold mb-2">
                    Aynı hikaye. Aynı heyecan. Ama şimdi anlayarak dinliyorsunuz.
                </p>
                <p className="text-teal-100">
                    Seviyeniz arttıkça B1, B2, C1... yavaş yavaş orijinaline yaklaşırsınız.
                </p>
            </motion.div>
        </Section>
    );
}

// ============================================
// SLIDE 5: SCIENCE
// ============================================
function ScienceSlide() {
    return (
        <Section id="science">
            <motion.div variants={fadeInUp} className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-100 text-cyan-700 text-sm font-medium mb-6">
                    <Brain className="w-4 h-4" />
                    <span>Neden Dinleme?</span>
                </div>

                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                    Dil Edinimi Dinleme ile Başlar
                </h2>
            </motion.div>

            {/* Baby analogy - visual */}
            <motion.div
                variants={fadeInUp}
                className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-8 border border-amber-100 mb-10"
            >
                <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="text-7xl">👶</div>
                    <div className="flex-1 text-center md:text-left">
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">Bebek Analojisi</h3>
                        <p className="text-lg text-gray-700 mb-4">
                            Bir bebek düşünün. <strong>İlk 2 yıl ne yapar?</strong>
                        </p>
                        <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-4">
                            <span className="px-4 py-2 rounded-full bg-red-100 text-red-600 text-sm flex items-center gap-1">
                                <X className="w-4 h-4" /> Konuşmaz
                            </span>
                            <span className="px-4 py-2 rounded-full bg-red-100 text-red-600 text-sm flex items-center gap-1">
                                <X className="w-4 h-4" /> Okumaz
                            </span>
                            <span className="px-4 py-2 rounded-full bg-red-100 text-red-600 text-sm flex items-center gap-1">
                                <X className="w-4 h-4" /> Yazmaz
                            </span>
                            <span className="px-4 py-2 rounded-full bg-teal-500 text-white text-sm font-bold flex items-center gap-1">
                                <Check className="w-4 h-4" /> Sadece DİNLER
                            </span>
                        </div>
                        <p className="text-gray-600">
                            Sonra konuşmaya başlar. <strong>Dil edinimi dinleme ile başlar.</strong>
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Key insight */}
            <motion.div
                variants={stagger}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
                <motion.div
                    variants={fadeInUp}
                    className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
                            <Volume2 className="w-6 h-6 text-teal-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">Comprehensible Input</h3>
                    </div>
                    <p className="text-gray-600">
                        Dil bilimci <strong>Stephen Krashen</strong>&apos;a göre: Dil, <strong>anlayabileceğiniz seviyede</strong> girdi ile edinilir.
                        Çok zor içerik faydasız, çok kolay içerik sıkıcı.
                    </p>
                </motion.div>

                <motion.div
                    variants={fadeInUp}
                    className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                            <ArrowRight className="w-6 h-6 text-orange-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">i+1 Prensibi</h3>
                    </div>
                    <p className="text-gray-600">
                        Mevcut seviyenizden <strong>biraz üstü</strong> ideal öğrenme noktası.
                        LingRoot&apos;un CEFR seviyeleri (A1→A2→B1→B2→C1→C2) tam bunu sağlıyor.
                    </p>
                </motion.div>
            </motion.div>

            <motion.div
                variants={fadeInUp}
                className="mt-10 text-center"
            >
                <p className="text-xl text-gray-700">
                    <strong>LingRoot</strong> size o &quot;anlayarak dinleme&quot; sürecini sağlıyor.
                </p>
            </motion.div>
        </Section>
    );
}

// ============================================
// SLIDE 5.5: TESTIMONIALS
// ============================================
function TestimonialsSlide() {
    const testimonials = [
        {
            quote: "Yıllardır podcast dinlemek istiyordum ama hiç anlamıyordum. LingRoot ile ilk kez 'anlayarak' dinledim!",
            name: "Elif K.",
            role: "Üniversite Öğrencisi",
            level: "B1"
        },
        {
            quote: "Harry Potter'ı İngilizce okumak hayalimdi. Şimdi A2 seviyesinde dinliyorum, her gün biraz daha ilerliyorum.",
            name: "Mert A.",
            role: "Yazılım Geliştirici",
            level: "A2 → B1"
        },
        {
            quote: "Serviste geçen 45 dakikayı artık İngilizce pratik yaparak değerlendiriyorum. Çok verimli!",
            name: "Zeynep T.",
            role: "Pazarlama Uzmanı",
            level: "B2"
        },
    ];

    return (
        <Section id="testimonials" gradient>
            <motion.div variants={fadeInUp} className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 text-amber-700 text-sm font-medium mb-6">
                    <Star className="w-4 h-4" />
                    <span>Kullanıcı Deneyimleri</span>
                </div>

                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                    Onlar da sizin gibi başladı
                </h2>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                    2,500+ kullanıcımızdan bazıları
                </p>
            </motion.div>

            <motion.div
                variants={stagger}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
                {testimonials.map((item, i) => (
                    <motion.div
                        key={i}
                        variants={fadeInUp}
                        className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
                    >
                        <Quote className="w-8 h-8 text-teal-200 mb-4" />
                        <p className="text-gray-700 mb-6 italic">
                            &quot;{item.quote}&quot;
                        </p>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-semibold text-gray-900">{item.name}</p>
                                <p className="text-sm text-gray-500">{item.role}</p>
                            </div>
                            <span className="px-3 py-1 rounded-full bg-teal-100 text-teal-700 text-sm font-medium">
                                {item.level}
                            </span>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            {/* Stats */}
            <motion.div
                variants={fadeInUp}
                className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6"
            >
                <div className="text-center">
                    <div className="text-3xl font-bold text-teal-600">2,500+</div>
                    <div className="text-gray-500 text-sm">Aktif Kullanıcı</div>
                </div>
                <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600">50,000+</div>
                    <div className="text-gray-500 text-sm">Dinlenen İçerik</div>
                </div>
                <div className="text-center">
                    <div className="text-3xl font-bold text-cyan-600">4.8/5</div>
                    <div className="text-gray-500 text-sm">Memnuniyet</div>
                </div>
                <div className="text-center">
                    <div className="text-3xl font-bold text-amber-600">%92</div>
                    <div className="text-gray-500 text-sm">Devam Oranı</div>
                </div>
            </motion.div>
        </Section>
    );
}

// ============================================
// SLIDE 6: FAQ
// ============================================
function FaqSlide() {
    const faqs = [
        {
            q: 'Zaten başka uygulamalar var. Bu neden farklı?',
            a: 'LingRoot ders vermez. Zaten sevdiğiniz içerikleri sizin seviyenize çevirir. Ayrıca "tam paket İngilizce" iddiasında değil - sadece dinleme pratiği. Tek bir işi çok iyi yapıyoruz.'
        },
        {
            q: 'Yapay zeka sesleri robot gibi değil mi?',
            a: 'Artık değil. Google\'ın en gelişmiş TTS teknolojisi kullanılıyor. İnsan gibi tonlama ve vurgulama. Saatlerce dinleyebilirsiniz.'
        },
        {
            q: 'Bunu dinleyerek gerçekten İngilizce gelişir mi?',
            a: 'Dil öğrenmenin büyük kısmı INPUT\'tur - yani dinleme ve okuma. LingRoot bu INPUT\'u sağlıyor. Tek başına yeterli mi? Hayır. Gramer çalışmanız, konuşma pratiği yapmanız da gerekir. Ama dinleme pratiğini çok iyi çözüyor.'
        },
        {
            q: 'Türkçe\'ye çevirse daha iyi anlamaz mıyım?',
            a: 'Evet, Türkçe\'ye çevirseniz daha iyi ANLARSINIZ. Ama İngilizce\'niz GELİŞMEZ. LingRoot\'un amacı içeriği anlamanız değil, İngilizce dinleme pratiği yapmanız.'
        },
        {
            q: 'Ücretsiz mi?',
            a: 'Temel özellikler ücretsiz. Günlük belirli sayıda içerik oluşturabilirsiniz. Premium\'da sınırsız kullanım ve ekstra özellikler var. Başlamak için para ödemeniz gerekmiyor.'
        },
    ];

    const [openIndex, setOpenIndex] = React.useState<number | null>(null);

    return (
        <Section id="faq" gradient>
            <motion.div variants={fadeInUp} className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-700 text-sm font-medium mb-6">
                    <MessageCircleQuestion className="w-4 h-4" />
                    <span>Sık Sorulan Sorular</span>
                </div>

                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                    Merak Edilenler
                </h2>
            </motion.div>

            <motion.div variants={stagger} className="max-w-3xl mx-auto space-y-4">
                {faqs.map((faq, i) => (
                    <motion.div
                        key={i}
                        variants={fadeInUp}
                        className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
                    >
                        <button
                            onClick={() => setOpenIndex(openIndex === i ? null : i)}
                            className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                            <span className="text-lg font-semibold text-gray-900">{faq.q}</span>
                            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${openIndex === i ? 'rotate-180' : ''}`} />
                        </button>
                        {openIndex === i && (
                            <div className="px-6 pb-5">
                                <p className="text-gray-600">{faq.a}</p>
                            </div>
                        )}
                    </motion.div>
                ))}
            </motion.div>
        </Section>
    );
}

// ============================================
// SLIDE 7: CTA
// ============================================
function CtaSlide() {
    return (
        <section className="min-h-screen flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 relative overflow-hidden snap-start bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -right-20 w-[500px] h-[500px] rounded-full bg-teal-500/10 blur-3xl" />
                <div className="absolute bottom-1/4 -left-20 w-[500px] h-[500px] rounded-full bg-orange-500/10 blur-3xl" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="text-center relative z-10 max-w-3xl"
            >
                {/* Urgency badge */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 text-amber-400 text-sm font-medium mb-6 border border-amber-500/30"
                >
                    <Zap className="w-4 h-4" />
                    <span>Bugün başlayın, yarın farkı hissedin</span>
                </motion.div>

                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                    İngilizce dinleme pratiğiniz<br />
                    <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                        bugün başlasın
                    </span>
                </h2>

                <p className="text-xl text-gray-400 mb-8">
                    İlk içeriğinizi 30 saniye içinde dinlemeye başlayın. Ücretsiz.
                </p>

                {/* Main CTA */}
                <div className="flex flex-col items-center gap-4 mb-8">
                    <Link href="/register">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-10 py-5 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold text-xl shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 transition-all flex items-center gap-3"
                        >
                            <Zap className="w-6 h-6" />
                            <span>Ücretsiz Hesap Oluştur</span>
                            <ArrowRight className="w-6 h-6" />
                        </motion.button>
                    </Link>

                    <div className="flex items-center gap-4 text-gray-500 text-sm">
                        <span className="flex items-center gap-1">
                            <Check className="w-4 h-4 text-teal-500" /> Kredi kartı gerektirmez
                        </span>
                        <span className="flex items-center gap-1">
                            <Check className="w-4 h-4 text-teal-500" /> Anında başlayın
                        </span>
                    </div>
                </div>

                {/* Already have account */}
                <p className="text-gray-500 mb-10">
                    Zaten hesabınız var mı?{' '}
                    <Link href="/login" className="text-teal-400 hover:text-teal-300 underline">
                        Giriş yapın
                    </Link>
                </p>

                {/* What you get */}
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                    <p className="text-gray-400 text-sm mb-4">Ücretsiz hesapla şunları yapabilirsiniz:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2 text-white">
                            <Check className="w-5 h-5 text-teal-400" />
                            <span>Günlük 3 içerik oluşturma</span>
                        </div>
                        <div className="flex items-center gap-2 text-white">
                            <Check className="w-5 h-5 text-teal-400" />
                            <span>Tüm CEFR seviyeleri</span>
                        </div>
                        <div className="flex items-center gap-2 text-white">
                            <Check className="w-5 h-5 text-teal-400" />
                            <span>Senkronize altyazı</span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Footer */}
            <div className="absolute bottom-4 text-center text-gray-500 text-sm">
                <p>© 2026 LingRoot. Tüm hakları saklıdır.</p>
            </div>
        </section>
    );
}

// ============================================
// MAIN PAGE
// ============================================
export default function BizdenDinleyinPage() {
    return (
        <main className="scroll-smooth snap-y snap-mandatory h-screen overflow-y-scroll">
            <HeroSlide />
            <ProblemSlide />
            <SolutionSlide />
            <LevelComparisonSlide />
            <ScienceSlide />
            <TestimonialsSlide />
            <FaqSlide />
            <CtaSlide />
        </main>
    );
}
