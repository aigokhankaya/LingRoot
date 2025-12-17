# Listening First Marketing Text Update Plan

**Durum:** `PLANLANIYOR`
**Hedef:** LingRoot pazarlama metinlerini "Listening First" stratejisine uygun olarak güncellemek.
**Kısıtlama:** Sayfa tasarımlarına (UI, Layout, CSS) kesinlikle dokunulmayacak. Sadece metin içerikleri değiştirilecek.

---

## 1. i18n.ts Güncellemeleri (Türkçe)

`frontend/src/lib/i18n.ts` dosyasında aşağıdaki anahtarlar güncellenecektir.

| Anahtar (Key) | Eski Değer (Özet) | Yeni Değer |
| :--- | :--- | :--- |
| `landing_hero_badge` | "🎧 Kulağını İngilizceye, Zihnini Dünyaya Aç" | **"🎧 Hayatın Değişmesin, İngilizcen Gelişsin"** |
| `landing_hero_title` | "Sevdiğin Şeyleri Dinle." | **"Rutinlerin İngilizceye Dönsün."** |
| `landing_hero_highlight` | "İngilizceyi Anlayarak Öğren." | **"Sevdiğin İçerikleri Kendi Seviyende Dinle."** |
| `landing_hero_desc` | (Video odaklı açıklama...) | **"YouTube videoları, kitaplar, podcast'ler ve güncel haberler… LingRoot, ilgilendiğin konulardaki içerikleri İngilizce seviyene göre sadeleştirir. Ekstra zaman harcamadan, dinleyerek geliş."** |
| `landing_hero_button_watch` | "Örnekleri İncele" | **"Nasıl Çalıştığını İzle"** |
| `landing_how_step1_title` | "Konunu veya Kitabını Seç" | **"İçeriğini Seç"** |
| `landing_how_step1_desc` | (Blog, tarih konusu vb...) | **"YouTube videosu, Spotify podcast'i, bir haber yazısı… Sadece linki yapıştır veya metni yükle."** |
| `landing_how_step2_title` | "Seviyeni Belirle" | **"Seviyeni Belirle"** |
| `landing_how_step2_desc` | (Seviye açıklaması...) | **"A1'den C2'ye. İçerik, senin anlayabileceğin İngilizceye otomatik olarak çevrilir."** |
| `landing_how_step3_title` | "Modunu Seç ve Dinle" | **"Dinle ve Öğren"** |
| `landing_how_step3_desc` | (Mood ayarı vb...) | **"İçerik yapay zeka tarafından seslendirilir, altyazı eklenir ve seviyene özel hale gelir. Artık sevdiğin şeyleri dinleyerek İngilizce öğrenebilirsin."** |
| `landing_routine_title` | "İngilizceyi Ders Olmaktan Çıkar" | **"Günlük Rutinin = İngilizce Dersin"** |
| `landing_features_item1_title` | "Sonsuz Kütüphane" | **"Gerçek İçerikler"** |
| `landing_trynow_title` | "Hemen Dinlemeye Başla" | **"Başlamak İçin Sadece Link Paylaş"** |
| `landing_cta_title` | "Dinle, Anla, Öğren." | **"İngilizce Öğrenmek İçin Hayatını Değiştirme. Dinlemeye Devam Et."** |

## 2. index.tsx Kontrolleri

*   [ ] `index.tsx` dosyasında `landing_hero_button_watch` butonu bir dialog açıyor ve içinde YouTube videosu (`iframe`) var.
    *   **Karar:** Metin "Nasıl Çalıştığını İzle" olarak güncellendiği için video kalabilir (izleyerek öğrenme mantığına uygun). Tasarıma dokunmama kuralı gereği iframe veya dialog yapısı değiştirilmeyecek.
*   [ ] İkonlar (`step.icon`) `landing_how_step1` için `fas fa-link` olarak ayarlanmış (kodda zaten güncel görünüyor, teyit edilecek).

## 3. Doğrulama Adımları

1.  `i18n.ts` güncellemesi sonrası uygulamanın derlenmesi (`npm run build`).
2.  Landing page'de metinlerin yeni haliyle görünüp görünmediğinin manuel kontrolü (mümkünse).

---

**Not:** İngilizce (`en`) çevirileri için henüz spesifik bir metin seti sağlanmadı. Eğer `i18n.ts` içinde `en` bloğu varsa, Türkçe metinlerin anlamca karşılıkları oraya da yansıtılacak (opsiyonel, aksi belirtilmedikçe sadece tr güncellenecek).
