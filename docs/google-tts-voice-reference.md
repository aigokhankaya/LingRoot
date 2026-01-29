# Google Cloud TTS — Ses Kütüphanesi Referans Dokümanı (en-US & en-GB)

> **Created:** 2026-01-29 | **Updated:** 2026-01-29 | **Version:** 1.0

Bu doküman Google Cloud Text-to-Speech API'nin en-US (Amerikan) ve en-GB (İngiliz) aksanlarındaki tüm ses modellerini kategorilere göre listeler. Yalnızca bu iki aksan kapsamındadır (AU, IN, CA gibi aksanlar dahil değildir).

---

## 1. Kategori Hiyerarşisi & Fiyatlandırma

| # | Kategori | Fiyat / 1M | Birim | Kalite Seviyesi | Durum | SSML |
|---|----------|-----------|-------|-----------------|-------|------|
| 1 | **Standard** | $4 | karakter | Temel — concatenative | GA | Tam |
| 2 | **WaveNet** | $16 | karakter | Orta — deep learning | GA | Tam |
| 3 | **Neural2** | $16 | byte | Orta-Üst — custom voice tech | GA | Tam |
| 4 | **News** | $16 | byte | Haber okuma özel | GA | Tam |
| 5 | **Casual** | $16 | byte | Günlük konuşma tarzı | GA | Tam |
| 6 | **Polyglot** | $16 | byte | Çok dilli | GA | Tam |
| 7 | **Studio** | $160 | byte | Broadcast kalite | Preview | Kısıtlı* |
| 8 | **Chirp-HD** (eski Journey) | ~$30 | karakter | Generative (LLM-based) | Preview → Kaldırılıyor | Yok |
| 9 | **Chirp3-HD** | $30 | karakter | Next-gen generative | GA | Var (Yeni) |

> \* Studio: `<mark>`, `<emphasis>`, `<prosody pitch>`, `<lang>` tag'leri desteklenmez.
>
> **Not:** Neural2 ve Studio **byte** bazında ücretlendirilir (karakter değil). İngilizce için byte ≈ karakter olsa da çok baytlı dillerde fark oluşur.

### Ücretsiz Kullanım Limitleri (Aylık)

| Kategori | Ücretsiz Limit |
|----------|---------------|
| Standard | 4.000.000 karakter |
| WaveNet | 1.000.000 karakter |
| Neural2 | 1.000.000 byte |
| Studio | 100.000 byte |
| Chirp3-HD | 1.000.000 karakter |

---

## 2. en-US (Amerikan İngilizcesi) — Tüm Sesler

### 2.1 Standard (10 ses)

| Voice ID | Cinsiyet |
|----------|----------|
| `en-US-Standard-A` | Male |
| `en-US-Standard-B` | Male |
| `en-US-Standard-C` | Female |
| `en-US-Standard-D` | Male |
| `en-US-Standard-E` | Female |
| `en-US-Standard-F` | Female |
| `en-US-Standard-G` | Female |
| `en-US-Standard-H` | Female |
| `en-US-Standard-I` | Male |
| `en-US-Standard-J` | Male |

> **Dağılım:** 5 Female, 5 Male

### 2.2 WaveNet (10 ses)

| Voice ID | Cinsiyet |
|----------|----------|
| `en-US-Wavenet-A` | Male |
| `en-US-Wavenet-B` | Male |
| `en-US-Wavenet-C` | Female |
| `en-US-Wavenet-D` | Male |
| `en-US-Wavenet-E` | Female |
| `en-US-Wavenet-F` | Female |
| `en-US-Wavenet-G` | Female |
| `en-US-Wavenet-H` | Female |
| `en-US-Wavenet-I` | Male |
| `en-US-Wavenet-J` | Male |

> **Dağılım:** 5 Female, 5 Male

### 2.3 Neural2 (9 ses)

| Voice ID | Cinsiyet |
|----------|----------|
| `en-US-Neural2-A` | Male |
| `en-US-Neural2-C` | Female |
| `en-US-Neural2-D` | Male |
| `en-US-Neural2-E` | Female |
| `en-US-Neural2-F` | Female |
| `en-US-Neural2-G` | Female |
| `en-US-Neural2-H` | Female |
| `en-US-Neural2-I` | Male |
| `en-US-Neural2-J` | Male |

> **Dağılım:** 5 Female, 4 Male
> **Not:** Neural2-B mevcut değil (Standard/WaveNet'te var ama Neural2'de atlanmış).

### 2.4 Studio (2 ses)

