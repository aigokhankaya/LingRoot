# 🎯 Topic Audio Sistem Test Rehberi

Bu dokümanda, konu hiyerarşisi + TTS + audio status + dinlenme tracking sisteminin uçtan uca testini yapacaksınız.

---

## ✅ 1. Veritabanı / Supabase Hazırlık

### Adım 1.1: Migration'ı Çalıştır
1. **Supabase Dashboard** → SQL Editor'a gidin: https://supabase.com/dashboard/project/_/sql
2. `backend/migrations/run_on_supabase.sql` dosyasının **tamamını** kopyalayın
3. SQL Editor'a yapıştırın
4. **RUN** butonuna basın

### Adım 1.2: Doğrulama
Aşağıdaki sorguyu SQL Editor'da çalıştırın:

```sql
-- Tabloları kontrol et
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE columns.table_name = tables.table_name) as column_count
FROM information_schema.tables 
WHERE table_name IN ('topics', 'topic_contents')
AND table_schema = 'public';

-- listened_at kolonunu kontrol et
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'topic_contents' 
AND column_name = 'listened_at';

-- Index'leri kontrol et
SELECT indexname 
FROM pg_indexes 
WHERE tablename IN ('topics', 'topic_contents')
ORDER BY tablename, indexname;
```

**Beklenen Sonuç:**
- `topics` tablosu: ~11 kolon
- `topic_contents` tablosu: ~14 kolon (listened_at dahil)
- 6 adet index

---

## ✅ 2. Backend Test - API Endpoint'leri

### Adım 2.1: Backend Loglarını İzle
Terminal'de backend loglarını takip edin:
- TTS işlemi sırasında `[${requestId}] Saving topic audio for topic_id=...` logunu görmeli
- topic_contents insert işlemini kontrol edin

### Adım 2.2: Topic Tree API Test
**Tarayıcıda Test:**

1. http://localhost:3000 adresine gidin ve giriş yapın
2. Developer Tools → Network tab'ı açın
3. http://localhost:3000/welcome sayfasına gidin
4. "Konu Ağacı" sekmesine tıklayın
5. Network tab'ında şu isteği bulun:
   - `GET /api/topic-hierarchy/topics/tree`
   - Response'da `latest_content` alanını kontrol edin
   - Eğer daha önce ses oluşturduysanız: `mp3_url`, `listened_at` değerlerini görmelisiniz

**Manuel API Test (Postman veya curl):**
```bash
curl -X GET http://localhost:5001/api/topic-hierarchy/topics/tree \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## ✅ 3. E2E Test Senaryosu

### 🎬 Senaryo: Yeni Konu Oluştur → Ses Üret → Dinle → Durum Kontrol

#### Adım 3.1: Ana Konu Oluştur
1. http://localhost:3000/welcome → **Konu Ağacı** sekmesine gidin
2. "Ana Konu Başlığı" alanına: **"Osmanlı Tarihi"** yazın
3. "Açıklama" alanına: **"Osmanlı İmparatorluğunun tarihi"** yazın
4. **"Ana Konu Oluştur"** butonuna basın
5. ✅ Başarı mesajı: "Ana konu başarıyla oluşturuldu!"

#### Adım 3.2: Alt Konu Ekle (AI ile)
1. "Osmanlı Tarihi" konusunun yanındaki **"AI Öner"** butonuna basın
2. Modal açılacak, **5 alt konu** seçin
3. **"Alt Konular Oluştur"** butonuna basın
4. ✅ 5 alt konu oluşturulmalı (örn: "Kuruluş Dönemi", "Yükseliş Dönemi", vb.)

#### Adım 3.3: Ses Oluştur (Topic ID ile)
1. Alt konulardan birini seçin, örn: **"Kuruluş Dönemi"**
2. **"Ses Oluştur"** butonuna basın
3. Alert çıkacak: "Konu bilgisi alındı! Şimdi ses oluşturabilirsiniz."
4. **Konu** sekmesine otomatik geçiş yapılacak
5. Text alanında konu başlığı ve açıklaması görünecek
6. **"Ses Oluştur"** butonuna basın

**🔍 Developer Tools Kontrol:**
- Network tab → `/tts/process` request
- Request Payload'da `topic_id` alanını kontrol edin:
  ```json
  {
    "input": "Kuruluş Dönemi: ...",
    "type": "subject",
    "level": "A1",
    "topic_id": "uuid-burada-olacak"
  }
  ```

#### Adım 3.4: Backend Log Kontrol
Backend terminal'inde şu logları görmeli:
```
[${requestId}] Saving topic audio for topic_id=xxxx-xxxx to topic_contents
[${requestId}] Topic audio saved to topic_contents: yyyy-yyyy
```

#### Adım 3.5: Supabase Kontrol - Kayıt Oluşturuldu mu?
Supabase SQL Editor'da:
```sql
SELECT 
  tc.id,
  tc.topic_id,
  tc.mp3_url,
  tc.listened_at,
  tc.created_at,
  t.title as topic_title
