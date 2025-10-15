import { GoogleSignin } from '@react-native-google-signin/google-signin';
import appleAuth from '@invertase/react-native-apple-authentication';
import { Platform } from 'react-native';
import { 
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, 
  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID 
} from '@env';

// Google Sign-In Configuration
export const configureGoogleSignIn = () => {
  try {
    const webClientId = EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    const androidClientId = EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
    const iosClientId = EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
    
    console.log('[GOOGLE_SIGNIN] Environment variables:', {
      webClientId: webClientId ? `${webClientId.substring(0, 20)}...` : 'undefined',
      androidClientId: androidClientId ? `${androidClientId.substring(0, 20)}...` : 'undefined',
      iosClientId: iosClientId ? `${iosClientId.substring(0, 20)}...` : 'undefined',
    });
    
    // Don't configure if no client IDs are provided
    if (!webClientId && !androidClientId && !iosClientId) {
      console.warn('[GOOGLE_SIGNIN] No client IDs configured. Google Sign-In will not work.');
      return;
    }
    
    // Platform-specific configuration
    const config: any = {
      webClientId: webClientId || undefined,
      offlineAccess: false,
    };
    
    if (Platform.OS === 'android' && androidClientId) {
      // Android uses its own Client ID
      config.androidClientId = androidClientId;
    } else if (Platform.OS === 'ios' && iosClientId) {
      config.iosClientId = iosClientId;
    }
    
    GoogleSignin.configure(config);
    
    console.log('[GOOGLE_SIGNIN] Configuration successful', {
      platform: Platform.OS,
      hasWebClientId: !!webClientId,
      hasAndroidClientId: !!androidClientId,
      hasIosClientId: !!iosClientId,
    });
  } catch (error) {
    console.error('[GOOGLE_SIGNIN] Configuration error:', error);
  }
};

export interface SocialAuthResult {
  provider: 'google' | 'apple';
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
    console.log('[GOOGLE_SIGNIN] Starting Google Sign-In...');
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    
    console.log('[GOOGLE_SIGNIN] User info received:', {
      email: userInfo.data?.user?.email,
      name: userInfo.data?.user?.name,
    });
    
    // Get ID token for backend verification
    const tokens = await GoogleSignin.getTokens();
    console.log('[GOOGLE_SIGNIN] Tokens received, returning result');
    
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
    console.error('[GOOGLE_SIGNIN] Error:', error);
    throw new Error(error.message || 'Google ile giriş başarısız');
  }
};

// Facebook Login - Removed (package uninstalled)
// export const signInWithFacebook = async (): Promise<SocialAuthResult> => { ... }

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
    
    if (!identityToken) {
      throw new Error('Apple identity token alınamadı');
    }
    
    return {
      provider: 'apple',
      credential: identityToken,
      email: email || undefined,
      name: fullName ? `${fullName.givenName || ''} ${fullName.familyName || ''}`.trim() : undefined,
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
};
