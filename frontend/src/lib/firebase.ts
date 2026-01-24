import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported, Analytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp | undefined;
let analytics: Analytics | null = null;

if (typeof window !== "undefined") {
    // Check for critical config values
    const missingKeys = Object.entries({
        apiKey: firebaseConfig.apiKey,
        authDomain: firebaseConfig.authDomain,
        projectId: firebaseConfig.projectId,
        appId: firebaseConfig.appId,
    }).filter(([_, value]) => !value).map(([key]) => key);

    if (missingKeys.length > 0) {
        console.warn(`[Firebase] Missing configuration keys: ${missingKeys.join(', ')}. Analytics will be disabled.`);
    } else {
        // Client-side only
        try {
            if (!getApps().length) {
                app = initializeApp(firebaseConfig);
            } else {
                app = getApp();
            }

            isSupported().then((supported) => {
                if (supported && app) {
                    analytics = getAnalytics(app);
                }
            }).catch(err => {
                console.warn('[Firebase] Analytics support check failed:', err);
            });
        } catch (error) {
            console.warn('[Firebase] Initialization failed:', error);
        }
    }
}

export { app, analytics };
