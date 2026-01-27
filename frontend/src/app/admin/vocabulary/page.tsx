'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Sparkles, BookOpen, Plane, Brain, Search, RefreshCw, Eye,
    CheckCircle, XCircle, Clock, AlertCircle, Loader2, ArrowLeft
} from 'lucide-react';

interface VocabularyTopic {
    id: number;
    code: string;
    topic_type: 'sector' | 'travel' | 'intellectual';
    name_tr: string;
    name_en: string;
    description_tr: string;
    description_en: string;
    icon: string;
    target_word_count: number;
    current_word_count: number;
    actual_word_count: number;
    is_active: boolean;
    sort_order: number;
}

interface GenerationJob {
    id: string;
    topic_id: number;
    topic_name: string;
    topic_type: string;
    target_count: number;
    generated_count: number;
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
    progress?: number;
    error_message?: string;
    started_at?: string;
    completed_at?: string;
    created_at: string;
}

interface TopicWord {
    id: number;
    word: string;
    pronunciation: string;
    definition_en: string;
    definition_tr: string;
    example_sentence: string;
    example_sentence_tr: string;
    category: string;
    cefr_level: string;
}

interface TopicsResponse {
    topics: VocabularyTopic[];
    grouped: {
        sector: VocabularyTopic[];
        travel: VocabularyTopic[];
        intellectual: VocabularyTopic[];
    };
    stats: {
        total: number;
        sector: number;
        travel: number;
        intellectual: number;
        totalWords: number;
    };
}

const topicTypeConfig = {
    sector: { label: 'Sektorler', icon: BookOpen, color: 'bg-blue-100 text-blue-700' },
    travel: { label: 'Gezgin', icon: Plane, color: 'bg-green-100 text-green-700' },
    intellectual: { label: 'Entelektuel', icon: Brain, color: 'bg-amber-100 text-amber-700' }
};

const statusConfig = {
    pending: { label: 'Bekliyor', icon: Clock, color: 'bg-slate-100 text-slate-600' },
    in_progress: { label: 'Devam Ediyor', icon: Loader2, color: 'bg-blue-100 text-blue-600' },
    completed: { label: 'Tamamlandi', icon: CheckCircle, color: 'bg-green-100 text-green-600' },
    failed: { label: 'Basarisiz', icon: XCircle, color: 'bg-red-100 text-red-600' },
    cancelled: { label: 'Iptal', icon: AlertCircle, color: 'bg-orange-100 text-orange-600' }
};

