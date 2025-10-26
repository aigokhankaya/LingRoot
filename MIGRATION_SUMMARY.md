# Google Play IAP Migration Özeti

## Ne Yapılıyor?

**Sadece 1 kolon ekleniyor:** `subscriptions.google_purchase_token`

## Neden Sadece Bu?

### ✅ Zaten Var Olanlar:
- `subscription_plans.google_product_id` ← **Zaten var**
- `subscription_plans.apple_product_id` ← **Zaten var**
- `subscriptions.provider` ← **Zaten var** (apple/google)
- `subscriptions.plantype` ← **Zaten var** (Gold/Platinum)

### ✅ Eklenmesi Gereken:
- `subscriptions.google_purchase_token` ← **YENİ** (Google Play'den gelen unique token)

## Migration İçeriği

```sql
-- 1. Yeni kolon ekle
ALTER TABLE subscriptions 
ADD COLUMN google_purchase_token TEXT;

-- 2. Index'ler ekle (performans için)
CREATE INDEX idx_subscriptions_google_purchase_token 
ON subscriptions(google_purchase_token);

CREATE INDEX idx_subscriptions_provider 
ON subscriptions(provider);
```

## Nasıl Çalıştırılır?

### Supabase Dashboard:
```
SQL Editor → Paste → Run
backend/migrations/0004_add_google_play_fields.sql
```

### Kontrol:
```sql
-- backend/scripts/check_google_play_columns.sql
```

## Sonuç

**Eklenen:**
- 1 kolon: `google_purchase_token`
- 2 index: `idx_subscriptions_google_purchase_token`, `idx_subscriptions_provider`

**Toplam:** ~5 saniye sürer ✅

## Veri Yapısı

### Mevcut (Değişmedi):
```sql
subscription_plans:
  - name: 'Gold'
  - apple_product_id: 'com.nsyzk.lingroot.gold.monthly'
  - google_product_id: 'com.nsyzk.lingrootmobile.gold.monthly' ✅ ZATEN VAR
```

### Yeni:
```sql
subscriptions:
  - user_id: 'abc123'
  - plantype: 'Gold'
  - provider: 'google'
  - google_purchase_token: 'gkjhfdjkghfdkjg.AO-J1Oy...' ✅ YENİ
```

## Kullanım

```javascript
// Backend - Satın alma kaydederken
const subscriptionData = {
  user_id: userId,
  plantype: 'Gold',
  provider: 'google',
  google_purchase_token: purchaseToken, // ← Buraya kaydediliyor
  startdate: startDate,
  enddate: endDate,
  status: 'active'
};
```

## Özet

| Tablo | Kolon | Durum |
|-------|-------|-------|
| `subscription_plans` | `google_product_id` | ✅ Zaten var |
| `subscription_plans` | `apple_product_id` | ✅ Zaten var |
| `subscriptions` | `provider` | ✅ Zaten var |
| `subscriptions` | `plantype` | ✅ Zaten var |
| `subscriptions` | `google_purchase_token` | 🆕 Eklenecek |

**Tek yapılması gereken:** Migration'ı çalıştır! 🚀
