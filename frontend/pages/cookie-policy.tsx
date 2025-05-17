import React from 'react';

export default function CookiePolicy() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-2xl bg-white rounded-xl shadow-md p-8 text-left">
        <h1 className="text-2xl font-bold text-blue-700 mb-4">Çerezler ve Kullanım Amaçları</h1>
        <p className="text-gray-700 mb-4">
          Web sitemizi daha işlevsel ve kullanıcı dostu hale getirmek için çerezler kullanıyoruz. Bu çerezler şu kategorilere ayrılır:
        </p>
        <ul className="list-disc pl-6 text-gray-700 mb-4">
          <li><b>Zorunlu Çerezler:</b> Oturum yönetimi ve güvenlik için gereklidir.</li>
          <li><b>Analitik Çerezler:</b> Site performansını ve kullanıcı davranışlarını analiz eder.</li>
          <li><b>Fonksiyonel Çerezler:</b> Tercihlerinizi hatırlar (örneğin dil seçimi).</li>
        </ul>
        <p className="text-gray-700">
          Çerez tercihlerinizi tarayıcı ayarlarınızdan dilediğiniz zaman değiştirebilirsiniz.
        </p>
      </div>
    </main>
  );
} 