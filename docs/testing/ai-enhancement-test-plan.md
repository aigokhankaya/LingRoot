# AI Geliştirmeleri Test Planı

**Döküman Kodu:** LR-AI-TEST-2026-Q1  
**Hazırlayan:** Antigravity Architect  
**Tarih:** 4 Ocak 2026  
**Sürüm:** 1.0  
**Kapsam:** 2-4 Ocak 2026 arası yapılan AI/ML geliştirmeleri

---

## 📋 Özet

Bu döküman, son 2 günde gerçekleştirilen AI/ML geliştirmelerini ve bunların test senaryolarını içerir. Test ekibinin fonksiyonel ve frontend testlerini yapabilmesi için hazırlanmıştır.

### Geliştirme Kapsamı

| Faz | Özellik | Öncelik |
|-----|---------|---------|
| 1 | Smart Feedback Integration | Yüksek |
| 2 | SRS (Spaced Repetition) Sistemi | Yüksek |
| 3 | Topic Mastery Tracking | Orta |
| 4 | User Embedding & RAG | Yüksek |
| 5 | Subtopic Generation Fix | Kritik |
| 6 | Content Quality Analysis | Orta |
| 7 | Visual Progression & Self-Healing | Düşük |

---

## 🧪 FAZ 1: Smart Feedback Integration

### User Story
> **US-001:** Kullanıcı olarak, beğendiğim veya beğenmediğim içerikleri değerlendirdiğimde, sistemin bunu hatırlamasını ve sonraki önerilerinde bu tercihleri dikkate almasını istiyorum.

### Yeni Özellikler
- İçerik beğenme/beğenmeme butonları
- Feedback nedeni seçimi (çok zor, sıkıcı, çok uzun)
- Liro AI'ın kullanıcı tercihlerini anlaması

### Test Senaryoları

#### TS-001-A: İçerik Beğenme Akışı
| Adım | Eylem | Beklenen Sonuç |
|------|-------|----------------|
| 1 | Herhangi bir içerik dinle (TTS) | Ses çalmaya başlar |
| 2 | Dinleme tamamlandığında beğeni butonuna tıkla (👍) | Toast mesajı: "Geri bildiriminiz alındı" |
| 3 | Dashboard → Progress sayfasına git | Son dinlenen içeriğin beğeni durumu görünür |
| 4 | Liro'ya "Bugün ne dinlesem?" sor | Önerilen içerikler beğenilen türe yakın olmalı |

#### TS-001-B: İçerik Beğenmeme + Zorluk Feedback
| Adım | Eylem | Beklenen Sonuç |
|------|-------|----------------|
| 1 | B2 seviyesinde bir içerik dinle | - |
| 2 | Beğenmeme butonuna tıkla (👎) | Feedback modal açılır |
| 3 | "Çok zor" seçeneğini seç | Modal kapanır, toast mesajı gösterilir |
| 4 | Liro'ya "Ne dinlememi önerirsin?" sor | Liro daha kolay seviye (B1 veya A2) önerir |

#### TS-001-C: API Doğrulama
**Endpoint:** `POST /api/content/rate`
```json
// Request
{
  "contentId": "uuid",
  "rating": 1,
  "feedback_type": "enjoyable"
}

// Expected Response
{
  "success": true,
  "message": "Rating saved"
}
```

---

## 🧪 FAZ 2: SRS (Kelime Tekrar) Sistemi

### User Story
> **US-002:** Kullanıcı olarak, öğrendiğim kelimeleri düzenli aralıklarla tekrar etmek istiyorum. Sistem bana hangi kelimeleri bugün tekrar etmem gerektiğini söylemeli.

### Yeni Özellikler
- Flashcard benzeri kelime tekrar kartları
- SM-2 algoritması ile akıllı tekrar zamanlaması
- Kelime ustalık istatistikleri
- Liro'nun "Bugün x kelime tekrarın var" hatırlatması

### Test Senaryoları

