# ⚠️ Backend Restart Gerekli

## 🔧 Yapılan Değişiklik
`backend/utils/audioMerger.js` dosyasına FFmpeg path detection eklendi.

## 📋 Restart Adımları

### 1. Mevcut Backend Terminalini Kapat
- Terminal: `@[TerminalName: node, ProcessId: 11760]`
- `Ctrl + C` ile durdur veya terminali kapat

### 2. Yeni Terminal Aç ve Backend'i Başlat
```bash
cd backend
npm start
```

### 3. Beklenen Log Çıktısı
```
✅ FFmpeg path set: C:\Users\USER\AppData\Local\Microsoft\WinGet\Packages\...\ffmpeg.exe
```

veya

```
✅ FFmpeg found at: C:\ffmpeg\bin\ffmpeg.exe
```

---

## 🧪 Test

Ses oluştur ve log'da şunu göreceksin:

### ✅ Başarılı Merge:
```
🔊 Starting merge of 5 segments to Buffer
🗂️ Created temp dir: C:\Users\USER\AppData\Local\Temp\lingroot-audio-xxxxx
✅ Segment 1 written: ...
✅ Segment 2 written: ...
📄 FFmpeg list file created: ...
▶️ FFmpeg started: ...
🎉 Merge complete: ...
✅ Merged audio buffer created - Size: 994828 bytes
🧼 Cleaned temp directory: ...
```

### ❌ Eski Hata (Artık Olmayacak):
```
❌ FFmpeg error: Cannot find ffmpeg
❌ Unexpected error in mergeAudioSegmentsToBuffer: Cannot find ffmpeg
```

---

## 🎯 Neden Restart Gerekli?

1. **PATH değişikliği:** FFmpeg kurulumu PATH'e eklendi ama mevcut terminal bu değişikliği görmüyor
2. **Module cache:** Node.js modül cache'i yeni FFmpeg path'ini bilmiyor
3. **Yeni kod:** `audioMerger.js` dosyası güncellendi, yeniden yüklenmesi gerekiyor

---

## 🔍 Sorun Devam Ederse

FFmpeg path'ini manuel olarak kontrol et:
```powershell
where ffmpeg
```

Çıktı:
```
C:\Users\USER\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.0-full_build\bin\ffmpeg.exe
```

Bu path'i `audioMerger.js` dosyasındaki `commonPaths` array'ine ekle.