| Voice ID | Cinsiyet |
|----------|----------|
| `en-US-Studio-O` | Female |
| `en-US-Studio-Q` | Male |

> **Dağılım:** 1 Female, 1 Male

### 2.5 Chirp-HD / Legacy Journey (3 ses)

| Voice ID | Eski Adı (Journey) | Cinsiyet |
|----------|-------------------|----------|
| `en-US-Chirp-HD-D` | `en-US-Journey-D` | Male |
| `en-US-Chirp-HD-F` | `en-US-Journey-F` | Female |
| `en-US-Chirp-HD-O` | `en-US-Journey-O` | Female |

> **Dağılım:** 2 Female, 1 Male
> **Durum:** Preview — kaldırılma riski var. Prodüksiyon için Chirp3-HD önerilir.

### 2.6 Chirp3-HD (30 ses)

| Voice ID | Cinsiyet |
|----------|----------|
| `en-US-Chirp3-HD-Achernar` | Female |
| `en-US-Chirp3-HD-Achird` | Male |
| `en-US-Chirp3-HD-Algenib` | Male |
| `en-US-Chirp3-HD-Algieba` | Male |
| `en-US-Chirp3-HD-Alnilam` | Male |
| `en-US-Chirp3-HD-Aoede` | Female |
| `en-US-Chirp3-HD-Autonoe` | Female |
| `en-US-Chirp3-HD-Callirrhoe` | Female |
| `en-US-Chirp3-HD-Charon` | Male |
| `en-US-Chirp3-HD-Despina` | Female |
| `en-US-Chirp3-HD-Enceladus` | Male |
| `en-US-Chirp3-HD-Erinome` | Female |
| `en-US-Chirp3-HD-Fenrir` | Male |
| `en-US-Chirp3-HD-Gacrux` | Female |
| `en-US-Chirp3-HD-Iapetus` | Male |
| `en-US-Chirp3-HD-Kore` | Female |
| `en-US-Chirp3-HD-Laomedeia` | Female |
| `en-US-Chirp3-HD-Leda` | Female |
| `en-US-Chirp3-HD-Orus` | Male |
| `en-US-Chirp3-HD-Puck` | Male |
| `en-US-Chirp3-HD-Pulcherrima` | Female |
| `en-US-Chirp3-HD-Rasalgethi` | Male |
| `en-US-Chirp3-HD-Sadachbia` | Male |
| `en-US-Chirp3-HD-Sadaltager` | Male |
| `en-US-Chirp3-HD-Schedar` | Male |
| `en-US-Chirp3-HD-Sulafat` | Female |
| `en-US-Chirp3-HD-Umbriel` | Male |
| `en-US-Chirp3-HD-Vindemiatrix` | Female |
| `en-US-Chirp3-HD-Zephyr` | Female |
| `en-US-Chirp3-HD-Zubenelgenubi` | Male |

> **Dağılım:** 14 Female, 16 Male
> **İsimlendirme:** Gök cismi / mitolojik isimler (satürn uyduları, yıldızlar vb.)

### 2.7 News (3 ses)

| Voice ID | Cinsiyet |
|----------|----------|
| `en-US-News-K` | Female |
| `en-US-News-L` | Female |
| `en-US-News-N` | Male |

> **Dağılım:** 2 Female, 1 Male

### 2.8 Casual (1 ses)

| Voice ID | Cinsiyet |
|----------|----------|
| `en-US-Casual-K` | Male |

### 2.9 Polyglot (1 ses)

| Voice ID | Cinsiyet |
|----------|----------|
| `en-US-Polyglot-1` | Male |

---

## 3. en-GB (İngiliz İngilizcesi) — Tüm Sesler

### 3.1 Standard (7 ses)

| Voice ID | Cinsiyet |
|----------|----------|
| `en-GB-Standard-A` | Female |
| `en-GB-Standard-B` | Male |
| `en-GB-Standard-C` | Female |
| `en-GB-Standard-D` | Male |
| `en-GB-Standard-F` | Female |
| `en-GB-Standard-N` | Female |
| `en-GB-Standard-O` | Male |

> **Dağılım:** 4 Female, 3 Male
> **Not:** E harfi atlanmış (Standard-E mevcut değil).

### 3.2 WaveNet (7 ses)

| Voice ID | Cinsiyet |
|----------|----------|
| `en-GB-Wavenet-A` | Female |
| `en-GB-Wavenet-B` | Male |
| `en-GB-Wavenet-C` | Female |
| `en-GB-Wavenet-D` | Male |
| `en-GB-Wavenet-F` | Female |
| `en-GB-Wavenet-N` | Female |
| `en-GB-Wavenet-O` | Male |

