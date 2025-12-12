'use client';

import React, { useEffect } from 'react';
import { useLanguage, isRTL } from '@/lib/i18n';

interface RTLProviderProps {
  children: React.ReactNode;
}

/**
 * RTL Provider - Arapça gibi sağdan sola yazılan diller için
 * HTML dir attribute'unu otomatik olarak günceller
 */
export function RTLProvider({ children }: RTLProviderProps) {
  const { currentLocale } = useLanguage();

  useEffect(() => {
    const rtl = isRTL(currentLocale);
    
    // HTML root element'e dir attribute'u ekle
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLocale;
    
    // Body'ye RTL class'ı ekle (Tailwind için)
    if (rtl) {
      document.body.classList.add('rtl');
      document.body.classList.remove('ltr');
    } else {
      document.body.classList.add('ltr');
      document.body.classList.remove('rtl');
    }
  }, [currentLocale]);

  return <>{children}</>;
}

export default RTLProvider;
