# LingRoot Kapasite ve Eszamanlilik Analiz Raporu

> **Created:** 2026-02-05 | **Updated:** 2026-02-05 | **Version:** 1.0

---

## 1. Sunucu Altyapisi

| Parametre | Deger | Kaynak |
|-----------|-------|--------|
| Node.js Sureci | **Tek surec** (clustering yok) | `backend/server.js` |
| Istek Zaman Asimi | 10 dakika (600.000ms) | `backend/server.js:260` |
| Header Zaman Asimi | 65 saniye | `backend/server.js:261` |
| Keep-Alive Zaman Asimi | 60 saniye | `backend/server.js:262` |
| Govde Limiti | 1 MB (JSON/form) | `backend/server.js:158` |
| Proxy | Cloudflare Tunnel (trust proxy: 1) | `backend/server.js:85` |

**Kritik:** Tek Node.js sureci calisiyor. Clustering veya PM2 cluster modu yok. CPU-yogun islemler (FFmpeg, buyuk JSON parse) tek cekirdekle sinirli olup diger tum istekler icin event loop'u bloke eder.

---

## 2. Veritabani Baglanti Havuzlari

| Havuz | Maks Baglanti | Bosta Kalma Suresi | Baglanti Zaman Asimi |
|-------|---------------|---------------------|----------------------|
| **PostgreSQL (pg Pool)** | **20** | 30s | 5s |
| **Sequelize (eski)** | **5** | 10s | 30s |

**Kaynak:** `backend/config/db.js:57-68` (pg Pool), `backend/config/database.js:22-27` (Sequelize)

**Supabase Pooler:** `aws-0-eu-central-1.pooler.supabase.com:6543`

**Darbogazlar:**
- 20 aktif DB baglantisi = maksimum 20 eszamanli DB sorgulayan istek
- Sequelize havuzu yalnizca 5 baglanti — hala aktif kullaniliyorsa ciddi darbogazdir
- Yogun trafikte `connectionTimeoutMillis: 5000` baglanti zaman asimi hatalari tetikler

---

## 3. Redis

| Parametre | Deger | Kaynak |
|-----------|-------|--------|
| Baglanti | `REDIS_URL` (varsayilan: `redis://localhost:6379`) | `backend/utils/storage/redisClient.js:12` |
| Yeniden Deneme | Maks 3 deneme (500ms, 1s, 2s) | `redisClient.js:26-31` |
| Yedek Mod | Bellek-ici moda gecer (kalicilik kaybi) | `redisClient.js:28` |
| Havuz | Varsayilan ioredis ayarlari (acik limit yok) | `redisClient.js:22` |

---

## 4. Eszamanlilik Sinirlandiricalari (Global)

`backend/utils/infra/concurrencyLimiter.js:142-157` dosyasinda tanimli:

| Servis | Maks Eszamanli | Kuyruk Limiti | Zaman Asimi | Ortam Degiskeni |
|--------|----------------|---------------|-------------|-----------------|
| **TTS** | **50** | 200 | 60s | `MAX_CONCURRENT_TTS` |
| **Podcast** | **20** | 100 | 60s | `MAX_CONCURRENT_PODCAST` |
| **OpenAI** | **50** | 300 | 60s | `MAX_CONCURRENT_OPENAI` |

Kuyruk doluysa (backpressure): istek `QUEUE_FULL` sebebiyle reddedilir (API katmaninda **503 SERVER_BUSY** olarak doner).

---

## 5. Worker'lar (BullMQ)

| Worker | Eszamanlilik | Hiz Limiti | Ortam Degiskeni |
|--------|-------------|------------|-----------------|
| **TTS Worker** | **10** | 50 is / 60s | `TTS_WORKER_CONCURRENCY` |
| **Podcast Worker** | **5** | 20 is / 60s | `PODCAST_WORKER_CONCURRENCY` |

**Kaynak:** `backend/workers/ttsWorker.js:70-75`, `backend/workers/podcastWorker.js:93-99`

**Kuyruklar:** `tts-processing`, `podcast-processing`

**Is Yeniden Denemesi:** 3 deneme, ustel geri cekilme (5s, 10s, 20s)

