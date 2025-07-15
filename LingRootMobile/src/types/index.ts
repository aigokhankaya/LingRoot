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
  voiceName?: string;
}

export interface TTSResponse {
  success: boolean;
  message: string;
  mp3_url?: string;
  level: CEFRLevel;
  vtt_url?: string;
  input_language?: string;
  words?: any[];
  timepoints?: any[];
  original_turkish?: string;
  real_duration?: number;
  speaking_rate?: number;
  word_timings_count?: number;
  audio_segments?: number;
  is_real_timing?: boolean;
  translated_text?: string;
  adapted_text?: string;
  translatedText?: string;
  adaptedText?: string;
}

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

// Voice Types
export interface Voice {
  id: string;
  name: string;
  accent: 'american' | 'british' | 'australian' | 'canadian' | 'indian' | 'international';
  gender: 'male' | 'female';
  category: 'standard' | 'wavenet' | 'neural2' | 'studio' | 'chirp3d';
  emotion?: 'neutral' | 'cheerful' | 'serious' | 'professional' | 'excited' | 'calm' | 'friendly';
  ssmlSupport: boolean;
  description?: string;
}

export interface VoiceCategory {
  value: string;
  label: string;
  icon: string;
  badge: string;
  description?: string;
}

export interface VoiceFilter {
  accent?: string;
  gender?: string;
  emotion?: string;
}

// Audio Types
export interface AudioTrack {
  id: string;
  title: string;
  url: string;
  level: CEFRLevel;
  duration: number;
  created_at: string;
  input_type?: string;
  translated_text?: string;
  adapted_text?: string;
  original_turkish?: string;
  mp3_url?: string;
  timepoints?: Timepoint[];
  words?: string[];
}

export interface Timepoint {
  timeSeconds: number;
  endTimeSeconds?: number;
  word?: string;
}

// Navigation Types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  Register: undefined;
  Profile: undefined;
  Settings: undefined;
  Vocabulary: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Library: undefined;
  Create: undefined;
  Suggestions: undefined;
  Profile: undefined;
  Vocabulary: undefined;
};

// API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
} 