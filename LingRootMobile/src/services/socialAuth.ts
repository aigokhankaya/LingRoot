import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { LoginManager, AccessToken, Settings } from 'react-native-fbsdk-next';
import appleAuth from '@invertase/react-native-apple-authentication';
import { Platform } from 'react-native';
import { 
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID 
} from '@env';

// Facebook SDK Configuration
export const configureFacebookSDK = () => {
  try {
    // Initialize Facebook SDK
    // Note: Facebook App ID and Client Token are configured in Info.plist for iOS
    // and in AndroidManifest.xml for Android
    Settings.initializeSDK();
    
    console.log('[FACEBOOK_SDK] Configuration completed');
  } catch (error) {
    console.error('[FACEBOOK_SDK] Configuration error:', error);
  }
};

// Google Sign-In Configuration
export const configureGoogleSignIn = () => {
  try {
    // Temporary hardcode for debugging
    const webClientId = EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '308629480159-43l1s64c2cei400tlnsbdtb5rurmsalt.apps.googleusercontent.com';
    const iosClientId = EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
    const androidClientId = EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '308629480159-43l1s64c2cei400tlnsbdtb5rurmsalt.apps.googleusercontent.com';
    
    console.log('[GOOGLE_SIGNIN] Configuration attempt:', {
      hasWebClientId: !!webClientId,
      hasIosClientId: !!iosClientId,
      hasAndroidClientId: !!androidClientId,
      platform: Platform.OS
    });
    
    // Don't configure if no client IDs are provided
    if (!webClientId) {
      console.warn('[GOOGLE_SIGNIN] No web client ID configured. Google Sign-In will not work.');
      console.warn('[GOOGLE_SIGNIN] Please add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to .env file');
      return;
    }
    
    // Platform-specific configuration
    let config: any = {};
    
    if (Platform.OS === 'android') {
      // For Android, use Web Client ID for backend verification
      // But the Android Client ID must be registered with correct SHA-1
      config = {
        webClientId: webClientId,
        offlineAccess: true,
        forceCodeForRefreshToken: true,
      };
    } else if (Platform.OS === 'ios') {
      config = {
        webClientId: webClientId,
        iosClientId: iosClientId,
        offlineAccess: true,
        forceCodeForRefreshToken: true,
      };
    } else {
      config = {
        webClientId: webClientId,
        offlineAccess: true,
        forceCodeForRefreshToken: true,
      };
    }
    
    console.log('[GOOGLE_SIGNIN] Config:', { 
      platform: Platform.OS, 
      webClientId: config.webClientId,
      fullConfig: config 
    });
    
    GoogleSignin.configure(config);
    
    console.log('[GOOGLE_SIGNIN] Configuration completed');
    
    console.log('[GOOGLE_SIGNIN] Configuration successful');
  } catch (error) {
    console.error('[GOOGLE_SIGNIN] Configuration error:', error);
  }
};

