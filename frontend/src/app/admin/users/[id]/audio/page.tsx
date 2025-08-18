'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getUserAudioHistoryAdmin, AdminAudioHistoryItem } from '@/lib/admin';

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
  }, [userId, page, limit, search]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
            Kullanıcı Ses Kayıtları
          </h1>
          <div className="flex items-center gap-2">
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
                  <th className="px-3 py-2 text-left">ID</th>
                  <th className="px-3 py-2 text-left">Oluşturulma</th>
                  <th className="px-3 py-2 text-left">Girdi</th>
                  <th className="px-3 py-2 text-left">Girdi Türü</th>
                  <th className="px-3 py-2 text-left">Seviye</th>
                  <th className="px-3 py-2 text-left">MP3</th>
                  <th className="px-3 py-2 text-left">Çevrilmiş Metin</th>
                  <th className="px-3 py-2 text-left">Adapted Text</th>
                  <th className="px-3 py-2 text-left">Words Count</th>
                  <th className="px-3 py-2 text-left">Timepoints Count</th>
                  <th className="px-3 py-2 text-left">OpenAI Tokens (in/out/total)</th>
                  <th className="px-3 py-2 text-left">OpenAI $</th>
                  <th className="px-3 py-2 text-left">TTS Chars</th>
                  <th className="px-3 py-2 text-left">TTS Kategori</th>
                  <th className="px-3 py-2 text-left">TTS $</th>
                  <th className="px-3 py-2 text-left">Toplam $</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {data.map((row) => (
                  <tr key={row.id} className="align-top">
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
                    <td colSpan={10} className="px-3 py-6 text-center text-gray-500">Kayıt bulunamadı.</td>
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
    </div>
  );
}


