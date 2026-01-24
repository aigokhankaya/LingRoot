# YouTube Transcript Sistemi - Aksiyon Planı ve Yol Haritası

> **Oluşturulma:** 2026-01-24 | **Güncelleme:** 2026-01-24 | **Versiyon:** 1.0

---

## 1. Mevcut Durum

### Kurulu Sistem (V2)

| Bileşen | Dosya | Açıklama |
|---------|-------|----------|
| Backend Servis | `utils/content/youtubeTranscriptServiceV2.js` | Python paketi ile transcript çeker |
| Backend Route | `routes/youtubeRoutesV2.js` | `/api/youtube-v2/transcript` endpoint |
| Python Script | `scripts/fetchYoutubeTranscript.py` | `youtube-transcript-api` kullanır |
| Frontend UI | `pages/welcome.tsx` | "YouTube Transcript YENİ Versiyon" sekmesi |

### Bağımlılıklar

| Bağımlılık | Tip | Kurulum |
|------------|-----|---------|
| Python 3 | Zorunlu | Sunucuda yüklü olmalı |
| `youtube-transcript-api` | Python paketi | `pip3 install youtube-transcript-api` |

---

## 2. Kullanım Senaryoları ve Riskler

### Senaryo A: Düşük Kullanım (Test / Erken Aşama)

| Metrik | Değer |
|--------|-------|
| Günlük kullanıcı | 10-50 |
| Günlük transcript isteği | 20-100 |
| IP engelleme riski | ⬇️ Düşük |

**Aksiyon:** Mevcut sistem yeterli, değişiklik gerekmez.

---

### Senaryo B: Orta Kullanım (Büyüme Aşaması)

| Metrik | Değer |
|--------|-------|
| Günlük kullanıcı | 100-500 |
| Günlük transcript isteği | 200-1000 |
| IP engelleme riski | ⚠️ Orta |

**Belirtiler:**
- Ara sıra "altyazı bulunamadı" hataları
- Bazı saatlerde istekler başarısız

**Aksiyon:**
1. Rate limiting ekle (dakikada max 10 istek)
2. Başarısız istekleri cache'le (aynı video tekrar çekilmesin)
3. Kullanıcıya "tekrar dene" seçeneği sun

---

### Senaryo C: Yüksek Kullanım (Ölçekleme Aşaması)

| Metrik | Değer |
|--------|-------|
| Günlük kullanıcı | 500+ |
| Günlük transcript isteği | 1000+ |
| IP engelleme riski | 🔴 Yüksek |

**Belirtiler:**
- Çoğu istek başarısız
- YouTube IP'yi engellemiş

**Aksiyon:** Aşağıdaki çözümlerden birini uygula 👇

---

## 3. Ölçekleme Çözümleri

### Çözüm 1: Proxy Rotasyonu (Önerilen)

**Nasıl Çalışır:** Her istek farklı IP'den gider, YouTube tek kullanıcı sanır.

