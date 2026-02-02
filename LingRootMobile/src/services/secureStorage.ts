/**
 * Secure Storage Service
 *
 * Wraps expo-secure-store for sensitive data (tokens) and falls back to
 * AsyncStorage for non-sensitive data (user_data).
 *
 * V-02 security finding: auth tokens must be stored in encrypted storage
 * (iOS Keychain / Android EncryptedSharedPreferences) instead of plain
 * AsyncStorage.
 *
 * Created: 2026-02-02
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Keys that hold sensitive tokens — stored in SecureStore
const SECURE_KEYS = new Set(['auth_token', 'refresh_token']);

/**
 * Get an item. Sensitive keys are read from SecureStore, others from AsyncStorage.
 */
async function getItem(key: string): Promise<string | null> {
    if (SECURE_KEYS.has(key)) {
        try {
            return await SecureStore.getItemAsync(key);
        } catch {
            // Fallback: read from AsyncStorage (pre-migration or SecureStore unavailable)
            return AsyncStorage.getItem(key);
        }
    }
    return AsyncStorage.getItem(key);
}

/**
 * Set an item. Sensitive keys are written to SecureStore, others to AsyncStorage.
 */
async function setItem(key: string, value: string): Promise<void> {
    if (SECURE_KEYS.has(key)) {
        try {
            await SecureStore.setItemAsync(key, value);
            // Remove from AsyncStorage if it was there (post-migration cleanup)
            try { await AsyncStorage.removeItem(key); } catch { /* ignore */ }
            return;
        } catch {
            // Fallback: write to AsyncStorage if SecureStore fails
            await AsyncStorage.setItem(key, value);
            return;
        }
    }
    await AsyncStorage.setItem(key, value);
}

/**
 * Remove an item from both stores to ensure it is fully deleted.
 */
async function removeItem(key: string): Promise<void> {
    if (SECURE_KEYS.has(key)) {
        try { await SecureStore.deleteItemAsync(key); } catch { /* ignore */ }
    }
    try { await AsyncStorage.removeItem(key); } catch { /* ignore */ }
}

/**
 * Remove multiple items.
 */
async function multiRemove(keys: string[]): Promise<void> {
    await Promise.all(keys.map(k => removeItem(k)));
}

/**
 * Migrate tokens from AsyncStorage to SecureStore.
 * Call once at app startup. Idempotent — safe to call repeatedly.
 */
async function migrateToSecureStorage(): Promise<void> {
    for (const key of SECURE_KEYS) {
        try {
            // Check if already in SecureStore
            const secureValue = await SecureStore.getItemAsync(key);
            if (secureValue) continue; // Already migrated

            // Read from AsyncStorage
            const asyncValue = await AsyncStorage.getItem(key);
            if (!asyncValue) continue; // Nothing to migrate

            // Write to SecureStore and remove from AsyncStorage
            await SecureStore.setItemAsync(key, asyncValue);
            await AsyncStorage.removeItem(key);
            console.log(`[SecureStorage] Migrated ${key} to SecureStore`);
        } catch (err) {
            // Non-fatal: token will be read from AsyncStorage on next access
            console.warn(`[SecureStorage] Migration failed for ${key}:`, err);
        }
    }
}

export const secureStorage = {
    getItem,
    setItem,
    removeItem,
    multiRemove,
    migrateToSecureStorage,
};

export default secureStorage;
