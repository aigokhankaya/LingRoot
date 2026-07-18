# Scheduler runbook

Scheduler islemleri gerçek bir LaunchAgent yuklemeden once guvenli preview ve
smoke-test saglar. Gunluk run, yalnizca onayli takvim girdisinden production+
review paketi olusturur; YouTube release'i ayri operator komutudur.

```bash
npm run scheduler:test
npm run scheduler:install
```

`scheduler:install`, plist taslağını `outputs/scheduler/` altında üretir. Dosyayı
`~/Library/LaunchAgents/` altına kopyalamak ve `launchctl` ile yüklemek ayrı,
bilinçli bir operasyon adımıdır.

Scheduler’ın çalıştırdığı iş deterministik CLI komutu olmalıdır:

```bash
cd /path/to/lingroot-video-factory && npm run daily
```

`daily`, bugunun kaydi icin `status: "approved"` arar. Kayit yoksa veya topic
bos ise hata vererek durur; varsayilan/fallback konu uretmez. Uretilen paket
incelemeden sonra `npm run approve` ve `npm run release` ile ilerletilir.

n8n veya sohbet tabanlı serbest biçimli görev scheduler olarak kullanılmaz.
