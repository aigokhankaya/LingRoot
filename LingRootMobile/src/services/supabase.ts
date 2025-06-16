import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Expo Constants ile environment variables'ları dene
console.log('🔧 [CONSTANTS DEBUG]');
console.log('Constants.expoConfig?.extra:', Constants.expoConfig?.extra);
console.log('Constants.executionEnvironment:', Constants.executionEnvironment);

// Supabase URL ve Anon Key'i environment variables'dan alacağız
// Web projesindeki aynı yapılandırma kullanılıyor

// GEÇICI TEST: Hardcoded values - Düzeltilmiş API Key
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://ffqfcmmbeeieouoghrac.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmcWZjb21iZWVpZW91b2docmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYwMDM1MzEsImV4cCI6MjA1MTU3OTUzMX0.HdA8GJF0o0kCmDJN2K6P8IH7FKtgEp8E2Ps9LX4N9Vw';

console.log('🔧 [HARDCODED TEST]');
console.log('supabaseUrl:', supabaseUrl);
console.log('supabaseAnonKey length:', supabaseAnonKey.length);
console.log('supabaseAnonKey starts with:', supabaseAnonKey.substring(0, 20));
console.log('Using hardcoded values as fallback');

// Debug: Environment variables'ları kontrol et
console.log('🔧 [SUPABASE DEBUG]');
console.log('EXPO_PUBLIC_SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
console.log('EXPO_PUBLIC_SUPABASE_ANON_KEY:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
console.log('supabaseUrl:', supabaseUrl);
console.log('Using mock values:', supabaseUrl.includes('mock-project'));

// Supabase client oluştur - web projesindeki gibi basit yapılandırma
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Web projesindeki getUserRole fonksiyonunu da ekleyelim
export const getUserRole = async (userId: string): Promise<string | null> => {
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user role:', error.message);
      if (error.code === 'PGRST116') {
        console.warn(`No profile found for user ID: ${userId}`);
        return null;
      }
      return null;
    }

    return data?.role || null;
  } catch (err) {
    console.error('Unexpected error fetching user role:', err);
    return null;
  }
};

// Auth helper functions - web projesindeki gibi basitleştirildi
export const authService = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signUp(email: string, password: string, fullName?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  onAuthStateChange(callback: (user: any) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user || null);
    });
  },
}; 