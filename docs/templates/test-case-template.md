# Test Case: [Test Adı]

**Test ID:** TC-[NUMBER]  
**Tarih:** [YYYY-MM-DD]  
**Kategori:** [Unit / Integration / E2E]  
**Öncelik:** [Critical / High / Medium / Low]  
**Durum:** [Pass / Fail / Blocked / Skipped]

---

## Test Bilgileri

**Dosya:** `[test dosyası yolu]`  
**İlgili Özellik:** [Feature adı]  
**Test Eden:** [İsim]  
**Test Tarihi:** [YYYY-MM-DD]

---

## Amaç

[Bu test ne doğruluyor? Hangi senaryoyu kapsıyor?]

---

## Ön Koşullar

- [ ] Backend çalışıyor olmalı
- [ ] Test veritabanı hazır olmalı
- [ ] Test kullanıcısı oluşturulmuş olmalı
- [ ] [Diğer ön koşullar]

### Test Verileri
```json
{
  "testUser": {
    "email": "test@example.com",
    "password": "Test123!",
    "cefrLevel": "B1"
  },
  "testInput": {
    "text": "Sample text for testing",
    "level": "B1"
  }
}
```

---

## Test Adımları

### 1. [Adım Başlığı]
**Aksiyon:** [Ne yapılacak?]
```javascript
// Kod örneği (varsa)
const result = await api.post('/endpoint', data);
```

**Beklenen Sonuç:** [Ne olmalı?]
- [ ] HTTP status code: 200
- [ ] Response body contains `success: true`
- [ ] Data field is not empty

---

### 2. [Adım Başlığı]
**Aksiyon:** [Ne yapılacak?]

**Beklenen Sonuç:** [Ne olmalı?]
- [ ] [Kontrol 1]
- [ ] [Kontrol 2]

---

### 3. [Adım Başlığı]
**Aksiyon:** [Ne yapılacak?]

**Beklenen Sonuç:** [Ne olmalı?]
- [ ] [Kontrol 1]
- [ ] [Kontrol 2]

---

## Test Kodu

### Unit Test Örneği
```javascript
describe('Feature Name', () => {
  it('should do something correctly', async () => {
    // Arrange
    const input = { field: 'value' };
    
    // Act
    const result = await functionUnderTest(input);
    
    // Assert
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('id');
  });
});
```

### Integration Test Örneği
```javascript
describe('POST /api/endpoint', () => {
  it('should create resource successfully', async () => {
    const response = await request(app)
      .post('/api/endpoint')
      .set('Authorization', `Bearer ${token}`)
      .send({ field: 'value' })
      .expect(201);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('id');
  });
});
```

### E2E Test Örneği
```javascript
test('User can complete full workflow', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'Test123!');
  await page.click('button[type="submit"]');
  
  // Navigate to feature
  await page.waitForURL('/dashboard');
  await page.click('text=Feature Name');
  
  // Perform action
  await page.fill('[name="input"]', 'test data');
  await page.click('button:has-text("Submit")');
  
  // Verify result
  await expect(page.locator('.success-message')).toBeVisible();
});
```

---

## Test Sonuçları

### Gerçek Sonuç
[Test çalıştırıldığında ne oldu?]

**Başarılı:** [✅ / ❌]

**Ekran Görüntüsü / Log:**
```
[Test output veya log]
```

---

## Edge Cases

### Edge Case 1: [Açıklama]
**Input:** [Özel input]
**Beklenen:** [Ne olmalı?]
**Gerçek:** [Ne oldu?]

### Edge Case 2: [Açıklama]
**Input:** [Özel input]
**Beklenen:** [Ne olmalı?]
**Gerçek:** [Ne oldu?]

---

## Hata Senaryoları

### Hata Senaryosu 1: [Açıklama]
**Adımlar:**
1. [Adım 1]
2. [Adım 2]

**Beklenen Hata:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message"
  }
}
```

**Gerçek Sonuç:** [✅ Doğru hata döndü / ❌ Farklı hata]

---

## Performans Metrikleri

| Metrik | Hedef | Gerçek | Durum |
|--------|-------|--------|-------|
| Response Time | < 500ms | [actual] | [✅/❌] |
| Memory Usage | < 100MB | [actual] | [✅/❌] |
| CPU Usage | < 50% | [actual] | [✅/❌] |

---

## Temizlik (Cleanup)

Test sonrası temizlik adımları:
- [ ] Test verilerini sil
- [ ] Test kullanıcısını sil (gerekiyorsa)
- [ ] Geçici dosyaları temizle
- [ ] Cache'i temizle

```javascript
afterEach(async () => {
  // Cleanup code
  await db.query('DELETE FROM test_table WHERE user_id = ?', [testUserId]);
});
```

---

## Notlar

### Bilinen Sorunlar
- [Sorun 1]
- [Sorun 2]

### İyileştirme Önerileri
- [ ] [Öneri 1]
- [ ] [Öneri 2]

### İlgili Test Case'ler
- TC-[NUMBER]: [Test adı]
- TC-[NUMBER]: [Test adı]

---

## Değişiklik Geçmişi

| Tarih | Versiyon | Değişiklik | Yapan |
|-------|----------|------------|-------|
| 2025-12-05 | 1.0 | İlk versiyon | [İsim] |

---

**Son Güncelleme:** [YYYY-MM-DD]  
**Test Durumu:** [Pass / Fail / Blocked]
