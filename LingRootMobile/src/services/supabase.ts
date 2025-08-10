import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Resolve public config from Expo extra first, then env
const extra: any = (Constants.expoConfig?.extra || (Constants as any)?.manifest?.extra || {});
const resolvedSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || extra.EXPO_PUBLIC_SUPABASE_URL;
const resolvedSupabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Fail fast with clear log if missing
if (!resolvedSupabaseUrl || !resolvedSupabaseAnonKey) {
  console.error('🚨 [SUPABASE] Missing Supabase public config. Ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are defined (in .env) and app restarted with cache cleared.');
}

const supabaseUrl = (resolvedSupabaseUrl || '').toString().trim();
const supabaseAnonKey = (resolvedSupabaseAnonKey || '').toString().trim();

console.log('🔧 [SUPABASE INIT] URL present:', !!supabaseUrl, '| from env:', !!process.env.EXPO_PUBLIC_SUPABASE_URL, '| from extra:', !!extra.EXPO_PUBLIC_SUPABASE_URL);
console.log('🔧 [SUPABASE INIT] Key present:', !!supabaseAnonKey, 'length:', supabaseAnonKey.length);

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
    // Route signup through our backend to avoid direct Supabase Auth dependency on mobile
    const extra: any = (Constants.expoConfig?.extra || (Constants as any)?.manifest?.extra || {});
    const apiBaseUrl = (extra.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_URL || 'https://lingloops-backend.onrender.com') as string;
    const [firstName, ...rest] = (fullName || '').trim().split(' ');
    const lastName = rest.join(' ') || 'User';
    // Generate a unique placeholder phone (E.164) to satisfy backend uniqueness
    const phoneNumber = `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`; // +1XXXXXXXXXX

    console.log('🧪 [AUTH SIGNUP] Backend register call', { apiBaseUrl, firstName, lastName, hasPassword: !!password });

    const res = await fetch(`${apiBaseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ firstName: firstName || 'User', lastName, email, phoneNumber, password })
    });

    const body = await res.json().catch(() => ({}));
    console.log('🧪 [AUTH SIGNUP] Backend response', { status: res.status, ok: res.ok, bodyKeys: Object.keys(body || {}) });

    if (!res.ok) {
      throw new Error(body?.message || 'Kayıt başarısız');
    }

    return body?.data || {};
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