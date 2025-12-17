# Listening First Marketing Strategy Migration Plan

**Durum:** `PLANLANDI`  
**Tarih:** 13.12.2025  
**Konu:** LingRoot pazarlama stratejisinin YouTube odaklılıktan "Anlayarak Dinleme (Listening Comprehension)" ve "İçerik Küratörlüğü"ne geçişi.

---

## 1. Genel Strateji Özeti
*   **Eski Odak:** YouTube videolarını İngilizce öğrenme materyaline çeviren araç.
*   **Yeni Odak:** "Listening First" yaklaşımı. Kitap, makale, haber ve podcast gibi her türlü içeriği kullanıcının seviyesine (A1-C2) indiren kişisel yapay zeka asistanı.
*   **Kural:** YouTube artık sadece bir "Input Method" (girdi yöntemi) olarak kalacak, pazarlama vitrininde yer almayacak.

---

## 2. i18n Metin Değişiklikleri (Slogan & Mesajlar)

Aşağıdaki tabloda `frontend/src/lib/i18n.ts` dosyasında yapılacak spesifik değişiklikler listelenmiştir.

| Anahtar (Key) | Eski İfade (Old) | Yeni İfade (New) | Amaç |
| :--- | :--- | :--- | :--- |
| `landing_hero_badge` | "🎧 Kulağını İngilizceye, Zihnini Dünyaya Aç" | **"🎧 Hayatın Değişmesin, İngilizcen Gelişsin"** | Kullanıcıya ekstra çaba gerektirmediğini vurgulamak. |
| `landing_hero_title` | "Sevdiğin Şeyleri Dinle." | **"Rutinlerin İngilizceye Dönsün."** | Pasif öğrenmeyi ve alışkanlık kazanımını öne çıkarmak. |
| `landing_hero_highlight` | "İngilizceyi Anlayarak Öğren." | **"Sevdiğin İçerikleri Kendi Seviyende Dinle."** | Kişiselleştirme ve Comprehensible Input vurgusu. |
| `landing_hero_desc` | (YouTube ve video odaklı açıklama...) | **"YouTube videoları, kitaplar, podcast'ler ve güncel haberler… LingRoot, ilgilendiğin konulardaki içerikleri İngilizce seviyene göre sadeleştirir. Ekstra zaman harcamadan, dinleyerek geliş."** | Video vurgusunu azaltıp, genel içerik çeşitliliğini ve zaman tasarrufunu öne çıkarmak. |
| `landing_hero_button_watch` | "Örnekleri İncele" | **"Nasıl Çalıştığını İzle"** | Daha net bir Call-to-Action. |
| `landing_how_step1_title` | "Konunu veya Kitabını Seç" | **"İçeriğini Seç"** | Daha kapsayıcı bir başlık. |
| `landing_how_step1_desc` | (Blog, tarih konusu vb. örnekler...) | **"YouTube videosu, Spotify podcast'i, bir haber yazısı… Sadece linki yapıştır veya metni yükle."** | Spesifik olmayan, geniş kaynak desteği vurgusu. |
| `landing_how_step2_title` | "Seviyeni Belirle" | **"Seviyeni Belirle"** (Aynı) | - |
| `landing_how_step2_desc` | (B2, C1 karşılaştırmalı uzun açıklama) | **"A1'den C2'ye. İçerik, senin anlayabileceğin İngilizceye otomatik olarak çevrilir."** | Daha basit ve net vaat. |
| `landing_how_step3_title` | "Modunu Seç ve Dinle" | **"Dinle ve Öğren"** | "Mood" teknik detayından ziyade ana faydaya (Öğrenme) odaklanma. |
| `landing_how_step3_desc` | (Hikaye atmosferi, mood ayarı vb.) | **"İçerik yapay zeka tarafından seslendirilir, altyazı eklenir ve seviyene özel hale gelir. Artık sevdiğin şeyleri dinleyerek İngilizce öğrenebilirsin."** | Sonuç odaklı açıklama. |
| `landing_routine_title` | "İngilizceyi Ders Olmaktan Çıkar" | **"Günlük Rutinin = İngilizce Dersin"** | Daha güçlü bir eşleştirme mottosu. |
| `landing_features_item1_title` | "Sonsuz Kütüphane" | **"Gerçek İçerikler"** | "Kütüphane" metaforundan "Gerçek Hayat" vurgusuna geçiş. |
| `landing_trynow_title` | "Hemen Dinlemeye Başla" | **"Başlamak İçin Sadece Link Paylaş"** | Bariyeri düşürmek, aksiyonu basitleştirmek. |
| `landing_cta_title` | "Dinle, Anla, Öğren." | **"İngilizce Öğrenmek İçin Hayatını Değiştirme. Dinlemeye Devam Et."** | Kullanıcının konfor alanına hitap etmek. |

---

## 3. Landing Page (`index.tsx`) UI Değişiklikleri

### A. Hero Section
*   **Aksiyon:** YouTube embed videosunun kaldırılması.
*   **Yerine Gelecek:** Readdy.ai veya statik bir görsel ile "Sesli Kitap / Podcast Player" arayüzünü andıran, soyut ve modern bir görsel.
*   **ikonlar:** Video ikonları (`fa-play`) yerine kulaklık (`fa-headphones`), kitap (`fa-book`) ve link (`fa-link`) ikonlarının ağırlık kazanması.

### B. How It Works Section
*   **Step 1 İkonu:** `fa-book-open` -> `fa-link` (veya çoklu kaynak ikonu) olarak değiştirilecek.
*   **Görseller:** Adımlardaki görseller, video izleyen biri yerine; yürüyüş yaparken, spor yaparken kulaklıkla dinleyen insan figürlerine dönüştürülecek.

### C. Demo Section
*   **Aksiyon:** "Örnek Video" (iframe) kaldırılacak.
*   **Yerine Gelecek:** Statik bir "Player Arayüzü" görseli veya interaktif olmayan bir görsel temsili (Mockup).
*   **Gerekçe:** Kullanıcıya "video izleme" değil, "sesli içerik tüketme" hissi verilmeli.

### D. CTA & Input Alanları
*   **Try It Now:** Input placeholder'ı "Video linki yapıştır" yerine "Bir konu yaz veya link yapıştır..." şeklinde güncellenecek (backend YouTube desteği sürse de).

---

## 4. Uygulama Durumu (Checklist)

- [x] **i18n.ts** metinlerinin güncellenmesi. **(Tamamlandı - 17.12.2025)**
- [ ] **welcome.tsx** içinden "YouTube" sekmesinin kaldırılması (Input Method olarak kalsa da ana UI'dan gizlenmesi). **(Tamamlandı)**
- [ ] **welcome.tsx** podcast oluşturma akışının basitleştirilmesi. **(Tamamlandı)**
- [ ] **index.tsx** Hero görselinin değiştirilmesi.
- [ ] **index.tsx** How It Works ikonlarının güncellenmesi.
- [ ] **index.tsx** Demo alanındaki YouTube videosunun kaldırılması.
