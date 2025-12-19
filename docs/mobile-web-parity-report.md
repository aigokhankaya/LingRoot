# LingRoot Mobil vs. Web Özellik Eşitleme Raporu (v4)

## Yönetici Özeti
Bu rapor, Web uygulaması ile Mobil uygulama arasındaki özellikleri karşılaştırır ve **12 kritik eksik ekranı** tanımlar. Web uygulaması (`welcome.tsx`, `dashboard.tsx`) sadece içerik tüketilen bir yer değil, aynı zamanda kapsamlı bir **"İçerik Stüdyosu"** ve **"Oyunlaştırılmış Kontrol Paneli"**dir. Mobil uygulamanın Web ile eşdeğer (parity) olabilmesi için, pasif bir oynatıcıdan; üreten, takip eden ve öneren bir yapıya dönüşmesi gerekmektedir.

## 📱 Eksik Mobil Ekranlar (Olmazsa Olmazlar Listesi)

Mobil uygulamada bulunmayan ancak Web'de aktif olarak kullanılan 12 temel ekran/fonksiyon aşağıdadır:

| # | Eksik Ekran Adı | Web Karşılığı | Gerekli Fonksiyonlar |
| :--- | :--- | :--- | :--- |
| 1 | **İlgi Alanları (InterestsScreen)** | `components/InterestManager.tsx` | Hobileri seçme/yönetme (Futbol, Teknoloji vb.). **Haber Akışı için Kritik.** |
| 2 | **Keşfet / Haber Akışı (ExploreScreen)** | `welcome.tsx` (Hobi Bölümü) | İlgi alanlarına göre güncel haberleri "Sonsuz Kaydırma" ile listeleme ve dinleme. |
| 3 | **Kullanım İstatistikleri (UsageStatsScreen)** | `components/PackageInfo.tsx` | Kalan OpenAI Token, TTS Karakter Limiti, Aylık Maliyet gösterimi. |
| 4 | **Hedefler ve Seriler (GoalsAndStreaksScreen)** | `dashboard.tsx` | Detaylı Aktivite Grafikleri, "Streak" (Seri) Takibi, Günlük İlerleme Halkası. |
| 5 | **Destek Merkezi (SupportScreen)** | `pages/destek.tsx` | Destek talebi oluşturma, geçmiş mesajlar, dosya yükleme. |
| 6 | **Bilgi ve İpuçları (InformationScreen)** | `pages/tips.tsx` | "Başarı Hikayeleri", "Günlük İpuçları", "Nasıl Kullanılır" rehberi. |
| 7 | **İçerik İçe Aktarma (ImportContentScreen)** | `pages/content-selection.tsx` | Ana oluşturma sihirbazı dışında, doğrudan "URL Yapıştır" (YouTube/Spotify) akışı. |
| 8 | **YouTube Önizleme (YouTubePreviewScreen)** | `welcome.tsx` (YouTube Sekmesi) | **Oluşturmadan önce altyazı önizleme.** Altyazıyı çek -> Düzenle -> Ses Oluştur adımları. |
| 9 | **Podcast Stüdyosu (PodcastStudioScreen)** | `welcome.tsx` (Podcast Sekmesi) | Gelişmiş kontroller: Sunucu/Konuk seçimi (Gemini/Google), Kişilik Ayarları (Meraklı/Şüpheci), Mizah Aç/Kapa. |
| 10 | **Metin Editörü (TextEditorScreen)** | `welcome.tsx` (Metin Sekmesi) | TTS öncesi metni düzenlemek için tam ekran editör. |
| 11 | **Doküman Okuyucu (DocumentReaderScreen)** | `dashboard.tsx` (Dokümanlar Sekmesi) | Yüklenen PDF/Doc metinlerini dinlerken okuyabilme özelliği. |
| 12 | **Onboarding (Başlangıç) Ekranı** | `welcome.tsx` / `register.tsx` | Kayıt sonrası akış: "Seviye Seç", "İlgi Alanı Seç", "Hedef Belirle". |

---

## 🔍 Detaylı Dashboard (Kontrol Paneli) Analizi

Web Dashboard sayfası (`dashboard.tsx`) basit bir özet sayfası değildir; uygulamanın "Kalbi" niteliğindedir. Mobil `HomeScreen` şu an çok basittir.

### 1. Üst Bölüm (Header & Profil)
*   **Web:** Kullanıcı adı, Üyelik Rozeti (Platinum/Gold), Dil Rozetleri ve arka plan görseli ile zengin bir profil alanı.
*   **Mobil:** Sadece "Merhaba {İsim}" ve basit istatistikler.
*   **Aksiyon:** Mobildeki üst alanı zenginleştirerek üyelik rozeti ve seviye göstergelerini eklemeliyiz.

