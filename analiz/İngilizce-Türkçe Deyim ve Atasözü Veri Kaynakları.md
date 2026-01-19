# **İngilizce-Türkçe Dilbilimsel Kaynaklar İçin Kapsamlı Mimari Rapor: Cümle Kalıpları, Deyimler ve Atasözleri**

## **1\. Yönetici Özeti ve Mimari Strateji**

İngilizce ve Türkçe gibi yapısal olarak birbirinden derin farklılıklar gösteren iki dil arasında (Hint-Avrupa ve Ural-Altay dil aileleri), deyimsel ve kalıpsal ifadelerin doğru eşleştirilmesi, basit sözlük çevirisinin ötesinde, bağlamsal ve kültürel bir veri mühendisliği gerektirmektedir. Projenizin temel hedefi olan "tek seferde veritabanına yazma ve oradan kullanma" (Write-Once-Read-Many) prensibi, performans, maliyet yönetimi ve sistem kararlılığı açısından en optimum stratejidir. Gerçek zamanlı API bağımlılıkları, özellikle yüksek trafikli uygulamalarda gecikme süresi (latency) ve öngörülemeyen maliyetler yaratırken, statik ve iyi yapılandırılmış bir yerel veritabanı, milisaniyeler mertebesinde sorgu yanıtları sunar.

Bu rapor, projenizin ihtiyaç duyduğu üç temel dilbilimsel varlık sınıfını (Cümle Kalıpları, Atasözleri, Deyimler) kapsayan, ücretsiz ve açık kaynaklı veri havuzlarını, bunların veritabanına entegrasyon yöntemlerini ve eksik verilerin tamamlanması için kullanılabilecek sentetik veri üretim stratejilerini derinlemesine incelemektedir. Araştırma sonuçları, tek bir "altın standart" dosyanın indirilip kullanılmasından ziyade, üç ana veri sütununun hibrit bir mimaride birleştirilmesinin gerekliliğini ortaya koymaktadır:

1. **Otoriter Statik Kaynaklar:** Türk Dil Kurumu (TDK) verilerine dayanan Emre Okçular veri seti gibi yüksek güvenilirlikli kaynaklar.1  
2. **Topluluk Tabanlı Paralel Derlemler:** Tatoeba ve Wiktionary (Kaikki.org) gibi, milyonlarca kullanıcı tarafından zenginleştirilmiş, makine tarafından okunabilir (JSON/CSV) veri dökümleri.3  
3. **Sentetik Zenginleştirme (LLM):** Statik listelerde bulunması zor olan, bağlama dayalı "Cümle Kalıpları"nın (Sentence Patterns) GPT-4o-mini veya Gemini Flash gibi düşük maliyetli yapay zeka modelleri ile üretilip veritabanına işlenmesi.5

Aşağıdaki bölümler, bu kaynakların her birini teknik özellikler, veri şemaları, lisanslama modelleri ve entegrasyon zorlukları açısından en ince detayına kadar analiz etmektedir.

## ---

**2\. Dilbilimsel Uçurum ve Veri Hizalama Problemleri**

Veri kaynaklarını teknik olarak incelemeden önce, İngilizce ve Türkçe arasındaki yapısal farkların veritabanı şemasını nasıl etkileyeceğini anlamak kritiktir. Projenizde "Cümle Kalıpları" olarak tanımladığınız varlıklar, iki dil arasında birebir kelime karşılığına sahip değildir.

### **2.1 Analitik ve Bitişken Dillerin Çatışması**

İngilizce, anlamı kelime sırası ve yardımcı fiillerle (auxiliary verbs) sağlayan analitik bir dildir. Türkçe ise kök kelimelere eklenen soneklerle (suffixes) anlam üreten bitişken (agglutinative) bir dildir. Bu durum, veritabanına kaydedilecek "kalıp" verisinin yapısını doğrudan etkiler.

