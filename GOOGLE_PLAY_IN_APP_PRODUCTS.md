# Google Play Console - In-App Products (Uygulama İçi Ürünler)

## 📦 GOLD PLAN

### Temel Bilgiler:
- **Ürün Kimliği (Product ID)**: `com.lingroot.premium.monthly`
- **Ad**: Gold Plan
- **Açıklama**: Aylık premium paket - Sınırsız içerik üretimi
- **Varsayılan Fiyat**: 399 TRY
- **Ürün Türü**: Abonelik (Subscription)
- **Abonelik Dönemi**: 1 ay (Monthly)

### Detaylı Açıklama (200 karakter):
```
Aylık premium paket ile sınırsız içerik üretimi. Yaklaşık 483 dakika ses oluşturma, 146 sayfa metin işleme, tüm CEFR seviyeleri ve sınırsız kelime ekleme.
```

### Fiyatlandırma Şablonu:
- **Türkiye**: 399 TRY
- **ABD**: ~11.40 USD (399 / 35 kur)
- **Avrupa**: ~10.50 EUR

---

## 💎 PLATIN PLAN

### Temel Bilgiler:
- **Ürün Kimliği (Product ID)**: `com.lingroot.premium.monthly.platin`
- **Ad**: Platin Plan
- **Açıklama**: Aylık premium+ paket - Öncelikli destek
- **Varsayılan Fiyat**: 599 TRY
- **Ürün Türü**: Abonelik (Subscription)
- **Abonelik Dönemi**: 1 ay (Monthly)

### Detaylı Açıklama (200 karakter):
```
Aylık premium+ paket ile öncelikli destek. Yaklaşık 724 dakika ses oluşturma, 219 sayfa metin işleme, tüm CEFR seviyeleri, sınırsız kelime ve öncelikli destek.
```

### Fiyatlandırma Şablonu:
- **Türkiye**: 599 TRY
- **ABD**: ~17.11 USD (599 / 35 kur)
- **Avrupa**: ~15.80 EUR

---

## 📋 Google Play Console'da Oluşturma Adımları:

### 1. Google Play Console'a Giriş
- https://play.google.com/console adresine gidin
- LingRoot uygulamanızı seçin

### 2. Uygulama İçi Ürünler Bölümüne Git
- Sol menüden **"Monetization"** → **"Products"** → **"Subscriptions"** seçin
- Veya **"Uygulama içi ürünler"** → **"Abonelikler"** (Türkçe arayüz)

### 3. Gold Plan Oluşturma

#### a) Yeni Abonelik Oluştur
- **"Create subscription"** veya **"Abonelik oluştur"** butonuna tıklayın

#### b) Ürün Kimliği
- **Product ID**: `com.lingroot.premium.monthly`
- ⚠️ Bu alan bir kez girildiğinde değiştirilemez!

#### c) Ürün Bilgileri
- **Ad**: `Gold Plan`
- **Açıklama**: `Aylık premium paket - Sınırsız içerik üretimi`

#### d) Abonelik Dönemi
- **Billing period**: `1 month` (1 ay)
- **Grace period**: 3 days (önerilen)
- **Free trial**: İsteğe bağlı (örn: 7 gün)

#### e) Fiyatlandırma
- **Varsayılan fiyat**: 399 TRY
- **Fiyatlandırma şablonu seçin**: "Türkiye'ye göre ayarla"
- Diğer ülkeler için otomatik dönüşüm yapılacak

#### f) Kaydet ve Aktif Et
- **"Save"** → **"Activate"** butonuna tıklayın

### 4. Platin Plan Oluşturma

Aynı adımları tekrarlayın:
- **Product ID**: `com.lingroot.premium.monthly.platin`
- **Ad**: `Platin Plan`
- **Açıklama**: `Aylık premium+ paket - Öncelikli destek`
- **Fiyat**: 599 TRY

---

## ✅ Kontrol Listesi

- [ ] Gold Plan oluşturuldu (`com.lingroot.premium.monthly`)
- [ ] Gold Plan aktif edildi
- [ ] Platin Plan oluşturuldu (`com.lingroot.premium.monthly.platin`)
- [ ] Platin Plan aktif edildi
- [ ] Fiyatlar doğru ayarlandı (399 TRY ve 599 TRY)
- [ ] Abonelik dönemleri 1 ay olarak ayarlandı
- [ ] Test satın alma yapıldı (test hesabı ile)

---

## 🧪 Test Etme

### Test Hesabı Ekleme:
1. Google Play Console → **"Settings"** → **"License testing"**
2. Gmail adresinizi test hesabı olarak ekleyin
3. Uygulamayı test hesabı ile açın
4. Satın alma işlemini test edin (gerçek ücret alınmaz)

### Test Kartları:
Google Play test kartları kullanabilirsiniz:
- Başarılı: `4242 4242 4242 4242`
- Reddedildi: `4000 0000 0000 0002`

---

## 📱 Mobil Uygulamada Kullanım

Uygulamanızda `react-native-iap` kütüphanesi bu Product ID'leri kullanarak satın alma işlemlerini gerçekleştirecek:

```typescript
const productIds = [
  'com.lingroot.premium.monthly',        // Gold Plan
  'com.lingroot.premium.monthly.platin'  // Platin Plan
];
```

---

## ⚠️ Önemli Notlar

1. **Product ID'ler değiştirilemez**: Bir kez oluşturduktan sonra değiştiremezsiniz
2. **Aktif etmeyi unutmayın**: Ürünler varsayılan olarak "draft" durumunda
3. **Fiyat değişiklikleri**: Mevcut aboneleri etkilemez, sadece yeni aboneler için geçerlidir
4. **Test etme**: Canlıya almadan önce mutlaka test hesabı ile test edin
5. **Grace period**: Ödeme başarısız olduğunda kullanıcıya 3 gün ek süre verir

---

## 🔗 Faydalı Linkler

- [Google Play Billing Documentation](https://developer.android.com/google/play/billing)
- [Subscription Best Practices](https://developer.android.com/google/play/billing/subscriptions)
- [Testing In-App Purchases](https://developer.android.com/google/play/billing/test)
