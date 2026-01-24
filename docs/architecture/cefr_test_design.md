# 🎓 CEFR Tabanlı Adaptif Kelime Seviye Tespit Sistemi Tasarımı

Bu doküman, kullanıcının İngilizce kelime bilgisini (Vocabulary Size) akademik standartlara (CEFR) uygun, güvenilir ve modern bir yöntemle ölçmek için tasarlanan sistemi açıklar.

## 1. Bilimsel Temel ve Metodoloji

Geleneksel "Biliyorum/Bilmiyorum" testleri güvenilmezdir (kullanıcı yanılabilir veya tahmin edebilir). Bu sistem, **Computerized Adaptive Testing (CAT)** ve **Item Response Theory (IRT)** prensiplerini basitleştirilmiş bir modelle uygular.

### Temel Prensipler
1.  **CEFR Uyumluluğu:** Kelimeler, Oxford 3000™ ve Oxford 5000™ listelerinden seçilir. Bu listeler, A1'den C2'ye kadar kelimelerin önem derecesine ve kullanım sıklığına göre sınıflandırıldığı altın standarttır.
2.  **Adaptif Zorluk (CAT):** Test, kullanıcının cevaplarına göre anlık olarak zorlaşır veya kolaylaşır.
    *   *Doğru cevap* → Daha yüksek seviyeden soru.
    *   *Yanlış cevap* → Daha düşük seviyeden soru.
3.  **Güvenilirlik Kontrolü:** Sadece "Biliyorum" demek yetmez; kelimenin anlamını çoktan seçmeli (veya eşanlamlı/zıt anlamlı) olarak doğrulaması gerekir.

---

## 2. Test Formatı

*   **Toplam Soru Sayısı:** 20-25 Soru (Rastgele değil, stratejik seçim).
*   **Soru Tipi:** Çoktan Seçmeli (4 Şık).
    *   **Soru:** Hedef Kelime (örn: *Comprehensive*)
    *   **Şıklar:** 1 Doğru Anlam, 3 Çeldirici (Distractor). Çeldiriciler aynı kelime türünden (sıfat ise sıfat) seçilir.
*   **Süre:** Soru başına max 15-20 saniye (Hızlı tanıma esastır).

---

## 3. Algoritma (Akış Diyagramı)

Sistem "Binary Search" benzeri bir yaklaşımla kullanıcının seviyesini daraltır.

1.  **Başlangıç:** Test **B1** seviyesinden başlar. (Orta nokta)
2.  **Döngü:**
    *   Kullanıcıya mevcut tahmini seviyesinden bir soru sorulur.
    *   **Doğru:** Puan artar, sonraki soru bir üst seviyeden veya aynı seviyenin daha zorundandır.
    *   **Yanlış:** Puan sabit kalır/düşer, sonraki soru bir alt seviyeden sorulur.
3.  **Sonlandırma Kriteri:**
    *   Belirli soru sayısına (25) ulaşıldığında.
    *   VEYA kullanıcının seviye sapması (standard error) belirli bir eşiğin altına düştüğünde (seviye netleştiğinde).

---

## 4. Veri Havuzu (Database Schema)

Testin çalışması için `vocabulary_placement_test_questions` adında zengin bir veri seti gereklidir.

```json
/* Örnek Soru Yapısı */
{
  "id": "q_101",
  "word": "Inevitable",
  "level": "B2",
  "correct_meaning": "Kaçınılmaz, olması muhakkak",
  "distractors": [
    "İsteğe bağlı, keyfi",
    "Karmaşık, anlaşılmaz",
    "Geçici, süreli"
  ]
}
```

### Hedef Kelime Havuzu Dağılımı (Minimum MVP)
*   **A1:** 20 Soru
*   **A2:** 30 Soru
*   **B1:** 40 Soru
*   **B2:** 40 Soru
*   **C1:** 30 Soru
*   **C2:** 20 Soru
*   **Toplam:** ~180 Soru (Havuz ne kadar genişse tekrar o kadar az olur ve test güvenilirliği artar).

---

## 5. Puanlama ve Sonuç

Test sonunda kullanıcıya sadece "B2" denmez, detaylı bir analiz sunulur:

| CEFR Seviyesi | Tahmini Kelime Hazinesi | Tanım |
| :--- | :--- | :--- |
| **A1** | < 1000 kelime | Temel iletişim, basit cümleler. |
| **A2** | 1000 - 2000 | Günlük rutinler, basit açıklamalar. |
| **B1** | 2000 - 3000 | Seyahat, iş, ilgi alanları hakkında konuşma. |
| **B2** | 3000 - 4000 | Akıcı konuşma, karmaşık metinleri anlama. |
| **C1** | 4000 - 5000 | Esnek ve etkili dil kullanımı, akademik yeterlilik. |
| **C2** | > 5000 | Anadil seviyesine yakın, nüansları anlama. |

---

## 6. Uygulama Entegrasyonu

1.  **Testi Başlat:** `/progress` veya `/vocabulary` sayfasından tetiklenir.
2.  **Sonucu Kaydet:** `user_profiles` tablosuna `cefr_level` ve `vocabulary_size_estimate` olarak işlenir.
3.  **İçerik Öner:**
    *   Roadmap bu seviyeye göre güncellenir.
    *   Önerilen makaleler/videolar bu seviyeye (+1 Input Hypothesis - kullanıcının bir tık üstü) göre filtrelenir.

## 7. Geliştirme Yol Haritası

1.  ✅ Tasarım Dokümanı (Bu dosya).
2.  ⬜ Kelime Havuzu JSON'ının Oluşturulması (A1-C2).
3.  ⬜ `PlacementTestService` Backend Servisinin Yazılması.
4.  ⬜ Frontend Adaptive Quiz Arayüzü Uygulaması.
5.  ⬜ Roadmap Entegrasyonu.
