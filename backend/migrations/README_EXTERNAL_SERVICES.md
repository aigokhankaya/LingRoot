# External Services Migration

## Çalıştırma

Migration'ı çalıştırmak için backend klasöründe:

```bash
npm run migrate:external-services
```

veya doğrudan:

```bash
node scripts/run-external-services-migration.js
```

## Kontrol

Migration başarılı olduysa, aşağıdaki komutu çalıştırarak verileri görebilirsiniz:

### PostgreSQL Client ile:
```sql
SELECT * FROM external_services;
```

### Node.js Script ile:
```bash
node scripts/run-external-services-migration.js
```

## Varsayılan Servis

Migration otomatik olarak podcast servisi ekler:
- **Service Name:** podcast_generator
- **Service Type:** podcast
- **API URL:** https://localhost50005.app.n8n.cloud/webhook/create-podcast
- **API Token:** mK8vXp2Rq9Yw3Tz5Hn7Js4

## Admin Panelinden Yönetim

Migration tamamlandıktan sonra:
1. Admin paneline giriş yapın
2. Sol menüden "Dış Servisler" sekmesine tıklayın
3. Servisleri görüntüleyin, düzenleyin veya yeni servis ekleyin

## Sorun Giderme

Eğer migration çalışmazsa:

1. .env dosyasında DATABASE_URL'in doğru olduğundan emin olun
2. PostgreSQL veritabanına bağlantı kontrolü yapın
3. Tablo zaten varsa, önce silin:
   ```sql
   DROP TABLE IF EXISTS external_services CASCADE;
   ```
4. Migration'ı tekrar çalıştırın

## Manuel Ekleme

Eğer migration çalışmazsa, SQL'i manuel çalıştırabilirsiniz:

```sql
-- Migration dosyasının içeriğini kopyalayıp PostgreSQL client'a yapıştırın
psql -d your_database_url -f migrations/0037_create_external_services_table.sql
```
