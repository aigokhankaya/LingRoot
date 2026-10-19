# Architecture overview

## Sistem sınırı

Video Factory, LingRoot ana ürününden ayrı bir repodur. CEFR metni, ses ve
altyazı üretimi LingRoot Core API üzerinden alınır. Dry-run aynı versioned
kontratı mock adapter ile sağlar.

```text
CLI
  → production workflow
    → image service
    → LingRoot Core service
    → render service
    → local storage
    → semantic QA
  → output package
```

## Veri modeli

Topic package tek bir `VisualScenes` nesnesine sahiptir. Level package yalnızca
ortak `sceneId` değerlerine referans verir. Render payload ortak manifest ile
bir level’ın ses, altyazı ve rozetini birleştirir.

JSON Schema dış şekli doğrular. Semantic QA ise şu ilişkileri doğrular:

- topic ID eşitliği
- istenen level seti ve benzersizliği
- scene referanslarının varlığı
- artifact dosyalarının bulunması
- metadata ve güvenlik kontrolleri

## Provider sınırları

Workflow yalnızca `src/services/` arayüzlerini bilir. Mock/local ve ilerideki
gerçek sağlayıcılar `src/adapters/` altında bulunur.

Production render varsayilani `FfmpegRenderClient`tir. Ortak local image
dosyalari ile level-local audio/SRT dosyalarini H.264/AAC MP4'e birlestirir;
render icin network veya signed URL gerekmez. `Json2VideoRenderClient` ayni
arayuzun acik secilen bulut fallback'idir.

Visual scene planning provider çağrısından ayrıdır. Workflow ortak scene
planını bir kez oluşturur ve image client’ı scene başına bir kez çağırır. CEFR
level döngüsü image generation tamamlandıktan sonra başlar.

## Yayın güvenliği

`review` varsayılandır. `private_upload` yalnızca özel/listelenmemiş yükleme
yapar. `auto_public` iki ayrı environment seçeneğiyle açıkça etkinleştirilir.
