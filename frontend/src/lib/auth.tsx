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
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
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
        const response = await fetch(getApiUrl('/api/auth/me'), {
          method: 'GET',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        const data = await response.json();
        
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
          console.log('[AUTH] Oturum geçersiz');
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

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      console.log('[AUTH] login() called', { email });
      console.log("[AUTH] Attempting login with URL:", getApiUrl('/auth/login'));
      
      // API isteği yap
      // NOT: Development modunda bile gerçek API çağrısı yapacağız
      // ancak API çağrısı başarısız olursa mock login yapacağız
      
      const baseUrl = getApiUrl(''); // getApiUrl artık sadece base URL döndürüyor
      const loginUrl = `${baseUrl}/api/auth/login`; // Endpoint'i manuel ekliyoruz

      const response = await fetch(loginUrl, {
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
          console.log('[AUTH] Token kaydedildi:', data.data.token);
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
    setUser(null);
    setIsAuthenticated(false);
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

      const response = await fetch(getApiUrl('/api/auth/register'), {
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
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, register }}>
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

