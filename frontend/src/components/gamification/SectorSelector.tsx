/**
 * 🏢 Sector Selector Component
 * 
 * Onboarding akışında kullanılan sektör seçim bileşeni.
 * Kullanıcı en fazla 3 sektör seçebilir, ilk seçilen primary olur.
 */

import React, { useState, useEffect } from 'react';

interface Sector {
    id: number;
    code: string;
    name_tr: string;
    name_en: string;
    description_tr?: string;
    icon: string;
    color: string;
}

interface PositionInfo {
    jobPosition: string;
    jobPositionEn?: string;
    yearsExperience?: number;
    companyName?: string;
    companySize?: string;
}

interface SectorSelectorProps {
    selectedSectors: number[];
    onSelectionChange: (sectors: number[]) => void;
    maxSelections?: number;
    isRequired?: boolean;
    showPositionForm?: boolean;           // Pozisyon formu gösterilsin mi?
    positionInfo?: PositionInfo;
    onPositionChange?: (info: PositionInfo) => void;
    suggestedSectorCodes?: string[];      // Önerilen sektör kodları (arketipe göre)
    archetypeCode?: string;               // Kullanıcının arketipi
}


const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

// FontAwesome icon isimlerinden emoji'ye mapping
const ICON_MAP: Record<string, string> = {
    'code': '💻',
    'chart-line': '💰',
    'plane': '✈️',
    'truck': '🚛',
    'heart-pulse': '🏥',
    'stethoscope': '🏥',
    'scale': '⚖️',
    'car': '🚗',
    'megaphone': '📱',
    'wrench': '⚙️',
    'shopping-cart': '🛒',
    'graduation-cap': '📚',
    'users': '👥',
    'building': '🏠',
    'plane-departure': '✈️',
    'industry': '🏭',
};

// Icon'u emoji'ye dönüştür (fallback: orijinal değer)
const getEmojiIcon = (icon: string): string => {
    return ICON_MAP[icon] || icon || '📋';
};

// Fallback sektörler (API çalışmazsa)
const FALLBACK_SECTORS: Sector[] = [
    { id: 1, code: 'it_software', name_tr: 'Bilişim & Yazılım', name_en: 'IT & Software', icon: '💻', color: '#3B82F6' },
    { id: 2, code: 'finance', name_tr: 'Finans & Bankacılık', name_en: 'Finance & Banking', icon: '💰', color: '#10B981' },
    { id: 3, code: 'tourism', name_tr: 'Turizm & Otelcilik', name_en: 'Tourism & Hospitality', icon: '✈️', color: '#F59E0B' },
    { id: 4, code: 'healthcare', name_tr: 'Sağlık', name_en: 'Healthcare', icon: '🏥', color: '#EF4444' },
    { id: 5, code: 'logistics', name_tr: 'Lojistik & Ticaret', name_en: 'Logistics & Trade', icon: '🚛', color: '#8B5CF6' },
    { id: 6, code: 'marketing', name_tr: 'Pazarlama & Dijital', name_en: 'Marketing & Digital', icon: '📱', color: '#EC4899' },
    { id: 7, code: 'engineering', name_tr: 'Mühendislik', name_en: 'Engineering', icon: '⚙️', color: '#6B7280' },
    { id: 8, code: 'legal', name_tr: 'Hukuk', name_en: 'Legal', icon: '⚖️', color: '#1F2937' },
    { id: 9, code: 'hr', name_tr: 'İnsan Kaynakları', name_en: 'Human Resources', icon: '👥', color: '#14B8A6' },
    { id: 10, code: 'retail', name_tr: 'Perakende & Satış', name_en: 'Retail & Sales', icon: '🛒', color: '#F97316' },
    { id: 11, code: 'education', name_tr: 'Eğitim', name_en: 'Education', icon: '📚', color: '#6366F1' },
    { id: 12, code: 'real_estate', name_tr: 'Gayrimenkul', name_en: 'Real Estate', icon: '🏠', color: '#84CC16' },
];

