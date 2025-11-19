# Google Sign-In Hızlı Kontrol Listesi ✅

## 1. Environment Variable Kontrolü
```powershell
cd f:\Main\frontend
Get-Content .\.env.local | Select-String "GOOGLE"
```
- [ ] `NEXT_PUBLIC_GOOGLE_CLIENT_ID` mevcut mu?
- [ ] Değer: `308629480159-43l1s64c2cei400tlnsbdtb5rurmsalt.apps.googleusercontent.com`

## 2. Google Cloud Console Ayarları

🔗 https://console.cloud.google.com/apis/credentials

### Authorized JavaScript Origins
- [ ] `http://localhost:3000`
- [ ] `http://localhost:3001`
- [ ] `https://lingroot.com`
- [ ] `https://www.lingroot.com`

### Authorized Redirect URIs
- [ ] `http://localhost:3000`
- [ ] `https://lingroot.com`
- [ ] `https://www.lingroot.com`

## 3. Sunucuları Başlatın

### Backend
```powershell
cd f:\Main\backend
npm start
```
- [ ] Backend çalışıyor (http://localhost:5001)

### Frontend
```powershell
cd f:\Main\frontend
npm run dev
```
- [ ] Frontend çalışıyor (http://localhost:3000)

## 4. Test Sayfasını Kontrol Edin

🔗 http://localhost:3000/test-google-auth

- [ ] "NEXT_PUBLIC_GOOGLE_CLIENT_ID" gösteriliyor
- [ ] "Google Auth Test Et" butonuna tıklayın
- [ ] "✅ TEST BAŞARILI" mesajı görünüyor

## 5. Login Sayfasını Test Edin

🔗 http://localhost:3000/login

- [ ] "Google ile Giriş" butonuna tıklayın
- [ ] Google popup/One Tap açılıyor
- [ ] Hesap seçimi yapılabiliyor
- [ ] Giriş başarılı ve /welcome'a yönlendiriliyor

## 6. Tarayıcı Konsolu Kontrol

F12 → Console

**Başarılı durumda göreceğiniz loglar:**
```
🔄 Google giriş başlatılıyor...
🔄 Google Auth başlatılıyor...
✅ Google Identity Services başarıyla yüklendi
🔄 Google Sign-In tetikleniyor...
🎯 One Tap JWT Credential alındı
✅ Google credential alındı
🔄 Backend'e gönderiliyor...
✅ Google giriş başarılı
```

## 7. Network Tab Kontrol

F12 → Network → Filter: "google"

- [ ] `POST /api/auth/google` isteği gönderiliyor
- [ ] Status: 200 OK
- [ ] Response: `{ success: true, data: { user, token } }`

## Yaygın Sorunlar

### ❌ "Google Client ID yapılandırılmamış"
**Çözüm:** Next.js'i yeniden başlatın
```powershell
# Frontend terminalinde Ctrl+C
npm run dev
```

### ❌ "Origin mismatch"
**Çözüm:** Google Cloud Console'da URL'leri ekleyin (yukarıdaki liste)

### ❌ "idpiframe_initialization_failed"
**Çözüm:** Chrome Settings → Cookies → "Allow all cookies"

### ❌ Popup açılmıyor
**Çözüm:** Popup blocker'ı devre dışı bırakın

### ❌ "Google Identity Services yüklenemedi"
**Çözüm:** VPN'i kapatın, farklı ağ deneyin

## Hızlı Test Komutu

```powershell
# Tek komutla her şeyi test et
cd f:\Main\frontend
npm run dev
# Tarayıcıda: http://localhost:3000/test-google-auth
```

## Başarı Durumu

Tüm checkboxlar işaretliyse ve test başarılıysa, Google Sign-In çalışıyor demektir! 🎉

## Destek

Sorun devam ederse:
1. `GOOGLE_SIGNIN_DEBUG.md` dosyasını okuyun
2. `GOOGLE_SIGNIN_FIX_SUMMARY.md` dosyasında detaylı açıklamalara bakın
3. Console ve Network loglarını kaydedin
