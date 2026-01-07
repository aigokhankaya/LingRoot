# Test Cases - Mobile & Web Geliştirmeler

**Son Güncelleme:** 07.01.2026  
**Branch:** `feature/patterns`

---

## 📱 Mobile - AudioPlayer Geliştirmeleri

### TC-AP-01: Header Beyaz Bar Düzeltmesi
**Dosya:** `AudioPlayer.tsx`

| Adım | İşlem | Beklenen Sonuç |
|------|-------|----------------|
| 1 | Library'den **text** tipinde bir içerik aç | AudioPlayer modal açılır |
| 2 | Header alanını kontrol et | Sadece sol üstte yuvarlak X butonu ve sağda "Orijinal Metin" linki görünür |
| 3 | Header'da gereksiz beyaz dikdörtgen alan **olmamalı** | ✅ Temiz görünüm |

---

### TC-AP-02: Orijinal Metin Linki (Text İçerikler)
**Dosya:** `AudioPlayer.tsx`

| Adım | İşlem | Beklenen Sonuç |
|------|-------|----------------|
| 1 | Text tipinde içerik aç | Header'da "Orijinal Metin" linki görünür |
| 2 | "Orijinal Metin" linkine tıkla | Ekran sağa kayar, orijinal Türkçe metin görüntülenir |
| 3 | Tekrar linke tıkla veya sola kaydır | Ana (İngilizce) metin sayfasına döner |
| 4 | Podcast tipinde içerik aç | Toggle butonu (pill göstergeli) görünür |

---

### TC-AP-03: Podcast Header Toggle
**Dosya:** `AudioPlayer.tsx`

| Adım | İşlem | Beklenen Sonuç |
|------|-------|----------------|
| 1 | Podcast tipinde içerik aç | Header'da "Show Original Text" toggle butonu görünür |
| 2 | Toggle'ı aktifleştir | Pill göstergesi hareket eder, orijinal metin görünür |
| 3 | Toggle'ı deaktifleştir | Ana metin sayfasına döner |

---

## 📱 Mobile - Account Settings (Hesap Silme)

### TC-AS-01: Delete Account Modal Açılışı
**Dosya:** `AccountSettingsScreen.tsx`

| Adım | İşlem | Beklenen Sonuç |
|------|-------|----------------|
| 1 | Profile > Account Settings'e git | Ayarlar ekranı açılır |
| 2 | En alttaki "Danger Zone" bölümüne git | Kırmızı uyarı kutusu görünür |
| 3 | "Request to delete user data" butonuna tıkla | Delete Account popup modal açılır |
| 4 | Modal içeriğini kontrol et | Başlık, açıklama, email input, silme butonu ve Cancel linki görünür |

---

### TC-AS-02: Email Doğrulaması
**Dosya:** `AccountSettingsScreen.tsx`

