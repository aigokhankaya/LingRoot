# ADR-0001: One shared visual manifest per topic

Status: accepted

## Decision

Bir topic package tam olarak bir ortak görsel manifesti taşır. Level paketleri
görsel veya bağımsız sahne tanımı taşımaz; yalnızca ortak `sceneId` değerlerine
referans verir.

## Consequences

- Görsel maliyeti topic başına ödenir.
- Seviye farkı açık biçimde dil ve ses üzerinden görünür.
- Schema bağımsız level görsellerini reddeder.
- Semantic QA scene referanslarını ve topic bağını doğrulamak zorundadır.
