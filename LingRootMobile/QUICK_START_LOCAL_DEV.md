# 🚀 Hızlı Başlangıç: Local Backend ile Test

Bu kısa rehber, Android geliştirme yaparken backend'i lokalde test etmeniz için gereken minimum adımları içerir.

## ⚡ 3 Adımda Başlayın

### 1️⃣ Setup Script'i Çalıştırın

```powershell
cd LingRootMobile
.\setup-local-dev.ps1
```

Script size soracak:
- Android Emülatör mü, Fiziksel Cihaz mı kullanıyorsunuz?
- Firewall kuralı eklemek istiyor musunuz?

### 2️⃣ Backend'i Başlatın

```bash
cd backend
npm run dev
```

Backend `http://0.0.0.0:5001` adresinde çalışacak.

### 3️⃣ Mobile App'i Başlatın

```bash
cd LingRootMobile
npx expo start -c
```

## ✅ Test Edin

Backend bağlantısını test etmek için:

```powershell
.\test-backend-connection.ps1
```

## 📱 Cihaz Seçimine Göre IP Adresleri

| Cihaz Tipi | API URL |
|------------|---------|
| Android Emülatör | `http://10.0.2.2:5001` |
| Fiziksel Android Cihaz | `http://192.168.x.x:5001` |
| iOS Simulator | `http://localhost:5001` |
| Fiziksel iOS Cihaz | `http://192.168.x.x:5001` |

> **Not:** `192.168.x.x` yerine bilgisayarınızın gerçek IP adresini kullanın.

## 🔍 IP Adresinizi Bulun

```powershell
# Windows
ipconfig | findstr IPv4

# macOS/Linux
ifconfig | grep "inet "
```

## 🔥 Firewall (Sadece Fiziksel Cihaz İçin)

Fiziksel cihaz kullanıyorsanız, Windows Firewall'da 5001 portunu açın:

```powershell
# PowerShell'i Yönetici olarak çalıştırın
New-NetFirewallRule -DisplayName "Node.js Backend Port 5001" -Direction Inbound -LocalPort 5001 -Protocol TCP -Action Allow
```

## 🔄 Production'a Geri Dönme

`.env` dosyasını düzenleyin:

```env
EXPO_PUBLIC_API_URL=https://lingloops-backend.onrender.com
```

Sonra:

```bash
npx expo start -c
```

## ❓ Sorun mu Yaşıyorsunuz?

1. **Backend çalışıyor mu?**
   ```bash
   # Tarayıcıda açın:
   http://localhost:5001/api/health
   ```

2. **Firewall engelliyor mu?**
   ```powershell
   .\test-backend-connection.ps1
   ```

3. **Aynı Wi-Fi'de misiniz?** (Fiziksel cihaz için)
   - Cihaz ve bilgisayar aynı ağda olmalı

4. **Cache temizlediniz mi?**
   ```bash
   npx expo start -c
   ```

## 📚 Daha Fazla Bilgi

Detaylı dokümantasyon için:
- [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md) - Tam rehber
- [README.md](./README.md) - Genel bilgiler

## 💡 İpuçları

- ✅ Backend'i her zaman `npm run dev` ile başlatın (hot reload için)
- ✅ `.env` dosyasını değiştirdikten sonra Expo'yu yeniden başlatın
- ✅ Backend loglarını izleyin (istekleri görebilirsiniz)
- ✅ Emülatör kullanıyorsanız `10.0.2.2` kullanın
- ❌ `.env` dosyasını commit etmeyin (zaten .gitignore'da)

## 🎯 Workflow Örneği

```bash
# 1. Backend'i başlat (Terminal 1)
cd backend
npm run dev

# 2. Mobile app'i başlat (Terminal 2)
cd LingRootMobile
npx expo start -c

# 3. Kod değişikliği yap
# Backend: Otomatik reload (nodemon)
# Mobile: Expo'da 'r' tuşuna bas

# 4. Test et
# Backend loglarını izle
# Mobile app'te işlemi dene

# 5. Başarılı ise commit et
git add .
git commit -m "feat: yeni özellik"
git push

# 6. Production'a geri dön
# .env dosyasını düzenle veya sil
npx expo start -c
```

---

**Hazır!** 🎉 Artık backend değişikliklerinizi Render'a push etmeden test edebilirsiniz!
