'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, X, Sparkles, BookOpen, GraduationCap, TrendingUp } from 'lucide-react';
import SectorCard, { Sector } from '@/components/sectors/SectorCard';
import { api } from '@/lib/api';

// 16 sektörün tamamı için fallback verisi
const FALLBACK_SECTORS: Sector[] = [
    { id: 1, code: 'it_software', name_tr: 'Bilişim ve Yazılım', description_tr: 'Yazılım geliştirme, programlama ve bilişim teknolojileri', content_count: 0 },
    { id: 2, code: 'finance', name_tr: 'Finans ve Bankacılık', description_tr: 'Banka işlemleri, yatırım, muhasebe ve finans yönetimi', content_count: 0 },
    { id: 3, code: 'tourism', name_tr: 'Turizm ve Otelcilik', description_tr: 'Otel, seyahat, restoran ve konaklama hizmetleri', content_count: 0 },
    { id: 4, code: 'logistics', name_tr: 'Lojistik ve Dış Ticaret', description_tr: 'Depo yönetimi, tedarik zinciri, uluslararası nakliye ve gümrük', content_count: 0 },
    { id: 5, code: 'healthcare', name_tr: 'Sağlık ve Hastane', description_tr: 'Hastane, klinik, hemşirelik ve tıbbi hizmetler', content_count: 0 },
    { id: 6, code: 'medical_tourism', name_tr: 'Sağlık Turizmi', description_tr: 'Medikal turizm, hasta kabul ve uluslararası sağlık hizmetleri', content_count: 0 },
    { id: 7, code: 'legal', name_tr: 'Hukuk', description_tr: 'Avukatlık, sözleşmeler, ticaret hukuku ve yasal süreçler', content_count: 0 },
    { id: 8, code: 'automotive', name_tr: 'Otomotiv', description_tr: 'Araç üretimi, satış, servis ve yedek parça', content_count: 0 },
    { id: 9, code: 'marketing', name_tr: 'Pazarlama ve Dijital', description_tr: 'Dijital pazarlama, reklam, marka yönetimi ve sosyal medya', content_count: 0 },
    { id: 10, code: 'engineering', name_tr: 'Mühendislik', description_tr: 'İnşaat, makine, elektrik ve endüstriyel mühendislik', content_count: 0 },
    { id: 11, code: 'retail', name_tr: 'Perakende ve Satış', description_tr: 'Mağaza yönetimi, satış teknikleri ve müşteri ilişkileri', content_count: 0 },
    { id: 12, code: 'education', name_tr: 'Eğitim ve Akademi', description_tr: 'Öğretim, akademik yazım ve eğitim yönetimi', content_count: 0 },
    { id: 13, code: 'hr', name_tr: 'İnsan Kaynakları', description_tr: 'İşe alım, performans yönetimi ve çalışan ilişkileri', content_count: 0 },
    { id: 14, code: 'real_estate', name_tr: 'Gayrimenkul', description_tr: 'Emlak satışı, kiralama ve mülk yönetimi', content_count: 0 },
    { id: 15, code: 'aviation', name_tr: 'Havacılık', description_tr: 'Havayolu operasyonları, uçuş hizmetleri ve havacılık terimleri', content_count: 0 },
    { id: 16, code: 'manufacturing', name_tr: 'Üretim ve İmalat', description_tr: 'Fabrika üretimi, kalite kontrol ve endüstriyel süreçler', content_count: 0 },
];

