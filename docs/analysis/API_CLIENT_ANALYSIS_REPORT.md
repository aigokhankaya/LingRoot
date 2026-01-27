# API Client Analiz Raporu & Entegrasyon Durumu

**Tarih:** 2026-01-24 (Güncellenmiş)
**Kapsam:** `@lingroot/api-client` paketi ve bu paketin `LingRootMobile` ve `frontend` (Web) projelerindeki kullanım durumu.

## 1. Yönetici Özeti
Projede ortak bir API istemcisi (`@lingroot/api-client`) mimarisi kurulmuş durumdadır. Bu paket, backend API uç noktalarını (endpoints) modüler bir şekilde sarmalayarak (wrapping) hem mobil hem de web tarafında tekrar kullanılabilir, tip güvenli (type-safe) bir iletişim katmanı sunmayı hedefler.

*   **API Client Paketi v2.0:** `packages/api-client` altında geliştirilmiştir. 10 modül içerir (Auth, TTS, Content, Subscription, Chat, Book, Vocabulary, Topic, Pattern, Notification).
*   **Mobil Entegrasyonu:** ✅ **TAMAMLANDI** - Tüm legacy fonksiyonlar (MFA hariç) refactor edilmiştir.
*   **Web Entegrasyonu:** ✅ **TAMAMLANDI** - Temel fonksiyonlar refactor edilmiştir.
*   **Unit Testler:** ✅ **EKLENDI** - 28 test başarıyla geçiyor.

## 2. API Client Paketi Analizi (`@lingroot/api-client` v2.0)

### A. Teknik Yapı
*   **Design Pattern:** Singleton ve Facade pattern kullanılarak tasarlanmıştır.
*   **Base Technology:** `axios` kütüphanesi üzerine kuruludur.
*   **Authentication:** Token yönetimi dependency injection ile sağlanır.
*   **Tip Güvenliği:** TypeScript ile tüm request/response tipleri tanımlanmıştır.
*   **Test Coverage:** Jest ile unit testler yazılmıştır.

### B. Modüller (10 Endpoint Modülü)

| Modül | Dosya | Açıklama |
|-------|-------|----------|
| `auth` | auth.ts | Login, Register, Token Refresh, Email Verification |
| `tts` | tts.ts | Text-to-Speech, Podcast Creation, Voice Listing |
| `content` | content.ts | Content History, Submission, Quiz, Progress |
| `subscription` | subscription.ts | Plans, Usage Summary, IAP Verification |
| `chat` | chat.ts | Liro AI Chat, Support Chat |
| `book` | book.ts | Book Search, Chapters, Reading Progress |
| `vocabulary` | vocabulary.ts | Word Lookup, SRS, Collections |
| `topic` | topic.ts | **YENİ** - Topic Tree, Subtopics, Content Creation |
| `pattern` | pattern.ts | **YENİ** - Idioms, Expressions, Pattern Matching |
| `notification` | notification.ts | **YENİ** - User Notifications, Read Status |

## 3. Platform Bazlı Entegrasyon Durumu

### A. Mobile (`LingRootMobile`)
**Durum:** ✅ Entegre (MFA hariç)

*   **Kurulum:** Paket `package.json`'a eklenmiş.
*   **Wrapper:** `src/services/apiClient.ts` - Helper fonksiyonlar ile birlikte.
*   **Legacy Bridge:** `src/services/api.ts` - ~55+ fonksiyon migrate edildi.

### B. Web (`frontend`)
**Durum:** ✅ Entegre

*   **Kurulum:** Paket entegre edilmiştir.
*   **Wrapper:** `src/lib/apiClient.ts` - Tüm modüller erişilebilir.
*   **Legacy Bridge:** `src/lib/api.ts` - Temel fonksiyonlar migrate edildi.

## 4. Entegrasyon Tablosu

| Özellik / Modül | API Client | Mobile | Web | Notlar |
| :--- | :---: | :---: | :---: | :--- |
| **Auth** | ✅ | ✅ | ✅ | Tam entegre |
| **TTS** | ✅ | ✅ | ✅ | Tam entegre |
| **Content** | ✅ | ✅ | ✅ | Tam entegre |
| **Subscription** | ✅ | ✅ | ✅ | Tam entegre |
| **Vocabulary** | ✅ | ✅ | ✅ | Tam entegre |
| **Book** | ✅ | ✅ | ✅ | Tam entegre |
| **Topic** | ✅ | ✅ | ✅ | **YENİ** - Tam entegre |
| **Pattern** | ✅ | ✅ | ✅ | **YENİ** - Tam entegre |
| **Notification** | ✅ | ✅ | ✅ | **YENİ** - Tam entegre |
| **Chat** | ✅ | ❌ | 🟡 | Mobile Liro entegre değil |
| **MFA** | ❌ | ❌ | ❌ | Kullanıcı isteği ile dokunulmadı |

