'use client';

import React, { useEffect } from 'react';
import { AuthProvider } from '@/lib/auth';
import { MembershipProvider } from '@/context/MembershipContext';
import { RTLProvider } from '@/components/providers/RTLProvider';
import { initOtel } from '@/lib/otel';

import { AnalyticsTracker } from '@/components/AnalyticsTracker';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize OpenTelemetry on first client render
  useEffect(() => {
    initOtel();
  }, []);

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