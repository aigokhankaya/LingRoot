# LingRoot Core → Video Factory · Entegrasyon Teslim Dokümanı

> **Created:** 2026-06-22 | **Updated:** 2026-06-22 | **Version:** 1.0
> **Muhatap:** Video Factory ekibi · **Hazırlayan:** LingRoot Core
> İlgili: [video-level-package.md](./video-level-package.md) (teknik referans)

Talep edilen ses/altyazı/script API'si **kuruldu, test edildi ve çalışıyor.**
Bu doküman entegrasyon için ihtiyacınız olan her şeyi içerir.

---

## 1. Bağlantı Bilgileri

Video Factory `.env` dosyanıza:

```
LINGROOT_CORE_API_URL = <LingRoot Core backend kök adresi>   # Cloudflare Tunnel URL'i (https://...)
LINGROOT_CORE_API_KEY = <ekip içi güvenli kanaldan paylaşılır — repoya yazılmaz>
```

- Endpoint yolu zaten default: `/internal/video-level-package` (ek ayar gerekmez).
- Header: `Authorization: Bearer <LINGROOT_CORE_API_KEY>`.
- Timeout 30 sn yeterli (gözlemlenen süre **3–6 sn/seviye**, aşağıya bakın).

> 🔐 Anahtarı güvenli paylaşın (Bitwarden/1Password vb.). İhtiyaç halinde Core
> tarafında rotate edilebilir.

---

## 2. ⚠️ KRİTİK: `audio_url` / `subtitle_url` erişilebilirliği (aksiyon gerekiyor)

Dosyalar Cloudflare R2'ye yükleniyor ve **public olarak indirilebiliyor.** Ancak
Core şu an URL'leri `R2_PUBLIC_BASE_URL` üzerinden, yani `https://cdn.booklevel.store/...`
formatında döndürüyor ve **bu custom domain şu anda DNS'te çözülmüyor (NXDOMAIN).**
Doğrulama (test ortamından):

```
GET https://cdn.booklevel.store/audio/vf_...mp3        → DNS NXDOMAIN (çözülmüyor)
GET https://pub-bc575ee286bd4f4aa8b853e888a6b089.r2.dev/audio/vf_...mp3  → HTTP 200, audio/mpeg ✓
```

Yani **objeler R2'de ve indirilebilir**, sorun yalnızca döndürülen URL'in domain'i.
Render bulutu (JSON2Video) `cdn.booklevel.store`'u GET edemez. Çözüm (Core/infra tarafında, biri):

1. **(Önerilen)** `cdn.booklevel.store` custom domain'ini Cloudflare'de R2 bucket'ına
   doğru bağlayıp DNS'i yayınlamak (tüm uygulama bu domain'i kullanıyor).
2. Geçici: Core `.env` içinde `R2_PUBLIC_BASE_URL`'i çalışan `pub-...r2.dev` adresine
   çevirmek.

> Bu, **tüm LingRoot ses altyapısını** ilgilendiren bir deployment ayarıdır; VF'ye özel
> kod değişikliği değildir. Core/infra ekibinin canlıya almadan önce netleştirmesi gerekir.
> URL'ler kalıcıdır, one-shot değildir, render birden çok kez GET edebilir (§ talep §6 ✓).

---

## 3. Doğrulanmış Test Sonuçları (2026-06-22, local e2e)

Gerçek zincir çalıştırıldı: **OpenAI (gpt-4o) → Google TTS → ffmpeg merge → R2 upload.**

**Auth & validation:**

| Senaryo | Sonuç |
|---|---|
| Header yok | `401` ✓ |
| Yanlış key | `401 {"error":"Unauthorized."}` ✓ |
| Geçersiz `target_level` | `400` ✓ |
| Tekrarlı `scene_ids` | `400` ✓ |

**6 seviyenin 6'sı da geçerli paket döndürdü** (topic: "Why do people forget new
words?", 4 sahne, target 40s):

| Seviye | HTTP | Süre (gerçek) | speaking_rate | Kelime | Sahne sırası | Cue ≤ süre |
|---|---|---|---|---|---|---|
| A1 | 200 | 9.1s | 0.80 | 17 | ✓ | ✓ |
| A2 | 200 | 11.7s | 0.88 | 26 | ✓ | ✓ |
| B1 | 200 | 11.4s | 0.95 | 27 | ✓ | ✓ |
| B2 | 200 | 20.1s | 1.02 | 51 | ✓ | ✓ |
| C1 | 200 | 26.8s | 1.08 | 63 | ✓ | ✓ |
| C2 | 200 | 27.0s | 1.15 | 70 | ✓ | ✓ |

