'use client';

import React, { useEffect } from 'react';

/**
 * Global error boundary for the root layout.
 * Catches errors that escape the route-level error.tsx boundary.
 * OTel may not be initialized here (layout itself may have failed),
 * so we also post to backend /api/client-errors as a fallback.
 */
interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Try OTel recording if available
    try {
      const { recordError } = require('@/lib/otel');
      recordError('global-error-boundary', error, { boundary: 'global' });
    } catch {
      // OTel not available — log to console as fallback
    }

    // Also attempt backend reporting as a safety net
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://lingloops-backend.onrender.com';
      fetch(`${apiUrl}/api/client-errors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          platform: 'web',
          severity: 'error',
          component: 'global-error-boundary',
        }),
      }).catch(() => { /* silent */ });
    } catch {
      // silent
    }
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '2rem', color: '#dc2626', marginBottom: '0.5rem' }}>
              Beklenmeyen Hata
            </h1>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              Bir hata oluştu. Lütfen sayfayı yenileyin.
            </p>
            <button
              onClick={reset}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '1rem',
              }}
            >
              Tekrar Dene
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