export const SectorSelector: React.FC<SectorSelectorProps> = ({
    selectedSectors,
    onSelectionChange,
    maxSelections = 3,
    isRequired = false,
    showPositionForm = false,
    positionInfo,
    onPositionChange,
    suggestedSectorCodes = [],
    archetypeCode
}) => {
    const [sectors, setSectors] = useState<Sector[]>(FALLBACK_SECTORS);
    const [isLoading, setIsLoading] = useState(true);
    const [localPosition, setLocalPosition] = useState<PositionInfo>(positionInfo || {
        jobPosition: '',
        yearsExperience: undefined,
        companyName: '',
        companySize: ''
    });

    // Sektörleri sırala: Önerilen sektörler önce
    const sortedSectors = React.useMemo(() => {
        if (suggestedSectorCodes.length === 0) return sectors;

        const suggested = sectors.filter(s => suggestedSectorCodes.includes(s.code));
        const others = sectors.filter(s => !suggestedSectorCodes.includes(s.code));
        return [...suggested, ...others];
    }, [sectors, suggestedSectorCodes]);

    // Sektör önerildi mi?
    const isSuggested = (code: string): boolean => suggestedSectorCodes.includes(code);


    useEffect(() => {
        fetchSectors();
    }, []);

    const fetchSectors = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/sectors`);
            const data = await response.json();

            if (data.success && Array.isArray(data.data) && data.data.length > 0) {
                // Icon'ları emoji'ye dönüştür
                const mappedSectors = data.data.map((sector: Sector) => ({
                    ...sector,
                    icon: getEmojiIcon(sector.icon)
                }));
                setSectors(mappedSectors);
            }
        } catch (error) {
            console.warn('Sectors API failed, using fallback:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSectorClick = (sectorId: number) => {
        const isSelected = selectedSectors.includes(sectorId);

        if (isSelected) {
            // Seçimi kaldır
            onSelectionChange(selectedSectors.filter(id => id !== sectorId));
        } else if (selectedSectors.length < maxSelections) {
            // Yeni seçim ekle
            onSelectionChange([...selectedSectors, sectorId]);
        }
    };

    const getPrimaryLabel = (sectorId: number): string | null => {
        if (selectedSectors[0] === sectorId) {
            return 'Ana Sektör';
        }
        return null;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Header */}
            <div className="text-center mb-6">
                <p className="text-sm text-slate-500">
                    {isRequired ? 'En az 1 sektör seçmelisin' : 'İstersen sektör seçebilirsin'}
                    {maxSelections > 1 && ` (en fazla ${maxSelections})`}
                </p>
            </div>

            {/* Önerilen Sektörler Başlığı */}
            {suggestedSectorCodes.length > 0 && (
                <div className="mb-4">
                    <p className="text-sm font-semibold text-teal-600 flex items-center gap-2">
                        <span>✨</span>
                        Senin için önerilen sektörler
                    </p>
                </div>
            )}

            {/* Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {sortedSectors.map((sector, index) => {
                    const isSelected = selectedSectors.includes(sector.id);
                    const primaryLabel = getPrimaryLabel(sector.id);
                    const isDisabled = !isSelected && selectedSectors.length >= maxSelections;
                    const suggested = isSuggested(sector.code);

                    // Önerilen sektörlerden sonra diğerlerine geçişte ayraç göster
                    const showDivider = suggestedSectorCodes.length > 0 &&
                        index === suggestedSectorCodes.length &&
                        !suggested;

                    return (
                        <React.Fragment key={sector.id}>
                            {showDivider && (
                                <div className="col-span-full my-2 flex items-center gap-2">
                                    <div className="flex-1 h-px bg-slate-200" />
                                    <span className="text-xs text-slate-400">Diğer sektörler</span>
                                    <div className="flex-1 h-px bg-slate-200" />
                                </div>
                            )}
                            <button
                                onClick={() => handleSectorClick(sector.id)}
                                disabled={isDisabled}
                                className={`
                                    relative p-4 rounded-xl border-2 text-left transition-all duration-200
                                    ${isSelected
                                        ? 'bg-teal-50 border-teal-500 shadow-md scale-[1.02]'
                                        : isDisabled
                                            ? 'bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed'
                                            : suggested
                                                ? 'bg-gradient-to-br from-teal-50/50 to-emerald-50/50 border-teal-200 hover:border-teal-400 hover:shadow-md'
                                                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                                    }
                                `}
                            >
                                {/* Suggested Badge */}
                                {suggested && !isSelected && (
                                    <span className="absolute -top-2 -left-2 px-2 py-0.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-[10px] font-bold rounded-full shadow-sm">
                                        ✨ Önerilen
                                    </span>
                                )}

                                {/* Primary Badge */}
                                {primaryLabel && (
                                    <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-teal-500 text-white text-xs font-bold rounded-full">
                                        ★
                                    </span>
                                )}

                                {/* Icon */}
                                <div className="text-3xl mb-2">{sector.icon}</div>

                                {/* Name */}
                                <h4 className={`text-sm font-semibold ${isSelected ? 'text-teal-700' : 'text-slate-700'}`}>
                                    {sector.name_tr}
                                </h4>

                                {/* Checkmark */}
                                {isSelected && (
                                    <div className="absolute bottom-2 right-2 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center">
                                        <span className="text-white text-xs">✓</span>
                                    </div>
                                )}
                            </button>
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Selection Summary */}
            {selectedSectors.length > 0 && (
                <div className="mt-6 p-4 bg-slate-50 rounded-xl">
                    <p className="text-sm text-slate-600">
                        <span className="font-semibold">{selectedSectors.length}</span> sektör seçildi
                        {selectedSectors.length > 0 && (
                            <span className="text-teal-600 ml-1">
                                (İlk seçtiğin ana sektörün olacak)
                            </span>
                        )}
                    </p>
                </div>
            )}

            {/* Position Form (Onboarding Mode) */}
            {showPositionForm && selectedSectors.length > 0 && (
                <div className="mt-6 p-5 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl border border-teal-100">
                    <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        💼 Pozisyon Bilgisi
                        <span className="text-xs font-normal text-slate-500">(opsiyonel)</span>
                    </h4>

                    <div className="space-y-4">
                        {/* Job Position */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Pozisyonun / Ünvanın
                            </label>
                            <input
                                type="text"
                                placeholder="örn: Software Developer, Marketing Manager..."
                                value={localPosition.jobPosition}
                                onChange={(e) => {
                                    const updated = { ...localPosition, jobPosition: e.target.value };
                                    setLocalPosition(updated);
                                    onPositionChange?.(updated);
                                }}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                            />
                        </div>

                        {/* Years Experience */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Bu sektördeki deneyimin
                            </label>
                            <div className="flex gap-2 flex-wrap">
                                {['0-1 yıl', '1-3 yıl', '3-5 yıl', '5-10 yıl', '10+ yıl'].map((exp, idx) => {
                                    const yearsMap = [0, 2, 4, 7, 12];
                                    const isSelected = localPosition.yearsExperience === yearsMap[idx];
                                    return (
                                        <button
                                            key={exp}
                                            type="button"
                                            onClick={() => {
                                                const updated = { ...localPosition, yearsExperience: yearsMap[idx] };
                                                setLocalPosition(updated);
                                                onPositionChange?.(updated);
                                            }}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isSelected
                                                    ? 'bg-teal-500 text-white shadow-md'
                                                    : 'bg-white text-slate-600 border border-slate-200 hover:border-teal-300'
                                                }`}
                                        >
                                            {exp}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Company Name (Optional) */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Şirket <span className="text-slate-400 font-normal">(opsiyonel)</span>
                            </label>
                            <input
                                type="text"
                                placeholder="örn: Google, Türk Telekom..."
                                value={localPosition.companyName || ''}
                                onChange={(e) => {
                                    const updated = { ...localPosition, companyName: e.target.value };
                                    setLocalPosition(updated);
                                    onPositionChange?.(updated);
                                }}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                            />
                        </div>
                    </div>

                    <p className="mt-4 text-xs text-slate-500 leading-relaxed">
                        💡 Bu bilgiler sana özel içerikler oluşturmamızı sağlar. İstersen bu formu boş bırakabilirsin.
                    </p>
                </div>
            )}
        </div>
    );
};

export default SectorSelector;
