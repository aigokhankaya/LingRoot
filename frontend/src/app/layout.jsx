// galiba bu sayfa kullanılmıyor. layout.tsx olan aktif gibi. 

'use client'; // Keep 'use client' if AuthProvider or other children need it

import { AuthProvider } from "@/lib/auth";
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
// Remove useLanguage import and usage here
// import { useLanguage } from "@/lib/i18n";

// Define default locale directly or import it
const defaultLocale = 'tr';

export default function RootLayout({ children }) {
  // Remove useLanguage hook call
  // const { currentLocale } = useLanguage();

  return (
    // Use defaultLocale for initial server render
    <html lang={defaultLocale} className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <title>LingRoot - AI Destekli İngilizce Öğrenme</title>
        <meta name="description" content="Herhangi bir metin, video veya sesi kendi seviyenize uygun İngilizce'ye dönüştürün" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#0284c7" />
        <meta property="og:title" content="LingRoot - AI Destekli İngilizce Öğrenme" />
        <meta property="og:description" content="Herhangi bir metin, video veya sesi kendi seviyenize uygun İngilizce'ye dönüştürün" />
        <meta property="og:image" content="/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <AuthProvider>
          <main className="relative flex min-h-screen flex-col">
            {/* TODO: Add sufficient top margin to make sure headings are always visible */}
            <div className="mt-12 pt-16">
              {children}
            </div>
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