> **Dağılım:** 4 Female, 3 Male

### 3.3 Neural2 (7 ses)

| Voice ID | Cinsiyet |
|----------|----------|
| `en-GB-Neural2-A` | Female |
| `en-GB-Neural2-B` | Male |
| `en-GB-Neural2-C` | Female |
| `en-GB-Neural2-D` | Male |
| `en-GB-Neural2-F` | Female |
| `en-GB-Neural2-N` | Female |
| `en-GB-Neural2-O` | Male |

> **Dağılım:** 4 Female, 3 Male

### 3.4 Studio (2 ses)

| Voice ID | Cinsiyet |
|----------|----------|
| `en-GB-Studio-B` | Male |
| `en-GB-Studio-C` | Female |

> **Dağılım:** 1 Female, 1 Male

### 3.5 Chirp-HD / Legacy Journey (3 ses)

| Voice ID | Eski Adı (Journey) | Cinsiyet |
|----------|-------------------|----------|
| `en-GB-Chirp-HD-D` | `en-GB-Journey-D` | Male |
| `en-GB-Chirp-HD-F` | `en-GB-Journey-F` | Female |
| `en-GB-Chirp-HD-O` | `en-GB-Journey-O` | Female |

> **Dağılım:** 2 Female, 1 Male
> **Durum:** Preview — kaldırılma riski var.

### 3.6 Chirp3-HD (30 ses)

| Voice ID | Cinsiyet |
|----------|----------|
| `en-GB-Chirp3-HD-Achernar` | Female |
| `en-GB-Chirp3-HD-Achird` | Male |
| `en-GB-Chirp3-HD-Algenib` | Male |
| `en-GB-Chirp3-HD-Algieba` | Male |
| `en-GB-Chirp3-HD-Alnilam` | Male |
| `en-GB-Chirp3-HD-Aoede` | Female |
| `en-GB-Chirp3-HD-Autonoe` | Female |
| `en-GB-Chirp3-HD-Callirrhoe` | Female |
| `en-GB-Chirp3-HD-Charon` | Male |
| `en-GB-Chirp3-HD-Despina` | Female |
| `en-GB-Chirp3-HD-Enceladus` | Male |
| `en-GB-Chirp3-HD-Erinome` | Female |
| `en-GB-Chirp3-HD-Fenrir` | Male |
| `en-GB-Chirp3-HD-Gacrux` | Female |
| `en-GB-Chirp3-HD-Iapetus` | Male |
| `en-GB-Chirp3-HD-Kore` | Female |
| `en-GB-Chirp3-HD-Laomedeia` | Female |
| `en-GB-Chirp3-HD-Leda` | Female |
| `en-GB-Chirp3-HD-Orus` | Male |
| `en-GB-Chirp3-HD-Puck` | Male |
| `en-GB-Chirp3-HD-Pulcherrima` | Female |
| `en-GB-Chirp3-HD-Rasalgethi` | Male |
| `en-GB-Chirp3-HD-Sadachbia` | Male |
| `en-GB-Chirp3-HD-Sadaltager` | Male |
| `en-GB-Chirp3-HD-Schedar` | Male |
| `en-GB-Chirp3-HD-Sulafat` | Female |
| `en-GB-Chirp3-HD-Umbriel` | Male |
| `en-GB-Chirp3-HD-Vindemiatrix` | Female |
| `en-GB-Chirp3-HD-Zephyr` | Female |
| `en-GB-Chirp3-HD-Zubenelgenubi` | Male |

> **Dağılım:** 14 Female, 16 Male
> **Not:** Chirp3-HD sesleri locale-agnostic çalışır — aynı 30 speaker hem en-US hem en-GB'de mevcuttur. Aksanı locale prefix belirler.

### 3.7 News (7 ses)

| Voice ID | Cinsiyet |
|----------|----------|
| `en-GB-News-G` | Female |
| `en-GB-News-H` | Female |
| `en-GB-News-I` | Female |
| `en-GB-News-J` | Male |
| `en-GB-News-K` | Male |
| `en-GB-News-L` | Male |
| `en-GB-News-M` | Male |

> **Dağılım:** 3 Female, 4 Male

---

## 4. Journey → Chirp-HD → Chirp3-HD Geçiş Notu

### Kronoloji

