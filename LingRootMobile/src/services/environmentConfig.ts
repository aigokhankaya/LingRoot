import { EXPO_PUBLIC_API_URL } from '@env';

// Read from .env or use defaults
const resolvedApiUrl = (EXPO_PUBLIC_API_URL || '').trim();
const resolvedProductionUrl = resolvedApiUrl.startsWith('http') ? resolvedApiUrl : '';

if (resolvedProductionUrl) {
  console.log('🌐 [ENV CONFIG] Using EXPO_PUBLIC_API_URL:', resolvedProductionUrl);
} else {
  console.log('🌐 [ENV CONFIG] EXPO_PUBLIC_API_URL missing, using defaults');
}

// Environment configuration
const PRODUCTION_URL = 'https://lingloops-backend.onrender.com';

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

  // If .env has a URL set, use it directly (for local development)
  if (resolvedProductionUrl) {
    const config: EnvironmentConfig = {
      environment: 'production',
      baseUrl: resolvedProductionUrl,
    };
    cachedConfig = config;
    console.log('🌍 [ENV CONFIG] Using .env URL:', config);
    return config;
  }

  // For APK builds without .env: Always use production URL
  // Don't fetch from backend to avoid test user redirects
  const config: EnvironmentConfig = {
    environment: 'production',
    baseUrl: PRODUCTION_URL,
  };
  
  cachedConfig = config;
  console.log('🌍 [ENV CONFIG] Using production URL (APK default):', config);
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
