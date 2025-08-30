import { createClient, type AuthChangeEvent, type Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Resolve public config from Expo extra first, then env
const extra: any = (Constants.expoConfig?.extra || (Constants as any)?.manifest?.extra || {});
const resolvedSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || extra.EXPO_PUBLIC_SUPABASE_URL;
const resolvedSupabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// If missing, fail gracefully without logging to console
if (!resolvedSupabaseUrl || !resolvedSupabaseAnonKey) {
  // silent in production
}

const supabaseUrl = (resolvedSupabaseUrl || '').toString().trim();
const supabaseAnonKey = (resolvedSupabaseAnonKey || '').toString().trim();

// silent init in production

// Supabase client oluştur (config yoksa güvenli noop client kullan)
export const supabase: any = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : {
      // Minimal noop client to prevent crashes when env is missing on dev devices
      auth: {
        async signInWithPassword() {
          throw new Error('[SUPABASE] Missing configuration: cannot sign in.');
        },
        async signOut() {
          return { error: null };
        },
        async getUser() {
          return { data: { user: null } } as any;
        },
        onAuthStateChange(cb: (event: any, session: any) => void) {
          // Return an unsubscribe-like handle compatible with upstream usage
          return { data: { subscription: { unsubscribe() {} } } } as any;
        },
      },
    };

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
      if (error.code === 'PGRST116') {
        return null;
      }
      return null;
    }

    return data?.role || null;
  } catch (err) {
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

  async signUp(email: string, password: string, fullName?: string, phoneNumber?: string) {
    // Route signup through our backend to avoid direct Supabase Auth dependency on mobile
    const extra: any = (Constants.expoConfig?.extra || (Constants as any)?.manifest?.extra || {});
    const apiBaseUrl = (extra.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_URL || 'https://lingloops-backend.onrender.com') as string;
    const [firstName, ...rest] = (fullName || '').trim().split(' ');
    const lastName = rest.join(' ') || 'User';
    
    // Use provided phone number or generate a unique placeholder phone (E.164) to satisfy backend uniqueness
    const finalPhoneNumber = phoneNumber || `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`; // +1XXXXXXXXXX

    // silent in production

    const res = await fetch(`${apiBaseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ firstName: firstName || 'User', lastName, email, phoneNumber: finalPhoneNumber, password })
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(body?.message || 'Kayıt başarısız');
    }

    return body?.data || {};
  },

  async signOut() {
    const result = await supabase.auth.signOut();
    // In noop mode result may be undefined or lack error field
    if (result && (result as any).error) throw (result as any).error;
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  onAuthStateChange(callback: (user: any) => void) {
    return supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      callback(session?.user || null);
    });
  },
}; 