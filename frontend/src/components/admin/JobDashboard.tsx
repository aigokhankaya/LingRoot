
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface Job {
    id: string;
    name: string;
    data: any;
    status: 'active' | 'waiting' | 'completed' | 'failed' | 'delayed';
    progress: number;
    failedReason?: string;
    timestamp: number;
    processedOn?: number;
    finishedOn?: number;
    attemptsMade: number;
}

interface JobStats {
    counts: {
        active: number;
        completed: number;
        delayed: number;
        failed: number;
        paused: number;
        waiting: number;
    };
    jobs: Job[];
}

export default function JobDashboard() {
    const [stats, setStats] = useState<JobStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    const fetchJobs = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('lingroot_token');
            const res = await fetch('/api/admin/jobs', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const json = await res.json();

            if (json.success) {
                setStats(json.data);
                setLastUpdated(new Date());
                setError(null);
            } else {
                setError(json.message || 'Failed to fetch jobs');
            }
        } catch (err: any) {
            setError(err.message || 'Error connecting to server');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
        const interval = setInterval(fetchJobs, 10000); // Auto refresh every 10s
        return () => clearInterval(interval);
    }, []);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active': return <Badge className="bg-blue-500">Active</Badge>;
            case 'waiting': return <Badge className="bg-yellow-500">Waiting</Badge>;
            case 'completed': return <Badge className="bg-green-500">Completed</Badge>;
            case 'failed': return <Badge className="bg-red-500">Failed</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    const formatDate = (ts?: number) => {
        if (!ts) return '-';
        return new Date(ts).toLocaleString('tr-TR');
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">Job Takibi (Redis/BullMQ)</h2>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">Son güncelleme: {lastUpdated.toLocaleTimeString()}</span>
                    <Button onClick={fetchJobs} disabled={loading} size="sm">
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Yenile
                    </Button>
                </div>
            </div>

            {error && (
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="pt-6 text-red-600">
                        Hata: {error}
                    </CardContent>
                </Card>
            )}

            {stats && (
                <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Bekleyen (Waiting)</CardTitle>
                                <div className="h-4 w-4 text-yellow-500 rounded-full bg-yellow-100 flex items-center justify-center">●</div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.counts.waiting}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Aktif (Active)</CardTitle>
                                <div className="h-4 w-4 text-blue-500 rounded-full bg-blue-100 flex items-center justify-center">●</div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.counts.active}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Tamamlanan (Completed)</CardTitle>
                                <div className="h-4 w-4 text-green-500 rounded-full bg-green-100 flex items-center justify-center">●</div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.counts.completed}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Hatalı (Failed)</CardTitle>
                                <div className="h-4 w-4 text-red-500 rounded-full bg-red-100 flex items-center justify-center">●</div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.counts.failed}</div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Son Aktiviteler</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Durum</TableHead>
                                        <TableHead>Kullanıcı ID</TableHead>
                                        <TableHead>Giriş (Input)</TableHead>
                                        <TableHead>Oluşturulma</TableHead>
                                        <TableHead>Bitiş</TableHead>
                                        <TableHead>Progress</TableHead>
                                        <TableHead>Hata</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stats.jobs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center">Kuyrukta işlem bulunamadı.</TableCell>
                                        </TableRow>
                                    ) : (
                                        stats.jobs.map((job) => (
                                            <TableRow key={job.id}>
                                                <TableCell className="font-mono text-xs">{job.id}</TableCell>
                                                <TableCell>{getStatusBadge(job.status)}</TableCell>
                                                <TableCell className="font-mono text-xs truncate max-w-[100px]" title={job.data.userId}>
                                                    {job.data.userId || '-'}
                                                </TableCell>
                                                <TableCell className="truncate max-w-[200px]" title={job.data.input || job.data.topic}>
                                                    {job.data.input || job.data.topic || '-'}
                                                </TableCell>
                                                <TableCell className="text-xs">{formatDate(job.timestamp)}</TableCell>
                                                <TableCell className="text-xs">{formatDate(job.finishedOn || job.processedOn)}</TableCell>
                                                <TableCell>
                                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${job.progress || 0}%` }}></div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-red-500 text-xs max-w-[150px] truncate" title={job.failedReason}>
                                                    {job.failedReason || '-'}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
