'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Send, Users, User, Trash2, Clock, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface NotificationItem {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    isRead: boolean;
    link?: string | null;
    createdAt: string;
    user?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
}

interface UserItem {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    name?: string;
}

const typeIcons = {
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    error: AlertCircle
};

const typeColors = {
    info: 'text-blue-500 bg-blue-100',
    success: 'text-emerald-500 bg-emerald-100',
    warning: 'text-amber-500 bg-amber-100',
    error: 'text-red-500 bg-red-100'
};

export default function NotificationsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Form state
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState<'info' | 'success' | 'warning' | 'error'>('info');
    const [link, setLink] = useState('');
    const [sendToAll, setSendToAll] = useState(true);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [showUserSuggestions, setShowUserSuggestions] = useState(false);

    // Users list for dropdown
    const [users, setUsers] = useState<UserItem[]>([]);
    const [usersLoading, setUsersLoading] = useState(false);

    // Notification history
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Auth check
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
                fetchUsers();
                fetchHistory();
            } catch {
                router.push('/admin/login');
            }
        };
        checkAuth();
    }, [router]);

    const formatUserLabel = (user: UserItem) => {
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || '';
        return fullName ? `${fullName} (${user.email})` : user.email;
    };

    const fetchUsers = async (search: string = '') => {
        setUsersLoading(true);
        try {
            const token = localStorage.getItem('lingroot_token');
            const query = new URLSearchParams({
                limit: '20',
            });
            if (search.trim()) {
                query.set('search', search.trim());
            }

            const res = await fetch(`/api/admin/users?${query.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setUsers(data.users || []);
            }
        } catch (e) {
            console.error('Failed to fetch users:', e);
        } finally {
            setUsersLoading(false);
        }
    };

    useEffect(() => {
        if (loading || sendToAll || selectedUserId) return;

        const timeout = setTimeout(() => {
            fetchUsers(userSearch);
        }, 250);

        return () => clearTimeout(timeout);
    }, [loading, sendToAll, selectedUserId, userSearch]);

    const fetchHistory = async () => {
        setHistoryLoading(true);
        try {
            const token = localStorage.getItem('lingroot_token');
            const res = await fetch('/api/admin/notifications/history?limit=50', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setNotifications(data.data || []);
            }
        } catch (e) {
            console.error('Failed to fetch notification history:', e);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleSend = async () => {
        if (!title.trim() || !message.trim()) {
            setError('Başlık ve mesaj zorunludur');
            return;
        }

        if (!sendToAll && !selectedUserId) {
            setError('Bir kullanıcı seçin veya tümüne göndermeyi aktif edin');
            return;
        }

        setSending(true);
        setError(null);
        setSuccess(null);

        try {
            const token = localStorage.getItem('lingroot_token');
            const res = await fetch('/api/admin/notifications/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: sendToAll ? 'all' : selectedUserId,
                    title: title.trim(),
                    message: message.trim(),
                    type,
                    link: link.trim() || undefined
                })
            });

            let data: any = null;
            const rawBody = await res.text();
            try {
                data = rawBody ? JSON.parse(rawBody) : null;
            } catch {
                data = { message: rawBody };
            }

            if (!res.ok || !data.success) {
                throw new Error(
                    data?.error ||
                    data?.message ||
                    `Bildirim gönderilemedi (HTTP ${res.status})`
                );
            }

            setSuccess(data.message || 'Bildirim başarıyla gönderildi');
            setTitle('');
            setMessage('');
            setLink('');
            setType('info');
            setSelectedUserId('');
            setUserSearch('');
            setShowUserSuggestions(false);
            fetchHistory();
        } catch (e: any) {
            setError(e.message || 'Bildirim gönderilirken hata oluştu');
        } finally {
            setSending(false);
        }
    };

    const handleDeleteNotification = async (id: string) => {
        if (!confirm('Bu bildirimi silmek istediğinize emin misiniz?')) return;

        try {
            const token = localStorage.getItem('lingroot_token');
            const res = await fetch(`/api/admin/notifications/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                setNotifications(prev => prev.filter(n => n.id !== id));
            }
        } catch (e) {
            console.error('Failed to delete notification:', e);
        }
    };

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Şimdi';
        if (diffMins < 60) return `${diffMins} dk önce`;
        if (diffHours < 24) return `${diffHours} saat önce`;
        if (diffDays < 7) return `${diffDays} gün önce`;
        return date.toLocaleDateString('tr-TR');
    };

    const handleUserSearchChange = (value: string) => {
        setUserSearch(value);
        setSelectedUserId('');
        setShowUserSuggestions(true);
    };

    const handleUserSelect = (user: UserItem) => {
        setSelectedUserId(user.id);
        setUserSearch(formatUserLabel(user));
        setShowUserSuggestions(false);
        setError(null);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <Link href="/admin/dashboard">
                            <Image
                                src="/lingroot-icon.svg"
                                alt="LingRoot Logo"
                                width={40}
                                height={40}
                                className="w-8 h-8 cursor-pointer"
                            />
                        </Link>
                        <span className="text-lg font-medium text-gray-800">Bildirim Yönetimi</span>
                    </div>
                    <Link href="/admin/dashboard">
                        <Button variant="outline" size="sm">
                            <i className="fas fa-arrow-left mr-2"></i>
                            Dashboard
                        </Button>
                    </Link>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Send Notification Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Send className="w-5 h-5" />
                                Bildirim Gönder
                            </CardTitle>
                            <CardDescription>
                                Kullanıcılara bildirim gönderin
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                    {error}
                                </div>
                            )}
                            {success && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                                    {success}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="title">Başlık *</Label>
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Bildirim başlığı"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="message">Mesaj *</Label>
                                <Textarea
                                    id="message"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Bildirim mesajı"
                                    rows={4}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="type">Tip</Label>
                                <Select value={type} onValueChange={(v) => setType(v as any)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Bildirim tipi" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="info">
                                            <span className="flex items-center gap-2">
                                                <Info className="w-4 h-4 text-blue-500" /> Bilgi
                                            </span>
                                        </SelectItem>
                                        <SelectItem value="success">
                                            <span className="flex items-center gap-2">
                                                <CheckCircle className="w-4 h-4 text-emerald-500" /> Başarı
                                            </span>
                                        </SelectItem>
                                        <SelectItem value="warning">
                                            <span className="flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4 text-amber-500" /> Uyarı
                                            </span>
                                        </SelectItem>
                                        <SelectItem value="error">
                                            <span className="flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4 text-red-500" /> Hata
                                            </span>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="link">Bağlantı (Opsiyonel)</Label>
                                <Input
                                    id="link"
                                    value={link}
                                    onChange={(e) => setLink(e.target.value)}
                                    placeholder="/dashboard veya https://example.com"
                                />
                            </div>

                            <div className="flex items-center justify-between py-2">
                                <Label htmlFor="sendToAll" className="flex items-center gap-2 cursor-pointer">
                                    <Users className="w-4 h-4" />
                                    Tüm Kullanıcılara Gönder
                                </Label>
                                <Switch
                                    id="sendToAll"
                                    checked={sendToAll}
                                    onChange={(e) => setSendToAll(e.target.checked)}
                                />
                            </div>

                            {!sendToAll && (
                                <div className="space-y-2">
                                    <Label htmlFor="userSearch">Kullanıcı Ara</Label>
                                    <div className="relative">
                                        <Input
                                            id="userSearch"
                                            value={userSearch}
                                            onChange={(e) => handleUserSearchChange(e.target.value)}
                                            onFocus={() => setShowUserSuggestions(true)}
                                            onBlur={() => {
                                                window.setTimeout(() => setShowUserSuggestions(false), 150);
                                            }}
                                            placeholder="İsim veya e-posta ile ara"
                                        />

                                        {showUserSuggestions && (
                                            <div className="absolute z-20 mt-2 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
                                                <ScrollArea className="max-h-64">
                                                    {usersLoading ? (
                                                        <div className="p-3 text-sm text-gray-500">Yükleniyor...</div>
                                                    ) : users.length > 0 ? (
                                                        <div className="py-1">
                                                            {users.map((user) => (
                                                                <button
                                                                    key={user.id}
                                                                    type="button"
                                                                    onClick={() => handleUserSelect(user)}
                                                                    className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left hover:bg-gray-50"
                                                                >
                                                                    <div className="min-w-0">
                                                                        <div className="truncate text-sm font-medium text-gray-900">
                                                                            {`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || 'İsimsiz Kullanıcı'}
                                                                        </div>
                                                                        <div className="truncate text-xs text-gray-500">
                                                                            {user.email}
                                                                        </div>
                                                                    </div>
                                                                    {selectedUserId === user.id && (
                                                                        <Badge variant="secondary" className="shrink-0">
                                                                            Seçili
                                                                        </Badge>
                                                                    )}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="p-3 text-sm text-gray-500">
                                                            Kullanıcı bulunamadı
                                                        </div>
                                                    )}
                                                </ScrollArea>
                                            </div>
                                        )}
                                    </div>

                                    {selectedUserId && (
                                        <p className="text-xs text-emerald-600">
                                            Seçili kullanıcı: {userSearch}
                                        </p>
                                    )}
                                </div>
                            )}

                            <Button
                                onClick={handleSend}
                                disabled={sending}
                                className="w-full"
                            >
                                {sending ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                        Gönderiliyor...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4 mr-2" />
                                        {sendToAll ? 'Tüm Kullanıcılara Gönder' : 'Gönder'}
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Notification History Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bell className="w-5 h-5" />
                                Bildirim Geçmişi
                            </CardTitle>
                            <CardDescription>
                                Gönderilen son 50 bildirim
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[500px] pr-4">
                                {historyLoading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent"></div>
                                    </div>
                                ) : notifications.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500">
                                        <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                        <p>Henüz bildirim gönderilmemiş</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {notifications.map((notification) => {
                                            const Icon = typeIcons[notification.type] || Info;
                                            const colorClass = typeColors[notification.type] || typeColors.info;

                                            return (
                                                <div
                                                    key={notification.id}
                                                    className="p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className={`flex-shrink-0 w-8 h-8 rounded-full ${colorClass} flex items-center justify-center`}>
                                                            <Icon className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <p className="font-medium text-gray-800 text-sm">
                                                                    {notification.title}
                                                                </p>
                                                                <button
                                                                    onClick={() => handleDeleteNotification(notification.id)}
                                                                    className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-500"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                            <p className="text-sm text-gray-600 line-clamp-2 mt-0.5">
                                                                {notification.message}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                                                                <Clock className="w-3 h-3" />
                                                                {formatTimeAgo(notification.createdAt)}
                                                                {notification.user && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <User className="w-3 h-3" />
                                                                        {notification.user.firstName} {notification.user.lastName}
                                                                    </>
                                                                )}
                                                                {notification.isRead && (
                                                                    <Badge variant="secondary" className="text-xs">Okundu</Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