**Not:** `server.js:270` BullMQ worker'in devre disi oldugunu ve asenkron TTS isleme icin bellek-ici jobQueue kullanildigini gostermektedir.

---

## 6. Hiz Sinirlandirma (IP bazli)

Kaynak: `backend/middleware/security.js`

| Endpoint | Pencere | Maks Istek |
|----------|---------|------------|
| Genel API | 1 dk | 300 (kimlik dogrulanmis kullanicilar icin atlanir) |
| TTS | 1 saat | 30 |
| Sohbet (dakikalik) | 1 dk | 60 |
| Sohbet (gunluk) | 24 saat | 500 |
| Podcast Olusturma | 1 saat | 10 |
| Icerik/Gecmis | 1 dk | 60 |
| Kelime Haznesi | 1 dk | 120 |
| Giris | 15 dk | 5 |
| Kayit | 1 saat | 3 |
| Sifre Sifirlama | 1 saat | 3 |
| Token Yenileme | 15 dk | 30 |
| XP | 1 dk | 10 |
| Gorev | 1 dk | 20 |
| Gunluk Gorev Talep | 1 dk | 10 |
| Seri | 1 saat | 10 |
| Oryantasyon Sifirlama | 24 saat | 3 |
| Oyunlastirma (genel) | 1 dk | 60 |

---

## 7. Dis Servis Limitleri

### 7a. OpenAI

| Parametre | Deger |
|-----------|-------|
| Maks eszamanli | 50 (global sinirlandirici) |
| Kuyruk | 300 |
| Modeller | gpt-4o, gpt-4o-mini |
| Icerik istegi basina | 2-3 LLM cagrisi (ceviri+uyarlama, duygu, kaliplar) |
| Yeniden deneme | 3 deneme, ustel geri cekilme (5s, 10s, 20s) |
| Podcast segmentler arasi gecikme | 2s (`googleTTSMultiSpeaker.js:579`) |

### 7b. Google TTS

| Parametre | Deger | Kaynak |
|-----------|-------|--------|
| Maks eszamanli (global) | 50 | `concurrencyLimiter.js:143` |
| Maks eszamanli (kullanici basina) | **2** | `ttsController.js:43` |
| Kuyruk | 200 | `concurrencyLimiter.js:145` |
| Coklu-konusmaci parca boyutu | 3900 byte | `googleTTSMultiSpeaker.js:727` |
| Parcalar arasi gecikme | 350ms | `googleTTSMultiSpeaker.js:870` |
| Gemini-TTS zaman asimi | 120s / parca | `googleTTSMultiSpeaker.js:840,930,1091` |
| Gemini-TTS yeniden deneme | 3 deneme, 2s/4s geri cekilme | `googleTTSMultiSpeaker.js:859,967` |

### 7c. MFA (Montreal Forced Aligner)

| Parametre | Deger | Kaynak |
|-----------|-------|--------|
| Servis | `MFA_SERVICE_URL` (varsayilan: `http://localhost:5002`) | `mfaAligner.js:19` |
| Gonderim zaman asimi | 30s | `mfaAligner.js:147` |
| Yoklama araligi | 5s | `mfaAligner.js:158` |
| Maks bekleme | **25 dakika** | `mfaAligner.js:159` |
| Circuit breaker | 3 basarisizlik -> 5 dk devre disi | `mfaAligner.js:28-31` |

### 7d. Diger Servisler

- **Stripe, Apple IAP, iyzico:** Acik eszamanlilik limiti yok (SDK varsayilanlari)
- **Supabase Storage:** Acik limit yok
- **Cloudflare R2:** Acik limit yok

---

## 8. Icerik Olusturma Pipeline'i (Tek Istek)

Pipeline **tamamen sirali** calisir:

```
Girdi Cikarimi -> Temizleme -> Ceviri+CEFR Uyarlama (OpenAI) -> Parcalama ->
TTS Sentezleme (sirali dongu) -> MFA Hizalama -> FFmpeg Birlestirme ->
Altyazi Olusturma -> Depolama Yukleme -> DB Kaydi
```

### ~5000 Karakter Icerik Icin Tipik Sure:

