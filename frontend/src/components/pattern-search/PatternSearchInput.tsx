import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface PatternSearchInputProps {
    onSearch: (results: any[]) => void;
    onLoading: (status: boolean) => void;
}

export default function PatternSearchInput({ onSearch, onLoading }: PatternSearchInputProps) {
    const [query, setQuery] = useState('');
    const [lang, setLang] = useState('en');

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (query.trim().length < 2) return;

        onLoading(true);
        try {
            const token = localStorage.getItem('token');
            // Using API via proxy or direct axios? Assuming configured axios instance or fetch
            // For simplicity in this plan, direct fetch with auth header
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/patterns/search?query=${query}&lang=${lang}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();

            if (data.success) {
                onSearch(data.results);
            } else {
                alert('Search failed');
            }
        } catch (err) {
            console.error('Search error', err);
        } finally {
            onLoading(false);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto mb-8">
            <form onSubmit={handleSearch} className="flex gap-2">
                <select
                    value={lang}
                    onChange={(e) => setLang(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white rounded-lg px-3 focus:ring-indigo-500 focus:border-indigo-500"
                >
                    <option value="en">EN &gt; TR</option>
                    <option value="tr">TR &gt; EN</option>
                </select>

                <div className="relative flex-1">
                    <input
                        type="text"
                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        placeholder={lang === 'en' ? "Search idioms (e.g. 'break a leg')..." : "Deyimara (örn. 'etekleri zil çalmak')..."}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                </div>

                <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                    Ara
                </button>
            </form>
        </div>
    );
}
