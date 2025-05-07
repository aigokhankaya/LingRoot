import React from 'react';
import type { Metadata } from 'next';
import ClientLayout from './client-layout';
import './globals.css'; // Import global styles

export const metadata: Metadata = {
  title: 'LingRoot - AI-powered English Learning',
  description: 'Learn English with AI-powered audio content',
  icons: {
    icon: '/logo.svg',
    shortcut: '/logo.svg',
    apple: '/logo.svg',
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
        <link rel="icon" href="/logo.svg" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ClientLayout>
          {/* TODO: Add sufficient top margin to make sure headings are always visible */}
          <div className="mt-12 pt-16">
            {children}
          </div>
        </ClientLayout>
      </body>
    </html>
  );
}