export interface SocialAuthResult {
  provider: 'google' | 'facebook' | 'apple';
  credential: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

// Google Sign-In
export const signInWithGoogle = async (): Promise<SocialAuthResult> => {
  try {
    console.log('[GOOGLE_SIGNIN] Starting sign-in process...');
    
    // Check Play Services
    console.log('[GOOGLE_SIGNIN] Checking Play Services...');
    const hasPlayServices = await GoogleSignin.hasPlayServices();
    console.log('[GOOGLE_SIGNIN] Play Services available:', hasPlayServices);
    
    // Sign out first to force account selection
    console.log('[GOOGLE_SIGNIN] Signing out previous session...');
    try {
      await GoogleSignin.signOut();
      console.log('[GOOGLE_SIGNIN] Previous session signed out');
    } catch (signOutError) {
      console.log('[GOOGLE_SIGNIN] No previous session to sign out');
    }
    
    console.log('[GOOGLE_SIGNIN] Calling GoogleSignin.signIn()...');
    const userInfo = await GoogleSignin.signIn();
    console.log('[GOOGLE_SIGNIN] Sign-in successful, user:', userInfo.data?.user?.email);
    
    // Get ID token for backend verification
    console.log('[GOOGLE_SIGNIN] Getting tokens...');
    const tokens = await GoogleSignin.getTokens();
    console.log('[GOOGLE_SIGNIN] Tokens received, idToken length:', tokens.idToken?.length);
    
    return {
      provider: 'google',
      credential: tokens.idToken,
      email: userInfo.data?.user?.email || undefined,
      name: userInfo.data?.user?.name || undefined,
      given_name: userInfo.data?.user?.givenName || undefined,
      family_name: userInfo.data?.user?.familyName || undefined,
      picture: userInfo.data?.user?.photo || undefined,
    };
  } catch (error: any) {
    console.error('[GOOGLE_SIGNIN] ❌ Error occurred');
    console.error('[GOOGLE_SIGNIN] Error code:', error.code);
    console.error('[GOOGLE_SIGNIN] Error message:', error.message);
    console.error('[GOOGLE_SIGNIN] Full error:', JSON.stringify(error, null, 2));
    throw new Error(error.message || 'Google ile giriş başarısız');
  }
};

// Facebook Login
export const signInWithFacebook = async (): Promise<SocialAuthResult> => {
  try {
    const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
    
    if (result.isCancelled) {
      throw new Error('Facebook girişi iptal edildi');
    }
    
    // Get access token
    const data = await AccessToken.getCurrentAccessToken();
    
    if (!data) {
      throw new Error('Facebook access token alınamadı');
    }
    
    // Fetch user info from Facebook Graph API
    const response = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email,first_name,last_name,picture.type(large)&access_token=${data.accessToken}`
    );
    const userInfo = await response.json();
    
    return {
      provider: 'facebook',
      credential: data.accessToken,
      email: userInfo.email,
      name: userInfo.name,
      given_name: userInfo.first_name,
      family_name: userInfo.last_name,
      picture: userInfo.picture?.data?.url,
    };
  } catch (error: any) {
    console.error('[FACEBOOK_LOGIN] Error:', error);
    throw new Error(error.message || 'Facebook ile giriş başarısız');
  }
};

// Apple Sign-In (iOS only)
export const signInWithApple = async (): Promise<SocialAuthResult> => {
  try {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign-In sadece iOS cihazlarda kullanılabilir');
    }
    
    // Check if Apple Sign-In is supported
    const isSupported = appleAuth.isSupported;
    console.log('[APPLE_SIGNIN] Is supported:', isSupported);
    
    if (!isSupported) {
      throw new Error('Apple Sign-In bu cihazda desteklenmiyor (iOS 13+ gerekli)');
    }
    
    console.log('[APPLE_SIGNIN] Starting sign-in request...');
    
    // Perform sign-in request
    const appleAuthRequestResponse = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
    });
    
    console.log('[APPLE_SIGNIN] Response received:', {
      user: appleAuthRequestResponse.user,
      email: appleAuthRequestResponse.email,
      hasToken: !!appleAuthRequestResponse.identityToken,
    });
    
    // Get credential state
    const credentialState = await appleAuth.getCredentialStateForUser(
      appleAuthRequestResponse.user
    );
    
    console.log('[APPLE_SIGNIN] Credential state:', credentialState);
    
    if (credentialState !== appleAuth.State.AUTHORIZED) {
      throw new Error('Apple Sign-In yetkilendirmesi başarısız');
    }
    
    const { identityToken, fullName, email } = appleAuthRequestResponse;
    
    console.log('[APPLE_SIGNIN] Full name data:', {
      hasFullName: !!fullName,
      givenName: fullName?.givenName,
      familyName: fullName?.familyName,
    });
    
    if (!identityToken) {
      throw new Error('Apple identity token alınamadı');
    }
    
    const fullNameString = fullName ? `${fullName.givenName || ''} ${fullName.familyName || ''}`.trim() : undefined;
    console.log('[APPLE_SIGNIN] Constructed name:', fullNameString);
    
    return {
      provider: 'apple',
      credential: identityToken,
      email: email || undefined,
      name: fullNameString,
      given_name: fullName?.givenName || undefined,
      family_name: fullName?.familyName || undefined,
    };
  } catch (error: any) {
    console.error('[APPLE_SIGNIN] Error:', error);
    console.error('[APPLE_SIGNIN] Error code:', error.code);
    console.error('[APPLE_SIGNIN] Error message:', error.message);
    
    // Error 1001 = User cancelled or configuration issue
    if (error.code === '1001') {
      throw new Error('Apple Sign-In iptal edildi veya yapılandırma hatası. Lütfen Apple Developer Portal\'da Sign in with Apple capability\'sinin etkin olduğundan emin olun.');
    }
    
    throw new Error(error.message || 'Apple ile giriş başarısız');
  }
};

// Check if Apple Sign-In is available
export const isAppleSignInAvailable = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios') {
    return false;
  }
  
  return appleAuth.isSupported;
};

// Sign out from all social providers
export const signOutFromSocialProviders = async () => {
  try {
    // Google sign out
    await GoogleSignin.signOut();
  } catch (error) {
    console.warn('[SOCIAL_AUTH] Google sign out error:', error);
  }
  
  try {
    // Facebook logout
    LoginManager.logOut();
  } catch (error) {
    console.warn('[SOCIAL_AUTH] Facebook logout error:', error);
  }
};
