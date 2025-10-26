# Facebook Login Setup for iOS - LingRoot Mobile

Bu dokümantasyon, LingRoot Mobile uygulamasında Facebook ile giriş özelliğinin iOS platformu için nasıl yapılandırılacağını açıklar.

## 📋 Gereksinimler

- Facebook Developer hesabı
- Facebook App ID ve Client Token
- iOS Bundle ID: `com.lingroot.mobile`
- Xcode 14+
- React Native 0.79+

## 🔧 Kurulum Adımları

### 1. Facebook Developer Console Yapılandırması

1. **Facebook Developers** sayfasına gidin: https://developers.facebook.com/
2. **My Apps** > **Create App** seçeneğine tıklayın
3. **Consumer** veya **Business** tipinde bir uygulama oluşturun
4. Uygulama adı: **LingRoot**

#### iOS Platform Ekleyin:

1. Dashboard'da **Settings** > **Basic** bölümüne gidin
2. **Add Platform** > **iOS** seçin
3. Aşağıdaki bilgileri girin:
   - **Bundle ID**: `com.lingroot.mobile`
   - **iPhone Store ID**: `6753145745` (Apple App ID)
   - **Single Sign On**: Aktif edin

4. **Facebook Login** ürününü ekleyin:
   - Sol menüden **Add Product** seçin
   - **Facebook Login** > **Set Up** tıklayın
   - **iOS** platformunu seçin

5. **OAuth Redirect URIs** ekleyin:
   ```
   fb{YOUR_APP_ID}://authorize
   ```

### 2. Info.plist Yapılandırması

`Info.plist` dosyası zaten yapılandırılmış durumda. Ancak aşağıdaki değerleri **kendi Facebook App bilgilerinizle** güncellemeniz gerekiyor:

```xml
<key>FacebookAppID</key>
<string>1234567890</string>  <!-- Buraya kendi App ID'nizi yazın -->

<key>FacebookClientToken</key>
<string>YOUR_FACEBOOK_CLIENT_TOKEN</string>  <!-- Buraya Client Token'ınızı yazın -->

<key>FacebookDisplayName</key>
<string>LingRoot</string>

<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>fb1234567890</string>  <!-- fb + App ID -->
    </array>
  </dict>
</array>

<key>LSApplicationQueriesSchemes</key>
<array>
  <string>fbapi</string>
  <string>fb-messenger-share-api</string>
  <string>fbauth2</string>
  <string>fbshareextension</string>
</array>
```

### 3. Facebook App ID ve Client Token Nasıl Bulunur?

1. **Facebook Developers Console**'a gidin
2. Uygulamanızı seçin
3. **Settings** > **Basic** bölümünde:
   - **App ID**: Sayfanın üst kısmında görünür
   - **App Secret**: "Show" butonuna tıklayarak görebilirsiniz
   - **Client Token**: Settings > Advanced > Security bölümünde bulunur

### 4. AppDelegate.swift Yapılandırması

`AppDelegate.swift` dosyası zaten yapılandırılmış durumda:

```swift
import FBSDKCoreKit

// didFinishLaunchingWithOptions içinde:
ApplicationDelegate.shared.application(
  application,
  didFinishLaunchingWithOptions: launchOptions
)

// URL handling için:
func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
  if ApplicationDelegate.shared.application(app, open: url, options: options) {
    return true
  }
  return RCTLinkingManager.application(app, open: url, options: options)
}
```

### 5. Pods Kurulumu

Facebook SDK zaten `package.json` içinde mevcut (`react-native-fbsdk-next: ^13.4.1`). 

iOS bağımlılıklarını güncellemek için:

```bash
cd ios
pod install
cd ..
```

### 6. Kod Yapılandırması

#### socialAuth.ts
Facebook login fonksiyonu zaten implement edilmiş:

```typescript
export const signInWithFacebook = async (): Promise<SocialAuthResult> => {
  // Facebook login implementation
}
```

#### AuthContext.tsx
Facebook login provider zaten entegre edilmiş:

```typescript
const signInWithFacebookProvider = async () => {
  const socialResult = await signInWithFacebook();
  await handleSocialAuth(socialResult);
}
```

#### LoginScreen.tsx
Facebook login butonu zaten eklenmiş:

