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
      reject(new Error('Google Identity Services yüklenmedi'));
      return;
    }

    // Client ID kontrolü - Gerçek Google OAuth için
    let clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    
    // Eğer environment'ta client ID yoksa, default değeri kullan
    if (!clientId) {
      clientId = '67246709123-ij5od5ta3toboer63hrcopkfld65241a.apps.googleusercontent.com';
      console.log('🔧 Environment\'ta client ID bulunamadı, default kullanılıyor');
    }
    
    console.log('🔄 Google Sign-In başlatılıyor...');
    console.log('📋 İstemci ID:', clientId.substring(0, 15) + '...');

    // Timeout için timer
    const timeoutId = setTimeout(() => {
      console.warn('⏰ Google giriş zaman aşımına uğradı');
      reject(new Error('Google giriş zaman aşımına uğradı. Lütfen tekrar deneyin.'));
    }, 30000); // 30 saniye timeout

    // Global callback fonksiyonu
    window.googleSignInCallback = (response: any) => {
      clearTimeout(timeoutId);
      console.log('📨 Google callback çağrıldı:', response);
      
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
        reject(new Error('Google giriş başarısız'));
      }
    };

    try {
      // Google Sign-In'i başlat
      console.log('🔧 Google accounts.id.initialize çağrılıyor...');
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: window.googleSignInCallback,
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: false, // Şimdilik false yapıyoruz, daha kararlı
        context: 'signin',
        ux_mode: 'popup'
      });

      // One Tap prompt'ını göster
      console.log('🎯 Google One Tap prompt gösteriliyor...');
      window.google.accounts.id.prompt((notification: any) => {
        console.log('📢 Google prompt notification:', notification);
        
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          console.log('⚠️ One Tap gösterilemedi, sign-in button ile deneniyor...');
          
          // One Tap çalışmıyorsa, sign-in button render et
          try {
            console.log('🔧 Google Sign-In button render ediliyor...');
            
            // Geçici bir container oluştur
            const buttonContainer = document.createElement('div');
            buttonContainer.id = 'temp-google-signin-button';
            buttonContainer.style.position = 'fixed';
            buttonContainer.style.top = '50%';
            buttonContainer.style.left = '50%';
            buttonContainer.style.transform = 'translate(-50%, -50%)';
            buttonContainer.style.zIndex = '10000';
            buttonContainer.style.backgroundColor = 'white';
            buttonContainer.style.padding = '20px';
            buttonContainer.style.borderRadius = '8px';
            buttonContainer.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            
            // Kapatma butonu ekle
            const closeButton = document.createElement('div');
            closeButton.innerHTML = '×';
            closeButton.style.position = 'absolute';
            closeButton.style.top = '5px';
            closeButton.style.right = '10px';
            closeButton.style.cursor = 'pointer';
            closeButton.style.fontSize = '20px';
            closeButton.style.color = '#666';
            closeButton.onclick = () => {
              clearTimeout(timeoutId);
              if (buttonContainer.parentNode) {
                buttonContainer.parentNode.removeChild(buttonContainer);
              }
              reject(new Error('Google giriş iptal edildi'));
            };
            
            buttonContainer.appendChild(closeButton);
            document.body.appendChild(buttonContainer);
            
            // Google button render et
            window.google.accounts.id.renderButton(buttonContainer, {
              theme: 'outline',
              size: 'large',
              type: 'standard',
              shape: 'rectangular',
              text: 'signin_with',
              logo_alignment: 'left',
              width: 250
            });
            
            // 10 saniye sonra otomatik kapat
            setTimeout(() => {
              if (buttonContainer.parentNode) {
                buttonContainer.parentNode.removeChild(buttonContainer);
                clearTimeout(timeoutId);
                reject(new Error('Google giriş zaman aşımına uğradı'));
              }
            }, 10000);
            
          } catch (error: any) {
            clearTimeout(timeoutId);
            console.error('❌ Google Sign-In button oluşturulamadı:', error);
            reject(new Error('Google Sign-In alternatif yöntemi başarısız: ' + (error?.message || 'Bilinmeyen hata')));
          }
        } else if (notification.getDismissedReason) {
          // Kullanıcı One Tap'i iptal etti
          const reason = notification.getDismissedReason();
          console.log('⚠️ One Tap iptal edildi:', reason);
          
          if (reason === 'credential_returned') {
            // Credential döndürüldü, callback'te handle edilecek
            return;
          } else {
            clearTimeout(timeoutId);
            reject(new Error('Google giriş iptal edildi'));
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