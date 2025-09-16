import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AuthContextType, User } from '../types';
import { authService } from '../services/supabase';
import { apiService, setUnauthorizedHandler } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from '../services/notificationServiceNoop';

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
    setUnauthorizedHandler(async () => {
      try {
        await AsyncStorage.removeItem('auth_token');
        await AsyncStorage.removeItem('user_data');
        try { await AsyncStorage.removeItem('refresh_token'); } catch {}
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
        
        // Validate token by making a test API call with timeout
        try {
          const API_BASE_URL = 'https://lingloops-backend.onrender.com';
          
          console.log('Validating auth token...');
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
              await NotificationService.setupPeriodicVocabularyNotifications();
            } catch (error) {
              // silent in production
            }
          } else {
            const errorText = await response.text();
            if (response.status === 401) {
              await AsyncStorage.removeItem('auth_token');
              await AsyncStorage.removeItem('user_data');
              try { await AsyncStorage.removeItem('refresh_token'); } catch {}
              setUser(null);
            } else {
              try {
                const appUser: User = JSON.parse(storedUser);
                setUser(appUser);
              } catch {}
            }
          }
        } catch (validateError: any) {
          console.log('Auth validation error:', validateError.name, validateError.message);
          // Network or validation error → preserve session locally
          try {
            const appUser: User = JSON.parse(storedUser);
            setUser(appUser);
            console.log('Using cached user data due to network error');
          } catch {
            console.log('Failed to parse stored user data');
            // If parsing fails, do not clear token; just keep user null
          }
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.log('Auth check error:', error);
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
      
      // First check network connectivity
      const isConnected = await apiService.checkConnectivity();
      if (!isConnected) {
        throw new Error('Backend serveri ile bağlantı kurulamıyor. Lütfen internet bağlantınızı kontrol edin.');
      }
      
      // Web uygulaması gibi backend API'sini kullan
      const API_BASE_URL = 'https://lingloops-backend.onrender.com';
      
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
          created_at: backendUser.created_at,
          updated_at: backendUser.updated_at,
        };
        
        // Store token and user data in AsyncStorage
        if (data.data.token) {
          await AsyncStorage.setItem('auth_token', data.data.token);
          await AsyncStorage.setItem('user_data', JSON.stringify(appUser));
          // Store refresh token if provided by backend
          try {
            if (data.data.refreshToken) {
              await AsyncStorage.setItem('refresh_token', data.data.refreshToken);
            }
          } catch {}
        }
        
        setUser(appUser);
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
  };

  const signUp = async (email: string, password: string, fullName?: string, phoneNumber?: string) => {
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
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      // Clear AsyncStorage
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
      try { await AsyncStorage.removeItem('refresh_token'); } catch {}
      
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

  const updateUserProfile = async (data: Partial<User> & { phoneNumber?: string; full_name?: string }) => {
    if (!user) throw new Error('Oturum bulunamadı');
    try {
      await apiService.updateProfile(user.id, data as any);
      const updatedUser: User = {
        ...user,
        full_name: (data.full_name ?? user.full_name) as any,
        updated_at: new Date().toISOString(),
      };
      setUser(updatedUser);
      try { await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser)); } catch {}
    } catch (error: any) {
      throw new Error(error?.message || 'Profil güncelleme başarısız');
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    signIn,
    signUp,
    signOut,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 