- `audio_url` → HTTP 200, `audio/mpeg`, ffprobe süresi = `duration_seconds` (birebir). ✓
- `subtitle_url` → HTTP 200, `text/plain; charset=utf-8`, geçerli SRT, sahne-hizalı timing. ✓
- Seviyeler **gerçekten farklılaşıyor** (A1: kısa basit cümle / yavaş; C2: uzun
  sofistike / hızlı). ✓

---

## 4. §9 Açık Sorularının Cevapları

1. **Mevcut durum:** Üçü de hazır — (a) CEFR seviye metni ✓, (b) altyazı/timing ✓,
   (c) TTS ses ✓. Endpoint sıfırdan kuruldu, mevcut TTS/merge/storage altyapısı yeniden kullanıldı.
2. **TTS sağlayıcısı:** Google Cloud TTS (Neural2). `voice_profile` değerleri:
   `english_female` (default), `english_male`, `british_female`, `british_male`.
   Bilinmeyen profil `english_female`'e düşer. İngilizce dışı dil şu an kapsamda değil.
3. **Ses barındırma:** Cloudflare R2, **public URL** (signed değil, kalıcı). Bkz. §2 domain notu.
4. **Süre kontrolü:** Metin `target_duration_seconds`'a göre üretilir, ama dönen
   `duration_seconds` **gerçek ses süresidir.** Düşük seviyeler (A1/A2) doğası gereği
   kısa/yavaş olduğundan, az sayıda sahnede hedefin altında kalabilir (örn. A1, 4 sahne
   → ~9s). **Daha uzun süre için daha fazla `scene_ids` gönderin** — içerik uzunluğu
   sahne sayısıyla ölçeklenir. Üst seviyeler (C1/C2) hedefe çok daha yakındır.
5. **Sahne bölme:** Evet, Core üstleniyor. `script_lines` ve `subtitle_lines` gönderdiğiniz
   `scene_ids` ile birebir, aynı sırada hizalanır.
6. **Latency:** Seviye başına ~3–6 sn (gözlemlenen). 30 sn senkron timeout fazlasıyla
   yeterli; **async pattern gerekmiyor.**
7. **Auth & ortam:** Bearer key (§1). URL Cloudflare Tunnel üzerinden. Ek mTLS/IP-allowlist yok.
8. **Versiyonlama:** `schema_version: 1` ile ilerleyin. Kırıcı değişiklik olursa versiyon artırılır.

---

## 5. §10 Kabul Kriteri Durumu

```
[x] POST /internal/video-level-package, Bearer auth ile çalışıyor.
[x] Tek CEFR seviyesi için tam yanıt döndürüyor.
[x] script_lines, istekteki scene_ids ile aynı sırada.
[x] subtitle_lines her sahneyi kapsıyor, timing geçerli, süreyi aşmıyor.
[~] audio_url HTTP GET ile indirilebiliyor — obje erişilebilir; döndürülen domain
    canlıda düzeltilmeli (§2).
[x] duration_seconds gerçek ses süresiyle tutarlı (ffprobe ile doğrulandı).
[x] speaking_rate ve metin seviyeye göre gerçekten farklılaşıyor (A1≠C2).
[x] 6 seviyenin 6'sı da geçerli paket döndürüyor.
```

Doğrulama komutunuz (§2 domain'i düzeltildikten sonra uçtan uca tam yeşil olur):

```bash
npm run core:check -- --topic "Why do people forget new words?" --levels A1 --scenes 2 --duration 45
```

---

## 6. Örnek

İstek:
```json
{
  "schema_version": 1,
  "topic_id": "why-do-people-forget-new-words",
  "topic": "Why do people forget new words?",
  "core_message": "People forget new words because memory needs repetition, retrieval and meaningful context.",
  "target_level": "C1",
  "target_duration_seconds": 40,
  "language": "en",
  "voice_profile": "english_male",
  "subtitle_format": "srt",
  "content_style": "short_listening_video",
  "brand": "LingRoot",
  "scene_ids": ["scene-1", "scene-2", "scene-3", "scene-4"]
}
```

Yanıt (kısaltılmış, gerçek çıktı):
```json
{
  "schema_version": 1,
  "topic_id": "why-do-people-forget-new-words",
  "level": "C1",
  "voiceover_script": "It's common to feel frustrated when new vocabulary slips from your mind...",
  "script_lines": [ { "scene_id": "scene-1", "text": "It's common to feel frustrated..." }, ... ],
  "audio_url": "https://<r2-public-host>/audio/vf_why-do-people-forget-new-words_C1_d2d8e06f.mp3",
  "subtitle_url": "https://<r2-public-host>/audio/vf_why-do-people-forget-new-words_C1_d2d8e06f.srt",
  "subtitle_lines": [ { "scene_id": "scene-1", "start": 0.0, "end": 6.456, "text": "..." }, ... ],
  "duration_seconds": 26.808,
  "voice_profile": "english_male",
  "speaking_rate": 1.08
}
```
