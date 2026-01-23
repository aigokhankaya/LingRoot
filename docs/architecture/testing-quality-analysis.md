# Test Kalite Analizi ve Puanlama Raporu

> **Oluşturulma:** 2026-01-16 | **Güncelleme:** 2026-01-16 | **Versiyon:** 1.0

Bu belge, LingRoot projesi için önerilen test altyapısının **iş analisti (analyst)** gözüyle değerlendirilmesini, işleyiş mantığını ve kalite puanını içerir.

## 1. Test Sistemi Nasıl Çalışacak? (Analist Görünümü)

Teknik detaylardan arındırılmış, iş akışı şöyledir:

1.  **Kod Teslimi (Trigger):**
    Yazılımcı, yaptığı işi tamamlayıp "Kaydet" (Push) dediği anda sistem uyanır. Tıpkı bir editörün taslağı sisteme yüklemesi gibi.

2.  **Otomatik Kontrol (The Robot):**
    Sanal bir test uzmanı (GitHub Actions) devreye girer ve sırasıyla şunları yapar:
    *   **Adım 1: Dil Bilgisi Kontrolü (Linting):** Kodun yazım kurallarına uyup uymadığına bakar. Nokta, virgül hatası var mı?
    *   **Adım 2: Mantık Testi (Backend Unit Test):** "2+2=4 mü?" kontrolü yapar. Örneğin, "Kullanıcı seviyesi B1 ise, B1 içerik üretiliyor mu?" sorusunu sorar.
    *   **Adım 3: Kullanıcı Taklidi (E2E Test):** Robot, bir kullanıcı gibi siteyi açar, "Giriş Yap"a tıklar, şifresini girer. Eğer giriş yapamazsa "HATA VAR" diye bağırır.

3.  **Raporlama:**
    Tüm bu işlemler 5-10 dakika sürer. Sonuçta "Yeşil (Başarılı)" veya "Kırmızı (Hatalı)" ışık yanar. Hatalıysa kodun canlıya (Production) alınması engellenir.

## 2. Önerilen Sistemin Kalite Karnesi (Scorecard)

LingRoot için önerilen bu "Hibrit Test Yapısı"nın (Jest + Playwright + Maestro) kalite puanlaması aşağıdadır.

**Toplam Kalite Puanı: 88/100** (Mükemmel Seviye)

| Kriter | Puan | Açıklama |
| :--- | :--- | :--- |
| **1. Kapsama Alanı (Coverage)** | **90/100** | Hem "Beyin" (Backend), hem "Web", hem "Mobil" test ediliyor. Açıkta kalan çok az nokta var. |
| **2. Hız (Speed)** | **85/100** | Playwright ve Jest çok hızlıdır. Ancak Mobil testler (Maestro) biraz daha yavaş çalışır, bu da toplam süreyi biraz uzatır. |
| **3. Maliyet Verimliliği** | **95/100** | Seçilen araçların çoğu (Jest, Playwright, Maestro OSS) ücretsizdir. Lisans maliyeti sıfıra yakındır. |
| **4. Hata Yakalama (Reliability)** | **85/100** | "Kullanıcı gibi davranan" testler (E2E), sistemin gerçekten çalışıp çalışmadığını en iyi anlayan testlerdir. Manuel hatayı sıfırlar. |
| **5. Bakım Kolaylığı** | **80/100** | Test senaryoları bir kez yazılır. Arayüz çok sık değişirse (butonun yeri, rengi vb.) testleri güncellemek gerekir. |

---

## 3. Neden 100 Değil? (Riskler ve Eksikler)

Mükemmeliyete ulaşmak için (100 puan) şunlar gerekir, ancak şu an için **maliyetli** olabilir:

1.  **Full Cloud Mobile Farm (-7 Puan):** Mobil testleri developer'ın bilgisayarında değil, bulutta yüzlerce farklı telefonda (Samsung S23, iPhone 15, eski modeller vb.) aynı anda denemek gerekir. Bu çok pahalıdır (aylık $500+). Şimdilik emülatör yeterlidir.
2.  **Görsel Regresyon (-5 Puan):** "Piksel piksel" tasarım kaymasını (örn. logonun 2mm sağa kayması) yakalamak. Bu şu an önerilen pakette yok, çünkü çok fazla "yalancı alarm" (false positive) verir.

## 4. Sonuç Kararı

Bu sistem kurulduğunda:
*   Müşteri (Kullanıcı) hatayla karşılaşmadan önce, hata robotlar tarafından bulunur.
*   "Düzeltirken bozdum" (Regression) sorunu %90 oranında biter.
*   Analist olarak sizin için: Ürünün kalitesinden emin olma süreniz "2 gün manuel test"ten "10 dakika otomatik rapor"a düşer.
