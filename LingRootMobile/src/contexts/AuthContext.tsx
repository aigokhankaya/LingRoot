import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AuthContextType, User } from '../types';
import { authService } from '../services/supabase';
import { apiService, setUnauthorizedHandler } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from '../services/notificationService';
import Constants from 'expo-constants';

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
          created_at: authUser.created_at,
          updated_at: authUser.updated_at || authUser.created_at,
        };
        setUser(appUser);
        
        // Start notification reminders after user login
        try {
          console.log('📱 [AUTH] User logged in, starting vocabulary reminders...');
          await NotificationService.setupPeriodicVocabularyNotifications();
        } catch (error) {
          console.error('📱 [AUTH] Failed to start notifications:', error);
        }
      } else {
        setUser(null);
        
        // Stop notifications when user logs out
        try {
          console.log('📱 [AUTH] User logged out, stopping vocabulary reminders...');
          await NotificationService.stopVocabularyReminders();
        } catch (error) {
          console.error('📱 [AUTH] Failed to stop notifications:', error);
        }
      }
    });

    // Setup global unauthorized handler (401)
    setUnauthorizedHandler(async () => {
      try {
        await AsyncStorage.removeItem('auth_token');
        await AsyncStorage.removeItem('user_data');
      } catch {}
      setUser(null);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const checkAuthState = async () => {
    try {
      // Check if we have a stored token first
      const token = await AsyncStorage.getItem('auth_token');
      const storedUser = await AsyncStorage.getItem('user_data');
      
      if (token && storedUser) {
        console.log('🔧 [AUTH DEBUG] Found stored token and user data');
        
        // Validate token by making a test API call
        try {
          const API_BASE_URL = 'https://lingloops-backend.onrender.com';
          console.log('🔧 [AUTH DEBUG] Token validation başlatılıyor...');
          console.log('🔧 [AUTH DEBUG] API_BASE_URL:', API_BASE_URL);
          console.log('🔧 [AUTH DEBUG] Full URL:', `${API_BASE_URL}/api/health`);
          
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
          });
          
          console.log('🔧 [AUTH DEBUG] Response status:', response.status);
          console.log('🔧 [AUTH DEBUG] Response ok:', response.ok);
          console.log('🔧 [AUTH DEBUG] Response statusText:', response.statusText);
          
          if (response.ok) {
            console.log('🔧 [AUTH DEBUG] Token is valid');
            const appUser: User = JSON.parse(storedUser);
            // Try to refresh name from backend /auth/me
            try {
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
            } catch {}
            setUser(appUser);
            
            // Start notification reminders for stored user
            try {
              console.log('📱 [AUTH] Stored user validated, starting vocabulary reminders...');
              await NotificationService.setupPeriodicVocabularyNotifications();
            } catch (error) {
              console.error('📱 [AUTH] Failed to start notifications for stored user:', error);
            }
          } else {
            const errorText = await response.text();
            console.log('🔧 [AUTH DEBUG] Error response text:', errorText);
            if (response.status === 401) {
              console.log('🔧 [AUTH DEBUG] 401 received → clearing token');
              await AsyncStorage.removeItem('auth_token');
              await AsyncStorage.removeItem('user_data');
              setUser(null);
            } else {
              console.log('🔧 [AUTH DEBUG] Non-auth error; preserving session');
              try {
                const appUser: User = JSON.parse(storedUser);
                setUser(appUser);
              } catch {}
            }
          }
        } catch (validateError: any) {
          console.log('🔧 [AUTH DEBUG] Token validation error:', validateError);
          console.log('🔧 [AUTH DEBUG] Error message:', validateError.message);
          console.log('🔧 [AUTH DEBUG] Error type:', validateError.constructor.name);
          // Network or validation error → preserve session locally
          try {
            const appUser: User = JSON.parse(storedUser);
            setUser(appUser);
          } catch {
            // If parsing fails, do not clear token; just keep user null
          }
        }
      } else {
        console.log('🔧 [AUTH DEBUG] No stored token or user data found');
        setUser(null);
      }
    } catch (error) {
      console.error('Auth state check error:', error);
      setUser(null);
    } finally {
      // Mark bootstrap complete so further auth change events are processed
      isBootstrappingRef.current = false;
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log('🔧 [AUTH DEBUG] signIn attempt via Backend API:', { email });
      
      // First check network connectivity
      const isConnected = await apiService.checkConnectivity();
      if (!isConnected) {
        throw new Error('Backend serveri ile bağlantı kurulamıyor. Lütfen internet bağlantınızı kontrol edin.');
      }
      
      // Web uygulaması gibi backend API'sini kullan
      const API_BASE_URL = 'https://lingloops-backend.onrender.com';
      console.log('🔧 [AUTH DEBUG] Login request başlatılıyor...');
      console.log('🔧 [AUTH DEBUG] API_BASE_URL:', API_BASE_URL);
      console.log('🔧 [AUTH DEBUG] Full login URL:', `${API_BASE_URL}/api/auth/login`);
      
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
      
      console.log('🔧 [AUTH DEBUG] Response received!');
      console.log('🔧 [AUTH DEBUG] Backend API response status:', response.status);
      console.log('🔧 [AUTH DEBUG] Response ok:', response.ok);
      console.log('🔧 [AUTH DEBUG] Response statusText:', response.statusText);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }
      
      const data = await response.json();
      console.log('🔧 [AUTH DEBUG] Backend API response:', data);
      
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
          created_at: backendUser.created_at,
          updated_at: backendUser.updated_at,
        };
        
        // Store token and user data in AsyncStorage
        if (data.data.token) {
          await AsyncStorage.setItem('auth_token', data.data.token);
          await AsyncStorage.setItem('user_data', JSON.stringify(appUser));
          console.log('🔧 [AUTH DEBUG] Token and user data stored in AsyncStorage');
        }
        
        setUser(appUser);
        setIsLoading(false);
        console.log('🔧 [AUTH DEBUG] Login successful, user set:', appUser);
      } else {
        throw new Error(data.message || 'Login failed');
      }
    } catch (error: any) {
      setIsLoading(false);
      console.error('🔧 [AUTH DEBUG] signIn error:', error);
      console.error('🔧 [AUTH DEBUG] Error message:', error.message);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    setIsLoading(true);
    try {
      await authService.signUp(email, password, fullName);
      // User state will be updated via onAuthStateChange
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      // Clear AsyncStorage
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
      console.log('🔧 [AUTH DEBUG] Token and user data cleared from AsyncStorage');
      
      await authService.signOut();
      setUser(null);
      // Ensure UI leaves loading state after successful logout
      setIsLoading(false);
      // User state will be updated via onAuthStateChange
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 