Örneğin, "I am going to..." kalıbı İngilizcede üç kelimeden oluşur ve "gelecek zaman niyeti" bildirir. Türkçede ise bu kalıp, fiile eklenen "-ecek/-acak" eki ve şahıs eki "-im/-ım" ile karşılanır (*Gideceğim*). Veritabanında bu kalıbı saklarken, İngilizce tarafında "Text" tabanlı bir şablon (I am going to {VERB}), Türkçe tarafında ise morfolojik bir kural seti ({VERB\_ROOT} \+ {FUTURE\_SUFFIX} \+ {PERSON}) veya bu kuralı temsil eden statik karşılıklar saklanmalıdır. Araştırmalar, bu tür yapısal dönüşümlerin en iyi "Paralel Cümle Çiftleri" (Parallel Corpora) üzerinden modellenebileceğini göstermektedir.7

### **2.2 Deyimsel ve Kültürel Haritalama**

Deyimler ve atasözleri, sözlük anlamlarının ötesinde mecazi (figurative) anlamlar taşır. Araştırma verileri, deyimlerin "Literal" (Gerçek) ve "Figurative" (Mecazi) olarak ayrılmasının önemini vurgulamaktadır. Örneğin, "Break a leg" ifadesi veritabanında sadece "İyi şanslar" veya "Şeytanın bacağını kır" olarak değil, aynı zamanda tiyatro jargonundaki kökeniyle birlikte saklanmalıdır. İTÜ NLP Laboratuvarı tarafından geliştirilen veri setleri, bu ayrımı yapabilen "Potansiyel Deyimsel İfadeler" (PIEs) kavramını literatüre kazandırmıştır.5 Bu, projenizin sadece bir çeviri aracı değil, bir dil öğrenim asistanı olması durumunda kritik bir veri niteliğidir.

## ---

**3\. Statik Veri Kaynakları: Derinlemesine Analiz**

Projenizin "bir kere indir, veritabanına kur" gereksinimi için en uygun kaynaklar, topluluklar veya akademik kurumlar tarafından derlenmiş statik veri dökümleridir. Bu bölümde, projeniz için en yüksek değere sahip veri setleri detaylandırılmıştır.

### **3.1 Emre Okçular Veri Seti (Türkçe Deyimler ve Atasözleri)**

Türkçe doğal dil işleme (NLP) topluluğunda, deyimler ve atasözleri için referans kabul edilen en kapsamlı ve erişilebilir kaynak, Emre Okçular tarafından GitHub ve Kaggle üzerinde yayınlanan veri setidir.1 Bu veri setinin en büyük avantajı, tanımların Türk Dil Kurumu (TDK) standartlarına uygun olmasıdır.

#### **3.1.1 Veri Yapısı ve İçerik Analizi**

Veri seti genellikle csv formatında sunulur ve yaklaşık 13.604 adet benzersiz kayıt içerir. Veritabanı şemanız için kritik olan alanlar şunlardır:

* **soz\_id:** Her deyim veya atasözü için TDK veritabanından alınan benzersiz kimlik numarası. Bu ID, verilerinizi güncellerken referans noktanız olacaktır.  
* **sozum:** Deyimin veya atasözünün kendisi (Örn: "Aba altından sopa göstermek").  
* **anlami:** İfadenin detaylı açıklaması.  
* **turu2:** İfadenin kategorisi. Bu alan, veriyi "Deyim" veya "Atasözü" olarak filtrelemenize olanak tanır. İstatistiksel olarak veri setinin %82'si deyim, %18'i atasözüdür.1  
* **anahtar:** Arama fonksiyonları için kritik olan anahtar kelimeler.

#### **3.1.2 Entegrasyon Stratejisi**

Bu veri seti mükemmel bir Türkçe kaynak olmakla birlikte, "İngilizce Karşılıklar" sütununu içermemektedir. Projeniz için bu veri setini kullanırken izlemeniz gereken strateji şudur:

1. CSV dosyasını indirin ve turkish\_idioms tablosuna aktarın.  
2. Bu tablodaki her bir Türkçe deyim için, aşağıda detaylandırılacak olan "Sentetik Veri Üretimi" (Bölüm 5\) veya "Wiktionary Eşleştirmesi" yöntemlerini kullanarak İngilizce karşılıklarını oluşturun ve english\_equivalents sütununu güncelleyin. Bu, tamamen doğrulanmış ve zengin bir çift yönlü sözlük oluşturmanın en güvenilir yoludur.

