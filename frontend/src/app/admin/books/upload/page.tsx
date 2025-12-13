'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, FileUp, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';

export default function BookUploadPage() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [coverUrl, setCoverUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadStats, setUploadStats] = useState<{ bookId: number; chapterCount: number } | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.type !== 'application/pdf') {
                setError('Lütfen geçerli bir PDF dosyası seçin.');
                return;
            }
            setFile(selectedFile);
            setError(null);

            // Auto-fill title from filename if empty
            if (!title) {
                setTitle(selectedFile.name.replace('.pdf', ''));
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !title) {
            setError('Lütfen bir PDF dosyası ve kitap başlığı girin.');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('title', title);
            formData.append('author', author);
            formData.append('coverUrl', coverUrl);

            const token = localStorage.getItem('lingroot_token');

            const response = await fetch('/api/admin/books/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Yükleme başarısız oldu.');
            }

            setSuccess(true);
            setUploadStats({
                bookId: data.book.id,
                chapterCount: data.chapterCount
            });

            // Reset form partially
            setFile(null);
            // Keep title/author for reference or clear them? Better clear.
            setTitle('');
            setAuthor('');

        } catch (err: any) {
            console.error('Upload error:', err);
            setError(err.message || 'Bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-10">
            <div className="max-w-3xl mx-auto space-y-6">

                {/* Header Navigation */}
                <div className="flex items-center space-x-4 mb-6">
                    <Button variant="ghost" size="sm" onClick={() => router.push('/admin/dashboard')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Dashboard'a Dön
                    </Button>
                    <h1 className="text-2xl font-bold text-gray-900">Yeni Kitap Ekle</h1>
                </div>

                {/* Upload Card */}
                <Card className="shadow-lg border-gray-200">
                    <CardHeader>
                        <CardTitle>PDF Kitap Yükleme</CardTitle>
                        <CardDescription>
                            Yüklenen PDF dosyası analiz edilecek, bölümlere ayrılacak ve Yönetmen Modu (Director Agent) ile taranarak duygu analizi yapılacaktır.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>

                        {error && (
                            <Alert variant="destructive" className="mb-6">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Hata</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {success && uploadStats && (
                            <Alert className="mb-6 border-green-200 bg-green-50 text-green-900">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <AlertTitle className="text-green-800">Başarılı!</AlertTitle>
                                <AlertDescription>
                                    Kitap başarıyla eklendi. ID: {uploadStats.bookId}, Bölüm Sayısı: {uploadStats.chapterCount}.
                                </AlertDescription>
                                <div className="mt-3">
                                    <Button variant="outline" size="sm" className="bg-white hover:bg-green-100 text-green-700 border-green-300" onClick={() => router.push(`/admin/books/${uploadStats.bookId}`)}>
                                        Kitap Detaylarını Gör
                                    </Button>
                                </div>
                            </Alert>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">

                            <div className="space-y-2">
                                <Label htmlFor="pdf-file">PDF Dosyası</Label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                                    <input
                                        id="pdf-file"
                                        type="file"
                                        accept="application/pdf"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        disabled={loading}
                                    />
                                    <FileUp className="h-10 w-10 text-gray-400 mb-2" />
                                    <p className="text-sm font-medium text-gray-900">
                                        {file ? file.name : "Dosya seçmek için tıklayın veya sürükleyin"}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">Maksimum 50MB. Sadece PDF.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Kitap Adı</Label>
                                    <Input
                                        id="title"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Örn: The Great Gatsby"
                                        required
                                        disabled={loading}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="author">Yazar</Label>
                                    <Input
                                        id="author"
                                        value={author}
                                        onChange={(e) => setAuthor(e.target.value)}
                                        placeholder="Örn: F. Scott Fitzgerald"
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="coverUrl">Kapak URL (Opsiyonel)</Label>
                                <Input
                                    id="coverUrl"
                                    value={coverUrl}
                                    onChange={(e) => setCoverUrl(e.target.value)}
                                    placeholder="https://..."
                                    disabled={loading}
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                                disabled={loading || !file || !title}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        İşleniyor (Bu işlem birkaç dakika sürebilir)...
                                    </>
                                ) : (
                                    'Kitabı Yükle ve Analiz Et'
                                )}
                            </Button>

                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
