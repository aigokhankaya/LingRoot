import { useCallback } from 'react';
import { trackEvent } from '../lib/analytics';

/**
 * React Hook for easier event tracking
 * Usage:
 * const track = useTrackEvent();
 * track('button_click', { label: 'hero_cta' });
 */
export const useTrackEvent = () => {
    const track = useCallback((eventName: string, params?: Record<string, any>) => {
        // Check for consent locally if needed, but trackEvent handles the basics via gtag checking window.gtag
        // If we want stricter control:
        const stored = localStorage.getItem('lingroot_cookie_consent');
        if (stored) {
            try {
                const prefs = JSON.parse(stored);
                if (prefs.analytics) {
                    trackEvent(eventName, params);
                }
            } catch (e) {
                // If parse fails, do nothing or log
            }
        }
    }, []);

    return track;
};
