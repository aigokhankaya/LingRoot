# Supabase Storage integration

## Amaç

Supabase Storage, image/audio/subtitle/video artifactlarını ileride provider
bağımsız storage sınırı üzerinden saklamak için ilk cloud adapterdır. Dry-run
local filesystem kullanır.

Resmi kaynaklar:

- [Standard uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads)
- [Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Private and public buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- [Serving private assets](https://supabase.com/docs/guides/storage/serving/downloads)

## Güvenlik modeli

- Bucket private kabul edilir; public URL üretilmez.
- Server-side service-role key Authorization ve `apikey` headerlarında
  kullanılır.
- Service-role key RLS’yi bypass ettiği için yalnızca güvenilir local/server
  ortamında tutulur.
- Key loglara, hatalara, output raporlarına veya stored-object metadata’ya
  yazılmaz.
- Object key’lerde absolute path, boş segment, `.` ve `..` reddedilir.

## Upload davranışı

Standard upload endpoint’i kullanılır:

```text
POST /storage/v1/object/<bucket>/<object-key>
```

Content type ve cache control açıkça gönderilir. Default davranış overwrite
etmez. Supabase dokümantasyonu yeni object path kullanılmasını önerdiği için
production artifact key’leri benzersiz olmalıdır.

Upload retry yalnızca `upsert=true` olduğunda yapılır. Non-upsert upload,
response kaybında objenin oluşup oluşmadığı bilinmeyeceği için otomatik tekrar
edilmez.

## Download ve silme

Private download:

```text
GET /storage/v1/object/<bucket>/<object-key>
```

Silme:

```text
DELETE /storage/v1/object/<bucket>
{"prefixes":["object-key"]}
```

Download ve delete idempotent kabul edilerek transient hata retry’sine açıktır.

## Signed read URL

Private objeler JSON2Video gibi dış renderer’lara kısa süreli
`createSignedReadUrl` ile verilir:

```text
POST /storage/v1/object/sign/<bucket>/<object-key>
{"expiresIn":900}
```

Signed URL bir bearer credential gibi ele alınır; loglara, raporlara veya kalıcı
manifestlere yazılmaz. Kalıcı manifest `supabase://bucket/key` taşır.

## Konfigürasyon

```text
STORAGE_PROVIDER=supabase
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=lingroot-video-factory
SUPABASE_STORAGE_TIMEOUT_MS=30000
SUPABASE_STORAGE_MAX_ATTEMPTS=3
```

Bucket adapter tarafından otomatik oluşturulmaz.

## Explicit round-trip kontrolü

```bash
npm run storage:check
```

Komut:

1. Benzersiz `healthchecks/<run-id>.txt` objesi yükler.
2. Private endpoint üzerinden indirir.
3. Byte eşitliğini doğrular.
4. Objeyi siler.
5. Secret içermeyen sonucu `outputs/storage-checks/` altına yazar.

Gerçek remote mutation yaptığı için normal test paketine dahil değildir.
