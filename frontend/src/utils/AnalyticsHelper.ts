import { logEvent as firebaseLogEvent, setUserProperties as firebaseSetUserProperties, setUserId as firebaseSetUserId } from "firebase/analytics";
import { getFirebaseAnalytics } from "../lib/firebase";

const DEBUG_MODE = process.env.NODE_ENV === 'development';

export const AnalyticsHelper = {
    /**
     * Log a standard event to Firebase Analytics
     * @param eventName Name of the event
     * @param params Optional parameters for the event
     */
    logEvent: async (eventName: string, params: Record<string, unknown> = {}) => {
        if (typeof window !== 'undefined') {
            const analyticsInstance = await getFirebaseAnalytics();

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
    setUserProps: async (props: Record<string, unknown>) => {
        if (typeof window !== 'undefined') {
            const analyticsInstance = await getFirebaseAnalytics();
            if (analyticsInstance) {
                firebaseSetUserProperties(analyticsInstance, props);
                if (DEBUG_MODE) {
                    firebaseLogEvent(analyticsInstance, 'user_props_update', { ...props, debug_mode: true });
                }

                if (process.env.NODE_ENV === 'development') {
                    console.log(`[Web Analytics] User Props Set:`, props);
                }
            }
        }
    },

    /**
     * Set the user ID (e.g. after login)
     * @param userId Unique user identifier
     */
    setUserId: async (userId: string | null) => {
        if (typeof window !== 'undefined') {
            const analyticsInstance = await getFirebaseAnalytics();
            if (analyticsInstance) {
                firebaseSetUserId(analyticsInstance, userId);
                if (DEBUG_MODE && userId) {
                    firebaseLogEvent(analyticsInstance, 'user_id_update', { user_id: userId, debug_mode: true });
                }

                if (process.env.NODE_ENV === 'development') {
                    console.log(`[Web Analytics] User ID Set: ${userId}`);
                }
            }
        }
    },

    /**
     * Log a screen view event
     * @param screenName The name of the screen
     * @param screenClass The class/component name of the screen
     */
    logScreenView: async (screenName: string, screenClass: string) => {
        if (typeof window !== 'undefined') {
            const analyticsInstance = await getFirebaseAnalytics();
            if (analyticsInstance) {
                firebaseLogEvent(analyticsInstance, 'screen_view', {
                    firebase_screen: screenName,
                    firebase_screen_class: screenClass,
                    debug_mode: DEBUG_MODE
                });

                if (process.env.NODE_ENV === 'development') {
                    console.log(`[Web Analytics] Screen View: ${screenName} (${screenClass})`);
                }
            }
        }
    }
};
