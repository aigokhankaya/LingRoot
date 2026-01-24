'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Briefcase,
    Plus,
    Trash2,
    Edit2,
    Star,
    Check,
    X,
    Building2,
    Calendar,
    Loader2
} from 'lucide-react';

// Sektör ikonları
const SECTOR_ICONS: Record<string, string> = {
    'it_software': '💻',
    'finance': '💰',
    'tourism': '✈️',
    'logistics': '🚚',
    'healthcare': '🏥',
    'medical_tourism': '🩺',
    'legal': '⚖️',
    'automotive': '🚗',
    'marketing': '📢',
    'engineering': '⚙️',
    'retail': '🛒',
    'education': '📚',
    'hr': '👥',
    'real_estate': '🏢',
    'aviation': '✈️',
    'manufacturing': '🏭'
};

// Şirket büyüklükleri
const COMPANY_SIZES = [
    { value: 'startup', label: 'Startup (1-10)', icon: '🚀' },
    { value: 'small', label: 'Küçük (11-50)', icon: '🏠' },
    { value: 'medium', label: 'Orta (51-250)', icon: '🏢' },
    { value: 'large', label: 'Büyük (251-1000)', icon: '🏛️' },
    { value: 'enterprise', label: 'Kurumsal (1000+)', icon: '🌐' }
];

interface Sector {
    id: number;
    code: string;
    name_tr: string;
    name_en: string;
    icon?: string;
    color?: string;
}

interface UserSector {
    sector_id: number;
    sector_code?: string;
    sector_name?: string;
    sector_name_en?: string;
    sector_icon?: string;
    sector_color?: string;
    job_position?: string;
    job_position_en?: string;
    years_experience?: number;
    company_name?: string;
    company_size?: string;
    is_primary: boolean;
    proficiency_level?: string;
    progress_percentage?: number;
}

interface PositionTemplate {
    id: number;
    position_tr: string;
    position_en: string;
    level: string;
}

interface SectorPositionManagerProps {
    userId?: string;
    onUpdate?: () => void;
}

