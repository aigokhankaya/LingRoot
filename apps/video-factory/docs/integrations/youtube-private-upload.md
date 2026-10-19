# YouTube controlled publishing boundaries

## Amaç

Faz 3 upload sınırı videoyu önce `private` olarak YouTube’a yükler. QA-backed
operator onaylı release, çift public kapısı açıksa video ve playlistleri en son
adımda public'e yükseltir. Scheduled yayın bu adapterın kapsamında değildir.

Resmi kaynaklar:

- [Resumable uploads](https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol)
- [videos.insert](https://developers.google.com/youtube/v3/docs/videos/insert)
- [playlists.list](https://developers.google.com/youtube/v3/docs/playlists/list)
- [playlists.insert](https://developers.google.com/youtube/v3/docs/playlists/insert)
- [playlistItems.list](https://developers.google.com/youtube/v3/docs/playlistItems/list)
- [playlistItems.insert](https://developers.google.com/youtube/v3/docs/playlistItems/insert)
- [OAuth refresh token](https://developers.google.com/identity/protocols/oauth2/web-server#offline)

## OAuth

YouTube Data API servis hesabını desteklemez. Kanalı yöneten Google hesabı bir
kez OAuth onayı vermelidir; sonrasında Video Factory refresh token ile yeni
access token'ları etkileşimsiz alır.

### Google Cloud hazırlığı

1. [Google Cloud Console](https://console.cloud.google.com/) içinde bu otomasyon
   için bir proje seçin veya oluşturun.
2. **APIs & Services → Library** altında **YouTube Data API v3** API'sini
   etkinleştirin.
3. **Google Auth Platform** altında Branding ve Audience bilgilerini
   tamamlayın. External/Testing kullanıyorsanız kanalı yöneten Google hesabını
   test user olarak ekleyin.
4. Data Access bölümünde
   `https://www.googleapis.com/auth/youtube.force-ssl` kapsamını ekleyin. Bu
   kapsam private video upload, metadata güncelleme ve playlist yönetiminin
   tamamını karşılar.
5. **Clients → Create client → Desktop app** seçin ve indirilen
   `client_secret_....json` dosyasını geçici olarak yerel bilgisayara alın.

Web application istemcisi veya mevcut Google Sign-In client'ı kullanılmaz.
Desktop app loopback callback, macOS/Linux/Windows yerel komutları için
Google'ın desteklediği akıştır.

### Credentialları `.env` içine güvenli yazma

Video Factory klasöründe çalıştırın:

```bash
npm run youtube:auth -- \
  --client-json "/tam/yol/client_secret_....json"
```

Komut `127.0.0.1` üzerinde geçici callback açar ve terminalde bir Google izin
adresi gösterir. YouTube kanalını yöneten doğru Google hesabıyla izin verin.
Komut:

- OAuth state ve PKCE doğrular;
- offline access + açık consent ile refresh token alır;
- yetkili YouTube kanal ID ve adını doğrular;
- client ID, client secret ve refresh token'ı yalnızca git-ignore kapsamındaki
  `.env` dosyasına yazar;
- `.env` dosya iznini `0600` yapar;
- access/refresh token'ı loglamaz veya output'a yazmaz.

İndirilen client JSON'u credentiallar `.env` içine yazıldıktan sonra güvenli
biçimde silin veya parola yöneticisinde saklayın; repoya kopyalamayın.

Önemli: OAuth uygulaması **Testing** durumundaysa YouTube scope'uyla alınan
yetkilendirme ve refresh token 7 gün sonra sona erer. Kesintisiz otomasyon için
Audience publishing status'u **In production** olmalıdır. Google doğrulaması ve
YouTube API audit gereksinimleri Cloud projesinin kullanımına göre ayrıca
uygulanabilir. Audit edilmemiş, 28 Temmuz 2020 sonrasında oluşturulan API
projelerinden yüklenen videolar private görüntüleme ile sınırlandırılır; bu
projenin review-first private yayın politikasıyla uyumludur.

Offline access ile alınmış refresh token şu endpoint’te access token’a çevrilir:

```text
POST https://oauth2.googleapis.com/token
Content-Type: application/x-www-form-urlencoded

client_id=...
client_secret=...
refresh_token=...
grant_type=refresh_token
```

Access ve refresh token hiçbir log veya result dosyasına yazılmaz.

## Upload akışı

Session:

```text
POST /upload/youtube/v3/videos
  ?uploadType=resumable
  &part=snippet,status
  &notifySubscribers=false
```

Metadata status zorunlu olarak:

```json
{
  "privacyStatus": "private",
  "selfDeclaredMadeForKids": false
}
```

Session response içindeki `Location` URL’ye video `PUT` edilir.

## Resume güvenliği

Upload network veya retryable 5xx ile belirsiz kalırsa aynı binary körlemesine
baştan gönderilmez. Önce:

```text
PUT <session-url>
Content-Length: 0
Content-Range: bytes */<total>
```

ile session offset sorgulanır. `308 Resume Incomplete` içindeki `Range`
headerından sonraki byte’tan devam edilir.

Session başlatma otomatik retry edilmez. OAuth refresh ve status sorguları
transient hata durumunda sınırlı retry kullanır.

## Private playlist akışı

Playlist isimleri deterministiktir:

```text
Topic: <topic-title> | All Levels
Level: <CEFR-level> English Listening
```

Playlist ensure akışı önce authenticated kanalın playlistlerini
`mine=true`, sayfalama ve exact-title eşleşmesiyle tarar. Eşleşme yoksa
playlist’i hedef privacy ile oluşturur. Private hedefte aynı isimde public veya
unlisted playlist varsa hard-fail eder. Açık public hedef, kanala ait exact-title
private playlisti metadata kaybetmeden public'e yükseltebilir.

Video eklemeden önce `playlistItems.list` çağrısında hem `playlistId` hem
`videoId` filtrelenir. Üyelik varsa insert atlanır. Yoksa
`snippet.playlistId` ve `snippet.resourceId` ile tek insert yapılır. Playlist
ve playlist item insert çağrıları non-idempotent kabul edildiği için otomatik
retry edilmez.

## Konfigürasyon

```text
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REFRESH_TOKEN=
YOUTUBE_OAUTH_TOKEN_URL=https://oauth2.googleapis.com/token
YOUTUBE_UPLOAD_BASE_URL=https://www.googleapis.com/upload/youtube/v3
YOUTUBE_DATA_API_BASE_URL=https://www.googleapis.com/youtube/v3
YOUTUBE_REQUEST_TIMEOUT_MS=60000
YOUTUBE_UPLOAD_MAX_ATTEMPTS=4
```

`youtube:auth`, playlist dahil tam private release akışı için
`youtube.force-ssl` kapsamını ister. Yalnız upload için teknik olarak
`youtube.upload` yeterli olsa da playlist ve metadata akışına yetmez.

## Explicit kontrol

```bash
npm run youtube:check -- \
  --video "outputs/.../video.mp4" \
  --metadata "outputs/.../youtube-metadata.json"
```

Bu komut gerçek remote video kaydı oluşturur. Sonuç yalnızca video ID, private
status ve title içerir.

Tam üretim paketi daha önce operator tarafından onaylandıysa bütün seviyeleri
otomatik yüklemek için:

```bash
npm run release -- --package "outputs/topic-packages/<package-dir>"
```

`release`, A1–C2 videolarını private yükler, topic/level playlist'lerine ekler,
video açıklamalarındaki çapraz bağlantıları günceller ve her başarılı video
ID'sini anında `run-state.json` içine kaydeder. Kesilirse aynı komut güvenle
devam eder; state'te video ID'si bulunan seviyeleri yeniden yüklemez.

`PUBLISH_MODE=auto_public` ve `AUTO_PUBLIC_PUBLISH=true` birlikteyse release
metadata güncellemesinde videoları public yapar ve tüm owned playlistlerin
privacy durumunu public'e yükseltir. Bu kapılar operator onay gereksinimini
kaldırmaz.

Playlist kontrolü:

```bash
npm run youtube:playlist-check -- \
  --video-id "YOUTUBE_VIDEO_ID" \
  --topic-title "Why do people forget new words?" \
  --levels A1
```

Bu komut gerçek playlist oluşturabilir ve playlist item ekleyebilir. Tekrar
çalıştırıldığında exact-title playlistleri yeniden kullanır ve mevcut video
üyeliklerini atlar. Güvenli sonuç dosyası
`outputs/youtube-playlist-checks/` altına yazılır; OAuth token içermez.
Bir video yalnızca kendi CEFR level playlist’ine girebildiği için komut tam
olarak bir level kabul eder.
