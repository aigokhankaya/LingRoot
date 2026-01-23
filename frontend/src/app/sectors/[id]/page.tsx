'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen,
    GraduationCap,
    HelpCircle,
    Layers,
    ArrowLeft,
    Search,
    Filter,
    X,
    Briefcase,
    AlertCircle,
    RefreshCw
} from 'lucide-react';
import SectorHero from '@/components/sectors/SectorHero';
import ContentCard, { ContentItem } from '@/components/sectors/ContentCard';
import VocabularyCard, { VocabularyItem, FlashcardCarousel } from '@/components/sectors/VocabularyCard';
import { Sector, SECTOR_ICONS, SECTOR_COLORS, DEFAULT_COLOR } from '@/components/sectors/SectorCard';
import { api } from '@/lib/api';

// Tab types
type TabType = 'content' | 'vocabulary' | 'quiz';

// CEFR levels for filtering
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// Content types for filtering
const CONTENT_TYPES = [
    { value: 'dialogue', label: 'Diyalog' },
    { value: 'scenario', label: 'Senaryo' },
    { value: 'article', label: 'Makale' },
    { value: 'email', label: 'E-posta' },
];

// Fallback sector data generator
function getFallbackSector(id: string): Sector {
    const fallbackSectors: Record<string, Sector> = {
        '1': { id: 1, code: 'it_software', name_tr: 'Bilişim ve Yazılım', description_tr: 'Yazılım geliştirme, programlama ve bilişim teknolojileri' },
        '2': { id: 2, code: 'finance', name_tr: 'Finans ve Bankacılık', description_tr: 'Banka işlemleri, yatırım, muhasebe ve finans yönetimi' },
        '3': { id: 3, code: 'tourism', name_tr: 'Turizm ve Otelcilik', description_tr: 'Otel, seyahat, restoran ve konaklama hizmetleri' },
        '4': { id: 4, code: 'logistics', name_tr: 'Lojistik ve Dış Ticaret', description_tr: 'Depo yönetimi, tedarik zinciri, uluslararası nakliye ve gümrük' },
        '5': { id: 5, code: 'healthcare', name_tr: 'Sağlık ve Hastane', description_tr: 'Hastane, klinik, hemşirelik ve tıbbi hizmetler' },
        '6': { id: 6, code: 'medical_tourism', name_tr: 'Sağlık Turizmi', description_tr: 'Medikal turizm, hasta kabul ve uluslararası sağlık hizmetleri' },
        '7': { id: 7, code: 'legal', name_tr: 'Hukuk', description_tr: 'Avukatlık, sözleşmeler, ticaret hukuku ve yasal süreçler' },
        '8': { id: 8, code: 'automotive', name_tr: 'Otomotiv', description_tr: 'Araç üretimi, satış, servis ve yedek parça' },
        '9': { id: 9, code: 'marketing', name_tr: 'Pazarlama ve Dijital', description_tr: 'Dijital pazarlama, reklam, marka yönetimi ve sosyal medya' },
        '10': { id: 10, code: 'engineering', name_tr: 'Mühendislik', description_tr: 'İnşaat, makine, elektrik ve endüstriyel mühendislik' },
        '11': { id: 11, code: 'retail', name_tr: 'Perakende ve Satış', description_tr: 'Mağaza yönetimi, satış teknikleri ve müşteri ilişkileri' },
        '12': { id: 12, code: 'education', name_tr: 'Eğitim ve Akademi', description_tr: 'Öğretim, akademik yazım ve eğitim yönetimi' },
        '13': { id: 13, code: 'hr', name_tr: 'İnsan Kaynakları', description_tr: 'İşe alım, performans yönetimi ve çalışan ilişkileri' },
        '14': { id: 14, code: 'real_estate', name_tr: 'Gayrimenkul', description_tr: 'Emlak satışı, kiralama ve mülk yönetimi' },
        '15': { id: 15, code: 'aviation', name_tr: 'Havacılık', description_tr: 'Havayolu operasyonları, uçuş hizmetleri ve havacılık terimleri' },
        '16': { id: 16, code: 'manufacturing', name_tr: 'Üretim ve İmalat', description_tr: 'Fabrika üretimi, kalite kontrol ve endüstriyel süreçler' },
    };
    return fallbackSectors[id] || { id: parseInt(id), code: 'unknown', name_tr: 'Sektör', description_tr: 'Sektör açıklaması' };
}

