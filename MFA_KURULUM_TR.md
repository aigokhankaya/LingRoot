# 🎯 Montreal Forced Aligner (MFA) Kurulum Rehberi

## 📋 Özet

Montreal Forced Aligner (MFA), ses dosyalarını analiz ederek kelime seviyesinde **milisaniye hassasiyetinde** zaman damgaları üretir.

## 🚀 Hızlı Kurulum

### 1. MFA Kurulumu

#### Seçenek A: Conda (Önerilen)

```bash
# Conda environment oluştur
conda create -n aligner -c conda-forge montreal-forced-aligner

# Environment'ı aktifleştir
conda activate aligner

# Kurulumu doğrula
mfa version
```

#### Seçenek B: Docker

```bash
docker pull mmcauliffe/montreal-forced-aligner
docker run mmcauliffe/montreal-forced-aligner mfa version
```

#### Seçenek C: pip

```bash
pip install montreal-forced-aligner
mfa version
```

### 2. Backend Konfigürasyonu

Backend `.env` dosyasına ekle:

```env
USE_MFA_ALIGNMENT=true
```

### 3. Test

```bash
cd backend
npm run dev
```

Log'larda göreceksin:
```
✅ MFA alignment complete - 12 words aligned
```

## 📚 Detaylı Dokümantasyon

- **Kurulum**: `SETUP_MFA.md`
- **Backend**: `backend/README_MFA.md`
- **Analiz**: `analiz/MFA-Analiz.md`

## ✅ Kontrol Listesi

- [ ] MFA kuruldu (`mfa version` çalışıyor)
- [ ] `.env` dosyasına `USE_MFA_ALIGNMENT=true` eklendi
- [ ] Backend başlatıldı
- [ ] Log'larda "MFA alignment complete" görüldü
