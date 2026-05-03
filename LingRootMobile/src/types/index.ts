// Notification Types
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  link?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

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
  topic_id?: string;
  engine?: string;
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
  displayName?: string;
  accent: 'american' | 'british' | 'australian' | 'canadian' | 'indian' | 'international';
  gender: 'male' | 'female';
  category: 'basic' | 'silver' | 'gold' | 'platinum' | 'neural' | 'generative' | 'ultra' | 'premium';
  emotion?: 'neutral' | 'cheerful' | 'serious' | 'professional' | 'excited' | 'calm' | 'friendly';
  ssmlSupport: boolean;
  description?: string;
  quality?: string;
  providerVoice?: {
    name: string;
    languageCode?: string;
    engine?: string;
  };
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
  index?: number;
  hasRealTiming?: boolean;
  source?: string;
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
  ReminderTest: undefined;
  TtsProviderSettings: undefined;
  TopicTree: undefined;
  Notifications: undefined;
  NotificationDetail: {
    title: string;
    message: string;
    type: string;
    link?: string;
  };
  AudioPlayer: { track: AudioTrack; highlightMode?: 'word' | 'sentence' };
};

export type MainTabParamList = {
  Home: undefined;
  Library: undefined;
  Create:
  | {
    mode?: string;
    initialText?: string;
    topicId?: string;
    topicLevel?: string;
    topicSubject?: string; // Topic title/subject for narration generation
    podcastProvider?: 'n8n' | 'google';
  }
  | undefined;
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

export interface TopicContent {
  id: string;
  topic_id: string;
  mp3_url: string | null;
  vtt_url: string | null;
  text_content: string | null;
  translated_text: string | null;
  adapted_text: string | null;
  level: string | null;
  voice_model: string | null;
  speaking_rate: number | null;
  duration_seconds: number | null;
  words: string[];
  timepoints: any;
  created_at: string;
  listened_at: string | null;
}

export interface Topic {
  id: string;
  user_id: string;
  parent_id: string | null;
  title: string;
  description: string | null;
  level: string;
  depth: number;
  order_index: number;
  is_manual: boolean;
  keywords: string[];
  created_at: string;
  updated_at: string;
  children?: Topic[];
  latest_content?: TopicContent | null;
}
