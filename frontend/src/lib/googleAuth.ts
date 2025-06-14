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

    // Global callback fonksiyonu
    window.googleSignInCallback = (response: any) => {
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
    window.google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com',
      callback: window.googleSignInCallback,
      auto_select: false,
      cancel_on_tap_outside: true
    });

    // One Tap prompt'ını göster
    window.google.accounts.id.prompt((notification: any) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // One Tap gösterilemezse normal popup'ı aç
        window.google.accounts.oauth2.initTokenClient({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com',
          scope: 'email profile',
          callback: (response: any) => {
            if (response.access_token) {
              // Access token ile kullanıcı bilgilerini al
              fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${response.access_token}`)
                .then(res => res.json())
                .then(userInfo => {
                  resolve({
                    credential: response.access_token,
                    clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''
                  });
                })
                .catch(err => reject(err));
            } else {
              reject(new Error('Google OAuth başarısız'));
            }
          }
        }).requestAccessToken();
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