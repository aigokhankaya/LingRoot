# Bildirimler Icin Kalici Backend I18n Analizi

> **Created:** 2026-03-01 | **Updated:** 2026-03-01 | **Version:** 1.0

## Ozet

Mobil `Notifications` ekraninda su an bildirim baslik ve mesajlari veritabanindan geldigi gibi gosteriliyor. Bu nedenle bildirim olusturuldugu anda hangi dilde kaydedildiyse, kullanici daha sonra uygulama dilini degistirse bile eski kayitlar yeni dile cevrilmiyor.

Gecici mobil cozum ile bilinen tipler ekranda yeniden yerellestirilebilir; ancak kalici ve genisletilebilir cozum backend tarafinda bildirim icerigini ham metin olarak degil, **cevrilebilir bir anahtar + veri modeli** ile saklamaktir.

Bu dokuman, kalici backend degisikligi icin analiz ve uygulama taslagidir. Bu asamada **gelistirme yapilmayacak**, sadece tasarim kayda alinmistir.

## Mevcut Durum

Bugun bildirimler backend tarafinda dogrudan son-kullaniciya gosterilecek metinlerle olusturuluyor:

- `vocabulary_reminder` kayitlari sabit `Kelime Hatirlaticisi` basligi ile olusuyor.
- `audio_created` kayitlari sabit `Ses Dosyaniz Hazir!` benzeri basliklarla olusuyor.
- `tts_failed` / `content_failed` benzeri durumlarda da dogrudan TR metin yaziliyor.

Bu modelde su problemler var:

1. Metin olusturuldugu anda donuyor; daha sonra locale degisince yeniden cevrilemiyor.
2. Bildirimler backend kaynakli oldugu icin mobil ve web kendi basina her serbest metni guvenle yeniden uretemiyor.
3. Ayni bildirim tipi birden fazla yerde farkli sabit metinle olusturulursa tutarsizlik olusuyor.
4. Gecmise donuk veri migrasyonu olmadan locale tutarliligi saglanamiyor.

## Kok Neden

Asil sorun `notifications` kayitlarinin sunu saklamasi:

- `title`
- `body`

Ama sunu saklamamasi:

- `i18n_key`
- `i18n_params`
- `default_locale`
- `message_version`

Yani sistem "ne anlatacagini" degil, sadece "hangi dilde yazdigini" sakliyor.

## Hedef Mimari

Kalici cozumde bildirim kaydi iki katmandan olusmali:

1. **Domain tanimi**
   Bildirimin anlami bir anahtarla ifade edilir.
   Ornek: `notification.audio_created.title`
   Ornek: `notification.audio_created.body`

2. **Render katmani**
   Istemci, aktif dile gore bu anahtari locale dosyasindan cevirir.
   Gerekirse backend fallback metin de dondurebilir.

Bu yaklasimla backend bildirim olustururken serbest TR/EN metin yerine asagidaki veri modelini kaydeder:

```json
{
  "type": "audio_created",
  "title_i18n_key": "notification.audio_created.title",
  "body_i18n_key": "notification.audio_created.body",
  "i18n_params": {
    "title": "My Audio Title",
    "word": "beautiful",
    "definition": "guzel"
  },
  "title": "Your Audio Is Ready!",
  "body": "Tap to listen."
}
```

Burada `title` ve `body` alanlari tamamen kaldirilmak zorunda degil; backward compatibility ve push provider gereksinimleri icin tutulabilir. Ancak **kaynak gercek** alan `*_i18n_key` ve `i18n_params` olmalidir.

## Onerilen Veri Modeli

`notifications` tablosuna asagidaki alanlar eklenmesi onerilir:

- `title_i18n_key` (`text`, nullable)
- `body_i18n_key` (`text`, nullable)
- `i18n_params` (`jsonb`, nullable, default `'{}'::jsonb`)
- `content_locale` (`text`, nullable)
- `content_version` (`integer`, nullable, default `1`)

### Alan Anlamlari

- `title_i18n_key`: Baslik ceviri anahtari
- `body_i18n_key`: Govde ceviri anahtari
- `i18n_params`: Ceviri icin degiskenler
- `content_locale`: Kaydin olusturuldugu andaki fallback locale (`tr`, `en`)
- `content_version`: Template degisirse hangi surum oldugunu takip etmek icin

## API Sozlesmesi Onerisi

`/api/notifications` cevabi mevcut alanlari bozmadan asagidaki ek alanlari donebilir:

```json
{
  "id": "uuid",
  "title": "Ses Dosyaniz Hazir!",
  "message": "Dinlemek icin tiklayin.",
  "type": "audio_created",
  "metadata": {},
  "titleI18nKey": "notification.audio_created.title",
  "messageI18nKey": "notification.audio_created.body",
  "i18nParams": {
    "contentTitle": "My Audio"
  },
  "createdAt": "2026-03-01T10:00:00.000Z"
}
```

Boylece:

- Eski istemciler `title` / `message` ile calismaya devam eder.
- Yeni istemciler `titleI18nKey` / `messageI18nKey` varsa locale bazli render yapar.

## Backend Uygulama Stratejisi

### Faz 1: Bildirim Semasi Genisletme

- Migration ile yeni i18n alanlari eklenir.
- Mevcut `title` / `body` korunur.
- Dokumanlar ayni adimda guncellenir.

### Faz 2: Bildirim Uretim Noktalarini Standardize Etme

Bildirim olusturan tum noktalarda ortak helper kullanilmalidir:

