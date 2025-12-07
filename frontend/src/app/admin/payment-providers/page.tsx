'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CreditCard, Settings, Shield, TestTube, Plus, Edit, Check, X, 
  AlertCircle, Loader2, ArrowLeft, RefreshCw
} from 'lucide-react';

interface PaymentProvider {
  id: string;
  name: string;
  displayName: string;
  isActive: boolean;
  isDefault: boolean;
  environment: 'sandbox' | 'production';
  apiKey?: string;
  secretKey?: string;
  baseUrl?: string;
  settings: Record<string, any>;
  supportedFeatures: {
    creditCard: boolean;
    installment: boolean;
    threeDSecure: boolean;
    refund: boolean;
    partialRefund: boolean;
    recurring: boolean;
  };
  commissionRates: {
    creditCard: number;
    debitCard: number;
    installment: Record<string, number>;
  };
  lastTestedAt?: string;
  testResult?: boolean;
}

export default function PaymentProvidersPage() {
  const router = useRouter();
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingProvider, setEditingProvider] = useState<PaymentProvider | null>(null);
  
  const [formData, setFormData] = useState<{
    name: string;
    displayName: string;
    isActive: boolean;
    isDefault: boolean;
    environment: 'sandbox' | 'production';
    apiKey: string;
    secretKey: string;
    baseUrl: string;
    commissionRates: {
      creditCard: number;
      debitCard: number;
      installment: Record<string, number>;
    };
    supportedFeatures: {
      creditCard: boolean;
      installment: boolean;
      threeDSecure: boolean;
      refund: boolean;
      partialRefund: boolean;
      recurring: boolean;
    };
  }>({
    name: 'iyzico',
    displayName: 'iyzico',
    isActive: false,
    isDefault: true,
    environment: 'sandbox',
    apiKey: '',
    secretKey: '',
    baseUrl: '',
    commissionRates: {
      creditCard: 2.49,
      debitCard: 1.79,
      installment: { '2': 3.49, '3': 4.49, '6': 5.99, '9': 7.49, '12': 8.99 }
    },
    supportedFeatures: {
      creditCard: true,
      installment: true,
      threeDSecure: true,
      refund: true,
      partialRefund: false,
      recurring: false
    }
  });

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('lingroot_token');
      const res = await fetch('/api/iyzico/admin/providers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setProviders(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching providers:', err);
      setError('Sağlayıcılar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const token = localStorage.getItem('lingroot_token');
      
      const url = editingProvider 
        ? `/api/iyzico/admin/providers/${editingProvider.id}`
        : '/api/iyzico/admin/providers';
      
      const method = editingProvider ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      
      if (data.success) {
        setShowDialog(false);
        setEditingProvider(null);
        fetchProviders();
      } else {
        setError(data.message || 'Kaydetme başarısız');
      }
    } catch (err) {
      console.error('Error saving provider:', err);
      setError('Kaydetme sırasında hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (providerId: string, providerName: string) => {
    try {
      setTesting(providerId);
      const token = localStorage.getItem('lingroot_token');
      
      // Provider'a göre farklı endpoint kullan
      const testEndpoint = providerName === 'stripe' 
        ? '/api/stripe/admin/test-connection'
        : `/api/iyzico/admin/providers/${providerId}/test`;
      
      const res = await fetch(testEndpoint, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      
      if (data.success) {
        alert(data.testResult ? '✅ Bağlantı başarılı!' : '❌ Bağlantı başarısız');
        fetchProviders();
      } else {
        alert(`Test başarısız: ${data.message}`);
      }
    } catch (err) {
      console.error('Error testing provider:', err);
      alert('Test sırasında hata oluştu');
    } finally {
      setTesting(null);
    }
  };

  const openEditDialog = (provider: PaymentProvider) => {
    setEditingProvider(provider);
    setFormData({
      name: provider.name,
      displayName: provider.displayName,
      isActive: provider.isActive,
      isDefault: provider.isDefault,
      environment: provider.environment,
      apiKey: provider.apiKey || '',
      secretKey: '',
      baseUrl: provider.baseUrl || '',
      commissionRates: provider.commissionRates || formData.commissionRates,
      supportedFeatures: provider.supportedFeatures || formData.supportedFeatures
    });
    setShowDialog(true);
  };

  type FormDataType = typeof formData;
  
  const getDefaultFormData = (providerType: 'iyzico' | 'stripe'): FormDataType => {
    if (providerType === 'stripe') {
      return {
        name: 'stripe',
        displayName: 'Stripe',
        isActive: false,
        isDefault: false,
        environment: 'sandbox',
        apiKey: '',
        secretKey: '',
        baseUrl: '',
        commissionRates: {
          creditCard: 2.9,
          debitCard: 2.9,
          installment: {} as Record<string, number>
        },
        supportedFeatures: {
          creditCard: true,
          installment: false,
          threeDSecure: true,
          refund: true,
          partialRefund: true,
          recurring: true
        }
      };
    }
    return {
      name: 'iyzico',
      displayName: 'iyzico',
      isActive: false,
      isDefault: true,
      environment: 'sandbox',
      apiKey: '',
      secretKey: '',
      baseUrl: '',
      commissionRates: {
        creditCard: 2.49,
        debitCard: 1.79,
        installment: { '2': 3.49, '3': 4.49, '6': 5.99, '9': 7.49, '12': 8.99 } as Record<string, number>
      },
      supportedFeatures: {
        creditCard: true,
        installment: true,
        threeDSecure: true,
        refund: true,
        partialRefund: false,
        recurring: false
      }
    };
  };

  const openCreateDialog = (providerType: 'iyzico' | 'stripe' = 'iyzico') => {
    setEditingProvider(null);
    setFormData(getDefaultFormData(providerType));
    setShowDialog(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/admin/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Geri
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <CreditCard className="h-6 w-6 text-indigo-600" />
                Ödeme Sağlayıcıları
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Kredi kartı ödeme sağlayıcılarını yönetin
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => openCreateDialog('iyzico')} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              iyzico Ekle
            </Button>
            <Button onClick={() => openCreateDialog('stripe')}>
              <Plus className="h-4 w-4 mr-2" />
              Stripe Ekle
            </Button>
          </div>
        </div>

        {/* Provider Cards */}
        <div className="grid gap-6">
          {providers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CreditCard className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">Henüz ödeme sağlayıcısı eklenmemiş</p>
                <div className="flex gap-2">
                  <Button onClick={() => openCreateDialog('iyzico')} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    iyzico Ekle
                  </Button>
                  <Button onClick={() => openCreateDialog('stripe')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Stripe Ekle
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            providers.map((provider) => (
              <Card key={provider.id} className={`${provider.isActive ? 'border-green-500' : 'border-gray-200'}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${provider.isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
                        <CreditCard className={`h-6 w-6 ${provider.isActive ? 'text-green-600' : 'text-gray-500'}`} />
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {provider.displayName}
                          {provider.isDefault && <Badge variant="secondary">Varsayılan</Badge>}
                        </CardTitle>
                        <CardDescription>
                          Ortam: {provider.environment === 'production' ? '🟢 Production' : '🟡 Sandbox'}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={provider.isActive ? 'default' : 'secondary'}>
                        {provider.isActive ? 'Aktif' : 'Pasif'}
                      </Badge>
                      {provider.testResult !== undefined && (
                        <Badge variant={provider.testResult ? 'default' : 'destructive'}>
                          {provider.testResult ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          {provider.testResult ? 'Test Başarılı' : 'Test Başarısız'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    {/* Desteklenen Özellikler */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Desteklenen Özellikler</h4>
                      <div className="flex flex-wrap gap-1">
                        {provider.supportedFeatures?.creditCard && <Badge variant="outline">Kredi Kartı</Badge>}
                        {provider.supportedFeatures?.installment && <Badge variant="outline">Taksit</Badge>}
                        {provider.supportedFeatures?.threeDSecure && <Badge variant="outline">3D Secure</Badge>}
                        {provider.supportedFeatures?.refund && <Badge variant="outline">İade</Badge>}
                      </div>
                    </div>
                    {/* Komisyon Oranları */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Komisyon Oranları</h4>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <p>Kredi Kartı: %{provider.commissionRates?.creditCard || 2.49}</p>
                        <p>Banka Kartı: %{provider.commissionRates?.debitCard || 1.79}</p>
                      </div>
                    </div>
                    {/* API Bilgileri */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">API Bilgileri</h4>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <p>API Key: {provider.apiKey || '****'}</p>
                        {provider.lastTestedAt && (
                          <p>Son Test: {new Date(provider.lastTestedAt).toLocaleString('tr-TR')}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 justify-end">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleTest(provider.id, provider.name)}
                      disabled={testing === provider.id}
                    >
                      {testing === provider.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <TestTube className="h-4 w-4 mr-2" />
                      )}
                      Bağlantı Test Et
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openEditDialog(provider)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Düzenle
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Edit/Create Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProvider ? 'Sağlayıcıyı Düzenle' : 'Yeni Ödeme Sağlayıcısı'}
              </DialogTitle>
              <DialogDescription>
                {editingProvider 
                  ? 'Ödeme sağlayıcı ayarlarını güncelleyin'
                  : 'Yeni bir ödeme sağlayıcısı ekleyin (iyzico)'
                }
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">Genel</TabsTrigger>
                <TabsTrigger value="api">API Ayarları</TabsTrigger>
                <TabsTrigger value="commission">Komisyon</TabsTrigger>
              </TabsList>

              {/* General Tab */}
              <TabsContent value="general" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Gösterim Adı</Label>
                    <Input
                      id="displayName"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      placeholder="iyzico"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="environment">Ortam</Label>
                    <Select
                      value={formData.environment}
                      onValueChange={(value: 'sandbox' | 'production') => 
                        setFormData({ ...formData, environment: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sandbox">🟡 Sandbox (Test)</SelectItem>
                        <SelectItem value="production">🟢 Production (Canlı)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Aktif</Label>
                    <p className="text-sm text-gray-500">Sağlayıcıyı aktif et</p>
                  </div>
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Varsayılan Sağlayıcı</Label>
                    <p className="text-sm text-gray-500">Ödemelerde varsayılan olarak kullan</p>
                  </div>
                  <Switch
                    checked={formData.isDefault}
                    onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Desteklenen Özellikler</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(formData.supportedFeatures).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <Switch
                          checked={value}
                          onCheckedChange={(checked) => setFormData({
                            ...formData,
                            supportedFeatures: { ...formData.supportedFeatures, [key]: checked }
                          })}
                        />
                        <Label className="text-sm">
                          {key === 'creditCard' && 'Kredi Kartı'}
                          {key === 'installment' && 'Taksit'}
                          {key === 'threeDSecure' && '3D Secure'}
                          {key === 'refund' && 'İade'}
                          {key === 'partialRefund' && 'Kısmi İade'}
                          {key === 'recurring' && 'Tekrarlayan Ödeme'}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* API Tab */}
              <TabsContent value="api" className="space-y-4 mt-4">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        Güvenlik Uyarısı
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        API anahtarlarınızı güvenli bir şekilde saklayın. Production ortamında gerçek
                        anahtarları kullanmadan önce sandbox ile test edin.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    placeholder="sandbox-xxxxxxxxxxxxxxxxxxxxxxx"
                  />
                  <p className="text-xs text-gray-500">
                    iyzico panelinden alınan API Key
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secretKey">Secret Key</Label>
                  <Input
                    id="secretKey"
                    type="password"
                    value={formData.secretKey}
                    onChange={(e) => setFormData({ ...formData, secretKey: e.target.value })}
                    placeholder="sandbox-xxxxxxxxxxxxxxxxxxxxxxx"
                  />
                  <p className="text-xs text-gray-500">
                    iyzico panelinden alınan Secret Key (güncelleme için boş bırakabilirsiniz)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="baseUrl">Base URL (Opsiyonel)</Label>
                  <Input
                    id="baseUrl"
                    value={formData.baseUrl}
                    onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                    placeholder="Boş bırakırsanız ortama göre otomatik ayarlanır"
                  />
                </div>
              </TabsContent>

              {/* Commission Tab */}
              <TabsContent value="commission" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Kredi Kartı Komisyonu (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.commissionRates.creditCard}
                      onChange={(e) => setFormData({
                        ...formData,
                        commissionRates: { ...formData.commissionRates, creditCard: parseFloat(e.target.value) }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Banka Kartı Komisyonu (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.commissionRates.debitCard}
                      onChange={(e) => setFormData({
                        ...formData,
                        commissionRates: { ...formData.commissionRates, debitCard: parseFloat(e.target.value) }
                      })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Taksit Komisyonları (%)</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {['2', '3', '6', '9', '12'].map((inst) => (
                      <div key={inst} className="space-y-1">
                        <Label className="text-xs">{inst} Taksit</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.commissionRates.installment[inst] || 0}
                          onChange={(e) => setFormData({
                            ...formData,
                            commissionRates: {
                              ...formData.commissionRates,
                              installment: {
                                ...formData.commissionRates.installment,
                                [inst]: parseFloat(e.target.value)
                              }
                            }
                          })}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mt-4">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                İptal
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  'Kaydet'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
