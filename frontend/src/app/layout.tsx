import React from 'react';
import type { Metadata } from 'next';
import ClientLayout from './client-layout';
import './globals.css'; // Import global styles
import '@fortawesome/fontawesome-free/css/all.min.css'; // Import FontAwesome icons

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
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
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