```tsx
<TouchableOpacity style={styles.socialButton} onPress={handleFacebookSignIn}>
  <Icon name="facebook" size={20} color="#4267B2" />
  <Text style={styles.socialButtonText}>
    {language === 'tr' ? 'Facebook ile Giriş Yap' : 'Sign in with Facebook'}
  </Text>
</TouchableOpacity>
```

## 🔐 Backend Yapılandırması

Backend'de Facebook login endpoint'i zaten mevcut:

- **Endpoint**: `POST /api/auth/facebook-login`
- **Body**: `{ credential: string, rememberMe: boolean }`
- **Response**: JWT token ve kullanıcı bilgileri

Backend, Facebook Graph API'yi kullanarak access token'ı doğrular ve kullanıcı bilgilerini alır.

## 🧪 Test Etme

### iOS Simulator'da Test:

1. Xcode'da projeyi açın:
   ```bash
   cd ios
   open LingRootMobile.xcworkspace
   ```

2. Simulator'ı başlatın ve uygulamayı çalıştırın:
   ```bash
   npm run ios
   ```

3. Login ekranında "Facebook ile Giriş Yap" butonuna tıklayın

4. Facebook login web view'ı açılacak ve giriş yapabileceksiniz

### Gerçek Cihazda Test:

1. Facebook Developer Console'da **App Review** bölümünden uygulamanızı "Development Mode"dan çıkarın veya test kullanıcıları ekleyin

2. Test kullanıcıları eklemek için:
   - **Roles** > **Test Users** > **Add** tıklayın
   - Test kullanıcıları ile giriş yapabilirsiniz

## 🐛 Sorun Giderme

### "Invalid Facebook App ID" Hatası:
- Info.plist'teki App ID'nin doğru olduğundan emin olun
- fb{APP_ID} URL scheme'inin doğru olduğundan emin olun

### "App Not Setup" Hatası:
- Facebook Developer Console'da iOS platformunun eklendiğinden emin olun
- Bundle ID'nin doğru olduğundan emin olun

### "Login Failed" Hatası:
- Internet bağlantısını kontrol edin
- Backend'in çalıştığından emin olun
- Console loglarını kontrol edin

### Permissions Hatası:
- Info.plist'te LSApplicationQueriesSchemes'in eklendiğinden emin olun

## 📱 Kullanıcı Akışı

1. Kullanıcı "Facebook ile Giriş Yap" butonuna tıklar
2. Facebook SDK, Facebook login web view'ını açar
3. Kullanıcı Facebook hesabıyla giriş yapar
4. Facebook, access token döner
5. Uygulama, access token'ı backend'e gönderir
6. Backend, Facebook Graph API ile token'ı doğrular
7. Backend, kullanıcı bilgilerini alır ve JWT token oluşturur
8. Kullanıcı uygulamaya giriş yapar

## 🔒 Güvenlik Notları

- Facebook App Secret'ı asla client-side kodda saklamayın
- Access token'ları her zaman backend'de doğrulayın
- HTTPS kullanın
- Client Token'ı Info.plist'te saklayabilirsiniz (public bilgi)

## 📚 Kaynaklar

- [Facebook Login for iOS](https://developers.facebook.com/docs/facebook-login/ios)
- [react-native-fbsdk-next Documentation](https://github.com/thebergamo/react-native-fbsdk-next)
- [Facebook Graph API](https://developers.facebook.com/docs/graph-api)

## ✅ Yapılandırma Kontrol Listesi

- [ ] Facebook Developer Console'da uygulama oluşturuldu
- [ ] iOS platformu eklendi ve Bundle ID yapılandırıldı
- [ ] Facebook Login ürünü eklendi
- [ ] App ID ve Client Token alındı
- [ ] Info.plist güncellendi (App ID, Client Token, URL Schemes)
- [ ] AppDelegate.swift yapılandırıldı
- [ ] Pods kuruldu (`pod install`)
- [ ] Backend endpoint'i test edildi
- [ ] iOS simulator'da test edildi
- [ ] Gerçek cihazda test edildi

## 🎉 Sonuç

Facebook login entegrasyonu tamamlandı! Kullanıcılar artık Facebook hesaplarıyla LingRoot'a giriş yapabilirler.

Herhangi bir sorun yaşarsanız, loglara bakın:
```bash
# iOS logs
npx react-native log-ios
```