export default function VocabularyAdminPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [topics, setTopics] = useState<TopicsResponse | null>(null);
    const [activeTab, setActiveTab] = useState<'sector' | 'travel' | 'intellectual'>('sector');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal states
    const [selectedTopic, setSelectedTopic] = useState<VocabularyTopic | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showGenerationModal, setShowGenerationModal] = useState(false);
    const [topicWords, setTopicWords] = useState<TopicWord[]>([]);
    const [wordsLoading, setWordsLoading] = useState(false);
    const [wordsPagination, setWordsPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });

    // Generation states
    const [activeJob, setActiveJob] = useState<GenerationJob | null>(null);
    const [generationLoading, setGenerationLoading] = useState(false);
    const [targetCount, setTargetCount] = useState(200);

    // Auth check and initial load
    useEffect(() => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('lingroot_token') : null;
        if (!token) {
            router.push('/admin/login');
            return;
        }

        const checkAuth = async () => {
            try {
                const response = await fetch('/api/auth/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                if (!response.ok || !data.success || data.user?.role !== 'admin') {
                    router.push('/admin/login');
                    return;
                }
                setLoading(false);
                fetchTopics();
            } catch {
                router.push('/admin/login');
            }
        };
        checkAuth();
    }, [router]);

    const fetchTopics = async () => {
        try {
            const token = localStorage.getItem('lingroot_token');
            const res = await fetch('/api/admin/vocabulary/topics', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setTopics(data.data);
            }
        } catch (e) {
            console.error('Failed to fetch topics:', e);
        }
    };

    const fetchTopicWords = async (topicId: number, page = 1) => {
        setWordsLoading(true);
        try {
            const token = localStorage.getItem('lingroot_token');
            const res = await fetch(`/api/admin/vocabulary/topics/${topicId}/words?page=${page}&limit=50`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setTopicWords(data.data);
                setWordsPagination(data.pagination);
            }
        } catch (e) {
            console.error('Failed to fetch words:', e);
        } finally {
            setWordsLoading(false);
        }
    };

    const startGeneration = async (topicId: number) => {
        setGenerationLoading(true);
        try {
            const token = localStorage.getItem('lingroot_token');
            const res = await fetch(`/api/admin/vocabulary/topics/${topicId}/generate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ targetCount })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setActiveJob(data.data);
                setShowGenerationModal(true);
                // Start polling for job status
                pollJobStatus(data.data.id);
            }
        } catch (e) {
            console.error('Failed to start generation:', e);
        } finally {
            setGenerationLoading(false);
        }
    };

    const pollJobStatus = useCallback(async (jobId: string) => {
        const token = localStorage.getItem('lingroot_token');
        let polling = true;

        while (polling) {
            try {
                const res = await fetch(`/api/admin/vocabulary/jobs/${jobId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    setActiveJob(data.data);

                    if (['completed', 'failed', 'cancelled'].includes(data.data.status)) {
                        polling = false;
                        // Refresh topics to update word counts
                        fetchTopics();
                    }
                }
            } catch (e) {
                console.error('Failed to poll job status:', e);
                polling = false;
            }

            if (polling) {
                await new Promise(r => setTimeout(r, 2000));
            }
        }
    }, []);

    const cancelGeneration = async (jobId: string) => {
        try {
            const token = localStorage.getItem('lingroot_token');
            const res = await fetch(`/api/admin/vocabulary/jobs/${jobId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setActiveJob(prev => prev ? { ...prev, status: 'cancelled' } : null);
            }
        } catch (e) {
            console.error('Failed to cancel job:', e);
        }
    };

    const openTopicDetail = (topic: VocabularyTopic) => {
        setSelectedTopic(topic);
        setShowDetailModal(true);
        fetchTopicWords(topic.id);
    };

    const filteredTopics = topics?.grouped[activeTab]?.filter(t =>
        t.name_tr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.name_en.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/admin/dashboard">
                                <Button variant="ghost" size="sm">
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Admin Panel
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900">Kelime Yonetimi</h1>
                                <p className="text-sm text-slate-500">AI ile konu bazli kelime uretimi</p>
                            </div>
                        </div>
                        <Button onClick={fetchTopics} variant="outline" size="sm">
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Yenile
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Stats */}
                {topics?.stats && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                        <Card>
                            <CardContent className="p-4">
                                <div className="text-2xl font-bold text-slate-900">{topics.stats.total}</div>
                                <div className="text-sm text-slate-500">Toplam Konu</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="text-2xl font-bold text-blue-600">{topics.stats.sector}</div>
                                <div className="text-sm text-slate-500">Sektor</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="text-2xl font-bold text-green-600">{topics.stats.travel}</div>
                                <div className="text-sm text-slate-500">Gezgin</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="text-2xl font-bold text-amber-600">{topics.stats.intellectual}</div>
                                <div className="text-sm text-slate-500">Entelektuel</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="text-2xl font-bold text-teal-600">{topics.stats.totalWords.toLocaleString()}</div>
                                <div className="text-sm text-slate-500">Toplam Kelime</div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Tabs and Search */}
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1">
                        <TabsList className="grid w-full grid-cols-3 max-w-md">
                            <TabsTrigger value="sector" className="flex items-center gap-2">
                                <BookOpen className="w-4 h-4" />
                                Sektorler
                            </TabsTrigger>
                            <TabsTrigger value="travel" className="flex items-center gap-2">
                                <Plane className="w-4 h-4" />
                                Gezgin
                            </TabsTrigger>
                            <TabsTrigger value="intellectual" className="flex items-center gap-2">
                                <Brain className="w-4 h-4" />
                                Entelektuel
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Konu ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                {/* Topic Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredTopics.map((topic) => {
                        const wordCount = topic.actual_word_count || topic.current_word_count || 0;
                        const progress = Math.round((wordCount / topic.target_word_count) * 100);
                        const config = topicTypeConfig[topic.topic_type];

                        return (
                            <Card key={topic.id} className="hover:shadow-md transition-shadow">
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <div className="text-3xl">{topic.icon}</div>
                                        <Badge variant="outline" className={config.color}>
                                            {config.label}
                                        </Badge>
                                    </div>
                                    <CardTitle className="text-base mt-2">{topic.name_en}</CardTitle>
                                    <CardDescription className="text-xs">{topic.name_tr}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div>
                                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                                            <span>{wordCount} / {topic.target_word_count} kelime</span>
                                            <span>%{progress}</span>
                                        </div>
                                        <Progress value={progress} className="h-2" />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => openTopicDetail(topic)}
                                        >
                                            <Eye className="w-3 h-3 mr-1" />
                                            Gor
                                        </Button>
                                        <Button
                                            variant="default"
                                            size="sm"
                                            className="flex-1 bg-teal-600 hover:bg-teal-700"
                                            onClick={() => {
                                                setSelectedTopic(topic);
                                                startGeneration(topic.id);
                                            }}
                                            disabled={generationLoading}
                                        >
                                            <Sparkles className="w-3 h-3 mr-1" />
                                            Uret
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {filteredTopics.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                        <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Konu bulunamadi</p>
                    </div>
                )}
            </main>

            {/* Topic Detail Modal */}
            <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
                <DialogContent className="max-w-4xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            <span className="text-2xl">{selectedTopic?.icon}</span>
                            {selectedTopic?.name_en}
                        </DialogTitle>
                        <DialogDescription>{selectedTopic?.name_tr}</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="flex items-center gap-4 text-sm">
                            <Badge variant="outline">
                                {selectedTopic?.actual_word_count || 0} kelime
                            </Badge>
                            <Badge variant="outline">
                                Hedef: {selectedTopic?.target_word_count}
                            </Badge>
                        </div>

                        <ScrollArea className="h-[400px] border rounded-lg">
                            {wordsLoading ? (
                                <div className="flex items-center justify-center h-40">
                                    <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                                </div>
                            ) : topicWords.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Kelime</TableHead>
                                            <TableHead>Tanim (EN)</TableHead>
                                            <TableHead>Tanim (TR)</TableHead>
                                            <TableHead>CEFR</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {topicWords.map((word) => (
                                            <TableRow key={word.id}>
                                                <TableCell className="font-medium">
                                                    <div>{word.word}</div>
                                                    <div className="text-xs text-slate-400">{word.pronunciation}</div>
                                                </TableCell>
                                                <TableCell className="text-sm">{word.definition_en}</TableCell>
                                                <TableCell className="text-sm text-slate-600">{word.definition_tr}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{word.cefr_level}</Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                                    <BookOpen className="w-8 h-8 mb-2 opacity-50" />
                                    <p>Henuz kelime yok</p>
                                </div>
                            )}
                        </ScrollArea>

                        {wordsPagination.totalPages > 1 && (
                            <div className="flex justify-center gap-2">
                                {Array.from({ length: wordsPagination.totalPages }, (_, i) => (
                                    <Button
                                        key={i + 1}
                                        variant={wordsPagination.page === i + 1 ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => selectedTopic && fetchTopicWords(selectedTopic.id, i + 1)}
                                    >
                                        {i + 1}
                                    </Button>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Generation Progress Modal */}
            <Dialog open={showGenerationModal} onOpenChange={(open) => {
                if (!open && activeJob?.status === 'in_progress') {
                    // Don't close if generation is in progress
                    return;
                }
                setShowGenerationModal(open);
                if (!open) {
                    setActiveJob(null);
                }
            }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-teal-600" />
                            AI Kelime Uretimi
                        </DialogTitle>
                        <DialogDescription>
                            {selectedTopic?.name_en} icin kelime uretiliyor
                        </DialogDescription>
                    </DialogHeader>

                    {activeJob && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-500">Durum</span>
                                <Badge className={statusConfig[activeJob.status].color}>
                                    {React.createElement(statusConfig[activeJob.status].icon, {
                                        className: `w-3 h-3 mr-1 ${activeJob.status === 'in_progress' ? 'animate-spin' : ''}`
                                    })}
                                    {statusConfig[activeJob.status].label}
                                </Badge>
                            </div>

                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span>{activeJob.generated_count} / {activeJob.target_count}</span>
                                    <span>%{activeJob.progress || 0}</span>
                                </div>
                                <Progress value={activeJob.progress || 0} className="h-3" />
                            </div>

                            {activeJob.status === 'in_progress' && (
                                <div className="text-center text-sm text-slate-500">
                                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                                    Kelimeler uretiliyor... Bu islem birkaç dakika surebilir.
                                </div>
                            )}

                            {activeJob.status === 'completed' && (
                                <div className="text-center text-green-600">
                                    <CheckCircle className="w-6 h-6 mx-auto mb-2" />
                                    <p className="font-medium">Basariyla tamamlandi!</p>
                                    <p className="text-sm">{activeJob.generated_count} kelime uretildi</p>
                                </div>
                            )}

                            {activeJob.status === 'failed' && (
                                <div className="text-center text-red-600">
                                    <XCircle className="w-6 h-6 mx-auto mb-2" />
                                    <p className="font-medium">Hata olustu</p>
                                    <p className="text-sm">{activeJob.error_message}</p>
                                </div>
                            )}

                            <div className="flex gap-2">
                                {activeJob.status === 'in_progress' && (
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => cancelGeneration(activeJob.id)}
                                    >
                                        Iptal Et
                                    </Button>
                                )}
                                {['completed', 'failed', 'cancelled'].includes(activeJob.status) && (
                                    <Button
                                        className="flex-1"
                                        onClick={() => {
                                            setShowGenerationModal(false);
                                            setActiveJob(null);
                                        }}
                                    >
                                        Kapat
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
