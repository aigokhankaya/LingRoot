import React from 'react';
import type { Metadata } from 'next';
import { Manrope, Noto_Sans_Arabic } from 'next/font/google';
import ClientLayout from './client-layout';
import './globals.css'; // Import global styles

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
});

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  variable: '--font-noto-arabic',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'LingRoot - AI-powered English Learning',
  description: 'Learn English with AI-powered audio content',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={`${manrope.variable} ${notoSansArabic.variable} min-h-screen bg-background font-sans antialiased`}>
        <ClientLayout>
          <div className="mt-2 pt-2">
            {children}
          </div>
        </ClientLayout>
      </body>
    </html>
  );
}