export default function SectorsPage() {
    const router = useRouter();
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState<'all' | 'hasContent' | 'inProgress'>('all');

    // Fetch sectors from API
    useEffect(() => {
        const fetchSectors = async () => {
            try {
                setLoading(true);
                const response = await fetch(api.getApiUrl('sectors'));

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && Array.isArray(data.data) && data.data.length > 0) {
                        // Mapleme: API'den gelen name alanını name_tr olarak kullan
                        const mappedSectors = data.data.map((s: any) => ({
                            ...s,
                            name_tr: s.name_tr || s.name,
                            description_tr: s.description_tr || s.description,
                        }));
                        setSectors(mappedSectors);
                    } else {
                        // API boş veya hata döndü, fallback kullan
                        console.warn('Sector API returned empty data, using fallback');
                        setSectors(FALLBACK_SECTORS);
                    }
                } else {
                    console.warn('Sector API error, using fallback');
                    setSectors(FALLBACK_SECTORS);
                }
            } catch (error) {
                console.error('Failed to fetch sectors:', error);
                setSectors(FALLBACK_SECTORS);
            } finally {
                setLoading(false);
            }
        };

        fetchSectors();
    }, []);

    // Filter and search sectors
    const filteredSectors = useMemo(() => {
        let result = [...sectors];

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(s =>
                (s.name_tr || s.name || '').toLowerCase().includes(query) ||
                (s.description_tr || s.description || '').toLowerCase().includes(query) ||
                s.code.toLowerCase().includes(query)
            );
        }

        // Category filter
        if (selectedFilter === 'hasContent') {
            result = result.filter(s => (s.content_count || 0) > 0);
        } else if (selectedFilter === 'inProgress') {
            result = result.filter(s => (s.user_progress || 0) > 0);
        }

        return result;
    }, [sectors, searchQuery, selectedFilter]);

    // Stats
    const totalContent = sectors.reduce((sum, s) => sum + (s.content_count || 0), 0);
    const totalVocab = sectors.reduce((sum, s) => sum + (s.vocabulary_count || 0), 0);

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
            {/* Hero Section */}
            <div className="relative overflow-hidden">
                {/* Background decorations */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-teal-400/20 to-cyan-400/10 blur-3xl" />
                    <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-orange-400/20 to-amber-400/10 blur-3xl" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-r from-teal-500/5 to-orange-500/5 blur-3xl" />
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
                    {/* Title */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-8"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 text-sm font-medium mb-4">
                            <Sparkles className="w-4 h-4" />
                            <span>16 Sektör • Profesyonel İngilizce</span>
                        </div>

                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white mb-4">
                            <span className="block">Kariyeriniz İçin</span>
                            <span className="block bg-gradient-to-r from-teal-600 via-cyan-500 to-teal-600 bg-clip-text text-transparent">
                                Sektörel İngilizce
                            </span>
                        </h1>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto"
                        >
                            Kendi alanınızdaki profesyonel terimleri, iş diyaloglarını ve iletişim kalıplarını
                            öğrenerek kariyerinizde fark yaratın.
                        </motion.p>
                    </motion.div>

                    {/* Stats */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex flex-wrap justify-center gap-8 mb-10"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                                <BookOpen className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalContent || '100+'}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Eğitim İçeriği</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
                                <GraduationCap className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalVocab || '500+'}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Profesyonel Terim</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">16</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Sektör</p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Search & Filter */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="max-w-2xl mx-auto"
                    >
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Sektör ara... (ör: finans, turizm, yazılım)"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-24 py-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <X className="w-4 h-4 text-gray-400" />
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`p-2 rounded-xl transition-colors ${showFilters ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400'}`}
                                >
                                    <Filter className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Filter pills */}
                        <AnimatePresence>
                            {showFilters && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="flex flex-wrap justify-center gap-2 mt-4">
                                        {[
                                            { key: 'all', label: 'Tümü' },
                                            { key: 'hasContent', label: 'İçerik Olanlar' },
                                            { key: 'inProgress', label: 'Devam Edenler' },
                                        ].map((filter) => (
                                            <button
                                                key={filter.key}
                                                onClick={() => setSelectedFilter(filter.key as typeof selectedFilter)}
                                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedFilter === filter.key
                                                        ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30'
                                                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-teal-300'
                                                    }`}
                                            >
                                                {filter.label}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            </div>

            {/* Sectors Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
                {loading ? (
                    // Loading skeleton
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="animate-pulse">
                                <div className="h-64 rounded-2xl bg-gray-200 dark:bg-gray-800" />
                            </div>
                        ))}
                    </div>
                ) : filteredSectors.length === 0 ? (
                    // No results
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-20"
                    >
                        <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                            <Search className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            Sektör bulunamadı
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                            "{searchQuery}" için sonuç bulunamadı. Farklı bir arama deneyin.
                        </p>
                        <button
                            onClick={() => { setSearchQuery(''); setSelectedFilter('all'); }}
                            className="mt-4 px-4 py-2 rounded-xl bg-teal-500 text-white font-medium hover:bg-teal-600 transition-colors"
                        >
                            Filtreleri Temizle
                        </button>
                    </motion.div>
                ) : (
                    // Grid
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredSectors.map((sector, index) => (
                            <SectorCard
                                key={sector.id}
                                sector={sector}
                                index={index}
                                onClick={() => router.push(`/sectors/${sector.id}`)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
