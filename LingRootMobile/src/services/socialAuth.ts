import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { LoginManager, AccessToken } from 'react-native-fbsdk-next';
import appleAuth from '@invertase/react-native-apple-authentication';
import { Platform } from 'react-native';

// Google Sign-In Configuration
export const configureGoogleSignIn = () => {
  try {
    // Hardcoded for production build
    const webClientId = '308629480159-431is64c2cei40@lnshdtb5rurmsalt.apps.googleusercontent.com';
    const iosClientId = '308629480159-5elk7uigs451vdpvalcr6628la2mqa7t.apps.googleusercontent.com';
    
    // Don't configure if no client IDs are provided
    if (!webClientId && !iosClientId) {
      console.warn('[GOOGLE_SIGNIN] No client IDs configured. Google Sign-In will not work.');
      return;
    }
    
    GoogleSignin.configure({
      webClientId: webClientId || undefined,
      iosClientId: iosClientId || undefined,
      offlineAccess: false, // Set to false to avoid server web ClientId requirement
    });
    
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
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    
    // Get ID token for backend verification
    const tokens = await GoogleSignin.getTokens();
    
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
  
  try {
    // Facebook logout
    LoginManager.logOut();
  } catch (error) {
    console.warn('[SOCIAL_AUTH] Facebook logout error:', error);
  }
};
