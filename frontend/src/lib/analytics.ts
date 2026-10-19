import * as gtag from './gtag';

/**
 * Merkezi Analytics Yönetimi
 * Hem Web (GA4) hem de gelecekteki diğer tool'lar (Hotjar vs.) buradan yönetilebilir.
 */

// Analytics'i başlatır (Consent verildiyse)
export const initAnalytics = () => {
    // Buradaki eski yorum "script her zaman yüklü olabilir, veriler 'denied'
    // modunda gitmez" diyordu. Bu yanlıştı: projede `gtag('consent', ...)` hiç
    // çağrılmıyor, dolayısıyla Consent Mode diye bir şey çalışmıyordu.
    //
    // Seçilen yaklaşım daha katı: izin yoksa gtag script'i `pages/_app.tsx`
    // içinde hiç render edilmiyor. Aşağıdaki `gtag.*` sarmalayıcıları da
    // `window.gtag` tanımsız olduğu için sessizce no-op oluyor.
    if (typeof window !== 'undefined') {
        // Custom init logic if needed
        console.log('[Analytics] Initialized');
    }
};

// Sayfa görüntüleme takibi
export const trackPageView = (url: string) => {
    gtag.pageview(url);
};

// Özel olay takibi
export const trackEvent = (eventName: string, params?: Record<string, any>) => {
    gtag.event({
        action: eventName,
        category: params?.category || 'general',
        label: params?.label,
        value: params?.value,
        ...params
    });
};

// Sık kullanılan olaylar için wrapperlar
export const AnalyticsEvents = {
    LOGIN: 'login',
    REGISTER: 'sign_up',
    CONTENT_VIEW: 'view_item', // İçerik görüntüleme
    AUDIO_CREATE: 'create_audio', // Ses oluşturma
    SEARCH: 'search',
    SHARE: 'share',
    TUTORIAL_BEGIN: 'tutorial_begin',
    TUTORIAL_COMPLETE: 'tutorial_complete'
};
