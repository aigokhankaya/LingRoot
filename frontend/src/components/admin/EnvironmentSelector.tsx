'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Environment = 'production' | 'test';

export default function EnvironmentSelector() {
  const [currentEnvironment, setCurrentEnvironment] = useState<Environment>('production');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentEnvironment();
  }, []);

  const fetchCurrentEnvironment = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/config/environment');
      const data = await response.json();

      if (response.ok && data.success) {
        setCurrentEnvironment(data.data.environment);
      } else {
        throw new Error(data.message || 'Ortam bilgisi alınamadı');
      }
    } catch (err: any) {
      console.error('Environment fetch error:', err);
      setError(err.message || 'Ortam bilgisi yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const updateEnvironment = async (newEnvironment: Environment) => {
    try {
      setUpdating(true);
      setError(null);
      setSuccess(null);

      const token = typeof window !== 'undefined' ? localStorage.getItem('lingroot_token') : null;

      const response = await fetch('/api/admin/environment', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ environment: newEnvironment })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCurrentEnvironment(newEnvironment);
        setSuccess(`Ortam başarıyla ${newEnvironment === 'production' ? 'Production' : 'Test'} moduna geçirildi`);

        // Clear success message after 5 seconds
        setTimeout(() => setSuccess(null), 5000);
      } else {
        throw new Error(data.message || 'Ortam güncellenemedi');
      }
    } catch (err: any) {
      console.error('Environment update error:', err);
      setError(err.message || 'Ortam güncellenirken hata oluştu');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>🌍 Mobil Uygulama Ortamı</CardTitle>
          <CardDescription>Mobil uygulamanın hangi backend ortamına bağlanacağını belirleyin</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3 text-gray-600">Yükleniyor...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>🌍 Mobil Uygulama Ortamı</CardTitle>
        <CardDescription>Mobil uygulamanın hangi backend ortamına bağlanacağını belirleyin</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-gray-700">Mevcut Ortam</p>
            <div className="flex items-center mt-1 space-x-2">
              <Badge
                className={currentEnvironment === 'production'
                  ? 'bg-green-100 text-green-800 hover:bg-green-100'
                  : 'bg-red-100 text-red-800 hover:bg-red-100'
                }
              >
                {currentEnvironment === 'production' ? '🟢 PRODUCTION' : '🔴 TEST'}
              </Badge>
              <span className="text-sm text-gray-600">
                {currentEnvironment === 'production'
                  ? '(Render Backend - https://lingloops-backend.onrender.com)'
                  : '(Local Backend - http://localhost:5001 veya local IP)'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4 hover:border-green-500 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">Production Modu</h4>
              {currentEnvironment === 'production' && (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Aktif</Badge>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Mobil uygulama Render.com üzerindeki production backend&apos;e bağlanır.
            </p>
            <ul className="text-xs text-gray-500 space-y-1 mb-4">
              <li>✓ Production veritabanı</li>
              <li>✓ Render backend URL&apos;leri</li>
              <li>✓ Gerçek kullanıcı verileri</li>
            </ul>
            <Button
              onClick={() => updateEnvironment('production')}
              disabled={currentEnvironment === 'production' || updating}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {updating ? 'Güncelleniyor...' : 'Production&apos;a Geç'}
            </Button>
          </div>

          <div className="border rounded-lg p-4 hover:border-red-500 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">Test Modu</h4>
              {currentEnvironment === 'test' && (
                <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Aktif</Badge>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Mobil uygulama local backend&apos;e bağlanır (localhost veya local IP).
            </p>
            <ul className="text-xs text-gray-500 space-y-1 mb-4">
              <li>✓ Local backend (port 5001)</li>
              <li>✓ Test veritabanı</li>
              <li>✓ Development ortamı</li>
            </ul>
            <Button
              onClick={() => updateEnvironment('test')}
              disabled={currentEnvironment === 'test' || updating}
              variant="destructive"
              className="w-full"
            >
              {updating ? 'Güncelleniyor...' : 'Test&apos;e Geç'}
            </Button>
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-md p-3">
          <p className="text-sm text-primary">
            <strong>Not:</strong> Ortam değişikliği yaptıktan sonra mobil uygulamayı yeniden başlatmanız gerekir.
            Uygulama başlangıcında yeni ortam ayarını otomatik olarak alacaktır.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
