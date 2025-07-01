// Google OAuth utility functions with FedCM support
declare global {
  interface Window {
    google: any;
    googleSignInCallback: (response: any) => void;
  }
}

export const initializeGoogleAuth = (): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    // Google Identity Services script'ini yükle
    if (document.getElementById('google-identity-script')) {
      console.log('✅ Google Identity script zaten yüklü');
      resolve(true);
      return;
    }

    console.log('🔄 Google Identity script yükleniyor...');
    const script = document.createElement('script');
    script.id = 'google-identity-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('✅ Google Identity script başarıyla yüklendi');
      resolve(true);
    };
    script.onerror = (error) => {
      console.error('❌ Google Identity Services yüklenemedi:', error);
      reject(new Error('Google Identity Services yüklenemedi'));
    };
    document.head.appendChild(script);
  });
};

export const signInWithGoogle = (): Promise<{ credential: string; clientId: string }> => {
  return new Promise((resolve, reject) => {
    // Google nesnesi mevcut mu kontrol et
    if (!window.google) {
      console.error('❌ Google Identity Services yüklenmedi');
      reject(new Error('Google Identity Services yüklenmedi. Lütfen internet bağlantınızı kontrol edin ve sayfayı yenileyin.'));
      return;
    }

    // Client ID kontrolü - Gerçek Google OAuth için
    let clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    
    // Eğer environment'ta client ID yoksa, geçerli bir client ID kullan
    if (!clientId) {
      // Development için geçici client ID (production'da environment'tan alınmalı)
      clientId = '67246709123-1j5od5ta3toboer63hrcopkfld65241a.apps.googleusercontent.com';
      console.log('🔧 Environment\'ta client ID bulunamadı, fallback kullanılıyor');
    }
    
    console.log('🔄 Google Sign-In başlatılıyor...');
    console.log('📋 İstemci ID:', clientId.substring(0, 20) + '...');

    // Timeout için timer
    const timeoutId = setTimeout(() => {
      console.warn('⏰ Google giriş zaman aşımına uğradı');
      reject(new Error('Google giriş zaman aşımına uğradı. Lütfen popup\'ı kapatıp tekrar deneyin.'));
    }, 60000); // 60 saniye timeout (artırıldı)

    // Global callback fonksiyonu
    window.googleSignInCallback = (response: any) => {
      clearTimeout(timeoutId);
      console.log('📨 Google callback çağrıldı:', response);
      
      // Popup pencerelerini temizle
      const tempButton = document.getElementById('temp-google-signin-button');
      if (tempButton && tempButton.parentNode) {
        tempButton.parentNode.removeChild(tempButton);
      }
      
      if (response.credential) {
        console.log('✅ Google JWT Credential alındı:', {
          uzunluk: response.credential.length,
          ilk50: response.credential.substring(0, 50)
        });
        
        // Credential'ı decode ederek kullanıcı bilgilerini görelim
        try {
          const decoded = decodeGoogleCredential(response.credential);
          console.log('👤 Google kullanıcı bilgileri:', {
            email: decoded?.email,
            name: decoded?.name,
            verified: decoded?.email_verified
          });
        } catch (e) {
          console.log('ℹ️ Credential decode edilemedi, backend\'te işlenecek');
        }
        
        resolve({
          credential: response.credential,
          clientId: response.clientId || clientId
        });
      } else {
        console.error('❌ Google giriş başarısız:', response);
        reject(new Error('Google giriş başarısız: ' + (response.error || 'Kullanıcı girişi iptal etti')));
      }
    };

    try {
      // Google Sign-In'i başlat
      console.log('🔧 Google accounts.id.initialize çağrılıyor...');
      
      // Önce basit konfigürasyon deneyelim
      const initConfig = {
        client_id: clientId,
        callback: window.googleSignInCallback,
        auto_select: false,
        cancel_on_tap_outside: true,
        context: 'signup',
        ux_mode: 'popup'
      };
      
      console.log('🎯 Google init config:', initConfig);
      window.google.accounts.id.initialize(initConfig);

      // One Tap prompt'ını göster
      console.log('🎯 Google One Tap prompt gösteriliyor...');
      window.google.accounts.id.prompt((notification: any) => {
        console.log('📢 Google prompt notification:', notification);
        
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          console.log('⚠️ One Tap gösterilemedi, manuel giriş gerekiyor...');
          
          // One Tap başarısız olduğunda kullanıcıya bilgi ver
          const message = 'Google One Tap kullanılamıyor. Lütfen "Google ile Kaydol" butonuna tekrar tıklayın.';
          clearTimeout(timeoutId);
          reject(new Error(message));
          
        } else if (notification.getDismissedReason) {
          // Kullanıcı One Tap'i iptal etti
          const reason = notification.getDismissedReason();
          console.log('⚠️ One Tap iptal edildi:', reason);
          
          if (reason === 'credential_returned') {
            // Credential döndürüldü, callback'te handle edilecek
            console.log('✅ Credential döndürüldü, callback bekleniyor...');
            return;
          } else {
            clearTimeout(timeoutId);
            reject(new Error('Google girişi iptal edildi: ' + reason));
          }
        }
      });
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('❌ Google Sign-In başlatma hatası:', error);
      reject(new Error('Google Sign-In başlatılamadı: ' + (error?.message || 'Bilinmeyen hata')));
    }
  });
};

export const decodeGoogleCredential = (credential: string) => {
  try {
    // JWT token'ı decode et
    const base64Url = credential.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Google credential decode hatası:', error);
    return null;
  }
}; 