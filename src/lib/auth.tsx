import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from './api';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Otomatik kullanıcı yükleme
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('lingroot_token') : null;
    if (token && !user) {
      api.get('/auth/me')
        .then(res => {
          const data = res.data;
          if (data && (data.user || data.data?.user)) {
            const rawUser = data.user || data.data.user;
            const loadedUser: User = {
              id: rawUser.id,
              email: rawUser.email,
              role: rawUser.role || 'user',
              membershipStatus: rawUser.membershipStatus || 'free',
            };
            setUser(loadedUser);
            setIsAuthenticated(true);
          } else {
            setUser(null);
            setIsAuthenticated(false);
          }
        })
        .catch(() => {
          setUser(null);
          setIsAuthenticated(false);
        });
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 