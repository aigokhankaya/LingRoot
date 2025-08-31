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
  icon: './assets/icon.png',
  ios: {
    ...(config?.ios || {}),
    icon: './assets/icon.png',
    infoPlist: {
      ...(config?.ios?.infoPlist || {}),
      NSPhotoLibraryUsageDescription:
        'Uygulama, mesajlarınıza fotoğraf ekleyebilmeniz için fotoğraflarınıza erişmek ister.',
      NSCameraUsageDescription:
        'Uygulama, fotoğraf çekebilmeniz için kameraya erişmek ister.',
      NSMicrophoneUsageDescription:
        'Uygulama, video/fotoğraf çekerken ses kaydı için mikrofona erişmek ister.',
    },
  },
  android: {
    ...(config?.android || {}),
    icon: './assets/icon.png',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png', // varsa
      backgroundColor: '#FFFFFF',
    },
    package: 'com.nsyzk.lingrootmobile',
    softwareKeyboardLayoutMode: 'resize',
  },
  plugins: [
    'react-native-document-picker',
    [
      'react-native-image-picker',
      {
        photosPermission:
          'Uygulama, mesajlarınıza fotoğraf ekleyebilmeniz için fotoğraflarınıza erişmek ister.',
        cameraPermission: 'Uygulama, fotoğraf çekebilmeniz için kameraya erişmek ister.',
        microphonePermission: 'Uygulama, ses kaydı için mikrofona erişmek ister.',
        savePhotosPermission: 'Uygulama, çekilen fotoğrafları kaydetmek için izin ister.'
      }
    ]
  ],
  extra: {
    ...(config?.extra || {}),
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  },
});
