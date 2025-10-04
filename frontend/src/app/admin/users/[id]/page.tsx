'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { getUserById } from '@/services/userService';
import type { User } from '@/types/user';
import { Button } from '@/components/ui/button';

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

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        setLoading(true);
        const u = await getUserById(userId);
        setUser(u);
        
        // Fetch available plans
        const plansRes = await fetch('/api/admin/plans', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const plansData = await plansRes.json();
        if (plansData.success && plansData.data) {
          setPlans(plansData.data.filter((p: Plan) => p.id));
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
      const response = await fetch(`/api/admin/users/${userId}/assign-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
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

  if (loading) return <div>Yükleniyor...</div>;
  if (error) return <div className="text-red-600">Hata: {error}</div>;
  if (!user) return <div>Kullanıcı bulunamadı.</div>;

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