export default function SectorDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;

    // States
    const [sector, setSector] = useState<Sector | null>(null);
    const [contentList, setContentList] = useState<ContentItem[]>([]);
    const [vocabularyList, setVocabularyList] = useState<VocabularyItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // UI states
    const [activeTab, setActiveTab] = useState<TabType>('content');
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [vocabView, setVocabView] = useState<'list' | 'flashcard'>('list');

    // Fetch data
    useEffect(() => {
        if (!id) return;

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Fetch sector details
                const sectorRes = await fetch(api.getApiUrl(`sectors/${id}`));
                if (sectorRes.ok) {
                    const data = await sectorRes.json();
                    if (data.success && data.data) {
                        setSector({
                            ...data.data,
                            name_tr: data.data.name_tr || data.data.name,
                            description_tr: data.data.description_tr || data.data.description,
                        });
                    } else {
                        setSector(getFallbackSector(id));
                    }
                } else {
                    setSector(getFallbackSector(id));
                }

                // Fetch content
                const contentRes = await fetch(api.getApiUrl(`sectors/${id}/content`));
                if (contentRes.ok) {
                    const data = await contentRes.json();
                    setContentList(data.data || []);
                } else {
                    setContentList([]);
                }

                // Fetch vocabulary
                const vocabRes = await fetch(api.getApiUrl(`sectors/${id}/vocabulary`));
                if (vocabRes.ok) {
                    const data = await vocabRes.json();
                    setVocabularyList(data.data || []);
                } else {
                    setVocabularyList([]);
                }

            } catch (err) {
                console.error('Error fetching sector data:', err);
                setError('Veri yüklenirken bir hata oluştu.');
                setSector(getFallbackSector(id));
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    // Filter content
    const filteredContent = useMemo(() => {
        let result = [...contentList];

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(c =>
                c.title.toLowerCase().includes(query) ||
                (c.key_vocabulary || []).some(v => v.toLowerCase().includes(query))
            );
        }

        if (selectedLevel) {
            result = result.filter(c => (c.cefr_level || c.level) === selectedLevel);
        }

        if (selectedType) {
            result = result.filter(c => (c.content_type || c.type) === selectedType);
        }

        return result;
    }, [contentList, searchQuery, selectedLevel, selectedType]);

    // Filter vocabulary
    const filteredVocabulary = useMemo(() => {
        let result = [...vocabularyList];

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(v =>
                v.word.toLowerCase().includes(query) ||
                v.definition_tr.toLowerCase().includes(query)
            );
        }

        if (selectedLevel) {
            result = result.filter(v => v.cefr_level === selectedLevel);
        }

        return result;
    }, [vocabularyList, searchQuery, selectedLevel]);

    // Handlers
    const handleLearnWord = (wordId: string | number) => {
        setVocabularyList(prev =>
            prev.map(v => v.id === wordId ? { ...v, is_learned: !v.is_learned } : v)
        );
        // TODO: API call to persist
    };

    const handleBookmarkWord = (wordId: string | number) => {
        setVocabularyList(prev =>
            prev.map(v => v.id === wordId ? { ...v, is_bookmarked: !v.is_bookmarked } : v)
        );
        // TODO: API call to persist
    };

    const handleSpeakWord = (word: string) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = 'en-US';
            utterance.rate = 0.9;
            speechSynthesis.speak(utterance);
        }
    };

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedLevel(null);
        setSelectedType(null);
    };

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Yükleniyor...</p>
                </div>
            </div>
        );
    }

    // Not found state
    if (!sector) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
                <div className="text-center">
                    <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Sektör bulunamadı</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">İstediğiniz sektör mevcut değil veya silinmiş olabilir.</p>
                    <button
                        onClick={() => router.push('/sectors')}
                        className="px-6 py-3 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition-colors"
                    >
                        Tüm Sektörlere Dön
                    </button>
                </div>
            </div>
        );
    }

    const colors = SECTOR_COLORS[sector.code] || DEFAULT_COLOR;

    // Tabs config
    const tabs = [
        { key: 'content' as TabType, label: 'İçerikler', icon: BookOpen, count: contentList.length },
        { key: 'vocabulary' as TabType, label: 'Terminoloji', icon: GraduationCap, count: vocabularyList.length },
        { key: 'quiz' as TabType, label: 'Quiz', icon: HelpCircle, count: 0 },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Hero */}
            <SectorHero
                sector={sector}
                onBack={() => router.push('/sectors')}
                stats={{
                    totalContent: contentList.length,
                    totalVocabulary: vocabularyList.length,
                    estimatedMinutes: contentList.reduce((sum, c) => sum + (c.estimated_minutes || 5), 0),
                    userProgress: 0,
                }}
            />

            {/* Error banner */}
            {error && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <p className="text-red-700 dark:text-red-300">{error}</p>
                        <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-500">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Main content area */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Tabs */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div className="flex overflow-x-auto gap-2 pb-2 sm:pb-0">
                        {tabs.map((tab) => {
                            const IconComponent = tab.icon;
                            const isActive = activeTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`
                                        flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap
                                        ${isActive
                                            ? `bg-gradient-to-r ${colors.gradient} text-white shadow-lg`
                                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'}
                                    `}
                                >
                                    <IconComponent className="w-4 h-4" />
                                    <span>{tab.label}</span>
                                    {tab.count > 0 && (
                                        <span className={`
                                            px-2 py-0.5 rounded-full text-xs font-bold
                                            ${isActive
                                                ? 'bg-white/20 text-white'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}
                                        `}>
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* View toggle for vocabulary */}
                    {activeTab === 'vocabulary' && vocabularyList.length > 0 && (
                        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                            <button
                                onClick={() => setVocabView('list')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${vocabView === 'list'
                                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Liste
                            </button>
                            <button
                                onClick={() => setVocabView('flashcard')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${vocabView === 'flashcard'
                                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Flashcard
                            </button>
                        </div>
                    )}
                </div>

                {/* Search & Filters */}
                {(activeTab === 'content' || activeTab === 'vocabulary') && (
                    <div className="mb-6">
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder={activeTab === 'content' ? 'İçerik ara...' : 'Kelime ara...'}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                        <X className="w-4 h-4 text-gray-400" />
                                    </button>
                                )}
                            </div>

                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`px-4 py-3 rounded-xl border transition-colors flex items-center gap-2 ${showFilters || selectedLevel || selectedType
                                        ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-300 dark:border-teal-700 text-teal-600'
                                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                            >
                                <Filter className="w-5 h-5" />
                                <span className="hidden sm:inline">Filtrele</span>
                            </button>
                        </div>

                        {/* Filter dropdowns */}
                        <AnimatePresence>
                            {showFilters && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                        {/* Level filter */}
                                        <div>
                                            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">Seviye</label>
                                            <div className="flex flex-wrap gap-1.5">
                                                {CEFR_LEVELS.map((level) => (
                                                    <button
                                                        key={level}
                                                        onClick={() => setSelectedLevel(selectedLevel === level ? null : level)}
                                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedLevel === level
                                                                ? 'bg-teal-500 text-white'
                                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                            }`}
                                                    >
                                                        {level}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Type filter (only for content) */}
                                        {activeTab === 'content' && (
                                            <div>
                                                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">Tür</label>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {CONTENT_TYPES.map((type) => (
                                                        <button
                                                            key={type.value}
                                                            onClick={() => setSelectedType(selectedType === type.value ? null : type.value)}
                                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedType === type.value
                                                                    ? 'bg-orange-500 text-white'
                                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                                }`}
                                                        >
                                                            {type.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Clear filters */}
                                        {(selectedLevel || selectedType || searchQuery) && (
                                            <button
                                                onClick={clearFilters}
                                                className="self-end px-4 py-1.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-1"
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                                Temizle
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* Tab content */}
                <AnimatePresence mode="wait">
                    {/* Content Tab */}
                    {activeTab === 'content' && (
                        <motion.div
                            key="content"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            {filteredContent.length === 0 ? (
                                <div className="text-center py-16">
                                    <Layers className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                        {contentList.length === 0
                                            ? 'Henüz içerik eklenmemiş'
                                            : 'Filtrelerinize uygun içerik bulunamadı'}
                                    </h3>
                                    <p className="text-gray-500 dark:text-gray-400">
                                        {contentList.length === 0
                                            ? 'Bu sektör için içerikler yakında eklenecek.'
                                            : 'Farklı filtreler deneyin veya aramayı temizleyin.'}
                                    </p>
                                    {(selectedLevel || selectedType || searchQuery) && (
                                        <button
                                            onClick={clearFilters}
                                            className="mt-4 px-4 py-2 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition-colors"
                                        >
                                            Filtreleri Temizle
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {filteredContent.map((content, index) => (
                                        <ContentCard
                                            key={content.id}
                                            content={content}
                                            index={index}
                                            onClick={() => router.push(`/sectors/${id}/content/${content.id}`)}
                                        />
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Vocabulary Tab */}
                    {activeTab === 'vocabulary' && (
                        <motion.div
                            key="vocabulary"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            {filteredVocabulary.length === 0 ? (
                                <div className="text-center py-16">
                                    <GraduationCap className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                        {vocabularyList.length === 0
                                            ? 'Henüz terminoloji eklenmemiş'
                                            : 'Filtrelerinize uygun kelime bulunamadı'}
                                    </h3>
                                    <p className="text-gray-500 dark:text-gray-400">
                                        {vocabularyList.length === 0
                                            ? 'Bu sektör için terimler yakında eklenecek.'
                                            : 'Farklı filtreler deneyin veya aramayı temizleyin.'}
                                    </p>
                                </div>
                            ) : vocabView === 'flashcard' ? (
                                <FlashcardCarousel
                                    vocabularyList={filteredVocabulary}
                                    onLearn={handleLearnWord}
                                    onSpeak={handleSpeakWord}
                                />
                            ) : (
                                <div className="space-y-3">
                                    {filteredVocabulary.map((vocab, index) => (
                                        <VocabularyCard
                                            key={vocab.id}
                                            vocabulary={vocab}
                                            index={index}
                                            variant="list"
                                            onLearn={handleLearnWord}
                                            onBookmark={handleBookmarkWord}
                                            onSpeak={handleSpeakWord}
                                        />
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Quiz Tab */}
                    {activeTab === 'quiz' && (
                        <motion.div
                            key="quiz"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-center py-16"
                        >
                            <HelpCircle className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                Quizler Yakında
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400">
                                Bu sektör için bilgi testleri yakında eklenecek.
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
