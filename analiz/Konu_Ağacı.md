# Konu Ağacı Özelliğinin Mobil Uygulamaya Taşınması

## 1. Amaç ve Kapsam
- **Amaç:** Web arayüzünde `welcome` sayfası altında yer alan **Konu Hiyerarşisi / Konu Ağacım** özelliğini, mobil uygulamada (iOS & Android, LingRootMobile) birebir aynı iş akışı ve olanaklarla sunmak.
- **Kapsam:**
  - Ana konu oluşturma
  - AI ile alt konu önerme
  - Manuel alt konu ekleme
  - Konu silme (alt konularla birlikte)
  - Konu ağacını ağaç yapısında gösterme (sonsuz derinlik)
  - Her seviyeden ses oluşturma / dinleme (TTS entegrasyonu)
  - İlerleme / istatistik rozetleri (ses oluşturuldu / dinlendi sayıları)

---

## 2. Web’deki Mevcut Yapının Özeti

### 2.1. Ana Bileşenler
- **`TopicHierarchySection`**
  - Props: `userId`, `level`, `onContentCreated?`, `topicsFirst?`, `targetDurationMinutes?`
  - Görevleri:
    - `getTopicTree()` ile backend’ten konu ağacını çekmek
    - `createMainTopic()` ile ana konu oluşturmak
    - `processTts()` + `getUsageSummary()` + `submitContent()` ile bir konu için ses üretmek ve içerik geçmişine loglamak
    - `TopicInput` ile ana konu giriş formunu render etmek
    - `TopicTree` ile konu ağacını render etmek
    - Konuya ait son sesi, popup içinde `OutputSection` ile oynatmak

- **`TopicInput`**
  - Alanlar:
    - `📚 Ana Konu Başlığı` (zorunlu)
    - `📝 Açıklama (İsteğe Bağlı)` toggle + textarea
    - `Seviye` göstergesi (örn. B1, B2)
  - Aksiyon:
    - `Ana Konu Oluştur` butonu ile `createMainTopic({ title, description, level })`

- **`TopicTree`**
  - Props: `topics`, `onRefresh`, `onContentCreated`, `level`, `audioStateByTopic`, `onOpenAudioModal`
  - Görevleri:
    - Başlık: `Konu Ağacınız`
    - `Yenile` butonu
    - Her bir root topic için `TopicNode` render etmek

- **`TopicNode`**
  - Props: `topic`, `depth`, `onRefresh`, `onContentCreated`, `level`, `audioStateByTopic`, `onOpenAudioModal`
  - Özellikler:
    - Derinliğe göre renk / arka plan / ikon
    - Başlık, açıklama, seviyeye göre badge, derinlik bilgisi, manuel/otomatik bilgisi
    - Alt konular için istatistikler: `totalSubtopics`, `audioCount`, `listenedCount`
    - `latest_content` üzerinden konu için ses var mı / dinlenmiş mi bilgisini gösterme
    - Butonlar:
      - `Ses Oluştur` / `Dinle` (duruma göre)
      - `Alt Konu Öner` (AI, `generateSubtopics`)
      - `Manuel Ekle` (manuel alt konu, `addManualSubtopic`)
      - `Sil` (konu + alt konular, `deleteTopicAndChildren`)
    - Alt konuları yine `TopicNode` ile recursive render eder (sonsuz derinlik)

- **`SubtopicModal`**
  - Fonksiyon: AI ile alt konu üretme
  - Alanlar:
    - Alt konu sayısı (5/10/20 veya manuel sayı)
    - Dil seçimi (Türkçe / İngilizce)
    - Açı / açıklama (isteğe bağlı)

- **`ManualSubtopicModal`**
  - Fonksiyon: Manuel alt konu ekleme
  - Alanlar:
    - Alt konu başlığı (zorunlu)
    - Açıklama (opsiyonel)

- **Backend API (frontend `lib/api.ts` üzerinden)**
  - `getTopicTree()` – `GET topic-hierarchy/tree` (varsayım, fiili endpoint fonksiyon içinde)
  - `createMainTopic({ title, description, level })` – `POST topic-hierarchy/topics`
  - `generateSubtopics(topicId, { count, language, angle })` – `POST topic-hierarchy/topics/:id/subtopics`
  - `addManualSubtopic(topicId, { title, description })` – `POST topic-hierarchy/topics/:id/subtopics/manual`
  - `deleteTopicAndChildren(topicId)` – `DELETE topic-hierarchy/topics/:id`
  - `processTts(...)`, `getUsageSummary()`, `submitContent(...)` ile TTS + içerik geçmişi entegrasyonu

