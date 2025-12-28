'use client';

import React, { useState } from 'react';
import Header from '@/components/Header';
import PatternSearchInput from '@/components/pattern-search/PatternSearchInput';
import PatternResults from '@/components/pattern-search/PatternResults';
import DynamicApiTester from '@/components/pattern-search/DynamicApiTester';

export default function PatternLabPage() {
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    return (
        <div className="min-h-screen bg-gray-950">
            <Header />

            <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">

                {/* Hero / Intro */}
                <div className="text-center mb-12">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-4">
                        LingRoot Dil Laboratuvarı
                    </h1>
                    <p className="text-gray-400 max-w-2xl mx-auto">
                        İngilizce ve Türkçe arasındaki dilsel köprüleri keşfedin. Deyimler, atasözleri ve cümle kalıpları için yerel kütüphanemizi tarayın veya farklı çeviri motorlarını test edin.
                    </p>
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
