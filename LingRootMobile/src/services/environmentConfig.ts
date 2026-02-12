import { EXPO_PUBLIC_API_URL } from '@env';

// Environment configuration
const PRODUCTION_URL = 'https://lingroot-production.up.railway.app';

// Normalize .env value (trim + remove potential BOM)
const rawEnvUrl = (EXPO_PUBLIC_API_URL || '').trim().replace(/^\uFEFF/, '');
const isValidEnvUrl = rawEnvUrl.startsWith('http');

// If .env has a valid URL use it; otherwise fall back to production backend URL
const resolvedApiUrl = isValidEnvUrl ? rawEnvUrl : PRODUCTION_URL;

console.log('🌐 [ENV CONFIG] Raw EXPO_PUBLIC_API_URL from @env:', EXPO_PUBLIC_API_URL || '(empty)');
console.log('🌐 [ENV CONFIG] Resolved API URL:', resolvedApiUrl);

interface EnvironmentConfig {
  environment: 'production' | 'test';
  baseUrl: string;
}

let cachedConfig: EnvironmentConfig | null = null;

/**
 * Gets the current environment configuration
 * For mobile APK: Always use production URL unless .env explicitly sets a different URL
 * This prevents test users from being redirected to local development URLs
 */
export async function getEnvironmentConfig(): Promise<EnvironmentConfig> {
  // Return cached config if available and fresh
  if (cachedConfig) {
    return cachedConfig;
  }

  const config: EnvironmentConfig = {
    environment: 'production',
    baseUrl: resolvedApiUrl,
  };
  
  cachedConfig = config;
  if (isValidEnvUrl) {
    console.log('🌍 [ENV CONFIG] Using .env URL:', config);
  } else {
    console.log('🌍 [ENV CONFIG] Using production URL (fallback):', config);
  }
  return config;
}

/**
 * Forces a refresh of the environment configuration
 * Clears cache and re-evaluates config
 */
export async function refreshEnvironmentConfig(): Promise<EnvironmentConfig> {
  console.log('🔄 [ENV CONFIG] Force refreshing environment config...');
  
  // Clear cache
  cachedConfig = null;

  // Re-evaluate config
  return getEnvironmentConfig();
}

/**
 * Gets the base URL for API calls
 * This is the main function that other services should use
 */
export async function getApiBaseUrl(): Promise<string> {
  const config = await getEnvironmentConfig();
  return config.baseUrl;
}

/**
 * Clears the environment cache
 * Useful for testing or debugging
 */
export async function clearEnvironmentCache(): Promise<void> {
  cachedConfig = null;
  console.log('🧹 [ENV CONFIG] Cache cleared');
}
