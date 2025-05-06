"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_BASE_URL } from './api';

// Types
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: string;
  isVerified: boolean;
  dailyContentUsed: number;
  lastContentDate: string | null;
  stripeCustomerId?: string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (firstName: string, lastName: string, email: string, phoneNumber: string, password: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: {
    user: User;
    token: string;
  };
}

// Create auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check if token exists in localStorage
        const token = localStorage.getItem('lingroot_token');
        
        if (token) {
          // Validate token with backend
          const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setUser(data.data);
          } else {
            // Invalid token, clear localStorage
            localStorage.removeItem('lingroot_token');
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Session check error:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    checkSession();
  }, []);

  // Login function
  const login = async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }
      
      // Save token to localStorage
      localStorage.setItem('lingroot_token', data.data.token);
      
      // Set user state
      setUser(data.data.user);
      
      return { success: true, data: data.data };
    } catch (error: any) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: error.message || 'Login failed. Please try again.' 
      };
    }
  };

  // Register function
  const register = async (
    firstName: string,
    lastName: string,
    email: string,
    phoneNumber: string,
    password: string
  ): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': 'https://www.lingroot.com'
        },
        credentials: 'include',
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phoneNumber,
          password
        })
      });
      
      const data = await response.json();
      console.log('Registration response:', data); // Debug log
      
      if (!response.ok) {
        const errorMessage = data.message || 'Registration failed';
        console.error('Registration error:', errorMessage);
        throw new Error(errorMessage);
      }
      
      if (!data.data || !data.data.token) {
        console.error('Invalid response format:', data);
        throw new Error('Invalid response from server');
      }
      
      // Save token to localStorage
      localStorage.setItem('lingroot_token', data.data.token);
      
      // Set user state
      setUser(data.data.user);
      
      return { success: true, data: data.data };
    } catch (error: any) {
      console.error('Registration error details:', error);
      return { 
        success: false, 
        message: error.message || 'Registration failed. Please try again.' 
      };
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      // Call logout endpoint
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('lingroot_token')}`
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear token and user state regardless of API response
      localStorage.removeItem('lingroot_token');
      setUser(null);
    }
  };

  // Context value
  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