| Adim | Sure | Tur |
|------|------|-----|
| Girdi cikarimi | ~0.5s | Sirali |
| Metin temizleme | ~0.3s | Sirali |
| Ceviri + CEFR uyarlama (OpenAI) | **3-5s** | Sirali |
| Gunluk kalip cikarimi (OpenAI) | 1-2s | Sirali |
| Metin parcalama | ~0.2s | Sirali |
| **TTS sentezleme (20 parca x ~2s)** | **~40s** | **Sirali dongu** |
| **MFA hizalama (20 parca x ~3s)** | **~60s** | **Sirali dongu** |
| FFmpeg birlestirme | ~2s | Sirali |
| VTT olusturma | ~1s | Sirali |
| Depolama yukleme | ~3s | Sirali |
| DB kaydi | ~1s | Sirali |
| **TOPLAM** | **~112-117 saniye** | |

**TTS ve MFA tek basina toplam pipeline suresinin ~%85'ini olusturur.**

Kaynak: Sirali TTS dongusu `ttsController.js:1119` (`for` dongusu, parca basina `await`).

---

## 9. Eszamanli Kullanici Kapasitesi (Senaryo Analizi)

### Senaryo A: Salt Okunur API Istekleri (Kutuphane, Kelime Haznesi, Profil)

| Darboğaz | Limit | Sonuc |
|----------|-------|-------|
| DB havuzu | 20 baglanti | ~20 eszamanli sorgu |
| Hiz limiti | 300/dk (genel) | IP basina 300/dk |
| Node.js event loop | Tek thread | I/O-yogun sorunsuz, CPU-yogun sorunlu |

**Kapasite: ~100-200 eszamanli kullanici** (cogu istek hizli DB sorgularidir)

### Senaryo B: Icerik Olusturma (Tam Pipeline)

| Darboğaz | Limit | Hesaplama |
|----------|-------|-----------|
| TTS global | 50 eszamanli | 50 eszamanli TTS islemi |
| TTS kullanici basina | 2 | Her kullanici maks 2 TTS |
| TTS kuyrugu | 200 | 200 bekleyen is |
| OpenAI global | 50 eszamanli | 50 eszamanli LLM cagrisi |
| MFA | Tek servis | Circuit breaker 3 hata -> 5 dk devre disi |
| DB havuzu | 20 | Pipeline boyunca baglanti tutar |
| Tek pipeline suresi | ~117s | Her istek ~2 dk mesgul |

**Hesaplama:**
- TTS worker 10 eszamanli is isler, dakikada 50 is ile hiz sinirli
- Her icerik istegi ~20 TTS parcasi uretir
- 10 worker / 20 parca = **~0.5 kullanici** ayni anda hizmet alir (TTS asamasinda)
- Kuyruk 200 is kabul eder -> **~10 kullanici** kuyrukta bekleyebilir
- **Gercekci kapasite: ~10-15 eszamanli icerik olusturma istegi**
- 15'in uzerinde kuyruk birikir; toplam 250+ iste 503 hatalari baslar

### Senaryo C: Podcast Olusturma

| Darboğaz | Limit |
|----------|-------|
| Podcast global | 20 eszamanli |
| Podcast worker | 5 eszamanli |
| Hiz limiti | 10/saat (IP basina) |
| OpenAI segmentler arasi gecikme | 2s bekleme |
| Uzun podcast (~5dk+) | 10dk+ isleme suresi |

**Kapasite: ~5 eszamanli podcast olusturma**

### Senaryo D: Karisik Trafik (Gercekci Senaryo)

Tipik kullanim: ~%70 okuma, ~%20 icerik olusturma, ~%10 podcast

| Metrik | Deger |
|--------|-------|
| **Toplam eszamanli kullanici** | **~50-80** |
| Icerik olusturucular | ~10-15 |
| Podcast olusturucular | ~3-5 |
| Salt okunur kullanicilar | ~40-60 |
| Kuyruk tasma esigi | ~80+ kullanici |
| Sistem doygunluk noktasi | ~100 kullanici (503 hatalari baslar) |

---

## 10. Kritik Darbogazlar (Oncelik Sirasina Gore)

