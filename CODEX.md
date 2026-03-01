# LingRoot - Codex Kurallari
> **Created:** 2026-03-01 | **Updated:** 2026-03-01 | **Version:** 1.0

Bu dosya, `CLAUDE.md` icindeki calisma kurallarinin Codex icin uyarlanmis surumudur. Codex bu repoda calisirken bu dosyayi esas alir.

LingRoot: AI destekli, kisisellestirilmis dinleme platformu. Kullanici ilgi alanlarina gore icerik uretir, CEFR seviyesine uyarlar ve senkronize altyazi ile seslendirir.

> "LingRoot, sevdiginiz icerikleri sizin Ingilizce seviyenize ceviren ve dinlemeniz icin seslendiren bir platformdur."

Detayli proje hafizasi, mimari ve yol haritasi icin: `PROJECT_MEMORY.md`
Veritabani semasi (75+ tablo) icin: `docs/database/schema-overview.md`

## Dil Kurali

- Kullanici ile iletisim: TURKCE (her zaman)
- Dokumantasyon, raporlar, analiz dosyalari (`.md`): TURKCE (her zaman)
- Kod, commit mesajlari, loglar: ENGLISH

## Build ve Gelistirme Komutlari

```bash
# Frontend (port 3000)
cd frontend && npm run dev
cd frontend && npm run dev:clean
cd frontend && npm run build
cd frontend && npx tsc --noEmit
cd frontend && npm run lint

# Backend (port 5001)
cd backend && npm run dev

# Shared package (frontend once build oncesi gerekli)
cd packages/api-client && npm run build
```

## Teknoloji Yigini

| Katman | Teknoloji |
|-------|-----------|
| Web | Next.js (React) - App Router |
| Mobile | React Native (Expo) |
| Backend | Express.js (Node.js) |
| Database | PostgreSQL (Supabase) + Redis |
| AI | OpenAI (GPT-5.1, GPT-4o, GPT-4o-mini) |
| Audio | Google TTS + MFA Forced Aligner |
| Storage | Supabase Storage + Cloudflare R2 |

## Aktif Kurallar (Ihlal Edilemez)

Bu kurallar hicbir kosulda ihlal edilmez:

1. Kod icine secret yazilmaz. API key, JWT secret vb. yalnizca `.env` uzerinden kullanilir.
2. Prompt output formatlari dondurulmustur; degistirilmez.
3. Audio pipeline sirasi sabittir:
   `Whisper -> Cleanup -> CEFR adaptation -> TTS (Google) -> Audio merge -> MFA -> VTT/SRT`
4. Whisper transkripti dogrudan kullanilmaz; CEFR uyarlamasi zorunludur.
5. Uzun metinlerde n8n icinden dogrudan TTS yapilmaz.
6. TTS sesleri: `en-US -> Aria`, `en-GB -> Libby`
7. Varsayilan hiz `1.05`, pitch `-2` ile `+2`, maksimum segment `1500` karakterdir.
8. Varsayilan SSML: `<break time="300ms"/>`
9. MFA kelime bazli timestamp uretir; tolerans `+-0.3s`, `1.5s+` sapmada yeniden hizalama gerekir.
10. Veritabani kolonlari varsayilmaz; sadece bilinen sema kullanilir.
11. Kullanicidan acik onay olmadan dosya/klasor yapisi degistirilmez.
12. Web ve Mobile icin tek API semasi kullanilir; ayrisma yapilmaz.
13. Kullanici istemeden business logic degistirilmez.
14. API request/response contract tek tarafli degistirilmez.
15. `any` kullanilmaz; yerine `unknown` veya dogru tip kullanilir.
16. CEFR seviyesine uygun olmayan Ingilizce uretilmez.
17. TTS voice isimleri keyfi degistirilmez.
18. Deployment yonu sabittir: `Cloudflare Tunnel -> Backend Only`

## Veritabani Operasyonlari

- Analiz ve okuma seviyesinde sorgular icin Supabase REST API kullanilabilir; secret degerler sadece `.env` uzerinden okunur.
- Schema degisiklikleri ASLA otomatik uygulanmaz.
- SQL migration dosyasi hazirlanir ve kullaniciya "Bunu Supabase SQL Editor'da calistirin" denir.
- Supabase RLS her zaman aktif kalmalidir.
- Her migration sonrasinda ayni adimda su iki dokuman da guncellenir:
  - `docs/database/schema-overview.md`
  - `docs/database/complete-column-reference.md`

## Dokumantasyon Senkronizasyonu

Degisiklik yapmadan once oncelik sirasi:

