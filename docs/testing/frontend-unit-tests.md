# Frontend Unit Tests Documentation

> **Oluşturulma:** 2026-01-25 | **Güncelleme:** 2026-01-25 | **Versiyon:** 1.0

Bu doküman, frontend bileşenleri için yazılan unit testlerin kapsamını ve detaylarını içerir.

## Test Altyapısı
- **Framework:** Jest
- **Library:** React Testing Library
- **Runner:** `npm test`

## Kapsanan Bileşenler

### 1. PersonalizedForYouSection
**Dosya:** `src/components/content/PersonalizedForYouSection.tsx`
**Test Dosyası:** `src/components/content/__tests__/PersonalizedForYouSection.test.tsx`

#### Test Senaryoları
| Kategori | Senaryo | Beklenen Davranış |
|----------|---------|-------------------|
| **Rendering** | Loading State | Skeleton loader gösterilmeli |
| | Success State | Önerilen kartlar render edilmeli |
| | Empty State | Bileşen `null` dönmeli |
| | Error State | Bileşen `null` dönmeli |
| | Props Control | `showTitle`, `showFilters` vb. prop'lara göre UI güncellenmeli |
| **API** | Missing Token | İstek atılmamalı |
| | Refresh | `refresh=true` parametresi ile istek atılmalı |
| | Unmount | Bekleyen istekler iptal edilmeli (AbortController) |
| **Filtering** | Chip Select | Sadece seçilen kategorideki kartlar gösterilmeli |
| | Clear Filters | "Tümü" seçildiğinde filtreler temizlenmeli |
| | Persistence | Filtre tercihleri `localStorage`'a kaydedilmeli |
| **Interactions** | Card Click | Topic ise audio çalmalı, değilse URL'e gitmeli |
| | Dismiss | Kart listeden silinmeli ve API'ye bildirim gitmeli |
| | Expand Info | "Neden önerildi" paneli açılıp kapanmalı |
| **Race Conditions** | Rapid Clicks | Sadece son tıklamanın sonucu işlenmeli |
| | Unmount Update | Bileşen unmount olduktan sonra state update yapılmamalı |
| **Accessibility** | ARIA Labels | Filtre butonları ve kartlar uygun etiketlere sahip olmalı |
| | Keyboard Nav | Tab ile tüm interaktif elemanlara erişilmeli |
| | ARIA States | `aria-pressed`, `aria-expanded`, `aria-busy` doğru yönetilmeli |

## Test Nasıl Çalıştırılır?

Tüm testleri çalıştırmak için:
```bash
npm test
```

Sadece bu bileşenin testlerini çalıştırmak için:
```bash
npm test PersonalizedForYouSection
```

Coverage raporu almak için:
```bash
npm run test:coverage
```
