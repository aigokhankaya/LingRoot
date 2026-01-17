# Firebase Analytics Entegrasyon Planı (LingRoot)

Bu belge, LingRoot Mobile ve Web uygulamaları için Firebase Analytics entegrasyon stratejisini ve kurulum detaylarını içerir.

## 1. Genel Strateji ve Hedefler

**Amaç:** Kullanıcı davranışlarını anlamak, içerik tüketimini izlemek ve uygulamanın en çok kullanılan özelliklerini belirleyerek geliştirmelere yön vermek.

**Temel Metrikler (KPIs):**
*   **İçerik Etkileşimi:** Hangi podcastler dinleniyor? Hangi metinler okunuyor? Ortalama dinleme süresi ne kadar?
*   **Öğrenme İlerlemesi:** Tamamlanan dersler/aktiviteler, öğrenilen kalıplar (patterns).
*   **Kullanıcı Sadakati (Retention):** Günlük/Aylık aktif kullanıcı oranı, oturum süresi.
*   **Dönüşüm:** Üyelik/Abonelik durumları (Free -> Premium geçişleri).

---

## 2. İzlenecek Veriler (Events & Parameters)

Aşağıdaki olaylar (events) hem Mobile hem de Web tarafında ortak isimlendirme ile gönderilecektir.

### A. İçerik Tüketimi (Content Consumption)

| Event Name | Açıklama | Parametreler |
| :--- | :--- | :--- |
| `content_view` | Bir içerik detayına girildiğinde tetiklenir. | `content_id`, `content_title`, `content_type` (podcast, text, book), `cefr_level` (A1, B2...) |
| `audio_play_start` | Audio oynatılmaya başlandığında. | `content_id`, `audio_url`, `duration` |
| `audio_play_complete` | Audio sonuna kadar dinlendiğinde (%90+). | `content_id`, `duration_listened` |
| `pattern_view` | Bir kalıp (pattern) detayına bakıldığında. | `pattern_id`, `pattern_text` |
| `translation_usage` | Çeviri özelliği kullanıldığında. | `source_text_length`, `source_language`, `target_language` |

### B. Öğrenme Aktiviteleri (Learning Activities)

| Event Name | Açıklama | Parametreler |
| :--- | :--- | :--- |
| `lesson_start` | Bir ders veya quiz başladığında. | `lesson_id`, `lesson_topic` |
| `lesson_complete` | Ders başarıyla tamamlandığında. | `lesson_id`, `score`, `duration_seconds` |
| `quiz_attempt` | Quiz sorusu cevaplandığında. | `question_id`, `is_correct` (boolean), `topic` |

### C. Kullanıcı Etkileşimi (User Engagement)

| Event Name | Açıklama | Parametreler |
| :--- | :--- | :--- |
| `search` | Arama yapıldığında. | `search_term`, `result_count` |
| `share` | İçerik paylaşıldığında. | `content_id`, `content_type`, `method` (whatsapp, copy_link) |
| `screen_view` | (Otomatik + Manuel) Özel ekran geçişleri. | `screen_name`, `screen_class` |

### D. Kullanıcı Özellikleri (User Properties)

Kullanıcıları segmente etmek için bu özellikler `setUserProperties` ile ayarlanacaktır.

*   `user_level`: Kullanıcının seçtiği dil seviyesi (Örn: "Intermediate", "A2").
*   `user_type`: "Free", "Premium", "Admin".
*   `content_preference`: En çok tükettiği içerik türü (Analiz sonucu backend'den de gelebilir veya client'ta basitçe tutulabilir).
*   `native_language`: Ana dili.
*   `target_language`: Öğrendiği dil.

---

## 3. Teknik Uygulama (Implementation)

### A. Mobile (React Native)

Proje: `LingRootMobile`
Kütüphane: `@react-native-firebase/analytics`

**Adımlar:**
1.  **Kurulum:**
    ```bash
    npm install @react-native-firebase/analytics
    cd ios && pod install
    ```
2.  **Yapılandırma:** `firebase.json` veya native dosyalarda (zaten `@react-native-firebase/app` kurulu olduğu için temel ayarlar muhtemelen tamamdır).
3.  **Kullanım Örneği (Helper Dosyası):**
    ```typescript
    import analytics from '@react-native-firebase/analytics';

    export const logEvent = async (eventName: string, params: object = {}) => {
      await analytics().logEvent(eventName, params);
    };

    export const setUserProps = async (props: object) => {
      await analytics().setUserProperties(props);
    };
    ```

### B. Web (Next.js)

Proje: `frontend`
Kütüphane: `firebase` (Web SDK)

**Adımlar:**
1.  **Kurulum:**
    ```bash
    npm install firebase
    ```
2.  **Yapılandırma (`src/lib/firebase.ts`):**
    *   `NEXT_PUBLIC_FIREBASE_API_KEY` vb. environment variable'lar `.env.local` dosyasına eklenmeli.
    *   Sadece client-side'da çalışacak şekilde `analytics` başlatılmalı (`typeof window !== 'undefined'`).
3.  **Kullanım:**
    *   React Context veya basit bir utility fonksiyonu ile `logEvent` metodu sayfalara dağıtılır.
    *   `useEffect` içinde sayfa değişimleri izlenebilir veya Next.js Router eventleri dinlenebilir.

## 4. Önerilen Sonraki Adımlar

1.  Bu dokümanı onaylayın.
2.  Mobile ve Web projelerine ilgili paketlerin kurulması.
3.  `AnalyticsHelper` dosyalarının oluşturulması (her iki proje için).
4.  Kritik noktalara (Audio Player, Ders Sonu ekranı vb.) loglama kodlarının eklenmesi.
