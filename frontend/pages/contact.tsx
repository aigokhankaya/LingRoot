import React from 'react';

export default function Contact() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-2xl bg-white rounded-xl shadow-md p-8 text-left">
        <h1 className="text-2xl font-bold text-blue-700 mb-4">Bizimle İletişime Geçin</h1>
        <p className="text-gray-700 mb-4">
          LingRoot ile ilgili soru, öneri veya geri bildirimleriniz bizim için çok değerli. Aşağıdaki formu kullanarak bizimle doğrudan iletişime geçebilirsiniz.
        </p>
        <p className="text-gray-700 mb-2">
          Alternatif olarak bize şu e-posta adresinden de ulaşabilirsiniz:
        </p>
        <p className="font-semibold text-blue-600 mb-4">support@lingroot.com</p>
        <p className="text-gray-500 text-sm">Ortalama yanıt süremiz: 1 iş günü</p>
        {/* İletişim formu eklemek istersen buraya ekleyebilirsin */}
      </div>
    </main>
  );
} 