### **3.2 Wiktionary ve Kaikki.org (Yapılandırılmış Sözlük Verisi)**

Wiktionary, dünyanın en büyük çok dilli açık sözlüğüdür, ancak ham XML verisini işlemek teknik olarak çok zordur. **Kaikki.org** projesi, Wiktionary'nin İngilizce sürümünü tarayarak, makine tarafından okunabilir, yüksek yapılı JSONL (JSON Lines) formatına dönüştürmektedir.4 Bu, projeniz için "altın madeni" niteliğindedir.

#### **3.2.1 Veri Zenginliği ve JSON Yapısı**

Kaikki.org üzerinden indirebileceğiniz kaikki.org-dictionary-English.jsonl dosyası, İngilizce kelimelerin, deyimlerin ve atasözlerinin diğer dillerdeki karşılıklarını içerir. Bir JSON satırı şu şekilde detaylı bilgi sunar:

* **word:** İngilizce ifade (Örn: "actions speak louder than words").  
* **senses:** Kelimenin farklı anlamları. Her anlam için ayrı çeviriler bulunur. Bu, "run" gibi çok anlamlı kelimelerin (koşmak, işletmek, akmak) doğru çevrilmesi için hayati önem taşır.  
* **translations:** Bu nesne içinde, code: "tr" filtresi uygulayarak o ifadenin Türkçe karşılığını çekebilirsiniz.  
  * *Örnek Veri:* İngilizce "absence makes the heart grow fonder" atasözü için veri seti, Türkçe karşılık olarak "gözden ırak olan gönülden de ırak olur" ifadesini sunmaktadır.10 Dikkat edilirse, bu birebir çeviri değil, kültürel karşılıktır; projenizin kalitesi için aranan nitelik budur.

#### **3.2.2 İndirme ve İşleme Yöntemi**

1. Kaikki.org'dan İngilizce JSONL dökümünü indirin (yaklaşık 1-2 GB).  
2. Bir Python betiği ile dosyayı satır satır okuyun.  
3. Filtreleme mantığı:  
   * Eğer categories alanı "English idioms", "English proverbs" veya "English phrasal verbs" içeriyorsa;  
   * VE translations dizisinde code: "tr" (Türkçe) varsa;  
   * Bu kaydı veritabanınıza english\_phrase, turkish\_translation, category alanlarıyla kaydedin.  
4. Bu yöntemle, binlerce İngilizce-Türkçe deyim ve atasözü çiftini ücretsiz ve lisanslı olarak elde edebilirsiniz.

### **3.3 Tatoeba Projesi (Cümle Kalıpları İçin Paralel Korpus)**

Kullanıcının "Cümle Kalıpları" isteği için en uygun kaynak Tatoeba'dır. Tatoeba, gönüllüler tarafından oluşturulan devasa bir cümle çifti veritabanıdır.3

#### **3.3.1 Veri Hacmi ve Format**

Tatoeba, eng-tur.tsv (Tab-Separated Values) formatında indirilebilir dosyalar sunar. Mevcut durumda 522.400'den fazla İngilizce-Türkçe cümle çifti bulunmaktadır.12 Bu hacim, nadir cümle kalıplarını bile yakalamak için yeterlidir.

#### **3.3.2 Kalite Kontrol ve Filtreleme**

Tatoeba verisi kitle kaynaklı (crowdsourced) olduğu için hatalar içerebilir. Araştırma notları, verinin kalitesini artırmak için şu filtrelerin uygulanmasını önerir 3:

* **ownership Filtresi:** Sadece "native speaker" (anadil konuşucusu) olarak işaretlenmiş kullanıcıların cümlelerini veya onaylanmış cümleleri seçin.  
* **Uzunluk Filtresi:** Çok kısa (1-2 kelimelik) cümleler genellikle bağlamsızdır. 5-15 kelime arası cümleler, kalıpları öğretmek için idealdir.

#### **3.3.3 Kalıp Madenciliği (Pattern Mining)**

