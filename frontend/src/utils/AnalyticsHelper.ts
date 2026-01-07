import { logEvent as firebaseLogEvent, setUserProperties as firebaseSetUserProperties, setUserId as firebaseSetUserId } from "firebase/analytics";
import { analytics } from "../lib/firebase";

export const AnalyticsHelper = {
    /**
     * Log a standard event to Firebase Analytics
     * @param eventName Name of the event
     * @param params Optional parameters for the event
     */
    logEvent: (eventName: string, params: Record<string, any> = {}) => {
        if (typeof window !== 'undefined' && analytics) {
            firebaseLogEvent(analytics, eventName, params);

            // Optional: Add dev logging
            if (process.env.NODE_ENV === 'development') {
                console.log(`[Web Analytics] Event: ${eventName}`, params);
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
                firebase_screen_class: screenClass
            });

            if (process.env.NODE_ENV === 'development') {
                console.log(`[Web Analytics] Screen View: ${screenName} (${screenClass})`);
            }
        }
    }
};
