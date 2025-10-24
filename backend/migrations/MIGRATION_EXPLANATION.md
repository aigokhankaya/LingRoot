# Google Play IAP Migration Açıklaması

## 0004_add_google_play_fields.sql

### Amaç
Android kullanıcılarının Google Play üzerinden yaptığı satın almaları kaydetmek için gerekli veritabanı değişikliklerini yapar.

---

## Eklenen Kolonlar

### 1. `subscriptions` Tablosu

#### `google_purchase_token` (TEXT)
**Amaç:** Google Play'den gelen unique purchase token'ı saklar

**Neden Gerekli:**
- Her satın alma için Google Play unique bir token üretir
- Aynı satın almanın birden fazla kez işlenmesini önler
- Google Play API ile doğrulama yaparken kullanılır
- Subscription yenileme/iptal durumlarını takip etmek için gerekli

**Örnek Değer:**
```
gkjhfdjkghfdkjghfdkjg.AO-J1OyXxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Kullanım:**
```javascript
// Backend'de satın alma kaydederken
const subscriptionData = {
  user_id: userId,
  plantype: 'Gold',
  provider: 'google',
  google_purchase_token: purchaseToken, // ← Buraya kaydediliyor
  ...
};
```

---

### 2. `subscription_plans` Tablosu

#### `google_product_id` (TEXT)
**Amaç:** Her plan için Google Play product ID (SKU) saklar

**Neden Gerekli:**
- Mobile app'ten gelen product ID ile plan eşleştirmesi yapmak için
- Örnek: `com.nsyzk.lingrootmobile.gold.monthly` → Gold plan

**Örnek Değerler:**
```sql
-- Gold plan
google_product_id = 'com.nsyzk.lingrootmobile.gold.monthly'

-- Platinum plan  
google_product_id = 'com.nsyzk.lingroot.platinum.monthly'
```

**Kullanım:**
```javascript
// Backend'de plan bulurken
const { data: plan } = await supabase
  .from('subscription_plans')
  .select('*')
  .eq('google_product_id', productId) // ← Buradan eşleştiriliyor
  .single();
```

---

## Neden `subscriptions.google_product_id` YOK?

### ❌ Gereksiz Çünkü:

1. **`plantype` kolonu zaten var**
   - Hangi plan olduğunu tutuyor (Gold, Platinum)
   
2. **`subscription_plans` tablosunda zaten var**
   - İhtiyaç olursa JOIN ile alınabilir
   
3. **Veri tekrarı (redundancy)**
   - Aynı bilgiyi iki yerde tutmaya gerek yok

### ✅ Gerekli Olan:

```sql
-- subscriptions tablosu
SELECT 
  plantype,              -- ✅ Plan adı (Gold, Platinum)
  provider,              -- ✅ Platform (google, apple)
  google_purchase_token  -- ✅ Unique token
FROM subscriptions;

-- subscription_plans tablosu  
SELECT 
  name,                  -- ✅ Plan adı (Gold, Platinum)
  google_product_id      -- ✅ Google Play SKU
FROM subscription_plans;
```

---

## Eklenen Index'ler

### 1. `idx_subscriptions_google_purchase_token`
**Amaç:** Purchase token'a göre hızlı arama

**Kullanım Senaryosu:**
```sql
-- Aynı purchase token ile subscription var mı kontrol et
SELECT * FROM subscriptions 
WHERE google_purchase_token = 'xxx' 
  AND provider = 'google';
```

### 2. `idx_subscriptions_provider`
**Amaç:** Provider'a göre filtreleme (apple/google)

**Kullanım Senaryosu:**
```sql
-- Tüm Google Play subscriptions
SELECT * FROM subscriptions 
WHERE provider = 'google';

-- Tüm Apple subscriptions
SELECT * FROM subscriptions 
WHERE provider = 'apple';
```

---

## Veri Akışı

### Android Satın Alma Akışı:

```
1. User → Mobile App → Google Play
   ↓
2. Google Play → Purchase Token döner
   ↓
3. Mobile App → Backend (/api/iap/google/verify)
   {
     purchaseToken: "xxx",
     productId: "com.nsyzk.lingrootmobile.gold.monthly"
   }
   ↓
4. Backend → Google Play API ile doğrular
   ↓
5. Backend → subscription_plans tablosundan plan bulur
   SELECT * FROM subscription_plans 
   WHERE google_product_id = 'com.nsyzk.lingrootmobile.gold.monthly'
   ↓
6. Backend → subscriptions tablosuna kaydeder
   INSERT INTO subscriptions (
     user_id,
     plantype,              -- 'Gold'
     provider,              -- 'google'
     google_purchase_token, -- 'xxx'
     ...
   )
```

---

## Migration'ı Çalıştırma

### Supabase Dashboard:
```sql
-- SQL Editor → Paste & Run
-- backend/migrations/0004_add_google_play_fields.sql
```

### psql:
```bash
psql -h your_host -U your_user -d your_db \
  -f backend/migrations/0004_add_google_play_fields.sql
```

---

## Kontrol Etme

```sql
-- Kolonları kontrol et
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'subscriptions' 
  AND column_name IN ('google_purchase_token', 'provider');

-- Index'leri kontrol et
SELECT indexname FROM pg_indexes
WHERE tablename = 'subscriptions'
  AND indexname LIKE '%google%';
```

---

## Özet

| Tablo | Kolon | Amaç | Gerekli mi? |
|-------|-------|------|-------------|
| `subscriptions` | `google_purchase_token` | Unique token sakla | ✅ EVET |
| `subscriptions` | ~~`google_product_id`~~ | ~~Product ID sakla~~ | ❌ HAYIR (gereksiz) |
| `subscription_plans` | `google_product_id` | Plan-Product eşleştir | ✅ EVET |

**Toplam:** 2 kolon + 2 index
