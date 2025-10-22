# Facebook Sign-In Kurulum Rehberi (Android)

## Sorun
Uygulama açılırken crash oluyor ve şu hata alınıyor:
```
The SDK has not been initialized, make sure to call FacebookSdk.sdkInitialize() first.
```

## Çözüm

Facebook Sign-In özelliğini kullanmıyorsanız veya şu an için devre dışı bırakmak istiyorsanız, Facebook SDK zaten initialize edildi. Ancak Facebook App ID ve Client Token gerekiyor.

### Seçenek 1: Facebook Sign-In'i Kullanmayacaksanız

`strings.xml` dosyasında placeholder değerler zaten mevcut (değer: "0"). Bu değerler ile uygulama çalışacaktır ancak Facebook Sign-In çalışmayacaktır.

### Seçenek 2: Facebook Sign-In'i Kullanacaksanız

#### 1. Facebook Developer Console'dan App ID ve Client Token Alma

1. [Facebook Developers](https://developers.facebook.com/apps/) adresine gidin
2. Uygulamanızı seçin (veya yeni uygulama oluşturun)
3. Sol menüden **Settings** > **Basic** seçin
4. **App ID** ve **App Secret** değerlerini kopyalayın
5. **Client Token** için: Settings > Advanced > Security > Client Token

#### 2. strings.xml Dosyasını Güncelleme

`android/app/src/main/res/values/strings.xml` dosyasını açın ve değerleri güncelleyin:

```xml
<resources>
  <string name="app_name">lingrootmobile</string>
  <string name="facebook_app_id">YOUR_FACEBOOK_APP_ID</string>
  <string name="facebook_client_token">YOUR_FACEBOOK_CLIENT_TOKEN</string>
</resources>
```

#### 3. .env Dosyasına Ekleme (Opsiyonel)

`.env` dosyasına da ekleyebilirsiniz (backend için gerekli olabilir):

```env
EXPO_PUBLIC_FACEBOOK_APP_ID=YOUR_FACEBOOK_APP_ID
EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN=YOUR_FACEBOOK_CLIENT_TOKEN
```

#### 4. Facebook App Yapılandırması

Facebook Developer Console'da:

1. **Settings** > **Basic** > **Add Platform** > **Android** seçin
2. **Package Name**: `com.nsyzk.lingrootmobile`
3. **Class Name**: `com.nsyzk.lingrootmobile.MainActivity`
4. **Key Hashes**: SHA-1 fingerprint'i Base64 formatına çevirin

SHA-1 almak için:
```powershell
cd F:\Main\LingRootMobile\android
.\gradlew.bat signingReport
```

SHA-1'i Base64'e çevirmek için online araç kullanın veya:
```bash
echo "YOUR_SHA1_HEX" | xxd -r -p | openssl base64
```

#### 5. APK Build ve Test

```powershell
cd F:\Main\LingRootMobile\android
.\gradlew.bat clean
.\gradlew.bat assembleRelease --no-daemon --console plain
```

## Yapılan Değişiklikler

1. ✅ `MainApplication.kt` - Facebook SDK initialize edildi
2. ✅ `strings.xml` - Facebook App ID ve Client Token placeholder'ları eklendi
3. ✅ `AndroidManifest.xml` - Facebook SDK meta-data eklendi
4. ✅ `env.example` - Facebook OAuth bilgileri eklendi

## Not

Eğer Facebook Sign-In kullanmayacaksanız, mevcut placeholder değerler (0) ile uygulama çalışacaktır. Facebook butonu tıklandığında hata verecektir ama uygulama crash olmayacaktır.