---

## 3. Mobil Uygulamadaki Mevcut Durum (Özet)

### 3.1. İlgili Ekranlar ve Servisler
- **`HomeScreen`**
  - Kartlardan biri: `home.topicSuggestions` → `Create` ekranına `mode: 'suggestion'` ile gider.

- **`CreateScreen`**
  - `mode`: `'text' | 'file' | 'book' | 'suggestion' | 'youtube' | 'podcast'`
  - `suggestion` modu:
    - Kullanıcı yazdığı `suggestion` için `apiService.getTopicSuggestions(topic, level)` çağırır.
    - Gelen önerileri listeler ve ilkini metin alanına koyar.
  - TTS oluşturma, aktif job kontrolü, seviye seçimi gibi mantıklar zaten burada var.

- **`apiService` (`LingRootMobile/src/services/api.ts`)**
  - `getTopicSuggestions(topic, level)` mevcut
  - Konu ağacı (topic hierarchy) için henüz özel endpoint method’ları yok.

### 3.2. Eksik Olanlar (Konu Ağacı açısından)
- Ana konu / alt konu yapısını **kalıcı ağaç** halinde gösteren bir ekran yok.
- Alt konuları **sistematik** olarak yönetebileceğimiz (öner / manuel ekle / sil) bir arayüz yok.
- Webdeki `TopicHierarchySection`’ın mobilde birebir karşılığı yok.

---

## 4. Mobil İçin Hedef UX ve Genel Akış

### 4.1. Giriş Noktası
- **HomeScreen’de yeni bir kart**:
  - Başlık: `Konu Ağacım` (TR) / `My Topic Tree` (EN)
  - Açıklama: Webdeki kart ile uyumlu kısa açıklama (alt konu önerileri + manuel ekleme vurgusu)
  - Icon: `sitemap` veya mevcut ikon setinden ağacı çağrıştıran bir ikon
  - `screenName`: Örneğin `TopicTree` (yeni ekran)

