'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getUserAudioHistoryAdmin, AdminAudioHistoryItem, deleteAudioFiles } from '@/lib/admin';

export default function UserAudioHistoryPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const userId = useMemo(() => (Array.isArray(params?.id) ? params.id[0] : params?.id), [params]);

  const [data, setData] = useState<AdminAudioHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [sortField, setSortField] = useState<keyof AdminAudioHistoryItem | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    if (!userId) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getUserAudioHistoryAdmin(userId, { page, limit, search });
        setData(res.data || []);
        setTotal(res.pagination?.total || (res.data?.length || 0));
      } catch (e: any) {
        setError(e?.message || 'Kullanıcı ses geçmişi alınamadı');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    setSelectedIds(new Set()); // Clear selection when page changes
  }, [userId, page, limit, search]);

  const handleSort = (field: keyof AdminAudioHistoryItem) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort data based on current sort field and direction
  const sortedData = useMemo(() => {
    if (!sortField) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      // Handle null/undefined values
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Compare values
      let comparison = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortField, sortDirection]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(sortedData.map(row => row.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    
    if (!confirm(`${selectedIds.size} ses kaydını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve storage'dan da silinecektir.`)) {
      return;
    }

    try {
      setDeleting(true);
      await deleteAudioFiles(userId, Array.from(selectedIds));
      alert(`${selectedIds.size} ses kaydı başarıyla silindi.`);
      setSelectedIds(new Set());
      // Refresh data
      const res = await getUserAudioHistoryAdmin(userId, { page, limit, search });
      setData(res.data || []);
      setTotal(res.pagination?.total || (res.data?.length || 0));
    } catch (e: any) {
      alert('Silme işlemi başarısız: ' + (e?.message || 'Bilinmeyen hata'));
    } finally {
      setDeleting(false);
    }
  };

  const SortIcon = ({ field }: { field: keyof AdminAudioHistoryItem }) => {
    if (sortField !== field) {
      return <span className="ml-1 text-gray-400">⇅</span>;
    }
    return sortDirection === 'asc' ? 
      <span className="ml-1 text-indigo-600">↑</span> : 
      <span className="ml-1 text-indigo-600">↓</span>;
  };

  return (
    <>
      <div className="w-full">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
            Kullanıcı Ses Kayıtları
          </h1>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
              >
                {deleting ? 'Siliniyor...' : `Seçilenleri Sil (${selectedIds.size})`}
              </button>
            )}
            <input
              value={search}
              onChange={(e) => { setPage(1); setSearch(e.target.value); }}
              placeholder="Ara (girdi / çeviri / adaptasyon)"
              className="border rounded px-2 py-1 text-sm bg-white dark:bg-gray-900 dark:text-gray-100"
            />
            <a href="/admin/dashboard" className="text-indigo-600 hover:underline dark:text-indigo-400">← Kullanıcı Yönetimi</a>
          </div>
        </div>

        {loading && <div>Yükleniyor...</div>}
        {error && <div className="text-red-500">{error}</div>}

        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left">
                    <input
                      type="checkbox"
                      checked={sortedData.length > 0 && selectedIds.size === sortedData.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="cursor-pointer"
                    />
                  </th>
                  <th className="px-3 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => handleSort('id')}>
                    ID <SortIcon field="id" />
                  </th>
                  <th className="px-3 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => handleSort('created_at')}>
                    Oluşturulma <SortIcon field="created_at" />
                  </th>
                  <th className="px-3 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => handleSort('input')}>
                    Girdi <SortIcon field="input" />
                  </th>
                  <th className="px-3 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => handleSort('input_type')}>
                    Girdi Türü <SortIcon field="input_type" />
                  </th>
                  <th className="px-3 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => handleSort('level')}>
                    Seviye <SortIcon field="level" />
                  </th>
                  <th className="px-3 py-2 text-left">MP3</th>
                  <th className="px-3 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => handleSort('translated_text')}>
                    Çevrilmiş Metin <SortIcon field="translated_text" />
                  </th>
                  <th className="px-3 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => handleSort('adapted_text')}>
                    Adapted Text <SortIcon field="adapted_text" />
                  </th>
                  <th className="px-3 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => handleSort('words_count')}>
                    Words Count <SortIcon field="words_count" />
                  </th>
                  <th className="px-3 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => handleSort('timepoints_count')}>
                    Timepoints Count <SortIcon field="timepoints_count" />
                  </th>
                  <th className="px-3 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => handleSort('openai_total_tokens')}>
                    OpenAI Tokens (in/out/total) <SortIcon field="openai_total_tokens" />
                  </th>
                  <th className="px-3 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => handleSort('openai_cost_usd')}>
                    OpenAI $ <SortIcon field="openai_cost_usd" />
                  </th>
                  <th className="px-3 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => handleSort('tts_characters')}>
                    TTS Chars <SortIcon field="tts_characters" />
                  </th>
                  <th className="px-3 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => handleSort('tts_category')}>
                    TTS Kategori <SortIcon field="tts_category" />
                  </th>
                  <th className="px-3 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => handleSort('tts_cost_usd')}>
                    TTS $ <SortIcon field="tts_cost_usd" />
                  </th>
                  <th className="px-3 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600" onClick={() => handleSort('total_cost_usd')}>
                    Toplam $ <SortIcon field="total_cost_usd" />
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {sortedData.map((row) => (
                  <tr key={row.id} className="align-top">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={(e) => handleSelectOne(row.id, e.target.checked)}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-800 dark:text-gray-100">{row.id}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600 dark:text-gray-300">{new Date(row.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2 max-w-xs truncate text-gray-800 dark:text-gray-100" title={row.input}>{row.input}</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{row.input_type}</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{row.level}</td>
                    <td className="px-3 py-2">
                      {row.mp3_url ? (
                        <audio controls src={row.mp3_url} className="w-52" />
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 max-w-md truncate text-gray-700 dark:text-gray-300" title={row.translated_text || ''}>{row.translated_text}</td>
                    <td className="px-3 py-2 max-w-md truncate text-gray-700 dark:text-gray-300" title={row.adapted_text || ''}>{row.adapted_text}</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{row.words_count ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{row.timepoints_count ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-200">
                      {row.openai_prompt_tokens ?? 0}/{row.openai_completion_tokens ?? 0}/{row.openai_total_tokens ?? 0}
                    </td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{row.openai_cost_usd?.toFixed?.(4) ?? '0.0000'}</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{row.tts_characters ?? 0}</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{row.tts_category || '—'}</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{row.tts_cost_usd?.toFixed?.(4) ?? '0.0000'}</td>
                    <td className="px-3 py-2 font-semibold text-gray-900 dark:text-gray-100">{row.total_cost_usd?.toFixed?.(4) ?? '0.0000'}</td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={17} className="px-3 py-6 text-center text-gray-500">Kayıt bulunamadı.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Toplam: {total}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Önceki
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-200">Sayfa {page}</span>
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              onClick={() => setPage((p) => p + 1)}
              disabled={data.length < limit}
            >
              Sonraki
            </button>
          </div>
        </div>
      </div>
    </>
  );
}


