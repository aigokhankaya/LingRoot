# Talep Edilen Ses (ve Seviye Paketi) API'si — LingRoot Core'dan İstek

> Hazırlayan: Video Factory tarafı · Tarih: 2026-06-22
> Muhatap: LingRoot Core/Backend ekibi
> Amaç: Video Factory'nin A1–C2 videolarını üretebilmesi için LingRoot Core'dan
> seviye-bazlı **seslendirme (TTS), altyazı ve script** sağlayan tek bir internal
> endpoint'in tanımlanması.

---

## 1. Özet (TL;DR)

Video Factory, bir konuyu **6 CEFR seviyesinde** (A1, A2, B1, B2, C1, C2) videoya
dönüştürüyor. Tüm seviyeler **aynı görselleri** kullanıyor; seviyeden seviyeye
değişen tek şey **seslendirme metni + ses dosyası + altyazı + konuşma hızı**.

Şu an LingRoot tarafında **ses üretip dışarı veren bir API yok.** İhtiyacımız olan
şey net: aşağıdaki kontrata uyan **tek bir internal endpoint**:

```
POST /internal/video-level-package
```

Bu endpoint, **tek bir CEFR seviyesi için** şunları döndürmeli:

1. **Seslendirme ses dosyası** (TTS ile üretilmiş, erişilebilir bir URL) — *asıl
   eksik olan parça budur.*
