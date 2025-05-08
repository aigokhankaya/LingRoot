export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin';
  membershipStatus: 'free' | 'premium' | 'enterprise';
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  isActive: boolean;
  phoneNumber?: string;
  preferences?: {
    language: string;
    notifications: boolean;
    theme: 'light' | 'dark' | 'system';
  };
} 