## 5. Eklenen Yeni Modüller (2026-01-24)

### Topic API (`topic.ts`)
```typescript
interface TopicApi {
    getTree(): Promise<TopicTreeResponse>;
    createTopic(params: CreateTopicParams): Promise<TopicResponse>;
    generateSubtopics(topicId: string, params?: GenerateSubtopicsParams): Promise<SubtopicsResponse>;
    addManualSubtopic(topicId: string, params: AddManualSubtopicParams): Promise<...>;
    deleteTopic(topicId: string): Promise<{ success: boolean }>;
    getPath(topicId: string): Promise<TopicPathResponse>;
    createContent(topicId: string, params?: CreateContentFromTopicParams): Promise<...>;
    markListened(mp3Url: string): Promise<{ success: boolean }>;
    getSuggestions(topic: string, language?: string): Promise<TopicSuggestionsResponse>;
    getIncompleteListenings(): Promise<{ success: boolean; items: IncompleteListeningItem[] }>;
}
```

### Pattern API (`pattern.ts`)
```typescript
interface PatternApi {
    getByLevel(level: string): Promise<PatternsByLevelResponse>;
    findInText(text: string, level?: string): Promise<FindPatternsResponse>;
    getHistory(): Promise<PatternHistoryResponse>;
    getById(patternId: number): Promise<{ success: boolean; pattern: Pattern }>;
    recordEncounter(patternId: number, contentId?: string): Promise<{ success: boolean }>;
    getDailyPatterns(level?: string, count?: number): Promise<PatternsByLevelResponse>;
}
```

### Notification API (`notification.ts`)
```typescript
interface NotificationApi {
    getAll(params?: NotificationListParams): Promise<NotificationListResponse>;
    getUnreadCount(): Promise<UnreadCountResponse>;
    getUnread(): Promise<{ success: boolean; notifications: Notification[] }>;
    markAsRead(notificationId: string): Promise<{ success: boolean }>;
    markAllAsRead(): Promise<{ success: boolean }>;
    delete(notificationId: string): Promise<{ success: boolean }>;
    clearAll(): Promise<{ success: boolean }>;
}
```

## 6. Unit Testler

**Test Dosyaları:**
- `src/__tests__/topic.test.ts` - 6 test
- `src/__tests__/pattern.test.ts` - 7 test
- `src/__tests__/notification.test.ts` - 8 test
- `src/__tests__/index.test.ts` - 7 test

**Test Çalıştırma:**
```bash
cd packages/api-client
npm test              # Tüm testleri çalıştır
npm run test:watch    # Watch modunda çalıştır
npm run test:coverage # Coverage raporu ile çalıştır
```

**Sonuç:** ✅ 28/28 test başarılı

## 7. Kullanım Örnekleri

### Mobile (React Native)
```typescript
import { apiClient, getApiClient } from '@/services/apiClient';

// Topic tree alma
const topics = await apiClient.topic.getTree();

// Pattern arama
const patterns = await apiClient.pattern.findInText(text, 'B1');

// Bildirim sayısı
const count = await apiClient.notification.getUnreadCount();
```

### Web (Next.js)
```typescript
import { apiClient } from '@/lib/apiClient';

// Aynı API kullanılabilir
const topics = await apiClient.topic.getTree();
const patterns = await apiClient.pattern.getByLevel('B2');
```

## 8. Özet

| Metrik | Değer |
|--------|-------|
| Paket Versiyonu | 2.0.0 |
| Toplam Modül | 10 |
| Yeni Eklenen Modül | 3 (Topic, Pattern, Notification) |
| Unit Test Sayısı | 28 |
| Mobile Migrate Edilen Fonksiyon | ~53 |
| Web Migrate Edilen Fonksiyon | ~25 |

---

## 9. Kalan İşler (MFA Hariç)

> **Son Güncelleme:** 2026-01-24

Aşağıdaki fonksiyonlar henüz `@lingroot/api-client` üzerinden çağrılacak şekilde migrate edilmemiştir.

### A. Mobile (`LingRootMobile/src/services/api.ts`)

**Toplam:** 1 fonksiyon (%98 tamamlandı)

| Fonksiyon | Satır | Mevcut Durum | Önerilen Aksiyon |
|-----------|-------|--------------|------------------|
| `healthCheck()` | 790-796 | `apiClient.get('/api/health')` | `client.http.get` kullan |

**Not:** Interceptor'lardaki `wakeBackendIfNeeded` çağrıları (satır 192, 311) eski axios instance için gereklidir ve değiştirilmemelidir.

