# Roleplay Ses Deneyimi İyileştirme Planı

> **Oluşturulma:** 2026-01-24 | **Versiyon:** 1.0

## 🎯 Hedef

Sektör İngilizcesi modülündeki roleplay ve podcast oluşturma deneyimini, `/welcome` sayfasındaki podcast oluşturma/oynatma deneyimiyle aynı seviyeye yükseltmek.

## 📋 Mevcut Durum Analizi

### Roleplay/Podcast Ses Seçenekleri
- **Mevcut:** Sadece 6 OpenAI TTS sesi (alloy, echo, fable, nova, onyx, shimmer)
- **Hedef:** Google Cloud TTS sesleri dahil (Standard, Neural, Premium kategorileri)

### Oynatma UI
- **Mevcut:** Basit play/pause butonu + download linki
- **Hedef:** `PodcastPlayer.tsx` benzeri zengin deneyim (transkript senkronizasyonu, vocabulary, kontroller)

## 📝 Önerilen Değişiklikler

### Faz 1: Ses Seçeneklerinin Genişletilmesi

#### 1.1 Paylaşılan VoiceSelector Bileşeni Oluşturma
**Dosya:** `frontend/src/components/common/VoiceSelector.tsx`

**Özellikler:**
- Google Cloud TTS sesleri + OpenAI sesleri
- Kategori bazlı gruplandırma (Standard, Neural, Premium)
- Plan bazlı filtreleme desteği (basic plan → sadece standard)
- Ses önizleme (isteğe bağlı)
- Genişletilebilir dropdown UI

#### 1.2 Backend Güncelleme
**Dosyalar:**
- `backend/services/sectorRoleplayService.js`
- `backend/routes/sectorRoutes.js`

**Değişiklikler:**
- `voice_role_1`, `voice_role_2` parametrelerinin hem OpenAI hem Google ses ID'lerini kabul etmesi
- Ses türünü otomatik algılayıp doğru TTS sağlayıcısını kullanma

### Faz 2: Gelişmiş Oynatma UI

#### 2.1 RoleplayPlayer Bileşeni Oluşturma
**Dosya:** `frontend/src/components/sectors/RoleplayPlayer.tsx`

`PodcastPlayer.tsx` baz alınarak oluşturulacak roller arası diyalog deneyimi:

**Özellikler:**
- Diyalog satırlarının zaman senkronizasyonuyla gösterimi
- Aktif repliklerin vurgulanması
- Rol bazlı renk kodlaması (Rol 1: mavi, Rol 2: mor)
- İngilizce + Türkçe çeviri toggle
- Key phrase'lerin işaretlenmesi
- Playback rate kontrolü
- Progress bar
- Segment atlama (önceki/sonraki replik)
- Vocabulary highlighting (replik içindeki key terms)

#### 2.2 RoleplayCreator Entegrasyonu
**Dosya:** `frontend/src/components/sectors/RoleplayCreator.tsx`

**Değişiklikler:**
- Step 4 (sonuç ekranı) yerine `RoleplayPlayer` bileşenini kullanma
- Audio oluşturulduktan sonra VTT/transcript verisiyle birlikte player'a geçiş
- Diyalog önizlemesini oynatma moduna dönüştürme

### Faz 3: Podcast Creator Güncellemesi

#### 3.1 PodcastCreator → PodcastPlayer Entegrasyonu
**Dosya:** `frontend/src/components/sectors/PodcastCreator.tsx`

**Değişiklikler:**
- Oluşturma tamamlandığında mevcut `PodcastPlayer.tsx` bileşenini kullanma
- Transkript verisinin düzgün aktarılması
- Vocabulary extraction ve gösterimi

## 🏗️ Uygulama Sırası

| Sıra | Görev | Tahmini Süre | Öncelik |
|------|-------|-------------|---------|
| 1 | VoiceSelector bileşeni oluşturma | 2-3 saat | Yüksek |
| 2 | RoleplayPlayer bileşeni oluşturma | 4-5 saat | Yüksek |
| 3 | RoleplayCreator entegrasyonu | 2 saat | Yüksek |
| 4 | PodcastCreator güncelleme | 1-2 saat | Orta |
| 5 | Backend voice routing güncelleme | 2 saat | Orta |
| 6 | Test ve ince ayar | 2 saat | Yüksek |

## ⚠️ Dikkat Edilecek Noktalar

1. **API Uyumluluğu:** Mevcut API sözleşmesi korunmalı, geriye dönük uyumluluk sağlanmalı
2. **VTT Desteği:** Roleplay audio oluşturulurken VTT dosyası da oluşturulmalı (zaman damgaları için)
3. **Plan Kısıtlamaları:** Premium sesler için plan kontrolü yapılmalı
4. **Performans:** Büyük dialog'lar için lazy loading düşünülmeli

## 📁 Etkilenen Dosyalar

### Frontend
- `frontend/src/components/common/VoiceSelector.tsx` (YENİ)
- `frontend/src/components/sectors/RoleplayPlayer.tsx` (YENİ)
- `frontend/src/components/sectors/RoleplayCreator.tsx` (GÜNCELLEME)
- `frontend/src/components/sectors/PodcastCreator.tsx` (GÜNCELLEME)
- `frontend/src/components/sectors/index.ts` (EXPORT EKLEME)

### Backend
- `backend/services/sectorRoleplayService.js` (GÜNCELLEME)
- `backend/routes/sectorRoutes.js` (GÜNCELLEME)

## ❓ Açık Sorular (Onay Gerektirir)

1. **Ses önceliği:** OpenAI sesleri mi yoksa Google Cloud sesleri mi öncelikli olmalı?
2. **Plan kısıtlamaları:** Hangi ses kategorileri hangi planlarda kullanılabilir?
3. **VTT oluşturma:** Mevcut audio pipeline'da VTT oluşturma var mı, yoksa eklenecek mi?

---

**Sonraki Adım:** Kullanıcı onayı alındıktan sonra Faz 1 ile başlanacak.
