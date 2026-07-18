# Roadmap

> Uretime gecis sirasi, kabul kapilari, risk kaydi ve sorumluluklar icin
> [Production Readiness Plan](../product/production-readiness-plan.md) esas
> dokumandir. Bu roadmap, tamamlanan teknik yeteneklerin ozetidir.

## Faz 1 — Local mock factory

- [x] Repo ve TypeScript omurgası
- [x] JSON Schema kontratları
- [x] Paylaşılan görsel invariant testleri
- [x] Mock/local adapter sınırları
- [x] Uçtan uca dry-run
- [x] Artifact ve metadata üretimi
- [x] Semantic QA ve production report
- [x] CLI komutları
- [x] Scheduler preview ve smoke test
- [x] Agent/skill tanımları

Çıkış kriteri: `CLAUDE.md` içindeki Definition of Done komutlarının tamamı ağ
erişimi olmadan geçer.

## Faz 2 — Real production adapters

- [x] Local FFmpeg primary renderer (image sequence, SRT, CEFR badge, H.264/AAC MP4)
- [ ] Hedef production makinesinde FFmpeg ile gercek alti-level render kabul testi
- [x] LingRoot Core API kontratı ve HTTP adapter
- [x] Core API local contract/integration testleri
- [ ] LingRoot Core ortamında gerçek `core:check`
- [x] OpenAI görsel üretim kontratı ve HTTP adapter
- [x] Image API local contract/integration testleri
- [ ] OpenAI ortamında gerçek `image:check`
- [x] Provider-neutral storage kontratı ve Supabase HTTP adapter
- [x] Supabase Storage local contract/integration testleri
- [ ] Supabase ortamında gerçek `storage:check`
- [x] JSON2Video request/status kontratı ve HTTP adapter
- [x] JSON2Video local contract/integration testleri
- [ ] JSON2Video ortamında gerçek `render:check`
- [x] Private asset signed-delivery entegrasyonu
- [x] JSON2Video alternatif seçili-level integration-check orkestrasyonu
- [x] Ortak görselleri level’lar arasında tek üretim/yüklemeyle yeniden kullanma
- [ ] Tüm credentiallarla gerçek `integration:check`
- [ ] Üç farklı topic için gerçek altı-level paket doğrulaması

## Faz 3 — Controlled publishing

- [x] YouTube OAuth refresh ve private resumable upload adapterı
- [x] YouTube upload local contract/resume testleri
- [x] Private playlist find/create ve duplicate-safe video insert
- [x] YouTube playlist local contract testleri
- [ ] OAuth credentiallarla gerçek `youtube:check`
- [ ] OAuth credentiallarla gerçek `youtube:playlist-check`
- [ ] Instagram manuel/yarı otomatik paket
- [ ] Drive/Sheets arşivleme
- [ ] Analytics raporlama
