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

interface SectorSelectorProps {
    selectedSectors: number[];
    onSelectionChange: (sectors: number[]) => void;
    maxSelections?: number;
    isRequired?: boolean;
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
    isRequired = false
}) => {
    const [sectors, setSectors] = useState<Sector[]>(FALLBACK_SECTORS);
    const [isLoading, setIsLoading] = useState(true);

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

            {/* Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {sectors.map((sector) => {
                    const isSelected = selectedSectors.includes(sector.id);
                    const primaryLabel = getPrimaryLabel(sector.id);
                    const isDisabled = !isSelected && selectedSectors.length >= maxSelections;

                    return (
                        <button
                            key={sector.id}
                            onClick={() => handleSectorClick(sector.id)}
                            disabled={isDisabled}
                            className={`
                                relative p-4 rounded-xl border-2 text-left transition-all duration-200
                                ${isSelected
                                    ? 'bg-teal-50 border-teal-500 shadow-md scale-[1.02]'
                                    : isDisabled
                                        ? 'bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed'
                                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                                }
                            `}
                        >
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
        </div>
    );
};

export default SectorSelector;
