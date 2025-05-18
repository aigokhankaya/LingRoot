import React from 'react';

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-2xl bg-white rounded-xl shadow-md p-8 text-left">
        <h1 className="text-2xl font-bold text-blue-700 mb-4">Kişisel Verilerinize Saygılıyız</h1>
        <p className="text-gray-700 mb-4">
          LingRoot, kullanıcılarının gizliliğini ve veri güvenliğini en üst düzeyde korumayı taahhüt eder. Platformu kullanırken bize sağladığınız bilgiler (e-posta adresiniz, içerik geçmişiniz gibi) hiçbir şekilde üçüncü taraflarla paylaşılmaz.
        </p>
        <p className="text-gray-700 mb-4">
          Veri işlemleri, Avrupa Birliği Genel Veri Koruma Tüzüğü (GDPR) ve Türkiye'deki KVKK hükümlerine uygundur.
        </p>
        <p className="text-gray-700">
          Kullanıcılar, diledikleri zaman verilerini silebilir veya hesaplarını kapatarak sistemden tamamen ayrılabilirler.
        </p>
      </div>
    </main>
  );
} 