FROM topic_contents tc
JOIN topics t ON t.id = tc.topic_id
ORDER BY tc.created_at DESC
LIMIT 5;
```

**Beklenen:**
- En son kaydın `topic_id` alanı dolu
- `mp3_url` dolu
- `listened_at` **NULL** (henüz dinlenilmedi)

#### Adım 3.6: Ses Dinle (Play'e Bas)
1. TTS tamamlandıktan sonra sayfa aşağı kaydırın
2. **Audio Player** görünecek
3. ▶️ **"Oynat"** butonuna basın

**🔍 Developer Tools Kontrol:**
- Network tab → `/topic-hierarchy/topics/mark-listened` POST request
- Request Payload:
  ```json
  {
    "mp3_url": "https://ffqfcmmbeeieouoghrac.supabase.co/storage/v1/..."
  }
  ```
- Response:
  ```json
  {
    "success": true,
    "message": "Ses kaydı dinlenmiş olarak işaretlendi"
  }
  ```

#### Adım 3.7: Supabase Kontrol - listened_at Güncellendi mi?
```sql
SELECT 
  id,
  topic_id,
  listened_at,
  created_at
FROM topic_contents
WHERE mp3_url = 'YOUR_MP3_URL_HERE'
ORDER BY created_at DESC
LIMIT 1;
```

**Beklenen:**
- `listened_at` **artık dolu** (timestamp)

#### Adım 3.8: Dashboard → Okuma Geçmişim
1. http://localhost:3000/dashboard?tab=reading-history adresine gidin
2. Konu ağacında **"Kuruluş Dönemi"** konusunu bulun
3. Metadata kısmında rozetleri kontrol edin:

**Rozet Durumları:**
- 🔴 **"Ses yok"** (gri rozet): Hiç ses üretilmemiş konular
- 🔵 **"Ses hazır"** (mavi rozet): Ses üretilmiş ama dinlenilmemiş
- 🟢 **"Dinlendi"** (yeşil rozet): Ses dinlenmiş konular

**✅ Beklenen Sonuç:**
- "Kuruluş Dönemi" → **"Dinlendi"** (yeşil rozet)
- Diğer alt konular → **"Ses yok"** (gri rozet)

---

## ✅ 4. Frontend Rozet Test Tablosu

Test için 3 farklı konu durumu oluşturun:

| Konu Adı | Durum | Rozet | Rozet Rengi |
|----------|-------|-------|-------------|
| Ana Konu 1 | Hiç ses üretilmedi | "Ses yok" | bg-gray-100 text-gray-600 |
| Alt Konu 1 | Ses üretildi, dinlenmedi | "Ses hazır" | bg-blue-100 text-blue-700 |
| Alt Konu 2 | Ses üretildi ve dinlendi | "Dinlendi" | bg-green-100 text-green-700 |

---

## ✅ 5. Debugging Komutları

### Backend Log Filtreleme:
```bash
# Sadece topic ile ilgili logları göster
npm start | findstr "TOPIC"
npm start | findstr "topic_contents"
```

### Supabase Debug Sorguları:
```sql
-- En son 10 topic_contents kaydı
SELECT 
  tc.id,
  t.title,
  tc.mp3_url IS NOT NULL as has_audio,
  tc.listened_at IS NOT NULL as is_listened,
  tc.created_at
