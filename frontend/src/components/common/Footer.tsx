import React from 'react';

const footerSections = [
  {
    title: 'Hakkında (About)',
    content: (
      <>
        <b>Dil Öğrenimini Rutinlerine Kat: LingRoot'un Hikayesi</b><br />
        LingRoot, geleneksel dil öğrenme yöntemlerine alternatif olarak geliştirilmiş, yapay zeka destekli bir dil edinim platformudur. Amacımız, kullanıcıların zaten günlük yaşamlarında tükettiği içerikleri — YouTube videoları, podcast'ler, haberler, kitaplar gibi — onların İngilizce seviyelerine göre dönüştürerek kişiselleştirilmiş bir öğrenme deneyimi sunmak.<br /><br />
        İngilizce öğrenen bireylerin yaşadığı en büyük sorunlardan biri, ilgilerini çeken içerikleri seviyelerine uygun şekilde bulamamalarıdır. LingRoot bu boşluğu doldurur: Seviyene göre hazırlanmış metin ve ses dosyaları sayesinde sıkılmadan, motive olarak ve doğal şekilde İngilizce öğrenebilirsin.<br /><br />
        Bu platform; eğitici değil, dönüştürücüdür. Sevdiğin içerikleri senin seviyene indirir, öğrenmeyi keyifli hale getirir.
      </>
    ),
  },
  {
    title: 'İletişim (Contact)',
    content: (
      <>
        <b>Bizimle İletişime Geçin</b><br />
        LingRoot ile ilgili soru, öneri veya geri bildirimleriniz bizim için çok değerli. Aşağıdaki formu kullanarak bizimle doğrudan iletişime geçebilirsiniz.<br /><br />
        Alternatif olarak bize şu e-posta adresinden de ulaşabilirsiniz:<br />
        <span className="font-semibold text-blue-300">support@lingroot.com</span><br />
        Ortalama yanıt süremiz: 1 iş günü
      </>
    ),
  },
  {
    title: 'Gizlilik Politikası (Privacy Policy)',
    content: (
      <>
        <b>Kişisel Verilerinize Saygılıyız</b><br />
        LingRoot, kullanıcılarının gizliliğini ve veri güvenliğini en üst düzeyde korumayı taahhüt eder. Platformu kullanırken bize sağladığınız bilgiler (e-posta adresiniz, içerik geçmişiniz gibi) hiçbir şekilde üçüncü taraflarla paylaşılmaz.<br /><br />
        Veri işlemleri, Avrupa Birliği Genel Veri Koruma Tüzüğü (GDPR) ve Türkiye'deki KVKK hükümlerine uygundur.<br /><br />
        Kullanıcılar, diledikleri zaman verilerini silebilir veya hesaplarını kapatarak sistemden tamamen ayrılabilirler.
      </>
    ),
  },
  {
    title: 'Kullanım Şartları (Terms of Service)',
    content: (
      <>
        <b>Platform Kullanım Kuralları</b><br />
        LingRoot'a erişerek, aşağıdaki şartları kabul etmiş sayılırsınız:<br /><br />
        Platform yalnızca kişisel öğrenme amaçlı kullanılabilir.<br />
        Yasadışı, nefret söylemi içeren veya telif hakkı ihlali oluşturan içerikler yüklenemez.<br />
        Hesabınızın güvenliğinden siz sorumlusunuz. Şüpheli girişlerde destek ekibimize bildirmeniz beklenir.<br />
        LingRoot, gerekli gördüğü durumlarda kullanıcı hesaplarını askıya alma ya da kapatma hakkını saklı tutar.
      </>
    ),
  },
  {
    title: 'Çerez Politikası (Cookie Policy)',
    content: (
      <>
        <b>Çerezler ve Kullanım Amaçları</b><br />
        Web sitemizi daha işlevsel ve kullanıcı dostu hale getirmek için çerezler kullanıyoruz. Bu çerezler şu kategorilere ayrılır:<br /><br />
        <b>Zorunlu Çerezler:</b> Oturum yönetimi ve güvenlik için gereklidir.<br />
        <b>Analitik Çerezler:</b> Site performansını ve kullanıcı davranışlarını analiz eder.<br />
        <b>Fonksiyonel Çerezler:</b> Tercihlerinizi hatırlar (örneğin dil seçimi).<br /><br />
        Çerez tercihlerinizi tarayıcı ayarlarınızdan dilediğiniz zaman değiştirebilirsiniz.
      </>
    ),
  },
  {
    title: 'Metinden Sese (Text to Speech)',
    content: (
      <>
        <b>Yazıyı İngilizce Ses Dosyasına Dönüştür</b><br />
        Yazdığınız herhangi bir metni, seçtiğiniz İngilizce seviyeye uygun şekilde seslendirin. LingRoot, metni önce İngilizce'ye çevirir, ardından CEFR (A1–C2) düzeyinde sadeleştirerek yüksek kaliteli bir ses dosyası oluşturur.<br /><br />
        <b>Özellikler:</b><br />
        A1–C2 arası seviye seçimi<br />
        Doğal sesler (Google TTS veya Amazon Polly destekli)<br />
        Konuşma hızı ayarı (0.7x – 1.2x)<br /><br />
        Bu araç sayesinde kendi cümlelerinizi duyabilir, okuma ve dinleme becerilerinizi geliştirebilirsiniz.
      </>
    ),
  },
  {
    title: 'Telaffuz (Pronunciation)',
    content: (
      <>
        <b>Telaffuzunu Geliştir</b><br />
        LingRoot'un telaffuz egzersizleriyle konuşma becerilerinizi geliştirin. Sistem, seçtiğiniz kelimeleri veya cümleleri sizin seviyenize uygun şekilde seslendirir. Siz de sesli tekrar ederek uygulamalı öğrenme sürecine katılırsınız.<br /><br />
        <b>Özellikler:</b><br />
        Dinle → Tekrar et → Kaydet modeline dayalı egzersizler<br />
        Otomatik örnek cümle üretimi<br />
        Seviye bazlı yapılandırma
      </>
    ),
  },
  {
    title: 'Kelime Hazinesi (Vocabulary)',
    content: (
      <>
        <b>Kelime Dağarcığını Takip Et ve Geliştir</b><br />
        LingRoot, öğrenmekte olduğunuz kelimeleri kaydedip listelemenize imkân tanır. Bu özellik sayesinde kendi kişisel kelime defterinizi oluşturabilir, tekrar sıklığını ayarlayabilir ve gelişiminizi izleyebilirsiniz.<br /><br />
        <b>Özellikler:</b><br />
        Kelime ekle, sil, kategoriye ayır<br />
        Telaffuzla birlikte sesli tekrar<br />
        Sık tekrar edilen kelimeler için "öncelik" sistemi
      </>
    ),
  },
];

const Footer: React.FC = () => (
  <footer className="bg-gray-900 text-white py-12 px-4">
    <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
      {footerSections.map((section, idx) => (
        <div key={idx} className="bg-gray-800 rounded-lg p-5 shadow-md text-left">
          <div className="font-bold text-blue-300 mb-2 text-lg">{section.title}</div>
          <div className="text-gray-200 text-sm leading-relaxed">{section.content}</div>
        </div>
      ))}
    </div>
    <div className="text-center text-sm text-gray-500 border-t border-gray-700 pt-6">
      <span className="font-bold text-lg text-white">LingRoot</span>
      <span className="mx-2">|</span>
      <span className="text-gray-400">AI-powered English Learning</span>
      <br />
      © 2025 LingRoot. Tüm hakları saklıdır.
    </div>
  </footer>
);

export default Footer; 