// Always load .env from this folder regardless of cwd
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Expo dynamic config – loads .env and exposes public values under expo.extra
// These will be accessible at runtime via Constants.expoConfig?.extra
export default ({ config }: any) => ({
  ...config,
  android: {
    ...(config?.android || {}),
    package: 'com.nsyzk.lingrootmobile',
  },
  extra: {
    ...(config?.extra || {}),
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
});


