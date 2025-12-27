# LingRoot "Kahramanın Yolculuğu": Oyunlaştırılmış Onboarding ve İlerleme Sistemi Analizi

> **Vizyon:** Kullanıcıyı sadece "öğrenci" olarak değil, bir "Kahraman" olarak konumlandırmak. Liro ise bu yolculukta ona rehberlik eden bilge "Mentor"dur. Amaç, standart bir eğitim uygulamasından çıkıp, duygusal bağ kuran ve alışkanlık yaratan bir yaşam tarzı aracına dönüşmek.

## 1. Yönetici Özeti
Bu rapor, LingRoot'un onboarding (karşılama) ve ilerleme sistemini **"Hero's Journey" (Kahramanın Yolculuğu)** metodolojisi ile yeniden tasarlamak için gereken stratejik, psikolojik ve teknik altyapıyı detaylandırır.

**Temel Hedef:** Standart ve sıkıcı seviye tespit sınavları (Test A1, B1...) yerine, kullanıcı ile sohbet ederek onu analiz eden, hayallerine ortak olan ve ona özel bir "Destansı Yol haritası" sunan bir yapı kurmak.

---

## 2. Psikolojik Mimari ve Motivasyon Tasarımı

Sistemin "bağımlılık yapıcı" (iyi anlamda) ve sürdürülebilir olması için 3 temel psikolojik model kullanılacaktır.

### 2.1. Self-Determination Theory (Öz Belirlenim Kuramı)
Kullanıcının içsel motivasyonunu ateşlemek için 3 ihtiyaç karşılanmalıdır:
1.  **Özerklik (Autonomy):** "Bunu ben seçtim."
    *   *Uygulama:* Kullanıcıya hedefini Liro sormaz, "Birlikte tasarlayalım" der. Kullanıcı kahraman tipini (Gezgin, Lider, Bilge) kendi seçer.
2.  **Yeterlilik (Competence):** "Gelişiyorum ve bunu hissediyorum."
    *   *Uygulama:* Sadece CEFR seviyesi atlamak (aylar sürer) yerine, "Mikro-Kazanımlar" (kelime öğrendim, bir makale bitirdim) ile sürekli dopamin salgısı.
3.  **İlişkisellik (Relatedness):** "Beni anlayan biri var."
    *   *Uygulama:* Liro'nun sadece bir bot değil, kullanıcının zevklerini hatırlayan bir "Yol Arkadaşı" olması.

### 2.2. Hook Modeli (Alışkanlık Döngüsü)
1.  **Tetikleyici (Trigger):** Liro'dan gelen kişisel bir bildirim ("Dün yarım bıraktığın Elon Musk makalesini bitirelim mi?").
2.  **Aksiyon (Action):** Tek tıkla dinlemeye başlama.
3.  **Ödül (Variable Reward):** XP kazanma, sürpriz bir "Kelime Rozeti" açılması veya Liro'dan gelen övgü dolu sesli mesaj.
4.  **Yatırım (Investment):** Kendi kelime listesini oluşturma, profilini özelleştirme (Sistemden çıkmayı zorlaştırır).

### 2.3. Akış (Flow) Durumu
Kullanıcıyı ne sıkılacağı kadar kolay, ne de pes edeceği kadar zor bir alanda tutmak.
*   **Çözüm:** **Dinamik Zorluk Ayarı.** Onboarding sadece başlangıçta değil, her içerikte arka planda çalışır. Kullanıcı bir metni çok kolay geçerse, bir sonraki öneri %10 daha zorlu (kelime yoğunluğu artırılmış) gelir.

---

## 3. "Kahramanın Yolculuğu" Onboarding Akışı (Detaylı UX Senaryosu)

Bu akış, kullanıcının uygulamaya ilk girdiği andan itibaren başlar. Form doldurma yok, sadece etkileşim var.

