import analytics from '@react-native-firebase/analytics';

export const AnalyticsHelper = {
    /**
     * Log a standard event to Firebase Analytics
     * @param eventName Name of the event (e.g., 'content_view', 'lesson_complete')
     * @param params Optional parameters for the event
     */
    logEvent: async (eventName: string, params: Record<string, any> = {}) => {
        try {
            await analytics().logEvent(eventName, params);
            // Optional: Add dev logging
            if (__DEV__) {
                console.log(`[Analytics] Event: ${eventName}`, params);
            }
        } catch (error) {
            console.warn(`[Analytics] Failed to log event: ${eventName}`, error);
        }
    },

    /**
     * Set user properties for segmentation
     * @param props Key-value pairs of user properties
     */
    setUserProps: async (props: Record<string, string | null>) => {
        try {
            await analytics().setUserProperties(props);
            if (__DEV__) {
                console.log(`[Analytics] User Props Set:`, props);
            }
        } catch (error) {
            console.warn(`[Analytics] Failed to set user properties`, error);
        }
    },

    /**
     * Set the user ID (e.g. after login)
     * @param userId Unique user identifier
     */
    setUserId: async (userId: string | null) => {
        try {
            await analytics().setUserId(userId);
            if (__DEV__) {
                console.log(`[Analytics] User ID Set: ${userId}`);
            }
        } catch (error) {
            console.warn(`[Analytics] Failed to set user ID`, error);
        }
    },

    /**
     * Log screen view manually if needed (mostly automatic in RN, but good for custom flows)
     * @param screenName 
     * @param screenClass 
     */
    logScreenView: async (screenName: string, screenClass: string = screenName) => {
        try {
            await analytics().logScreenView({
                screen_name: screenName,
                screen_class: screenClass,
            });
            if (__DEV__) {
                console.log(`[Analytics] Screen View: ${screenName}`);
            }
        } catch (error) {
            console.warn(`[Analytics] Failed to log screen view`, error);
        }
    }
};
