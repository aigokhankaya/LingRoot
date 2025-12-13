'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Plus, Search, BookOpen, Trash2, Edit } from 'lucide-react';

interface Book {
    id: number;
    title: string;
    authors: string | string[];
    cover_url: string;
    language: string;
    created_at: string;
    chapter_count: number;
}

export default function BooksPage() {
    const router = useRouter();
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string | null>(null);

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

    const filteredBooks = books.filter(book =>
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (typeof book.authors === 'string' && book.authors.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-10">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/dashboard')}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Dashboard
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Kitap Yönetimi</h1>
                            <p className="text-sm text-gray-500">Sistemdeki tüm kitapları yönetin</p>
                        </div>
                    </div>
                    <Button onClick={() => router.push('/admin/books/upload')} className="bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Yeni PDF Yükle
                    </Button>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                            placeholder="Kitap veya yazar ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                {/* Content */}
                <Card className="shadow-md border-gray-200">
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="flex justify-center items-center h-64">
                                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                            </div>
                        ) : error ? (
                            <div className="p-8 text-center text-red-500">
                                Hata: {error}
                            </div>
                        ) : filteredBooks.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">
                                <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                <p className="text-lg font-medium">Kitap bulunamadı</p>
                                <p className="text-sm mb-4">Henüz hiç kitap eklenmemiş veya arama kriterlerine uygun kitap yok.</p>
                                <Button variant="outline" onClick={() => router.push('/admin/books/upload')}>
                                    İlk Kitabı Ekle
                                </Button>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[80px]">Kapak</TableHead>
                                        <TableHead>Kitap Bilgileri</TableHead>
                                        <TableHead>Dil</TableHead>
                                        <TableHead className="text-center">Bölüm Sayısı</TableHead>
                                        <TableHead className="text-right">Eklendiği Tarih</TableHead>
                                        {/* <TableHead className="text-right">İşlemler</TableHead> */}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredBooks.map((book) => (
                                        <TableRow key={book.id}>
                                            <TableCell>
                                                {book.cover_url ? (
                                                    <img src={book.cover_url} alt={book.title} className="w-12 h-16 object-cover rounded shadow-sm bg-gray-100" />
                                                ) : (
                                                    <div className="w-12 h-16 bg-gray-100 rounded flex items-center justify-center text-gray-300">
                                                        <BookOpen className="w-6 h-6" />
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium text-gray-900">{book.title}</div>
                                                <div className="text-sm text-gray-500">
                                                    {Array.isArray(book.authors)
                                                        ? book.authors.join(', ')
                                                        : (book.authors || 'Bilinmeyen Yazar')}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="uppercase">{book.language || 'EN'}</Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="font-medium">{book.chapter_count || 0}</span>
                                            </TableCell>
                                            <TableCell className="text-right text-gray-500 text-sm">
                                                {new Date(book.created_at).toLocaleDateString('tr-TR')}
                                            </TableCell>
                                            {/* 
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell> 
                      */}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
