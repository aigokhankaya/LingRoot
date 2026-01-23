/**
 * 🏢 Sector Management Admin Dashboard
 * 
 * Admin panel için sektör, içerik ve terminoloji yönetimi.
 * NotebookLM'den JSON import desteği dahil.
 */

import React, { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';

// Types
interface Sector {
    id: number;
    code: string;
    name_tr: string;
    name_en: string;
    description_tr?: string;
    description_en?: string;
    icon?: string;
    color?: string;
    is_active: boolean;
    sort_order: number;
    content_count: number;
    vocabulary_count: number;
}

interface SectorContent {
    id: string;
    sector_id: number;
    content_type: string;
    cefr_level: string;
    title: string;
    title_tr?: string;
    status: string;
    created_at: string;
    read_count: number;
}

interface Vocabulary {
    id: number;
    word: string;
    definition_en: string;
    definition_tr: string;
    cefr_level?: string;
    category?: string;
}

interface ImportResult {
    success: number;
    failed: number;
    errors: Array<{ title?: string; word?: string; error: string }>;
}

// Tab Component
const TabButton: React.FC<{
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}> = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${active
            ? 'bg-teal-600 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
    >
        {children}
    </button>
);

// Main Component
const SectorManagement: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'sectors' | 'content' | 'vocabulary' | 'stats'>('sectors');
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [selectedSectorId, setSelectedSectorId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Fetch sectors
    const fetchSectors = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/sectors');
            if (response.data.success) {
                setSectors(response.data.data);
                if (response.data.data.length > 0 && !selectedSectorId) {
                    setSelectedSectorId(response.data.data[0].id);
                }
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: 'Sektörler yüklenirken hata oluştu' });
        } finally {
            setLoading(false);
        }
    }, [selectedSectorId]);

    useEffect(() => {
        fetchSectors();
    }, [fetchSectors]);

    // Show message with auto-hide
    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 5000);
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">🏢 Sektör İngilizcesi Yönetimi</h1>
                <p className="text-gray-600">Sektörler, içerikler ve terminoloji yönetimi</p>
            </div>

            {/* Message */}
            {message && (
                <div
                    className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                >
                    {message.text}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <TabButton active={activeTab === 'sectors'} onClick={() => setActiveTab('sectors')}>
                    📁 Sektörler
                </TabButton>
                <TabButton active={activeTab === 'content'} onClick={() => setActiveTab('content')}>
                    📄 İçerik Yönetimi
                </TabButton>
                <TabButton active={activeTab === 'vocabulary'} onClick={() => setActiveTab('vocabulary')}>
                    📚 Terminoloji
                </TabButton>
                <TabButton active={activeTab === 'stats'} onClick={() => setActiveTab('stats')}>
                    📊 İstatistikler
                </TabButton>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-lg shadow p-6">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
                    </div>
                ) : (
                    <>
                        {activeTab === 'sectors' && (
                            <SectorListTab
                                sectors={sectors}
                                onRefresh={fetchSectors}
                                showMessage={showMessage}
                            />
                        )}

                        {activeTab === 'content' && (
                            <ContentManagementTab
                                sectors={sectors}
                                selectedSectorId={selectedSectorId}
                                onSectorChange={setSelectedSectorId}
                                showMessage={showMessage}
                            />
                        )}

                        {activeTab === 'vocabulary' && (
                            <VocabularyTab
                                sectors={sectors}
                                selectedSectorId={selectedSectorId}
                                onSectorChange={setSelectedSectorId}
                                showMessage={showMessage}
                            />
                        )}

                        {activeTab === 'stats' && (
                            <StatsTab sectors={sectors} />
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

// ========================================
// SECTORS TAB
// ========================================
interface SectorListTabProps {
    sectors: Sector[];
    onRefresh: () => void;
    showMessage: (type: 'success' | 'error', text: string) => void;
}

const SectorListTab: React.FC<SectorListTabProps> = ({ sectors, onRefresh, showMessage }) => {
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        code: '',
        name_tr: '',
        name_en: '',
        description_tr: '',
        description_en: '',
        icon: '',
        color: '#3B82F6',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await api.post('/admin/sectors', formData);
            if (response.data.success) {
                showMessage('success', 'Sektör başarıyla oluşturuldu');
                setShowForm(false);
                setFormData({ code: '', name_tr: '', name_en: '', description_tr: '', description_en: '', icon: '', color: '#3B82F6' });
                onRefresh();
            }
        } catch (error: any) {
            showMessage('error', error.response?.data?.error || 'Sektör oluşturulamadı');
        }
    };

    const toggleSectorStatus = async (sectorId: number, currentStatus: boolean) => {
        try {
            await api.put(`/admin/sectors/${sectorId}`, { is_active: !currentStatus });
            showMessage('success', 'Sektör durumu güncellendi');
            onRefresh();
        } catch (error) {
            showMessage('error', 'Güncelleme başarısız');
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Sektör Listesi ({sectors.length})</h2>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                >
                    {showForm ? 'İptal' : '+ Yeni Sektör'}
                </button>
            </div>

            {/* New Sector Form */}
            {showForm && (
                <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Kod *</label>
                            <input
                                type="text"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                className="w-full p-2 border rounded"
                                placeholder="logistics"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Icon</label>
                            <input
                                type="text"
                                value={formData.icon}
                                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                className="w-full p-2 border rounded"
                                placeholder="truck"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Türkçe Ad *</label>
                            <input
                                type="text"
                                value={formData.name_tr}
                                onChange={(e) => setFormData({ ...formData, name_tr: e.target.value })}
                                className="w-full p-2 border rounded"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">İngilizce Ad *</label>
                            <input
                                type="text"
                                value={formData.name_en}
                                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                                className="w-full p-2 border rounded"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Türkçe Açıklama</label>
                            <textarea
                                value={formData.description_tr}
                                onChange={(e) => setFormData({ ...formData, description_tr: e.target.value })}
                                className="w-full p-2 border rounded"
                                rows={2}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">İngilizce Açıklama</label>
                            <textarea
                                value={formData.description_en}
                                onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                                className="w-full p-2 border rounded"
                                rows={2}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Renk</label>
                            <input
                                type="color"
                                value={formData.color}
                                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                className="w-full h-10 p-1 border rounded"
                            />
                        </div>
                    </div>
                    <div className="mt-4">
                        <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700">
                            Kaydet
                        </button>
                    </div>
                </form>
            )}

            {/* Sector Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sectors.map((sector) => (
                    <div
                        key={sector.id}
                        className={`p-4 rounded-lg border-2 ${sector.is_active ? 'border-teal-200 bg-white' : 'border-gray-200 bg-gray-100 opacity-60'
                            }`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg"
                                style={{ backgroundColor: sector.color || '#3B82F6' }}
                            >
                                {sector.icon ? '📦' : sector.code.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="font-semibold">{sector.name_tr}</h3>
                                <p className="text-sm text-gray-500">{sector.code}</p>
                            </div>
                        </div>
                        <div className="text-sm text-gray-600 mb-3">
                            <span className="mr-4">📄 {sector.content_count} içerik</span>
                            <span>📚 {sector.vocabulary_count} kelime</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span
                                className={`px-2 py-1 text-xs rounded ${sector.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
                                    }`}
                            >
                                {sector.is_active ? 'Aktif' : 'Pasif'}
                            </span>
                            <button
                                onClick={() => toggleSectorStatus(sector.id, sector.is_active)}
                                className="text-sm text-teal-600 hover:underline"
                            >
                                {sector.is_active ? 'Pasife Al' : 'Aktifleştir'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ========================================
// CONTENT MANAGEMENT TAB
// ========================================
interface ContentManagementTabProps {
    sectors: Sector[];
    selectedSectorId: number | null;
    onSectorChange: (id: number) => void;
    showMessage: (type: 'success' | 'error', text: string) => void;
}

const ContentManagementTab: React.FC<ContentManagementTabProps> = ({
    sectors,
    selectedSectorId,
    onSectorChange,
    showMessage,
}) => {
    const [contents, setContents] = useState<SectorContent[]>([]);
    const [loading, setLoading] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [jsonInput, setJsonInput] = useState('');
    const [importResult, setImportResult] = useState<ImportResult | null>(null);

    // Fetch content
    useEffect(() => {
        if (selectedSectorId) {
            fetchContent();
        }
    }, [selectedSectorId]);

    const fetchContent = async () => {
        if (!selectedSectorId) return;
        setLoading(true);
        try {
            const response = await api.get(`/admin/sectors/${selectedSectorId}/content?limit=100`);
            if (response.data.success) {
                setContents(response.data.data);
            }
        } catch (error) {
            showMessage('error', 'İçerikler yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async () => {
        if (!selectedSectorId || !jsonInput.trim()) return;

        try {
            const parsed = JSON.parse(jsonInput);
            const items = parsed.items || parsed.sector_content?.items || [parsed.sector_content || parsed];

            const response = await api.post(`/admin/sectors/${selectedSectorId}/content/import`, { items });

            if (response.data.success) {
                setImportResult(response.data.data);
                showMessage('success', response.data.message);
                fetchContent();
            }
        } catch (error: any) {
            if (error instanceof SyntaxError) {
                showMessage('error', 'Geçersiz JSON formatı');
            } else {
                showMessage('error', error.response?.data?.error || 'Import başarısız');
            }
        }
    };

    const updateContentStatus = async (contentId: string, status: string) => {
        try {
            await api.patch(`/admin/content/${contentId}/status`, { status });
            showMessage('success', 'Durum güncellendi');
            fetchContent();
        } catch (error) {
            showMessage('error', 'Güncelleme başarısız');
        }
    };

    return (
        <div>
            {/* Sector Selector */}
            <div className="mb-4 flex gap-4 items-center">
                <label className="font-medium">Sektör:</label>
                <select
                    value={selectedSectorId || ''}
                    onChange={(e) => onSectorChange(Number(e.target.value))}
                    className="p-2 border rounded min-w-[200px]"
                >
                    {sectors.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.name_tr}
                        </option>
                    ))}
                </select>
                <button
                    onClick={() => setImportModalOpen(true)}
                    className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
                >
                    📥 JSON Import
                </button>
            </div>

            {/* Content Table */}
            {loading ? (
                <div className="text-center py-8">Yükleniyor...</div>
            ) : (
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="p-3 text-left border">Başlık</th>
                            <th className="p-3 text-left border">Tür</th>
                            <th className="p-3 text-left border">Seviye</th>
                            <th className="p-3 text-left border">Durum</th>
                            <th className="p-3 text-left border">Görüntülenme</th>
                            <th className="p-3 text-left border">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody>
                        {contents.map((content) => (
                            <tr key={content.id} className="hover:bg-gray-50">
                                <td className="p-3 border">{content.title}</td>
                                <td className="p-3 border">
                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                                        {content.content_type}
                                    </span>
                                </td>
                                <td className="p-3 border">{content.cefr_level}</td>
                                <td className="p-3 border">
                                    <span
                                        className={`px-2 py-1 rounded text-sm ${content.status === 'published'
                                            ? 'bg-green-100 text-green-800'
                                            : content.status === 'draft'
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : 'bg-gray-100 text-gray-800'
                                            }`}
                                    >
                                        {content.status}
                                    </span>
                                </td>
                                <td className="p-3 border">{content.read_count}</td>
                                <td className="p-3 border">
                                    {content.status === 'draft' && (
                                        <button
                                            onClick={() => updateContentStatus(content.id, 'published')}
                                            className="text-green-600 hover:underline mr-2"
                                        >
                                            Yayınla
                                        </button>
                                    )}
                                    {content.status === 'published' && (
                                        <button
                                            onClick={() => updateContentStatus(content.id, 'archived')}
                                            className="text-gray-600 hover:underline"
                                        >
                                            Arşivle
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {contents.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-500">
                    Bu sektörde henüz içerik yok. JSON Import ile ekleyebilirsiniz.
                </div>
            )}

            {/* Import Modal */}
            {importModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-auto">
                        <h3 className="text-xl font-semibold mb-4">📥 NotebookLM JSON Import</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            NotebookLM'den aldığınız JSON içeriği yapıştırın. Format aşağıdaki gibi olmalıdır:
                        </p>
                        <pre className="bg-gray-100 p-3 rounded text-xs mb-4 overflow-auto max-h-32">
                            {`{
  "items": [
    {
      "content_type": "article",
      "cefr_level": "B1",
      "title": "...",
      "original_text": "..."
    }
  ]
}`}
                        </pre>
                        <textarea
                            value={jsonInput}
                            onChange={(e) => setJsonInput(e.target.value)}
                            className="w-full h-64 p-3 border rounded font-mono text-sm"
                            placeholder="JSON yapıştırın..."
                        />

                        {importResult && (
                            <div className="mt-4 p-3 bg-gray-100 rounded">
                                <p className="font-medium">
                                    ✅ {importResult.success} başarılı, ❌ {importResult.failed} başarısız
                                </p>
                                {importResult.errors.length > 0 && (
                                    <ul className="mt-2 text-sm text-red-600">
                                        {importResult.errors.slice(0, 5).map((err, i) => (
                                            <li key={i}>• {err.title || err.word}: {err.error}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}

                        <div className="mt-4 flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setImportModalOpen(false);
                                    setJsonInput('');
                                    setImportResult(null);
                                }}
                                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                            >
                                Kapat
                            </button>
                            <button
                                onClick={handleImport}
                                className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700"
                            >
                                Import Et
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ========================================
// VOCABULARY TAB
// ========================================
interface VocabularyTabProps {
    sectors: Sector[];
    selectedSectorId: number | null;
    onSectorChange: (id: number) => void;
    showMessage: (type: 'success' | 'error', text: string) => void;
}

const VocabularyTab: React.FC<VocabularyTabProps> = ({
    sectors,
    selectedSectorId,
    onSectorChange,
    showMessage,
}) => {
    const [vocabulary, setVocabulary] = useState<Vocabulary[]>([]);
    const [loading, setLoading] = useState(false);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [jsonInput, setJsonInput] = useState('');
    const [importResult, setImportResult] = useState<ImportResult | null>(null);

    useEffect(() => {
        if (selectedSectorId) {
            fetchVocabulary();
        }
    }, [selectedSectorId]);

    const fetchVocabulary = async () => {
        if (!selectedSectorId) return;
        setLoading(true);
        try {
            const response = await api.get(`/admin/sectors/${selectedSectorId}/vocabulary?limit=200`);
            if (response.data.success) {
                setVocabulary(response.data.data);
            }
        } catch (error) {
            showMessage('error', 'Terminoloji yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async () => {
        if (!selectedSectorId || !jsonInput.trim()) return;

        try {
            const parsed = JSON.parse(jsonInput);
            const words = parsed.words || parsed.sector_vocabulary?.words || [parsed];

            const response = await api.post(`/admin/sectors/${selectedSectorId}/vocabulary/import`, { words });

            if (response.data.success) {
                setImportResult(response.data.data);
                showMessage('success', response.data.message);
                fetchVocabulary();
            }
        } catch (error: any) {
            if (error instanceof SyntaxError) {
                showMessage('error', 'Geçersiz JSON formatı');
            } else {
                showMessage('error', error.response?.data?.error || 'Import başarısız');
            }
        }
    };

    return (
        <div>
            {/* Sector Selector */}
            <div className="mb-4 flex gap-4 items-center">
                <label className="font-medium">Sektör:</label>
                <select
                    value={selectedSectorId || ''}
                    onChange={(e) => onSectorChange(Number(e.target.value))}
                    className="p-2 border rounded min-w-[200px]"
                >
                    {sectors.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.name_tr}
                        </option>
                    ))}
                </select>
                <button
                    onClick={() => setImportModalOpen(true)}
                    className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
                >
                    📥 JSON Import
                </button>
            </div>

            {/* Vocabulary Table */}
            {loading ? (
                <div className="text-center py-8">Yükleniyor...</div>
            ) : (
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="p-3 text-left border">Kelime</th>
                            <th className="p-3 text-left border">İngilizce Tanım</th>
                            <th className="p-3 text-left border">Türkçe Tanım</th>
                            <th className="p-3 text-left border">Seviye</th>
                            <th className="p-3 text-left border">Kategori</th>
                        </tr>
                    </thead>
                    <tbody>
                        {vocabulary.map((word) => (
                            <tr key={word.id} className="hover:bg-gray-50">
                                <td className="p-3 border font-medium">{word.word}</td>
                                <td className="p-3 border text-sm">{word.definition_en?.substring(0, 100)}...</td>
                                <td className="p-3 border text-sm">{word.definition_tr?.substring(0, 100)}...</td>
                                <td className="p-3 border">{word.cefr_level || '-'}</td>
                                <td className="p-3 border">{word.category || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {vocabulary.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-500">
                    Bu sektörde henüz terminoloji yok. JSON Import ile ekleyebilirsiniz.
                </div>
            )}

            {/* Import Modal */}
            {importModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-auto">
                        <h3 className="text-xl font-semibold mb-4">📥 Terminoloji JSON Import</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            NotebookLM'den aldığınız terminoloji JSON'unu yapıştırın:
                        </p>
                        <pre className="bg-gray-100 p-3 rounded text-xs mb-4 overflow-auto max-h-32">
                            {`{
  "words": [
    {
      "word": "bill of lading",
      "definition_en": "...",
      "definition_tr": "...",
      "cefr_level": "B1"
    }
  ]
}`}
                        </pre>
                        <textarea
                            value={jsonInput}
                            onChange={(e) => setJsonInput(e.target.value)}
                            className="w-full h-64 p-3 border rounded font-mono text-sm"
                            placeholder="JSON yapıştırın..."
                        />

                        {importResult && (
                            <div className="mt-4 p-3 bg-gray-100 rounded">
                                <p className="font-medium">
                                    ✅ {importResult.success} başarılı, ❌ {importResult.failed} başarısız
                                </p>
                            </div>
                        )}

                        <div className="mt-4 flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setImportModalOpen(false);
                                    setJsonInput('');
                                    setImportResult(null);
                                }}
                                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                            >
                                Kapat
                            </button>
                            <button
                                onClick={handleImport}
                                className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700"
                            >
                                Import Et
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ========================================
// STATS TAB
// ========================================
interface StatsTabProps {
    sectors: Sector[];
}

const StatsTab: React.FC<StatsTabProps> = ({ sectors }) => {
    const [stats, setStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await api.get('/admin/sectors/stats/overview');
            if (response.data.success) {
                setStats(response.data.data);
            }
        } catch (error) {
            console.error('Stats fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="text-center py-8">Yükleniyor...</div>;
    }

    return (
        <div>
            <h2 className="text-xl font-semibold mb-4">Sektör İstatistikleri</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.map((sector) => (
                    <div key={sector.id} className="p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-semibold text-lg mb-2">{sector.name_tr}</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="bg-white p-2 rounded">
                                <span className="text-gray-500">Toplam İçerik:</span>
                                <span className="font-medium ml-2">{sector.total_content}</span>
                            </div>
                            <div className="bg-white p-2 rounded">
                                <span className="text-gray-500">Yayında:</span>
                                <span className="font-medium ml-2 text-green-600">{sector.published_content}</span>
                            </div>
                            <div className="bg-white p-2 rounded">
                                <span className="text-gray-500">Taslak:</span>
                                <span className="font-medium ml-2 text-yellow-600">{sector.draft_content}</span>
                            </div>
                            <div className="bg-white p-2 rounded">
                                <span className="text-gray-500">Terminoloji:</span>
                                <span className="font-medium ml-2">{sector.vocabulary_count}</span>
                            </div>
                            <div className="bg-white p-2 rounded col-span-2">
                                <span className="text-gray-500">Kullanıcı:</span>
                                <span className="font-medium ml-2">{sector.user_count}</span>
                                <span className="text-gray-400 ml-2">({sector.total_completions} tamamlama)</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SectorManagement;
