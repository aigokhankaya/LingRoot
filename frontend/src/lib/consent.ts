/**
 * Çerez onayı — tek kaynak.
 *
 * ## Düzeltilen arıza
 *
 * `CookieConsent.tsx` üç seçenekli, granüler ayarları olan iyi bir bant
 * çiziyordu ve kararı `lingroot_cookie_consent` anahtarına yazıyordu. **Ama bu
 * anahtarı banttan başka hiçbir yer okumuyordu.** İki ayrı açık vardı:
 *
 * 1. `pages/_app.tsx` gtag script'ini rızadan bağımsız yüklüyordu. Dosyadaki
 *    yorum bunu "Consent Mode" diye tarif ediyordu, ama `gtag('consent', ...)`
 *    hiçbir yerde çağrılmadığı için "denied" sinyali de gitmiyordu; etiket tam
 *    yetkiyle çalışıyordu.
 * 2. Firebase Analytics (`utils/AnalyticsHelper.ts`) hiçbir kontrolden
 *    geçmiyordu. Giriş/çıkış, ses oynatma ve içerik etkileşimi olayları rıza
 *    sorulmadan gönderiliyordu — App Router sayfalarında (`src/app/*`) bant hiç
 *    gösterilmediği hâlde.
 *
 * Artık hem gtag hem Firebase hem OpenTelemetry buradan geçiyor.
 */

export const CONSENT_KEY = 'lingroot_cookie_consent';

export interface CookiePreferences {
    necessary: boolean;
    analytics: boolean;
    marketing: boolean;
    preferences: boolean;
    timestamp?: string;
}

/**
 * Çerez bandının görünürlük anahtarı.
 *
 * `false` iken bant hiç çıkmaz VE hiçbir izleyici (gtag, Firebase Analytics,
 * OTel) yüklenmez -- daha önce izin vermiş ziyaretçide bile. Kayıtlı tercih
 * silinmez; bayrak açılınca o ziyaretçiye tekrar sorulmaz.
 *
 * Aynı ada sahip bayrak TuvalSoft'un tüm site repolarında var; hepsini tek
 * aramayla bulmak için `BANT_GORUNSUN` diye ara.
 *
 * AÇMADAN ÖNCE: `pages/cookies.tsx` boş bir stub ("Cookie Policy Page (Boş)").
 * Ya doldur ya `cookie-policy`'ye yönlendir; bant politika sayfasına link verir.
 *
 * Tip `boolean` olarak YAZILI: `= false` literal tipi üretir, o zaman TypeScript
 * bayrağa bağlı blokları erişilemez kod sayıp uyarır.
 */
export const BANT_GORUNSUN: boolean = false;

/**
 * Kayıtlı tercihi okur. `null` = ziyaretçiye henüz sorulmadı.
 *
 * Eski format (`true` / `"true"`) da `null` sayılıyor: `CookieConsent.tsx` o
 * kaydı görünce bandı yeniden gösteriyor, çünkü granüler onay içermiyor.
 */
export function readConsent(): CookiePreferences | null {
    if (typeof window === 'undefined') return null;

    let raw: string | null = null;
    try {
        raw = window.localStorage.getItem(CONSENT_KEY);
    } catch {
        // Gizli sekme / depolama kapalı: sorulmamış say.
        return null;
    }

    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        return parsed as CookiePreferences;
    } catch {
        return null;
    }
}

/**
 * Bayrak kapalıyken kayıtlı izin BİLEREK yok sayılır: "bant hiçbir yerde
 * çıkmasın, hiçbir izleyici yüklenmesin" kuralı daha önce kabul etmiş
 * ziyaretçilerde delinmesin diye.
 */
function izinVar(alan: 'analytics' | 'marketing'): boolean {
    if (!BANT_GORUNSUN) return false;
    return readConsent()?.[alan] === true;
}

/** gtag, Firebase Analytics ve OTel izleme için. */
export function analyticsAllowed(): boolean {
    return izinVar('analytics');
}

export function marketingAllowed(): boolean {
    return izinVar('marketing');
}
