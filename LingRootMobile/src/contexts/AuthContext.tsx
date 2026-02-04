import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { AuthContextType, User } from '../types';
import { authService } from '../services/supabase';
import { apiService } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import secureStorage from '../services/secureStorage';
import NotificationService from '../services/notificationService';
import { registerPushTokenWithBackend, setupPushTokenRefreshListener } from '../services/pushTokenService';
import {
  signInWithGoogle,
  signInWithFacebook,
  signInWithApple,
  signOutFromSocialProviders,
  configureGoogleSignIn,
  type SocialAuthResult
} from '../services/socialAuth';
import { getApiBaseUrl } from '../services/environmentConfig';
import { AnalyticsHelper } from '../utils/AnalyticsHelper';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isBootstrappingRef = useRef(true);

  useEffect(() => {
    // Configure Google Sign-In on app start
    configureGoogleSignIn();

    // Configure Facebook SDK on app start
    const { configureFacebookSDK } = require('../services/socialAuth');
    configureFacebookSDK();

    // Initial auth state check
    checkAuthState();

    // Listen for auth changes - web projesindeki gibi basitleştirildi
    const { data: { subscription } } = authService.onAuthStateChange(async (authUser) => {
      // Avoid flashing login at app start: ignore auth change callbacks until initial check completes
      if (isBootstrappingRef.current) {
        return;
      }
      if (authUser) {
        // Build robust full name from Supabase user metadata
        const umd = authUser.user_metadata || {};
        const builtFullName = (
          umd.full_name ||
          umd.name ||
          [umd.firstName, umd.lastName].filter(Boolean).join(' ') ||
          [umd.firstname, umd.lastname].filter(Boolean).join(' ')
        )?.toString().trim();

        // Transform Supabase user to our User type
        const appUser: User = {
          id: authUser.id,
          email: authUser.email!,
          full_name: (builtFullName && builtFullName.length > 0) ? builtFullName : (authUser.email?.split('@')[0] || ''),
          avatar_url: umd.avatar_url,
          membership_level: umd.membership_level || 'free',
          role: umd.role,
          created_at: authUser.created_at,
          updated_at: authUser.updated_at || authUser.created_at,
        };
        setUser(appUser);

        // Start notification reminders after user login
        try {
          await NotificationService.setupPeriodicVocabularyNotifications();
        } catch (error) {
          // silent in production
        }
      } else {
        setUser(null);

        // Stop notifications when user logs out
        try {
          await NotificationService.stopVocabularyReminders();
        } catch (error) {
          // silent in production
        }
      }
    });

    // Setup global unauthorized handler (401)
    // Note: Temporarily disabled to fix circular dependency
    // Will be re-enabled after fixing module structure
    // setUnauthorizedHandler(async () => {
    //   try {
    //     await AsyncStorage.removeItem('auth_token');
    //     await AsyncStorage.removeItem('user_data');
    //     try { await AsyncStorage.removeItem('refresh_token'); } catch {}
    //   } catch {}
    //   setUser(null);
    // });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const checkAuthState = async () => {
    try {
      // Check if we have a stored token first
      const token = await secureStorage.getItem('auth_token');
      const storedUser = await AsyncStorage.getItem('user_data');

      console.log('🔍 [AUTH CHECK] Token exists:', !!token);
      console.log('🔍 [AUTH CHECK] User data exists:', !!storedUser);

      if (token && storedUser) {
        console.log('✅ [AUTH CHECK] Token and user found, validating...');

        // Validate token by making a test API call with timeout
        try {
          // Get API base URL from environment config
          const { getApiBaseUrl } = require('../services/environmentConfig');
          const API_BASE_URL = await getApiBaseUrl();
          console.log('🔍 [AUTH CHECK] Using API URL:', API_BASE_URL);

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

          const response = await fetch(`${API_BASE_URL}/api/health`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'User-Agent': 'LingRootMobile/1.0',
            },
            mode: 'cors',
            credentials: 'omit',
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            console.log('✅ [AUTH CHECK] Token is valid');
            const appUser: User = JSON.parse(storedUser);
            // Try to refresh name from backend /auth/me
            try {
              console.log('🔍 [AUTH CHECK] Fetching user info from /api/auth/me');
              const meRes = await fetch(`${API_BASE_URL}/api/auth/me`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
              });
              if (meRes.ok) {
                const meData = await meRes.json();
                const su: any = meData?.user || {};
                const built = (
                  su.full_name || su.name ||
                  [su.firstName, su.lastName].filter(Boolean).join(' ') ||
                  [su.firstname, su.lastname].filter(Boolean).join(' ')
                )?.toString().trim();
                appUser.full_name = (built && built.length > 0) ? built : (appUser.full_name || appUser.email?.split('@')[0] || '');
                appUser.role = su.role;
                await AsyncStorage.setItem('user_data', JSON.stringify(appUser));
              } else {
                if (!appUser.full_name || (appUser.full_name as any)?.toString().trim().length === 0) {
                  const su: any = JSON.parse(storedUser);
                  const built = (
                    su.full_name || su.name ||
                    [su.firstName, su.lastName].filter(Boolean).join(' ') ||
                    [su.firstname, su.lastname].filter(Boolean).join(' ')
                  )?.toString().trim();
                  appUser.full_name = (built && built.length > 0) ? built : (appUser.email?.split('@')[0] || '');
                }
              }
            } catch { }
            setUser(appUser);

            // Start notification reminders for stored user
            try {
              await NotificationService.setupPeriodicVocabularyNotifications();
            } catch (error) {
              // silent in production
            }

            // Register FCM/APNs device token for push notifications
            try {
              console.log('[AUTH][PushToken] Attempting push token registration (checkAuthState_response_ok)');
              await registerPushTokenWithBackend();
              setupPushTokenRefreshListener();
              console.log('[AUTH][PushToken] Push token registration finished (checkAuthState_response_ok)');
            } catch (pushError) {
              console.error('[AUTH][PushToken] Error during push token registration (checkAuthState_response_ok):', pushError);
              // Push token hatası uygulamayı bozmasın
            }
          } else {
            const errorText = await response.text();
            if (response.status === 401) {
              await secureStorage.removeItem('auth_token');
              await AsyncStorage.removeItem('user_data');
              try { await secureStorage.removeItem('refresh_token'); } catch { }
              setUser(null);
            } else {
              try {
                const appUser: User = JSON.parse(storedUser);
                setUser(appUser);
                try {
                  console.log('[AUTH][PushToken] Attempting push token registration (checkAuthState_response_not_ok)');
                  await registerPushTokenWithBackend();
                  setupPushTokenRefreshListener();
                  console.log('[AUTH][PushToken] Push token registration finished (checkAuthState_response_not_ok)');
                } catch (pushError) {
                  console.error('[AUTH][PushToken] Error during push token registration (checkAuthState_response_not_ok):', pushError);
                }
              } catch { }
            }
          }
        } catch (validateError: any) {
          // Network or validation error → preserve session locally
          try {
            const appUser: User = JSON.parse(storedUser);
            setUser(appUser);
            try {
              console.log('[AUTH][PushToken] Attempting push token registration (checkAuthState_validateError)');
              await registerPushTokenWithBackend();
              setupPushTokenRefreshListener();
              console.log('[AUTH][PushToken] Push token registration finished (checkAuthState_validateError)');
            } catch (pushError) {
              console.error('[AUTH][PushToken] Error during push token registration (checkAuthState_validateError):', pushError);
            }
          } catch {
            // If parsing fails, do not clear token; just keep user null
          }
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      // Mark bootstrap complete so further auth change events are processed
      isBootstrappingRef.current = false;
      setIsLoading(false);
    }
  };

  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {

      // First check network connectivity
      const isConnected = await apiService.checkConnectivity();
      if (!isConnected) {
        throw new Error('Backend serveri ile bağlantı kurulamıyor. Lütfen internet bağlantınızı kontrol edin.');
      }

      // Web uygulaması gibi backend API'sini kullan
      const API_BASE_URL = await getApiBaseUrl();

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'LingRootMobile/1.0',
        },
        mode: 'cors',
        credentials: 'omit',
        // Always request long-lived token on mobile
        body: JSON.stringify({ email, password, rememberMe: true }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const err = new Error(errorData.message || 'Login failed');
        (err as any).code = errorData.code;
        throw err;
      }

      const data = await response.json();

      if (data.success && data.data.user) {
        // Transform backend user to our User type
        const backendUser = data.data.user;
        // Build full name robustly from various possible backend fields
        const builtFullName = (
          backendUser.name ||
          backendUser.full_name ||
          [backendUser.firstName, backendUser.lastName].filter(Boolean).join(' ') ||
          [backendUser.firstname, backendUser.lastname].filter(Boolean).join(' ')
        )?.toString().trim();

        const appUser: User = {
          id: backendUser.id,
          email: backendUser.email,
          full_name: builtFullName && builtFullName.length > 0 ? builtFullName : (backendUser.email?.split('@')[0] || ''),
          avatar_url: backendUser.avatar_url,
          membership_level: backendUser.membership_status || 'free',
          role: backendUser.role,
          created_at: backendUser.created_at,
          updated_at: backendUser.updated_at,
        };

        // Store token and user data in AsyncStorage
        if (data.data.token) {
          console.log('🔐 [AUTH] Saving token to SecureStore:', data.data.token.substring(0, 20) + '...');
          await secureStorage.setItem('auth_token', data.data.token);
          await AsyncStorage.setItem('user_data', JSON.stringify(appUser));
          console.log('✅ [AUTH] Token saved successfully');
          // Store refresh token if provided by backend
          try {
            if (data.data.refreshToken) {
              await secureStorage.setItem('refresh_token', data.data.refreshToken);
              console.log('✅ [AUTH] Refresh token saved');
            }
          } catch { }
        }

        setUser(appUser);

        // Refresh environment config after login to check user's test status
        try {
          const { refreshEnvironmentConfig } = require('../services/environmentConfig');
          await refreshEnvironmentConfig();
          console.log('✅ [AUTH] Environment config refreshed after login');
        } catch (envError) {
          console.log('⚠️ [AUTH] Failed to refresh environment config:', envError);
        }

        // Backend oturumu kurulduktan sonra push token kaydını yap
        try {
          console.log('[AUTH][PushToken] Attempting push token registration (signIn)');
          await registerPushTokenWithBackend();
          setupPushTokenRefreshListener();
          console.log('[AUTH][PushToken] Push token registration finished (signIn)');
        } catch (pushError) {
          console.error('[AUTH][PushToken] Error during push token registration (signIn):', pushError);
          // Push token hatası uygulamayı bozmasın
        }

        setIsLoading(false);
      } else {
        const err = new Error(data.message || 'Login failed');
        (err as any).code = data.code;
        throw err;
      }
    } catch (error: any) {
      setIsLoading(false);
      // silent in production
      throw error;
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName?: string, phoneNumber?: string) => {
    setIsLoading(true);
    try {
      await authService.signUp(email, password, fullName, phoneNumber);
      // Signup does NOT log the user in; stop global loading here so UI can navigate to Login
      setIsLoading(false);
      // User state would be updated via onAuthStateChange only after an actual login
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      // Clear tokens (SecureStore) and user data (AsyncStorage)
      await secureStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
      try { await secureStorage.removeItem('refresh_token'); } catch { }

      // Sign out from social providers
      await signOutFromSocialProviders();

      await authService.signOut();
      setUser(null);
      // Ensure UI leaves loading state after successful logout
      setIsLoading(false);
      // User state will be updated via onAuthStateChange
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  }, []);

  // Social authentication handler
  const handleSocialAuth = useCallback(async (socialResult: SocialAuthResult) => {
    const API_BASE_URL = await getApiBaseUrl();

    // Determine endpoint based on provider
    const endpoint = socialResult.provider === 'google'
      ? '/api/auth/google-login'
      : socialResult.provider === 'facebook'
        ? '/api/auth/facebook-login'
        : '/api/auth/apple-login';

    // Prepare request body
    const requestBody: any = {
      credential: socialResult.credential,
      rememberMe: true
    };

    // For Apple, include email and name if available (first login only)
    if (socialResult.provider === 'apple') {
      if (socialResult.email) requestBody.email = socialResult.email;
      if (socialResult.name) requestBody.name = socialResult.name;
    }

    // Send social auth credential to backend
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'LingRootMobile/1.0',
      },
      mode: 'cors',
      credentials: 'omit',
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();

      // Email doğrulanmamışsa özel hata mesajı
      if (errorData.code === 'EMAIL_NOT_VERIFIED') {
        throw new Error(errorData.message || 'Email adresiniz doğrulanmamış. Lütfen email adresinize gönderilen doğrulama linkine tıklayın.');
      }

      throw new Error(errorData.message || 'Sosyal giriş başarısız');
    }

    const data = await response.json();

    if (data.success && data.data.user) {
      const backendUser = data.data.user;
      const builtFullName = (
        backendUser.name ||
        backendUser.full_name ||
        [backendUser.firstName, backendUser.lastName].filter(Boolean).join(' ') ||
        [backendUser.firstname, backendUser.lastname].filter(Boolean).join(' ')
      )?.toString().trim();

      const appUser: User = {
        id: backendUser.id,
        email: backendUser.email,
        full_name: builtFullName && builtFullName.length > 0 ? builtFullName : (backendUser.email?.split('@')[0] || ''),
        avatar_url: backendUser.avatar_url,
        membership_level: backendUser.membership_status || 'free',
        role: backendUser.role,
        created_at: backendUser.created_at,
        updated_at: backendUser.updated_at,
      };

      if (data.data.token) {
        await secureStorage.setItem('auth_token', data.data.token);
        await AsyncStorage.setItem('user_data', JSON.stringify(appUser));
        try {
          if (data.data.refreshToken) {
            await secureStorage.setItem('refresh_token', data.data.refreshToken);
          }
        } catch { }
      }

      setUser(appUser);

      // Analytics - Identify User
      AnalyticsHelper.setUserId(appUser.id);
      AnalyticsHelper.setUserProps({
        user_role: appUser.role || 'user',
        membership_level: appUser.membership_level || 'free',
      });

      // Backend oturumu kurulduktan sonra push token kaydını yap
      try {
        console.log('[AUTH][PushToken] Attempting push token registration (handleSocialAuth)');
        await registerPushTokenWithBackend();
        setupPushTokenRefreshListener();
        console.log('[AUTH][PushToken] Push token registration finished (handleSocialAuth)');
      } catch (pushError) {
        console.error('[AUTH][PushToken] Error during push token registration (handleSocialAuth):', pushError);
        // Push token hatası uygulamayı bozmasın
      }
    } else {
      throw new Error(data.message || 'Sosyal giriş başarısız');
    }
  }, []);

  const signInWithGoogleProvider = useCallback(async () => {
    setIsLoading(true);
    try {
      const isConnected = await apiService.checkConnectivity();
      if (!isConnected) {
        throw new Error('Backend serveri ile bağlantı kurulamıyor. Lütfen internet bağlantınızı kontrol edin.');
      }

      const socialResult = await signInWithGoogle();
      await handleSocialAuth(socialResult);
      setIsLoading(false);
    } catch (error: any) {
      setIsLoading(false);
      throw error;
    }
  }, [handleSocialAuth]);

  const signInWithFacebookProvider = useCallback(async () => {
    setIsLoading(true);
    try {
      const isConnected = await apiService.checkConnectivity();
      if (!isConnected) {
        throw new Error('Backend serveri ile bağlantı kurulamıyor. Lütfen internet bağlantınızı kontrol edin.');
      }

      const socialResult = await signInWithFacebook();
      await handleSocialAuth(socialResult);
      setIsLoading(false);
    } catch (error: any) {
      setIsLoading(false);
      throw error;
    }
  }, [handleSocialAuth]);

  const signInWithAppleProvider = useCallback(async () => {
    setIsLoading(true);
    try {
      const isConnected = await apiService.checkConnectivity();
      if (!isConnected) {
        throw new Error('Backend serveri ile bağlantı kurulamıyor. Lütfen internet bağlantınızı kontrol edin.');
      }

      const socialResult = await signInWithApple();

      // Log Apple name data for debugging
      console.log('[AUTH_CONTEXT] Apple Sign-In result:', {
        hasName: !!socialResult.name,
        name: socialResult.name,
        email: socialResult.email
      });

      await handleSocialAuth(socialResult);
      setIsLoading(false);
    } catch (error: any) {
      setIsLoading(false);
      throw error;
    }
  }, [handleSocialAuth]);

  const updateUserProfile = useCallback(async (data: Partial<User> & { phoneNumber?: string; full_name?: string }) => {
    if (!user) throw new Error('Oturum bulunamadı');
    try {
      await apiService.updateProfile(user.id, data as any);
      const updatedUser: User = {
        ...user,
        full_name: (data.full_name ?? user.full_name) as any,
        updated_at: new Date().toISOString(),
      };
      setUser(updatedUser);
      try { await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser)); } catch { }
    } catch (error: any) {
      throw new Error(error?.message || 'Profil güncelleme başarısız');
    }
  }, [user]);

  const value: AuthContextType = useMemo(() => ({
    user,
    isLoading,
    signIn,
    signUp,
    signOut,
    updateUserProfile,
    signInWithGoogle: signInWithGoogleProvider,
    signInWithFacebook: signInWithFacebookProvider,
    signInWithApple: signInWithAppleProvider,
  }), [user, isLoading, signIn, signUp, signOut, updateUserProfile, signInWithGoogleProvider, signInWithFacebookProvider, signInWithAppleProvider]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 