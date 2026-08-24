# LingRoot Video Factory Durum ve Operasyon Notu

Tarih: 15 Temmuz 2026

## Durum

Video Factory LingRoot monoreposunda `apps/video-factory` altında bulunur.
Ayrı bir ekip veya ayrı bir repo değildir; LingRoot API'den operasyonel olarak
ayrı çalışan bir CLI/worker sürecidir. Bir konu için A1-C2 altı gerçek video
üretimi tamamlandı. YouTube entegrasyonu bilinçli olarak sonraki aşamaya
bırakıldı.

Kabul paketi:

```text
apps/video-factory/outputs/topic-packages/
2026-07-15_the-seven-hills-of-istanbul_20260715T124053Z-the-seven-hills-of-istanbul/
```

Konu: `What are the seven hills of Istanbul?`

| Seviye | Süre | Video | Ses | Boyut |
| --- | ---: | --- | --- | ---: |
| A1 | 35.616 s | H.264, 1080x1920 | AAC | 2.44 MiB |
| A2 | 31.267 s | H.264, 1080x1920 | AAC | 1.73 MiB |
| B1 | 33.800 s | H.264, 1080x1920 | AAC | 1.95 MiB |
| B2 | 46.567 s | H.264, 1080x1920 | AAC | 2.84 MiB |
| C1 | 49.632 s | H.264, 1080x1920 | AAC | 2.89 MiB |
| C2 | 46.933 s | H.264, 1080x1920 | AAC | 2.81 MiB |

Son durum `review_ready`, QA skoru `1.0`, hata ve uyarı sayısı sıfırdır. Dört
ortak görsel tüm seviyelerde yeniden kullanılır. Her seviyenin script, ses,
subtitle timing ve speaking rate verisi ayrıdır. Subtitle'lar mobil okunabilirlik
için en fazla yedi kelimelik cue'lara bölünür.

## Uygulanan Sözleşmeler

LingRoot backend artık şu endpoint'leri sunar:

```text
POST /internal/video-topic-brief
POST /internal/video-level-package
Authorization: Bearer <LINGROOT_INTERNAL_API_KEY>
```

Geçiş uyumluluğu için `VIDEO_FACTORY_API_KEY` backend tarafında fallback olarak
desteklenir. TopicBrief dört sahneli ortak görsel outline üretir. Level endpoint
CEFR script, Google TTS MP3, subtitle cue'ları, gerçek süre ve speaking rate
döndürür. Script üretiminde kelime bütçesi ve maksimum cümle uzunluğu sunucuda
doğrulanır; uygunsuz yanıt en fazla üç kez yeniden üretilir.

## Çalıştırma

Factory'nin ignored `.env` dosyasında secret'lar ayrı tutulur. Render-only
üretim için temel ayarlar:

```dotenv
DRY_RUN=false
PUBLISH_MODE=review
LINGROOT_TOPIC_PROVIDER=http
LINGROOT_TOPIC_API_URL=https://<kalici-lingroot-host>
LINGROOT_TOPIC_ENDPOINT=/internal/video-topic-brief
LINGROOT_CORE_PROVIDER=http
LINGROOT_CORE_API_URL=https://<kalici-lingroot-host>
LINGROOT_CORE_LEVEL_ENDPOINT=/internal/video-level-package
IMAGE_PROVIDER=openai
STORAGE_PROVIDER=local
RENDER_PROVIDER=ffmpeg
FFMPEG_PATH=ffmpeg
```

Kök repodan:

```bash
npm run video:check
npm run video:preflight
npm run video:produce -- \
  --topic "What are the seven hills of Istanbul?" \
  --levels A1,A2,B1,B2,C1,C2 \
  --scenes 4
```

Kesilen bir işi sürdürmek veya yalnızca videoları yeniden render etmek için:

```bash
npm run video:produce -- --resume "outputs/topic-packages/<paket>"
npm run video:produce -- --resume "outputs/topic-packages/<paket>" --rerender
```

`--resume` yolları `apps/video-factory` çalışma dizinine göredir. Root script
kullanılırken tam yol `apps/video-factory/outputs/...` yerine Factory'nin kendi
relative yolu CLI'ya geçirilir.

## Altyapı Notları

- Yerel kabulde LingRoot API `http://127.0.0.1:5001` üzerinden kullanıldı.
- `cdn.booklevel.store` DNS çözmediği için kabul koşusunda çalışan Cloudflare R2
  public development alanı kullanıldı.
- Başka makinedeki worker ve production scheduler için kalıcı LingRoot HTTPS/DNS
  adresi hâlâ altyapı gereksinimidir.
- R2 için kalıcı custom domain/DNS düzeltilmelidir; `.r2.dev` kabul adresi nihai
  marka/CDN adresi olarak değerlendirilmemelidir.
- `npm run preflight -- --render-only` YouTube credential'larını istemez. Düz
  `npm run preflight` release aşamasında OAuth bilgilerini zorunlu tutar.
- `produce` yalnızca review paketi oluşturur ve YouTube'a yükleme yapmaz.