FROM topic_contents tc
JOIN topics t ON t.id = tc.topic_id
ORDER BY tc.created_at DESC
LIMIT 10;

-- Topic başına audio durumu
SELECT 
  t.id,
  t.title,
  COUNT(tc.id) as audio_count,
  MAX(tc.created_at) as latest_audio,
  MAX(tc.listened_at) as last_listened
FROM topics t
LEFT JOIN topic_contents tc ON tc.topic_id = t.id
GROUP BY t.id, t.title
ORDER BY t.created_at DESC;

-- Dinlenme oranları
SELECT 
  COUNT(*) as total_audios,
  COUNT(listened_at) as listened_count,
  ROUND(COUNT(listened_at)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as listened_percentage
FROM topic_contents;
```

---

## 🐛 Sorun Giderme

### Problem 1: "topic_id undefined" hatası
**Çözüm:** 
- welcome.tsx'te `activeTopicId` state'i set ediliyor mu kontrol edin
- TopicNode → onContentCreated callback'i `topic.id` gönderiyor mu?

### Problem 2: topic_contents tablosuna kayıt düşmüyor
**Çözüm:**
- Backend log: `topic_id` TTS isteğinde var mı?
- ttsController.js satır 1296: `req.body.topic_id` kontrolü yapılıyor mu?

### Problem 3: listened_at güncellenmiyor
**Çözüm:**
- markTopicListened endpoint'i çağrılıyor mu? (Network tab)
- Supabase RLS policy'leri aktif mi kontrol edin
- Backend log: "Topic audio marked as listened" mesajı var mı?

### Problem 4: Rozetler görünmüyor
**Çözüm:**
- getTopicTree API yanıtında `latest_content` var mı?
- TopicNode.tsx satır 72-74: `latestContent` değişkeni tanımlı mı?
- Dashboard sayfasını yenileyip tekrar deneyin

---

## ✅ Test Sonuç Checklist

Tüm testleri tamamladıktan sonra bu listeyi işaretleyin:

- [ ] Supabase'te `topics` ve `topic_contents` tabloları oluşturuldu
- [ ] `topic_contents.listened_at` kolonu var
- [ ] 6 adet index oluşturuldu
- [ ] Backend başarıyla başladı (port 5001)
- [ ] Frontend başarıyla başladı (port 3000)
- [ ] Ana konu oluşturuldu
- [ ] Alt konular oluşturuldu (AI veya manuel)
- [ ] Bir alt konu için ses oluşturuldu (`topic_id` ile)
- [ ] Backend'de topic_contents kaydı oluşturuldu
- [ ] Ses player'da Play butonuna basıldı
- [ ] `markTopicListened` endpoint'i çağrıldı
- [ ] Supabase'te `listened_at` güncellendi
- [ ] Dashboard → Okuma Geçmişim'de doğru rozetler görünüyor
  - [ ] "Ses yok" (gri)
  - [ ] "Ses hazır" (mavi)
  - [ ] "Dinlendi" (yeşil)

---

## 📝 Notlar

- Her test arasında tarayıcı cache'ini temizleyebilirsiniz (Ctrl+Shift+R)
- Backend ve frontend loglarını paralel takip edin
- Supabase SQL Editor'ı sürekli açık tutun (real-time kontrol için)

**Test tamamlandığında bu dosyayı güncelleyip sonuçları paylaşın!** 🎉
