// User Types
export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  membership_level: MembershipLevel;
  created_at: string;
  updated_at: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// Membership Types
export type MembershipLevel = 'free' | 'premium' | 'pro';

// Text-to-Speech Types
export interface TTSRequest {
  input: string;
  type: 'text' | 'file';
  level: CEFRLevel;
  sesHizi: number;
}

export interface TTSResponse {
  success: boolean;
  message: string;
  mp3_url?: string;
  level: CEFRLevel;
  vtt_url?: string;
}

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

// Audio Types
export interface AudioTrack {
  id: string;
  title: string;
  url: string;
  level: CEFRLevel;
  duration: number;
  created_at: string;
}

// Navigation Types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  Register: undefined;
  Profile: undefined;
  Settings: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Library: undefined;
  Create: undefined;
  Suggestions: undefined;
  Profile: undefined;
};

// API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
} 