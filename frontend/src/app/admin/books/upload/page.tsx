'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, FileUp, CheckCircle, AlertCircle, ArrowLeft, Type, FileText } from 'lucide-react';

export default function BookUploadPage() {
    const router = useRouter();
    const [uploadType, setUploadType] = useState<'file' | 'text'>('file');

    // Form States
    const [file, setFile] = useState<File | null>(null);
    const [textContent, setTextContent] = useState('');
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [coverUrl, setCoverUrl] = useState('');

    // UI States
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadStats, setUploadStats] = useState<{ bookId: number; chapterCount: number } | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            const validTypes = [
                'application/pdf',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/plain'
            ];

            if (!validTypes.includes(selectedFile.type)) {
                setError('Lütfen geçerli bir PDF, Word (.docx) veya Metin (.txt) dosyası seçin.');
                return;
            }

            setFile(selectedFile);
            setError(null);

            // Auto-fill title from filename if empty
            if (!title) {
                const name = selectedFile.name.split('.').slice(0, -1).join('.');
                setTitle(name);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate inputs based on type
        if (uploadType === 'file' && !file) {
            setError('Lütfen bir dosya seçin.');
            return;
        }
        if (uploadType === 'text' && !textContent.trim()) {
            setError('Lütfen kitap metnini girin.');
            return;
        }
        if (!title) {
            setError('Kitap başlığı zorunludur.');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('author', author);
            formData.append('coverUrl', coverUrl);

            if (uploadType === 'file' && file) {
                formData.append('file', file);
            } else if (uploadType === 'text') {
                formData.append('textContent', textContent);
            }

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
            setTextContent('');
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
        <div className="min-h-screen bg-slate-50 p-6 md:p-10">
            <div className="max-w-3xl mx-auto space-y-6">

                {/* Header Navigation */}
                <div className="flex items-center space-x-4 mb-6">
                    <Button variant="ghost" size="sm" onClick={() => router.push('/admin/dashboard')} className="text-slate-600 hover:text-slate-900">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Dashboard&apos;a Dön
                    </Button>
                    <h1 className="text-3xl font-bold text-slate-900">Yeni Kitap Ekle</h1>
                </div>

                {/* Upload Card */}
                <Card className="shadow-lg border-slate-200 bg-white">
                    <CardHeader>
                        <CardTitle className="text-xl">İçerik Yükleme</CardTitle>
                        <CardDescription>
                            Kitabı yükledikten sonra sistem otomatik olarak bölümlere ayıracak ve Yönetmen Modu (Director Agent) ile analiz edecektir.
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
                                    <Button variant="ghost" size="sm" className="ml-2 text-green-700 hover:text-green-800" onClick={() => setSuccess(false)}>
                                        Yeni Kitap Ekle
                                    </Button>
                                </div>
                            </Alert>
                        )}

                        <Tabs defaultValue="file" className="w-full" onValueChange={(val) => setUploadType(val as 'file' | 'text')}>
                            <TabsList className="grid w-full grid-cols-2 mb-6">
                                <TabsTrigger value="file" className="flex items-center justify-center gap-2">
                                    <FileUp className="w-4 h-4" /> Dosya Yükle (PDF, Word, TXT)
                                </TabsTrigger>
                                <TabsTrigger value="text" className="flex items-center justify-center gap-2">
                                    <Type className="w-4 h-4" /> Manuel Metin Girişi
                                </TabsTrigger>
                            </TabsList>

                            <form onSubmit={handleSubmit} className="space-y-6">

                                <TabsContent value="file" className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="file-upload">Dosya Seçimi</Label>
                                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer relative group">
                                            <input
                                                id="file-upload"
                                                type="file"
                                                accept=".pdf,.docx,.doc,.txt"
                                                onChange={handleFileChange}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                disabled={loading}
                                            />
                                            <div className="bg-indigo-50 p-4 rounded-full group-hover:scale-110 transition-transform duration-200 mb-3">
                                                <FileUp className="h-8 w-8 text-indigo-600" />
                                            </div>
                                            <p className="text-sm font-semibold text-slate-700">
                                                {file ? file.name : "Dosya seçmek için tıklayın veya sürükleyin"}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-2">
                                                Desteklenen formatlar: PDF, Word (.docx), Metin (.txt). Maksimum 50MB.
                                            </p>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="text" className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="text-content">Kitap Metni</Label>
                                        <Textarea
                                            id="text-content"
                                            placeholder="Kitabın tam metnini buraya yapıştırın..."
                                            className="min-h-[300px] font-mono text-sm leading-relaxed p-4"
                                            value={textContent}
                                            onChange={(e) => setTextContent(e.target.value)}
                                            disabled={loading}
                                        />
                                        <p className="text-xs text-slate-500 text-right">
                                            Karater sayısı: {textContent.length}
                                        </p>
                                    </div>
                                </TabsContent>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                                    <div className="space-y-2">
                                        <Label htmlFor="title">Kitap Adı</Label>
                                        <Input
                                            id="title"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="Örn: The Great Gatsby"
                                            required
                                            className="h-11"
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
                                            className="h-11"
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
                                        placeholder="https://example.com/cover.jpg"
                                        className="h-11"
                                        disabled={loading}
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-12 text-base font-medium bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-md hover:shadow-lg transition-all"
                                    disabled={loading || (!file && !textContent) || !title}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            İçerik Analiz Ediliyor...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="mr-2 h-5 w-5" />
                                            Kitabı Kaydet ve Analiz Et
                                        </>
                                    )}
                                </Button>
                            </form>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
