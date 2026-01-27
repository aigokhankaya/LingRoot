'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

export default function PerfLogsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [users, setUsers] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [logContent, setLogContent] = useState<string>('');

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
      } catch {
        router.push('/admin/login');
      }
    };
    checkAuth();
  }, [router]);

  // Fetch users for the selected date
  const fetchUsers = useCallback(async () => {
    try {
      const token = localStorage.getItem('lingroot_token');
      const res = await fetch(`/api/perf-logs/admin/list?date=${date}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers(data.users || []);
        // Reset selected user if not in new list
        if (data.users && !data.users.includes(selectedUser)) {
          setSelectedUser('');
          setLogContent('');
        }
      }
    } catch (e) {
      console.error('Failed to fetch users:', e);
    }
  }, [date, selectedUser]);

  useEffect(() => {
    if (!loading) {
      fetchUsers();
    }
  }, [loading, date, fetchUsers]);

  // Fetch logs for selected user + date
  const fetchLogs = useCallback(async () => {
    if (!selectedUser) {
      setLogContent('');
      return;
    }
    setLogsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('lingroot_token');
      const res = await fetch(`/api/perf-logs/admin?userId=${selectedUser}&date=${date}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLogContent(data.logs || '');
      } else {
        setError(data.message || 'Failed to fetch logs');
      }
    } catch (e: any) {
      setError(e.message || 'Network error');
    } finally {
      setLogsLoading(false);
    }
  }, [selectedUser, date]);

  useEffect(() => {
    if (!loading && selectedUser) {
      fetchLogs();
    }
  }, [loading, selectedUser, fetchLogs]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
          <p className="mt-4 text-gray-600">Yetki kontrol ediliyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/admin/dashboard" className="text-gray-500 hover:text-indigo-600 transition-colors">
                <i className="fas fa-arrow-left text-lg" />
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">Performans Logları</h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchUsers();
                if (selectedUser) fetchLogs();
              }}
            >
              <i className="fas fa-sync-alt mr-2" />
              Yenile
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filtreler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="w-48">
                <Label htmlFor="log-date" className="mb-1 block text-sm font-medium text-gray-700">Tarih</Label>
                <Input
                  id="log-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="w-72">
                <Label className="mb-1 block text-sm font-medium text-gray-700">Kullanıcı</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={users.length === 0 ? 'Bu tarihte log yok' : 'Kullanıcı seçin'} />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(uid => (
                      <SelectItem key={uid} value={uid}>
                        {uid}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-gray-500">
                {users.length > 0 ? `${users.length} kullanıcı bulundu` : 'Log bulunamadı'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Log Viewer */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <i className="fas fa-terminal text-indigo-600" />
              Log Görüntüleyici
              {selectedUser && (
                <span className="text-sm font-normal text-gray-500">
                  — {selectedUser} / {date}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}

            {logsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                <span className="ml-3 text-gray-500">Loglar yükleniyor...</span>
              </div>
            ) : !selectedUser ? (
              <div className="text-center py-12 text-gray-400">
                <i className="fas fa-search text-4xl mb-3 block" />
                <p>Logları görüntülemek için tarih ve kullanıcı seçin.</p>
              </div>
            ) : !logContent ? (
              <div className="text-center py-12 text-gray-400">
                <i className="fas fa-inbox text-4xl mb-3 block" />
                <p>Seçilen tarih ve kullanıcı için log bulunamadı.</p>
              </div>
            ) : (
              <div className="relative">
                <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs font-mono overflow-auto max-h-[600px] whitespace-pre-wrap break-all leading-relaxed">
                  {logContent}
                </pre>
                <div className="absolute top-2 right-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700"
                    onClick={() => {
                      navigator.clipboard.writeText(logContent);
                    }}
                  >
                    <i className="fas fa-copy mr-1" />
                    Kopyala
                  </Button>
                </div>
                <div className="mt-2 text-xs text-gray-500 text-right">
                  {logContent.split('\n').length} satır
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
