"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getApiUrl } from './api';

// Types
interface User {
  id: string;
  email: string;
  role: string;
  membershipStatus: 'free' | 'premium' | 'enterprise';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; message?: string }>;
  loginWithGoogle: (credential: string, rememberMe?: boolean) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  register: (firstName: string, lastName: string, email: string, phoneNumber: string, password: string) => Promise<{ success: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sayfa yenilendiğinde token kontrolü
  useEffect(() => {
    const checkToken = async () => {
      setIsLoading(true);
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('lingroot_token') : null;
        
        if (!token) {
          console.log('[AUTH] Token bulunamadı');
          setUser(null);
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }
        
        // Oturum bilgilerini kontrol et
        const response = await fetch(getApiUrl('auth/me'), {
          method: 'GET',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        console.log('[AUTH] /auth/me response status:', response.status);
        const data = await response.json();
        console.log('[AUTH] /auth/me response data:', data);
        
        if (response.ok && data.success && (data.user || data.data?.user)) {
          const userData = data.user || data.data.user;
          const loadedUser: User = {
            id: userData.id,
            email: userData.email,
            role: userData.role || 'user',
            membershipStatus: userData.membershipStatus || 'free',
          };
          
          console.log('[AUTH] Oturum doğrulandı:', loadedUser);
          setUser(loadedUser);
          setIsAuthenticated(true);
          
          // Token yenileme
          if (data.data?.token) {
            localStorage.setItem('lingroot_token', data.data.token);
          }
        } else {
          console.log('[AUTH] Oturum geçersiz, response:', response.status, data);
          // Mock kullanıcı oluştur (development için)
          if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_USER === 'true') {
            console.log('[AUTH] Development ortamında mock kullanıcı oluşturuluyor (hata sonrası)');
            const mockUser: User = {
              id: 'mock-user-id',
              email: 'mock@user.com',
              role: 'user',
              membershipStatus: 'premium'
            };
            setUser(mockUser);
            setIsAuthenticated(true);
            localStorage.setItem('lingroot_token', 'mock-token-for-development');
          } else {
            setUser(null);
            setIsAuthenticated(false);
            localStorage.removeItem('lingroot_token');
          }
        }
      } catch (error) {
        console.error('[AUTH] Oturum kontrolü hatası:', error);
        
        // Development ortamında mock kullanıcı oluştur
        if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_USER === 'true') {
          console.log('[AUTH] Development ortamında mock kullanıcı oluşturuluyor (hata sonrası)');
          const mockUser: User = {
            id: 'mock-user-id',
            email: 'mock@user.com',
            role: 'user',
            membershipStatus: 'premium'
          };
          setUser(mockUser);
          setIsAuthenticated(true);
          localStorage.setItem('lingroot_token', 'mock-token-for-development');
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    checkToken();
  }, []);

  // Token süresini düzenli olarak kontrol et
  useEffect(() => {
    const interval = setInterval(() => {
      checkTokenExpiry();
    }, 60000); // Her dakika kontrol et

    return () => clearInterval(interval);
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean = false): Promise<{ success: boolean; message?: string }> => {
    try {
      console.log('[AUTH] login() called', { email });
      console.log("[API URL]", getApiUrl('/auth/login'));
      
      // API isteği yap
      // NOT: Development modunda bile gerçek API çağrısı yapacağız
      // ancak API çağrısı başarısız olursa mock login yapacağız
      
      const response = await fetch(getApiUrl('auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });
      
      console.log('[AUTH] login API response status:', response.status);
      
      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        console.log('[AUTH] login() JSON parse error', jsonErr);
        
        // Development modunda ve JSON parse hatası varsa mock login yap
        if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_USER === 'true') {
          console.log('[AUTH] Development ortamında mock login yapılıyor (JSON parse hatası sonrası)');
          const mockUser: User = {
            id: 'mock-user-id',
            email: email || 'mock@user.com',
            role: 'user',
            membershipStatus: 'premium'
          };
          setUser(mockUser);
          setIsAuthenticated(true);
          localStorage.setItem('lingroot_token', 'mock-token-for-development');
          return { success: true };
        }
        
        return { success: false, message: 'Sunucudan geçersiz yanıt alındı.' };
      }
      
      console.log('[AUTH] login() response data:', data);
      
      if (response.ok && data.success) {
        // User nesnesini normalize et
        const rawUser = data.data.user;
        const user: User = {
          id: rawUser.id,
          email: rawUser.email,
          role: rawUser.role || 'user',
          membershipStatus: rawUser.membershipStatus || 'free',
        };
        setUser(user);
        setIsAuthenticated(true);
        // Eğer backend token döndürüyorsa localStorage'a kaydet
        if (data.data.token) {
          localStorage.setItem('lingroot_token', data.data.token);
          // Beni hatırla seçeneği için flag kaydet
          localStorage.setItem('lingroot_remember_me', rememberMe.toString());
          console.log('[AUTH] Token kaydedildi:', data.data.token, 'Remember me:', rememberMe);
        }
        console.log('[AUTH] setUser & setIsAuthenticated', user);
        return { success: true };
      } else {
        // API hatası durumunda development modunda mock login yap
        if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_USER === 'true') {
          console.log('[AUTH] Development ortamında mock login yapılıyor (API hatası sonrası)');
          const mockUser: User = {
            id: 'mock-user-id',
            email: email || 'mock@user.com',
            role: 'user',
            membershipStatus: 'premium'
          };
          setUser(mockUser);
          setIsAuthenticated(true);
          localStorage.setItem('lingroot_token', 'mock-token-for-development');
          return { success: true };
        }
        
        setUser(null);
        setIsAuthenticated(false);
        console.log('[AUTH] login() failed', data.message);
        return { success: false, message: data.message || 'Giriş başarısız.' };
      }
    } catch (error: any) {
      console.log('[AUTH] login() error', error);
      
      // Fetch hatası durumunda development modunda mock login yap
      if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_USER === 'true') {
        console.log('[AUTH] Development ortamında mock login yapılıyor (fetch hatası sonrası)');
        const mockUser: User = {
          id: 'mock-user-id',
          email: email || 'mock@user.com',
          role: 'user',
          membershipStatus: 'premium'
        };
        setUser(mockUser);
        setIsAuthenticated(true);
        localStorage.setItem('lingroot_token', 'mock-token-for-development');
        return { success: true };
      }
      
      setUser(null);
      setIsAuthenticated(false);
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        return { success: false, message: 'Sunucuya bağlanılamadı, lütfen internet bağlantınızı kontrol edin veya daha sonra tekrar deneyin.' };
      }
      return { success: false, message: error.message || 'Giriş sırasında bir hata oluştu.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('lingroot_token');
    localStorage.removeItem('lingroot_remember_me');
    setUser(null);
    setIsAuthenticated(false);
  };

  // Token süresini kontrol et ve gerekirse logout yap
  const checkTokenExpiry = () => {
    const token = localStorage.getItem('lingroot_token');
    const rememberMe = localStorage.getItem('lingroot_remember_me') === 'true';
    
    if (!token) return;
    
    try {
      // JWT token'ı decode et (basit bir şekilde)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      
      // Token süresi dolmuşsa logout yap
      if (payload.exp < currentTime) {
        console.log('[AUTH] Token süresi doldu, logout yapılıyor');
        logout();
        return;
      }
      
      // Beni hatırla seçili değilse ve 1 saatten fazla geçmişse logout yap
      if (!rememberMe) {
        const tokenAge = currentTime - payload.iat;
        const oneHour = 60 * 60; // 1 saat saniye cinsinden
        
        if (tokenAge > oneHour) {
          console.log('[AUTH] Idle timeout, logout yapılıyor');
          logout();
        }
      }
    } catch (error) {
      console.error('[AUTH] Token decode hatası:', error);
      logout();
    }
  };

  const loginWithGoogle = async (credential: string, rememberMe: boolean = false): Promise<{ success: boolean; message?: string }> => {
    try {
      console.log('[AUTH] loginWithGoogle() called');
      
      const response = await fetch(getApiUrl('auth/google'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, rememberMe }),
        credentials: 'include'
      });
      
      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        console.log('[AUTH] loginWithGoogle() JSON parse error', jsonErr);
        return { success: false, message: 'Sunucudan geçersiz yanıt alındı.' };
      }
      
      console.log('[AUTH] loginWithGoogle() response data:', data);
      
      if (response.ok && data.success) {
        const rawUser = data.data.user;
        const user: User = {
          id: rawUser.id,
          email: rawUser.email,
          role: rawUser.role || 'user',
          membershipStatus: rawUser.membershipStatus || 'free',
        };
        setUser(user);
        setIsAuthenticated(true);
        
        if (data.data.token) {
          localStorage.setItem('lingroot_token', data.data.token);
          localStorage.setItem('lingroot_remember_me', rememberMe.toString());
          console.log('[AUTH] Google token kaydedildi:', data.data.token, 'Remember me:', rememberMe);
        }
        
        return { success: true };
      } else {
        setUser(null);
        setIsAuthenticated(false);
        return { success: false, message: data.message || 'Google ile giriş başarısız.' };
      }
    } catch (error: any) {
      console.log('[AUTH] loginWithGoogle() error', error);
      setUser(null);
      setIsAuthenticated(false);
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        return { success: false, message: 'Sunucuya bağlanılamadı, lütfen internet bağlantınızı kontrol edin.' };
      }
      return { success: false, message: error.message || 'Google ile giriş sırasında bir hata oluştu.' };
    }
  };

  const register = async (
    firstName: string,
    lastName: string,
    email: string,
    phoneNumber: string,
    password: string
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      console.log('[AUTH] register() called', { email });

      const response = await fetch(getApiUrl('auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, phoneNumber, password })
      });
      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        console.log('[AUTH] register() JSON parse error', jsonErr);
        return { success: false, message: 'Sunucudan geçersiz yanıt alındı.' };
      }
      console.log('[AUTH] register() response', data);
      if (data.success) {
        // Kayıt başarılıysa otomatik login
        await login(email, password);
      }
      return data;
    } catch (error: any) {
      console.log('[AUTH] register() error', error);
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        return { success: false, message: 'Sunucuya bağlanılamadı, lütfen internet bağlantınızı kontrol edin veya daha sonra tekrar deneyin.' };
      }
      return { success: false, message: error.message || 'Kayıt sırasında bir hata oluştu.' };
    }
  };
  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, loginWithGoogle, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;

