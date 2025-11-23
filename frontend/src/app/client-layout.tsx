'use client';

import React from 'react';
import { AuthProvider } from '@/lib/auth';
import { MembershipProvider } from '@/context/MembershipContext';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <MembershipProvider>
        {children}
      </MembershipProvider>
    </AuthProvider>
  );
}