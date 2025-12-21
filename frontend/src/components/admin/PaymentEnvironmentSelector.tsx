'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type PaymentEnvironment = 'production' | 'test';

export default function PaymentEnvironmentSelector() {
  const [currentEnvironment, setCurrentEnvironment] = useState<PaymentEnvironment>('production');
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

      const token = typeof window !== 'undefined' ? localStorage.getItem('lingroot_token') : null;

      const response = await fetch('/api/admin/payment-environment', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token || ''}`,
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCurrentEnvironment(data.data.paymentEnvironment || 'production');
      } else {
        // Default to production if not set
        setCurrentEnvironment('production');
      }
    } catch (err: any) {
      console.error('Payment environment fetch error:', err);
      setCurrentEnvironment('production');
    } finally {
      setLoading(false);
    }
  };

  const updateEnvironment = async (newEnvironment: PaymentEnvironment) => {
    try {
      setUpdating(true);
      setError(null);
      setSuccess(null);

      const token = typeof window !== 'undefined' ? localStorage.getItem('lingroot_token') : null;

      const response = await fetch('/api/admin/payment-environment', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ paymentEnvironment: newEnvironment })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCurrentEnvironment(newEnvironment);
        setSuccess(`Ödeme ortamı başarıyla ${newEnvironment === 'production' ? 'Production' : 'Test'} moduna geçirildi`);

        // Clear success message after 5 seconds
        setTimeout(() => setSuccess(null), 5000);
      } else {
        throw new Error(data.message || 'Ödeme ortamı güncellenemedi');
      }
    } catch (err: any) {
      console.error('Payment environment update error:', err);
      setError(err.message || 'Ödeme ortamı güncellenirken hata oluştu');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>💳 Ödeme Yöntemleri Ortam Bilgisi</CardTitle>
          <CardDescription>Google Play abonelik sürelerinin nasıl hesaplanacağını belirleyin</CardDescription>
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
        <CardTitle>💳 Ödeme Yöntemleri Ortam Bilgisi</CardTitle>
        <CardDescription>Google Play abonelik sürelerinin nasıl hesaplanacağını belirleyin</CardDescription>
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
            <p className="text-sm font-medium text-gray-700">Mevcut Ödeme Ortamı</p>
            <div className="flex items-center mt-1 space-x-2">
              <Badge
                className={currentEnvironment === 'production'
                  ? 'bg-green-100 text-green-800 hover:bg-green-100'
                  : 'bg-orange-100 text-orange-800 hover:bg-orange-100'
                }
              >
                {currentEnvironment === 'production' ? '🟢 PRODUCTION' : '🟠 TEST'}
              </Badge>
              <span className="text-sm text-gray-600">
                {currentEnvironment === 'production'
                  ? '(Google Play API süreleri aynen kullanılır)'
                  : '(Google Play API süresine +1 ay eklenir)'}
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
              Google Play API&apos;den gelen abonelik bitiş tarihi aynen kullanılır.
            </p>
            <ul className="text-xs text-gray-500 space-y-1 mb-4">
              <li>✓ Gerçek abonelik süreleri</li>
              <li>✓ Google Play API expiryTimeMillis aynen</li>
              <li>✓ Production kullanıcıları için</li>
            </ul>
            <Button
              onClick={() => updateEnvironment('production')}
              disabled={currentEnvironment === 'production' || updating}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {updating ? 'Güncelleniyor...' : 'Production&apos;a Geç'}
            </Button>
          </div>

          <div className="border rounded-lg p-4 hover:border-orange-500 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">Test Modu</h4>
              {currentEnvironment === 'test' && (
                <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Aktif</Badge>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Google Play API&apos;den gelen süreye +1 ay eklenir (test abonelikleri için).
            </p>
            <ul className="text-xs text-gray-500 space-y-1 mb-4">
              <li>✓ Test abonelikleri için</li>
              <li>✓ expiryTimeMillis + 30 gün</li>
              <li>✓ 5 dakikalık test süreleri uzatılır</li>
            </ul>
            <Button
              onClick={() => updateEnvironment('test')}
              disabled={currentEnvironment === 'test' || updating}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              {updating ? 'Güncelleniyor...' : 'Test&apos;e Geç'}
            </Button>
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-md p-3">
          <p className="text-sm text-primary">
            <strong>Not:</strong> Test modunda Google Play&apos;in 5 dakikalık test abonelikleri 1 ay boyunca aktif kalır.
            Production modunda gerçek abonelik süreleri kullanılır.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