export default function SectorPositionManager({ userId, onUpdate }: SectorPositionManagerProps) {
    const [userSectors, setUserSectors] = useState<UserSector[]>([]);
    const [allSectors, setAllSectors] = useState<Sector[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Modal durumları
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingSector, setEditingSector] = useState<UserSector | null>(null);

    // Form durumları
    const [selectedSector, setSelectedSector] = useState<number | null>(null);
    const [jobPosition, setJobPosition] = useState('');
    const [jobPositionEn, setJobPositionEn] = useState('');
    const [yearsExperience, setYearsExperience] = useState(0);
    const [companyName, setCompanyName] = useState('');
    const [companySize, setCompanySize] = useState('');
    const [isPrimary, setIsPrimary] = useState(false);
    const [positionTemplates, setPositionTemplates] = useState<PositionTemplate[]>([]);

    // Verileri yükle
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

            // Kullanıcının sektörlerini al
            const userSectorsRes = await fetch(`${apiUrl}/api/sectors/user-sectors`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (userSectorsRes.ok) {
                const data = await userSectorsRes.json();
                setUserSectors(data.data || []);
            }

            // Tüm sektörleri al
            const allSectorsRes = await fetch(`${apiUrl}/api/sectors`);
            if (allSectorsRes.ok) {
                const data = await allSectorsRes.json();
                setAllSectors(data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch sectors:', error);
        } finally {
            setLoading(false);
        }
    };

    // Pozisyon şablonlarını yükle
    const loadPositionTemplates = async (sectorId: number) => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
            const res = await fetch(`${apiUrl}/api/sectors/position-templates/${sectorId}`);
            if (res.ok) {
                const data = await res.json();
                setPositionTemplates(data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch position templates:', error);
        }
    };

    const handleSectorSelect = (sectorId: number) => {
        setSelectedSector(sectorId);
        loadPositionTemplates(sectorId);
    };

    const handleTemplateSelect = (template: PositionTemplate) => {
        setJobPosition(template.position_tr);
        setJobPositionEn(template.position_en);
    };

    const resetForm = () => {
        setSelectedSector(null);
        setJobPosition('');
        setJobPositionEn('');
        setYearsExperience(0);
        setCompanyName('');
        setCompanySize('');
        setIsPrimary(false);
        setPositionTemplates([]);
        setEditingSector(null);
    };

    const handleSave = async () => {
        if (!selectedSector && !editingSector) return;

        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

            const body = {
                sector_id: selectedSector || editingSector?.sector_id,
                is_primary: isPrimary,
                job_position: jobPosition,
                job_position_en: jobPositionEn,
                years_experience: yearsExperience,
                company_name: companyName,
                company_size: companySize
            };

            const res = await fetch(`${apiUrl}/api/sectors/user-sectors`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                await fetchData();
                setShowAddModal(false);
                resetForm();
                onUpdate?.();
            } else {
                const error = await res.json();
                alert(error.error || 'Kaydetme başarısız');
            }
        } catch (error) {
            console.error('Failed to save sector:', error);
            alert('Bir hata oluştu');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (sectorId: number) => {
        if (!confirm('Bu sektörü kaldırmak istediğinize emin misiniz?')) return;

        try {
            const token = localStorage.getItem('token');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

            await fetch(`${apiUrl}/api/sectors/user-sectors/${sectorId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            await fetchData();
            onUpdate?.();
        } catch (error) {
            console.error('Failed to delete sector:', error);
        }
    };

    const handleEdit = (sector: UserSector) => {
        setEditingSector(sector);
        setSelectedSector(sector.sector_id);
        setJobPosition(sector.job_position || '');
        setJobPositionEn(sector.job_position_en || '');
        setYearsExperience(sector.years_experience || 0);
        setCompanyName(sector.company_name || '');
        setCompanySize(sector.company_size || '');
        setIsPrimary(sector.is_primary);
        loadPositionTemplates(sector.sector_id);
        setShowAddModal(true);
    };

    // Henüz eklenmemiş sektörler
    const availableSectors = allSectors.filter(
        s => !userSectors.some(us => us.sector_id === s.id)
    );

    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Sektörlerim</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            İş pozisyonunuza göre içerikler kişiselleştirilir
                        </p>
                    </div>
                </div>

                {availableSectors.length > 0 && (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                            resetForm();
                            setShowAddModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Sektör Ekle
                    </motion.button>
                )}
            </div>

            {/* Sektör Listesi */}
            {userSectors.length === 0 ? (
                <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Briefcase className="w-8 h-8 text-gray-400" />
                    </div>
                    <h4 className="text-gray-900 dark:text-white font-medium mb-2">
                        Henüz sektör eklenmemiş
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Çalıştığınız sektörü ekleyerek içerikleri kişiselleştirin
                    </p>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-6 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-sm font-medium"
                    >
                        İlk Sektörünüzü Ekleyin
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {userSectors.map((sector) => (
                        <motion.div
                            key={sector.sector_id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`
                                relative p-4 rounded-xl border-2 transition-all
                                ${sector.is_primary
                                    ? 'border-teal-300 dark:border-teal-600 bg-teal-50 dark:bg-teal-900/20'
                                    : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                                }
                            `}
                        >
                            {sector.is_primary && (
                                <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-teal-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                                    <Star className="w-3 h-3" />
                                    Ana
                                </div>
                            )}

                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                    <div className="text-2xl">
                                        {SECTOR_ICONS[sector.sector_code || ''] || '🏢'}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 dark:text-white">
                                            {sector.sector_name}
                                        </h4>
                                        {sector.job_position && (
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-sm text-teal-600 dark:text-teal-400 font-medium">
                                                    📌 {sector.job_position}
                                                </span>
                                                {sector.years_experience && sector.years_experience > 0 && (
                                                    <span className="text-xs text-gray-400">
                                                        • {sector.years_experience} yıl
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        {sector.company_name && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                                                <Building2 className="w-3 h-3" />
                                                {sector.company_name}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleEdit(sector)}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    >
                                        <Edit2 className="w-4 h-4 text-gray-500" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(sector.sector_id)}
                                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => {
                                setShowAddModal(false);
                                resetForm();
                            }}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                        {editingSector ? 'Sektör Düzenle' : 'Sektör Ekle'}
                                    </h3>
                                    <button
                                        onClick={() => {
                                            setShowAddModal(false);
                                            resetForm();
                                        }}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                                    >
                                        <X className="w-5 h-5 text-gray-500" />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-5">
                                {/* Sektör Seçimi */}
                                {!editingSector && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Sektör *
                                        </label>
                                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                                            {availableSectors.map((sector) => (
                                                <button
                                                    key={sector.id}
                                                    onClick={() => handleSectorSelect(sector.id)}
                                                    className={`
                                                        p-3 rounded-lg border-2 text-left transition-all text-sm
                                                        ${selectedSector === sector.id
                                                            ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30'
                                                            : 'border-gray-200 dark:border-gray-700 hover:border-teal-300'
                                                        }
                                                    `}
                                                >
                                                    <span className="mr-2">{SECTOR_ICONS[sector.code] || '🏢'}</span>
                                                    {sector.name_tr}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Pozisyon Şablonları */}
                                {positionTemplates.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Önerilen Pozisyonlar
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {positionTemplates.map((template) => (
                                                <button
                                                    key={template.id}
                                                    onClick={() => handleTemplateSelect(template)}
                                                    className={`
                                                        px-3 py-1.5 rounded-full text-xs font-medium transition-all
                                                        ${jobPosition === template.position_tr
                                                            ? 'bg-teal-500 text-white'
                                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-teal-100'
                                                        }
                                                    `}
                                                >
                                                    {template.position_tr}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Pozisyon Girişi */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Pozisyon (Türkçe) *
                                        </label>
                                        <input
                                            type="text"
                                            value={jobPosition}
                                            onChange={(e) => setJobPosition(e.target.value)}
                                            placeholder="Örn: Lojistik Direktörü"
                                            className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Pozisyon (İngilizce)
                                        </label>
                                        <input
                                            type="text"
                                            value={jobPositionEn}
                                            onChange={(e) => setJobPositionEn(e.target.value)}
                                            placeholder="Örn: Logistics Director"
                                            className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                {/* Deneyim Yılı */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        <Calendar className="w-4 h-4 inline mr-1" />
                                        Deneyim (yıl)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="50"
                                        value={yearsExperience}
                                        onChange={(e) => setYearsExperience(parseInt(e.target.value) || 0)}
                                        className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    />
                                </div>

                                {/* Şirket Bilgileri */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Şirket Adı (opsiyonel)
                                        </label>
                                        <input
                                            type="text"
                                            value={companyName}
                                            onChange={(e) => setCompanyName(e.target.value)}
                                            placeholder="Örn: ABC Lojistik"
                                            className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Şirket Büyüklüğü
                                        </label>
                                        <select
                                            value={companySize}
                                            onChange={(e) => setCompanySize(e.target.value)}
                                            className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                        >
                                            <option value="">Seçiniz</option>
                                            {COMPANY_SIZES.map((size) => (
                                                <option key={size.value} value={size.value}>
                                                    {size.icon} {size.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Ana Sektör */}
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                    <input
                                        type="checkbox"
                                        id="isPrimary"
                                        checked={isPrimary}
                                        onChange={(e) => setIsPrimary(e.target.checked)}
                                        className="w-5 h-5 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                                    />
                                    <label htmlFor="isPrimary" className="text-sm text-gray-700 dark:text-gray-300">
                                        <strong>Ana sektörüm</strong> - İçerikler bu sektöre göre kişiselleştirilsin
                                    </label>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setShowAddModal(false);
                                        resetForm();
                                    }}
                                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving || (!selectedSector && !editingSector) || !jobPosition}
                                    className="px-6 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Kaydediliyor...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4" />
                                            Kaydet
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