### Sahne 1: Çağrı (The Call to Adventure)
*   **Ekran:** Minimalist, sinematik bir giriş.
*   **Metin:** *"Her dil yeni bir dünyadır. Bugün hangi dünyanın kapısını aralamak istiyorsun?"*
*   **Aksiyon:** Kullanıcı bir "Archetype" (Arketip) seçer:
    *   🏰 **Kariyer Mimarı:** "İşimde global bir lider olmak istiyorum."
    *   🌍 **Dünya Gezgini:** "Sınır tanımadan seyahat etmek istiyorum."
    *   🧠 **Entelektüel Bilge:** "Orijinal kaynaklardan beslenmek istiyorum."

### Sahne 2: Eşik Muhafızı (Gizli Seviye Tespiti)
*   **Format:** Liro ile sesli veya yazılı sohbet. "Test" kelimesi asla geçmez.
*   **Liro:** *"Harika bir seçim! Ben Liro. Senin rehberinim. İngilizce ile aran nasıl? Bana biraz kendinden bahseder misin? (Türkçe veya İngilizce yazabilirsin)"*
*   **Mekanizma (Stealth Assessment):**
    1.  Liro önce basit (A1) bir soru sorar.
    2.  Kullanıcı İngilizce cevap verirse -> Dilbilgisi ve kelime karmaşıklığını (Lexical Density) analiz eder.
    3.  Cevap iyiyse -> Liro seviyeyi artırır (B1 tarzı soru: *"What do you think about the future of AI?"*).
    4.  Kullanıcı zorlanırsa/Türkçe dönerse -> Liro seviyeyi düşürür ve notunu alır.
*   **Sonuç:** 3-5 dakikalık sohbet sonunda backend'de `calculated_cefr_level` (örn: B1.2) belirlenir.

### Sahne 3: Kehanet ve Anlaşma (The Prophecy)
*   **Ekran:** Liro, kullanıcıya özel hazırlanmış "Karakter Kartı"nı sunar.
*   **İçerik:**
    *   **Mevcut Durum:** *"Sen 'Gizli Potansiyeli Olan Bir Kaşifsin' (Seviyen: B1)."*
    *   **Hedef:** *"Senin hedefin 'Global Lider' (C1) olmak."*
    *   **Yol Haritası:** *"Bu yolculuk 12 hafta sürecek. Günde 15 dakika ayırırsan, New York Times makalelerini sözlüksüz okuyabilirsin."*
*   **Kutlama:** Ekranda konfetiler ve epik bir ses efekti. "Yolculuğu Başlat" butonu.

---

## 4. "Yol Haritası" (Journey Map) ve İlerleme Ekranı

Kullanıcının gelişimini somutlaştırmak için özel bir **"Yolculuk Ekranı" (/journey)** tasarlanacaktır.

### 4.1. Kademeli Açılma (Fog of War) Mekaniği
Kullanıcı tüm geleceği değil, sadece önündeki birkaç adımı net görür.
*   **Aktif Görev (Current Quest):** Parlak, büyük ve tıklanabilir. (Örn: "Podcast Dinle: Elon Musk Biography")
*   **Görünür Gelecek (Next 2 Steps):** Yarı şeffaf, kilitli ama ne olduğu belli. (Örn: "Kilitli: Kelime Quiz'i - Teknoloji")
*   **Gizemli Gelecek (Locked):** "Sisli" veya zincirli ikonlar. Sadece "Level 15'te açılır" yazar. Merak uyandırır.

### 4.2. Görev Tipleri (Quests)
Haritada karşılaşılacak "duraklar":
*   🗺️ **Landmark (Dönüm Noktası):** Bir seviyenin veya ünitenin bitişi (Boss Fight gibi).
*   📜 **Scroll (İçerik Tüketimi):** Makale oku veya Podcast dinle.
*   ⚔️ **Challenge (Meydan Okuma):** Quiz veya Konuşma Pratiği.

### 4.3. Gelişim Takip Sayfası (/progress)
Harita dışında, kullanıcının "Karakter İstatistiklerini" gördüğü detaylı bir dashboard.
*   **Yetenek Ağacı (Skill Tree):** Okuma, Dinleme, Kelime, Konuşma yeteneklerinin ayrı ayrı seviyeleri (Örn: "Dinleme: Level 14 - Usta").
*   **Haftalık Program:** O hafta yapılması gerekenlerin takvimi.

---

## 5. Akıllı Tekrar ve Eğlenceli Meydan Okumalar