#### TS-002-A: Kelime Ekleme
| Adım | Eylem | Beklenen Sonuç |
|------|-------|----------------|
| 1 | Herhangi bir içerik dinle | - |
| 2 | Çıkan kelime listesinden bir kelimeye tıkla | Kelime detay popup açılır |
| 3 | "Öğrenme Listesine Ekle" butonuna bas | Toast: "Kelime eklendi" |
| 4 | Dashboard → Vocabulary sayfasına git | Eklenen kelime listede görünür |

#### TS-002-B: Günlük Tekrar Akışı
| Adım | Eylem | Beklenen Sonuç |
|------|-------|----------------|
| 1 | En az 5 kelime ekle | - |
| 2 | Ertesi gün uygulamaya gir | Dashboard'da "X kelime tekrarın var" kartı |
| 3 | "Tekrar Et" butonuna tıkla | Flashcard ekranı açılır |
| 4 | Her kelime için "Biliyorum" veya "Bilmiyorum" seç | Kelime kartı geçer |
| 5 | Tüm tekrarları tamamla | Özet ekranı: doğru/yanlış sayıları |

#### TS-002-C: SM-2 Algoritma Doğrulaması
| Senaryo | Cevap | Beklenen Sonraki Tekrar |
|---------|-------|------------------------|
| Yeni kelime, "Biliyorum" | 1 gün sonra |
| 1. tekrar başarılı | 6 gün sonra |
| 2. tekrar başarılı | ~15 gün sonra (ease factor ile) |
| Yanlış cevap | 1 gün sonra (sıfırlanır) |

#### TS-002-D: API Doğrulama
**Endpoint:** `GET /api/srs/due`
```json
// Expected Response
{
  "success": true,
  "dueCount": 5,
  "words": [
    {
      "id": 1,
      "word": "serendipity",
      "word_translation": "şans eseri buluş",
      "streak_correct": 2
    }
  ]
}
```

---

## 🧪 FAZ 3: Topic Mastery Tracking

### User Story
> **US-003:** Kullanıcı olarak, bir konuyu ne kadar "mastered" ettiğimi görmek istiyorum. Konu kartlarında ilerleme yüzdem görünmeli.

### Yeni Özellikler
- Konu kartlarında ustalık yüzdesi (%)
- Kademeli ilerleme göstergesi (Başlangıç → Öğreniyor → Usta)
- Mastery rozeti animasyonları

### Test Senaryoları

#### TS-003-A: Mastery Hesaplama
| Adım | Eylem | Beklenen Sonuç |
|------|-------|----------------|
| 1 | Yeni bir konu oluştur | Mastery: 0% |
| 2 | Konunun 1. alt konusunu dinle ve tamamla | Mastery: ~20% |
| 3 | 3 alt konuyu daha tamamla | Mastery: ~80% |
| 4 | Tüm alt konuları tamamla | Mastery: 100%, "USTA" rozeti |

#### TS-003-B: Frontend Görsel Kontrolü
| Kontrol | Beklenen |
|---------|----------|
| Konu kartında progress bar | Yeşil doluluk göstergesi |
| Yüzde etiketi | "45%" gibi metin |
| 100% durumu | Altın rozet ikonu |
| Animasyon | Seviye atlama kutlaması |

---

## 🧪 FAZ 4: User Embedding & RAG (Öneri Sistemi)

### User Story
> **US-004:** Kullanıcı olarak, sistem bana benzer ilgi alanlarına sahip kullanıcıların dinlediği içerikleri önersin.

### Yeni Özellikler
- Kullanıcı davranış embedding'i (1536 boyutlu vektör)
- Semantik benzerlik ile içerik önerisi
- `/api/recommendations` endpoint'i

### Test Senaryoları

#### TS-004-A: Öneri Endpoint Testi
**Endpoint:** `GET /api/recommendations?limit=5`
```json
// Expected Response
{
  "success": true,
  "recommendations": [
    {
      "topic": "İstanbul Tarihi",
      "reason": "Benzer kullanıcılar dinledi",
      "score": 0.87
    }
  ]
}
```

#### TS-004-B: Kişiselleştirilmiş Öneri Kontrolü
| Kullanıcı Profili | Beklenen Öneri |
|-------------------|----------------|
| Tarih konuları dinleyen | Tarih temalı içerikler |
| A1 seviyesinde kalan | A1-A2 seviyesi içerikler |
| Kısa içerik seven | 2-3 dakikalık içerikler |

