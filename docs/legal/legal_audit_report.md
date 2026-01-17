# LingRoot Yasal Doküman ve Uyum Raporu

> **Oluşturulma:** 2026-01-16 | **Durum:** Draft | **Versiyon:** 1.1
> **Hazırlayan:** AI Legal Assistant

Bu rapor, LingRoot projesinin (Web ve Mobil) mevcut yasal dokümanlarının detaylı analizini, risk puanlamasını ve eylem planını içerir.

## 1. Yönetici Özeti

*   **Genel Puan:** 6.5/10
*   **En Güçlü Yön:** Web tarafında (`i18n.ts`) hazırlanan KVKK ve Telif metinleri oldukça profesyonel ve koruyucu.
*   **En Kritik Risk:** Türkiye'de zorunlu olan **Mesafeli Satış Sözleşmesi** eksik. Web Privacy sayfası boş.

---

## 2. Yasal Uyum ve Risk Matrisi

Aşağıdaki tablo, mevcut dokümanların durumunu, eksik yönlerini (Riskler) ve beklentinin üzerindeki iyi yönlerini (Artılar) puanlayarak özetler.

| Yasal Gereklilik / Doküman | Platform | Puan (1-10) | Mevcut Durum | Eksikler (Riskler) | Artılar (Güçlü Yönler) |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **Privacy Policy** | Mobil | 🟡 **7** | `PrivacyPolicyScreen.tsx` içinde hardcoded metin. | • Ses biyometrisi ve işleme izni detayı zayıf.<br>• Güncelleme için App Store onayı gerekiyor (Remote değil). | • OpenAI ve Google API kullanımı açıkça belirtilmiş.<br>• İki dilli (TR/EN) yapı kurulu. |
| **Privacy Policy** | Web | 🔴 **2** | `privacy.tsx` sayfası boş (Placeholder). | • **Kritik:** Sayfa UI'da görünmüyor.<br>• Kullanıcı erişemiyor. | • **Arka Planda Hazır:** `i18n.ts` içindeki metin çok kapsamlı (Veri Sorumlusu, Saklama Süreleri vs. tam not). |
| **Terms of Service** | Mobil | 🟡 **7** | `TermsOfServiceScreen.tsx` içinde hardcoded metin. | • "Kullanıcı Yüklemeleri" (Input Liability) maddesi yüzeysel.<br>• AI Yanılsaması (Hallucination) reddi eksik. | • Abonelik, İptal ve İade (Apple üzerinden) süreçleri çok net.<br>• Yasaklı aktiviteler iyi tanımlanmış. |
| **Terms of Service** | Web | 🟢 **8** | `i18n.ts` içinde metin mevcut. | • AI Hallucination disclaimer maddesi daha belirgin olmalı. | • **Mükemmel Koruma:** "PDF Yüklemeleri" için sorumluluk reddi maddesi (Section 3) çok güçlü yazılmış. |
| **Cookie Policy** | Web | 🟢 **9** | `i18n.ts` içinde mevcut. | • Consent Banner (Çerez Onay Pop-up'ı) implementation kontrol edilmeli. | • Çerez türleri (Zorunlu, Analitik vb.) detaylıca açıklanmış. |
| **Mesafeli Satış Sözleşmesi** | Web | 🔴 **0** | **EKSİK** | • **Yasal Suç:** ETBİS ve Tüketici Kanunu gereği zorunlu.<br>• Ödeme sırasında onaylatılmıyor. | *Yok* |
| **Ön Bilgilendirme Formu** | Web | 🔴 **0** | **EKSİK** | • Satış öncesi gösterim eksik. | *Yok* |
| **AI Output Disclaimer** | Ortak | 🟠 **4** | Kısmen (Terms içinde dağınık). | • "AI tavsiyeleri profesyonel tavsiye değildir" uyarısı net değil.<br>• Çıktı doğruluğu garantisi reddi zayıf. | • Web Terms içinde kısmi "Sorumluluk Reddi" var. |
| **User Input Liability** | Ortak | 🟡 **6** | Web'de iyi, Mobilde zayıf. | • Mobil tarafta kullanıcının yüklediği kitaptan doğacak telif cezası riski şirkette kalabilir. | • Web metninde kullanıcı sorumluluğu net olarak çizilmiş. |

---

## 3. Yapay Zeka Risk Analizi (Detay)

| Risk Başlığı | Açıklama | Öneri |
| :--- | :--- | :--- |
| **AI Hallucination (Yanılsama)** | Yapay zekanın ürettiği çeviri veya özetin yanlış bilgi içermesi. | **Madde Ekle:** "Hizmetin ürettiği çıktılar %100 doğruluk garanti etmez. Kullanıcı doğrulamakla yükümlüdür." |
| **Telif Hakkı İhlali (Input)** | Kullanıcının sisteme korsan PDF veya kitap yüklemesi. | **Mobil Eşitleme:** Web'deki Section 3 maddesini ("Kullanıcı tek sorumludur" beyanı) Mobile de ekle. |
| **Veri Mahremiyeti (Voice)** | Kullanıcının ses klonlama için yüklediği sesin izinsiz kullanımı korkusu. | **Açık Rıza:** "Ses verileriniz sadece size hizmet vermek için işlenir, 3. kişilerle paylaşılmaz" garantisini Privacy Policy'de vurgula. |

---

## 4. Aksiyon Planı

### Faz 1: Acil (Bugün)
1.  **Web Privacy:** `privacy.tsx` sayfasını `i18n.ts` verileriyle doldur.
2.  **Mesafeli Satış:** Ödeme sayfasına standart "Mesafeli Satış Sözleşmesi" metni ve checkbox ekle.
3.  **Mobil Güncelleme:** Web'deki güçlü metinleri (`i18n.ts`) Mobil taraftaki `TermsOfServiceScreen` ve `PrivacyPolicyScreen` dosyalarına kopyala.

### Faz 2: Stratejik
1.  **Tek Kaynak (Single Source):** Tüm yasal metinleri Backend API üzerinden sun. Web ve Mobil aynı endpoint'i (`/api/legal/terms`) kullansın.
2.  **Consent Manager:** Web için KVKK uyumlu Çerez Yönetim Modülü ekle.
