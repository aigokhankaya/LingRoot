# Firebase Analytics Test Cases (LingRoot)

Bu belge, LingRoot projesi (Mobile & Web) için uygulanan Firebase Analytics olaylarını (events) test etmek amacıyla hazırlanmıştır. Testleri yaparken **Firebase Console > Analytics > DebugView** ekranını açık tutarak olayların anlık düştüğünü doğrulayın.

## Ön Hazırlık

1.  **Firebase DebugView:**
    *   Firebase Konsolu'nu açın.
    *   Projenizi seçin -> Analytics -> DebugView.
    *   Cihazınızı/Tarayıcınızı listeden seçin.
2.  **Uygulama:**
    *   Mobile: Uygulamayı emülatörde veya gerçek cihazda çalıştırın.
    *   Web: `localhost:3000` veya test ortamında tarayıcıyı açın.

---

## 1. Kimlik Doğrulama (Authentication)

| # | Senaryo (Action) | Beklenen Olay (Event Name) | Kontrol Parametreleri | Platform |
| :--- | :--- | :--- | :--- | :--- |
| **1.1** | Email/Şifre ile giriş yap. | `login` | `method: 'email'` | Mobile & Web |
| **1.2** | Google ile giriş yap. | `login` | `method: 'google'` | Mobile & Web |
| **1.3** | Apple ile giriş yap. | `login` | `method: 'apple'` | Mobile |
| **1.4** | Çıkış yap (Logout). | `logout` | - | Mobile & Web |
| **1.5** | Yeni üyelik oluştur (Sign Up). | `sign_up` | `method: 'email'` (veya ilgili provider) | Web |
| **1.6** | Giriş yaptıktan sonra. | `user_properties` | `user_role`, `membership_level` (User ID atanmış olmalı) | Mobile & Web |

## 2. Navigasyon (Screen Views)

| # | Senaryo (Action) | Beklenen Olay (Event Name) | Kontrol Parametreleri | Platform |
| :--- | :--- | :--- | :--- | :--- |
| **2.1** | Login ekranını aç. | `screen_view` | `screen_name: 'Login'`, `screen_class: 'LoginScreen'` | Mobile |
| **2.2** | Topic Tree (Ana menü) ekranına gel. | `screen_view` | `screen_name: 'TopicTree'` | Mobile |
| **2.3** | Dashboard (Web) sayfasına gir. | `screen_view` | `screen_name: 'Dashboard'` | Web |
| **2.4** | Kelime Listesi (My Words) ekranını aç. | `screen_view` | `screen_name: 'Vocabulary'` | Mobile |
| **2.5** | LIRO Chat ekranını aç. | `screen_view` | `screen_name: 'Liro_Chat'` | Mobile |

## 3. İçerik Tüketimi (Content Consumption)

| # | Senaryo (Action) | Beklenen Olay (Event Name) | Kontrol Parametreleri | Platform |
| :--- | :--- | :--- | :--- | :--- |
| **3.1** | Audio Player'ı aç veya başlat. | `content_view` | `content_id`, `content_title`, `content_type` | Mobile & Web |
| **3.2** | Sesi oynatmaya başla (Play). | `audio_play_start` | `content_id`, `audio_url` | Mobile & Web |
| **3.3** | Ses bitene kadar dinle (%90+). | `audio_play_complete` | `content_id` | Mobile & Web |
| **3.4** | Kalıp listesinde (Pattern List) bir karta tıkla. | `pattern_view` | `pattern_id`, `pattern_text` | Mobile |
| **3.5** | Kelime listesinde bir kelimenin detayını aç. | `word_view` | `word`, `level` | Mobile |

## 4. Kullanıcı Etkileşimi ve Üretim (Engagement & Creation)

| # | Senaryo (Action) | Beklenen Olay (Event Name) | Kontrol Parametreleri | Platform |
| :--- | :--- | :--- | :--- | :--- |
| **4.1** | LIRO Chat'te bir mesaj gönder. | `liro_message_sent` | `length`, `method: 'manual'` | Mobile |
| **4.2** | LIRO ile yeni bir içerik (Podcast/TTS) için onayla. | `content_creation_start` | `type` (podcast/narration), `topic` | Mobile |
| **4.3** | İçerik üretimi başarıyla tamamlandığında. | `content_creation_complete` | `type`, `duration`, `level` | Mobile |
| **4.4** | Bir kelimeyi "Öğrenildi" olarak işaretle/kaldır. | `word_learned_toggle` | `word`, `is_learned` (true/false) | Mobile |
| **4.5** | Yeni bir kelime ekle (Manuel veya text üzerinden). | `word_add` | `word`, `level`, `auto_generated` | Mobile |
| **4.6** | Web Dashboard'da sekmeler arası geçiş yap. | `tab_change` | `tab_name` | Web |
| **4.7** | Pattern Listesinde arama yap (3+ karakter). | `search` | `search_term`, `screen: 'PatternList'` | Mobile |

---

## Raporlama Notları

*   **Gecikme:** Web olayları genellikle anında düşer, mobil olaylar pil tasarrufu nedeniyle bazen toplu (batch) gönderilebilir. DebugView bu gecikmeyi minimuma indirir.
*   **User ID:** Giriş yaptıktan sonra DebugView'da "User Snapshot" altında doğru User ID'nin göründüğünü teyit edin.
