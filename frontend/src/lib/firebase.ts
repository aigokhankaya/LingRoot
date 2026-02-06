import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import type { Analytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let firebaseApp: FirebaseApp | null = null;
let analyticsInstance: Analytics | null = null;
let analyticsPromise: Promise<Analytics | null> | null = null;

export const getFirebaseApp = (): FirebaseApp | null => {
    if (typeof window === "undefined") return null;

    if (firebaseApp) return firebaseApp;

    const missingKeys = Object.entries({
        apiKey: firebaseConfig.apiKey,
        authDomain: firebaseConfig.authDomain,
        projectId: firebaseConfig.projectId,
        appId: firebaseConfig.appId,
    }).filter(([_, value]) => !value).map(([key]) => key);

    if (missingKeys.length > 0) {
        console.warn(`[Firebase] Missing configuration keys: ${missingKeys.join(', ')}. Analytics will be disabled.`);
        return null;
    }

    try {
        firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    } catch (error) {
        console.warn('[Firebase] Initialization failed:', error);
    }

    return firebaseApp;
};

export const getFirebaseAnalytics = async (): Promise<Analytics | null> => {
    if (analyticsInstance) return analyticsInstance;
    if (typeof window === "undefined") return null;

    // Deduplicate concurrent calls
    if (analyticsPromise) return analyticsPromise;

    analyticsPromise = (async () => {
        try {
            const app = getFirebaseApp();
            if (!app) return null;

            const { getAnalytics, isSupported } = await import("firebase/analytics");
            const supported = await isSupported();
            if (supported) {
                analyticsInstance = getAnalytics(app);
            }
        } catch (err) {
            console.warn('[Firebase] Analytics support check failed:', err);
        }
        return analyticsInstance;
    })();

    return analyticsPromise;
};

// Backward-compatible synchronous exports for existing consumers
// These will be null initially and populated after first getFirebaseAnalytics() call
export { firebaseApp as app, analyticsInstance as analytics };
