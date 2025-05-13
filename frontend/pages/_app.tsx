import '../src/app/globals.css';
import type { AppProps } from 'next/app';
import AuthProvider from '../src/lib/auth';
import { MembershipProvider } from '../src/context/MembershipContext';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <MembershipProvider>
        <Component {...pageProps} />
      </MembershipProvider>
    </AuthProvider>
  );
}

export default MyApp; 