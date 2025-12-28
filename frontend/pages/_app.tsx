import '../src/app/globals.css';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import Head from 'next/head';
import AuthProvider from '../src/lib/auth';
import { MembershipProvider } from '../src/context/MembershipContext';
import { AudioPlayerProvider } from '../src/context/AudioPlayerContext';
import { GlobalAudioContainer } from '../src/components/AudioPlayer';

function MyApp({ Component, pageProps }: AppProps) {
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
          </AudioPlayerProvider>
        </MembershipProvider>
      </AuthProvider>
    </>
  );
}

export default MyApp;
