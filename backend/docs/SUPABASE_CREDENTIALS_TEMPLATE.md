# Supabase Credentials Template

## 🔑 n8n Environment Variables

n8n workflow'unuzda tanımlanması gereken değişkenler:

```javascript
// n8n → Settings → Variables → Add New Variable
```

### Required Variables

```env
# Supabase Project URL
SUPABASE_URL=https://your-project-id.supabase.co

# Supabase Service Role Key (NOT anon key!)
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXItcHJvamVjdC1pZCIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE2ODAwMDAwMDAsImV4cCI6MTk5NTU3NjAwMH0.your-signature-here

# Storage Bucket Name
SUPABASE_BUCKET_NAME=lingroot-audio
```

---

## 📍 Credential Nereden Alınır?

### 1. SUPABASE_URL

**Adımlar:**
1. https://app.supabase.com → Projenizi seçin
2. Sol menü → **Settings** ⚙️
3. **API** sekmesi
4. **Project URL** bölümünü kopyalayın

**Format:**
```
https://abcdefghijklmnop.supabase.co
```

---

### 2. SUPABASE_SERVICE_KEY

**Adımlar:**
1. https://app.supabase.com → Projenizi seçin
2. Sol menü → **Settings** ⚙️
3. **API** sekmesi
4. **Project API keys** bölümü
5. **`service_role`** key'i kopyalayın (👁️ Show/Hide)

⚠️ **DİKKAT:** 
- `anon` key değil, `service_role` key kullanın!
- Bu key tam yetki verir, güvenli saklayın
- Public repoya commit etmeyin

