import AppHeader from '@/components/AppHeader';
import React from 'react';

export default function Pronunciation() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <main className="flex items-center justify-center p-8 min-h-[calc(100vh-64px)]">
        <div className="max-w-2xl bg-white rounded-xl shadow-md p-8 text-left">
          <h1 className="text-2xl font-bold text-primary mb-4">Telaffuzunu Geliştir</h1>
          <p className="text-gray-700 mb-4">
            LingRoot&apos;un telaffuz egzersizleriyle konuşma becerilerinizi geliştirin. Sistem, seçtiğiniz kelimeleri veya cümleleri sizin seviyenize uygun şekilde seslendirir. Siz de sesli tekrar ederek uygulamalı öğrenme sürecine katılırsınız.
          </p>
          <div className="mb-4">
            <span className="font-semibold text-gray-800">Özellikler:</span>
            <ul className="list-disc pl-6 text-gray-700">
              <li>Dinle → Tekrar et → Kaydet modeline dayalı egzersizler</li>
              <li>Otomatik örnek cümle üretimi</li>
              <li>Seviye bazlı yapılandırma</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}