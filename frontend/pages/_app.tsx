import '../src/app/globals.css';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import AuthProvider from '../src/lib/auth';
import { MembershipProvider } from '../src/context/MembershipContext';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <AuthProvider>
        <MembershipProvider>
          <Component {...pageProps} />
        </MembershipProvider>
      </AuthProvider>
    </>
  );
}

export default MyApp;
