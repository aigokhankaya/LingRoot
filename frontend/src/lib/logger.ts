/**
 * Frontend error logger
 *
 * Sends errors to SigNoz via OTel spans.
 * Falls back to console in development or when OTel is not configured.
 */

import { recordError } from './otel';

export const frontendLogger = {
  /**
   * Log an error with OTel exception recording
   */
  error(message: string, error?: Error, context?: Record<string, string>): void {
    const err = error || new Error(message);
    if (process.env.NODE_ENV === 'development') {
      console.error(`[LingRoot] ${message}`, err);
    }
    recordError(message, err, context);
  },

  /**
   * Log a warning (recorded as an OTel span with warning attribute)
   */
  warn(message: string, context?: Record<string, string>): void {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[LingRoot] ${message}`);
    }
    recordError(message, new Error(message), { ...context, severity: 'warning' });
  },

  /**
   * Log an API error (5xx responses)
   */
  apiError(url: string, status: number, error?: Error): void {
    const message = `API ${status}: ${url}`;
    const err = error || new Error(message);
    if (process.env.NODE_ENV === 'development') {
      console.error(`[LingRoot] ${message}`, err);
    }
    recordError('api-error', err, {
      'http.url': url,
      'http.status_code': String(status),
    });
  },
};