- TTS async basari
- TTS async hata
- Podcast isleyicileri
- Kelime hatirlatici olusturma
- Gelecekte support / system / payment bildirimleri

Onerilen helper:

```ts
createNotification({
  userId,
  type: 'audio_created',
  titleI18nKey: 'notification.audio_created.title',
  bodyI18nKey: 'notification.audio_created.body',
  i18nParams: { contentTitle: 'My Audio' },
  fallbackTitle: 'Your Audio Is Ready!',
  fallbackBody: 'Tap to listen.',
  data: { ... }
})
```

Bu helper olmadan farkli route/controller dosyalarinda metin daginik kalmaya devam eder.

### Faz 3: Okuma Katmanini Zenginlestirme

`notificationController` mapleme adiminda:

- snake_case -> camelCase donusumu devam eder
- yeni i18n alanlari response'a eklenir
- eski kayitlarda i18n alanlari yoksa fallback olarak `title` / `body` kullanilir

### Faz 4: Istemci Tarafinda Anahtar Bazli Render

Mobil ve web:

- once `titleI18nKey` / `messageI18nKey` kontrol eder
- varsa locale dosyasindan cevirir
- yoksa `title` / `message` gosterir

Bu faz yapilmadan backend degisikligi tek basina kullaniciya tam fayda saglamaz; ancak veri modeli hazirlanmis olur.

## Gecmis Veriler Icin Migrasyon Stratejisi

Eski kayitlarin tam otomatik ve kusursuz locale migrasyonu garanti degildir; cunku serbest metinler her zaman deterministic eslenemez. Bu nedenle hibrit strateji gerekir.

### Guvenli Otomatik Esleme

Asagidaki iyi bilinen sabit metinler script ile anahtarlara donusturulebilir:

- `Kelime Hatirlaticisi` -> `notification.vocabulary_reminder.title`
- `Ses Olusturulamadi` -> `notification.audio_failed.title`
- `Ses Dosyaniz Hazir!` -> `notification.audio_created.title`

### Serbest Metinler

Asagidaki tipte kayitlar otomatik cevrilmemeli:

- kullaniciya ozel hata metinleri
- provider bazli teknik hata detaylari
- dynamic backend exception mesajlari

Bu kayitlar:

- oldugu gibi korunur
- i18n key eklenmeden fallback metin olarak kalir

## Push Notification Katmani Icin Not

Remote push bildirimlerinde cihaz seviyesinde gosterilecek metin anlik olarak gerekli olabilir. Bu nedenle iki farkli ihtiyac vardir:

1. **Push payload metni**
   Anlik bildirim gostermek icin kullanilir.

2. **In-app notification kaydi**
   Uygulama ici listede locale-aware gosterim icin kullanilir.

Kalici mimaride backend su ikisini ayirmalidir:

- push provider'a locale bazli anlik metin gondermek
- veritabanina locale-agnostic i18n anahtari kaydetmek

Yani push katmani hala metin kullanabilir; ama DB kaydi anahtar merkezli olmalidir.

## Riskler

1. Mevcut istemciler yeni alanlari gormezden gelmeli; contract backward-compatible kalmalidir.
2. Gecmis serbest metinler tam otomatik normalize edilemeyebilir.
3. Locale key adlandirma standardi baslangicta net tanimlanmazsa ikinci bir daginiklik olusur.
4. Push ve in-app notification metni tek helper'da karistirilirsa yeniden bagimlilik karmasasi dogabilir.

## Onerilen Anahtar Standardi

Tek bir namespace kullanilmali:

- `notification.audio_created.title`
- `notification.audio_created.body`
- `notification.audio_failed.title`
- `notification.audio_failed.body`
- `notification.vocabulary_reminder.title`
- `notification.vocabulary_reminder.body`

Bu standard `type` ile birebir uyumlu olmali; mapping tablosu minimum tutulmalidir.

## Minimum Uygulama Kapsami

Ilk kalici backend sprint'inde sadece su tipler ele alinmasi yeterlidir:

1. `audio_created`
2. `tts_failed`
3. `content_failed`
4. `vocabulary_reminder`

Bunlar mobil bildirim ekranindaki mevcut sorunun ana kaynagidir.

## Uygulamaya Alinmadan Once Karar Verilmesi Gerekenler

1. `title` / `body` alanlari uzun vadede korunacak mi, yoksa tamamen fallback alanina mi donecek?
2. Locale cevirisi istemcide mi yapilacak, yoksa backend `Accept-Language` bazli render edilmis metin de donecek mi?
3. Push payload icin kullanicinin son secili dili backend'de tutulacak mi?
4. Gecmis kayitlar icin tek seferlik SQL + script migrasyonu istenecek mi?

## Sonuc

Sorunun kalici cozumu, bildirim kayitlarini "metin odakli" modelden "anlam odakli" modele tasimaktir.

Sadece mobilde string override yapmak:

- bugunu cozer
- yeni tiplerde tekrar kirilir
- backend kaynakli locale tutarsizligini yapisal olarak cozmez

Kalici backend cozum icin bir sonraki gelistirme asamasinda:

1. notification tablosuna i18n alanlari eklenmeli
2. bildirim olusturma tek helper altinda toplanmali
3. API yeni i18n alanlarini expose etmeli
4. istemci once anahtarlardan, sonra fallback metinden render etmeli

Bu dokuman yalnizca analiz amaclidir. Bu turnde bilincli olarak kod degisikligi planlanmamis ve uygulanmamistir.