2. Seviyeye uygun **script** (sahne bazlı parçalanmış).
3. Sahne bazlı **altyazı** (timing'li, SRT uyumlu).
4. Ses süresi, konuşma hızı ve ses profili meta verisi.

Video Factory bu endpoint'i **konu başına 6 kez** (her seviye için bir kez)
çağıracak. İstek/yanıt kontratı bizde **kod ve JSON Schema olarak hazır**; backend
sadece bu kontrata uyan endpoint'i implemente etmeli.

---

## 2. Neden bu API? (bağlam)

- Video Factory mimari kararı gereği **kendi içinde ses/CEFR metni/altyazı
  üretmez.** Bu yetkinliğin sahibi LingRoot Core'dur (ürün kalitesi orada).
- Video Factory'nin akışı: ortak görseller üretilir → her seviye için Core'dan ses
  paketi alınır → ses + ortak görsel + altyazı render servisine (JSON2Video)
  gönderilir → video çıkar.
- Bu zincirin **tek eksik halkası** Core'un ses/altyazı/script paketi döndüren
  endpoint'i. Video Factory tarafındaki mock, HTTP client, doğrulama ve testler
  tamamlandı; gerçek backend bağlanınca uçtan uca çalışacak.

---

## 3. En kritik kısıt: **sahne-farkındalı (scene-aware) çıktı**

Bu, üzerinde anlaşılması gereken en önemli madde:

> Tüm seviyeler **aynı görsel sahne listesini** paylaşır. Bu yüzden Core'un
> döndürdüğü script ve altyazı, **istekte gönderdiğimiz `scene_ids` ile birebir
> eşleşmeli ve aynı sırada olmalı.**

- İstekte sahne kimlikleri (`scene_ids`) **sıralı** olarak gönderilir
  (örn. `["scene-1","scene-2","scene-3"]`).
- Yanıttaki `script_lines` **tam olarak aynı sahne kimliklerini, aynı sırada**
  içermek zorunda.
- Yanıttaki `subtitle_lines` **her sahneyi kapsamalı** ve her cue bir `scene_id`'ye
  bağlı olmalı.

> ⚠️ Düz metni (paragraf) gönderip Video Factory'nin sonradan tahmini olarak
> sahnelere bölmesini **istemiyoruz.** Bölme/eşleme kararını metin kalitesinin
> sahibi olan Core vermeli. Video Factory bu kuralı sunucu yanıtında **zorunlu
> olarak doğrular**, uymayan yanıtı reddeder (bkz. §7).

---

## 4. İstek kontratı (Request)

`POST /internal/video-level-package`

Header:

```
Authorization: Bearer <LINGROOT_CORE_API_KEY>
Content-Type: application/json
Accept: application/json
```

Gövde (her alan **zorunlu**):

```json
{
  "schema_version": 1,
  "topic_id": "why-do-people-forget-new-words",
  "topic": "Why do people forget new words?",
  "core_message": "People forget new words because memory needs repetition, retrieval and meaningful context.",
  "target_level": "A1",
  "target_duration_seconds": 45,
  "language": "en",
  "voice_profile": "english_female",
  "subtitle_format": "srt",
  "content_style": "short_listening_video",
  "brand": "LingRoot",
  "scene_ids": ["scene-1", "scene-2", "scene-3"]
}
```

| Alan | Tip | Kural / Not |
|---|---|---|
| `schema_version` | int | Sabit `1`. Kontrat versiyonu. |
| `topic_id` | string | Konu slug'ı; yanıtta birebir geri dönmeli. |
| `topic` | string | İnsan-okur konu başlığı. |
| `core_message` | string | Konunun ana fikri; tüm seviyeler bunu anlatır. |
| `target_level` | enum | `A1\|A2\|B1\|B2\|C1\|C2`. Tek seviye. |
| `target_duration_seconds` | number | 10–180 (tipik 30–60). Hedef video/ses süresi. |
| `language` | string | Örn. `en`. |
| `voice_profile` | string | Örn. `english_female`. TTS ses profili. |
| `subtitle_format` | const | Sabit `srt`. |
| `content_style` | const | Sabit `short_listening_video`. |
| `brand` | const | Sabit `LingRoot`. |
| `scene_ids` | string[] | **Sıralı, benzersiz**, en az 1. Script/altyazı bunlara hizalanmalı. |

---

## 5. Yanıt kontratı (Response)

HTTP 200 + gövde (her alan **zorunlu**):

```json
{
  "schema_version": 1,
  "topic_id": "why-do-people-forget-new-words",
  "level": "A1",
  "voiceover_script": "We learn new words. Then we forget them. This is normal...",
  "script_lines": [
    { "scene_id": "scene-1", "text": "We learn new words." },
    { "scene_id": "scene-2", "text": "Then we forget them." },
    { "scene_id": "scene-3", "text": "This is normal." }
  ],
  "audio_url": "https://<erişilebilir-host>/audio/a1.mp3",
  "subtitle_url": "https://<erişilebilir-host>/subtitles/a1.srt",
  "subtitle_lines": [
    { "scene_id": "scene-1", "start": 0.0, "end": 2.1, "text": "We learn new words." },
    { "scene_id": "scene-2", "start": 2.1, "end": 4.4, "text": "Then we forget them." },
    { "scene_id": "scene-3", "start": 4.4, "end": 6.0, "text": "This is normal." }
  ],
  "duration_seconds": 6.0,
  "voice_profile": "english_female",
  "speaking_rate": 0.82
}
```

| Alan | Tip | Kural / Not |
|---|---|---|
| `schema_version` | int | Sabit `1`. |
| `topic_id` | string | İstekteki ile **birebir aynı** olmalı. |
| `level` | enum | İstekteki `target_level` ile **birebir aynı** olmalı. |
| `voiceover_script` | string | Tam seslendirme metni (düz). |
| `script_lines` | array | `scene_id`+`text`. **İstekteki `scene_ids` ile aynı sıra.** |
| `audio_url` | string (uri) | **TTS ses dosyasının erişilebilir URL'i.** Bkz. §6. |
| `subtitle_url` | string (uri) | SRT altyazının erişilebilir URL'i. |
| `subtitle_lines` | array | `scene_id`,`start`,`end`,`text`. Her sahneyi kapsamalı; `end>start`; `end` ses süresini aşmamalı. |
| `duration_seconds` | number | Üretilen **ses dosyasının gerçek süresi** (saniye). |
| `voice_profile` | string | Kullanılan ses profili. |
| `speaking_rate` | number | Konuşma hızı (örn. 0.82). Seviyeye göre değişmeli. |

---

## 6. Ses dosyası gereksinimleri (asıl talep — detay)

Asıl eksik yetenek **server-side TTS + barındırma**. `audio_url` için
beklentilerimiz:

**Format & kalite**
- Konteyner/codec: **MP3** (tercih) veya AAC/M4A. (Render servisi MP3'ü sorunsuz
  alıyor.)
- Örnekleme: 44.1 kHz veya 48 kHz; mono yeterli (stereo da olur).
- Bitrate: ≥ 128 kbps.
- Ses seviyesi: konuşma için makul normalize edilmiş (hedef ~ -16 LUFS civarı),
  klipsiz.
- Baş/son sessizlik minimal; süre `duration_seconds` ile tutarlı (±0.25s tolerans).

**Erişilebilirlik (kritik)**
- `audio_url` ve `subtitle_url`, **render servisi (JSON2Video) tarafından doğrudan
  HTTP GET ile indirilebilir** olmalı. Yani:
  - Public URL **veya** kısa-ömürlü **signed URL** olabilir.
  - Localhost / internal-only / VPN-arkası adresler **olmaz** (render bulutta
    çalışıyor).
- Signed URL kullanılacaksa **geçerlilik süresi en az 30–60 dakika** olmalı (render
  submit→poll→download zinciri için; tipik poll timeout'umuz ~10 dk + buffer).
- URL stabil olmalı; çağrı başına tek seferlik tüketilen (one-shot) URL **olmaz**,
  render birden çok kez GET edebilir.

**Seviyeye göre gerçek farklılaşma (platform riski için önemli)**
- Aynı görsellerle 6 video ürettiğimiz için, ses tarafında **gerçek seviye farkı**
  şart (yoksa platformlar "tekrar içerik" olarak görebilir). Beklenen:
  - `speaking_rate` seviyeye göre artmalı (A1 yavaş → C2 doğal/hızlı).
  - Cümle uzunluğu/kelime zorluğu seviyeye göre belirgin değişmeli.
- Referans olarak Video Factory tarafındaki rubric: `config/level-rules.json`
  (A1: ~90 wpm, çok kısa cümle … C2: ~160 wpm, doğal/sofistike).

---

## 7. Davranışsal gereksinimler (Video Factory bunları doğruluyor)

Bunlar Video Factory'nin HTTP client'ında **kodlanmış ve test edilmiş** kontroller;
backend yanıtı bunlara uymazsa istek hata sayılır:

- **Auth:** `Authorization: Bearer <key>`. Key hiçbir log/hata mesajında geçmemeli.
- **topic/level eşleşmesi:** yanıt `topic_id` ve `level`, istekle aynı olmalı.
- **Sahne sırası:** `script_lines` sahne kimlikleri = istek `scene_ids` (aynı sıra).
- **Altyazı kapsamı/timing:** her sahne en az bir cue ile kapsanmalı; her cue
  `end > start`; hiçbir cue `duration_seconds`'ı (≈+0.25s) aşmamalı.
- **Şema:** yanıt §5 JSON Schema'sına birebir uymalı (`additionalProperties:false`
  — fazladan alan reddedilir).
- **Hata kodları:** geçici hatalar için `408, 425, 429, 500, 502, 503, 504` →
  Video Factory **otomatik retry** eder (exponential backoff, varsayılan 3 deneme).
  Kalıcı hatalar (4xx, örn. 400/401/404) retry edilmez.
- **Timeout:** istek başına varsayılan 30 sn (yapılandırılabilir). TTS üretimi uzun
  sürüyorsa lütfen belirtin; timeout'u artırırız veya async pattern konuşuruz
  (bkz. §9 açık sorular).
- **Idempotency:** aynı istek tekrar gönderildiğinde tutarlı sonuç beklenir;
  retry güvenli olmalı.

---

## 8. Kullanım profili / hacim

- Çağrı birimi: **konu başına 6 istek** (her CEFR seviyesi için 1), genelde art arda.
- Başlangıç hacmi: günde ~1 konu (≈6 çağrı/gün). İleride haftada 2–3 konu.
- Eşzamanlılık düşük (Video Factory seviyeleri sıralı işleyebilir).
- Yani başlangıçta **yüksek throughput gerekmez**; öncelik **kalite + doğru
  kontrat**.

---

## 9. LingRoot ekibine açık sorular

Endpoint'i kapsamlamak için netleştirmemiz gerekenler:

1. **Mevcut durum:** Bu parçalardan hangisi bugün hazır?
   - (a) CEFR seviye metni üretimi, (b) altyazı/timing üretimi, (c) TTS ses üretimi.
   - Sadece (c) ses mi eksik, yoksa endpoint'i sıfırdan mı kuracağız?
2. **TTS sağlayıcısı:** Hangi motor/sesler? `voice_profile` değerleri ne olacak
   (örn. `english_female`, `english_male`)? İngilizce dışı dil planı var mı?
3. **Ses barındırma:** Dosyalar nerede tutulacak (kendi CDN'iniz / S3 / Supabase)?
   Public mi, signed URL mı? Signed ise geçerlilik süresi?
4. **Süre kontrolü:** `target_duration_seconds`'a ne kadar yakın üretebiliyorsunuz?
   Sapma toleransı nedir?
5. **Sahne bölme:** Script ve altyazıyı `scene_ids`'e bölme işini Core üstlenebilir
   mi? (Bizim için kritik — §3.)
6. **Latency:** Tek seviye için tipik üretim süresi? 30 sn senkron timeout yeterli
   mi, yoksa **async (job submit + poll)** pattern mi gerekiyor?
7. **Auth & ortam:** Internal API key'i nasıl alacağız? URL (staging/prod)?
   IP allowlist / mTLS gibi ek gereksinim var mı?
8. **Versiyonlama:** `schema_version: 1` ile ilerleyebilir miyiz; kırıcı değişiklik
   olursa versiyon artışıyla mı yöneteceğiz?

---

## 10. Minimum kabul kriteri (bu API "hazır" sayılması için)

```text
[ ] POST /internal/video-level-package, Bearer auth ile çalışıyor.
[ ] Tek CEFR seviyesi için §5 yanıtını döndürüyor.
[ ] script_lines, istekteki scene_ids ile aynı sırada.
[ ] subtitle_lines her sahneyi kapsıyor, timing geçerli, süreyi aşmıyor.
[ ] audio_url, render bulutundan HTTP GET ile indirilebiliyor (gerekiyorsa
    yeterli ömürlü signed URL).
[ ] duration_seconds gerçek ses süresiyle tutarlı.
[ ] speaking_rate ve metin, seviyeye göre gerçekten farklılaşıyor (A1≠C2).
[ ] 6 seviyenin 6'sı da geçerli paket döndürüyor.
```

Bu kriterler sağlanınca Video Factory tarafında doğrulama komutu:

```bash
npm run core:check -- --topic "Why do people forget new words?" --levels A1 --scenes 2 --duration 45
```

ile tek seviyede gerçek bağlantıyı test edip, ardından 6 seviyeli tam üretime
geçeceğiz.

---

## 11. Referanslar (Video Factory repo'sunda kontrat)

- İstek şeması: `schemas/lingroot-core-request.schema.json`
- Yanıt şeması: `schemas/lingroot-core-response.schema.json`
- HTTP client + doğrulama: `src/adapters/http-lingroot-core-client.ts`
- Servis arayüzü: `src/services/lingroot-core-client.ts`
- Seviye rubric'i: `config/level-rules.json`
- Mimari karar (Core sınırı): `docs/architecture/decisions/ADR-0002-core-api-boundary.md`
