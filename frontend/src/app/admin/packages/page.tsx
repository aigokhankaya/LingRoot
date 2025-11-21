'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: string;
  is_active: boolean;
  is_trial: boolean;
  features: string[];
  plan_features?: {
    homepage_features?: any;
    voice_models?: any;
    sentence_patterns?: any;
  };
  created_at: string;
  updated_at: string;
}

export default function PackagesPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('lingroot_token');
      const response = await fetch('/api/admin/plans', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setPlans(data.data || []);
      } else {
        setError(data.message || 'Paketler yüklenemedi');
      }
    } catch (e: any) {
      setError(e.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanClick = (planId: string) => {
    router.push(`/admin/packages/${planId}`);
  };

  const handleCreatePlan = () => {
    router.push('/admin/packages/new');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Paket Yönetimi</h1>
            <p className="text-gray-600 mt-2">Abonelik paketlerini yönetin ve özelliklerini düzenleyin</p>
          </div>
          <Button onClick={handleCreatePlan} className="bg-indigo-600 hover:bg-indigo-700">
            <i className="fas fa-plus mr-2"></i>
            Yeni Paket Oluştur
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handlePlanClick(plan.id)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <Badge className={plan.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {plan.is_active ? 'Aktif' : 'Pasif'}
                  </Badge>
                </div>
                <CardDescription className="mt-2">
                  {plan.description || 'Açıklama yok'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-3xl font-bold text-indigo-600">
                      ₺{plan.price}
                    </span>
                    <span className="text-gray-500">
                      /{plan.interval === 'monthly' ? 'ay' : 'yıl'}
                    </span>
                  </div>

                  {plan.is_trial && (
                    <Badge className="bg-primary/10 text-primary">
                      <i className="fas fa-gift mr-1"></i>
                      Deneme Paketi
                    </Badge>
                  )}

                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-600 mb-2">Özellikler:</p>
                    <div className="space-y-1">
                      {plan.features && plan.features.length > 0 ? (
                        plan.features.slice(0, 3).map((feature, idx) => (
                          <div key={idx} className="text-sm text-gray-700 flex items-start">
                            <i className="fas fa-check text-green-500 mr-2 mt-1"></i>
                            <span className="line-clamp-1">{feature}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-400">Özellik tanımlanmamış</p>
                      )}
                    </div>
                    {plan.features && plan.features.length > 3 && (
                      <p className="text-sm text-indigo-600 mt-2">
                        +{plan.features.length - 3} özellik daha
                      </p>
                    )}
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full mt-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlanClick(plan.id);
                    }}
                  >
                    Detayları Görüntüle
                    <i className="fas fa-arrow-right ml-2"></i>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {plans.length === 0 && !loading && (
          <Card className="text-center py-12">
            <CardContent>
              <i className="fas fa-box-open text-gray-400 text-5xl mb-4"></i>
              <p className="text-gray-600 text-lg">Henüz paket oluşturulmamış</p>
              <Button onClick={handleCreatePlan} className="mt-4 bg-indigo-600 hover:bg-indigo-700">
                İlk Paketi Oluştur
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
