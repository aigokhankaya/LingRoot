'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface PromotionData {
  promotion_active: boolean;
  promotion_discount_percentage: string;
  promotion_original_price: string;
  promotion_price: string;
  promotion_start_date: string;
  promotion_end_date: string;
  promotion_badge_text: string;
  promotion_description: string;
}

interface PromotionSectionProps {
  data: PromotionData;
  onChange: (data: PromotionData) => void;
}

export default function PromotionSection({ data, onChange }: PromotionSectionProps) {
  const update = (field: keyof PromotionData, value: string | boolean) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <i className="fas fa-tags mr-2 text-orange-500"></i>
          Promosyon Ayarlari
        </CardTitle>
        <CardDescription>
          Kampanya gosterim bilgilerini duzenleyin. Gercek fiyatlandirma App Store Connect / Google Play Console uzerinden yapilmalidir.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="promotion_active"
            checked={data.promotion_active}
            onChange={(e) => update('promotion_active', e.target.checked)}
          />
          <Label htmlFor="promotion_active">Promosyon Aktif</Label>
        </div>

        {data.promotion_active && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="promotion_discount_percentage">Indirim Yuzdesi (%)</Label>
                <Input
                  id="promotion_discount_percentage"
                  type="number"
                  min="0"
                  max="100"
                  value={data.promotion_discount_percentage}
                  onChange={(e) => update('promotion_discount_percentage', e.target.value)}
                  placeholder="Orn: 50"
                />
              </div>
              <div>
                <Label htmlFor="promotion_badge_text">Rozet Metni</Label>
                <Input
                  id="promotion_badge_text"
                  value={data.promotion_badge_text}
                  onChange={(e) => update('promotion_badge_text', e.target.value)}
                  placeholder="Orn: %50 Indirim!"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="promotion_original_price">Orijinal Fiyat (TRY)</Label>
                <Input
                  id="promotion_original_price"
                  type="number"
                  step="0.01"
                  value={data.promotion_original_price}
                  onChange={(e) => update('promotion_original_price', e.target.value)}
                  placeholder="Orn: 299"
                />
              </div>
              <div>
                <Label htmlFor="promotion_price">Indirimli Fiyat (TRY)</Label>
                <Input
                  id="promotion_price"
                  type="number"
                  step="0.01"
                  value={data.promotion_price}
                  onChange={(e) => update('promotion_price', e.target.value)}
                  placeholder="Orn: 149"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="promotion_start_date">Baslangic Tarihi</Label>
                <Input
                  id="promotion_start_date"
                  type="date"
                  value={data.promotion_start_date}
                  onChange={(e) => update('promotion_start_date', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="promotion_end_date">Bitis Tarihi</Label>
                <Input
                  id="promotion_end_date"
                  type="date"
                  value={data.promotion_end_date}
                  onChange={(e) => update('promotion_end_date', e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="promotion_description">Promosyon Aciklamasi (Opsiyonel)</Label>
              <Textarea
                id="promotion_description"
                value={data.promotion_description}
                onChange={(e) => update('promotion_description', e.target.value)}
                placeholder="Kampanya detaylari..."
                rows={2}
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded text-sm">
              <i className="fas fa-info-circle mr-2"></i>
              Bu bilgiler sadece gosterim amaclidir. Gercek indirimli fiyatlandirma App Store Connect ve/veya Google Play Console uzerinden ayarlanmalidir.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
