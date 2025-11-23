// User Types
export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  membership_level: MembershipLevel;
  role?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string, phoneNumber?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (data: Partial<User> & { phoneNumber?: string; full_name?: string }) => Promise<void>;
  signInWithGoogle?: () => Promise<void>;
  signInWithFacebook?: () => Promise<void>;
  signInWithApple?: () => Promise<void>;
}

// Membership Types
export type MembershipLevel = 'free' | 'premium' | 'pro';

// Text-to-Speech Types
export interface TTSRequest {
  type: 'text' | 'file';
  input: string;
  level: CEFRLevel;
  // Keep backward compatibility fields, but backend expects 'voice' and 'speakingRate'
  sesHizi?: number;
  speakingRate?: number;
  voice?: string;
  voiceName?: string;
  gender?: 'male' | 'female' | 'neutral';
  accent?: 'american' | 'british' | 'australian' | 'canadian' | 'indian' | 'international' | 'all';
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
  estimated_duration?: number;
  speaking_rate?: number;
  word_timings_count?: number;
  audio_segments?: number;
  is_real_timing?: boolean;
  translated_text?: string;
  adapted_text?: string;
  translatedText?: string;
  adaptedText?: string;
  // Hybrid Approach - Drift Correction
  drift_corrected?: boolean;
  drift_amount?: number;
  drift_percentage?: number;
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
  wordTimings?: Timepoint[]; // Word timing data for sync feedback
  // Hybrid Approach - Drift Correction
  real_duration?: number;
  estimated_duration?: number;
  drift_corrected?: boolean;
  drift_amount?: number;
  drift_percentage?: number;
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
  Liro: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email?: string } | undefined;
  Profile: undefined;
  Settings: undefined;
  Membership: undefined;
  Packages: undefined;
  Chat: { conversationId?: string } | undefined;
  Vocabulary: { wordId?: string } | undefined;
  PatternList: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  ReminderSettings: undefined;
  TtsProviderSettings: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Library: undefined;
  Create: { mode?: string } | undefined;
  Profile: undefined;
  Vocabulary: { wordId?: string } | undefined;
};

// API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
} 

// Books
export interface BookItem {
  id: number;
  gutendex_id?: number;
  title: string;
  authors: string;
  cover_url?: string;
  download_count?: number;
  language?: string;
  copyright?: boolean;
  subjects?: string[] | string;
  text_url?: string;
  created_at?: string;
}

export interface BookSearchResponse {
  books: BookItem[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface BookChapter {
  id: number;
  book_id: number;
  chapter_index: number;
  chapter_title: string;
  chapter_text?: string;
  created_at?: string;
}