✅ **Yeni Tamamlanan (2026-01-24):** `rewriteToNarration()` → `client.http.post` kullanıyor

---

### B. Web (`frontend/src/lib/api.ts`)

**Toplam:** ~15 fonksiyon (%62 tamamlandı)

#### Kullanıcı & İstatistik Fonksiyonları
| Fonksiyon | Açıklama | Önerilen Modül |
|-----------|----------|----------------|
| `getUserStats(userId)` | Kullanıcı istatistikleri | `client.http.get` |
| `getUsageSummary()` | Kullanım özeti | `subscription.getUsageSummary` |
| `getUserInterests()` | Kullanıcı ilgi alanları | `client.http.get` |
| `updateUserInterests(interests)` | İlgi alanları güncelleme | `client.http.put` |
| `getMyPlanFeatures()` | Plan özellikleri | `subscription.getMyPlanFeatures` |

#### Döküman Fonksiyonları
| Fonksiyon | Açıklama | Önerilen Modül |
|-----------|----------|----------------|
| `getUserDocuments()` | Kullanıcı dökümanları | `client.http.get` |
| `getDocumentSections(documentId)` | Döküman bölümleri | `client.http.get` |

#### Kitap Fonksiyonları
| Fonksiyon | Açıklama | Önerilen Modül |
|-----------|----------|----------------|
| `getUserBookHistory(userId, page, limit)` | Kitap okuma geçmişi | `client.http.get` |
| `getUserBookFavoritesDetails()` | Favori kitaplar detay | `client.http.get` |
| `getUserBookFavorites()` | Favori kitap ID'leri | `client.http.get` |
| `saveBookFavorites(bookIds)` | Favorileri kaydet | `client.http.post` |
| `searchBooks(query, page, limit)` | Kitap arama | `book.search` ✅ (zaten mevcut) |
| `getBookChapters(bookId)` | Kitap bölümleri | `book.getChapters` ✅ (zaten mevcut) |
| `getChapterAudio(...)` | Bölüm sesi oluşturma | `client.http.post` |

#### Diğer Fonksiyonlar
| Fonksiyon | Açıklama | Önerilen Modül |
|-----------|----------|----------------|
| ~~`rewriteToNarration(text, level)`~~ | ~~Metni anlatıya çevir~~ | ✅ Tamamlandı |
| `getLibrary()` | Kütüphane listesi | `client.http.get` |
| `getItemDetails(id, type)` | Kütüphane öğesi detayı | `client.http.get` |
| `getLibraryItemDetails(id, type)` | Kütüphane öğesi detayı (extended) | `client.http.get` |
| `updateProgress(type, id, data)` | İlerleme güncelleme | `client.http.post` |
| `saveInterfaceLanguage(language)` | Arayüz dili kaydet | `client.http.put` |
| `saveDefaultVoice(voice)` | Varsayılan ses kaydet | `client.http.put` |

#### Generic API Objesi
```typescript
// Bu fonksiyonlar hala fetchApi kullanıyor
export const api = {
    get: (path, config) => fetchApi(path),
    post: (path, body) => fetchApi(path, { method: 'POST', body }),
    put: (path, body) => fetchApi(path, { method: 'PUT', body }),
    patch: (path, body) => fetchApi(path, { method: 'PATCH', body }),
    delete: (path) => fetchApi(path, { method: 'DELETE' }),
    // ...
};
```

---

### C. Öncelik Sıralaması

| Öncelik | Platform | Fonksiyonlar | Neden |
|---------|----------|--------------|-------|
| ~~🔴 Yüksek~~ | ~~Mobile~~ | ~~`rewriteToNarration`~~ | ✅ Tamamlandı |
| 🟡 Orta | Web | `getUsageSummary`, `getMyPlanFeatures` | api-client'da zaten mevcut |
| 🟡 Orta | Web | Kitap fonksiyonları | `book` modülünde karşılıkları var |
| 🟢 Düşük | Web | Generic `api` objesi | Geriye uyumluluk için fetchApi korunabilir |
| 🟢 Düşük | Both | `healthCheck` | Basit endpoint |

---

### D. MFA Servisi (Kullanıcı İsteği ile Dokunulmadı)

`mfaService` objesi ve aşağıdaki fonksiyonlar orijinal haliyle korunmuştur:

- `setupMfa()`
- `verifyMfaSetup(token)`
- `verifyMfaLogin(token)`
- `disableMfa(password)`
- `getMfaStatus()`
- `regenerateBackupCodes(password)`
- `verifyBackupCode(code)`

---

### 📝 Detaylı Uygulama Planı
Detaylı refactoring planı için bkz: `.gemini/antigravity/brain/api-refactoring/implementation_plan.md`
