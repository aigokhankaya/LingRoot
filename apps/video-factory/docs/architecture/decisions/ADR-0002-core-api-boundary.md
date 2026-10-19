# ADR-0002: LingRoot Core remains the language asset owner

Status: implemented

## Decision

Video Factory gerçek CEFR metni, ses ve altyazı üretimini yeniden yazmaz.
`POST /internal/video-level-package` güvenli internal API’si üzerinden
LingRoot Core’a bağlanır. İstek ve yanıt kontratları versioned JSON Schema ile
tanımlanır.

## Consequences

- Video Factory sosyal üretim orkestrasyonuna odaklanır.
- Dil kalitesi ana ürünle tutarlı kalır.
- Dry-run aynı arayüzü mock adapter ile uygular.
- Gerçek API geçişi workflow değişikliği gerektirmemelidir.
- Ortak scene ID’leri API sınırında taşınır ve doğrulanır.
