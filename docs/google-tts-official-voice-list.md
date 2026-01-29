# Google Cloud TTS — Resmi İngilizce Ses Listesi (Tüm Locale'ler)

> **Created:** 2026-01-29 | **Updated:** 2026-01-29 | **Version:** 1.0

Bu doküman Google Cloud Text-to-Speech API'nin **tüm İngilizce locale'lerindeki** (en-US, en-GB, en-AU, en-IN) sesleri resmi dokümanasyondan birebir listelemektedir.

**Kaynak:** [Supported voices and languages — Google Cloud Docs](https://docs.google.com/text-to-speech/docs/voices)

---

## Voice Type Sınıflandırma Kuralı

Google'ın resmi tablosu sesleri sadece Standard / Premium / Studio olarak gruplar. Bu dokümanda **voice name'den parse edilen gerçek model tipi** kullanılmaktadır:

| Voice Name Pattern | Doküman Voice Type |
|---|---|
| `en-XX-Standard-*` | **Standard** |
| `en-XX-Wavenet-*` | **WaveNet** |
| `en-XX-Neural2-*` | **Neural2** |
| `en-XX-News-*` | **News** |
| `en-XX-Casual-*` | **Casual** |
| `en-XX-Polyglot-*` | **Polyglot** |
| `en-XX-Studio-*` | **Studio** |
| `en-XX-Chirp-HD-*` | **Chirp-HD** |
| `en-XX-Chirp3-HD-*` | **Chirp3-HD** |
| `Achernar`, `Charon` vb. (locale prefix yok) | **Chirp3-HD (Speaker)** |

> **Not:** en-US locale'inde Chirp3-HD sesleri Google dokümanında locale prefix'siz listelenir (örn. sadece "Achernar"). API çağrısında `languageCode: "en-US"` parametresiyle kullanılır. Diğer locale'lerde `en-GB-Chirp3-HD-Achernar` formatında listelenir.

---

## 1. en-US — Amerikan İngilizcesi (69 ses)

### 1.1 Standard (10 ses)

| Voice Name | Voice Type | SSML Gender |
|---|---|---|
| `en-US-Standard-A` | Standard | MALE |
| `en-US-Standard-B` | Standard | MALE |
| `en-US-Standard-C` | Standard | FEMALE |
| `en-US-Standard-D` | Standard | MALE |
| `en-US-Standard-E` | Standard | FEMALE |
| `en-US-Standard-F` | Standard | FEMALE |
| `en-US-Standard-G` | Standard | FEMALE |
| `en-US-Standard-H` | Standard | FEMALE |
| `en-US-Standard-I` | Standard | MALE |
| `en-US-Standard-J` | Standard | MALE |

### 1.2 WaveNet (10 ses)

| Voice Name | Voice Type | SSML Gender |
|---|---|---|
| `en-US-Wavenet-A` | WaveNet | MALE |
| `en-US-Wavenet-B` | WaveNet | MALE |
| `en-US-Wavenet-C` | WaveNet | FEMALE |
| `en-US-Wavenet-D` | WaveNet | MALE |
| `en-US-Wavenet-E` | WaveNet | FEMALE |
| `en-US-Wavenet-F` | WaveNet | FEMALE |
| `en-US-Wavenet-G` | WaveNet | FEMALE |
| `en-US-Wavenet-H` | WaveNet | FEMALE |
| `en-US-Wavenet-I` | WaveNet | MALE |
| `en-US-Wavenet-J` | WaveNet | MALE |

### 1.3 Neural2 (9 ses)

| Voice Name | Voice Type | SSML Gender |
|---|---|---|
| `en-US-Neural2-A` | Neural2 | MALE |
| `en-US-Neural2-C` | Neural2 | FEMALE |
| `en-US-Neural2-D` | Neural2 | MALE |
| `en-US-Neural2-E` | Neural2 | FEMALE |
| `en-US-Neural2-F` | Neural2 | FEMALE |
| `en-US-Neural2-G` | Neural2 | FEMALE |
| `en-US-Neural2-H` | Neural2 | FEMALE |
| `en-US-Neural2-I` | Neural2 | MALE |
| `en-US-Neural2-J` | Neural2 | MALE |

> **Not:** Neural2-B mevcut degil (Standard/WaveNet'te var ama Neural2'de atlanmis).

### 1.4 News (3 ses)

| Voice Name | Voice Type | SSML Gender |
|---|---|---|
| `en-US-News-K` | News | FEMALE |
| `en-US-News-L` | News | FEMALE |
| `en-US-News-N` | News | MALE |

### 1.5 Casual (1 ses)

| Voice Name | Voice Type | SSML Gender |
|---|---|---|
| `en-US-Casual-K` | Casual | MALE |

### 1.6 Polyglot (1 ses)

| Voice Name | Voice Type | SSML Gender |
|---|---|---|
| `en-US-Polyglot-1` | Polyglot | MALE |

### 1.7 Studio (2 ses)

| Voice Name | Voice Type | SSML Gender |
|---|---|---|
| `en-US-Studio-O` | Studio | FEMALE |
| `en-US-Studio-Q` | Studio | MALE |

### 1.8 Chirp-HD (3 ses)

| Voice Name | Voice Type | SSML Gender |
|---|---|---|
| `en-US-Chirp-HD-D` | Chirp-HD | MALE |
| `en-US-Chirp-HD-F` | Chirp-HD | FEMALE |
| `en-US-Chirp-HD-O` | Chirp-HD | FEMALE |

> **Durum:** Preview — kaldirma riski var. Produksiyon icin Chirp3-HD onerilir.

### 1.9 Chirp3-HD Speaker (30 ses)

> Google dokümanında en-US Chirp3-HD sesleri locale prefix'siz listelenir. API'da `languageCode: "en-US"` ile kullanilir.

| Voice Name (Dokümandaki) | Tam API Voice Name | Voice Type | SSML Gender |
|---|---|---|---|
| `Achernar` | `en-US-Chirp3-HD-Achernar` | Chirp3-HD | FEMALE |
| `Achird` | `en-US-Chirp3-HD-Achird` | Chirp3-HD | MALE |
| `Algenib` | `en-US-Chirp3-HD-Algenib` | Chirp3-HD | MALE |
| `Algieba` | `en-US-Chirp3-HD-Algieba` | Chirp3-HD | MALE |
| `Alnilam` | `en-US-Chirp3-HD-Alnilam` | Chirp3-HD | MALE |
| `Aoede` | `en-US-Chirp3-HD-Aoede` | Chirp3-HD | FEMALE |
| `Autonoe` | `en-US-Chirp3-HD-Autonoe` | Chirp3-HD | FEMALE |
| `Callirrhoe` | `en-US-Chirp3-HD-Callirrhoe` | Chirp3-HD | FEMALE |
| `Charon` | `en-US-Chirp3-HD-Charon` | Chirp3-HD | MALE |
| `Despina` | `en-US-Chirp3-HD-Despina` | Chirp3-HD | FEMALE |
| `Enceladus` | `en-US-Chirp3-HD-Enceladus` | Chirp3-HD | MALE |
| `Erinome` | `en-US-Chirp3-HD-Erinome` | Chirp3-HD | FEMALE |
| `Fenrir` | `en-US-Chirp3-HD-Fenrir` | Chirp3-HD | MALE |
| `Gacrux` | `en-US-Chirp3-HD-Gacrux` | Chirp3-HD | FEMALE |
| `Iapetus` | `en-US-Chirp3-HD-Iapetus` | Chirp3-HD | MALE |
| `Kore` | `en-US-Chirp3-HD-Kore` | Chirp3-HD | FEMALE |
| `Laomedeia` | `en-US-Chirp3-HD-Laomedeia` | Chirp3-HD | FEMALE |
| `Leda` | `en-US-Chirp3-HD-Leda` | Chirp3-HD | FEMALE |
| `Orus` | `en-US-Chirp3-HD-Orus` | Chirp3-HD | MALE |
| `Puck` | `en-US-Chirp3-HD-Puck` | Chirp3-HD | MALE |
| `Pulcherrima` | `en-US-Chirp3-HD-Pulcherrima` | Chirp3-HD | FEMALE |
| `Rasalgethi` | `en-US-Chirp3-HD-Rasalgethi` | Chirp3-HD | MALE |
| `Sadachbia` | `en-US-Chirp3-HD-Sadachbia` | Chirp3-HD | MALE |
| `Sadaltager` | `en-US-Chirp3-HD-Sadaltager` | Chirp3-HD | MALE |
| `Schedar` | `en-US-Chirp3-HD-Schedar` | Chirp3-HD | MALE |
| `Sulafat` | `en-US-Chirp3-HD-Sulafat` | Chirp3-HD | FEMALE |
| `Umbriel` | `en-US-Chirp3-HD-Umbriel` | Chirp3-HD | MALE |
| `Vindemiatrix` | `en-US-Chirp3-HD-Vindemiatrix` | Chirp3-HD | FEMALE |
| `Zephyr` | `en-US-Chirp3-HD-Zephyr` | Chirp3-HD | FEMALE |
| `Zubenelgenubi` | `en-US-Chirp3-HD-Zubenelgenubi` | Chirp3-HD | MALE |

> **Dagilim:** 14 Female, 16 Male | **Isimlendirme:** Gok cismi / mitolojik isimler

---

## 2. en-GB — Ingiliz Ingilizcesi (63 ses)

### 2.1 Standard (7 ses)

| Voice Name | Voice Type | SSML Gender |
|---|---|---|
| `en-GB-Standard-A` | Standard | FEMALE |
| `en-GB-Standard-B` | Standard | MALE |
| `en-GB-Standard-C` | Standard | FEMALE |
| `en-GB-Standard-D` | Standard | MALE |
| `en-GB-Standard-F` | Standard | FEMALE |
| `en-GB-Standard-N` | Standard | FEMALE |
| `en-GB-Standard-O` | Standard | MALE |

> **Not:** E harfi atlanmis (Standard-E mevcut degil).

### 2.2 WaveNet (7 ses)

| Voice Name | Voice Type | SSML Gender |
|---|---|---|
| `en-GB-Wavenet-A` | WaveNet | FEMALE |
| `en-GB-Wavenet-B` | WaveNet | MALE |
| `en-GB-Wavenet-C` | WaveNet | FEMALE |
| `en-GB-Wavenet-D` | WaveNet | MALE |
| `en-GB-Wavenet-F` | WaveNet | FEMALE |
| `en-GB-Wavenet-N` | WaveNet | FEMALE |
| `en-GB-Wavenet-O` | WaveNet | MALE |

### 2.3 Neural2 (7 ses)

| Voice Name | Voice Type | SSML Gender |
|---|---|---|
| `en-GB-Neural2-A` | Neural2 | FEMALE |
| `en-GB-Neural2-B` | Neural2 | MALE |
| `en-GB-Neural2-C` | Neural2 | FEMALE |
| `en-GB-Neural2-D` | Neural2 | MALE |
| `en-GB-Neural2-F` | Neural2 | FEMALE |
| `en-GB-Neural2-N` | Neural2 | FEMALE |
| `en-GB-Neural2-O` | Neural2 | MALE |

### 2.4 News (7 ses)

| Voice Name | Voice Type | SSML Gender |
|---|---|---|
| `en-GB-News-G` | News | FEMALE |
| `en-GB-News-H` | News | FEMALE |
| `en-GB-News-I` | News | FEMALE |
| `en-GB-News-J` | News | MALE |
| `en-GB-News-K` | News | MALE |
| `en-GB-News-L` | News | MALE |
| `en-GB-News-M` | News | MALE |

### 2.5 Studio (2 ses)

| Voice Name | Voice Type | SSML Gender |
|---|---|---|
| `en-GB-Studio-B` | Studio | MALE |
| `en-GB-Studio-C` | Studio | FEMALE |

### 2.6 Chirp-HD (3 ses)

| Voice Name | Voice Type | SSML Gender |
|---|---|---|
| `en-GB-Chirp-HD-D` | Chirp-HD | MALE |
| `en-GB-Chirp-HD-F` | Chirp-HD | FEMALE |
| `en-GB-Chirp-HD-O` | Chirp-HD | FEMALE |

> **Durum:** Preview — kaldirma riski var.

### 2.7 Chirp3-HD (30 ses)

| Voice Name | Voice Type | SSML Gender |
|---|---|---|
| `en-GB-Chirp3-HD-Achernar` | Chirp3-HD | FEMALE |
| `en-GB-Chirp3-HD-Achird` | Chirp3-HD | MALE |
| `en-GB-Chirp3-HD-Algenib` | Chirp3-HD | MALE |
| `en-GB-Chirp3-HD-Algieba` | Chirp3-HD | MALE |
| `en-GB-Chirp3-HD-Alnilam` | Chirp3-HD | MALE |
| `en-GB-Chirp3-HD-Aoede` | Chirp3-HD | FEMALE |
| `en-GB-Chirp3-HD-Autonoe` | Chirp3-HD | FEMALE |
| `en-GB-Chirp3-HD-Callirrhoe` | Chirp3-HD | FEMALE |
| `en-GB-Chirp3-HD-Charon` | Chirp3-HD | MALE |
| `en-GB-Chirp3-HD-Despina` | Chirp3-HD | FEMALE |
| `en-GB-Chirp3-HD-Enceladus` | Chirp3-HD | MALE |
| `en-GB-Chirp3-HD-Erinome` | Chirp3-HD | FEMALE |
| `en-GB-Chirp3-HD-Fenrir` | Chirp3-HD | MALE |
| `en-GB-Chirp3-HD-Gacrux` | Chirp3-HD | FEMALE |
| `en-GB-Chirp3-HD-Iapetus` | Chirp3-HD | MALE |
| `en-GB-Chirp3-HD-Kore` | Chirp3-HD | FEMALE |
| `en-GB-Chirp3-HD-Laomedeia` | Chirp3-HD | FEMALE |
| `en-GB-Chirp3-HD-Leda` | Chirp3-HD | FEMALE |
| `en-GB-Chirp3-HD-Orus` | Chirp3-HD | MALE |
| `en-GB-Chirp3-HD-Puck` | Chirp3-HD | MALE |
| `en-GB-Chirp3-HD-Pulcherrima` | Chirp3-HD | FEMALE |
| `en-GB-Chirp3-HD-Rasalgethi` | Chirp3-HD | MALE |
| `en-GB-Chirp3-HD-Sadachbia` | Chirp3-HD | MALE |
| `en-GB-Chirp3-HD-Sadaltager` | Chirp3-HD | MALE |
| `en-GB-Chirp3-HD-Schedar` | Chirp3-HD | MALE |
| `en-GB-Chirp3-HD-Sulafat` | Chirp3-HD | FEMALE |
| `en-GB-Chirp3-HD-Umbriel` | Chirp3-HD | MALE |
| `en-GB-Chirp3-HD-Vindemiatrix` | Chirp3-HD | FEMALE |
| `en-GB-Chirp3-HD-Zephyr` | Chirp3-HD | FEMALE |
| `en-GB-Chirp3-HD-Zubenelgenubi` | Chirp3-HD | MALE |

> **Dagilim:** 14 Female, 16 Male

---

## 3. en-AU — Avustralya Ingilizcesi (49 ses)

### 3.1 Standard (4 ses)

| Voice Name | Voice Type | SSML Gender |
|---|---|---|
| `en-AU-Standard-A` | Standard | FEMALE |
| `en-AU-Standard-B` | Standard | MALE |
| `en-AU-Standard-C` | Standard | FEMALE |
| `en-AU-Standard-D` | Standard | MALE |

### 3.2 WaveNet (4 ses)

| Voice Name | Voice Type | SSML Gender |
|---|---|---|
| `en-AU-Wavenet-A` | WaveNet | FEMALE |
| `en-AU-Wavenet-B` | WaveNet | MALE |
| `en-AU-Wavenet-C` | WaveNet | FEMALE |
| `en-AU-Wavenet-D` | WaveNet | MALE |

### 3.3 Neural2 (4 ses)

| Voice Name | Voice Type | SSML Gender |
|---|---|---|
| `en-AU-Neural2-A` | Neural2 | FEMALE |
| `en-AU-Neural2-B` | Neural2 | MALE |
| `en-AU-Neural2-C` | Neural2 | FEMALE |
| `en-AU-Neural2-D` | Neural2 | MALE |

### 3.4 News (3 ses)

| Voice Name | Voice Type | SSML Gender |
|---|---|---|
| `en-AU-News-E` | News | FEMALE |
| `en-AU-News-F` | News | FEMALE |
| `en-AU-News-G` | News | MALE |

### 3.5 Polyglot (1 ses)

| Voice Name | Voice Type | SSML Gender |
|---|---|---|
| `en-AU-Polyglot-1` | Polyglot | MALE |

### 3.6 Chirp-HD (3 ses)

| Voice Name | Voice Type | SSML Gender |
|---|---|---|
| `en-AU-Chirp-HD-D` | Chirp-HD | MALE |
| `en-AU-Chirp-HD-F` | Chirp-HD | FEMALE |
| `en-AU-Chirp-HD-O` | Chirp-HD | FEMALE |

> **Durum:** Preview — kaldirma riski var.

### 3.7 Chirp3-HD (30 ses)

| Voice Name | Voice Type | SSML Gender |
|---|---|---|
| `en-AU-Chirp3-HD-Achernar` | Chirp3-HD | FEMALE |
| `en-AU-Chirp3-HD-Achird` | Chirp3-HD | MALE |
| `en-AU-Chirp3-HD-Algenib` | Chirp3-HD | MALE |
| `en-AU-Chirp3-HD-Algieba` | Chirp3-HD | MALE |
| `en-AU-Chirp3-HD-Alnilam` | Chirp3-HD | MALE |
| `en-AU-Chirp3-HD-Aoede` | Chirp3-HD | FEMALE |
| `en-AU-Chirp3-HD-Autonoe` | Chirp3-HD | FEMALE |
| `en-AU-Chirp3-HD-Callirrhoe` | Chirp3-HD | FEMALE |
| `en-AU-Chirp3-HD-Charon` | Chirp3-HD | MALE |
| `en-AU-Chirp3-HD-Despina` | Chirp3-HD | FEMALE |
| `en-AU-Chirp3-HD-Enceladus` | Chirp3-HD | MALE |
| `en-AU-Chirp3-HD-Erinome` | Chirp3-HD | FEMALE |
| `en-AU-Chirp3-HD-Fenrir` | Chirp3-HD | MALE |
| `en-AU-Chirp3-HD-Gacrux` | Chirp3-HD | FEMALE |
| `en-AU-Chirp3-HD-Iapetus` | Chirp3-HD | MALE |
| `en-AU-Chirp3-HD-Kore` | Chirp3-HD | FEMALE |
| `en-AU-Chirp3-HD-Laomedeia` | Chirp3-HD | FEMALE |
| `en-AU-Chirp3-HD-Leda` | Chirp3-HD | FEMALE |
| `en-AU-Chirp3-HD-Orus` | Chirp3-HD | MALE |
| `en-AU-Chirp3-HD-Puck` | Chirp3-HD | MALE |
| `en-AU-Chirp3-HD-Pulcherrima` | Chirp3-HD | FEMALE |
| `en-AU-Chirp3-HD-Rasalgethi` | Chirp3-HD | MALE |
| `en-AU-Chirp3-HD-Sadachbia` | Chirp3-HD | MALE |
| `en-AU-Chirp3-HD-Sadaltager` | Chirp3-HD | MALE |
| `en-AU-Chirp3-HD-Schedar` | Chirp3-HD | MALE |
| `en-AU-Chirp3-HD-Sulafat` | Chirp3-HD | FEMALE |
| `en-AU-Chirp3-HD-Umbriel` | Chirp3-HD | MALE |
| `en-AU-Chirp3-HD-Vindemiatrix` | Chirp3-HD | FEMALE |
| `en-AU-Chirp3-HD-Zephyr` | Chirp3-HD | FEMALE |
| `en-AU-Chirp3-HD-Zubenelgenubi` | Chirp3-HD | MALE |

> **Dagilim:** 14 Female, 16 Male

---

## 4. en-IN — Hint Ingilizcesi (49 ses)

### 4.1 Standard (6 ses)

| Voice Name | Voice Type | SSML Gender |
|---|---|---|
| `en-IN-Standard-A` | Standard | FEMALE |
| `en-IN-Standard-B` | Standard | MALE |
| `en-IN-Standard-C` | Standard | MALE |
| `en-IN-Standard-D` | Standard | FEMALE |
| `en-IN-Standard-E` | Standard | FEMALE |
| `en-IN-Standard-F` | Standard | MALE |

### 4.2 WaveNet (6 ses)

| Voice Name | Voice Type | SSML Gender |
|---|---|---|
| `en-IN-Wavenet-A` | WaveNet | FEMALE |
| `en-IN-Wavenet-B` | WaveNet | MALE |
| `en-IN-Wavenet-C` | WaveNet | MALE |
| `en-IN-Wavenet-D` | WaveNet | FEMALE |
| `en-IN-Wavenet-E` | WaveNet | FEMALE |
| `en-IN-Wavenet-F` | WaveNet | MALE |

### 4.3 Neural2 (4 ses)

| Voice Name | Voice Type | SSML Gender |
|---|---|---|
| `en-IN-Neural2-A` | Neural2 | FEMALE |
| `en-IN-Neural2-B` | Neural2 | MALE |
| `en-IN-Neural2-C` | Neural2 | MALE |
| `en-IN-Neural2-D` | Neural2 | FEMALE |

### 4.4 Chirp-HD (3 ses)

| Voice Name | Voice Type | SSML Gender |
|---|---|---|
| `en-IN-Chirp-HD-D` | Chirp-HD | MALE |
| `en-IN-Chirp-HD-F` | Chirp-HD | FEMALE |
| `en-IN-Chirp-HD-O` | Chirp-HD | FEMALE |

> **Durum:** Preview — kaldirma riski var.

### 4.5 Chirp3-HD (30 ses)

| Voice Name | Voice Type | SSML Gender |
|---|---|---|
| `en-IN-Chirp3-HD-Achernar` | Chirp3-HD | FEMALE |
| `en-IN-Chirp3-HD-Achird` | Chirp3-HD | MALE |
| `en-IN-Chirp3-HD-Algenib` | Chirp3-HD | MALE |
| `en-IN-Chirp3-HD-Algieba` | Chirp3-HD | MALE |
| `en-IN-Chirp3-HD-Alnilam` | Chirp3-HD | MALE |
| `en-IN-Chirp3-HD-Aoede` | Chirp3-HD | FEMALE |
| `en-IN-Chirp3-HD-Autonoe` | Chirp3-HD | FEMALE |
| `en-IN-Chirp3-HD-Callirrhoe` | Chirp3-HD | FEMALE |
| `en-IN-Chirp3-HD-Charon` | Chirp3-HD | MALE |
| `en-IN-Chirp3-HD-Despina` | Chirp3-HD | FEMALE |
| `en-IN-Chirp3-HD-Enceladus` | Chirp3-HD | MALE |
| `en-IN-Chirp3-HD-Erinome` | Chirp3-HD | FEMALE |
| `en-IN-Chirp3-HD-Fenrir` | Chirp3-HD | MALE |
| `en-IN-Chirp3-HD-Gacrux` | Chirp3-HD | FEMALE |
| `en-IN-Chirp3-HD-Iapetus` | Chirp3-HD | MALE |
| `en-IN-Chirp3-HD-Kore` | Chirp3-HD | FEMALE |
| `en-IN-Chirp3-HD-Laomedeia` | Chirp3-HD | FEMALE |
| `en-IN-Chirp3-HD-Leda` | Chirp3-HD | FEMALE |
| `en-IN-Chirp3-HD-Orus` | Chirp3-HD | MALE |
| `en-IN-Chirp3-HD-Puck` | Chirp3-HD | MALE |
| `en-IN-Chirp3-HD-Pulcherrima` | Chirp3-HD | FEMALE |
| `en-IN-Chirp3-HD-Rasalgethi` | Chirp3-HD | MALE |
| `en-IN-Chirp3-HD-Sadachbia` | Chirp3-HD | MALE |
| `en-IN-Chirp3-HD-Sadaltager` | Chirp3-HD | MALE |
| `en-IN-Chirp3-HD-Schedar` | Chirp3-HD | MALE |
| `en-IN-Chirp3-HD-Sulafat` | Chirp3-HD | FEMALE |
| `en-IN-Chirp3-HD-Umbriel` | Chirp3-HD | MALE |
| `en-IN-Chirp3-HD-Vindemiatrix` | Chirp3-HD | FEMALE |
| `en-IN-Chirp3-HD-Zephyr` | Chirp3-HD | FEMALE |
| `en-IN-Chirp3-HD-Zubenelgenubi` | Chirp3-HD | MALE |

> **Dagilim:** 14 Female, 16 Male

---

## 5. Ozet Istatistikler

### Locale Bazinda Ses Sayilari

| Locale | Standard | WaveNet | Neural2 | News | Casual | Polyglot | Studio | Chirp-HD | Chirp3-HD | **Toplam** |
|---|---|---|---|---|---|---|---|---|---|---|
| en-US | 10 | 10 | 9 | 3 | 1 | 1 | 2 | 3 | 30 | **69** |
| en-GB | 7 | 7 | 7 | 7 | — | — | 2 | 3 | 30 | **63** |
| en-AU | 4 | 4 | 4 | 3 | — | 1 | — | 3 | 30 | **49** |
| en-IN | 6 | 6 | 4 | — | — | — | — | 3 | 30 | **49** |
| **Toplam** | **27** | **27** | **24** | **13** | **1** | **2** | **4** | **12** | **120** | **230** |

### Voice Type Bazinda Cinsiyet Dagilimi (Tum Locale'ler)

| Voice Type | Female | Male | Toplam |
|---|---|---|---|
| Standard | 14 | 13 | **27** |
| WaveNet | 14 | 13 | **27** |
| Neural2 | 13 | 11 | **24** |
| News | 7 | 6 | **13** |
| Casual | 0 | 1 | **1** |
| Polyglot | 0 | 2 | **2** |
| Studio | 2 | 2 | **4** |
| Chirp-HD | 8 | 4 | **12** |
| Chirp3-HD | 56 | 64 | **120** |
| **Toplam** | **114** | **116** | **230** |

### Locale'e Ozel Notlar

| Locale | Not |
|---|---|
| en-US | En genis ses yelpazesi: tek locale ile Casual ve News/Polyglot/Studio mevcut |
| en-GB | News kategorisinde 7 ses ile en zengin locale |
| en-AU | News (3) + Polyglot (1) mevcut, Studio yok |
| en-IN | Sadece Standard/WaveNet/Neural2/Chirp-HD/Chirp3-HD — News, Casual, Polyglot, Studio yok |

### Chirp3-HD Speaker Listesi (30 Ortak Ses)

Ayni 30 Chirp3-HD speaker tum 4 locale'de mevcuttur. Aksani locale prefix belirler.

| Speaker | SSML Gender |
|---|---|
| Achernar | FEMALE |
| Achird | MALE |
| Algenib | MALE |
| Algieba | MALE |
| Alnilam | MALE |
| Aoede | FEMALE |
| Autonoe | FEMALE |
| Callirrhoe | FEMALE |
| Charon | MALE |
| Despina | FEMALE |
| Enceladus | MALE |
| Erinome | FEMALE |
| Fenrir | MALE |
| Gacrux | FEMALE |
| Iapetus | MALE |
| Kore | FEMALE |
| Laomedeia | FEMALE |
| Leda | FEMALE |
| Orus | MALE |
| Puck | MALE |
| Pulcherrima | FEMALE |
| Rasalgethi | MALE |
| Sadachbia | MALE |
| Sadaltager | MALE |
| Schedar | MALE |
| Sulafat | FEMALE |
| Umbriel | MALE |
| Vindemiatrix | FEMALE |
| Zephyr | FEMALE |
| Zubenelgenubi | MALE |

> **Dagilim:** 14 Female, 16 Male | **Isimlendirme:** Gok cismi / mitolojik / astronomik isimler

---

## 6. Kaynaklar

- [Supported voices and languages — Google Cloud Docs](https://docs.google.com/text-to-speech/docs/voices)
- [List voices and types — Google Cloud Docs](https://docs.cloud.google.com/text-to-speech/docs/list-voices-and-types)
- [Chirp 3: HD voices — Google Cloud Docs](https://docs.cloud.google.com/text-to-speech/docs/chirp3-hd)
- [Text-to-Speech Pricing — Google Cloud](https://cloud.google.com/text-to-speech/pricing)