### 2. İstatistik Widget'ları (Metrikler)
Mobil uygulamada bu metriklerin hiçbiri görselleştirilmemiştir:
*   **Günlük Hedef (Daily Goal):** `%` ilerleme çubuğu. (Örn: "Bugün %40 tamamlandı").
*   **Seri (Current Streak):** Ateş ikonu ile gösterilen, kullanıcının kaç gündür aralıksız girdiği. **(Oyunlaştırma için çok kritik)**
*   **Öğrenilen Kelimeler:** Toplam kelime ve öğrenilen kelime sayısı grafiği.
*   **İçerik Üretim Sayısı:** Kullanıcının oluşturduğu toplam içerik.

### 3. "Bugünün Görevleri" (Today's Tasks) Widget'ı
Web'de kullanıcıya ne yapması gerektiğini söyleyen dinamik bir liste vardır:
*   🎧 **Dinle:** "Bugün 15dk dinleme yap" (Durum: Yapıldı/Yapılmadı)
*   📖 **Oku:** "Bir makale oku"
*   ✍️ **Yaz:** "Kelime testi çöz"
*   **Eksiklik:** Mobilde kullanıcı uygulamayı açtığında ne yapacağını kendi seçmek zorunda. Bu widget kullanıcıyı yönlendirmek için **şarttır**.


### 4. Sekmelerin (Tabs) Mobil Karşılıkları
Web `Tabs` yapısı mobilde ayrı ekranlara/navigasyonlara bölünmelidir:

| Web Sekmesi (`value`) | İçerik | Mobil Karşılığı / Öneri |
| :--- | :--- | :--- |
| `reading-history` | Okuma/Dinleme Geçmişi | **Profile > Geçmiş** (HistoryScreen) |
| `achievements` | Konularım (Topic Tree) | **Profile > Konularım** (MyTopicsScreen) |
| `book` | Kitaplarım | **Library Tab** (Mevcut, geliştirilmeli) |
| `hobbies` | Hobilerim | **Profile > Hobiler** (veya InterestsScreen) |
| `podcasts` | Podcastlerim | **Library > Podcastler** (Filtre olarak) |
| `pdf` | Dokümanlarım | **Library > Dosyalar** (Filtre olarak) |
| `vocabulary` | Kelimelerim | **Vocabulary Tab** (Mevcut) |
| `paket-bilgilerim` | Kota ve Plan Detayları | **Profile > Plan & Kullanım** (UsageStatsScreen) |

### 5. Grafikler
*   **Haftalık Aktivite:** Son 7 günün aktivite çubuk grafiği.
*   **Kelime Gelişimi:** Zamanla öğrenilen kelime artış grafiği.

---

## Teknik Yol Haritası (Önceliklendirilmiş)

### Faz 1: Veri ve Kişiselleştirme ("Beyin")
1.  **İlgi Alanları (InterestsScreen):** `InterestManager` mantığını mobile taşı. Kullanıcının konu seçmesini sağla.
2.  **Plan ve Kullanım Detayları (UsageStatsScreen):** Token ve karakter limitlerini gösteren ekranı yap.

### Faz 2: Oyunlaştırma ("Kanca")
1.  **Dashboard Revizyonu (HomeScreen):**
    *   `Dashboard` widgetlarını (Goal, Streak, Tasks) ekle.
    *   API'den `UserStats` çekerek "Ateş" ikonunu ve "Günlük Halka"yı canlandır.
    *   "Bugünün Görevleri" listesini ana ekrana sabitle.

### Faz 3: Keşfet ("İçerik")
1.  **Haber Akışı (ExploreScreen):**
    *   Yeni bir Tab oluştur veya Home içinde bir bölüm yap.
    *   Seçilen ilgi alanlarına göre `getHashtagNews` servisini bağla.
    *   Kart yapısı ile haberleri göster, tek tıkla dinlet.

### Faz 4: Gelişmiş Üretim ("Stüdyo")
1.  **Podcast Stüdyosu:** `CreateScreen` içindeki Podcast modunu ayır. Web'deki gibi detaylı sunucu/kişilik seçimi ekle.
2.  **YouTube Önizleme:** YouTube linki yapıştırıldığında direkt ses üretmek yerine, önce altyazıyı çekip kullanıcıya gösteren ara ekranı yap.
