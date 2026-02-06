/**
 * SWR-based API hooks for client-side data fetching
 *
 * Replaces manual useState + useEffect + fetch patterns with
 * cached, deduplicated, and auto-revalidating SWR hooks.
 */

import useSWR, { SWRConfiguration } from 'swr';
import { getApiUrl, getToken } from '@/lib/api';

/**
 * Default fetcher: adds auth token and handles errors
 */
const defaultFetcher = async (url: string) => {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    const error = new Error(`API error: ${res.status}`);
    (error as unknown as Record<string, unknown>).status = res.status;
    throw error;
  }

  return res.json();
};

/**
 * Generic SWR hook with auth-aware fetcher
 */
export function useApiSWR<T = unknown>(
  path: string | null,
  config?: SWRConfiguration
) {
  const url = path ? getApiUrl(path) : null;
  return useSWR<T>(url, defaultFetcher, config);
}

/**
 * Subscription plans (global, long cache)
 */
export function useSubscriptionPlans() {
  return useApiSWR('/subscription/plans', {
    revalidateOnFocus: false,
    dedupingInterval: 300000, // 5 minutes
  });
}

/**
 * User dashboard stats (per-user, short cache)
 */
export function useUserStats() {
  return useApiSWR('/stats/dashboard', {
    revalidateOnFocus: true,
    dedupingInterval: 30000, // 30 seconds
  });
}

/**
 * Topic tree (moderate cache)
 */
export function useTopicTree() {
  return useApiSWR('/topic-hierarchy/tree', {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // 1 minute
  });
}

/**
 * Notifications (polling)
 */
export function useNotifications() {
  return useApiSWR('/notifications', {
    refreshInterval: 60000, // poll every 60 seconds
    revalidateOnFocus: true,
  });
}

/**
 * Content history (paginated)
 */
export function useContentHistory(page: number) {
  return useApiSWR(`/content/history?page=${page}`, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });
}

/**
 * Sectors list (global, long cache)
 */
export function useSectors() {
  return useApiSWR('/sectors', {
    revalidateOnFocus: false,
    dedupingInterval: 300000, // 5 minutes
  });
}

/**
 * Admin dashboard stats
 */
export function useAdminStats() {
  return useApiSWR('/admin/dashboard/stats', {
    revalidateOnFocus: true,
    dedupingInterval: 30000,
  });
}
