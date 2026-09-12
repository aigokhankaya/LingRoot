'use client';

import React, { useEffect } from 'react';
import { SWRConfig } from 'swr';
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
    <SWRConfig value={{
      revalidateOnFocus: false,
      shouldRetryOnError: true,
      errorRetryCount: 2,
    }}>
      <AuthProvider>
        {/* App Router ağacında çerez bandı hiç render edilmiyordu (`_app.tsx`
            yalnız Pages Router'ı kapsar), ama `AnalyticsTracker` her rota
            değişiminde Firebase'e `page_view` gönderiyordu. Yani bu yüzeyde
            ziyaretçiye hiç sorulmadan izleme yapılıyordu.

            Şimdi kapı `AnalyticsHelper` ve `getFirebaseAnalytics` içinde:
            izin yokken bileşen render edilse de hiçbir olay gitmiyor. */}
        <AnalyticsTracker />
        <MembershipProvider>
          <RTLProvider>
            {children}
          </RTLProvider>
        </MembershipProvider>
      </AuthProvider>
    </SWRConfig>
  );
}