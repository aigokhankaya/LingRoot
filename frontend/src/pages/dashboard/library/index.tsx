import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/auth';
import { LibraryLayout } from '@/components/library/LibraryLayout';
import { BookCard } from '@/components/library/BookCard';
import { getLibrary, LibraryItem } from '@/lib/api';
import { Loader2, BookOpen } from 'lucide-react';

export default function LibraryPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'in-progress' | 'finished'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchLibrary();
    }
  }, [user, authLoading, router]);

  const fetchLibrary = async () => {
    try {
      setLoading(true);
      const response = await getLibrary();
      if (response.success && response.data) {
        setItems(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch library:', error);
      // toast.error('Kütüphane yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    // Search filter
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.author.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    // Status filter
    if (filter === 'in-progress') return item.progress > 0 && !item.is_finished;
    if (filter === 'finished') return item.is_finished;
    return true;
  });

  const handleBookClick = (item: LibraryItem) => {
    // Navigate to player with type query param
    router.push(`/dashboard/library/player/${item.real_id}?type=${item.type}`);
  };

  if (authLoading || (loading && items.length === 0)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-[#0f1115]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Kütüphaneniz hazırlanıyor...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Kütüphanem | LingRoot</title>
      </Head>

      <LibraryLayout
        activeFilter={filter}
        onFilterChange={setFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      >
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {filteredItems.map((item) => (
              <BookCard 
                key={item.id} 
                item={item} 
                onClick={() => handleBookClick(item)} 
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
              <BookOpen size={40} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {searchQuery ? 'Sonuç bulunamadı' : 'Kütüphaneniz boş'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8">
              {searchQuery 
                ? `"${searchQuery}" araması için herhangi bir kitap veya doküman bulamadık.`
                : 'Henüz bir kitap okumaya başlamadınız veya doküman yüklemediniz.'}
            </p>
            {!searchQuery && (
              <button 
                onClick={() => router.push('/dashboard?tab=documents')}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-lg shadow-blue-500/20"
              >
                Yeni İçerik Ekle
              </button>
            )}
          </div>
        )}
      </LibraryLayout>
    </>
  );
}