---

## 🧪 FAZ 5: Subtopic Generation Fix

### User Story
> **US-005:** Kullanıcı olarak, "İstanbul'un İlçeleri" gibi bir ana konu oluşturduğumda, sistemin ilçe isimlerini (Kadıköy, Beşiktaş vb.) alt konu olarak üretmesini istiyorum.

### Arka Plan
Önceki sürümde, sistem çoğul konular için kategori çeşitliliği kuralı nedeniyle tematik alt konular (Tarih, Kültür, Ekonomi) üretiyordu. Bu düzeltildi.

### Test Senaryoları

#### TS-005-A: Çoğul Konu Alt Konu Üretimi (KRİTİK)
| Ana Konu | Beklenen Alt Konular |
|----------|---------------------|
| "Türk Devletleri" | Osmanlı, Selçuklu, Gazneli... (devlet isimleri) |
| "İstanbul'un İlçeleri" | Kadıköy, Beşiktaş, Fatih... (ilçe isimleri) |
| "Türk Yemekleri" | İskender, Lahmacun, Mantı... (yemek isimleri) |
| "Nobel Ödüllü Yazarlar" | Orhan Pamuk, Gabriel García Márquez... (isimler) |

#### TS-005-B: Tekil Konu Alt Konu Üretimi
| Ana Konu | Beklenen Alt Konular |
|----------|---------------------|
| "Kadıköy İlçesi" | Tarihi, Kültürü, Yemekleri, Ulaşım... (tematik) |
| "Atatürk" | Hayatı, Devrimleri, Sözleri... (tematik) |

#### TS-005-C: İçerik Tutarlılığı
| Kontrol | Beklenen |
|---------|----------|
| Alt konu başlığı içerikte geçiyor mu? | Evet |
| Metin uzunluğu | 800-1200 karakter |
| Cümle uzunluğu | < 25 kelime (A1 uyumlu) |

---

## 🧪 FAZ 6: Content Quality Analysis

### User Story
> **US-006:** Admin olarak, üretilen içeriklerin kalitesini analiz eden bir araç istiyorum.

### Yeni Araçlar
- `analyze_content_quality.js` - Batch kalite analizi
- `migrate_content_to_topics.js` - Veri migration

### Test Senaryoları
_Bu fazın testleri admin/developer seviyesindedir._

---

## 🧪 FAZ 7: Visual Progression & Self-Healing

### User Story
> **US-007:** Kullanıcı olarak, seri günlerimi (streak) kutlama animasyonlarıyla görmek istiyorum.

### Yeni Özellikler
- Streak celebration animasyonları
- MasteryProgressCard bileşeni
- Self-healing retry mekanizmaları (backend)

### Test Senaryoları

#### TS-007-A: Streak Kutlaması
| Streak Günü | Beklenen Animasyon |
|-------------|-------------------|
| 3 gün | Küçük konfeti |
| 7 gün | Büyük kutlama + rozet |
| 30 gün | Premium kutlama |

---

## 📊 Regresyon Testleri

Aşağıdaki mevcut özelliklerin hala çalıştığından emin olun:

| Özellik | Kontrol |
|---------|---------|
| TTS işlemi | Metin → Ses dönüşümü çalışıyor |
| Konu ağacı | Konu oluşturma/silme çalışıyor |
| Liro sohbet | AI yanıt veriyor |
| Global Audio Player | Ses çalıyor, mini player çalışıyor |
| Paket kontrolü | Kullanım limitleri kontrol ediliyor |

---

## 🔧 Test Ortamı Gereksinimleri

1. **Backend:** `npm run dev` (Port 5001)
2. **Frontend:** `npm run dev` (Port 3000)
3. **Database:** Supabase (Staging)
4. **Test Kullanıcısı:** `egokhankaya@gmail.com`

---

## 📝 Bug Raporlama Formatı

```
**Başlık:** [FAZ-X] Kısa açıklama
**Öncelik:** Kritik/Yüksek/Orta/Düşük
**Adımlar:**
1. ...
2. ...
**Beklenen:** ...
**Gerçekleşen:** ...
**Ekran Görüntüsü:** (varsa)
```
