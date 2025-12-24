
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface ApiCostDashboardProps {
    token: string | null;
    userId?: string;
}

export default function ApiCostDashboard({ token, userId }: ApiCostDashboardProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [groupBy, setGroupBy] = useState<'feature' | 'provider' | 'user'>('feature');
    const [dateRange, setDateRange] = useState('30days');
    const [data, setData] = useState<any>(null);

    const getDateParams = () => {
        const now = new Date();
        const end = now.toISOString();
        let start = new Date(0).toISOString(); // Default all time

        if (dateRange === '30days') {
            const d = new Date(); d.setDate(d.getDate() - 30); start = d.toISOString();
        } else if (dateRange === '7days') {
            const d = new Date(); d.setDate(d.getDate() - 7); start = d.toISOString();
        } else if (dateRange === 'today') {
            const d = new Date(); d.setHours(0, 0, 0, 0); start = d.toISOString();
        } else if (dateRange === 'yesterday') {
            const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(0, 0, 0, 0);
            const e = new Date(); e.setDate(e.getDate() - 1); e.setHours(23, 59, 59, 999);
            return `&startDate=${d.toISOString()}&endDate=${e.toISOString()}`;
        } else if (dateRange === 'all') {
            start = new Date('2023-01-01').toISOString();
        }
        return `&startDate=${start}&endDate=${end}`;
    };

    const fetchCosts = async () => {
        try {
            setLoading(true);
            setError(null);
            const dateParams = getDateParams();
            const userParam = userId ? `&userId=${userId}` : '';
            const res = await fetch(`/api/admin/api-costs?groupBy=${groupBy}${dateParams}${userParam}`, {
                headers: {
                    'Authorization': `Bearer ${token || ''}`,
                    'Content-Type': 'application/json',
                },
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.message || 'Veriler alınamadı');
            }
            setData(json.data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchCosts();
        }
    }, [token, groupBy, dateRange, userId]);

    const formatCost = (cost: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 4
        }).format(cost);
    };

    if (!token) return <div>Lütfen giriş yapın.</div>

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">API Maliyet Analizi</h2>
                <div className="flex gap-4 items-center">
                    <Select value={groupBy} onValueChange={(v: any) => setGroupBy(v)}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Gruplama" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="feature">Özelliğe Göre</SelectItem>
                            <SelectItem value="provider">Sağlayıcıya Göre</SelectItem>
                            {!userId && <SelectItem value="user">Kullanıcıya Göre</SelectItem>}
                        </SelectContent>
                    </Select>
                    <Select value={dateRange} onValueChange={(v) => setDateRange(v)}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Tarih Aralığı" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="today">Bugün</SelectItem>
                            <SelectItem value="yesterday">Dün</SelectItem>
                            <SelectItem value="7days">Son 7 Gün</SelectItem>
                            <SelectItem value="30days">Son 30 Gün</SelectItem>
                            <SelectItem value="all">Tüm Zamanlar</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={fetchCosts} disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <i className="fas fa-sync-alt mr-2"></i>}
                        Yenile
                    </Button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-md">
                    Hata: {error}
                </div>
            )}

            {data?.overview && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Toplam Maliyet</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCost(data.overview.total_cost_usd)}</div>
                            <p className="text-xs text-gray-500">
                                {dateRange === 'today' ? 'Bugün' :
                                    dateRange === 'yesterday' ? 'Dün' :
                                        dateRange === '7days' ? 'Son 7 gün' :
                                            dateRange === '30days' ? 'Son 30 gün' : 'Tüm zamanlar'}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Toplam Çağrı</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{data.overview.total_calls}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Aktif Kullanıcı</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{data.overview.unique_users}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Ort. Çağrı Başına</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCost(data.overview.avg_cost_per_call)}</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>
                        {groupBy === 'feature' ? 'Özellik Bazlı Maliyetler' :
                            groupBy === 'provider' ? 'Sağlayıcı Bazlı Maliyetler' : 'Kullanıcı Bazlı Maliyetler'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading && !data ? (
                        <div className="text-center py-8">Yükleniyor...</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{groupBy === 'user' ? 'Kullanıcı ID' : 'İsim'}</TableHead>
                                    <TableHead className="text-right">Çağrı Sayısı</TableHead>
                                    <TableHead className="text-right">Toplam Maliyet</TableHead>
                                    {groupBy === 'feature' && <TableHead className="text-right">Ort. Maliyet</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data?.grouped?.map((item: any, i: number) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-medium">
                                            {groupBy === 'feature' ? item.feature :
                                                groupBy === 'provider' ? `${item.provider} (${(item.models || []).join(', ')})` :
                                                    item.user_id}
                                        </TableCell>
                                        <TableCell className="text-right">{item.call_count}</TableCell>
                                        <TableCell className="text-right font-bold text-green-600">
                                            {formatCost(item.total_cost_usd)}
                                        </TableCell>
                                        {groupBy === 'feature' && (
                                            <TableCell className="text-right text-gray-500">
                                                {formatCost(item.avg_cost_per_call)}
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                                {(!data?.grouped || data.grouped.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-4 text-gray-500">Veri bulunamadı.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Son Aktiviteler</CardTitle>
                    <CardDescription>Son 100 işlem</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tarih</TableHead>
                                    <TableHead>Özellik</TableHead>
                                    <TableHead>Sağlayıcı / Model</TableHead>
                                    <TableHead className="text-right">Maliyet</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data?.recent_calls?.map((call: any) => (
                                    <TableRow key={call.id}>
                                        <TableCell className="text-sm text-gray-500">
                                            {new Date(call.created_at).toLocaleString('tr-TR')}
                                        </TableCell>
                                        <TableCell>{call.feature}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{call.provider}</Badge> {call.model}
                                        </TableCell>
                                        <TableCell className="text-right">{formatCost(call.cost_usd)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