Tatoeba verisini veritabanına attıktan sonra, SQL sorguları ile cümle kalıplarını çıkarabilirsiniz. Örneğin "I used to..." kalıbını öğretmek istiyorsanız:

* *Sorgu:* SELECT \* FROM sentences WHERE english\_text LIKE 'I used to %'  
* Sonuç: "I used to smoke." \-\> "Eskiden sigara içerdim.", "I used to live here." \-\> "Eskiden burada yaşardım."  
  Bu yöntem, kullanıcıya bir kalıbın farklı bağlamlarda nasıl Türkçeye çevrildiğini (genellikle "-erdim/-ardım" ekiyle) göstermek için eşsiz bir kaynaktır.

### **3.4 Akademik ve Diğer Kaynaklar**

* **Bilkent Turkish Writings Dataset:** Öğrencilerin yazdığı kompozisyonlardan oluşan bu veri seti, daha karmaşık ve akademik cümle yapılarını analiz etmek için kullanılabilir.13  
* **KazParC ve OPUS:** Makine çevirisi için hazırlanan bu paralel korpuslar, Tatoeba'ya göre daha resmi ve temiz bir dil içerir.14 Hukuki veya teknik cümle kalıpları için bu kaynaklar tercih edilmelidir.

## ---

**4\. Dinamik Çözümler: Ücretsiz API Ekosistemi**

Veritabanınızı statik verilerle doldurduktan sonra, veritabanında bulunmayan bir cümle kalıbı veya deyim sorgulandığında sistemin cevap verebilmesi için "Yedek" (Fallback) mekanizması olarak API'lere ihtiyaç duyabilirsiniz. Kullanıcının "Ücretsiz API" talebi doğrultusunda en iyi seçenekler şunlardır:

### **4.1 LibreTranslate (Kendi Sunucunuzda Ücretsiz)**

Ücretsiz ve sınırsız API kullanımı için en iyi mimari çözüm **LibreTranslate** projesidir.16

* **Çalışma Prensibi:** Açık kaynaklıdır ve Argos Translate motorunu kullanır.  
* **Maliyet:** Tamamen ücretsizdir, ancak kendi sunucunuzda (veya yerel makinenizde) Docker konteynerı olarak çalıştırmanız gerekir.  
* **Avantajı:** Dış dünyaya veri göndermediği için gizlilik sağlar ve Google/DeepL gibi karakter limiti (kota) uygulamaz.  
* **Kullanım Senaryosu:** Veritabanını ilk kez doldururken (bootstrapping) milyonlarca cümleyi çevirmek için idealdir. Ticari API'lerle bu işlem binlerce dolar tutabilirken, LibreTranslate ile sadece elektrik maliyeti vardır.  
* **Dezavantajı:** Çeviri kalitesi, özellikle karmaşık deyimlerde DeepL veya Google kadar yüksek olmayabilir.

### **4.2 DeepL API (Free Tier)**

Kalite açısından endüstri standardıdır.17

* **Limit:** Ayda 500.000 karakter ücretsiz kullanım hakkı verir.  
* **Strateji:** Bu limit, tüm veritabanını çevirmek için yetersizdir. Ancak, Emre Okçular veri setindeki en popüler 5.000 deyimin İngilizce tanımlarını oluşturmak veya veritabanındaki "günün deyimi" gibi özellikleri yüksek kalitede sunmak için stratejik olarak kullanılabilir.

### **4.3 Google Translate API**

Google'ın da aylık 500.000 karakterlik ücretsiz bir katmanı vardır. Türkçe dil desteği morfolojik açıdan çok güçlüdür. LibreTranslate'in yetersiz kaldığı, DeepL'in kotasının dolduğu durumlarda üçüncü yedek olarak sisteme entegre edilebilir.

## ---

**5\. Sentetik Veri Üretimi: LLM Destekli Kalıp Oluşturma**

Araştırmalar, "Cümle Kalıpları"nın (Sentence Patterns) statik listeler halinde bulunmasının zor olduğunu göstermektedir. Çoğu kaynak ya sadece kelime ya da tam cümle listesidir. Aradaki "yapısal iskeleti" (Örn: *It is no use \[Verb+ing\]*) elde etmek için en verimli yöntem, **Generative AI (Üretken Yapay Zeka)** kullanmaktır.

