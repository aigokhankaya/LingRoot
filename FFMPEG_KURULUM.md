# FFmpeg Kurulum Rehberi (Windows)

## ❌ Sorun
Backend'de audio merge işlemi sırasında FFmpeg bulunamıyor hatası:
```
❌ FFmpeg error: Cannot find ffmpeg
❌ Unexpected error in mergeAudioSegmentsToBuffer: Cannot find ffmpeg
```

## ✅ Çözüm - Manuel Kurulum (Önerilen)

### Adım 1: FFmpeg İndir
1. https://www.gyan.dev/ffmpeg/builds/ adresine git
2. **"ffmpeg-release-essentials.zip"** dosyasını indir (yaklaşık 70MB)
3. Alternatif: https://github.com/BtbN/FFmpeg-Builds/releases

### Adım 2: Klasöre Çıkar
```powershell
# İndirilen zip'i C:\ dizinine çıkar
# Sonuç: C:\ffmpeg\bin\ffmpeg.exe olmalı
```

### Adım 3: PATH'e Ekle (PowerShell Admin)
```powershell
# 1. PowerShell'i Administrator olarak aç
# 2. Şu komutu çalıştır:
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\ffmpeg\bin", "Machine")

# 3. PowerShell'i kapat ve yeniden aç
```

### Adım 4: Kontrol Et
```powershell
ffmpeg -version
```

Başarılı çıktı:
```
ffmpeg version 6.x.x Copyright (c) 2000-2024 the FFmpeg developers
built with gcc 13.x.x
...
```

---

## 🔄 Alternatif: Chocolatey (Eğer lock hatası çözülürse)

```powershell
# PowerShell Admin
choco install ffmpeg -y
```

---

## 🔄 Alternatif: Winget

```powershell
winget install ffmpeg
```

---

## 🧪 Backend'i Test Et

Kurulum sonrası:
```bash
cd backend
npm start
```

Ses oluştur ve log'da şunu göreceksin:
```
✅ FFmpeg merge successful
```

---

## 📝 Not

- FFmpeg PATH'e eklendikten sonra **tüm terminal/cmd/powershell pencerelerini kapat ve yeniden aç**
- Backend'i de restart et
- Hala çalışmazsa sistem yeniden başlatılmalı (PATH değişiklikleri için)