| Adım | İşlem | Beklenen Sonuç |
|------|-------|----------------|
| 1 | Delete Account modalını aç | Email input alanı boş |
| 2 | "Permanently delete account" butonunu kontrol et | Buton disabled (gri renk) |
| 3 | Yanlış email gir (örn: wrong@email.com) | Buton aktif olur |
| 4 | "Permanently delete account" butonuna tıkla | "E-posta eşleşmiyor" hatası gösterilir |
| 5 | Doğru email gir (hesap email'i) | Buton aktif olur |
| 6 | "Permanently delete account" butonuna tıkla | "Son Onay" diyaloğu açılır |

---

### TC-AS-03: Hesap Silme Onay Akışı
**Dosya:** `AccountSettingsScreen.tsx`

| Adım | İşlem | Beklenen Sonuç |
|------|-------|----------------|
| 1 | Email doğrulamasını geç, son onay diyaloğu açılsın | Silinecek veri sayısı gösterilir |
| 2 | "İptal" butonuna tıkla | Modal kapanır, işlem iptal |
| 3 | Tekrar dene ve "Evet, Sil" butonuna tıkla | Hesap silme API çağrılır |
| 4 | Başarılı olursa | Başarı mesajı gösterilir, kullanıcı çıkış yapar |

---

### TC-AS-04: Modal İptal
**Dosya:** `AccountSettingsScreen.tsx`

| Adım | İşlem | Beklenen Sonuç |
|------|-------|----------------|
| 1 | Delete Account modalını aç | Modal görünür |
| 2 | "Cancel" linkine tıkla | Modal kapanır |
| 3 | Android back butonuna bas | Modal kapanır |

---

## 🎨 Pattern Highlighting (Mevcut)

### TC-PH-01: Pattern Otomatik Yükleme
**Dosyalar:** `AudioPlayer.tsx`, `SkiaWordHighlight.tsx`

| Adım | İşlem | Beklenen Sonuç |
|------|-------|----------------|
| 1 | Library'den içerik aç | Patternler otomatik fetch edilir |
| 2 | Text içinde pattern varsa | Sarı/turuncu çerçeve ile işaretlenir |

---

### TC-PH-02: Pattern Popup (Mobile)
**Dosya:** `SkiaWordHighlight.tsx`

| Adım | İşlem | Beklenen Sonuç |
|------|-------|----------------|
| 1 | Highlightlı pattern'e tıkla | Pattern detay popup açılır |
| 2 | Popup içeriğini kontrol et | Başlık, tip badge, çeviri, örnek cümle görünür |
| 3 | "Kapat" butonuna tıkla | Popup kapanır |

---

### TC-PH-03: Backend Pattern Find
**Dosya:** `patternController.js`

| Adım | İşlem | Beklenen Sonuç |
|------|-------|----------------|
| 1 | `/api/patterns/find` endpointine POST at | 200 OK response |
| 2 | Text içinde pattern varsa | `patterns` array dolu döner |
| 3 | Response alanlarını kontrol et | `type`, `translation`, `example_text`, `example_translation` mevcut |

```json
// Örnek Request
POST /api/patterns/find
{
  "text": "Don't put all your eggs in one basket.",
  "level": "B1"
}
```

---

## 🖥️ Web Frontend

### TC-WEB-01: Pattern Highlighting (Web)
**Dosyalar:** `OutputSection.tsx`, `NewSyncedTextPlayer.tsx`

| Adım | İşlem | Beklenen Sonuç |
|------|-------|----------------|
| 1 | Dashboard'da içerik oluştur | Audio player açılır |
| 2 | Text içinde pattern varsa | Turuncu border ile işaretlenir |
| 3 | Pattern'e tıkla | PatternDetailModal açılır |

---

### TC-WEB-02: Pattern Detail Modal (Web)
**Dosya:** `PatternDetailModal.tsx`

| Adım | İşlem | Beklenen Sonuç |
|------|-------|----------------|
| 1 | Pattern'e tıkla | Modal açılır |
| 2 | Header'ı kontrol et | Turuncu gradient, pattern metni beyaz |
| 3 | İçerik kartlarını kontrol et | Çeviri (Amber), Örnek (Mavi), Örnek Çeviri (Yeşil) |
| 4 | X veya "Kapat" butonuna tıkla | Modal kapanır |

---

## 📚 Library Screen Filtreleme

### TC-LIB-01: Type Filtresi
**Dosya:** `LibraryScreen.tsx`

| Adım | İşlem | Beklenen Sonuç |
|------|-------|----------------|
| 1 | Library ekranını aç | Tüm içerikler görünür |
| 2 | "Podcast" filtresini seç | Sadece podcast içerikler listelenir |
| 3 | "Text" filtresini seç | Sadece text içerikler listelenir |
| 4 | "Tümü" filtresini seç | Tüm içerikler tekrar görünür |

---

## ⚠️ Edge Cases

| Case | Açıklama | Kontrol |
|------|----------|---------|
| Empty State | Pattern bulunamazsa | Hata vermemeli, normal devam etmeli |
| Long Email | Çok uzun email adresi | Input overflow olmamalı |
| Network Error | API bağlantı hatası | Kullanıcıya anlamlı hata mesajı |
| Rapid Taps | Hızlı ardışık tıklamalar | Duplicate işlem yapılmamalı |

---

## 📝 Test Durumu Özeti

| Bölüm | Test Sayısı | Durum |
|-------|-------------|-------|
| AudioPlayer Header | 3 | ⬜ Test Edilmedi |
| Account Settings | 4 | ⬜ Test Edilmedi |
| Pattern Highlighting | 3 | ⬜ Test Edilmedi |
| Web Frontend | 2 | ⬜ Test Edilmedi |
| Library Screen | 1 | ⬜ Test Edilmedi |

**Toplam:** 13 Test Case