| Servis | Aylık Maliyet | Güvenilirlik |
|--------|---------------|--------------|
| [Oxylabs](https://oxylabs.io) | $75+ | Çok yüksek |
| [Bright Data](https://brightdata.com) | $50+ | Çok yüksek |
| [Smartproxy](https://smartproxy.com) | $25+ | Yüksek |

**Uygulama:**
```python
# fetchYoutubeTranscript.py'ye proxy ekle
from youtube_transcript_api.proxies import GenericProxyConfig

proxy = GenericProxyConfig(
    http_url="http://user:pass@proxy.example.com:8080",
    https_url="https://user:pass@proxy.example.com:8080"
)
api = YouTubeTranscriptApi(proxy_config=proxy)
```

---

### Çözüm 2: 3. Parti API Servisi

**Nasıl Çalışır:** Başka bir şirket transcript'i çeker, bize verir.

| Servis | Ücretsiz Tier | Ücretli Plan |
|--------|---------------|--------------|
| [Supadata.ai](https://supadata.ai) | 100 istek/gün | $10/ay |
| [Apify YouTube Scraper](https://apify.com) | 30 istek/ay | $49/ay |
| [RapidAPI YouTube](https://rapidapi.com) | Değişken | Değişken |

**Avantajı:** Hiç bakım gerektirmez, IP engelleme sorunu yok.

**Dezavantajı:** Aylık maliyet, 3. parti bağımlılığı.

---

### Çözüm 3: Whisper ile Ses Transkripti (Son Çare)

**Nasıl Çalışır:** Video sesini indir → Whisper AI ile transkript et

**Avantajı:** YouTube engelleyemez, altyazısı olmayan videolar için de çalışır.

**Dezavantajı:** Yavaş (5 dk video = ~30 sn işlem), GPU gerektirir.

**Not:** Mevcut Whisper altyapısı zaten var (`whisper-youtube-api/`).

---

## 4. Karar Ağacı

```
Kullanıcı transcript istiyor
        │
        ▼
┌───────────────────┐
│ Python API dene   │
└─────────┬─────────┘
          │
    Başarılı mı?
     /        \
   Evet       Hayır
    │           │
    ▼           ▼
  Tamamla   ┌─────────────────┐
            │ Cache'de var mı?│
            └────────┬────────┘
                     │
               Evet / Hayır
                /       \
             Döndür    ┌──────────────────┐
                       │ 3. Parti API dene│
                       └─────────┬────────┘
                                 │
                           Başarılı mı?
                            /        \
                          Evet      Hayır
                           │          │
                         Döndür    "Altyazı bulunamadı"
```

---

## 5. Sonraki Geliştirmeler (Roadmap)

### Kısa Vadeli (1-2 Hafta)

| # | Görev | Öncelik |
|---|-------|---------|
| 1 | Video ID bazlı cache ekle | Yüksek |
| 2 | Rate limiting ekle (IP başına dakikada 5 istek) | Orta |
| 3 | Hata loglarını ayrı dosyaya yaz | Düşük |

### Orta Vadeli (1 Ay)

| # | Görev | Öncelik |
|---|-------|---------|
| 4 | Supadata.ai fallback entegrasyonu | Yüksek |
| 5 | Dil seçimi UI'ı ekle (TR/EN seçimi) | Orta |
| 6 | Transcript önizleme özelliği | Düşük |

### Uzun Vadeli (3+ Ay)

| # | Görev | Öncelik |
|---|-------|---------|
| 7 | Whisper fallback (altyazısız videolar için) | Yüksek |
| 8 | Proxy rotasyonu sistemi | Kullanıcı sayısına bağlı |
| 9 | Video özeti AI özelliği | Düşük |

---

## 6. Monitoring ve Alarmlar

### Takip Edilecek Metrikler

| Metrik | Uyarı Eşiği | Kritik Eşik |
|--------|-------------|-------------|
| Günlük başarısız istek oranı | >10% | >30% |
| Ortalama yanıt süresi | >5 sn | >15 sn |
| Aynı video için tekrar istek | >20% | - |

### Alarm Aksiyonları

| Durum | Aksiyon |
|-------|---------|
| Başarısız oran >30% | Proxy veya 3. parti API'ye geç |
| Yanıt süresi >15 sn | Python script'i optimize et |
| YouTube 429 hatası | Rate limiting sıkılaştır |

---

## 7. Dosya Referansları

| Dosya | Konum |
|-------|-------|
| V2 Servis | [youtubeTranscriptServiceV2.js](file:///Users/gokhankaya/Documents/GitHub/LingRoot/backend/utils/content/youtubeTranscriptServiceV2.js) |
| V2 Route | [youtubeRoutesV2.js](file:///Users/gokhankaya/Documents/GitHub/LingRoot/backend/routes/youtubeRoutesV2.js) |
| Python Script | [fetchYoutubeTranscript.py](file:///Users/gokhankaya/Documents/GitHub/LingRoot/backend/scripts/fetchYoutubeTranscript.py) |
| Frontend Handler | [welcome.tsx#L665-710](file:///Users/gokhankaya/Documents/GitHub/LingRoot/frontend/pages/welcome.tsx) |
| Eski Sistem (V1) | [youtubeRoutes.js](file:///Users/gokhankaya/Documents/GitHub/LingRoot/backend/routes/youtubeRoutes.js) |

---

## 8. Özet

| Aşama | Çözüm | Maliyet |
|-------|-------|---------|
| **Şu an** | Python `youtube-transcript-api` | Ücretsiz |
| **Orta vadede** | + Cache + Rate Limiting | Ücretsiz |
| **Ölçeklenince** | + 3. Parti API veya Proxy | $10-50/ay |
| **Son çare** | + Whisper fallback | Mevcut altyapı |

---

**Hazırlayan:** LingRoot Development Team  
**Onaylayan:** -