1. **Journey** (2023–2024): Google'ın ilk LLM tabanlı TTS sesleri. `en-US-Journey-D`, `en-US-Journey-F` ile başladı, sonra `Journey-O` eklendi.
2. **Chirp-HD** (2024): Journey seslerinin rebrand'i. `Journey-D` → `Chirp-HD-D`, `Journey-F` → `Chirp-HD-F`, `Journey-O` → `Chirp-HD-O`. Hâlâ Preview statüsünde.
3. **Chirp3-HD** (2025): Yeni nesil. 30 farklı speaker stili, gök cismi isimleriyle. GA statüsünde. SSML desteği, pace/pause kontrolleri eklendi.

### Geçiş Mapping'i

| Journey (eski) | Chirp-HD (ara) | Chirp3-HD (yeni — önerilen alternatif) |
|---------------|----------------|---------------------------------------|
| `en-US-Journey-D` | `en-US-Chirp-HD-D` | `en-US-Chirp3-HD-Charon` (M) veya diğer Male seçenekler |
| `en-US-Journey-F` | `en-US-Chirp-HD-F` | `en-US-Chirp3-HD-Leda` (F) veya diğer Female seçenekler |
| `en-US-Journey-O` | `en-US-Chirp-HD-O` | `en-US-Chirp3-HD-Kore` (F) veya diğer Female seçenekler |
| `en-GB-Journey-D` | `en-GB-Chirp-HD-D` | `en-GB-Chirp3-HD-Charon` (M) veya diğer Male seçenekler |
| `en-GB-Journey-F` | `en-GB-Chirp-HD-F` | `en-GB-Chirp3-HD-Leda` (F) veya diğer Female seçenekler |
| `en-GB-Journey-O` | `en-GB-Chirp-HD-O` | `en-GB-Chirp3-HD-Kore` (F) veya diğer Female seçenekler |

### Öneriler

- **Prodüksiyon:** Chirp3-HD kullanın (GA, aktif geliştirme altında)
- **Chirp-HD:** Preview durumunda, dokümanlardan kaldırılma işaretleri var. Yeni projelerde tercih etmeyin.
- **Journey:** Eski isimlendirme. API'da hâlâ çalışabilir ama resmen desteklenmemekte.

---

## 5. Özet İstatistik Tablosu

### en-US Toplam Ses Sayıları

| Kategori | Female | Male | Toplam |
|----------|--------|------|--------|
| Standard | 5 | 5 | **10** |
| WaveNet | 5 | 5 | **10** |
| Neural2 | 5 | 4 | **9** |
| Studio | 1 | 1 | **2** |
| Chirp-HD (legacy) | 2 | 1 | **3** |
| Chirp3-HD | 14 | 16 | **30** |
| News | 2 | 1 | **3** |
| Casual | 0 | 1 | **1** |
| Polyglot | 0 | 1 | **1** |
| **TOPLAM** | **34** | **35** | **69** |

### en-GB Toplam Ses Sayıları

| Kategori | Female | Male | Toplam |
|----------|--------|------|--------|
| Standard | 4 | 3 | **7** |
| WaveNet | 4 | 3 | **7** |
| Neural2 | 4 | 3 | **7** |
| Studio | 1 | 1 | **2** |
| Chirp-HD (legacy) | 2 | 1 | **3** |
| Chirp3-HD | 14 | 16 | **30** |
| News | 3 | 4 | **7** |
| **TOPLAM** | **32** | **31** | **63** |

### Genel Toplam (en-US + en-GB)

| Metrik | Değer |
|--------|-------|
| Toplam benzersiz voice ID | **132** |
| Chirp-HD dahil (legacy) | **+6** = 138 |
| en-US toplam | 69 |
| en-GB toplam | 63 |

> **Not:** Chirp3-HD'nin 30 speaker'ı her iki locale'de de aynı isimlerle mevcuttur. Teknik olarak aynı model farklı aksanla konuşur.

---

## 6. Kaynaklar

- [Supported voices and languages — Google Cloud Docs](https://docs.cloud.google.com/text-to-speech/docs/list-voices-and-types)
- [Chirp 3: HD voices — Google Cloud Docs](https://docs.cloud.google.com/text-to-speech/docs/chirp3-hd)
- [Text-to-Speech Pricing — Google Cloud](https://cloud.google.com/text-to-speech/pricing)
- [Release Notes — Google Cloud TTS](https://docs.cloud.google.com/text-to-speech/docs/release-notes)
- [Chirp-HD Deprecation Discussion — Google Dev Forum](https://discuss.google.dev/t/is-chirp-hd-voice-being-deprecated/242561)
