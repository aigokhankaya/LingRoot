import React from 'react';

export default function Pronunciation() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-2xl bg-white rounded-xl shadow-md p-8 text-left">
        <h1 className="text-2xl font-bold text-blue-700 mb-4">Telaffuzunu Geliştir</h1>
        <p className="text-gray-700 mb-4">
          LingRoot'un telaffuz egzersizleriyle konuşma becerilerinizi geliştirin. Sistem, seçtiğiniz kelimeleri veya cümleleri sizin seviyenize uygun şekilde seslendirir. Siz de sesli tekrar ederek uygulamalı öğrenme sürecine katılırsınız.
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
  );
} 