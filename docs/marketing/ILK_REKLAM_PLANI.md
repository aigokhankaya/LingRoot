# LingRoot Ilk Reklam Plani

> **Created:** 2026-03-30 | **Updated:** 2026-03-30 | **Version:** 1.0

## Ozet

Bu dokuman, LingRoot icin ilk performans reklam kurulumunu operasyonel hale getirmek icin hazirlanmistir.

Amac:

- reklam kanal siralamasini netlestirmek
- ilk test butcesini belirlemek
- ilk kampanya yapilarini tanimlamak
- olculecek event setini sabitlemek
- ilk 30 gunun reklam uygulama planini cikarmak

Bu dokuman mevcut pazarlama belgelerini guncellemez. Onlari referans alarak, reklam tarafi icin uygulanabilir ilk planı toplar.

## Bu Plan Ne Zaman Kullanilmali

Bu plan, asagidaki kosullar buyuk olcude saglandiginda devreye alinmalidir:

- App Store ve Google Play sayfalari yayin kalitesine gelmis olmali
- ana mesaj netlesmis olmali
- uygulama icinde temel analytics event'leri tanimli olmali
- ilk onboarding ve ses olusturma akisi calisir durumda olmali

Bu kosullar saglanmadan agresif reklam acmak, edinim maliyetini yukseltir ve veriyi anlamsizlastirir.

## Referans Alinan Dokumanlar

- [PAZARLAMA_3_FAZ_UYGULAMA_PLANI.md](/Volumes/MacSSD/DevData/GitHub/LingRoot/Main/docs/marketing/PAZARLAMA_3_FAZ_UYGULAMA_PLANI.md)
- [PAID_ADS_STRATEGY.md](/Volumes/MacSSD/DevData/GitHub/LingRoot/Main/docs/marketing/PAID_ADS_STRATEGY.md)
- [ASO_KILAVUZU.md](/Volumes/MacSSD/DevData/GitHub/LingRoot/Main/docs/marketing/ASO_KILAVUZU.md)
- [LAUNCH_PLAN.md](/Volumes/MacSSD/DevData/GitHub/LingRoot/Main/docs/marketing/LAUNCH_PLAN.md)
- [PAZARLAMA_STRATEJISI_2026.md](/Volumes/MacSSD/DevData/GitHub/LingRoot/Main/docs/marketing/PAZARLAMA_STRATEJISI_2026.md)

## Kanal Siralamasi

LingRoot icin ilk asamada oncelik sirasi su olmali:

1. **Apple Search Ads**
2. **Google App Campaigns**
3. **Meta App Campaigns**

### Neden Bu Siralama

**Apple Search Ads**

- Yuksek niyetli kullaniciyi yakalar
- App Store icinde aktif arayan kullaniciya gosterim verir
- Ilk asama test icin en temiz sinyal kaynaklarindan biridir

**Google App Campaigns**

- Search, Play, YouTube ve Display envanterini tek yerden test etmeyi saglar
- Kucuk ekip icin operasyonu kolaydir
- Install ve uygulama ici aksiyon optimizasyonu icin uygundur

**Meta**

- Guclu bir ust huni ve creative test kanali olabilir
- Ancak saglikli calismasi icin daha fazla creative, daha fazla event verisi ve daha net mesaj gerekir
- Bu nedenle ilk dalga degil, ikinci dalga kanali olarak dusunulmelidir

## Ulke Siralamasi

Ilk reklam testleri icin ulke sirasi:

1. **Turkiye**
2. **Almanya** ve **Hollanda** sadece ilk sonuclar anlamliysa

Ilk asamada ayni anda cok ulke acilmasi onerilmez. Once Turkiye'de su metrikler gorulmelidir:

- kabul edilebilir CPI
- kabul edilebilir signup rate
- yeterli `audio_created_first` donusumu
- satin alma veya trial sinyali

## Test Butcesi

### Onerilen Baslangic Butcesi

**Minimum ciddi test bandi:**

- `30.000 - 45.000 TL / ay`

**Daha kontrollu giris bandi:**

- `20.000 - 25.000 TL / ay`

### Onerilen Gunluk Dagilim

Ilk 14 gun icin:

- `Apple Search Ads`: `700 - 1.000 TL / gun`
- `Google App Campaigns`: `500 - 800 TL / gun`

Toplam:

- `1.200 - 1.800 TL / gun`

Not:

- Butce, sadece trafik almak icin degil, anlamli veri biriktirmek icindir
- Cok dusuk butce ile acilan kampanyalar, optimizasyonu geciktirir ve yanlis karar urettirir

## Ilk Kampanya Yapisi

### 1. Apple Search Ads

Tek kampanya altinda 3 farkli ad group mantigi kurulmalidir:

#### Brand

Anahtar kelimeler:

- `lingroot`
- `ling root`
- `liro`
- `lingroot english`

Amac:

- marka aramalarini kaybetmemek
- marka talebini olcmek

#### Category

Anahtar kelimeler:

- `ingilizce ogrenme`
- `ingilizce dinleme`
- `ingilizce podcast`
- `ingilizce kelime`
- `pdf seslendirme`
- `metni sese cevir`
- `english listening practice`
- `learn english by listening`
- `pdf to audio`
- `graded reader`
- `level reader`

Amac:

- yuksek niyetli ama markayi tanimayan kullaniciyi yakalamak

#### Discovery

Kurulum:

- Search Match acik
- genis eslesme ile sinirli bir test kelime seti

Amac:

- yeni arama kaliplari kesfetmek
- daha sonra category grubuna tasinacak sorgulari bulmak

### 2. Google App Campaigns - Install

Bu kampanya ilk hacim testidir.

Kurulum:

- hedef ulke: `Turkiye`
- hedef dil: `Turkce`
- optimizasyon: install

Asset set:

- en az 5 baslik
- en az 5 aciklama
- en az 5 gorsel
- en az 1 kisa video

Amac:

- hangi mesajin ve hangi creative hattinin tik ve install getirdigini anlamak

### 3. Google App Campaigns - Install + In-App Action Bias

Bu kampanya daha kaliteli kullanici sinyalini test etmek icin kullanilmalidir.

Kurulum:

- hedef ulke: `Turkiye`
- ana event: `audio_created_first` veya ikinci tercih olarak `signup_completed`

Amac:

- sadece install degil, ilk deger aksiyonuna giden kullaniciyi bulmak

## Event Olcum Semasi

Ilk asamada event seti dagitilmamali. Cekirdek eventler asagidaki gibi sabitlenmelidir.

### Acquisition ve Onboarding

- `app_install`
- `first_open`
- `signup_started`
- `signup_completed`
- `login_completed`

### Aktivasyon

- `audio_create_started`
- `audio_created_first`
- `audio_created`
- `podcast_created_first`
- `podcast_created`
- `document_audio_created`
- `book_audio_created`

### Engagement

- `audio_play_started`
- `audio_play_completed`
- `vocabulary_word_saved`
- `topic_created`

### Monetization

- `paywall_viewed`
- `trial_started`
- `checkout_started`
- `subscription_purchased`
- `subscription_renewed`

### Retention

- `day_1_active`
- `day_7_active`
- `day_30_active`

## Ilk Optimizasyon Hedefi

Ilk asamada en dogru ana event:

1. `audio_created_first`
2. `signup_completed`
3. `subscription_purchased`

### Neden `audio_created_first`

LingRoot icin gercek aktivasyon ani install degil, kullanicinin ilk kez ses olusturmasidir.

Bu event:

- urunun degerini tattigini gosterir
- onboarding'in gercekten calistigini gosterir
- satin almaya giden hattin daha saglikli gostergesidir

## KPI Seti

Ilk 30 gunde esas bakilacak KPI'lar:

- `CPI`
- `signup_completed / install`
- `audio_created_first / install`
- `paywall_viewed / install`
- `trial_started / install`
- `subscription_purchased / install`

Yorumlama mantigi:

- `signup` iyi ama `audio_created_first` dusukse, urun ilk kullanim akisi sorunludur
- `paywall_viewed` yuksek ama `purchase` dusukse, fiyat veya paket sorunu vardir
- `CPI` dusuk ama aktivasyon zayifsa, trafik kalitesi dusuktur

## Ilk Creative Hatlari

Ilk reklam testleri 3 temel mesaj hatti uzerinden yurutilmelidir.

### 1. Ingilizceyi Dinleyerek Ogren

Mesaj:

- ilgi alanlarindan seviyene uygun Ingilizce ses icerigi uret

Ornek basliklar:

- `Ingilizceyi Dinleyerek Ogren`
- `Learn English by Listening`
- `Seviyene Uygun Sesli Ingilizce`

