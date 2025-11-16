import AsyncStorage from '@react-native-async-storage/async-storage';

// Environment configuration
const PRODUCTION_URL = 'https://lingloops-backend.onrender.com';
// Use computer's local IP for both Emulator and real device
const LOCAL_URL = 'http://192.168.1.4:5001';
//IOS için bu:
//const LOCAL_URL = 'http://192.168.1.6:5001';

// Cache key for environment setting
const ENV_CACHE_KEY = 'app_environment';
const ENV_CACHE_TIMESTAMP_KEY = 'app_environment_timestamp';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Try both local and production URLs to fetch environment setting
const CONFIG_URLS = [LOCAL_URL, PRODUCTION_URL];

interface EnvironmentConfig {
  environment: 'production' | 'test';
  baseUrl: string;
}

let cachedConfig: EnvironmentConfig | null = null;

/**
 * Fetches environment configuration from backend
 * Tries local URL first, then production URL
 */
async function fetchEnvironmentFromBackend(): Promise<'production' | 'test'> {
  // Try each URL in order (local first, then production)
  for (const baseUrl of CONFIG_URLS) {
    try {
      console.log(`🌍 [ENV CONFIG] Trying ${baseUrl}...`);
      
      // Create manual timeout for React Native compatibility
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // Shorter timeout for local

      const response = await fetch(`${baseUrl}/api/config/environment`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const env = data?.data?.environment || 'production';
        console.log(`✅ [ENV CONFIG] Fetched from ${baseUrl}:`, env);
        return env === 'test' ? 'test' : 'production';
      }
    } catch (error) {
      console.log(`⚠️ [ENV CONFIG] Failed to fetch from ${baseUrl}`);
      // Continue to next URL
    }
  }

  // Default to production if all URLs fail
  console.log('🌍 [ENV CONFIG] All URLs failed, defaulting to production');
  return 'production';
}

/**
 * Gets the current environment configuration
 * Uses caching to avoid excessive API calls
 */
export async function getEnvironmentConfig(): Promise<EnvironmentConfig> {
  // Return cached config if available and fresh
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    // Check AsyncStorage cache
    const cachedEnv = await AsyncStorage.getItem(ENV_CACHE_KEY);
    const cachedTimestamp = await AsyncStorage.getItem(ENV_CACHE_TIMESTAMP_KEY);

    if (cachedEnv && cachedTimestamp) {
      const timestamp = parseInt(cachedTimestamp, 10);
      const now = Date.now();

      // Use cache if it's still fresh
      if (now - timestamp < CACHE_DURATION) {
        const environment = cachedEnv as 'production' | 'test';
        const baseUrl = environment === 'test' ? LOCAL_URL : PRODUCTION_URL;
        
        cachedConfig = { environment, baseUrl };
        console.log('🌍 [ENV CONFIG] Using cached config:', cachedConfig);
        return cachedConfig;
      }
    }

    // Fetch fresh config from backend
    const environment = await fetchEnvironmentFromBackend();
    const baseUrl = environment === 'test' ? LOCAL_URL : PRODUCTION_URL;

    // Cache the result
    await AsyncStorage.setItem(ENV_CACHE_KEY, environment);
    await AsyncStorage.setItem(ENV_CACHE_TIMESTAMP_KEY, Date.now().toString());

    cachedConfig = { environment, baseUrl };
    console.log('🌍 [ENV CONFIG] Fresh config:', cachedConfig);
    return cachedConfig;
  } catch (error) {
    console.error('❌ [ENV CONFIG] Error getting config:', error);
    
    // Return production as safe default
    const defaultConfig: EnvironmentConfig = {
      environment: 'production',
      baseUrl: PRODUCTION_URL,
    };
    
    cachedConfig = defaultConfig;
    return defaultConfig;
  }
}

/**
 * Forces a refresh of the environment configuration
 * Useful when you want to check for updates immediately
 */
export async function refreshEnvironmentConfig(): Promise<EnvironmentConfig> {
  console.log('🔄 [ENV CONFIG] Force refreshing environment config...');
  
  // Clear cache
  cachedConfig = null;
  await AsyncStorage.removeItem(ENV_CACHE_KEY);
  await AsyncStorage.removeItem(ENV_CACHE_TIMESTAMP_KEY);

  // Fetch fresh config
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
  await AsyncStorage.removeItem(ENV_CACHE_KEY);
  await AsyncStorage.removeItem(ENV_CACHE_TIMESTAMP_KEY);
  console.log('🧹 [ENV CONFIG] Cache cleared');
}
