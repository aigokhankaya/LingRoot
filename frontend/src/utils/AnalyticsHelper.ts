import { logEvent as firebaseLogEvent, setUserProperties as firebaseSetUserProperties, setUserId as firebaseSetUserId } from "firebase/analytics";
import { analytics } from "../lib/firebase";

const DEBUG_MODE = process.env.NODE_ENV === 'development';

export const AnalyticsHelper = {
    /**
     * Log a standard event to Firebase Analytics
     * @param eventName Name of the event
     * @param params Optional parameters for the event
     */
    logEvent: (eventName: string, params: Record<string, any> = {}) => {
        if (typeof window !== 'undefined') {
            let analyticsInstance = analytics;

            // Fallback: If imported analytics is null but app is initialized, try to get it directly
            // This handles cases where the export binding might not have updated yet or race conditions
            if (!analyticsInstance) {
                try {
                    const { app } = require("../lib/firebase");
                    const { getAnalytics } = require("firebase/analytics");
                    if (app) {
                        analyticsInstance = getAnalytics(app);
                    }
                } catch (e) {
                    console.warn('[AnalyticsHelper] Fallback initialization failed', e);
                }
            }

            if (analyticsInstance) {
                // Force debug_mode for testing
                const eventParams = { ...params, debug_mode: DEBUG_MODE };
                firebaseLogEvent(analyticsInstance, eventName, eventParams);

                // Optional: Add dev logging
                if (process.env.NODE_ENV === 'development' || DEBUG_MODE) {
                    console.log(`[Web Analytics] Event Logged: ${eventName}`, eventParams);
                }
            } else {
                if (process.env.NODE_ENV === 'development' || DEBUG_MODE) {
                    console.warn(`[Web Analytics] Failed to log event '${eventName}': Analytics not initialized.`);
                }
            }
        }
    },

    /**
     * Set user properties for segmentation
     * @param props Key-value pairs of user properties
     */
    setUserProps: (props: Record<string, any>) => {
        if (typeof window !== 'undefined' && analytics) {
            firebaseSetUserProperties(analytics, props);
            // setUserId and setUserProperties don't accept custom params like debug_mode directly in the same way,
            // but the next event logged will carry the user state.
            // We log a technical event to force update with debug_mode
            if (DEBUG_MODE) {
                firebaseLogEvent(analytics, 'user_props_update', { ...props, debug_mode: true });
            }

            if (process.env.NODE_ENV === 'development') {
                console.log(`[Web Analytics] User Props Set:`, props);
            }
        }
    },

    /**
     * Set the user ID (e.g. after login)
     * @param userId Unique user identifier
     */
    setUserId: (userId: string | null) => {
        if (typeof window !== 'undefined' && analytics) {
            firebaseSetUserId(analytics, userId);
            // Force an event to register the user ID update in debug view immediately
            if (DEBUG_MODE && userId) {
                firebaseLogEvent(analytics, 'user_id_update', { user_id: userId, debug_mode: true });
            }

            if (process.env.NODE_ENV === 'development') {
                console.log(`[Web Analytics] User ID Set: ${userId}`);
            }
        }
    },

    /**
     * Log a screen view event
     * @param screenName The name of the screen
     * @param screenClass The class/component name of the screen
     */
    logScreenView: (screenName: string, screenClass: string) => {
        if (typeof window !== 'undefined' && analytics) {
            firebaseLogEvent(analytics, 'screen_view', {
                firebase_screen: screenName,
                firebase_screen_class: screenClass,
                debug_mode: DEBUG_MODE
            });

            if (process.env.NODE_ENV === 'development') {
                console.log(`[Web Analytics] Screen View: ${screenName} (${screenClass})`);
            }
        }
    }
};
