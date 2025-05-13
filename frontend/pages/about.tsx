import React from 'react';

export default function About() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-2xl bg-white rounded-xl shadow-md p-8 text-left">
        <h1 className="text-2xl font-bold text-blue-700 mb-4">Dil Öğrenimini Rutinlerine Kat: LingRoot'un Hikayesi</h1>
        <p className="text-gray-700 mb-4">
          LingRoot, geleneksel dil öğrenme yöntemlerine alternatif olarak geliştirilmiş, yapay zeka destekli bir dil edinim platformudur. Amacımız, kullanıcıların zaten günlük yaşamlarında tükettiği içerikleri — YouTube videoları, podcast'ler, haberler, kitaplar gibi — onların İngilizce seviyelerine göre dönüştürerek kişiselleştirilmiş bir öğrenme deneyimi sunmak.
        </p>
        <p className="text-gray-700 mb-4">
          İngilizce öğrenen bireylerin yaşadığı en büyük sorunlardan biri, ilgilerini çeken içerikleri seviyelerine uygun şekilde bulamamalarıdır. LingRoot bu boşluğu doldurur: Seviyene göre hazırlanmış metin ve ses dosyaları sayesinde sıkılmadan, motive olarak ve doğal şekilde İngilizce öğrenebilirsin.
        </p>
        <p className="text-gray-700">
          Bu platform; eğitici değil, dönüştürücüdür. Sevdiğin içerikleri senin seviyene indirir, öğrenmeyi keyifli hale getirir.
        </p>
      </div>
    </main>
  );
} 