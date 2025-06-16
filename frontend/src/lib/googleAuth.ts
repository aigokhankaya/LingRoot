// Google OAuth utility functions
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
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-identity-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error('Google Identity Services yüklenemedi'));
    document.head.appendChild(script);
  });
};

export const signInWithGoogle = (): Promise<{ credential: string; clientId: string }> => {
  return new Promise((resolve, reject) => {
    if (!window.google) {
      reject(new Error('Google Identity Services yüklenmedi'));
      return;
    }

    // Timeout için timer
    const timeoutId = setTimeout(() => {
      reject(new Error('Google giriş zaman aşımına uğradı. Lütfen tekrar deneyin.'));
    }, 30000); // 30 saniye timeout

    // Global callback fonksiyonu
    window.googleSignInCallback = (response: any) => {
      clearTimeout(timeoutId);
      if (response.credential) {
        resolve({
          credential: response.credential,
          clientId: response.clientId || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''
        });
      } else {
        reject(new Error('Google giriş başarısız'));
      }
    };

    // Google Sign-In butonunu programatik olarak tetikle
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    
    if (!clientId || clientId === '1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com') {
      clearTimeout(timeoutId);
      reject(new Error('Google Client ID yapılandırılmamış. Lütfen .env dosyasında NEXT_PUBLIC_GOOGLE_CLIENT_ID değerini ayarlayın.'));
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: window.googleSignInCallback,
      auto_select: false,
      cancel_on_tap_outside: true,
      use_fedcm_for_prompt: false
    });

    // One Tap prompt'ını göster
    window.google.accounts.id.prompt((notification: any) => {
      console.log('Google prompt notification:', notification);
      
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        console.log('One Tap gösterilemedi, OAuth popup açılıyor...');
        
        // One Tap gösterilemezse normal popup'ı aç
        try {
          const tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'email profile',
            callback: (response: any) => {
              clearTimeout(timeoutId);
              console.log('OAuth response:', response);
              
              if (response.access_token) {
                // Access token ile kullanıcı bilgilerini al
                fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${response.access_token}`)
                  .then(res => {
                    if (!res.ok) {
                      throw new Error(`HTTP error! status: ${res.status}`);
                    }
                    return res.json();
                  })
                  .then(userInfo => {
                    console.log('User info:', userInfo);
                    resolve({
                      credential: response.access_token,
                      clientId: clientId
                    });
                  })
                  .catch(err => {
                    console.error('Kullanıcı bilgileri alınamadı:', err);
                    reject(new Error('Kullanıcı bilgileri alınamadı: ' + err.message));
                  });
              } else if (response.error) {
                reject(new Error('Google OAuth hatası: ' + response.error));
              } else {
                reject(new Error('Google OAuth başarısız - token alınamadı'));
              }
            }
          });
          
          tokenClient.requestAccessToken();
        } catch (error: any) {
          clearTimeout(timeoutId);
          console.error('OAuth client oluşturulamadı:', error);
          reject(new Error('OAuth client oluşturulamadı: ' + (error?.message || 'Bilinmeyen hata')));
        }
      } else if (notification.getDismissedReason) {
        // Kullanıcı One Tap'i iptal etti
        const reason = notification.getDismissedReason();
        console.log('One Tap iptal edildi:', reason);
        
        if (reason === 'credential_returned') {
          // Credential döndürüldü, callback'te handle edilecek
          return;
        } else {
          clearTimeout(timeoutId);
          reject(new Error('Google giriş iptal edildi'));
        }
      }
    });
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