Sıkıcı ezberler yerine, oyunun akışı içine gizlenmiş tekrarlar.

### 5.1. Context-Aware SRS (Bağlamsal Aralıklı Tekrar)
Klasik flashcard (kart çevirme) yerine, kelimeleri **yeni içeriklerin içinde** tekrar ettireceğiz.
*   **Senaryo:** Kullanıcı "Sustainable" kelimesini öğrendi.
*   **Sistem:** 3 gün sonra Liro, içinde "Sustainable" geçen kısa bir Elon Musk haberi önerir.
*   **Fayda:** Kullanıcı tekrar yaptığını fark etmez, yeni bir şey okuduğunu sanır ama beyin o kelimeyi pekiştirir.

### 5.3. Kelime Öğrenim Döngüsü (Vocabulary Injection & Collection)
Kullanıcının önerisi üzerine, öğrenilecek kelimeler içeriğe **özel olarak enjekte edilecektir**.

*   **Tekrarlı Maruz Bırakma (Repeated Exposure):**
    *   Kullanıcı listesine "Serendipity" kelimesini eklediyse (veya sistem bunu hedeflediyse),
    *   Liro bir sonraki oluşturduğu hikayede bu kelimeyi **bilinçli olarak 3 kez farklı cümlelerde** geçirir.
    *   *Örnek:* "He found the book by purely **serendipity**... It was a moment of **serendipity** that changed his life..."
    *   **Neden Faydalı?** Beyin, bir kelimeyi farklı bağlamlarda (isim, sıfat, farklı cümleler) gördüğünde anlamı %80 daha kalıcı kodlar.

*   **Sürtünmesiz Ekleme (Click-to-Collect):**
    *   Okuma/Dinleme sırasında bilmediği bir kelimeye tıkladığında:
        1.  Kelime anında sarı ile vurgulanır ve sözlüğe eklenir (Popup açılmaz, akış bozulmaz).
        2.  Liro arka planda not alır: "Kullanıcı bu kelimede takıldı."
    *   **Proaktif Dürtme (Nudge):** Bir paragraf bittiğinde Liro araya girer: *"Burada 'Inevitably' kelimesi kritikti. Listene eklememi ister misin?"*

### 5.4. Kelime Matrisi ve Keşif Testleri (Vocabulary Matrix & Discovery)
Sadece "öğrenilenleri" değil, "henüz bilinmeyenleri" de yöneten bir yapı.

*   **Kelime Matrisi (The Matrix):**
    *   Sistem, kullanıcının seviyesindeki (Örn: B2) en kritik 2000 kelimeyi bilir.
    *   **Bilinenler (Known):** Okundu ve anlaşıldı işaretlenenler.
    *   **Öğrenilenler (Learning):** Şu an SRS döngüsünde olanlar.
    *   **Karanlık Alan (The Void):** Kullanıcının henüz karşılaşmadığı veya bilmediği kelimeler.
    *   *Hedef:* Karanlık alanı aydınlatmak.

*   **Keşif Testleri (Discovery Quizzes):**
    *   Kullanıcıyı test etmek için değil, **merakını cezbetmek** için yapılan testler.
    *   *Soru:* "Teknoloji dünyasında 'Paradigm Shift' mi daha havalı duruyor, 'Quantum Leap' mi?"
    *   *Aksiyon:* Kullanıcı "Paradigm Shift"i seçerse, sistem bunu **"İstek Listesi"ne (Want to Learn)** ekler ve bir sonraki makalede bu kelimeyi geçirir.
    *   *Fayda:* Kullanıcı kendi öğrenme müfredatını oyun oynarken seçmiş olur.

---

## 6. Oyunlaştırma Mekanikleri (Progression & Rewards)

### 6.1. Mikro-Progression Sistemi
CEFR seviyeleri (A1, A2...) çok geniştir. İlerleme hissi için bunları böleceğiz.
*   **Level Sistemi:** Toplam 100 Level.
    *   Level 1-10: A1
    *   Level 11-25: A2
    *   ...
    *   Level 90-100: C2
