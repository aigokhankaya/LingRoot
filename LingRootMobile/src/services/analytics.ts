import analytics from '@react-native-firebase/analytics';

/**
 * Mobile Analytics Service (Firebase)
 */

export const logEvent = async (name: string, params?: Record<string, any>) => {
    try {
        await analytics().logEvent(name, params);
    } catch (error) {
        console.warn('[Analytics] Failed to log event:', error);
    }
};

export const logScreenView = async (screenName: string, screenClass?: string) => {
    try {
        await analytics().logScreenView({
            screen_name: screenName,
            screen_class: screenClass || screenName,
        });
    } catch (error) {
        console.warn('[Analytics] Failed to log screen view:', error);
    }
};

export const setUserProperties = async (props: Record<string, string>) => {
    try {
        await analytics().setUserProperties(props);
    } catch (error) {
        console.warn('[Analytics] Failed to set user properties:', error);
    }
};

export const setUserId = async (id: string | null) => {
    try {
        await analytics().setUserId(id);
    } catch (error) {
        console.warn('[Analytics] Failed to set user id:', error);
    }
};

export const AnalyticsEvents = {
    LOGIN: 'login',
    REGISTER: 'sign_up',
    CONTENT_VIEW: 'view_item',
    AUDIO_CREATE: 'create_audio',
    SEARCH: 'search',
    SHARE: 'share',
    TUTORIAL_BEGIN: 'tutorial_begin',
    TUTORIAL_COMPLETE: 'tutorial_complete'
};
