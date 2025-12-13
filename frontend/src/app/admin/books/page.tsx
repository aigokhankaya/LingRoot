'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Loader2, ArrowLeft, Plus, Search, BookOpen, Library,
    TrendingUp, FileText, Calendar, LayoutGrid, List as ListIcon,
    MoreVertical, Eye, Trash2, Headphones
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Book {
    id: number;
    title: string;
    authors: string | string[];
    cover_url: string;
    language: string;
    created_at: string;
    chapter_count: number;
    audio_stats: { [key: string]: number }; // e.g. { "A1": 10, "B1": 5 }
}

const ALL_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export default function BooksPage() {
    const router = useRouter();
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    useEffect(() => {
        fetchBooks();
    }, []);

    const fetchBooks = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('lingroot_token');
            const res = await fetch('/api/books/admin/list', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const json = await res.json();

            if (res.ok && json.success) {
                setBooks(json.data);
            } else {
                throw new Error(json.error || 'Kitaplar yüklenemedi');
            }
        } catch (err: any) {
            console.error('Fetch books error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const deleteBook = async (bookId: number) => {
        if (!confirm('Bu kitabı ve tüm içeriklerini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;

        try {
            const token = localStorage.getItem('lingroot_token');
            const res = await fetch(`/api/books/admin/${bookId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                setBooks(prev => prev.filter(b => b.id !== bookId));
            } else {
                const json = await res.json();
                alert(json.error || 'Silme işlemi başarısız');
            }
        } catch (err) {
            console.error(err);
            alert('Bir hata oluştu');
        }
    };

    const filteredBooks = books.filter(book =>
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (typeof book.authors === 'string' && book.authors.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Calculate statistics
    const totalBooks = books.length;
    const totalChapters = books.reduce((sum, book) => sum + (book.chapter_count || 0), 0);
    const avgChaptersPerBook = totalBooks > 0 ? (totalChapters / totalBooks).toFixed(1) : 0;
    const recentBooks = books.filter(b => {
        const daysSinceAdded = (Date.now() - new Date(b.created_at).getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceAdded <= 7;
    }).length;

    // Helper to render Audio Status Dots
    const renderAudioStatus = (book: Book) => {
        return (
            <div className="flex items-center gap-1">
                {ALL_LEVELS.map(level => {
                    const count = book.audio_stats?.[level] || 0;
                    const total = book.chapter_count;

                    let colorClass = "bg-gray-200 text-gray-400"; // None
                    if (total > 0 && count === total) colorClass = "bg-green-100 text-green-700 border-green-200 font-bold"; // Complete
                    else if (count > 0) colorClass = "bg-yellow-100 text-yellow-700 border-yellow-200"; // Partial

                    return (
                        <div key={level} className={`text-[10px] w-6 h-6 rounded-full flex items-center justify-center border ${colorClass}`} title={`${level}: ${count}/${total} Chapters`}>
                            {level}
                        </div>
                    )
                })}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push('/admin/dashboard')}
                            className="text-slate-600 hover:text-slate-900"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Dashboard
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">
                                Kitap Kütüphanesi
                            </h1>
                            <p className="text-sm text-slate-500 mt-1">Tüm kitapları ve içerik durumlarını yönetin</p>
                        </div>
                    </div>
                    <Button
                        onClick={() => router.push('/admin/books/upload')}
                        className="bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Yeni Kitap Ekle
                    </Button>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-white border-slate-200 shadow-sm">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Toplam Kitap</p>
                                <p className="text-2xl font-bold text-slate-900">{totalBooks}</p>
                            </div>
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <Library className="w-6 h-6 text-blue-600" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-slate-200 shadow-sm">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Toplam Bölüm</p>
                                <p className="text-2xl font-bold text-slate-900">{totalChapters}</p>
                            </div>
                            <div className="p-2 bg-purple-50 rounded-lg">
                                <FileText className="w-6 h-6 text-purple-600" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-slate-200 shadow-sm">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Ort. Uzunluk</p>
                                <p className="text-2xl font-bold text-slate-900">{avgChaptersPerBook} <span className="text-sm font-normal text-slate-400">bölüm</span></p>
                            </div>
                            <div className="p-2 bg-orange-50 rounded-lg">
                                <LayoutGrid className="w-6 h-6 text-orange-600" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-slate-200 shadow-sm">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Bu Hafta</p>
                                <p className="text-2xl font-bold text-slate-900">{recentBooks}</p>
                            </div>
                            <div className="p-2 bg-green-50 rounded-lg">
                                <TrendingUp className="w-6 h-6 text-green-600" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full sm:max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                            placeholder="Kitap adı veya yazar ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-white border-slate-200"
                        />
                    </div>

                    <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-slate-100 text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <ListIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                    </div>
                ) : error ? (
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                ) : filteredBooks.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
                        <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">Kitap Kaydı Bulunamadı</p>
                    </div>
                ) : viewMode === 'grid' ? (
                    // GRID VIEW
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredBooks.map((book) => (
                            <Card
                                key={book.id}
                                className="group hover:shadow-xl transition-all duration-300 border-slate-200 bg-white overflow-hidden"
                            >
                                <div className="relative h-48 bg-slate-100 overflow-hidden">
                                    {book.cover_url ? (
                                        <img
                                            src={book.cover_url}
                                            alt={book.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-slate-50">
                                            <BookOpen className="w-16 h-16 text-slate-200" />
                                        </div>
                                    )}
                                    <div className="absolute top-3 right-3 flex gap-2">
                                        <Badge className="bg-white/90 text-slate-700 hover:bg-white shadow-sm backdrop-blur-sm">
                                            {book.language?.toUpperCase() || 'EN'}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="p-5">
                                    <div className="mb-4">
                                        <h3 className="font-bold text-lg text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                                            {book.title}
                                        </h3>
                                        <p className="text-sm text-slate-500 line-clamp-1">
                                            {Array.isArray(book.authors) ? book.authors.join(', ') : (book.authors || 'Unknown')}
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-sm border-t border-slate-100 pt-3">
                                            <span className="text-slate-500 flex items-center gap-2">
                                                <FileText className="w-4 h-4" /> {book.chapter_count} Bölüm
                                            </span>
                                            <span className="text-slate-500 flex items-center gap-2">
                                                <Calendar className="w-4 h-4" /> {new Date(book.created_at).toLocaleDateString('tr-TR')}
                                            </span>
                                        </div>

                                        {/* Audio Status Mini */}
                                        <div className="bg-slate-50 p-2 rounded-lg">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                                                    <Headphones className="w-3 h-3" /> Ses Durumu
                                                </span>
                                            </div>
                                            {renderAudioStatus(book)}
                                        </div>

                                        <div className="flex gap-2 pt-2">
                                            <Button
                                                variant="outline"
                                                className="flex-1"
                                                onClick={() => router.push(`/admin/books/${book.id}`)}
                                            >
                                                <Eye className="w-4 h-4 mr-2" /> İncele
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                onClick={() => deleteBook(book.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : (
                    // LIST VIEW
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-slate-700 w-[80px]">Kapak</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700">Kitap Bilgileri</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700">İstatistikler</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700">Seslendirme (Feature)</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700 text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredBooks.map((book) => (
                                    <tr key={book.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="w-12 h-16 bg-slate-100 rounded overflow-hidden border border-slate-200">
                                                {book.cover_url ? (
                                                    <img src={book.cover_url} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                        <BookOpen className="w-6 h-6" />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-slate-900">{book.title}</div>
                                            <div className="text-slate-500">
                                                {Array.isArray(book.authors) ? book.authors.join(', ') : (book.authors || 'Unknown')}
                                            </div>
                                            <Badge variant="secondary" className="mt-1 text-[10px] h-5">
                                                {book.language?.toUpperCase()}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1 text-slate-600">
                                                <span className="flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-slate-400" /> {book.chapter_count} Bölüm
                                                </span>
                                                <span className="flex items-center gap-2 text-xs text-slate-400">
                                                    <Calendar className="w-3 h-3" /> {new Date(book.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <span className="text-xs text-slate-400 font-medium ml-1">Ses Seviyeleri</span>
                                                {renderAudioStatus(book)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => router.push(`/admin/books/${book.id}`)}
                                                >
                                                    <Eye className="w-4 h-4 mr-2" /> Detay
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500 hover:text-red-600 hover:bg-red-50 w-8 h-8"
                                                    onClick={() => deleteBook(book.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
