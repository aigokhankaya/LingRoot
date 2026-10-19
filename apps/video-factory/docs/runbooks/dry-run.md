# Dry-run runbook

## Çalıştırma

```bash
npm run dry-run
```

Özel topic:

```bash
npm run generate -- --topic "Why is listening harder than reading?" --mode dry-run
```

## Başarı kontrolü

Komut paket yolunu yazdırmalı ve sıfır exit code ile bitmelidir. Pakette ortak
manifest, istenen level klasörleri, mock medya dosyaları, metadata ve iki ana
rapor bulunmalıdır.

Ardından:

```bash
npm run qa
```

QA başarısızsa gerçek entegrasyona veya scheduler kurulumuna geçmeyin.
