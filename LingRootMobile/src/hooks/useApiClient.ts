/**
 * useApiClient Hook
 * 
 * React hook that provides easy access to the API client.
 * Handles initialization and provides type-safe access to all API modules.
 * 
 * Created: 2026-01-16
 */

import { useState, useEffect, useCallback } from 'react';
import {
    initializeApiClient,
    getApiClient,
    setUnauthorizedHandler,
    LingRootApiClient
} from '../services/apiClient';

interface UseApiClientResult {
    client: LingRootApiClient | null;
    isReady: boolean;
    error: Error | null;
}

/**
 * Hook to access the API client
 * 
 * Usage:
 * const { client, isReady, error } = useApiClient();
 * 
 * if (isReady && client) {
 *   const voices = await client.tts.listVoices();
 * }
 */
export function useApiClient(): UseApiClientResult {
    const [client, setClient] = useState<LingRootApiClient | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let isMounted = true;

        const init = async () => {
            try {
                const instance = await initializeApiClient();
                if (isMounted) {
                    setClient(instance);
                    setIsReady(true);
                }
            } catch (err) {
                if (isMounted) {
                    setError(err instanceof Error ? err : new Error('Failed to initialize API client'));
                    setIsReady(false);
                }
            }
        };

        init();

        return () => {
            isMounted = false;
        };
    }, []);

    return { client, isReady, error };
}

/**
 * Hook to get synchronous access to API client
 * Use only when you're sure the client is initialized
 */
export function useApiClientSync(): LingRootApiClient {
    return getApiClient();
}

// Re-export types for convenience
export type { LingRootApiClient } from '../services/apiClient';
export { setUnauthorizedHandler } from '../services/apiClient';
