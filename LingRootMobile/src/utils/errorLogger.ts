/**
 * Mobile Error Logger
 *
 * Captures JS errors and warnings, sends them to backend
 * POST /api/client-errors → Winston → OTel → SigNoz.
 *
 * In __DEV__ mode, also logs to console for developer visibility.
 */

import { Platform } from 'react-native';

// Lazy import to avoid circular dependency — api.ts imports from other utils
let _apiBaseUrl: string | null = null;
let _getToken: (() => Promise<string | null>) | null = null;

/**
 * Initialize error logger with API base URL and token getter.
 * Call once during app startup (after API client is initialized).
 */
export function initErrorLogger(
  apiBaseUrl: string,
  getToken: () => Promise<string | null>,
): void {
  _apiBaseUrl = apiBaseUrl;
  _getToken = getToken;
}

interface ErrorContext {
  component?: string;
  screenName?: string;
  [key: string]: unknown;
}

/**
 * Send error report to backend (fire-and-forget, never throws)
 */
async function sendToBackend(data: {
  message: string;
  stack?: string;
  platform: string;
  severity: string;
  component?: string;
  screenName?: string;
  context?: Record<string, unknown>;
}): Promise<void> {
  if (!_apiBaseUrl) return;
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (_getToken) {
      const token = await _getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    fetch(`${_apiBaseUrl}/api/client-errors`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    }).catch(() => { /* silent */ });
  } catch {
    // silent — error logger must never crash the app
  }
}

export const errorLogger = {
  /**
   * Capture an error and report it to SigNoz via backend
   */
  captureError(message: string, error?: Error, context?: ErrorContext): void {
    if (__DEV__) {
      console.error(`[ErrorLogger] ${message}`, error);
    }
    sendToBackend({
      message,
      stack: error?.stack,
      platform: Platform.OS,
      severity: 'error',
      component: context?.component,
      screenName: context?.screenName,
      context,
    });
  },

  /**
   * Capture a warning
   */
  captureWarning(message: string, context?: ErrorContext): void {
    if (__DEV__) {
      console.warn(`[ErrorLogger] ${message}`);
    }
    sendToBackend({
      message,
      platform: Platform.OS,
      severity: 'warning',
      component: context?.component,
      screenName: context?.screenName,
      context,
    });
  },

  /**
   * Capture a network/API error (5xx)
   */
  captureApiError(url: string, status: number, error?: Error): void {
    const message = `API ${status}: ${url}`;
    if (__DEV__) {
      console.error(`[ErrorLogger] ${message}`, error);
    }
    sendToBackend({
      message,
      stack: error?.stack,
      platform: Platform.OS,
      severity: 'error',
      component: 'api',
      context: { url, status },
    });
  },
};
