import { useCallback } from 'react';
import { trackEvent } from '../lib/analytics';
import { analyticsAllowed } from '../lib/consent';

/**
 * React Hook for easier event tracking
 * Usage:
 * const track = useTrackEvent();
 * track('button_click', { label: 'hero_cta' });
 */
export const useTrackEvent = () => {
    const track = useCallback((eventName: string, params?: Record<string, any>) => {
        // İzin okuması `lib/consent.ts` üzerinden; anahtarı elle parse eden üç
        // ayrı kopya vardı ve biri bant kapalıyken de geçebiliyordu.
        if (analyticsAllowed()) trackEvent(eventName, params);
    }, []);

    return track;
};
