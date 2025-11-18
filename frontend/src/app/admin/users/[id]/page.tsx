'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { getUserById } from '@/services/userService';
import type { User } from '@/types/user';
import { Button } from '@/components/ui/button';
import { getApiUrl, createHeaders } from '@/lib/api';

interface Plan {
  id: string;
  name: string;
  price: number;
  interval: string;
}

export default function AdminUserGeneralPage() {
  const params = useParams<{ id: string }>();
  const userId = useMemo(() => (Array.isArray(params?.id) ? params.id[0] : params?.id), [params]);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [assigning, setAssigning] = useState(false);
  const [isTestUser, setIsTestUser] = useState(false);
  const [updatingTestStatus, setUpdatingTestStatus] = useState(false);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        setLoading(true);
        const u = await getUserById(userId);
        setUser(u);
        setIsTestUser((u as any).is_test_user || false);
        
        // Fetch available plans
        const plansRes = await fetch(getApiUrl('admin/plans'), {
          headers: createHeaders('application/json'),
          credentials: 'include',
        });
        const plansData = await plansRes.json();
        console.log('Plans data:', plansData);
        if (plansData.success && plansData.data) {
          const activePlans = plansData.data.filter((p: any) => p.id && p.is_active);
          console.log('Active plans:', activePlans);
          setPlans(activePlans);
        }
      } catch (e: any) {
        setError(e?.message || 'Kullanıcı bilgileri alınamadı');
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const handleAssignPlan = async () => {
    if (!selectedPlanId || !userId) return;
    
    try {
      setAssigning(true);
      const response = await fetch(getApiUrl(`admin/users/${userId}/assign-plan`), {
        method: 'POST',
        headers: createHeaders('application/json'),
        credentials: 'include',
        body: JSON.stringify({ planId: selectedPlanId }),
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Paket başarıyla atandı!');
        setSelectedPlanId('');
      } else {
        alert(data.message || 'Paket ataması başarısız');
      }
    } catch (e: any) {
      alert(e?.message || 'Bir hata oluştu');
    } finally {
      setAssigning(false);
    }
  };

  const handleTestStatusChange = async (checked: boolean) => {
    if (!userId) return;
    
    try {
      setUpdatingTestStatus(true);
      const response = await fetch(getApiUrl(`admin/users/${userId}/test-status`), {
        method: 'PUT',
        headers: createHeaders('application/json'),
        credentials: 'include',
        body: JSON.stringify({ isTestUser: checked }),
      });

      const data = await response.json();
      
      if (data.success) {
        setIsTestUser(checked);
        alert(`Test kullanıcısı durumu başarıyla ${checked ? 'aktif' : 'pasif'} edildi!`);
      } else {
        alert(data.message || 'Test durumu güncellenemedi');
      }
    } catch (e: any) {
      alert(e?.message || 'Bir hata oluştu');
    } finally {
      setUpdatingTestStatus(false);
    }
  };

  if (loading) return <div>Yükleniyor...</div>;
  if (error) return <div className="text-red-600">Hata: {error}</div>;
  if (!user) return <div>Kullanıcı bulunamadı.</div>;

  // Format dates for display
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return String(dateString);
    }
  };

  // Get current subscription info
  const currentSub = (user as any).currentSubscription;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold mb-4">Kullanıcı Bilgileri</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Info label="Ad Soyad" value={user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || '-'} />
          <Info label="E-posta" value={user.email} />
          <Info label="Rol" value={user.role} />
          <Info label="Durum" value={user.isActive ? 'Aktif' : 'Pasif'} />
          <Info label="Kayıt Tarihi" value={String(user.createdAt || '-')} />
          <Info label="Son Giriş" value={String(user.lastLogin || '-')} />
          {user.phoneNumber && <Info label="Telefon" value={user.phoneNumber} />}
        </div>
        
        {/* Test Kullanıcısı Ayarı */}
        <div className="mt-4 p-4 border rounded-lg bg-yellow-50 border-yellow-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isTestUser}
                  onChange={(e) => handleTestStatusChange(e.target.checked)}
                  disabled={updatingTestStatus}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Test Kullanıcısı</span>
                  <p className="text-xs text-gray-600 mt-1">
                    Bu kullanıcı için test ortamını aktif et. Admin panelinde "Mobil Uygulama Ortamı" TEST moduna alındığında, 
                    sadece test kullanıcıları mobilde test backend'e bağlanır.
                  </p>
                </div>
              </label>
            </div>
            {updatingTestStatus && (
              <div className="ml-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mevcut Paket Bilgisi */}
      <div className="border-t pt-6">
        <h2 className="text-lg font-semibold mb-4">Mevcut Paket</h2>
        {currentSub ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-500">Paket Adı</div>
                <div className="text-sm font-medium text-gray-900">{currentSub.plantype || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Durum</div>
                <div className="text-sm font-medium">
                  <span className={`px-2 py-1 rounded text-xs ${
                    currentSub.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {currentSub.status === 'active' ? 'Aktif' : currentSub.status}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Başlangıç Tarihi</div>
                <div className="text-sm font-medium text-gray-900">{formatDate(currentSub.start_date)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Bitiş Tarihi</div>
                <div className="text-sm font-medium text-gray-900">{formatDate(currentSub.end_date)}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600">Kullanıcının aktif bir paketi bulunmamaktadır.</p>
          </div>
        )}
      </div>

      {/* Paket Atama Bölümü */}
      <div className="border-t pt-6">
        <h2 className="text-lg font-semibold mb-4">Paket Tanımlama</h2>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paket Seçin
            </label>
            <select 
              value={selectedPlanId} 
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Bir paket seçin...</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} - ₺{plan.price}/{plan.interval === 'yearly' ? 'yıl' : 'ay'}
                </option>
              ))}
            </select>
          </div>
          <Button 
            onClick={handleAssignPlan} 
            disabled={!selectedPlanId || assigning}
            className="whitespace-nowrap"
          >
            {assigning ? 'Atanıyor...' : 'Paketi Ata'}
          </Button>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Seçilen paket kullanıcıya hemen atanacak ve 1 ay geçerli olacaktır.
        </p>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded border bg-gray-50">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm font-medium text-gray-900 break-all">{value}</div>
    </div>
  );
}
