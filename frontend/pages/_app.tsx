import '../src/app/globals.css';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import Head from 'next/head';
import AuthProvider from '../src/lib/auth';
import { MembershipProvider } from '../src/context/MembershipContext';
import { AudioPlayerProvider } from '../src/context/AudioPlayerContext';
import { GlobalAudioContainer } from '../src/components/AudioPlayer';
import { CookieConsent } from '../src/components/CookieConsent';
import { useRouter } from 'next/router';
import Script from 'next/script';
import * as gtag from '../src/lib/gtag';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  // Route change tracking (PageView)
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      // Check if analytics consent is given
      const stored = localStorage.getItem('lingroot_cookie_consent');
      if (stored) {
        try {
          const prefs = JSON.parse(stored);
          if (prefs.analytics) {
            gtag.pageview(url);
          }
        } catch (e) { }
      }
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    router.events.on('hashChangeComplete', handleRouteChange);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
      router.events.off('hashChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  // Listen for consent updates (from CookieConsent component)
  useEffect(() => {
    const handleConsentUpdate = () => {
      // Consent güncellendiğinde (ör: kullanıcı banner'dan kabul ettiğinde)
      // o anki sayfa görüntülemesini gönderelim (ilk açılışta kaçmasın diye)
      const stored = localStorage.getItem('lingroot_cookie_consent');
      if (stored) {
        const prefs = JSON.parse(stored);
        if (prefs.analytics) {
          gtag.pageview(window.location.pathname);
        }
      }
    };
    window.addEventListener('cookie-consent-updated', handleConsentUpdate);
    return () => window.removeEventListener('cookie-consent-updated', handleConsentUpdate);
  }, []);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent || ''
    );
    if (!isMobile) return;

    const originalAlert = window.alert;
    // Completely suppress native alerts globally (mobile-friendly)
    window.alert = (...args: any[]) => {
      try {
        console.warn('[alert suppressed]', ...args);
      } catch { }
      return;
    };
    return () => {
      window.alert = originalAlert;
    };
  }, []);

  return (
    <>
      <Head>
        <title>LingRoot</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </Head>
      <AuthProvider>
        <MembershipProvider>
          <AudioPlayerProvider>
            <Component {...pageProps} />
            <GlobalAudioContainer />
            <CookieConsent />
          </AudioPlayerProvider>
        </MembershipProvider>
      </AuthProvider>


      {/* Google Analytics Script - Only loads if ID is present */}
      {/* Not: Gerçek consent mode implementasyonunda script her zaman yüklenir ama
          veriler 'denied' olarak gider. Basitlik için burada da yüklüyoruz,
          ama event'leri sadece consent varsa gönderiyoruz. */}
      {
        process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <>
            <Script
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
            />
            <Script
              id="google-analytics"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}', {
                  page_path: window.location.pathname,
                });
              `,
              }}
            />
          </>
        )
      }
    </>
  );
}

export default MyApp;
