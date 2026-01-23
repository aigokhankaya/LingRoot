'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import SectorCard, { Sector } from '../../components/sectors/SectorCard';
import { Briefcase, Sparkles } from 'lucide-react';
// import { useToast } from '../../hooks/use-toast'; // Toast hook'u varsa kullanabiliriz

export default function SectorList() {
    const router = useRouter();
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchSectors();
    }, []);

    const fetchSectors = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/sectors`); // API URL'i env'den al veya default kullan

            if (!response.ok) {
                throw new Error('Sektörler yüklenirken bir hata oluştu');
            }

            const result = await response.json();

            if (result.success) {
                setSectors(result.data);
            } else {
                throw new Error(result.error || 'Veri formatı hatalı');
            }
        } catch (err) {
            console.error('Error fetching sectors:', err);
            setError('Sektörler yüklenemedi. Lütfen daha sonra tekrar deneyiniz.');
        } finally {
            setLoading(false);
        }
    };

    const handleSectorClick = (sectorId: number) => {
        router.push(`/sectors/${sectorId}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen pt-24 flex items-center justify-center bg-gray-50/50 dark:bg-gray-900/50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">Sektörler yükleniyor...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen pt-24 flex flex-col items-center justify-center p-4">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Bir şeyler yanlış gitti</h2>
                <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-8">{error}</p>
                <button
                    onClick={fetchSectors}
                    className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-teal-500/20"
                >
                    Tekrar Dene
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900/50 pb-20 pt-24">
            {/* Header Section */}
            <div className="relative overflow-hidden mb-12 py-12 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700/50">
                {/* Background decorations */}
                <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-teal-500/5 to-transparent pointer-events-none" />
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-2xl"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 text-sm font-medium mb-4">
                            <Briefcase className="w-4 h-4" />
                            <span>Profesyonel Gelişim</span>
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white tracking-tight mb-4">
                            Sektörel İngilizce
                        </h1>
                        <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                            Kendi sektörünüze özel terimleri, kalıpları ve senaryoları öğrenerek kariyerinizde bir adım öne geçin.
                            Yapay zeka destekli içeriklerle mesleki İngilizcenizi geliştirin.
                        </p>
                    </motion.div>
                </div>
            </div>

            {/* Content Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {sectors.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700"
                    >
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Sparkles className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">Henüz Sektör Bulunamadı</h3>
                        <p className="text-gray-500 dark:text-gray-400">Şu anda listelenecek aktif bir sektör bulunmuyor.</p>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {sectors.map((sector, index) => (
                            <SectorCard
                                key={sector.id}
                                sector={sector}
                                index={index}
                                onClick={() => handleSectorClick(sector.id)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