### 2. PDF ve Metni Sese Cevir

Mesaj:

- PDF, kitap ve metinleri sesli Ingilizce icerige donustur

Ornek basliklar:

- `PDF ve Metinleri Seslendir`
- `Turn PDFs into English Audio`
- `Kitaplari ve Metinleri Dinle`

### 3. AI Podcast ve Kisisel Ogrenme

Mesaj:

- AI ile podcast olustur, dinleme pratigi yap, kelime gelistir

Ornek basliklar:

- `AI ile Ingilizce Podcast Olustur`
- `Audio Content at Your Level`
- `Dinle, Ogren, Kelime Gelistir`

## Ilk Metin Seti

### Kisa Basliklar

- `Ingilizceyi Dinleyerek Ogren`
- `PDF ve Metinleri Seslendir`
- `AI ile Ingilizce Podcast Olustur`
- `Seviyene Uygun Sesli Ingilizce`
- `Dinle, Ogren, Kelime Gelistir`

### Alternatif Ingilizce Basliklar

- `Learn English by Listening`
- `Turn PDFs into English Audio`
- `AI Podcasts for English Practice`
- `Audio Content at Your Level`
- `Listen and Grow Vocabulary`

### Aciklama Metinleri

- `Ilgi alanlarindan Ingilizce ses icerikleri uret ve dinleyerek ogren.`
- `PDF, kitap ve metinleri seviyene uygun Ingilizce sese donustur.`
- `AI ile podcast olustur, dinleme pratigi yap, kelimeleri takip et.`
- `Learn with AI-generated audio from texts, PDFs, books, and podcasts.`
- `Improve listening with English audio adapted to your level.`

## 30 Gunluk Uygulama Sirasi

### Hafta 1

- store listing ve tracking kontrol edilir
- Apple Search Ads kurulur
- Google App Campaigns install kampanyasi acilir
- ilk creative seti yuklenir

### Hafta 2

- Apple tarafinda sorgu raporlari incelenir
- discovery grubundan yeni sorgular ayrilir
- Google tarafinda dusuk performansli assetler elenir
- `audio_created_first` donusumu kontrol edilir

### Hafta 3

- en iyi mesaj hatti belirlenir
- ikinci Google kampanyasi `in-app action bias` ile acilir veya optimize edilir
- gerekirse onboarding veya paywall iyilestirme listesi cikarilir

### Hafta 4

- butce yalnizca kazanan kampanyalara kaydirilir
- Turkiye sonuclari kabul edilebilirse Almanya/Hollanda diaspora testi planlanir
- Meta acilip acilmayacagina karar verilir

## Meta Ne Zaman Acilmali

Meta kampanyalari, asagidaki kosullar saglanmadan acilmamalidir:

- en az `100+` anlamli aktivasyon event'i birikmis olmali
- en az 6-10 kullanilabilir creative varyanti olmali
- en iyi mesaj hatti belli olmali
- store sayfasi ve onboarding akisi oturmus olmali

Bu noktadan once Meta acmak, gereksiz creative tuketimine ve zayif kalite sinyaline yol acar.

## Uygulama Kurallari

- ilk asamada tek ulke ile basla
- ayni anda cok fazla event'e optimize etme
- install basarisini aktivasyon basarisi ile karistirma
- dusuk butceli ama cok sayida kampanya acma
- veri gelmeden kanal yargisi verme

## Kisa Karar Seti

- ilk kanal: `Apple Search Ads`
- ikinci kanal: `Google App Campaigns`
- ilk hedef ulke: `Turkiye`
- ilk optimizasyon hedefi: `audio_created_first`
- ilk test suresi: `14 gun`
- ilk ciddi karar noktasi: `30 gun`

## Dis Kaynaklar

- Apple Ads best practices: https://ads.apple.com/app-store/best-practices
- Apple Ads keywords: https://ads.apple.com/app-store/best-practices/keywords
- Apple Ads ad variations: https://ads.apple.com/app-store/best-practices/ad-variations
- Google App campaigns overview: https://support.google.com/google-ads/answer/6247380?hl=en
- Google App campaign setup: https://support.google.com/google-ads/answer/12575501?hl=en-EN
- Google App campaign best practices: https://support.google.com/google-ads/answer/6167162?hl=en
- Meta Advantage+ app campaigns: https://www.facebook.com/business/ads/meta-advantage-plus/app-campaigns
