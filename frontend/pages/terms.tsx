import React from 'react';

export default function Terms() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-2xl bg-white rounded-xl shadow-md p-8 text-left">
        <h1 className="text-2xl font-bold text-blue-700 mb-4">Platform Kullanım Kuralları</h1>
        <p className="text-gray-700 mb-4">
          LingRoot'a erişerek, aşağıdaki şartları kabul etmiş sayılırsınız:
        </p>
        <ul className="list-disc pl-6 text-gray-700 mb-4">
          <li>Platform yalnızca kişisel öğrenme amaçlı kullanılabilir.</li>
          <li>Yasadışı, nefret söylemi içeren veya telif hakkı ihlali oluşturan içerikler yüklenemez.</li>
          <li>Hesabınızın güvenliğinden siz sorumlusunuz. Şüpheli girişlerde destek ekibimize bildirmeniz beklenir.</li>
          <li>LingRoot, gerekli gördüğü durumlarda kullanıcı hesaplarını askıya alma ya da kapatma hakkını saklı tutar.</li>
        </ul>
      </div>
    </main>
  );
} 