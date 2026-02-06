# Kullanim Hesaplama & TTS Provider-Aware Fiyatlandirma

> **Created:** 2026-01-31 | **Updated:** 2026-01-31 | **Version:** 1.0

## Genel Bakis

LingRoot, kullanici bazinda API maliyetlerini takip eder ve aktif abonelik planina gore kullanim limitleri uygular. Sistem cift limiter yaklasimi kullanir: karakter limiti vs. USD butce limiti (hangisi dusukse o gecerlidir).

## Akis

1. Kullanici icerik olusturur (ses, podcast vb.)
2. Backend, maliyeti `api_costs` tablosuna `costTracker.logApiCost()` ile yazar
3. Herhangi bir kullanim kontrol isteginde `usageLimiter.checkLimits(userId)` mevcut fatura donemi icin maliyetleri toplar
4. `getUsageTotals()`, `periodStart`'tan itibaren `api_costs` satirlarini toplar
5. `GET /api/subscription/usage-summary` tam kullanim durumunu + TTS provider bilgisini frontend'e dondurur

## TTS Provider Tespiti

Aktif TTS provider `settings` tablosunda saklanir:

```sql
SELECT value FROM settings WHERE key = 'tts_provider';
```

Su anki deger: `google` (ayarlanmamissa varsayilan fallback).

Provider, `voiceModelService.getTtsProvider()` ile cozumlenir ve usage-summary response'una eklenir.

## Tier Fiyatlandirmasi

Fiyat tier'lari `backend/utils/infra/costTracker.js` icinde tanimlidir ve provider'a gore degisir.

### Google TTS

| Tier | Key | 1K karakter basi maliyet | Ses Turleri |
|------|-----|--------------------------|-------------|
| Basic | `basic` | $0.004 | Standard sesler |
| Silver | `silver` | $0.016 | WaveNet / Neural2 |
| Gold | `gold` | $0.020 | Chirp / Journey |
| Platinum | `platinum` | $0.160 | Studio |

### Amazon Polly (fallback)

| Tier | Key | 1K karakter basi maliyet | Ses Turleri |
|------|-----|--------------------------|-------------|
| Standard | `standard` | $0.004 | Standard sesler |
| Neural | `neural` | $0.016 | Neural sesler |
| Generative | `generative` | $0.030 | Generative / Long-form |

`costTracker.js` icindeki `getTtsTiers(provider)` fonksiyonu, provider string'ine gore uygun tier objesini dondurur.

## Cift Limiter Mantigi

Iki bagimsiz limit kontrol edilir. Daha kisitlayici olan gecerli olur:

1. **Karakter limiti** (`ttsCharLimit`): Fatura donemi basina maksimum TTS karakteri, abonelik planinda tanimlidir.
2. **USD butce limiti** (`monthlyUsdLimit`): Plan fiyatindan (TRY) hesaplanir.

### USD Butce Hesabi

```
budgetUsd = planPriceTRY / usdTryRate / 3
```

- `planPriceTRY`: Turk Lirasi cinsinden plan fiyati
- `usdTryRate`: Guncel USD/TRY doviz kuru (`settings` tablosundan)
- Bolen `3`: Guvenlik marji (cevrilen USD'nin yalnizca 1/3'u API butcesi olarak ayrilir)

### Efektif Kalan Karakter (tier basina)

Her TTS tier'i icin:

```
remainingCharsByUsd = (remainingUsd * 1000) / costPer1k
remainingCharsByLimit = charLimit - usedChars
effectiveRemaining = min(remainingCharsByLimit, remainingCharsByUsd)
```

## Free Trial

Free Trial kullanicilari farkli bir modelde calisir:

- Maksimum **3 ses olusturma** hakki (karakter bazli degil)
- `audioCreationCount` / `maxAudioCount` / `remainingAudioCount` ile takip edilir
- Haklar tukendiginde `isFreeTrialExhausted = true` olur
- Tier bazli kullanim gorunumu atlanir; bunun yerine basit bir sayac UI'i gosterilir

## Podcast Maliyet Tahmini

Podcast'ler UI'da sabit bir maliyet tahmini kullanir:

```
COST_PER_PODCAST_USD = $0.25
remainingPodcasts = remainingUsd / 0.25
```

Bu, 10-15 dakikalik bir podcast icin neural TTS + LLM uretim maliyetlerini kapsayan yaklasik bir tahmindir.

## api_costs Tablosu

Kullanim takibinde kullanilan temel kolonlar:

| Kolon | Tip | Aciklama |
|-------|-----|----------|
| `id` | uuid | Primary key |
| `user_id` | uuid | Maliyeti olusturan kullanici |
| `feature` | text | Ozellik adi (orn. `topic_subtopics`, `podcast_creation`) |
| `provider` | text | API saglayici (`openai`, `google_tts`, `aws_polly`) |
| `model` | text | Model/ses adi (orn. `gpt-4o-mini`, `en-US-AriaNeural`) |
| `input_quantity` | integer | Girdi token veya karakter sayisi |
| `output_quantity` | integer | Cikti token sayisi (yalnizca OpenAI) |
| `cost_usd` | numeric | USD cinsinden hesaplanan maliyet |
| `metadata` | jsonb | Ek baglamsal veri (topic_id vb.) |
| `created_at` | timestamptz | Maliyetin kaydedildigi zaman |

## API Response Yapisi

`GET /api/subscription/usage-summary` donusu:

```json
{
  "success": true,
  "data": {
    "hasPlan": true,
    "subscription": { ... },
    "plan": { ... },
    "plantype": "Premium",
    "periodStart": "2026-01-01T00:00:00.000Z",
    "usage": {
      "openaiTokens": 12500,
      "ttsChars": 45000,
      "openaiCostUsd": 0.05,
      "ttsCostUsd": 0.18,
      "totalCostUsd": 0.23
    },
    "limits": {
      "openaiTokenLimit": null,
      "ttsCharLimit": 500000,
      "monthlyUsdLimit": 2.50,
      "pricing": {
        "planPriceTry": 300,
        "usdTryRate": 40,
        "budgetUsdFromTry": 2.50
      }
    },
    "exceeded": { "openai": false, "tts": false, "usd": false },
    "isExceeded": false,
    "ttsProvider": "google",
    "ttsTiers": {
      "basic":    { "label": "Basic",    "costPer1k": 0.004 },
      "silver":   { "label": "Silver",   "costPer1k": 0.016 },
      "gold":     { "label": "Gold",     "costPer1k": 0.020 },
      "platinum": { "label": "Platinum", "costPer1k": 0.160 }
    }
  }
}
```

## Ilgili Dosyalar

| Dosya | Rol |
|-------|-----|
| `backend/utils/infra/costTracker.js` | Maliyet hesaplama, tier fiyatlandirma, api_costs loglama |
| `backend/utils/infra/usageLimiter.js` | `checkLimits()` — kullanimi toplar, limitleri uygular |
| `backend/services/voiceModelService.js` | `getTtsProvider()` — settings'ten aktif TTS provider'i okur |
| `backend/controllers/subscriptionController.js` | `getUsageSummary()` — endpoint handler |
| `LingRootMobile/src/utils/usageEstimates.ts` | Client-side tahmin hesaplama (provider-aware) |
| `LingRootMobile/src/components/UsageEstimateCard.tsx` | Tier bazli kullanim gosteren UI bileseni |
