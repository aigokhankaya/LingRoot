import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthContextType, User } from '../types';
import { authService } from '../services/supabase';

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

  useEffect(() => {
    // Initial auth state check
    checkAuthState();

    // Listen for auth changes - web projesindeki gibi basitleştirildi
    const { data: { subscription } } = authService.onAuthStateChange((authUser) => {
      if (authUser) {
        // Transform Supabase user to our User type
        const appUser: User = {
          id: authUser.id,
          email: authUser.email!,
          full_name: authUser.user_metadata?.full_name,
          avatar_url: authUser.user_metadata?.avatar_url,
          membership_level: authUser.user_metadata?.membership_level || 'free',
          created_at: authUser.created_at,
          updated_at: authUser.updated_at || authUser.created_at,
        };
        setUser(appUser);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const checkAuthState = async () => {
    try {
      const authUser = await authService.getCurrentUser();
      if (authUser) {
        const appUser: User = {
          id: authUser.id,
          email: authUser.email!,
          full_name: authUser.user_metadata?.full_name,
          avatar_url: authUser.user_metadata?.avatar_url,
          membership_level: authUser.user_metadata?.membership_level || 'free',
          created_at: authUser.created_at,
          updated_at: authUser.updated_at || authUser.created_at,
        };
        setUser(appUser);
      }
    } catch (error) {
      console.error('Auth state check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log('🔧 [AUTH DEBUG] signIn attempt via Backend API:', { email });
      
      // Web uygulaması gibi backend API'sini kullan
      const API_BASE_URL = 'https://lingloops-backend.onrender.com'; // production
      // const API_BASE_URL = 'http://localhost:5001'; // development
      
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      console.log('🔧 [AUTH DEBUG] Backend API response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }
      
      const data = await response.json();
      console.log('🔧 [AUTH DEBUG] Backend API response:', data);
      
      if (data.success && data.data.user) {
        // Transform backend user to our User type
        const backendUser = data.data.user;
        const appUser: User = {
          id: backendUser.id,
          email: backendUser.email,
          full_name: backendUser.name || `${backendUser.firstName} ${backendUser.lastName}`,
          avatar_url: backendUser.avatar_url,
          membership_level: backendUser.membership_status || 'free',
          created_at: backendUser.created_at,
          updated_at: backendUser.updated_at,
        };
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
      await authService.signOut();
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