### **5.1 Maliyet ve Verimlilik Analizi**

GPT-4o-mini veya Google Gemini 1.5 Flash gibi modern "hafif" modeller, çeviri ve yapısal analiz konusunda son derece yeteneklidir ve maliyetleri ihmal edilebilir düzeydedir.6

* **Maliyet Hesabı:** 10.000 adet cümle kalıbı ve örneğini üretmek (yaklaşık 500.000 token), GPT-4o-mini ile **1 ABD Dolarından** daha az tutmaktadır. Gemini Flash ile bu maliyet **0.50 ABD Doları** civarındadır.  
* **Neden Gerekli?** Hazır CSV dosyaları genellikle "bağlamdan" yoksundur. LLM kullanarak, veritabanınıza tam olarak istediğiniz JSON şemasında, dilbilgisi notları ve ruh hali (mood) etiketleri eklenmiş veri üretebilirsiniz.

### **5.2 Üretim Hattı (Pipeline) Önerisi**

Projeniz için Python tabanlı bir "Veri Üretim Betiği" hazırlamanız önerilir. Bu betik şu adımları izlemelidir:

1. **İstem (Prompt) Mühendisliği:** Modele şu rolü verin: *"Sen uzman bir İngilizce-Türkçe dilbilimcisin. Bana 'Regret' (Pişmanlık) temalı 50 farklı İngilizce cümle kalıbı listele."*  
2. **Yapısal Çıktı:** Çıktıyı kesinlikle JSON formatında isteyin.  
   JSON  
   {  
     "pattern\_en": "I should have \[Verb V3\]",  
     "pattern\_tr": "\[Fiil\]-meliydim",  
     "example\_en": "I should have studied harder.",  
     "example\_tr": "Daha sıkı çalışmalıydım.",  
     "difficulty": "B2",  
     "grammar\_note": "Geçmişte yapılmayan bir eylemden duyulan pişmanlığı belirtir."  
   }

3. **Toplu İşleme:** Bu betiği farklı duygu durumları (İstek, Zorunluluk, Tavsiye, İhtimal) için döngüye sokarak, birkaç saat içinde piyasada bulunmayan özgünlükte ve kalitede 5.000+ kayıttan oluşan bir "Cümle Kalıpları" veritabanı oluşturabilirsiniz.20

## ---

**6\. Cümle Kalıpları Kataloğu ve Yapısal Analiz**

Eğitim materyalleri ve dilbilimsel araştırmalar ışığında 22, veritabanınızda mutlaka bulunması gereken yüksek frekanslı kalıp kategorileri aşağıda analiz edilmiştir. Bu kalıplar, kullanıcıların konuşma becerilerini en hızlı geliştiren yapılardır.

### **6.1 Modal ve Koşul Kalıpları**

* **Kalıp:** It is no use \[Verb+ing\]  
  * *Türkçe Yapı:* \[Fiil\]-menin bir faydası yok / Boşuna \[Fiil\]-me  
  * *Veri Kaynağı:* Tatoeba'da "no use crying" gibi örneklerle sıkça geçer. Bu kalıp, eylemin anlamsızlığını vurgular.  
* **Kalıp:** I would rather \[Verb A\] than  
  * *Türkçe Yapı:* \-mektense \[Fiil A\]-meyi tercih ederim  
  * *Dilbilimsel Not:* İngilizcedeki kelime sırasının Türkçede nasıl tersine döndüğünü gösteren mükemmel bir örnektir. Veritabanında bu tersine dönüşü vurgulayan bir "Mapping" alanı olmalıdır.

### **6.2 Duygu ve Tepki Kalıpları**

* **Kalıp:** I'm looking forward to \[Noun / Verb+ing\]  
  * *Türkçe Yapı:* \[Nesne\]-i dört gözle bekliyorum  
  * *Kültürel Not:* İngilizcedeki "öne doğru bakmak" (look forward) deyimsel fiili, Türkçeye "dört gözle beklemek" deyimiyle çevrilir. Bu, kelime çevirisinin yetersiz kaldığı durumlar için kritik bir veridir.24  
