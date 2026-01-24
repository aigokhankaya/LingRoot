'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import PatternSearchInput from '@/components/pattern-search/PatternSearchInput';
import PatternResults from '@/components/pattern-search/PatternResults';
import DynamicApiTester from '@/components/pattern-search/DynamicApiTester';
import LLMPatternGenerator from '@/components/pattern-search/LLMPatternGenerator';
import { useAuth } from '@/lib/auth';

export default function PatternLabPage() {
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const { user, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    // Admin kontrolü
    useEffect(() => {
        if (!isLoading) {
            if (!isAuthenticated) {
                router.push('/login');
            } else if (user?.role !== 'admin') {
                router.push('/welcome');
            }
        }
    }, [isLoading, isAuthenticated, user, router]);

    // Loading durumu
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Yetki kontrol ediliyor...</p>
                </div>
            </div>
        );
    }

    // Yetkisiz kullanıcı (redirect olana kadar)
    if (!isAuthenticated || user?.role !== 'admin') {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">🔒</div>
                    <h1 className="text-2xl font-bold text-white mb-2">Erişim Engellendi</h1>
                    <p className="text-gray-400">Bu sayfaya erişmek için admin yetkisi gereklidir.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950">
            <Header />

            <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">

                {/* Hero / Intro */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full mb-4">
                        <span className="text-sm">🔐</span>
                        <span className="text-red-400 text-xs font-medium">Admin Only</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-4">
                        LingRoot Dil Laboratuvarı
                    </h1>
                    <p className="text-gray-400 max-w-2xl mx-auto">
                        İngilizce ve Türkçe arasındaki dilsel köprüleri keşfedin. Deyimler, atasözleri ve cümle kalıpları için yerel kütüphanemizi tarayın veya farklı çeviri motorlarını test edin.
                    </p>
                </div>

                {/* LLM Pattern Generator Section */}
                <div className="mb-12">
                    <LLMPatternGenerator />
                </div>

                {/* Pattern Search Section */}
                <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 sm:p-10 shadow-2xl shadow-indigo-900/10 mb-12">
                    <div className="text-center mb-8">
                        <h2 className="text-xl font-semibold text-white mb-2">Yerel Kütüphane Arama</h2>
                        <p className="text-sm text-gray-500">
                            Veritabanımızdaki kalıplar içinde anlık arama yapın.
                        </p>
                    </div>

                    <PatternSearchInput
                        onSearch={setResults}
                        onLoading={setLoading}
                    />

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
                        </div>
                    ) : results.length > 0 ? (
                        <PatternResults results={results} />
                    ) : null}
                </div>

                {/* Dynamic API Tester Section */}
                <DynamicApiTester />

            </main>
        </div>
    );
}
