export interface UserSubscription {
  id: string;
  plantype?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  membershipStatus: 'free' | 'premium' | 'enterprise';
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  firstName: string;
  lastName: string;
  lastLogin?: string;
  isActive: boolean;
  phoneNumber?: string;
  preferences?: {
    language: string;
    notifications: boolean;
    theme: 'light' | 'dark' | 'system';
  };
  loginCount?: number;
  contentCount?: number;
  currentSubscription?: UserSubscription | null;
  planName?: string;
}

export interface UserUpdateData {
  name?: string;
  email?: string;
  role?: 'user' | 'admin';
  membershipStatus?: 'free' | 'premium' | 'enterprise';
  avatar?: string;
} 