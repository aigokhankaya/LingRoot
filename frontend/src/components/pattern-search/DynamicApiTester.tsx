import React, { useState } from 'react';
import { ArrowRightLeft, Loader2, Play } from 'lucide-react';

export default function DynamicApiTester() {
    const [provider, setProvider] = useState('libre');
    const [text, setText] = useState('');
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);
    const [duration, setDuration] = useState<number | null>(null);

    const handleTest = async () => {
        if (!text) return;

        setLoading(true);
        setResult('');
        setDuration(null);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/translations/test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    provider,
                    text,
                    targetLang: 'tr' // Hardcoded for lab test
                })
            });

            const data = await response.json();
            if (data.success) {
                setResult(data.result);
                setDuration(data.duration_ms);
            } else {
                setResult(`Error: ${data.message || 'Unknown error'}`);
            }
        } catch (err) {
            setResult('Failed to connect to backend');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mt-12">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-700 pb-4">
                <div className="p-2 bg-indigo-900/50 rounded-lg text-indigo-400">
                    <ArrowRightLeft className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">API Test Laboratuvarı</h3>
                    <p className="text-sm text-gray-400">Ücretsiz ve ücretli servisleri karşılaştırın</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Controls */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Servis Sağlayıcı</label>
                        <select
                            value={provider}
                            onChange={(e) => setProvider(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 text-white rounded-lg p-3 focus:ring-indigo-500"
                        >
                            <option value="libre">LibreTranslate (Free/Self-Hosted)</option>
                            <option value="google">Google Translate (Free Tier)</option>
                            <option value="deepl">DeepL API (Free Tier)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-2">
                            {provider === 'libre' && 'Yerel veya açık kaynak sunucular. Tamamen ücretsiz.'}
                            {provider === 'google' && 'Google Cloud altyapısı. Aylık 500k karakter ücretsiz.'}
                            {provider === 'deepl' && 'Yüksek kalite nöral ağ. Aylık 500k karakter ücretsiz.'}
                        </p>
                    </div>

                    <button
                        onClick={handleTest}
                        disabled={loading || !text}
                        className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-bold hover:shadow-lg hover:shadow-indigo-500/20 transition-all ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
                        {loading ? 'Çevriliyor...' : 'Test Et'}
                    </button>
                </div>

                {/* Input */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Giriş Metni (EN)</label>
                    <textarea
                        className="w-full h-32 bg-gray-900 border border-gray-600 text-white rounded-lg p-3 resize-none focus:border-indigo-500"
                        placeholder="Test etmek istediğiniz İngilizce cümleyi buraya yazın..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    />
                </div>

                {/* Output */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2 justify-between flex">
                        <span>Sonuç (TR)</span>
                        {duration !== null && <span className="text-green-400 text-xs">{duration}ms</span>}
                    </label>
                    <div className="w-full h-32 bg-gray-900/50 border border-gray-600 rounded-lg p-3 text-gray-300 overflow-auto">
                        {result || <span className="text-gray-600 italic">Sonuç burada görünecek...</span>}
                    </div>
                </div>
            </div>
        </div>
    );
}
