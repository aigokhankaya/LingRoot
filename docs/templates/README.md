# Dokümantasyon Şablonları

Bu klasör, LingRoot projesinde yeni doküman oluştururken kullanılacak standart şablonları içerir.

## 📝 Mevcut Şablonlar

### 1. Feature Documentation Template
**Dosya:** `feature-documentation-template.md`  
**Ne zaman kullanılır:** Yeni bir özellik eklendiğinde  
**İçerik:**
- Özellik amacı ve gereksinimleri
- Teknik tasarım (backend + frontend)
- Test planı
- Deployment notları

### 2. API Endpoint Template
**Dosya:** `api-endpoint-template.md`  
**Ne zaman kullanılır:** Yeni API endpoint eklendiğinde  
**İçerik:**
- Request/Response formatları
- Hata kodları
- Örnek kullanımlar (cURL, JavaScript, Python)
- Implementation detayları

### 3. Test Case Template
**Dosya:** `test-case-template.md`  
**Ne zaman kullanılır:** Yeni test case yazılırken  
**İçerik:**
- Test adımları
- Beklenen sonuçlar
- Test kodu örnekleri
- Edge case'ler

## 🚀 Nasıl Kullanılır?

### Adım 1: Şablonu Kopyala
```bash
# Örnek: Yeni bir özellik dokümante ediyorsunuz
cp docs/templates/feature-documentation-template.md docs/features/my-new-feature.md
```

### Adım 2: Şablonu Doldur
- `[Placeholder]` şeklindeki tüm alanları doldurun
- İlgili olmayan bölümleri silin veya "N/A" yazın
- Kod örneklerini gerçek kodla değiştirin

### Adım 3: Dokümanı Kaydet
- Uygun klasöre kaydedin:
  - Features → `docs/features/`
  - API → `docs/api/endpoints.md` içine ekleyin
  - Tests → `docs/testing/` veya test dosyası yanına

### Adım 4: README'yi Güncelle
- Ana `README.md` veya ilgili klasörün `README.md` dosyasına link ekleyin

## 📂 Doküman Organizasyonu

```
docs/
├── templates/           # Bu klasör - Şablonlar
├── features/           # Özellik dokümanları
├── api/                # API dokümanları
├── testing/            # Test dokümanları
├── architecture/       # Mimari dokümanlar
└── database/           # Veritabanı dokümanları
```

## ✅ Checklist: Yeni Doküman Oluştururken

- [ ] Uygun şablonu seçtim
- [ ] Tüm placeholder'ları doldurdum
- [ ] Kod örnekleri gerçek ve çalışıyor
- [ ] Tarih ve versiyon bilgilerini ekledim
- [ ] İlgili dokümanlardan link verdim
- [ ] README'ye ekleme yaptım (gerekiyorsa)
- [ ] PR'da dokümantasyon güncellemesi olarak işaretledim

## 🎯 Doküman Standartları

### Başlık Formatı
```markdown
# [Özellik/Endpoint/Test Adı]

**Tarih:** YYYY-MM-DD
**Durum:** [Planlama / Geliştirme / Tamamlandı]
```

### Kod Blokları
- Her zaman dil belirtin: \`\`\`javascript, \`\`\`bash, vb.
- Gerçek, çalışan kod örnekleri kullanın
- Placeholder'lar için `[açıklayıcı_isim]` formatı kullanın

### Linkler
- Dahili linkler için relative path: `[Text](../other-doc.md)`
- Dış linkler için tam URL: `[Text](https://example.com)`

### Tablolar
- Markdown tablo formatı kullanın
- Header satırını ayırıcı ile belirtin

## 🔄 Şablon Güncelleme

Şablonlarda iyileştirme önerileriniz varsa:

1. Issue açın veya
2. PR gönderin
3. Değişiklik gerekçesini açıklayın

## 📚 İlgili Dokümanlar

- [Documentation Audit Report](../../documentation_audit_report_v3.md)
- [Onboarding Guide](../ONBOARDING.md)
- [Contributing Guidelines](../../CONTRIBUTING.md) (varsa)

---

**Son Güncelleme:** 2025-12-05  
**Sahip:** Development Team