1. `PROJECT_MEMORY.md`
2. `docs/architecture/*.md`
3. `docs/codebase/*.md`
4. `docs/api/*.md`, `docs/database/schema-overview.md`

Kurallar:

- Dokuman ile kod celisirse not dusulur; varsayim yapilmaz.
- Yeni endpoint, tablo, prompt veya ozellik eklendiyse ilgili dokuman ayni calismada guncellenir.
- "Kod guncel ama dokuman eski" kabul edilmez.
- Dokumantasyon koddan okunarak yazilir; hafizadan yazilmaz.

## Dokuman Versiyonlama

Olusturulan veya guncellenen her `.md` dosyasinda basligin hemen altinda su format yer alir:

```md
> **Created:** YYYY-MM-DD | **Updated:** YYYY-MM-DD | **Version:** X.Y
```

## Mimari Kurallari

- Controller/component dosyalari mumkunse `500` satiri gecmemelidir; gerekiyorsa bolunur.
- Business logic controller icinde degil, service katmaninda tutulur.
- Yeni web sayfalari icin `App Router` (`/src/app/`) kullanilir; `Pages Router` altina yeni sayfa eklenmez.
- Var olan bilesenler varken kopya bilesen olusturulmaz.

## Isimlendirme Kurallari

| Tip | Format | Ornek |
|------|--------|---------|
| Degisken/Fonksiyon | camelCase | `userName`, `getUserData()` |
| Component | PascalCase | `AudioPlayer` |
| DB tablolari | snake_case | `user_profiles` |
| Env/Constant | UPPER_SNAKE_CASE | `JWT_SECRET` |
| Type/Interface | PascalCase | `ApiResponse` |
| AI prompt dosyalari | kebab-case | `cefr-adapt-v2` |

## Renk Paleti

| Kullanim | Tailwind |
|-------|----------|
| Primary | `teal-*`, `cyan-*` |
| Accent | `orange-*`, `amber-*` |
| Neutral | `slate-*`, `gray-*` |
| Success | `green-*`, `emerald-*` |
| Warning | `yellow-*` |
| Error | `red-*` |

YASAK: `purple-*`, `violet-*`, `fuchsia-*`, `pink-*`

## Kanonik Bilesenler

```txt
AudioPlayer        -> src/components/common/AudioPlayer.tsx
SyncedTextPlayer   -> src/components/SyncedTextPlayer.tsx
Button             -> src/components/ui/button.tsx
Input              -> src/components/ui/input.tsx
Dialog             -> src/components/ui/dialog.tsx
ContentCard        -> src/components/sectors/ContentCard.tsx
```

Su tur tekrarlar olusturulmaz: `NewSyncedTextPlayer`, yeni `AudioPlayer`, yeni `Button`, inline `<button>`.

## Commit Formati

```txt
<type>: <short description>
```

Tipler: `feat:`, `fix:`, `refactor:`, `docs:`, `style:`, `test:`, `chore:`

## Codex Calisma Kurallari

- Dosya ve metin aramalarinda once `rg` kullan.
- Basit dosya okumalarinda hizli ve dogrudan komutlar tercih edilir.
- Dosya duzenlemeleri icin `apply_patch` kullanilir.
- Kullanici acikca istemedikce mevcut yapilar yeniden organize edilmez.
- Ilgili olmayan degisiklikler geri alinmaz; kirli worktree ile uyumlu calisilir.
- Yikici komutlar (`rm`, `git reset --hard`, geri donulemez temizlikler) kullanici acikca istemedikce calistirilmaz.
- Test veya build kirildiysa, kapsam dahilindeyse duzeltilmeden is tamamlanmis sayilmaz.
- Kod degisikligi gerekiyorsa uzun teorik aciklama yerine dogrudan uygulanabilir degisiklik yapilir.

## Belirsizlik ve Hata Yonetimi

- Mimari veya kurallar konusunda belirsizlik varsa varsayim yapilmaz.
- Kritik bir degisiklikte risk varsa once netlestirilir.
- Arac kaynakli hata olursa acikca belirtilir ve guvenli geri donus yolu onerilir.

## Bilinen Hata Imzalari

| Sinyal | Aksiyon |
|--------|--------|
| `silent audio detected` | MFA yeniden calistirilir, energy threshold artirilir |
| `alignment drift` | Yeniden segmentle -> yeniden hizala -> birlestir |
| `google TTS latency high` | Chunk size `700` karaktere dusur |
| `Supabase 429` | `2s` exponential retry |
| `Cloudflare 525` | Otomatik fallback -> local API |
| `MFA timeout` | Worker #2'ye yeniden dispatch |
