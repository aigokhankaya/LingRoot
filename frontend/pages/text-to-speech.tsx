import React from 'react';

export default function TextToSpeech() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-2xl bg-white rounded-xl shadow-md p-8 text-left">
        <h1 className="text-2xl font-bold text-primary mb-4">Yazıyı İngilizce Ses Dosyasına Dönüştür</h1>
        <p className="text-gray-700 mb-4">
          Yazdığınız herhangi bir metni, seçtiğiniz İngilizce seviyeye uygun şekilde seslendirin. LingRoot, metni önce İngilizce'ye çevirir, ardından CEFR (A1–C2) düzeyinde sadeleştirerek yüksek kaliteli bir ses dosyası oluşturur.
        </p>
        <div className="mb-4">
          <span className="font-semibold text-gray-800">Özellikler:</span>
          <ul className="list-disc pl-6 text-gray-700">
            <li>A1–C2 arası seviye seçimi</li>
            <li>Doğal sesler (Google TTS veya Amazon Polly destekli)</li>
            <li>Konuşma hızı ayarı (0.7x – 1.2x)</li>
          </ul>
        </div>
        <p className="text-gray-700">
          Bu araç sayesinde kendi cümlelerinizi duyabilir, okuma ve dinleme becerilerinizi geliştirebilirsiniz.
        </p>
      </div>
    </main>
  );
} 