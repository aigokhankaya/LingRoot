# LingRoot Topic Brief API

## Sorumluluk

LingRoot, Video Factory'ye seviyeden bagimsiz konu niyetini ve ortak gorsel
anlatiyi verir. Factory bu brief'i bir kez alir, gorselleri bir kez uretir ve
ayni sahne sirasini tum CEFR level package isteklerinde kullanir.

Varsayilan endpoint:

```text
POST /internal/video-topic-brief
Authorization: Bearer <LINGROOT_TOPIC_API_KEY>
Content-Type: application/json
```

## Istek

```json
{
  "schema_version": 1,
  "topic": "Why do people forget new words?",
  "topic_id": "why-do-people-forget-new-words",
  "scene_count": 4,
  "language": "en"
}
```

`topic` veya `topic_id` alanlarindan en az biri zorunludur. `scene_count`,
Factory'nin ortak gorsel sayisidir.

## Yanit

Factory'nin canonical `TopicBrief` yaniti `schemas/topic-brief.schema.json`
ile dogrulanir:

```json
{
  "schemaVersion": 1,
  "topicId": "why-do-people-forget-new-words",
  "title": "Why Do People Forget New Words",
  "coreMessage": "Memory needs repetition, retrieval and meaningful context.",
  "category": "education",
  "language": "en",
  "visualOutline": [
    {
      "sceneId": "scene-1",
      "order": 0,
      "narrativeBeat": "A learner first encounters a new word.",
      "altText": "A learner seeing a new English word in context."
    }
  ]
}
```

Kurallar:

- `visualOutline` istenen sahne sayisina esit olur.
- `sceneId` degerleri benzersizdir ve `order` sifirdan kesintisiz ilerler.
- `coreMessage`, basligin tekrari degil tum seviyelerin anlattigi sabit ana
  fikirdir.
- Yanitta token, signed URL veya kullaniciya ait veri bulunmaz.

## Factory davranisi

HTTP adapter retry edilebilir timeout/network/`408`, `425`, `429` ve `5xx`
hatalarini sinirli bicimde tekrar dener. Semaya veya sahne sirasi kuralina
uymayan yanit reddedilir. `DRY_RUN=true` iken ayni kontrati ureten mock adapter
kullanilir.

## Konfigrasyon

```text
LINGROOT_TOPIC_PROVIDER=http
LINGROOT_TOPIC_API_URL=https://api.lingroot.com
LINGROOT_TOPIC_API_KEY=...
LINGROOT_TOPIC_ENDPOINT=/internal/video-topic-brief
LINGROOT_TOPIC_TIMEOUT_MS=30000
LINGROOT_TOPIC_MAX_ATTEMPTS=3
```
