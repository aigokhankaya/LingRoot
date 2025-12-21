# Landing Page Refinement Plan (YouTube & LiRo)

**Durum:** `PLANLANIYOR`
**Hedef:** Ana sayfadaki "YouTube" vurgusunu azaltmak ve "LiRo" (AI Assistant) özelliğini tanıtmak.
**Kısıtlama:** Tasarım/Layout değişikliği yapılmayacak. Sadece metin ve ikon güncellemeleri yapılacak.

---

## 1. i18n.ts Güncellemeleri (Türkçe)

`frontend/src/lib/i18n.ts` dosyasında aşağıdaki anahtarlar güncellenecektir.

| Bölüm | Anahtar | Eski Değer (Özet) | Yeni Değer |
| :--- | :--- | :--- | :--- |
| **Hero** | `landing_hero_desc` | "YouTube videoları, kitaplar..." | **"Dijital içerikler, kitaplar, podcast'ler ve güncel haberler… LingRoot, ilgilendiğin konulardaki içerikleri İngilizce seviyene göre sadeleştirir. Ekstra zaman harcamadan, dinleyerek geliş."** (YouTube kelimesi kaldırıldı/iması azaltıldı) |
| **Features** | `landing_features_item2_title` | "Kişiselleştirme" (veya benzeri) | **"LiRo: Kişisel Asistanın"** |
| **Features** | `landing_features_item2_desc` | (Eski açıklama) | **"Ne öğrenmek istediğini söylemen yeterli. LiRo, senin için en ilgi çekici içerikleri bulur, seviyene göre hazırlar ve gelişimini takip eder."** |

## 2. index.tsx Güncellemeleri

*   **Özellik İkonu Değişikliği:**
    *   `featuresList` dizisindeki 2. elemanın (index 1) ikonu `fas fa-user-cog` yerine **`fas fa-robot`** (veya `fa-sparkles` / `fa-magic`) olarak güncellenecek.
    *   Bu, LiRo'nun "AI/Asistan" kimliğini görsel olarak destekleyecek.

## 3. Doğrulama

1.  Uygulamanın derlenmesi (`npm run build`).
2.  Ana sayfada hero açıklamasının "YouTube" ile başlamadığının teyidi.
3.  "Özellikler" bölümünde "LiRo" başlığının ve yeni açıklamanın göründüğünün teyidi.
4.  İlgili ikonun (robot) düzgün göründüğünün kontrolü.
