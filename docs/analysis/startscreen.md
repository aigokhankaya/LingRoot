Lingroot uygulamasında login sonrası kullanıcıyı ilk ses üretimine yönlendiren yeni bir Start ekranı geliştir.

Amaç:
Kullanıcı login olduktan sonra mevcut Home ekranına doğrudan düşmemeli.
Kullanıcı önce 3 farklı ücretsiz başlangıç üretimini tamamlamalı:

1. Text to Speech
2. Podcast
3. Topic

Bu 3 başlangıç üretimi tamamlanmadan Home ekranı gösterilmemeli.
Ancak Home dışındaki diğer ekranlara erişim korunmalı.

Mevcut Home ekranı yerine geçici olarak “Start” adlı yeni bir ekran gösterilecek.

Önemli veritabanı kararı:
Yeni bir tablo oluşturulmayacak.
Start/onboarding üretim ilerleme bilgisi mevcut user_settings tablosunda tutulacak.

user_settings tablosunda kullanıcı bazında kaç adet Start üretimi tamamlandığı saklanmalı.

Önerilen alan:
start_generation_count

Değerler:
0 = Hiç Start üretimi yapılmadı
1 = Bir Start üretimi tamamlandı
2 = İki Start üretimi tamamlandı
3 = Üç Start üretimi tamamlandı, Home erişimi açılır

Eğer user_settings tablosunda JSON/preferences/settings benzeri bir alan varsa, bu bilgi orada da tutulabilir.
Ancak yeni tablo oluşturma.

Mevcut audio/content/history tabloları aynen kullanılmalı.
Üretilen ses kayıtları mevcut sistemde hangi tablolara yazılıyorsa aynı akış devam etmeli.

Start ekranındaki üretimler:
- Mevcut üretim tablolarına normal içerik/audio olarak kaydedilmeli.
- Ancak kullanıcının normal 3 Free hakkından düşmemeli.
- Bunun için backend tarafında onboarding/start üretimi olarak güvenli şekilde bypass yapılmalı.

Kritik güvenlik:
Frontend’den gelen “isStartGeneration” gibi basit bir flag’e güvenme.
Backend, user_settings.start_generation_count değerini kontrol etmeli.
start_generation_count 3 veya üzerindeyse Start üretimi ücretsiz olarak yapılmamalı.
Her başarılı Start üretiminden sonra start_generation_count +1 artırılmalı.

Not:
Her seçenek sadece 1 kere kullanılabilir denmişti.
Bunu sadece count ile tutmak teknik olarak yeterli değildir.
Bu yüzden yeni tablo açmadan user_settings içinde JSON alanı varsa şu yapı tercih edilmeli:

start_generation_progress = {
  "text_completed": true/false,
  "podcast_completed": true/false,
  "topic_completed": true/false,
  "count": 0/1/2/3
}

Eğer JSON alan yoksa ve tabloya kolon eklenebiliyorsa şu kolonlar eklenebilir:
- start_generation_count integer default 0
- start_text_completed boolean default false
- start_podcast_completed boolean default false
- start_topic_completed boolean default false

Yeni ayrı tablo oluşturma.
Sadece user_settings tablosunu kullan.

Tasarım:
- Mevcut Lingroot tasarım dili korunmalı.
- Mevcut renk paleti kullanılmalı:
  - Primary teal: #27BEAA
  - Accent orange: #F5A524
- Mevcut kart yapısı, radius, gölge, typography ve spacing sistemiyle uyumlu olmalı.
- Ekran mobil öncelikli tasarlanmalı.
- Start ekranı login sonrası tüm ekranı kaplamalı.
- Kullanıcıyı net şekilde yönlendiren, sade ve açıklayıcı bir onboarding/activation ekranı olmalı.

Start ekranı davranışı:
- Kullanıcıya 3 üretim seçeneği göster:
  1. Text
  2. Podcast
  3. Topic

Her seçenek sadece 1 kere kullanılabilir.
Bir seçenekle başarılı ses üretimi yapıldıktan sonra o seçenek Start ekranında disabled/completed olarak görünmeli.
Disabled kartta “Completed” durumu gösterilmeli.

3 seçenek de tamamlandığında:
- Küçük bir başarı ekranı göster:
  “Great! Your Home is now ready.”
  CTA:
  “Go to Home”
