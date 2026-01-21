'use client';

import React from 'react';
import { AuthProvider } from '@/lib/auth';
import { MembershipProvider } from '@/context/MembershipContext';
import { RTLProvider } from '@/components/providers/RTLProvider';

import { AnalyticsTracker } from '@/components/AnalyticsTracker';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AnalyticsTracker />
      <MembershipProvider>
        <RTLProvider>
          {children}
        </RTLProvider>
      </MembershipProvider>
    </AuthProvider>
  );
}