### 4.2. `TopicTreeScreen` (yeni ekran)
- Webdeki `TopicHierarchySection`’ın mobil karşılığı olacak.
- Ana bloklar:
  - **Bilgilendirme kartı** ("Konu Hiyerarşisi Nedir?")
  - **Ana konu giriş alanı** (webdeki `TopicInput`'ın mobil versiyonu)
  - **Konu ağacı listesi** (webdeki `TopicTree` + `TopicNode`'un mobil versiyonu)
  - **Ses önizleme modal / full-screen player** ("Dinle" butonunda açılacak)

### 4.3. Kullanıcı Akışları
1. **Ana konu oluşturma**
   - Kullanıcı `Ana Konu Başlığı` alanına konu adını girer.
   - İsterse açıklama alanını açar ve yazar.
   - Seviye (örneğin `selectedLevel` veya kullanıcı profili seviyesinden) gösterilir.
   - `Ana Konu Oluştur` butonuna basınca backend’e POST → konu ağaç listesi otomatik güncellenir.

2. **Alt konu öner (AI)**
   - Ağaçta bir node üzerindeki `Alt Konu Öner` butonuna basılır.
   - `SubtopicModalMobile` açılır:
     - Alt konu sayısı seçilir (5 / 10 / 20 veya elle sayı)
     - Dil seçilir (Türkçe / İngilizce)
     - Açı / açıklama girilebilir.
   - `Oluştur` ile `generateSubtopics` çağrılır.
   - Dönüş başarılıysa: ilgili node expand edilir, yeni alt konular gösterilir.

3. **Manuel alt konu ekleme**
   - Ağaçta node üzerindeki `Manuel Ekle` butonuna basılır.
   - `ManualSubtopicModalMobile` açılır.
   - Alt konu başlığı (zorunlu) + açıklama (opsiyonel) girilir.
   - `Ekle` ile `addManualSubtopic` çağrılır → ağaç yenilenir ve node expand olur.

4. **Konu silme**
   - Node üzerindeki `Sil` butonu → onay modalı açılır.
   - Onaylanırsa `deleteTopicAndChildren` çağrılır.
   - Ağaç yeniden yüklenir.

5. **Ses oluşturma / dinleme**
   - Her node üzerinde `Ses Oluştur` / `Dinle` butonu; state’e göre label değişir.
   - Eğer backend’ten gelen `latest_content.mp3_url` varsa veya bu oturumda yeni ses oluşturulmuşsa:
     - `Dinle` butonu görünür → tıklanınca ses player modalı açılır.
   - Eğer ses yoksa:
     - `Ses Oluştur` butonu görünür →
       - `suggestedInput` = `topic.title` + (varsa `topic.description`)
       - Mevcut TTS akışı (CreateScreen’deki ile aynı mantık) kullanılacak.
       - Plan / kota kontrolü için webdeki `getUsageSummary` akışına denk gelen mobil fonksiyonlar kullanılacak.
       - Backend’e ek olarak `topic_id` parametresi gönderilerek ilgili TTS çıktısı konuya bağlanacak (web ile uyumlu).
   - Ses başarıyla oluşturulduğunda:
     - Ağaç güncellenir (rozetler / `latest_content` güncel)
     - İstenirse otomatik olarak player modalı da açılabilir.

---

## 5. Teknik Tasarım – Mobil Tarafta Yapılacaklar

### 5.1. API Katmanı (LingRootMobile `apiService`)
Web `frontend/src/lib/api.ts` ile birebir uyumlu method’lar eklenecek:

1. **`getTopicTree()`**
   - Endpoint: `GET /api/topic-hierarchy/tree` (fiili route backend’de nasıl ise ona göre)
   - Dönüş beklenen yapı (web’deki `Topic` tipi ile uyumlu):
     - `topics: Topic[]`
     - Her topic: `id`, `title`, `description?`, `level`, `depth`, `children?: Topic[]`, `is_manual?`, `keywords?`, `latest_content?`, `created_at?`, vb.

2. **`createMainTopic(data)`**
   - Endpoint: `POST /api/topic-hierarchy/topics`
   - Body: `{ title, description?, level }`

3. **`generateSubtopics(topicId, data)`**
   - Endpoint: `POST /api/topic-hierarchy/topics/:topicId/subtopics`
   - Body: `{ count?, language?, angle? }`

4. **`addManualSubtopic(topicId, data)`**
   - Endpoint: `POST /api/topic-hierarchy/topics/:topicId/subtopics/manual`
   - Body: `{ title, description? }`

5. **`deleteTopicAndChildren(topicId)`**
   - Endpoint: `DELETE /api/topic-hierarchy/topics/:topicId`

6. **TTS ile entegrasyon**
   - Mevcut `CreateScreen`’de kullanılan TTS method’u (örn. metinden ses oluşturma servisi) yeniden kullanılacak.
   - Bu method, opsiyonel `topicId` parametresi alacak şekilde genişletilebilir (web’deki `topic_id` ile aynı mantık).

> Not: Bu method isimleri ve endpoint path’leri, web’deki `lib/api.ts` ile birebir uyumlu tutulmalı; böylece backend tarafında ek iş gerektirmeden mobil de aynı REST API’leri kullanmış olur.

### 5.2. Tipler
- Yeni/ortak bir `Topic` tipi tanımlanacak (mümkünse web ile birebir aynı alanlar):
  - `id: string`
  - `title: string`
  - `description?: string`
  - `level: string`
  - `depth: number`
  - `children?: Topic[]`
  - `is_manual?: boolean`
  - `keywords?: string[]`
  - `latest_content?: { mp3_url?: string; vtt_url?: string; level?: string; timepoints?: any[]; words?: any[]; listened_at?: string | null; translated_text?: string; adapted_text?: string; message?: string }`
  - `created_at?: string`

### 5.3. Navigasyon
1. **Yeni ekran kaydı**
   - Örneğin `TopicTreeScreen` adında yeni bir ekran oluşturulacak.
   - Bu ekran, ana navigasyon yapısına (Home stack veya benzeri) eklenerek `HomeScreen` kartından erişilebilir hale getirilecek.

2. **HomeScreen kartı**
   - Yeni feature item:
     - `id: ...`
     - `title: t('home.topicTree')`
     - `description: t('home.topicTreeDesc')`
     - `icon: 'sitemap'` (veya benzer)
     - `screenName: 'TopicTree'`
     - `featureKey: 'topic_tree'`

### 5.4. Ekran ve Bileşenler (Mobil Karşılıklar)

1. **`TopicTreeScreen`** (web `TopicHierarchySection` eşleniği)
   - State’ler:
     - `topics: Topic[]`
     - `isLoading`, `error`, `successMessage`
     - `topicAudioLoadingId`, `topicAudioResults` (web’deki ile aynı mantık)
     - `modalTopicId` (hangi konunun ses player’ı açık)
   - Lifecycle:
     - Ekran açıldığında `getTopicTree()` çağırılır.
     - `pull-to-refresh` veya ek bir `Yenile` butonu ile liste tazelenebilir.
   - UI blokları:
     - Bilgilendirme kutusu: "📚 Konu Hiyerarşisi Nedir?" (web metninin mobil uyumu)
     - Ana konu giriş formu: `TopicInputMobile`
     - Konu ağacı listesi: `TopicTreeMobile`
     - Ses player modalı: `TopicAudioModalMobile` (içinde mevcut `AudioPlayer` bileşeni kullanılacak).

2. **`TopicInputMobile`** (web `TopicInput` eşleniği)
   - Props: `onCreateTopic`, `isLoading`, `level`
   - Alanlar:
     - TextInput: Ana konu başlığı
     - İsteğe bağlı açıklama bölümü (expand/collapse)
     - Seviye göstergesi (CEFR): `level.toUpperCase()`
     - `Ana Konu Oluştur` butonu
   - Davranış:
     - Boş başlıkta buton disabled.
     - Submit’te `onCreateTopic(title, description)` çağrılır, ardından form temizlenir.

3. **`TopicTreeMobile`** (web `TopicTree` eşleniği)
   - Props: `topics`, `onRefresh`, `onContentCreated`, `level`, `audioStateByTopic`, `onOpenAudioModal`
   - `FlatList` veya `ScrollView` içinde root topic’ler listelenir.
   - Üstte başlık + `Yenile` butonu.

4. **`TopicNodeMobile`** (web `TopicNode` eşleniği)
   - Props: web ile aynı anlamda.
   - Özellikler:
     - Derinliğe göre margin/padding + arka plan rengi (renkler web’e paralel)
     - Başlık, açıklama, seviye badge’i, derinlik bilgisi, "Manuel" etiketi, anahtar kelime önizlemesi.
     - Alt konular için istatistik rozeti: `Ses Oluşturuldu / Dinlendi` sayıları.
     - Son içerik durumuna göre (ses hazır mı, dinlendi mi) badge.
     - Buton grubu:
       - `Ses Oluştur` / `Dinle` (tek buton, state’e göre etiket değişir)
       - `Alt Konu Öner`
       - `Manuel Ekle`
       - `Sil`
     - Alt konular için recursive render (`TopicNodeMobile` içinde children’ları tekrar çağırma).

5. **`SubtopicModalMobile`** (web `SubtopicModal` eşleniği)
   - Alanlar ve davranışlar web ile aynı:
     - Alt konu sayısı seçimi (preset + manuel input)
     - Dil seçimi
     - Açı / açıklama textarea
     - `Oluştur` → `onGenerate(count, language, angle)`

6. **`ManualSubtopicModalMobile`** (web `ManualSubtopicModal` eşleniği)
   - Alanlar:
     - Alt konu başlığı (zorunlu)
     - Açıklama (opsiyonel)
   - `Ekle` → `onAdd(title, description)`

7. **`TopicAudioModalMobile`**
   - İçerik:
     - Başlık: Seçili konunun ismi
     - Mevcut ses player bileşeni (CreateScreen’de kullanılan `AudioPlayer` / benzeri)
     - Kapat butonu
   - `TopicTreeScreen` üzerinden `modalTopicId` ve `topicAudioResults[modalTopicId]` ile beslenir (web’deki `OutputSection` benzeri yapı).

### 5.5. State Yönetimi ve Performans
- Ağaç yapısı büyük olabileceği için:
  - `FlatList` + `keyExtractor` kullanımı
  - Expand/collapse state’leri `TopicNodeMobile` içinde lokal tutulacak (web’deki gibi).
- Ses durumları (`audioStateByTopic`) `useMemo` ile hesaplanacak (web’deki pattern aynen taşınabilir).

---

## 6. Hata Yönetimi ve Kenar Durumları

1. **Backend erişimi yok / timeout**
   - `getTopicTree`, `createMainTopic` vb. çağrılarda hata mesajları kullanıcıya `Alert` veya toast ile gösterilecek.
   - Web’deki hata metinleri ile uyumlu Türkçe/İngilizce mesajlar.

2. **Boş konu ağacı**
   - Web’deki `renderEmptyState` karşılığı olarak mobilde de "Henüz konu oluşturmadınız" benzeri bir boş durum ekranı gösterilecek.

3. **TTS job kilidi**
   - Mevcut `CreateScreen`’deki `isTtsJobLocked` / `ttsJobMessage` mantığı, konu ağacı üzerinden ses oluşturma akışında da kullanılmalı.
   - Aktif job varken yeni TTS isteği engellenecek.

4. **Plan / kota aşımları**
   - Web’deki `getUsageSummary` kontrolleri ile aynı iş mantığı mobilde de uygulanmalı; paket yoksa veya kota aşıldıysa kullanıcı bilgilendirilecek.

---

## 7. Uluslararasılaştırma (i18n)
- Yeni ekran ve bileşenlerin tüm metinleri i18n üzerinden yönetilecek.
- Örnek key grupları:
  - `topicTree.title`, `topicTree.description`
  - `topicTree.input.mainTopicLabel`, `topicTree.input.descriptionLabel`, `topicTree.input.createButton`
  - `topicTree.emptyState.title`, `topicTree.emptyState.subtitle`
  - `topicTree.actions.suggestSubtopic`, `topicTree.actions.manualAdd`, `topicTree.actions.delete`, `topicTree.actions.play`, `topicTree.actions.createAudio`

---

## 8. Adım Adım Geliştirme Planı

1. **Backend endpoint’lerini ve web `lib/api.ts` fonksiyonlarını gözden geçir**
   - `getTopicTree`, `createMainTopic`, `generateSubtopics`, `addManualSubtopic`, `deleteTopicAndChildren`, `processTts` yapısını netleştir.

2. **Mobil API katmanını genişlet**
   - `apiService` içine yukarıdaki endpoint’lere karşılık gelen method’ları ekle.
   - Tipleri (özellikle `Topic`) tanımla.

3. **Yeni navigasyon girişini ekle**
   - `HomeScreen`’e `Konu Ağacım` kartını ekle.
   - Router / navigator içine `TopicTreeScreen` ekranını tanımla.

4. **`TopicTreeScreen` iskeletini oluştur**
   - Ekran açılışında `getTopicTree` çağır.
   - `isLoading` / `error` / empty state akışını kur.

5. **`TopicInputMobile` bileşenini geliştir**
   - Ana konu oluşturma formu + seviye göstergesi.
   - `createMainTopic` ile entegre et, başarıdan sonra ağaç yenile.

6. **`TopicTreeMobile` ve `TopicNodeMobile` bileşenlerini geliştir**
   - Derinlik bazlı stil
   - Alt konu istatistikleri (computeSubtreeStats mantığını taşı)
   - `Alt Konu Öner`, `Manuel Ekle`, `Sil`, `Ses Oluştur / Dinle` butonlarının UI’ını hazırla.

7. **`SubtopicModalMobile` ve `ManualSubtopicModalMobile`’i ekle**
   - Webdeki formların birebir mobil karşılığını tasarla.
   - `generateSubtopics` ve `addManualSubtopic` ile entegre et.

8. **Ses üretme ve dinleme entegrasyonunu tamamla**
   - Mevcut TTS servislerini topic akışına bağla.
   - `TopicAudioModalMobile` ile ses player’ı aç/kapat.
   - `audioStateByTopic` ve `topicAudioResults` state’lerini uygula.

9. **i18n ve son kullanıcı metinleri**
   - Tüm yeni metinleri TR/EN çevirileriyle i18n dosyalarına ekle.

10. **Test ve UX iyileştirmeleri**
    - Büyük konu ağaçlarında performans
    - Offline / zayıf bağlantı senaryoları
    - iOS ve Android’de modal / navigation davranışları

---

## 9. Riskler ve Dikkat Edilmesi Gereken Noktalar

- **Backend şeması ile uyum:**
  - Mobil `Topic` tipi ile backend’in döndürdüğü alanların uyumlu olması kritik.
- **Büyük ağaçlarda performans:**
  - Gerektiğinde virtualized list kullanımı ve recursive render’ın optimize edilmesi gerekebilir.
- **TTS job kilidi ile etkileşim:**
  - Konu ağacından tetiklenen ses üretimleri, mevcut TTS job yönetimiyle çakışmamalı.
- **Web ile tutarlılık:**
  - UX, buton isimleri ve akışlar mümkün olduğunca web ile birebir aynı tutulmalı; farklılıklar sadece mobil UI gerekliliklerinden kaynaklanmalı.