- Sonrasında kullanıcı mevcut Home ekranına yönlendirilmeli.
- Sonraki loginlerde Home normal şekilde açılmalı.

Start ekranı UI akışı:

1. Üst bölüm:
Başlık:
“Start with your first 3 audios”

Alt açıklama:
“Create one audio from each option to unlock your Home screen.”

Progress indicator:
“0/3 completed”, “1/3 completed”, “2/3 completed”, “3/3 completed”

2. Seçenek kartları:

A) Text to Speech

Açıklama:
“Paste a sentence or a longer text. Lingroot will turn it into level-based English audio.”

Input placeholder:
“Paste your text here. Example: I want to improve my English by listening every day.”

Kullanıcı burada en az bir cümle veya uzun metin girebilir.

Validation:
- Boş olamaz.
- Minimum karakter: 10
- Maksimum karakter varsa mevcut sistem limitine göre kullan.

B) Podcast

Açıklama:
“Enter a topic. Lingroot will create a 2-minute conversation between two speakers.”

Input placeholder:
“Example: The consequences of World War I”

Podcast farkı UI’da açıkça anlatılmalı:
- Podcast = two-person conversation
- İki kişi karşılıklı konuşur.
- Süre 2 dakika olur.

Validation:
- Boş olamaz.
- Minimum karakter: 5

C) Topic

Açıklama:
“Enter a topic. Lingroot will create a clear level-based English narration about it.”

Input placeholder:
“Example: How electric cars work”

Topic farkı UI’da açıkça anlatılmalı:
- Topic = single narrator explanation
- Podcast gibi iki kişilik konuşma değildir.
- Kullanıcının verdiği konu tek anlatıcıyla İngilizce açıklamaya dönüştürülür.

Validation:
- Boş olamaz.
- Minimum karakter: 5

3. Level seçimi:
Kullanıcı bir seçenek seçip gerekli input’u girdikten sonra İngilizce seviyesini seçmeli.

Seviyeler:
A1, A2, B1, B2, C1, C2

Seçim UI:
- Chip / segmented button olabilir
- Varsayılan seviye olmayacak. Kullanıcının bu seçeneklerden birini seçmesi zorunlu olacak.


4. Create butonu:
Buton metni:
“Create Audio”

Butona basınca:
- Seçilen tipe göre mevcut ses üretim API’sine uygun payload gönder.
- Üretimi sıraya al.
- Mevcut uygulamada kullanılan “audio generation is queued / processing” uyarısı veya loader yapısı aynen kullanılmalı.
- Kullanıcı üretim beklerken mevcut sistemdeki bekleme/uyarı deneyimi korunmalı.
- Başarılı üretimden sonra ilgili seçenek user_settings içinde completed yapılmalı.
- start_generation_count güncellenmeli.
- Start ekranı progress değeri güncellenmeli.
- İlgili kart disabled/completed hale gelmeli.
- Mevcuttaki ses üretimi sonrası bildiriminin aynısı burada da olmalı

Ses ve üretim ayarları:

Text:
- type: text_to_speech veya mevcut sistemdeki karşılığı
- voice: Gold kadın İngiliz-2
- voice seçimi kullanıcıya gösterilmez
- level: kullanıcının seçtiği CEFR seviyesi
- input: kullanıcının girdiği metin

Podcast:
- type: podcast
- duration: 2 minutes
- host_voice: Ses 2 (K)
- guest_voice: Ses 4 (E)
- voice seçimi kullanıcıya gösterilmez
- level: kullanıcının seçtiği CEFR seviyesi
- topic: kullanıcının girdiği konu
- output format: two-speaker dialogue/conversation

Topic:
- type: topic_narration veya mevcut sistemdeki karşılığı(konu ağacı değil, konu öner veya hobi seçeneği)
- voice: Gold kadın İngiliz-2
- voice seçimi kullanıcıya gösterilmez
- level: kullanıcının seçtiği CEFR seviyesi
- topic: kullanıcının girdiği konu
- output format: single speaker narration

Usage/free limit davranışı:
Bu Start ekranından yapılan 3 üretim kullanıcının normal free kullanım hakkından düşmemeli.

Eğer mevcut usage decrement veya subscription usage kontrolü varsa:
- onboarding/start üretimleri için usage decrement bypass edilmeli.
- Bu bypass backend tarafında yapılmalı.
- Backend user_settings içindeki start progress/count bilgisini kontrol etmeli.
- Aynı type ikinci kez ücretsiz üretilmemeli.
- start_generation_count 3 olduğunda ücretsiz Start üretimi kapanmalı.

