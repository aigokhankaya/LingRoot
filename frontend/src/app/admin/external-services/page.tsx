'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ExternalService {
  id: number;
  service_name: string;
  service_type: string;
  api_url: string;
  api_token_masked?: string;
  api_token?: string;
  is_active: boolean;
  configuration: any;
  description?: string;
  created_at: string;
  updated_at: string;
}

export default function ExternalServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<ExternalService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<ExternalService | null>(null);
  const [formData, setFormData] = useState({
    service_name: '',
    service_type: 'podcast',
    api_url: '',
    api_token: '',
    is_active: true,
    configuration: {},
    description: ''
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('lingroot_token');

      const apiUrl = process.env.NODE_ENV === 'development'
        ? 'http://localhost:5001/api/external-services'
        : '/api/external-services';

      console.log('🔧 [EXTERNAL SERVICES] Fetching from:', apiUrl);

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      console.log('🔧 [EXTERNAL SERVICES] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔧 [EXTERNAL SERVICES] Error:', errorText);
        throw new Error(`Servisler yüklenemedi: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('🔧 [EXTERNAL SERVICES] Data received:', data);
      setServices(data.data || []);
    } catch (err: any) {
      console.error('🔧 [EXTERNAL SERVICES] Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('lingroot_token');
      const apiUrl = process.env.NODE_ENV === 'development'
        ? 'http://localhost:5001/api/external-services'
        : '/api/external-services';

      const url = editingService
        ? `${apiUrl}/${editingService.id}`
        : apiUrl;

      const method = editingService ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('İşlem başarısız oldu');
      }

      await fetchServices();
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu servisi silmek istediğinize emin misiniz?')) return;

    try {
      const token = localStorage.getItem('lingroot_token');
      const apiUrl = process.env.NODE_ENV === 'development'
        ? `http://localhost:5001/api/external-services/${id}`
        : `/api/external-services/${id}`;

      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Silme işlemi başarısız oldu');
      }

      await fetchServices();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      const token = localStorage.getItem('lingroot_token');
      const apiUrl = process.env.NODE_ENV === 'development'
        ? `http://localhost:5001/api/external-services/${id}/toggle`
        : `/api/external-services/${id}/toggle`;

      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Durum değiştirme başarısız oldu');
      }

      await fetchServices();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEdit = (service: ExternalService) => {
    setEditingService(service);
    setFormData({
      service_name: service.service_name,
      service_type: service.service_type,
      api_url: service.api_url,
      api_token: '', // Don't populate token for security
      is_active: service.is_active,
      configuration: service.configuration || {},
      description: service.description || ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingService(null);
    setFormData({
      service_name: '',
      service_type: 'podcast',
      api_url: '',
      api_token: '',
      is_active: true,
      configuration: {},
      description: ''
    });
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dış Servisler Yönetimi</h1>
          <p className="text-gray-600 mt-1">Harici API servislerini yönetin</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg font-medium flex items-center gap-2"
        >
          <i className="fas fa-plus"></i>
          Yeni Servis Ekle
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          <div className="flex items-start">
            <i className="fas fa-exclamation-circle mt-1 mr-2"></i>
            <div>
              <p className="font-medium">Hata oluştu:</p>
              <p className="text-sm mt-1">{error}</p>
              <p className="text-sm mt-2 text-red-600">
                <strong>Çözüm:</strong> Backend&apos;de migration çalıştırın: <code className="bg-red-100 px-2 py-1 rounded">npm run migrate:external-services</code>
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Servis Adı
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tip
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                API URL
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Durum
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                İşlemler
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {services.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <i className="fas fa-plug text-4xl text-gray-300 mb-4"></i>
                    <p className="text-gray-500 font-medium mb-2">Henüz kayıtlı servis bulunmuyor</p>
                    <p className="text-sm text-gray-400 mb-4">
                      Podcast ve diğer dış API servislerini buradan yönetebilirsiniz
                    </p>
                    <p className="text-xs text-gray-400 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
                      <i className="fas fa-info-circle mr-1"></i>
                      Migration çalıştırılmamış olabilir. Backend&apos;de: <code className="bg-yellow-100 px-2 py-1 rounded">npm run migrate:external-services</code>
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              services.map((service) => (
                <tr key={service.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{service.service_name}</div>
                    {service.description && (
                      <div className="text-sm text-gray-500">{service.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary/10 text-primary">
                      {service.service_type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 truncate max-w-xs" title={service.api_url}>
                      {service.api_url}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleStatus(service.id)}
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${service.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                        }`}
                    >
                      {service.is_active ? 'Aktif' : 'Pasif'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(service)}
                      className="text-primary hover:text-primary/80 mr-4"
                    >
                      <i className="fas fa-edit"></i> Düzenle
                    </button>
                    <button
                      onClick={() => handleDelete(service.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <i className="fas fa-trash"></i> Sil
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">
              {editingService ? 'Servisi Düzenle' : 'Yeni Servis Ekle'}
            </h2>

            <form onSubmit={handleCreateOrUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Servis Adı *
                </label>
                <input
                  type="text"
                  required
                  value={formData.service_name}
                  onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                  placeholder="podcast_generator"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Servis Tipi *
                </label>
                <select
                  required
                  value={formData.service_type}
                  onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                >
                  <option value="podcast">Podcast</option>
                  <option value="translation">Translation</option>
                  <option value="tts">TTS</option>
                  <option value="transcription">Transcription</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API URL *
                </label>
                <input
                  type="url"
                  required
                  value={formData.api_url}
                  onChange={(e) => setFormData({ ...formData, api_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                  placeholder="https://api.example.com/webhook"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Token {editingService && '(Değiştirmek için yeni token girin)'}
                </label>
                <input
                  type="password"
                  value={formData.api_token}
                  onChange={(e) => setFormData({ ...formData, api_token: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                  placeholder={editingService ? "Token değiştirmek için girin" : "API Token"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Açıklama
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                  rows={3}
                  placeholder="Servis hakkında açıklama"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                  Servis Aktif
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  {editingService ? 'Güncelle' : 'Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
