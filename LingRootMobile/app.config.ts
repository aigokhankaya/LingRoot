// Always load .env from this folder regardless of cwd
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Prefer environment-specific files if present, fallback to .env
const envName = process.env.APP_ENV || process.env.NODE_ENV || 'development';
const candidateEnvFiles = [`.env.${envName}`, '.env'];
for (const file of candidateEnvFiles) {
  const fullPath = path.resolve(__dirname, file);
  if (fs.existsSync(fullPath)) {
    dotenv.config({ path: fullPath });
    break;
  }
}

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
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  },
});