*   **XP (Deneyim Puanı):** Her aksiyon puan kazandırır.
    *   Podcast Dinleme: +10 XP / dakika
    *   Kelime Öğrenme: +5 XP
    *   Streak Devamı: +50 XP
*   **Seviye Atlama:** Her level atlandığında Liro'dan özel bir tebrik mesajı gelir ve profil çerçevesi değişir.

### 6.2. Streak (Zinciri Kırma) ve "Donma" Hakkı
*   Kullanıcı her gün girdiğinde "streak alevi" parlar.
*   **Streak Freeze:** Kullanıcı kazandığı XP'lerle "Dondurma Hakkı" satın alabilir. Bu, "kaybetme korkusunu" yönetilebilir hale getirir.

---

## 7. Teknik Mimari ve Veritabanı Tasarımı

### 7.1. Veritabanı Şeması (Yeni Tablolar)

Mevcut şemaya ek olarak aşağıdaki tablolar gereklidir:

```sql
-- 1. Kullanıcı Oyunlaştırma Profili
CREATE TABLE user_gamification (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_level INTEGER DEFAULT 1,       -- 1-100 arası
    current_xp INTEGER DEFAULT 0,          -- Mevcut level içindeki XP
    total_lifetime_xp INTEGER DEFAULT 0,   -- Toplam kazanılan XP
    streak_count INTEGER DEFAULT 0,
    last_activity_date DATE DEFAULT CURRENT_DATE,
    freeze_balance INTEGER DEFAULT 0,      -- Satın alınan dondurma hakları
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Kullanıcı Hedefleri (The Prophecy)
CREATE TABLE user_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    archetype VARCHAR(50),                 -- 'career', 'travel', 'intellectual'
    target_cefr VARCHAR(10),               -- 'C1'
    weekly_minutes_goal INTEGER DEFAULT 120,
    deadline DATE,
    status VARCHAR(20) DEFAULT 'active',   -- active, completed, abandoned
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Rozetler ve Başarımlar
CREATE TABLE achievements (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,      -- 'FIRST_BLOOD', 'BOOKWORM_1'
    title_tr VARCHAR(100),
    description_tr TEXT,
    icon_url TEXT,
    xp_reward INTEGER,
    condition_type VARCHAR(50),            -- 'read_count', 'streak_day', 'word_count'
    condition_value INTEGER
);

CREATE TABLE user_achievements (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    achievement_id INTEGER REFERENCES achievements(id),
    earned_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, achievement_id)
);

-- 4. Görev Düğümleri (Quest Nodes - Yol Haritası)
CREATE TABLE quest_nodes (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100),
    description TEXT,
    step_order INTEGER,                    -- 1, 2, 3... (Sıralama)
    required_level INTEGER,                -- Level 5 olmadan açılmaz
    prerequisite_node_id INTEGER REFERENCES quest_nodes(id), -- Önceki görev
    reward_xp INTEGER,
    task_type VARCHAR(50),                 -- 'content', 'quiz', 'milestone'
    content_reference_id VARCHAR(100),     -- Bağlı olduğu içerik ID
    is_major_milestone BOOLEAN DEFAULT FALSE -- Boss/Dönüm noktası mı?
);

-- 5. Kullanıcı Görev İlerlemesi
CREATE TABLE user_quest_progress (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    node_id INTEGER REFERENCES quest_nodes(id),
    status VARCHAR(20) DEFAULT 'locked',   -- locked, unlocked, in_progress, completed
    completed_at TIMESTAMP,
    score INTEGER,
    PRIMARY KEY (user_id, node_id)
);

-- 6. Günlük Görevler (Daily Quests)
CREATE TABLE daily_quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    quest_date DATE DEFAULT CURRENT_DATE,
    task_type VARCHAR(50),                 -- 'listen_10min', 'learn_5words'
    target_amount INTEGER,
    current_amount INTEGER DEFAULT 0,
    is_claimed BOOLEAN DEFAULT FALSE,      -- Ödül alındı mı?
    xp_reward INTEGER
);

-- 7. Kelime Tekrar Sistemi (SRS)
CREATE TABLE word_reviews (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    word VARCHAR(100),
    next_review_date DATE,                 -- Bir sonraki tekrar ne zaman?
    interval_days INTEGER DEFAULT 1,       -- SuperMemo/SM-2 algoritması için
    ease_factor DECIMAL(5,2) DEFAULT 2.5,
    streak_correct INTEGER DEFAULT 0,
    last_reviewed_at TIMESTAMP
);

-- 8. Kelime Ustalık Matrisi (Global Status)
CREATE TABLE word_mastery (
    user_id UUID REFERENCES users(id),
    word VARCHAR(100),
    cefr_level VARCHAR(10),                -- Kelimenin ait olduğu seviye
    status VARCHAR(20),                    -- 'known', 'learning', 'want_to_learn', 'ignored'
    discovered_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, word)
);

-- 9. Quiz Sonuçları
CREATE TABLE quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    quiz_type VARCHAR(50),                 -- 'vocab_hunt', 'boss_fight'
    score INTEGER,
    max_score INTEGER,
    time_spent_seconds INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 7.2. Gerekli API Endpoint'leri

*   **`POST /api/onboarding/assess`**: Sohbet geçmişini alıp CEFR tahmini yapan AI servisi.
*   **`POST /api/onboarding/roadmap`**: Hedef ve seviyeye göre kişisel plan oluşturan servis.
*   **`POST /api/gamification/xp`**: XP ekleme (Backend-to-Backend güvenli olmalı).
*   **`GET /api/gamification/stats`**: Level, XP, Streak bilgisini döner.
*   **`GET /api/gamification/achievements`**: Kazanılan ve kazanılacak rozetleri listeler.

---

## 8. Uygulama Planı (Action Plan)

Bu plan, geliştirme sürecini yönetilebilir parçalara ayırır.

### FAZ 1: Temel Oyunlaştırma Altyapısı (Backend)
1.  [ ] **Veritabanı Migrasyonu:** Yukarıdaki tabloları oluştur.
2.  [ ] **`GamificationService` Yazımı:**
    *   XP hesaplama algoritması.
    *   Level atlama, streak kontrolü.
    *   Rozet tetikleme (Event-driven yapı).
3.  [ ] **Mevcut Servislere Entegrasyon:**
    *   `contentService.js` -> İçerik bittiğinde `GamificationService.addXP()` çağır.
    *   `ttsService.js` -> Dinleme süresini kaydet.

### FAZ 2: "Kahramanın Yolculuğu" Onboarding (Frontend & AI)
1.  [ ] **`OnboardingFlow` Bileşeni:**
    *   Adım adım ilerleyen, tam ekran, animasyonlu arayüz.
2.  [ ] **"Liro Assessment" Prompt'u:**
    *   Kullanıcı seviyesini sohbetten anlayan özel bir sistem promptu (`prompts/liro/cefr_assessor.txt`).
3.  [ ] **Yol Haritası Görselleştirme:**
    *   Kullanıcının A'dan B'ye giden yolunu gösteren "Timeline" bileşeni.

### FAZ 3: Görsel Ödül Sistemi (UI/UX)
1.  [ ] **Dashboard Güncellemesi:**
    *   Header'a XP barı ve Level göstergesi ekle.
    *   "Günlük Seri" (Streak) ateş ikonu ekle.
2.  [ ] **Kutlama Modalları:**
    *   Level atlayınca konfetili "Tebrikler!" popup'ı.
    *   Ses efektleri (başarı sesi).

### FAZ 4: Liro "Mentor" Modu
1.  [ ] **Liro Persona Güncellemesi:**
    *   Liro'nun sistem promptuna kullanıcının **Level** ve **XP** bilgisini inject et.
    *   Liro'nun "Tebrik ederim, Level 12 oldun!" gibi yorumlar yapmasını sağla.

## 9. Önerilen Teknoloji Yığını Eklentileri
*   **Frontend Animasyon:** `framer-motion` (Akıcı geçişler için).
*   **Konfeti:** `canvas-confetti` (Hafif ve etkili kutlama efekti).
*   **Ses:** Basit HTML5 Audio API (UI sesleri için).

Bu plan, LingRoot'u teknik bir araçtan, duygusal bir deneyime dönüştürecektir.
