import * as gtag from './gtag';

/**
 * Merkezi Analytics Yönetimi
 * Hem Web (GA4) hem de gelecekteki diğer tool'lar (Hotjar vs.) buradan yönetilebilir.
 */

// Analytics'i başlatır (Consent verildiyse)
export const initAnalytics = () => {
    // GA4 zaten _document veya _app üzerinden script olarak yüklendiğinde,
    // Google'ın kendi mekanizması "consent mode" ile çalışır.
    // Ancak scripti tamamen inject etmemeyi tercih ediyorsak burayı kullanabiliriz.
    // Şimdilik consent mode v2 mantığına uygun olarak;
    // Script her zaman yüklü olabilir ama veriler 'denied' modunda gitmez.

    // Basit implementasyonda: Kullanıcı kabul edince bu fonksiyon çağrılır.
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
