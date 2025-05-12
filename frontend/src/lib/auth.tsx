"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_BASE_URL } from './api';

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

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      console.log('[AUTH] login() called', { email });
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        console.log('[AUTH] login() JSON parse error', jsonErr);
        return { success: false, message: 'Sunucudan geçersiz yanıt alındı.' };
      }
      console.log('[AUTH] login() response', data);
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
        console.log('[AUTH] setUser & setIsAuthenticated', user);
        return { success: true };
      } else {
        setUser(null);
        setIsAuthenticated(false);
        console.log('[AUTH] login() failed', data.message);
        return { success: false, message: data.message || 'Giriş başarısız.' };
      }
    } catch (error: any) {
      setUser(null);
      setIsAuthenticated(false);
      console.log('[AUTH] login() error', error);
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        return { success: false, message: 'Sunucuya bağlanılamadı, lütfen internet bağlantınızı kontrol edin veya daha sonra tekrar deneyin.' };
      }
      return { success: false, message: error.message || 'Giriş sırasında bir hata oluştu.' };
    }
  };

  const logout = () => {
    // ... existing code ...
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
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
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