**Format:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
(çok uzun bir token)
```

---

### 3. SUPABASE_BUCKET_NAME

**Adımlar:**
1. https://app.supabase.com → Projenizi seçin
2. Sol menü → **Storage** 🗂️
3. **Create bucket** butonu
   - Name: `lingroot-audio`
   - Public bucket: ✅ **AÇIK** (önemli!)
   - File size limit: 50 MB
   - Allowed MIME types: `audio/*`, `text/*`
4. Create

**Format:**
```
lingroot-audio
```

---

## 🛡️ Güvenlik Kontrol Listesi

- [ ] Service role key `.env` dosyasında (git'e commit edilmedi)
- [ ] Service role key n8n environment variables'da
- [ ] Bucket public olarak işaretlendi
- [ ] Bucket policies doğru ayarlandı
- [ ] Production'da HTTPS kullanılıyor
- [ ] Keys log'larda görünmüyor

---

## 🔒 Bucket Policies (Opsiyonel)

Supabase Storage'da güvenlik politikaları:

### Policy 1: Allow Service Role Upload

```sql
-- Storage → lingroot-audio → Policies → New Policy

-- Name: Allow service role to upload
-- Policy definition:
CREATE POLICY "Allow service role to upload"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'lingroot-audio');
```

### Policy 2: Allow Public Read

```sql
-- Name: Allow public read access
-- Policy definition:
CREATE POLICY "Allow public read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'lingroot-audio');
```

---

## ✅ Test Etme

Credentials'ları test edin:

### Test 1: Supabase Connection

```bash
curl https://YOUR-PROJECT.supabase.co/rest/v1/ \
  -H "apikey: YOUR-SERVICE-KEY" \
  -H "Authorization: Bearer YOUR-SERVICE-KEY"
```

**Beklenen:** `200 OK` veya API response

### Test 2: Storage Upload

```bash
curl -X POST https://YOUR-PROJECT.supabase.co/storage/v1/object/lingroot-audio/audio/test.txt \
  -H "Authorization: Bearer YOUR-SERVICE-KEY" \
  -H "Content-Type: text/plain" \
  --data "Test content"
```

**Beklenen:** `201 Created` veya upload başarılı

### Test 3: Public URL

```bash
curl https://YOUR-PROJECT.supabase.co/storage/v1/object/public/lingroot-audio/audio/test.txt
```

**Beklenen:** `Test content` görüntülenmeli

---

## 📋 Checklist: Kurulum Tamamlandı mı?

### Supabase Tarafı
- [ ] Supabase project oluşturuldu
- [ ] `lingroot-audio` bucket oluşturuldu
- [ ] Bucket **public** olarak işaretlendi
- [ ] Storage policies ayarlandı (opsiyonel)

### Credentials
- [ ] SUPABASE_URL alındı
- [ ] SUPABASE_SERVICE_KEY alındı (service_role)
- [ ] SUPABASE_BUCKET_NAME belirlendi

### n8n Tarafı
- [ ] n8n'de environment variables tanımlandı
- [ ] Variables test edildi (syntax hatasız)
- [ ] Workflow'da variables kullanıldı (`{{ $env.SUPABASE_URL }}`)

### Test
- [ ] Test upload başarılı
- [ ] Public URL browser'da açılıyor
- [ ] n8n workflow çalışıyor
- [ ] Frontend'den erişim çalışıyor

---

## 🆘 Sorun Giderme

### "Invalid API Key" Hatası

**Sebep:** Yanlış key kullanıyorsunuz

**Çözüm:**
- `anon` key yerine `service_role` key kullanın
- Key'i Settings → API → service_role'den kopyalayın
- Başında/sonunda boşluk olmadığından emin olun

### "Bucket not found" Hatası

**Sebep:** Bucket adı yanlış veya bucket yok

**Çözüm:**
```bash
# Bucket adını kontrol edin:
https://app.supabase.com/project/YOUR-ID/storage/buckets

# Bucket name tam olarak eşleşmeli (case-sensitive)
lingroot-audio ✅
Lingroot-Audio ❌
lingroot_audio ❌
```

### "Policy violation" Hatası

**Sebep:** Bucket'a upload yetkisi yok

**Çözüm:**
```bash
# Storage → Bucket → Policies
# "Allow service role to upload" policy ekleyin
```

---

## 📞 İletişim

Credential sorunları için:
- Supabase Dashboard: https://app.supabase.com
- Supabase Docs: https://supabase.com/docs
- Backend Admin: [backend@lingroot.com]

---

## 🔐 Credential Rotation (Güvenlik)

Credentials düzenli olarak yenileyin:

### Service Key Yenileme

**Ne zaman:**
- Her 90 günde bir (önerilen)
- Key ifşa olduysa (hemen!)
- Team member ayrıldıysa

**Nasıl:**
1. Supabase → Settings → API
2. Service key → **Reset Key**
3. Yeni key'i tüm sistemlerde güncelle:
   - n8n environment variables
   - Backend `.env`
   - CI/CD secrets

**Checklist:**
- [ ] Yeni key alındı
- [ ] n8n'de güncellendi
- [ ] Backend'de güncellendi
- [ ] Test yapıldı
- [ ] Eski key revoke edildi

---

## 📄 Örnek: Tam Kurulum

```bash
# 1. Supabase'den al
SUPABASE_URL=https://abcdefgh12345678.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoMTIzNDU2NzgiLCJyb2xlIjoic2VydmljZV9yb2xlIn0.signature
SUPABASE_BUCKET_NAME=lingroot-audio

# 2. n8n'e ekle
# Settings → Variables → Add New:
# - Name: SUPABASE_URL, Value: https://abcdefgh12345678.supabase.co
# - Name: SUPABASE_SERVICE_KEY, Value: eyJhbGci...
# - Name: SUPABASE_BUCKET_NAME, Value: lingroot-audio

# 3. Workflow'da kullan
{{ $env.SUPABASE_URL }}/storage/v1/object/{{ $env.SUPABASE_BUCKET_NAME }}/audio/file.mp3

# 4. Test et
curl https://abcdefgh12345678.supabase.co/storage/v1/object/public/lingroot-audio/audio/test.txt
```

**Hazır! ✅**
