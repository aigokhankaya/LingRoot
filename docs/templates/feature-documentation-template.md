# [Özellik Adı]

**Tarih:** [YYYY-MM-DD]  
**Durum:** [Planlama / Geliştirme / Tamamlandı / Arşivlendi]  
**Sahip:** [Geliştirici Adı]  
**İlgili PR:** [#PR_NUMBER]

---

## 📋 Amaç

[Bu özellik neden gerekli? Hangi problemi çözüyor?]

**Kullanıcı Hikayesi:**
> Bir [kullanıcı tipi] olarak, [amaç] için [özellik] istiyorum.

---

## 🎯 Gereksinimler

### Fonksiyonel Gereksinimler
- [ ] Gereksinim 1
- [ ] Gereksinim 2
- [ ] Gereksinim 3

### Fonksiyonel Olmayan Gereksinimler
- [ ] Performans: [örn. yanıt süresi < 2 saniye]
- [ ] Güvenlik: [örn. auth gerekli]
- [ ] Ölçeklenebilirlik: [örn. 1000 eşzamanlı kullanıcı]

---

## 🏗️ Teknik Tasarım

### Backend Değişiklikleri

#### Yeni Endpoint'ler
```
POST /api/[endpoint]
GET /api/[endpoint]/:id
PUT /api/[endpoint]/:id
DELETE /api/[endpoint]/:id
```

#### Veritabanı Değişiklikleri
- **Migration Dosyası:** `backend/migrations/YYYYMMDD_feature_name.sql`
- **Yeni Tablolar:**
  ```sql
  CREATE TABLE feature_table (
    id UUID PRIMARY KEY,
    ...
  );
  ```
- **Değiştirilen Tablolar:** [liste]

#### Yeni Servisler/Utilities
- `backend/utils/featureHelper.js` - [açıklama]
- `backend/services/featureService.js` - [açıklama]

#### Controller Değişiklikleri
- `backend/controllers/featureController.js` - [yeni/güncellendi]

### Frontend Değişiklikleri

#### Yeni Bileşenler
- `frontend/src/components/FeatureComponent.tsx` - [açıklama]
- `frontend/src/components/FeatureModal.tsx` - [açıklama]

#### State Yönetimi
- **Context:** `frontend/src/context/FeatureContext.tsx`
- **Custom Hook:** `frontend/src/hooks/useFeature.ts`

#### API Entegrasyonu
- `frontend/src/lib/api.ts` → `getFeatureData()`, `updateFeature()`

#### Yeni Sayfalar/Route'lar
- `/feature` - [açıklama]
- `/feature/:id` - [açıklama]

### Dış Servis Entegrasyonları
- [Servis adı]: [amaç ve kullanım]

---

## 🧪 Test Planı

### Unit Testler
- [ ] `backend/tests/unit/featureController.test.js`
- [ ] `frontend/src/components/__tests__/FeatureComponent.test.tsx`

### Integration Testler
- [ ] API endpoint testleri
- [ ] Veritabanı işlem testleri

### E2E Testler
- [ ] Kullanıcı akışı 1: [açıklama]
- [ ] Kullanıcı akışı 2: [açıklama]

### Manuel Test Senaryoları
1. **Senaryo 1:**
   - Adımlar: [1, 2, 3]
   - Beklenen sonuç: [...]
   
2. **Senaryo 2:**
   - Adımlar: [1, 2, 3]
   - Beklenen sonuç: [...]

---

## 🚀 Deployment Notları

### Environment Variables
```bash
# .env
NEW_FEATURE_API_KEY=xxx
FEATURE_ENABLED=true
```

### Migration Çalıştırma
```bash
# Production'da çalıştırılacak migration
psql -f backend/migrations/YYYYMMDD_feature_name.sql
```

### Breaking Changes
- [ ] Yok
- [ ] Var: [detaylar]

### Rollback Planı
[Özellik sorunlu çıkarsa nasıl geri alınır?]

---

## 📊 Başarı Metrikleri

- **Performans:** [örn. API yanıt süresi < 500ms]
- **Kullanım:** [örn. günlük 100 kullanıcı]
- **Hata Oranı:** [örn. < %1]

---

## 📸 Ekran Görüntüleri / Mockup'lar

[UI değişikliği varsa ekran görüntüleri veya Figma linkleri]

---

## 🔗 İlgili Dokümanlar

- [API Endpoints](../api/endpoints.md#feature-endpoints)
- [Database Schema](../database/schema-overview.md#feature-table)
- [Frontend Structure](../architecture/frontend-structure.md)

---

## 📝 Notlar ve Kararlar

### Tasarım Kararları
- **Karar 1:** [neden bu şekilde yapıldı?]
- **Karar 2:** [alternatifler nelerdi?]

### Bilinen Sınırlamalar
- [Sınırlama 1]
- [Sınırlama 2]

### Gelecek İyileştirmeler
- [ ] İyileştirme 1
- [ ] İyileştirme 2

---

**Son Güncelleme:** [YYYY-MM-DD]  
**Güncelleyen:** [İsim]