### 1. Sirali TTS Dongusu (EN KRITIK)
- **Sorun:** Her parca tek tek islenir (`for` dongusu + `await`)
- **Etki:** 20 parca x 2s = sadece TTS icin 40s
- **Konum:** `backend/controllers/ttsController.js:1119-1179`

### 2. Sirali MFA Isleme
- **Sorun:** Her ses parcasi icin ayri HTTP istegi + yoklama
- **Etki:** 20 parca x 3s = MFA icin 60s
- **Ek risk:** 3 basarisizlik -> circuit breaker -> 5 dk boyunca tum MFA devre disi

### 3. Tek Node.js Sureci
- **Sorun:** Clustering / PM2 cluster modu yok
- **Etki:** CPU-yogun islemler (FFmpeg, buyuk JSON) tum event loop'u bloke eder
- **Sonuc:** Diger tum istekler de yavasilar

### 4. DB Havuzu (20 Baglanti)
- **Sorun:** Her pipeline istegi bir baglanti tutar
- **Etki:** 20+ eszamanli pipeline -> baglanti bekleme
- **Sequelize havuzu:** Yalnizca 5 baglanti (cok dusuk)

### 5. Kullanici Basina TTS Limiti (2)
- **Sorun:** Kullanici en fazla 2 eszamanli TTS istegi yapabilir
- **Etki:** Hizli tiklamalar kuyruga girer veya reddedilir

---

## 11. Kapasite Ozet Tablosu

| Islem Turu | Maks Eszamanli | Kuyruk | Ort. Sure | Darboğaz |
|------------|----------------|--------|-----------|----------|
| API Okuma | ~100-200 | - | <500ms | DB havuzu (20) |
| Icerik Olusturma | **10-15** | 200 | ~117s | TTS sirali dongusu |
| Podcast | **3-5** | 100 | ~10-15dk | Worker (5 eszamanli) |
| Sohbet/LLM | ~50 | 300 | 2-5s | OpenAI sinirlandirici |
| Kelime Haznesi Zenginlestirme | ~50 | 300 | 1-3s | OpenAI sinirlandirici |
| TTS (tekil) | 50 global / 2 kullanici basina | 200 | 2-5s | Google API |
| MFA | ~sinirsiz istemci | servis tarafi | 2-25dk | Circuit breaker |

---

## 12. Sonuc

LingRoot'un mevcut altyapi ile gercekci eszamanli kapasitesi:

| Senaryo | Kapasite |
|---------|----------|
| Salt okunur trafik | **100-200 kullanici** |
| Karisik trafik (gercekci) | **50-80 kullanici** |
| Yogun icerik olusturma | **10-15 kullanici** |
| Podcast olusturma | **3-5 kullanici** |
| **Sistem doygunluk noktasi** | **~100 eszamanli kullanici** |

**Ana darbogazin %85'i sirali TTS ve MFA islemeden kaynaklanmaktadir.** Diger faktorler (tek surec, DB havuzu 20, kullanici basina limit 2) ek kisitlamalar olusturur.

---

## Ek: Anahtar Kaynak Dosya Referanslari

| Dosya | Amac |
|-------|------|
| `backend/server.js` | Sunucu yapilandirmasi, zaman asimlari, ara katmanlar |
| `backend/config/db.js` | PostgreSQL havuzu (maks 20) |
| `backend/config/database.js` | Sequelize havuzu (maks 5) |
| `backend/utils/infra/concurrencyLimiter.js` | Global eszamanlilik sinirlandiricalari |
| `backend/utils/storage/redisClient.js` | Redis baglantisi + yedek mod |
| `backend/workers/ttsWorker.js` | TTS BullMQ worker (10 eszamanlilik) |
| `backend/workers/podcastWorker.js` | Podcast BullMQ worker (5 eszamanlilik) |
| `backend/middleware/security.js` | Hiz sinirlandiricalari |
| `backend/controllers/ttsController.js` | Kullanici basina TTS limiti (2), sirali TTS dongusu |
| `backend/utils/audio/mfaAligner.js` | MFA istemcisi + circuit breaker |
| `backend/utils/audio/googleTTSMultiSpeaker.js` | Coklu-konusmaci TTS, parca boyutlari, zaman asimlari |