* **Kalıp:** I can't help \[Verb+ing\]  
  * *Türkçe Yapı:* Kendimi \[Fiil\]-mekten alamıyorum

### **6.3 Varlık ve Olasılık Kalıpları**

* **Kalıp:** There is no point in... \-\> *...-in bir anlamı yok.*  
* **Kalıp:** It is likely that... \-\> *Muhtemelen...* veya *...-mesi muhtemel.*

## ---

**7\. Veritabanı Tasarımı ve Entegrasyon**

"Bir kere yaz, oradan kullan" hedefi için ilişkisel bir veritabanı (PostgreSQL veya SQLite) en uygun yapıdır. Verilerin bütünlüğü ve sorgu hızı için aşağıdaki şema önerilmektedir.

### **7.1 Önerilen Veritabanı Şeması**

Bu şema, hem statik listeleri hem de Tatoeba gibi kaynaklardan gelen örnek cümleleri ilişkisel olarak bağlar.

| Tablo Adı | Alan (Column) | Veri Tipi | Açıklama |
| :---- | :---- | :---- | :---- |
| **idioms\_proverbs** | id | INT (PK) | Benzersiz Kimlik |
|  | type | ENUM | 'Idiom', 'Proverb', 'Phrasal Verb' |
|  | text\_en | VARCHAR | İngilizce Orijinal Metin |
|  | text\_tr | VARCHAR | Türkçe Karşılık (Emre Okçular/Kaikki verisi) |
|  | literal\_meaning | TEXT | Varsa kelime anlamı |
|  | cultural\_note | TEXT | Kültürel bağlam notu |
|  | source\_id | VARCHAR | Kaynak referansı (TDK ID vb.) |
| **sentence\_patterns** | id | INT (PK) |  |
|  | pattern\_structure | VARCHAR | Örn: "It is no use {VERB\_ING}" |
|  | tr\_mapping\_rule | VARCHAR | Örn: "{VERB}-menin faydası yok" |
|  | difficulty\_level | INT | 1 (A1) \- 5 (C2) |
|  | category | VARCHAR | 'Regret', 'Advice', 'Future Plan' |
| **examples** | id | INT (PK) |  |
|  | parent\_id | INT (FK) | İlgili deyim veya kalıbın ID'si |
|  | sentence\_en | TEXT | Tam İngilizce cümle (Tatoeba'dan) |
|  | sentence\_tr | TEXT | Türkçe çevirisi |
|  | is\_verified | BOOLEAN | Doğrulanmış veri mi? |

### **7.2 Veri Akış Diyagramı (Data Flow)**

1. **Ingestion (Veri Alımı):** Python betikleri turkish\_idioms\_and\_proverbs.csv, kaikki.jsonl ve tatoeba.tsv dosyalarını okur.  
2. **Normalization (Normalizasyon):** Veriler temizlenir, mükerrer kayıtlar silinir. İngilizce ve Türkçe deyimler "fuzzy matching" (bulanık eşleştirme) algoritmalarıyla birbirine bağlanır.  
3. **Seed (Tohumlama):** Temizlenmiş veri SQL veritabanına INSERT edilir.  
4. **Enrichment (Zenginleştirme):** Eksik alanlar (örneğin sadece İngilizcesi olan bir kalıbın Türkçesi) LibreTranslate veya GPT-4o-mini API kullanılarak doldurulur ve veritabanı güncellenir.  
5. **Serving (Sunum):** Uygulama katmanı, artık dış ağa ihtiyaç duymadan doğrudan yerel SQL sorguları ile milisaniyeler içinde cevap verir.

## ---

**8\. Sonuç**

Projenizin başarısı için gerekli olan tüm bileşenler açık kaynak dünyasında mevcuttur. Tek bir dosya indirmek yerine, **Emre Okçular** veri setini Türkçe temel, **Kaikki.org** verisini İngilizce-Türkçe köprü, ve **Tatoeba** verisini bağlamsal örnek havuzu olarak kullanan üç aşamalı bir mimari kurgulamanız gerekmektedir.

Bu yaklaşım, API maliyetlerini sıfıra indirirken, veri kalitesini ve sistem performansını maksimize eder. Özellikle **GPT-4o-mini** gibi modellerin sentetik veri üretimi için kullanılması, projenizi rakiplerinden ayıran "akıllı dilbilgisi notları" ve "zengin içerik" avantajını 1 doların altında bir maliyetle size sunacaktır. Önerilen veritabanı şeması ve entegrasyon stratejisi ile projeniz, sadece bir sözlük değil, kapsamlı bir dil öğrenim platformu altyapısına sahip olacaktır.

### **Kaynakça ve Atıflar**

Bu raporda kullanılan veriler ve analizler, aşağıdaki kaynaklara dayanmaktadır:

* 1 Emre Okçular Türkçe Deyimler ve Atasözleri Veri Seti.  
* 5 İTÜ NLP Laboratuvarı Deyim Derlemleri ve PIE Analizleri.  
* 3 Tatoeba Projesi ve Paralel Cümle İstatistikleri.  
* 4 Kaikki.org ve Wiktionary JSON Veri Dökümleri.  
* 16 LibreTranslate ve DeepL API Dokümantasyonları.  
* 6 OpenAI ve Google Cloud Fiyatlandırma Tabloları.  
* 22 Dil Öğrenimi ve Cümle Kalıpları Eğitim Materyalleri.

#### **Alıntılanan çalışmalar**

1. Turkish Idioms and Proverbs \- Kaggle, erişim tarihi Aralık 26, 2025, [https://www.kaggle.com/datasets/emreokcular/turkish-idioms-and-proverbs](https://www.kaggle.com/datasets/emreokcular/turkish-idioms-and-proverbs)  
2. Emre Okcular Personal Website | Portfolio, erişim tarihi Aralık 26, 2025, [https://www.okcular.com.tr/](https://www.okcular.com.tr/)  
3. Bilingual Sentence Pairs (From the Corpus Created by the Tatoeba Project) \- ManyThings.org, erişim tarihi Aralık 26, 2025, [https://www.manythings.org/bilingual/](https://www.manythings.org/bilingual/)  
4. Raw data downloads extracted from Wiktionary \- Kaikki.org, erişim tarihi Aralık 26, 2025, [https://kaikki.org/dictionary/rawdata.html](https://kaikki.org/dictionary/rawdata.html)  
5. itunlplab/idiom-corpus-llm \- GitHub, erişim tarihi Aralık 26, 2025, [https://github.com/itunlplab/idiom-corpus-llm](https://github.com/itunlplab/idiom-corpus-llm)  
6. Azure OpenAI Service \- Pricing, erişim tarihi Aralık 26, 2025, [https://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/)  
7. English & Turkish Sentence Transformation | PDF | Phrase | Syntax \- Scribd, erişim tarihi Aralık 26, 2025, [https://www.scribd.com/doc/201942119/How-English-and-Turkish-Simple-Sentences-Are-Transformed-Into-Nominal-Phrases-signed](https://www.scribd.com/doc/201942119/How-English-and-Turkish-Simple-Sentences-Are-Transformed-Into-Nominal-Phrases-signed)  
8. 053 What Do You Do PDF | PDF | Verb | Subject (Grammar) \- Scribd, erişim tarihi Aralık 26, 2025, [https://www.scribd.com/document/375748343/053-what-do-you-do-pdf](https://www.scribd.com/document/375748343/053-what-do-you-do-pdf)  
9. JSON data structure browser, subpage: categories \- Kaikki.org, erişim tarihi Aralık 26, 2025, [https://kaikki.org/dictionary/errors/mapping/index/senses/\_list\_/categories.html](https://kaikki.org/dictionary/errors/mapping/index/senses/_list_/categories.html)  
10. "absence makes the heart grow fonder" meaning in English \- Kaikki.org, erişim tarihi Aralık 26, 2025, [https://kaikki.org/dictionary/English/meaning/a/ab/absence%20makes%20the%20heart%20grow%20fonder.html](https://kaikki.org/dictionary/English/meaning/a/ab/absence%20makes%20the%20heart%20grow%20fonder.html)  
11. Tatoeba: Collection of sentences and translations, erişim tarihi Aralık 26, 2025, [https://tatoeba.org/en/](https://tatoeba.org/en/)  
12. English-Turkish Sentences from the Tatoeba Project \- ManyThings.org, erişim tarihi Aralık 26, 2025, [https://www.manythings.org/bilingual/tur/](https://www.manythings.org/bilingual/tur/)  
13. selimfirat/bilkent-turkish-writings-dataset: Compilation of Turkish writings dataset that promotes creativity, content, composition, grammar, spelling and punctuation. \- GitHub, erişim tarihi Aralık 26, 2025, [https://github.com/selimfirat/bilkent-turkish-writings-dataset](https://github.com/selimfirat/bilkent-turkish-writings-dataset)  
14. issai/kazparc · Datasets at Hugging Face, erişim tarihi Aralık 26, 2025, [https://huggingface.co/datasets/issai/kazparc](https://huggingface.co/datasets/issai/kazparc)  
15. ahelk/ccaligned\_multilingual · Datasets at Hugging Face, erişim tarihi Aralık 26, 2025, [https://huggingface.co/datasets/ahelk/ccaligned\_multilingual](https://huggingface.co/datasets/ahelk/ccaligned_multilingual)  
16. LibreTranslate \- Free and Open Source Machine Translation API, erişim tarihi Aralık 26, 2025, [https://libretranslate.com/](https://libretranslate.com/)  
17. Translate from English to Turkish with DeepL, erişim tarihi Aralık 26, 2025, [https://www.deepl.com/en/translator/l/en/tr](https://www.deepl.com/en/translator/l/en/tr)  
18. API Pricing \- OpenAI, erişim tarihi Aralık 26, 2025, [https://openai.com/api/pricing/](https://openai.com/api/pricing/)  
19. Gemini 1.5 Flash 8B \- half the price of 1.5 Flash. Google is really testing the limits on price : r/Bard \- Reddit, erişim tarihi Aralık 26, 2025, [https://www.reddit.com/r/Bard/comments/1fxsr7b/gemini\_15\_flash\_8b\_half\_the\_price\_of\_15\_flash/](https://www.reddit.com/r/Bard/comments/1fxsr7b/gemini_15_flash_8b_half_the_price_of_15_flash/)  
20. GPT-4 \- OpenAI, erişim tarihi Aralık 26, 2025, [https://openai.com/index/gpt-4-research/](https://openai.com/index/gpt-4-research/)  
21. Generating bilingual example sentences with large language models as lexicography assistants \- arXiv, erişim tarihi Aralık 26, 2025, [https://arxiv.org/html/2410.03182v1](https://arxiv.org/html/2410.03182v1)  
22. (Audio Lessons) 100 Common English Phrases and Sentence Patterns With Dialogue, erişim tarihi Aralık 26, 2025, [https://basicenglishspeaking.com/100-common-phrases-and-sentence-patterns/](https://basicenglishspeaking.com/100-common-phrases-and-sentence-patterns/)  
23. Sentence Pattens | PDF | Adjective | Linguistic Morphology \- Scribd, erişim tarihi Aralık 26, 2025, [https://www.scribd.com/document/928444343/Sentence-Pattens](https://www.scribd.com/document/928444343/Sentence-Pattens)  
24. Common Phrasal Verbs List | PDF | Phrase \- Scribd, erişim tarihi Aralık 26, 2025, [https://www.scribd.com/document/458045605/Phrasal-Verbs-List-docx](https://www.scribd.com/document/458045605/Phrasal-Verbs-List-docx)  
25. Basic Turkish Words Phrases Etu PDF | PDF | Language Arts & Discipline \- Scribd, erişim tarihi Aralık 26, 2025, [https://www.scribd.com/document/327205362/basic-turkish-words-phrases-etu-pdf](https://www.scribd.com/document/327205362/basic-turkish-words-phrases-etu-pdf)