Routing:
- Login sonrası kullanıcı yönlendirmesi kontrol edilmeli.
- user_settings kaydı yoksa mevcut sistem standardına göre oluştur veya initialize et.
- Eğer start_generation_count < 3 ise Home route yerine Start route göster.
- Eğer start_generation_count >= 3 ise mevcut Home ekranı göster.
- Bottom navigation’da Home’a basıldığında da aynı kontrol çalışmalı:
  - start_generation_count < 3 ise Start
  - start_generation_count >= 3 ise Home

Home dışındaki ekranlar:
- Kullanıcı Home dışındaki diğer ekranlara erişebilmeli.
- Global navigation tamamen kilitlenmemeli.
- Sadece Home içeriği Start ekranıyla değiştirilmiş olmalı.

Önemli UX önerileri:
1. Bu akış kullanıcıyı uygulamadan tamamen kilitlememeli. Sadece Home yerine Start gösterilmeli.
2. Podcast ve Topic ayrımı UI’da çok net yazılmalı:
   - Podcast = two-person conversation
   - Topic = single narrator explanation
3. Her kartta örnek input/hint görünmeli. Kullanıcı “ne yazacağım?” sorusunu cevaplamadan ilerlemek zorunda kalmamalı.
4. 3 üretim tamamlanınca başarı ekranı gösterilmeli:
   “Great! Your Home is now ready.”
5. Frontend disable yeterli değildir. Backend de aynı seçeneğin tekrar ücretsiz üretilmesini engellemelidir.
6. Kullanıcı ses seçimlerini görmemeli. Ses seçimleri backend payload/logic tarafında arka planda belirlenmeli.

Acceptance Criteria:
1. Yeni kullanıcı login olduktan sonra Home yerine Start ekranını görür.
2. Start ekranında Text, Podcast ve Topic seçenekleri görünür.
3. Kullanıcı Text seçtiğinde metin girmesi gerektiğini net anlar.
4. Kullanıcı Podcast seçtiğinde bunun iki kişilik 2 dakikalık konuşma olduğunu net anlar.
5. Kullanıcı Topic seçtiğinde bunun tek anlatıcılı İngilizce açıklama olduğunu net anlar.
6. Kullanıcı input girdikten sonra CEFR seviyesini seçebilir.
7. Create Audio butonu seçilen type, input ve level ile üretimi başlatır.
8. Text ve Topic için Gold kadın İngiliz-2 sesi arka planda kullanılır.
9. Podcast için Host Voice Ses 2 (K), Guest Voice Ses 4 (E) arka planda kullanılır.
10. Kullanıcı bu ses seçimlerini UI’da görmez.
11. Podcast üretimi 2 dakika olarak ayarlanır.
12. Başarılı üretimden sonra ilgili seçenek completed/disabled olur.
13. Aynı seçenek ikinci kez onboarding kapsamında ücretsiz üretilemez.
14. Üç seçenek tamamlanmadan mevcut Home ekranı gösterilmez.
15. Üç seçenek tamamlanınca başarı ekranı gösterilir ve mevcut Home ekranı erişilebilir olur.
16. Start üretimleri kullanıcının 3 Free hakkından düşmez.
17. Start progress bilgisi yeni tablo açılmadan user_settings tablosunda tutulur.
18. Mevcut audio/content/history tabloları aynen kullanılmaya devam eder.
19. Backend aynı onboarding type için tekrar ücretsiz üretimi engeller.
20. Mevcut tasarım dili ve renk paleti korunur.
21. Mevcut audio generation queued/processing uyarısı korunur.

Önce kodu incele:
- routing yapısını bul
- mevcut Home ekranı componentini bul
- mevcut audio generation API/client fonksiyonlarını bul
- mevcut usage/free limit kontrolünü bul
- mevcut user_settings tablo kullanımını bul
- mevcut content/audio/history tablo akışını bul
- mevcut voice id/name mapping’ini bul

Sonra minimal ve güvenli değişikliklerle uygula.
Mevcut çalışan üretim akışlarını bozma.
Yeni ayrı tablo oluşturma.
Start progress için sadece user_settings tablosunu kullan.