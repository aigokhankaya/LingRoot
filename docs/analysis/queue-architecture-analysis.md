# LingRoot Kuyruk Mimarisi Analiz Raporu

> **Created:** 2026-02-05 | **Updated:** 2026-02-05 | **Version:** 1.0

---

## Icindekiler

1. [Mevcut Durum Analizi](#1-mevcut-durum-analizi)
2. [Kuyruk Gerektiren Islemler](#2-kuyruk-gerektiren-islemler)
3. [5 Modern Kuyruk Alternatifi Karsilastirmasi](#3-5-modern-kuyruk-alternatifi-karsilastirmasi)
4. [Karsilastirma Matrisi](#4-karsilastirma-matrisi)
5. [LingRoot Icin Onerilen Kuyruk Stratejisi](#5-lingroot-icin-onerilen-kuyruk-stratejisi)
6. [Pipeline Yeniden Tasarim Onerileri](#6-pipeline-yeniden-tasarim-onerileri)

---

## 1. Mevcut Durum Analizi

### 1.1 Mevcut Kuyruk ve Eszamanlilik Mekanizmalari

| # | Mekanizma | Dosya | Durum | Tip | Aciklama |
|---|-----------|-------|-------|-----|----------|
| 1 | **ConcurrencyLimiter (TTS)** | `backend/utils/infra/concurrencyLimiter.js:143` | AKTIF | Bellek-ici semafor | Maks 50 eszamanli, 200 kuyruk, `ttsController.js:121` ve `ttsController.js:1859`'da acquire/release |
| 2 | **ConcurrencyLimiter (Podcast)** | `backend/utils/infra/concurrencyLimiter.js:148` | AKTIF | Bellek-ici semafor | Maks 20 eszamanli, 100 kuyruk, `ttsRoutes.js:351` ve `ttsRoutes.js:483`'te acquire/release |
| 3 | **ConcurrencyLimiter (OpenAI)** | `backend/utils/infra/concurrencyLimiter.js:153` | TANIMLI AMA KULLANILMIYOR | Bellek-ici semafor | Maks 50 eszamanli, 300 kuyruk — hicbir dosyada `limiters.openai.acquire()` cagrisi yok |
| 4 | **In-Memory JobQueue** | `backend/utils/infra/jobQueue.js` | AKTIF | Basit `Map()` durum takibi | Job olusturma, guncelleme, kullanici basina aktif is kontrolu; 24 saatlik temizlik |
| 5 | **BullMQ TTS Worker** | `backend/workers/ttsWorker.js` | DEVRE DISI | Redis-tabanli kuyruk | 10 eszamanlilik, 50 is/dk hiz limiti; Redis yoksa baslatilmiyor |
| 6 | **BullMQ Podcast Worker** | `backend/workers/podcastWorker.js` | DEVRE DISI | Redis-tabanli kuyruk | 5 eszamanlilik, 20 is/dk; basarisizlikta push bildirim gonderir |
| 7 | **BullMQ Queue Altyapisi** | `backend/utils/infra/bullQueue.js` | TANIMLI, FALLBACK MODUNDA | Redis-tabanli kuyruk | `tts-processing`, `podcast-processing`, `mfa-alignment` kuyruklari; Redis yoksa fallback mock job doner |
| 8 | **Per-User TTS Limiter** | `backend/controllers/ttsController.js:42-82` | AKTIF | Bellek-ici `Map` sayaci | Kullanici basina maks 2 eszamanli TTS istegi |
| 9 | **MFA Circuit Breaker** | `backend/utils/audio/mfaAligner.js:24-72` | AKTIF | Devre kesici | 3 basarisizlik -> 5 dk devre disi; uzak MFA servisine baglanti koruyor |

### 1.2 Kuyruksuz Calisan Kritik Islemler

Asagidaki islemler herhangi bir kuyruk, paralellestirme veya akis kontrolu olmadan dogrudan calistirilmaktadir:

| # | Islem | Etkilenen Dosya Sayisi | Mevcut Durum | Risk Seviyesi |
|---|-------|------------------------|--------------|---------------|
| 1 | **OpenAI API cagrilari** | 13+ dosya, 23+ cagri noktasi | Dogrudan `openai.chat.completions.create()` | **YUKSEK** — limiter tanimli ama hic kullanilmiyor |
| 2 | **TTS chunk sentezleme** | `ttsController.js:1119` | Sirali `for` dongusu, parca basina `await` | **KRITIK** — 20 parca x 2s = 40s tek thread uzerinde |
| 3 | **MFA hizalama** | `mfaAligner.js:162` | HTTP polling, 5s aralikla, maks 25dk bekleme | **YUKSEK** — sirali islem, uzun bekleme suresi |
| 4 | **Icerik olusturma pipeline** | `ttsController.js:111-1859` | Tamamen senkron, ~117s tek istek | **KRITIK** — tek istek event loop'u 2dk mesgul eder |
| 5 | **Chat/AI sohbet** | `backend/services/chatService.js` | Dogrudan OpenAI cagrisi | ORTA — kisa sureli ama limitsiz |
| 6 | **Kelime zenginlestirme** | `backend/utils/content/wordTranslationService.js` | Dogrudan OpenAI cagrisi (5 cagri noktasi) | ORTA — toplu islemlerde patlama riski |
| 7 | **Konu onerisi** | `backend/controllers/topicSuggestController.js` | Dogrudan OpenAI cagrisi | DUSUK — nadir cagrilan |
| 8 | **Hobi onerileri** | `backend/controllers/hobbySuggestionsController.js` | Dogrudan OpenAI cagrisi | DUSUK — nadir cagrilan |

### 1.3 Darbogazlarin Pipeline Konumlari

Icerik olusturma pipeline'inda toplam ~117s suren islemlerin dagilimi:

```
[0.5s] Girdi Cikarimi
[0.3s] Metin Temizleme
[3-5s] Ceviri + CEFR Uyarlama (OpenAI) ←── kuyruksuz
[1-2s] Gunluk Kalip Cikarimi (OpenAI) ←── kuyruksuz
[0.2s] Metin Parcalama
[~40s] ██████████████████████ TTS Sentezleme (sirali dongu) ←── EN KRITIK
[~60s] ████████████████████████████████ MFA Hizalama (sirali polling) ←── KRITIK
[~2s]  FFmpeg Birlestirme
[~1s]  VTT Olusturma
[~3s]  Depolama Yukleme
[~1s]  DB Kaydi
```

**Sonuc:** TTS ve MFA tek basina pipeline suresinin **~%85'ini** olusturur. Bu iki adim paralellestirilmeden toplam sure anlamli olcude azaltilmaz.

---

## 2. Kuyruk Gerektiren Islemler (Oncelik Sirasina Gore)

### 2.1 TTS Chunk Sentezleme — ONCELIK 1 (KRITIK)

**Mevcut durum:** `ttsController.js:1119`'daki `for` dongusunde her chunk sirali olarak sentezlenir. 20 chunk icin ~40 saniye harcanir.

**Neden kuyruk gerekli:**
- Her chunk bagimsiz olarak sentezlenebilir — aralarinda bagimlilik yok
- Google TTS API paralel istekleri destekler
- 4-5 chunk'in ayni anda sentezlenmesi toplam TTS suresini **~40s -> ~10s**'ye dusurur

**Ideal kuyruk tipi:** Bellek-ici es zamanlilik kontrolu (p-queue) — harici bagimlilik yok, dusuk gecikmeli.

**Risk:** Google TTS hiz limitleri asildiysa chunk basarisizliklari artar; yeniden deneme mekanizmasi gerekir.

---

### 2.2 MFA Hizalama — ONCELIK 2 (YUKSEK)

**Mevcut durum:** `mfaAligner.js:162`'de her ses parcasi icin ayri async job gonderilir ve 5 saniyelik aralikla poll edilir. 20 parca icin toplam ~60 saniye.

**Neden kuyruk gerekli:**
- MFA servisi batch submission'i destekleyebilir — tekli HTTP yerine toplu gonderim
- Birden fazla parcayi ayni anda isleme gondermek mumkun
- Circuit breaker ile hata yonetimi zaten var ama batch hata izolasyonu yok

**Ideal kuyruk tipi:** Batch submission + paralel polling. MFA servisi tarafinda da kuyruk desteği gerektirir.

**Risk:** MFA servisi tek sunucuda calisiyor; paralel istekler servisi yukleyebilir. Kademeli artis gerekli.

---

### 2.3 Podcast Olusturma — ONCELIK 3 (YUKSEK)

**Mevcut durum:** BullMQ worker (`podcastWorker.js`) tanimli ama **devre disi**. Bellek-ici fallback modunda calisiyor. Bir podcast olusturma 10-15 dakika surebilir.

**Neden kuyruk gerekli:**
- Uzun sureli islem — kullanicinin beklemesi gerekir
- Push bildirim altyapisi zaten var (`podcastWorker.js:51-63`)
- BullMQ altyapisi hazir, yalnizca Redis baglantisi ve aktivasyon gerekli

**Ideal kuyruk tipi:** BullMQ (Redis-tabanli) — zaten implement edilmis, aktive edilmesi yeterli.

**Risk:** Redis baglantisi gerekli. Mevcut Redis'in bulunmadiginda fallback davranisi kontrol edilmeli.

---

### 2.4 OpenAI Cagrilari — ONCELIK 4 (ORTA)

**Mevcut durum:** 13 dosyada 23+ noktada dogrudan `openai.chat.completions.create()` cagrisi var. `ConcurrencyLimiter` OpenAI icin tanimli (`concurrencyLimiter.js:153`) ama **hicbir yerde kullanilmiyor**.

**Etkilenen dosyalar:**

| Dosya | Cagri Sayisi | Islem |
|-------|-------------|-------|
| `wordTranslationService.js` | 5 | Kelime zenginlestirme |
| `inputExtractor.js` | 4 | Girdi cikarimi, ceviri |
| `translateAndAdapt.js` | 2 | Ceviri + CEFR uyarlama |
| `topicPipelineController.js` | 2 | Konu pipeline |
| `googleTTSMultiSpeaker.js` | 2 | Coklu-konusmaci senaryo |
| `cefrAdapter.js` | 1 | CEFR uyarlama |
| `translateFromEnglish.js` | 1 | Ters ceviri |
| `narrationController.js` | 1 | Anlatim olusturma |
| `llmPatternController.js` | 1 | LLM kalip cikarimi |
| `topicDetailController.js` | 1 | Konu detayi |
| `topicSuggestController.js` | 1 | Konu onerisi |
| `topicHierarchyController.js` | 1 | Konu hiyerarsisi |
| `hobbySuggestionsController.js` | 1 | Hobi onerileri |

**Neden kuyruk/limiter gerekli:**
- OpenAI API hiz limitleri asildiysa 429 hatasi gelir ve tum kullanicilar etkilenir
- Icerik pipeline'i tek istekte 2-3 OpenAI cagrisi yapar; 15 eszamanli kullanici = 30-45 OpenAI cagrisi
- Mevcut limiter aktive edilmeden tek API key etrafinda kontrol yok

**Ideal cozum:** Mevcut `limiters.openai` semaforunu tum OpenAI cagri noktalarinda aktive etmek. Ek kuyruk gereksiz — mevcut semafor yeterli.

---

### 2.5 Icerik Pipeline Orkestasyonu — ONCELIK 5 (ORTA-UZUN VADE)

**Mevcut durum:** `ttsController.js` icinde ~1800 satirlik monolitik fonksiyon. Tum adimlar tek bir Express handler icinde sirali calisiyor.

**Neden orkestrasyon gerekli:**
- Pipeline 9+ adimdan olusuyor ve her birinin basarisizlik modu farkli
- Arada hata olursa tum pipeline basarısız olur; kısmi kurtarma yok
- Ilerleme takibi sinirli — kullanici "islem surumde" mesajindan baska bilgi almiyor

**Ideal kuyruk tipi:** Workflow orkestrasyon araci (Temporal.io, Inngest) veya adim bazli kuyruk zinciri.

**Not:** Bu en karmasik degisiklik; diger onceliklerin tamamlanmasindan sonra ele alinmali.

---

## 3. 5 Modern Kuyruk Alternatifi Karsilastirmasi

### 3.1 BullMQ (Redis)

**Mimari:** Redis uzerinde calisan Node.js is kuyrugu. Job persistence, priority queue, rate limiting, retry mekanizmasi ve dashboard (Bull Board) destegi var. Worker'lar ayri process'lerde calisabilir.

**LingRoot'a Uygunluk:**
- Zaten **kismen implement edilmis**: `ttsWorker.js`, `podcastWorker.js`, `bullQueue.js` dosyalari mevcut
- Priority sistemi tanimli: Free -> Free Trial -> Basic -> Premium (PRIORITY objesi `bullQueue.js:33-39`)
- Redis baglantisi ve fallback modu (`redisClient.js`) hazir
- Worker event handling (completed, failed, stalled, error) implement edilmis

**Avantajlar:**
- Sifirdan yazmaya gerek yok — mevcut kodu aktive etmek yeterli
- Redis uzerinde kalicilik (sunucu restart'inda isler kaybolmaz)
- Priority queue (premium kullanicilara oncelik)
- Rate limiting (is/dakika siniri)
- Retry + exponential backoff
- Bull Board ile gorsel monitoring
- Buyuk ekosistem ve olgun kutüphane

**Dezavantajlar:**
- Redis sunucu gerekli (ek altyapi maliyeti)
- Redis baglanti sorunu tum kuyruk sistemini etkiler
- Redis bellek yonetimi gerekli (buyuk payload'lar icin dikkatli olmali)
- Yatay olcekleme icin Redis Cluster veya Redis Sentinel gerekli

**Maliyet Etkisi:**
- Redis: Supabase Add-on (~$0) veya ayri Redis servisi (Upstash Free Tier: 10K komut/gun, Pro: ~$10/ay)
- Gelistirme: Dusuk (mevcut kod aktive edilecek)

**Implementasyon Karmasikligi:** **DUSUK** — mevcut altyapi hazir, aktive etmek yeterli.

**Hangi Olcekte Mantikli:** 5K-50K kullanici. 50K+ icin Redis Cluster gerekir.

---

### 3.2 pg-boss (PostgreSQL)

**Mimari:** PostgreSQL uzerinde calisan is kuyrugu. SKIP LOCKED mekanizmasiyla eslestirme, JSONB ile is verisi, cron zamanlama destegi. Ek altyapi gerektirmez — mevcut PostgreSQL veritabanini kullanir.

**LingRoot'a Uygunluk:**
- Mevcut Supabase PostgreSQL **hicbir ek altyapi olmadan** kuyruk olarak kullanilabilir
- `pg` Pool baglantisi zaten mevcut (`backend/config/db.js`)
- Job durumu ve gecmisi ayni veritabaninda saklanir — tek veritabani yedegi yeterli
- Supabase Pooler uzerinden calismasi icin `pgBossSchema` ayari gerekli

**Avantajlar:**
- Ek altyapi gerektirmez (mevcut PostgreSQL yeterli)
- ACID uyumlu — is kaybi riski sifir
- Cron zamanlama destegi (periyodik isler icin)
- Job gecmisi ve istatistikleri SQL ile sorgulanabilir
- Supabase RLS ile guvenlik entegrasyonu mumkun
- Basit API: `boss.send()`, `boss.work()`

**Dezavantajlar:**
- Redis kadar hizli degil (polling tabanli, tipik ~1-2s gecikme)
- Yogun kuyruk trafigi DB yuku arttirir — zaten 20 baglanti limiti olan havuza ek yuk
- Priority queue destegi sinirli (BullMQ kadar esnek degil)
- PostgreSQL vacuum ve index bakimi gerekli
- Mevcut DB baglanti havuzu (20) doluysa kuyruk islemi de etkilenir

**Maliyet Etkisi:**
- Altyapi: $0 (mevcut Supabase PostgreSQL)
- DB yuku: Mevcut baglanti havuzundan pay alir — potansiyel darboğaz

**Implementasyon Karmasikligi:** **ORTA** — sifirdan implement edilmeli, DB migration gerekli.

**Hangi Olcekte Mantikli:** 1K-15K kullanici. 15K+ icin ayri kuyruk DB'si veya Redis'e gecis gerekir.

---

### 3.3 p-queue / bottleneck (In-Memory)

**Mimari:** Node.js process icinde calisan bellek-ici es zamanlilik kontrolu. `p-queue`: es zamanlilik sinirli Promise kuyrugu. `bottleneck`: hiz limiti + es zamanlilik kontrolu. Harici bagimlilik yok.

**LingRoot'a Uygunluk:**
- Mevcut `ConcurrencyLimiter` sinifi (`concurrencyLimiter.js`) temelde ayni isi yapiyor, ancak p-queue/bottleneck daha olgun ve test edilmis
- TTS chunk paralellestirme icin **ideal**: `for` dongusunu `p-queue` ile degistirmek yeterli
- OpenAI limiter icin `bottleneck` hiz sinirlamasi eklenebilir
- Mevcut semafor yapisi korunarak uzerine eklenebilir

**Avantajlar:**
- Sifir harici bagimlilik — `npm install p-queue` yeterli
- Cok dusuk gecikme (process-ici)
- Basit API: `queue.add(() => synthesize(chunk))`
- Es zamanlilik + hiz limiti (bottleneck)
- Timeout destegi
- Event emitter (idle, active, error)

**Dezavantajlar:**
- Kalicilik yok — sunucu restart'inda kuyrukta bekleyen isler kaybolur
- Retry mekanizmasi yok (elle implement edilmeli)
- Priority queue sinirli (p-queue'da var ama basit)
- Monitoring / dashboard yok
- Yatay olcekleme yok — tek process ile sinirli
- Sunucu cokerse islemde olan isler kaybolur

**Maliyet Etkisi:**
- Altyapi: $0
- npm paketi: p-queue ~15KB, bottleneck ~30KB

**Implementasyon Karmasikligi:** **COK DUSUK** — en az degisiklikle en hizli sonuc.

**Hangi Olcekte Mantikli:** 0-5K kullanici. 5K+ icin kalicilik gerekir.

---

### 3.4 Temporal.io / Inngest

**Mimari:** Uzun sureli is akislari (workflow) icin orkestrasyon platformu. Her adim bagimsiz bir "activity" olarak tanimlanir, hata durumunda otomatik retry/compensation/rollback yapilabilir. Durable execution — surec cokse bile is akisi kaldigi yerden devam eder.

**Temporal.io:** Self-hosted veya Temporal Cloud. Go/Java/TypeScript SDK. Agir altyapi.
**Inngest:** Serverless event-driven workflow. TypeScript-native. Hafif altyapi.

**LingRoot'a Uygunluk:**
- Icerik pipeline'i (9+ adim, ~117s) icin **ideal orkestrasyon araci**
- Her adim (OpenAI, TTS, MFA, FFmpeg, Upload) ayri activity olarak tanimlanabilir
- Arada hata olursa o adimdan devam edilebilir (kismen tamamlanmis pipeline kurtarilabilir)
- Kullaniciya adim bazli ilerleme gosterimi kolaylasir

**Avantajlar:**
- Durable execution — sunucu cokse bile is kaldigi yerden devam eder
- Adim bazli retry ve hata yonetimi
- Ilerleme takibi (her adim ayri event)
- Karmasik is akislari icin dogal yapi (fan-out, fan-in, saga pattern)
- Inngest: Vercel/Next.js entegrasyonu, serverless uyumlu
- Temporal: En guclu workflow motoru, buyuk olcek icin kanitlanmis

**Dezavantajlar:**
- Onemli mimari degisiklik gerektirir (pipeline yeniden yazimi)
- Temporal: Self-hosted icin Go + Cassandra/PostgreSQL altyapisi (agir)
- Temporal Cloud: ~$200/ay baslangic
- Inngest: Free tier 25K event/ay, Pro $50/ay
- Ogrenme egrisi yuksek
- Over-engineering riski (mevcut olcekte gerekli olmayabilir)

**Maliyet Etkisi:**
- Temporal Cloud: ~$200/ay+
- Inngest Pro: ~$50/ay
- Self-hosted Temporal: altyapi + bakim maliyeti

**Implementasyon Karmasikligi:** **YUKSEK** — pipeline yeniden yazimi + yeni altyapi + ogrenme sureci.

**Hangi Olcekte Mantikli:** 15K+ kullanici veya pipeline guvenirliligi kritik oldugunda.

---

### 3.5 Cloudflare Queues + Workers

**Mimari:** Cloudflare'in serverless kuyruk servisi. HTTP ile mesaj gonderilir, Worker fonksiyonlarinda islenir. At-least-once delivery, batch processing, retry destegi. Mevcut Cloudflare altyapisiyla entegre.

**LingRoot'a Uygunluk:**
- LingRoot zaten Cloudflare Tunnel kullaniyor (CLAUDE.md: "Deployment: Cloudflare Tunnel -> Backend Only")
- Cloudflare altyapisi mevcut — ek hesap/kurulum gerektirmez
- TTS chunk'larini queue'ya gonderip Worker'larda paralel islemek mumkun
- Ancak Worker'lar icinde Node.js API'leri (FFmpeg, fs, tmp) kullanilamiyor

**Avantajlar:**
- Mevcut Cloudflare altyapisiyla entegre
- Serverless — altyapi yonetimi yok
- Otomatik olcekleme
- At-least-once delivery garantisi
- Batch processing (1000 mesaj/batch)
- Dusuk maliyet (1M mesaj/ay ucretsiz)

**Dezavantajlar:**
- Worker ortami sinirli — Node.js degil, dosya sistemi yok, FFmpeg calistirilamaz
- TTS, MFA, FFmpeg gibi backend-agir islemler Worker'da calisamaz
- Backend'den Queue'ya, Queue'dan tekrar Backend'e routing karmasikligi
- Priority queue destegi sinirli
- Monitoring/debugging zorlugu
- Vendor lock-in

**Maliyet Etkisi:**
- Free tier: 1M mesaj/ay
- Paid: $0.40/M mesaj

**Implementasyon Karmasikligi:** **YUKSEK** — Worker sinirlamalari nedeniyle mimari degisiklik gerekli.

**Hangi Olcekte Mantikli:** Hafif islemler (bildirim, email, webhook) icin ideal. TTS/MFA gibi agir islemler icin uygun degil.

---

## 4. Karsilastirma Matrisi

| Kriter | BullMQ (Redis) | pg-boss (PostgreSQL) | p-queue (In-Memory) | Temporal/Inngest | CF Queues+Workers |
|--------|:-:|:-:|:-:|:-:|:-:|
| **Kalicilik (Persistence)** | Redis | PostgreSQL (ACID) | YOK | Durable execution | At-least-once |
| **Retry Mekanizmasi** | Dahili (exp. backoff) | Dahili | Manuel | Dahili (gelismis) | Dahili (basit) |
| **Priority Queue** | Tam destek | Sinirli | Basit | Tam destek | Sinirli |
| **Monitoring/Dashboard** | Bull Board | SQL sorgu | YOK | Temporal UI / Inngest UI | CF Dashboard |
| **Ek Altyapi Maliyeti** | Redis ($0-10/ay) | $0 (mevcut DB) | $0 | $50-200/ay | $0 (free tier) |
| **Implementasyon Karmasikligi** | DUSUK (zaten var) | ORTA | COK DUSUK | YUKSEK | YUKSEK |
| **Olceklenebilirlik** | Redis Cluster ile yuksek | DB siniri ile orta | Tek process ile dusuk | Cok yuksek | Cok yuksek (serverless) |
| **Ogrenme Egrisi** | Dusuk | Dusuk | Cok dusuk | Yuksek | Orta |
| **LingRoot Mevcut Uyumluluk** | YUKSEK (kod hazir) | ORTA (DB mevcut) | YUKSEK (kolay eklenir) | DUSUK (yeniden yazi) | DUSUK (Worker siniri) |
| **Hata Izolasyonu** | Is bazli | Is bazli | Promise bazli | Adim bazli (en iyi) | Mesaj bazli |
| **Node.js Uyumluluğu** | Tam | Tam | Tam | Tam (TS SDK) | Sinirli (Worker Runtime) |
| **Sunucu Restart Dayanikliligi** | Evet (Redis) | Evet (PostgreSQL) | HAYIR | Evet (durable) | Evet (queue) |

### Puanlama Ozeti (5 uzerinden)

| Cozum | Performans | Maliyet | Kolaylik | Uyumluluk | Olcek | **TOPLAM** |
|-------|:---:|:---:|:---:|:---:|:---:|:---:|
| **BullMQ** | 4 | 4 | 5 | 5 | 4 | **22** |
| **pg-boss** | 3 | 5 | 3 | 4 | 3 | **18** |
| **p-queue** | 5 | 5 | 5 | 5 | 2 | **22** |
| **Temporal/Inngest** | 5 | 2 | 2 | 2 | 5 | **16** |
| **CF Queues** | 3 | 5 | 2 | 2 | 5 | **17** |

**Not:** p-queue ve BullMQ ayni puani alsa da kullanim alanlari farkli. p-queue erken asamada hizli cozum icin, BullMQ buyumeyle birlikte kalicilik icin idealdir.

---

## 5. LingRoot Icin Onerilen Kuyruk Stratejisi

### Faz 1: Hizli Kazanimlar (0-5K Kullanici)

**Cozum:** `p-queue` ile bellek-ici paralellestirme

**Kapsam:**
1. TTS chunk sentezlemeyi `for` dongusunden `p-queue` ile paralel islemeye cevir
   - Es zamanlilik: 4-5 chunk ayni anda
   - Tahmini kazanim: TTS suresi ~40s -> ~10s
2. Mevcut `limiters.openai` semaforunu tum OpenAI cagri noktalarinda aktive et
   - 13 dosyadaki 23+ cagri noktasina `acquire()/release()` ekle
   - Mevcut kod degisikligi: minimal (her cagriyi try/finally blogu ile sar)
3. MFA parcalarini paralel gonder (es zamanli polling)
   - 3-4 MFA job'u ayni anda gonder ve paralel poll et
   - Tahmini kazanim: MFA suresi ~60s -> ~20s

**Neden bu cozum:**
- Sifir harici bagimlilik — `npm install p-queue` yeterli
- Mevcut koda minimal mudahale
- En hizli implementasyon suresi
- 5K kullaniciya kadar kalicilik gereksiz (istek basina islem)

**Sinirlamalar:**
- Sunucu restart'inda kuyrukta bekleyen isler kaybolur (kabul edilebilir — istek bazli islem)
- Dashboard/monitoring yok
- Yatay olcekleme yok

---

### Faz 2: Kalicilik ve Olcekleme (5K-15K Kullanici)

**Cozum A (Onerilen):** Mevcut BullMQ altyapisini aktive et

**Kapsam:**
1. Redis baglantisini sabitlenmis sekilde yapilandir (Upstash veya Supabase Redis add-on)
2. `ttsWorker.js` ve `podcastWorker.js`'yi aktive et
3. Podcast olusturmayi BullMQ kuyruguna tasi (push bildirim zaten implement)
4. Priority sistemi devreye al (premium kullanicilara oncelik)
5. Bull Board dashboard'u ekle (monitoring)

**Cozum B (Alternatif):** pg-boss ile PostgreSQL-tabanli kuyruk

- Redis kurmak istenmiyorsa mevcut PostgreSQL kullanilabilir
- Ancak DB havuzu (20 baglanti) ile paylasimli kullanim darboğaz olusturabilir
- Ayri kuyruk connection pool'u ayarlanmali

**Neden bu cozum:**
- BullMQ kodu zaten yazilmis — yalnizca Redis'i saglamlarstirmak ve worker'lari aktive etmek gerekli
- Priority sistemi premium kullanicilara daha iyi deneyim sunar
- Retry + persistence ile is kaybi riski ortadan kalkar

---

### Faz 3: Workflow Orkestrasyon (15K+ Kullanici)

**Cozum:** Inngest veya Temporal.io ile pipeline orkestasyonu

**Kapsam:**
1. Icerik pipeline'ini adim bazli workflow'a cevir
2. Her adim bagimsiz activity:
   - `extract-input` -> `translate-adapt` -> `chunk-text` -> `synthesize-tts` (fan-out) -> `align-mfa` (fan-out) -> `merge-audio` -> `generate-subtitles` -> `upload-storage` -> `save-db`
3. Kismi hata kurtarma (TTS basarisiz olursa sadece TTS tekrarlanir)
4. Adim bazli ilerleme takibi (kullaniciya gercek zamanli guncelleme)

**Neden bu olcekte:**
- 15K+ kullanicida pipeline guvenilirligi kritik
- Adim bazli retry/compensation is kayiplarini minimize eder
- Fan-out/fan-in pattern'i ile TTS ve MFA dogal olarak paralellestir
- Dashboard ile operasyonel gorünürlük

**Onerilen arac:** **Inngest** — serverless, TypeScript-native, Vercel uyumlu, ogrenme egrisi Temporal'dan dusuk.

---

## 6. Pipeline Yeniden Tasarim Onerileri

### 6.1 TTS: Sirali -> Paralel Chunk Isleme

**Mevcut (`ttsController.js:1119`):**
```javascript
for (let i = 0; i < finalChunks.length; i++) {
  const chunk = finalChunks[i];
  ttsResult = await synthesizeWithGoogle({ text: chunk, ... });
  audioSegments.push(ttsResult);
}
```

**Onerilen (p-queue ile):**
```javascript
import PQueue from 'p-queue';

const ttsQueue = new PQueue({ concurrency: 5 }); // 5 chunk ayni anda

const results = await Promise.all(
  finalChunks.map((chunk, i) =>
    ttsQueue.add(() => synthesizeWithGoogle({ text: chunk, ... }))
  )
);
// Sonuclar sirali — chunk indexi korunur
```

**Tahmini Performans Kazanimi:**

| Metrik | Mevcut (Sirali) | Onerilen (5 Paralel) | Kazanim |
|--------|:---:|:---:|:---:|
| 20 chunk TTS suresi | ~40s | ~8-10s | **%75-80** |
| 10 chunk TTS suresi | ~20s | ~4-5s | **%75-80** |
| 5 chunk TTS suresi | ~10s | ~2-3s | **%70-75** |
| Google TTS API yuku | 1 istek/2s | 5 istek/2s | 5x artis |

---

### 6.2 MFA: Batch Submission

**Mevcut (`mfaAligner.js:162`):**
- Her audio segment icin ayri HTTP POST + polling
- 20 segment x (submit + poll) = ~60s

**Onerilen:**
- Birden fazla segmenti ayni anda MFA servisine gonder
- Paralel polling (tum job'lari ayni anda kontrol et)

**Tahmini Performans Kazanimi:**

| Metrik | Mevcut (Sirali) | Onerilen (4 Paralel) | Kazanim |
|--------|:---:|:---:|:---:|
| 20 segment MFA suresi | ~60s | ~15-20s | **%65-75** |
| MFA servis yuku | 1 job/seferde | 4 job/seferde | 4x artis |
| Circuit breaker riski | Dusuk | Orta (yuk artisi) | Dikkatli olunmali |

**Not:** MFA servisinin paralel is kapasitesi kontrol edilmeli. Kademeli artis onerilir (2 -> 3 -> 4).

---

### 6.3 OpenAI: Limiter Aktivasyonu

**Mevcut:** `limiters.openai` tanimli ama hic kullanilmiyor.

**Onerilen:** Tum OpenAI cagri noktalarinda acquire/release pattern'i uygulanmali:

```javascript
const { limiters } = require('../utils/infra/concurrencyLimiter.js');

async function callOpenAI(params) {
  const slot = await limiters.openai.acquire(30000);
  if (!slot.acquired) {
    throw new Error(`OpenAI limiter: ${slot.reason}`);
  }
  try {
    return await openai.chat.completions.create(params);
  } finally {
    limiters.openai.release();
  }
}
```

**Etkilenen dosyalar (13):**
- `wordTranslationService.js`, `inputExtractor.js`, `translateAndAdapt.js`
- `topicPipelineController.js`, `googleTTSMultiSpeaker.js`, `cefrAdapter.js`
- `translateFromEnglish.js`, `narrationController.js`, `llmPatternController.js`
- `topicDetailController.js`, `topicSuggestController.js`, `topicHierarchyController.js`
- `hobbySuggestionsController.js`

---

### 6.4 Toplam Pipeline Performans Tahmini

Faz 1 degisiklikleri uygulandiktan sonra tahmini pipeline suresi:

| Adim | Mevcut | Faz 1 Sonrasi | Kazanim |
|------|:---:|:---:|:---:|
| Girdi cikarimi | 0.5s | 0.5s | — |
| Metin temizleme | 0.3s | 0.3s | — |
| Ceviri + CEFR (OpenAI) | 3-5s | 3-5s | — |
| Kalip cikarimi (OpenAI) | 1-2s | 1-2s | — |
| Metin parcalama | 0.2s | 0.2s | — |
| **TTS sentezleme** | **~40s** | **~10s** | **%75** |
| **MFA hizalama** | **~60s** | **~20s** | **%67** |
| FFmpeg birlestirme | 2s | 2s | — |
| VTT olusturma | 1s | 1s | — |
| Depolama yukleme | 3s | 3s | — |
| DB kaydi | 1s | 1s | — |
| **TOPLAM** | **~117s** | **~45s** | **%62** |

**Sonuc:** Yalnizca TTS ve MFA paralellestirmesi ile pipeline suresi **~117 saniyeden ~45 saniyeye** dusurulur. Bu, harici bagimlilik olmadan elde edilebilecek en buyuk kazanimdir.

### 6.5 Faz Bazli Kumulatif Kapasite Etkisi

| Metrik | Mevcut | Faz 1 | Faz 2 | Faz 3 |
|--------|:---:|:---:|:---:|:---:|
| Pipeline suresi | ~117s | ~45s | ~40s | ~35s |
| Eszamanli icerik olusturma | 10-15 | 25-35 | 40-60 | 80-120 |
| Eszamanli podcast | 3-5 | 3-5 | 10-15 | 20-30 |
| Toplam eszamanli kullanici | 50-80 | 100-150 | 200-300 | 500+ |
| Is kaybi riski (restart) | Yuksek | Yuksek | Dusuk (Redis) | Cok dusuk |
| Monitoring | Yok | Yok | Bull Board | Temporal/Inngest UI |

---

## Ek: Anahtar Kaynak Dosya Referanslari

| Dosya | Amac |
|-------|------|
| `backend/utils/infra/concurrencyLimiter.js` | Global ConcurrencyLimiter sinifi + TTS/Podcast/OpenAI semaforlari |
| `backend/utils/infra/jobQueue.js` | Bellek-ici is kuyrugu (Map tabanli, durum takibi) |
| `backend/utils/infra/bullQueue.js` | BullMQ kuyruk tanimlari, priority, retry, fallback |
| `backend/workers/ttsWorker.js` | BullMQ TTS worker (devre disi) |
| `backend/workers/podcastWorker.js` | BullMQ Podcast worker (devre disi) |
| `backend/controllers/ttsController.js` | Ana pipeline, sirali TTS dongusu (:1119), per-user limiter (:42-82) |
| `backend/utils/audio/mfaAligner.js` | MFA istemcisi, circuit breaker, async polling |
| `backend/utils/storage/redisClient.js` | Redis baglantisi, yeniden deneme, yedek mod |
| `backend/middleware/security.js` | IP-bazli hiz sinirlandirmalari |
| `backend/routes/metricsRoutes.js` | Limiter istatistikleri endpoint'i |
| `backend/routes/ttsRoutes.js` | Podcast ConcurrencyLimiter kullanimi |
