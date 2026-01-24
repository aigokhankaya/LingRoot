'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Mic,
    Play,
    Pause,
    Volume2,
    ChevronRight,
    ChevronLeft,
    Sparkles,
    MessageSquare,
    Settings2,
    Check,
    Loader2,
    RefreshCw,
    Download
} from 'lucide-react';

// Ses seçenekleri
const VOICE_OPTIONS = [
    { id: 'onyx', name: 'Onyx', gender: 'male', description: 'Derin erkek sesi' },
    { id: 'echo', name: 'Echo', gender: 'male', description: 'Samimi erkek sesi' },
    { id: 'fable', name: 'Fable', gender: 'neutral', description: 'Nötr hikaye anlatıcı' },
    { id: 'nova', name: 'Nova', gender: 'female', description: 'Enerjik kadın sesi' },
    { id: 'shimmer', name: 'Shimmer', gender: 'female', description: 'Zarif kadın sesi' },
    { id: 'alloy', name: 'Alloy', gender: 'neutral', description: 'Doğal nötr ses' },
];

// Senaryo uzunlukları
const LENGTH_OPTIONS = [
    { id: 'short', name: 'Kısa', description: '4-6 replik', icon: '⚡' },
    { id: 'medium', name: 'Orta', description: '8-12 replik', icon: '📝' },
    { id: 'long', name: 'Uzun', description: '16-20 replik', icon: '📚' },
];

interface ScenarioCategory {
    id: string;
    name_tr: string;
    name_en: string;
}

interface Role {
    id: string;
    title: string;
    title_en: string;
    voice: string;
}

interface DialogueTurn {
    role_id: string;
    speaker: string;
    english: string;
    turkish: string;
    key_phrase?: boolean;
}

interface RoleplayCreatorProps {
    sectorId: number;
    sectorName: string;
    sectorCode: string;
    onClose?: () => void;
    onContentCreated?: (content: any) => void;
}

