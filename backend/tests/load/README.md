# Ses Olustur - Yuk Testi

> **Created:** 2026-02-05 | **Updated:** 2026-02-05 | **Version:** 1.0

"Ses Olustur" butonunun tetikledigi endpoint'ler icin yuk testi altyapisi.

## Gereksinimler

- **k6** (Grafana): `brew install k6`
- **Node.js**: Test kullanici uretimi icin
- **Backend**: `LOAD_TEST_MODE=true` ile calistirilmali

## Hizli Baslangic

```bash
# 1. k6 kur
brew install k6

# 2. Test kullanicilari uret
node backend/tests/load/scripts/generate-test-users.js

# 3. Seed SQL'i Supabase SQL Editor'da calistir
#    Dosya: backend/tests/load/scripts/seed-test-data.sql

# 4. Backend'i load test modunda baslat
LOAD_TEST_MODE=true node backend/server.js

# 5. Smoke test (10 VU)
k6 run backend/tests/load/scenarios/smoke-10vu.js

# 6. Load test (100 VU)
k6 run backend/tests/load/scenarios/load-100vu.js

# 7. Stress test (1000 VU)
k6 run backend/tests/load/scenarios/stress-1000vu.js
```

## JSON Rapor Ciktisi

```bash
k6 run --out json=backend/tests/load/reports/result.json \
  backend/tests/load/scenarios/load-100vu.js
```

## Test Edilen Endpoint'ler

| Endpoint | Yontem | Aciklama |
|----------|--------|----------|
| `/api/tts/process-async` | POST | Ana async TTS |
| `/api/tts/create-podcast-async` | POST | Async podcast olusturma |
| `/api/tts/job/:jobId` | GET | Job durumu polling |
| `/api/tts/job/active` | GET | Aktif job kontrolu |

## Mock Stratejisi

`LOAD_TEST_MODE=true` oldugunda:
- **OpenAI** (CEFR, ceviri, bilingual, mood): Sabit metin + 100ms gecikme
- **Google TTS**: Mock MP3 buffer + sahte timing, 200ms gecikme
- **Google TTS Multi-Speaker**: Mock podcast sonucu, 300ms gecikme
- **MFA Aligner**: Sahte word-level timestamp, 500ms gecikme
- **Supabase Storage**: Sahte URL, 50ms gecikme
- **Push Notification**: No-op, aninda donus

**Mock'lanMAYAN servisler:**
- **DB (Supabase)**: Gercek DB pool pressure testi icin
- **FFmpeg**: CPU pressure testi icin (`LOAD_TEST_SKIP_FFMPEG=false`)

## Senaryolar

### Smoke Test (10 VU)
- Sure: ~4 dakika
- Esikler: p95 < 5s, hata < %5
- Amac: Mock dogrulama ve temel akis testi

### Load Test (100 VU)
- Sure: ~13 dakika
- Esikler: p95 < 10s, hata < %10
- Amac: Concurrency limiter, DB pool, kuyruk baskisi

### Stress Test (1000 VU)
- Sure: ~18 dakika
- Esikler: p95 < 30s, hata < %50
- Amac: Graceful degradation, bellek sizintisi, event loop lag

## Monitoring

Load test sirasinda backend metrikleri:
```bash
curl http://localhost:5001/api/debug/load-test-stats | jq
```

Dondurdugu metrikler:
- `memory`: RSS, heap used/total
- `limiters`: TTS/Podcast/OpenAI concurrency stats
- `jobQueue`: Aktif/pending/completed/failed job sayilari
- `eventLoopLagMs`: Event loop gecikmesi

## Temizlik

Test sonrasi:
```bash
# cleanup-test-data.sql'i Supabase SQL Editor'da calistir
# Dosya: backend/tests/load/scripts/cleanup-test-data.sql
```

## Dosya Yapisi

```
backend/tests/load/
├── README.md                    # Bu dosya
├── config/
│   └── load-test.env            # Cevre degiskenleri
├── fixtures/
│   ├── silent-1s.mp3            # Mock TTS icin minimal MP3
│   ├── mock-texts.json          # Ornek metinler
│   └── test-users.json          # Uretilen test kullanicilari (gitignore)
├── scripts/
│   ├── generate-test-users.js   # Test kullanici + JWT uretme
│   ├── seed-test-data.sql       # DB'ye test verisi ekleme
│   └── cleanup-test-data.sql    # Test sonrasi temizlik
├── mocks/
│   ├── mockConfig.js            # Merkezi mock konfigurasyon
│   ├── openaiMock.js            # OpenAI mock yanitlari
│   ├── ttsMock.js               # Google TTS mock
│   ├── mfaMock.js               # MFA mock timestamp uretimi
│   ├── storageMock.js           # Supabase Storage mock
│   └── notificationMock.js      # Push notification no-op
├── scenarios/
│   ├── helpers/
│   │   ├── auth.js              # Token secimi (VU ID bazli)
│   │   ├── data.js              # Rastgele test verisi
│   │   └── checks.js            # Ortak k6 check fonksiyonlari
│   ├── smoke-10vu.js            # 10 VU smoke test
│   ├── load-100vu.js            # 100 VU load test
│   └── stress-1000vu.js         # 1000 VU stress test
├── monitoring/
│   └── stats-endpoint.js        # /api/debug/load-test-stats kodu
└── reports/
    └── .gitkeep                 # Raporlar buraya kaydedilecek
```

## Dogrulama Adimlari

1. **Mock dogrulama**: `LOAD_TEST_MODE=true` ile backend baslat, tek TTS istegi gonder, OpenAI/Google/MFA cagrilmadigi loglardan dogrula
2. **Smoke test**: 10 VU calistir, tum job'lar `completed` olmali
3. **Load test**: 100 VU calistir, `/api/debug/load-test-stats` ile limiter stats kontrol et
4. **Stress test**: 1000 VU calistir, bellek buyumesi ve 503 orani raporla
5. **Temizlik**: `cleanup-test-data.sql` calistir
