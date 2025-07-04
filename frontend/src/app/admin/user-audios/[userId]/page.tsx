"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface AudioFile {
  id: string;
  mp3_url: string;
  created_at: string;
  input?: string;
}

export default function UserAudioManager({ params }: { params: { userId: string } }) {
  const { userId } = params;
  const router = useRouter();
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kullanıcıya ait ses dosyalarını API'den çek
  useEffect(() => {
    const fetchAudioFiles = async () => {
      try {
        const token = localStorage.getItem('lingroot_token');
        if (!token) {
          router.push('/admin/login');
          return;
        }

        const response = await fetch(`/api/admin/user-audios/${userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setAudioFiles(data.audioFiles || []);
        } else {
          setError(data.message || 'Ses dosyaları yüklenirken hata oluştu');
        }
      } catch (error) {
        console.error('Error fetching audio files:', error);
        setError('Ses dosyaları yüklenirken hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchAudioFiles();
  }, [userId, router]);

  const handleSelect = (id: string) => {
    setSelected(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selected.size === audioFiles.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(audioFiles.map(f => f.id)));
    }
  };

  const handleDelete = async () => {
    if (selected.size === 0) return;

    const confirmDelete = window.confirm(
      `${selected.size} ses dosyasını kalıcı olarak silmek istediğinizden emin misiniz?`
    );

    if (!confirmDelete) return;

    setDeleting(true);

    try {
      const token = localStorage.getItem('lingroot_token');
      const response = await fetch('/api/admin/user-audios', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audioFileIds: Array.from(selected)
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Başarılı silme işlemi sonrası local state'i güncelle
        setAudioFiles(files => files.filter(f => !selected.has(f.id)));
        setSelected(new Set());
        alert(data.message || 'Ses dosyaları başarıyla silindi');
      } else {
        alert(data.message || 'Ses dosyaları silinirken hata oluştu');
      }
    } catch (error) {
      console.error('Error deleting audio files:', error);
      alert('Ses dosyaları silinirken hata oluştu');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center">Yükleniyor...</div>
    </div>
  );

  if (error) return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-red-600 text-center">{error}</div>
      <div className="text-center mt-4">
        <Button onClick={() => router.push('/admin/dashboard')}>
          Geri Dön
        </Button>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Ses Dosyalarını Yönet/Sil</h1>
          <p className="text-gray-600 mt-1">Kullanıcı ID: {userId}</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => router.push('/admin/dashboard')}
        >
          Geri Dön
        </Button>
      </div>

      {audioFiles.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Bu kullanıcıya ait ses dosyası bulunamadı.</p>
        </div>
      ) : (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Checkbox 
                checked={selected.size === audioFiles.length && audioFiles.length > 0}
                onChange={handleSelectAll}
              />
              <span className="text-sm text-gray-600">
                Tümünü Seç ({audioFiles.length} dosya)
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {selected.size} dosya seçildi
              </span>
              <Button 
                variant="destructive" 
                onClick={handleDelete}
                disabled={selected.size === 0 || deleting}
              >
                {deleting ? 'Siliniyor...' : 'Seçilenleri Sil'}
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <span className="sr-only">Seç</span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dosya Adı
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orijinal Metin
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Oluşturulma
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Önizleme
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {audioFiles.map(file => (
                  <tr key={file.id} className={selected.has(file.id) ? 'bg-blue-50' : ''}>
                    <td className="px-4 py-4">
                      <Checkbox 
                        checked={selected.has(file.id)} 
                        onChange={() => handleSelect(file.id)} 
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {file.mp3_url.split('/').pop()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {file.mp3_url}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {file.input || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {formatDate(file.created_at)}
                    </td>
                    <td className="px-4 py-4">
                      <audio controls src={file.mp3_url} className="w-48" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 