export default function RoleplayCreator({
    sectorId,
    sectorName,
    sectorCode,
    onClose,
    onContentCreated
}: RoleplayCreatorProps) {
    // Wizard adımları
    const [step, setStep] = useState(1);
    const totalSteps = 4;

    // Form durumu
    const [categories, setCategories] = useState<ScenarioCategory[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedLength, setSelectedLength] = useState<string>('medium');
    const [selectedLevel, setSelectedLevel] = useState<string>('B1');
    const [situation, setSituation] = useState<string>('');
    const [goal, setGoal] = useState<string>('');
    const [setting, setSetting] = useState<string>('');

    // Roller
    const [roles, setRoles] = useState<Role[]>([
        { id: 'role_1', title: '', title_en: '', voice: 'onyx' },
        { id: 'role_2', title: '', title_en: '', voice: 'nova' }
    ]);

    // Sonuç
    const [generatedContent, setGeneratedContent] = useState<any>(null);
    const [dialogueTurns, setDialogueTurns] = useState<DialogueTurn[]>([]);

    // Yükleme durumları
    const [loading, setLoading] = useState(false);
    const [generatingAudio, setGeneratingAudio] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);

    // Kategorileri yükle
    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/sectors/scenario-categories`
            );
            const data = await response.json();
            if (data.success) {
                setCategories(data.categories);
            }
        } catch (error) {
            console.error('Failed to fetch categories:', error);
            // Fallback kategoriler
            setCategories([
                { id: 'crisis_management', name_tr: 'Kriz Yönetimi', name_en: 'Crisis Management' },
                { id: 'negotiation', name_tr: 'Müzakere', name_en: 'Negotiation' },
                { id: 'meeting', name_tr: 'Toplantı', name_en: 'Meeting' },
                { id: 'customer_service', name_tr: 'Müşteri Hizmetleri', name_en: 'Customer Service' },
                { id: 'feedback', name_tr: 'Geri Bildirim', name_en: 'Feedback' },
            ]);
        }
    };

    const updateRole = (index: number, field: keyof Role, value: string) => {
        const newRoles = [...roles];
        newRoles[index] = { ...newRoles[index], [field]: value };
        setRoles(newRoles);
    };

    const handleGenerateScenario = async () => {
        if (!selectedCategory || !situation || !roles[0].title || !roles[1].title) {
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/sectors/roleplay/create`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        sector_id: sectorId,
                        scenario_category: selectedCategory,
                        cefr_level: selectedLevel,
                        length: selectedLength,
                        context: {
                            situation,
                            goal: goal || undefined,
                            setting: setting || undefined
                        },
                        roles: roles.map(r => ({
                            id: r.id,
                            title: r.title,
                            title_en: r.title_en || r.title,
                            voice: r.voice
                        }))
                    })
                }
            );

            const data = await response.json();

            if (data.success) {
                setGeneratedContent(data.content);
                setDialogueTurns(data.dialogue?.turns || data.content?.dialogue_data?.dialogue_turns || []);
                setStep(4); // Sonuç adımına geç
                onContentCreated?.(data.content);
            } else {
                throw new Error(data.error || 'Senaryo oluşturulamadı');
            }
        } catch (error: any) {
            console.error('Failed to generate scenario:', error);
            alert(`Senaryo oluşturulurken bir hata oluştu: ${error.message || 'Bilinmeyen hata'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateAudio = async () => {
        if (!generatedContent?.id) return;

        setGeneratingAudio(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/sectors/roleplay/${generatedContent.id}/audio`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        voice_role_1: roles[0].voice,
                        voice_role_2: roles[1].voice,
                        speed: 0.9
                    })
                }
            );

            const data = await response.json();

            if (data.success && data.audioUrl) {
                setAudioUrl(data.audioUrl);
                const audio = new Audio(data.audioUrl);
                setAudioRef(audio);
            } else {
                throw new Error(data.error || 'Ses oluşturulamadı');
            }
        } catch (error: any) {
            console.error('Failed to generate audio:', error);
            alert(`Ses oluşturulurken bir hata oluştu: ${error.message || 'Bilinmeyen hata'}`);
        } finally {
            setGeneratingAudio(false);
        }
    };

    const toggleAudio = () => {
        if (!audioRef) return;

        if (isPlaying) {
            audioRef.pause();
        } else {
            audioRef.play();
        }
        setIsPlaying(!isPlaying);
    };

    const canProceed = () => {
        switch (step) {
            case 1:
                return !!selectedCategory;
            case 2:
                return !!situation && roles[0].title && roles[1].title;
            case 3:
                return true; // Ses ayarları opsiyonel
            default:
                return true;
        }
    };

    // Adım bileşenleri
    const renderStep1 = () => (
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Senaryo Kategorisi
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {categories.map((cat) => (
                        <motion.button
                            key={cat.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`
                                p-4 rounded-xl border-2 text-left transition-all
                                ${selectedCategory === cat.id
                                    ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-teal-300'
                                }
                            `}
                        >
                            <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                                {cat.name_tr}
                            </span>
                            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {cat.name_en}
                            </span>
                        </motion.button>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Senaryo Uzunluğu
                </label>
                <div className="flex gap-3">
                    {LENGTH_OPTIONS.map((length) => (
                        <motion.button
                            key={length.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedLength(length.id)}
                            className={`
                                flex-1 p-4 rounded-xl border-2 text-center transition-all
                                ${selectedLength === length.id
                                    ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-teal-300'
                                }
                            `}
                        >
                            <span className="text-2xl mb-1 block">{length.icon}</span>
                            <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                                {length.name}
                            </span>
                            <span className="block text-xs text-gray-500 dark:text-gray-400">
                                {length.description}
                            </span>
                        </motion.button>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    CEFR Seviyesi
                </label>
                <div className="flex gap-2 flex-wrap">
                    {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((level) => (
                        <button
                            key={level}
                            onClick={() => setSelectedLevel(level)}
                            className={`
                                px-4 py-2 rounded-lg font-medium text-sm transition-all
                                ${selectedLevel === level
                                    ? 'bg-teal-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }
                            `}
                        >
                            {level}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Senaryo Durumu *
                </label>
                <textarea
                    value={situation}
                    onChange={(e) => setSituation(e.target.value)}
                    placeholder="Örn: Sevkiyat 3 gün gecikti ve müşteri şikayet etti. Durumu çözmek için görüşme yapılacak."
                    className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                    rows={3}
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Hedef (Opsiyonel)
                    </label>
                    <input
                        type="text"
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        placeholder="Örn: Sorunu çözmek ve müşteriyi memnun etmek"
                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Ortam (Opsiyonel)
                    </label>
                    <input
                        type="text"
                        value={setting}
                        onChange={(e) => setSetting(e.target.value)}
                        placeholder="Örn: Ofis telefon görüşmesi"
                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                    />
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Roller
                </h4>

                {roles.map((role, index) => (
                    <div
                        key={role.id}
                        className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold
                                ${index === 0 ? 'bg-blue-500' : 'bg-purple-500'}
                            `}>
                                {index + 1}
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white">
                                Rol {index + 1}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                                type="text"
                                value={role.title}
                                onChange={(e) => updateRole(index, 'title', e.target.value)}
                                placeholder={`Örn: ${index === 0 ? 'Lojistik Direktörü' : 'Depo Yöneticisi'}`}
                                className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                            <input
                                type="text"
                                value={role.title_en}
                                onChange={(e) => updateRole(index, 'title_en', e.target.value)}
                                placeholder="İngilizce karşılığı (opsiyonel)"
                                className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Mic className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Ses Ayarları
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Her rol için farklı bir ses seçebilirsiniz
                </p>
            </div>

            {roles.map((role, index) => (
                <div key={role.id} className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold
                            ${index === 0 ? 'bg-blue-500' : 'bg-purple-500'}
                        `}>
                            {index + 1}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                            {role.title || `Rol ${index + 1}`}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {VOICE_OPTIONS.map((voice) => (
                            <button
                                key={voice.id}
                                onClick={() => updateRole(index, 'voice', voice.id)}
                                className={`
                                    p-3 rounded-lg border-2 text-left transition-all
                                    ${role.voice === voice.id
                                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-teal-300'
                                    }
                                `}
                            >
                                <div className="flex items-center gap-2">
                                    <Volume2 className={`w-4 h-4 ${role.voice === voice.id ? 'text-teal-600' : 'text-gray-400'}`} />
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {voice.name}
                                    </span>
                                </div>
                                <span className="text-xs text-gray-500 dark:text-gray-400 block mt-1">
                                    {voice.description}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );

    const renderStep4 = () => (
        <div className="space-y-6">
            {/* Başarı başlığı */}
            <div className="text-center">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                    <Check className="w-10 h-10 text-white" />
                </motion.div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Senaryo Hazır! 🎉
                </h3>
            </div>

            {/* Diyalog önizleme */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 max-h-80 overflow-y-auto">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Diyalog Önizlemesi
                </h4>

                <div className="space-y-3">
                    {dialogueTurns.map((turn, index) => {
                        const isRole1 = turn.role_id === 'role_1';
                        return (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: isRole1 ? -20 : 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={`flex ${isRole1 ? 'justify-start' : 'justify-end'}`}
                            >
                                <div className={`
                                    max-w-[80%] p-3 rounded-2xl
                                    ${isRole1
                                        ? 'bg-blue-100 dark:bg-blue-900/40 rounded-tl-sm'
                                        : 'bg-purple-100 dark:bg-purple-900/40 rounded-tr-sm'
                                    }
                                `}>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">
                                        {turn.speaker}
                                    </p>
                                    <p className="text-sm text-gray-900 dark:text-white font-medium">
                                        {turn.english}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                                        {turn.turkish}
                                    </p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Audio kontrolleri */}
            <div className="flex flex-col items-center gap-4">
                {!audioUrl ? (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleGenerateAudio}
                        disabled={generatingAudio}
                        className="w-full py-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {generatingAudio ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Ses Oluşturuluyor...
                            </>
                        ) : (
                            <>
                                <Mic className="w-5 h-5" />
                                Sesli Versiyon Oluştur
                            </>
                        )}
                    </motion.button>
                ) : (
                    <div className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 rounded-xl border border-teal-200 dark:border-teal-800">
                        <button
                            onClick={toggleAudio}
                            className="w-14 h-14 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white shadow-lg"
                        >
                            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                        </button>

                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                Sesli Senaryo
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {isPlaying ? 'Çalıyor...' : 'Dinlemek için oynat'}
                            </p>
                        </div>

                        <a
                            href={audioUrl}
                            download
                            className="p-2 hover:bg-teal-100 dark:hover:bg-teal-900/50 rounded-lg transition-colors"
                        >
                            <Download className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                        </a>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-white dark:bg-gray-900 rounded-3xl shadow-2xl"
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-teal-500/5 to-cyan-500/5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-teal-500" />
                                İş Senaryosu Oluştur
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {sectorName} sektörü için
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                        >
                            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Progress bar */}
                    {step < 4 && (
                        <div className="mt-4 flex gap-2">
                            {[1, 2, 3].map((s) => (
                                <div
                                    key={s}
                                    className={`flex-1 h-1.5 rounded-full transition-all ${s <= step ? 'bg-teal-500' : 'bg-gray-200 dark:bg-gray-700'
                                        }`}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {step === 1 && renderStep1()}
                            {step === 2 && renderStep2()}
                            {step === 3 && renderStep3()}
                            {step === 4 && renderStep4()}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer */}
                {step < 4 && (
                    <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-between">
                        <button
                            onClick={() => setStep(Math.max(1, step - 1))}
                            disabled={step === 1}
                            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Geri
                        </button>

                        {step < 3 ? (
                            <button
                                onClick={() => setStep(step + 1)}
                                disabled={!canProceed()}
                                className="flex items-center gap-2 px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                İleri
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={handleGenerateScenario}
                                disabled={loading || !canProceed()}
                                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-semibold disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Oluşturuluyor...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4" />
                                        Senaryo Oluştur
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                )}

                {/* Step 4 footer */}
                {step === 4 && (
                    <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-between">
                        <button
                            onClick={() => {
                                setStep(1);
                                setGeneratedContent(null);
                                setDialogueTurns([]);
                                setAudioUrl(null);
                            }}
                            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Yeni Senaryo
                        </button>

                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium"
                        >
                            Tamam
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
